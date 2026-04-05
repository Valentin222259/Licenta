require("dotenv").config();
const express = require("express");
const router = express.Router();
const { query } = require("../config/db");
const {
  sendClientBookingConfirmation,
  sendAdminNewBookingAlert,
} = require("../services/email");

// ─── Inițializare Stripe ──────────────────────────────────────────────────────
let stripe = null;
if (process.env.STRIPE_SECRET_KEY) {
  stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
  console.log("✅ Stripe inițializat");
} else {
  console.warn(
    "⚠️  STRIPE_SECRET_KEY lipsește din .env — plățile sunt dezactivate",
  );
}

// ─── POST /api/payments/create-checkout ──────────────────────────────────────
router.post("/create-checkout", async (req, res) => {
  if (!stripe) {
    return res.status(503).json({
      success: false,
      error:
        "Serviciul de plăți nu este configurat. Adaugă STRIPE_SECRET_KEY în .env",
    });
  }

  try {
    const { booking_id } = req.body;

    if (!booking_id) {
      return res
        .status(400)
        .json({ success: false, error: "booking_id este obligatoriu" });
    }

    // Luăm datele rezervării din DB
    const result = await query(
      `SELECT b.*, r.name AS room_name, r.slug AS room_slug
       FROM bookings b
       JOIN rooms r ON r.id = b.room_id
       WHERE b.id = $1`,
      [booking_id],
    );

    if (result.rows.length === 0) {
      return res
        .status(404)
        .json({ success: false, error: "Rezervarea nu a fost găsită" });
    }

    const booking = result.rows[0];

    if (booking.status !== "pending") {
      return res.status(400).json({
        success: false,
        error: `Rezervarea nu poate fi plătită (status: ${booking.status})`,
      });
    }

    const FRONTEND_URL =
      process.env.FRONTEND_URL?.split(",")[0] || "http://localhost:5173";

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      mode: "payment",
      locale: "ro",
      customer_email: booking.guest_email,

      line_items: [
        {
          price_data: {
            currency: "ron",
            unit_amount: booking.total_price * 100,
            product_data: {
              name: `Cazare — ${booking.room_name}`,
              description: `Check-in: ${String(booking.check_in).substring(0, 10)} | Check-out: ${String(booking.check_out).substring(0, 10)} | ${booking.nights} nopți | Ref: ${booking.booking_ref}`,
              images: [`${FRONTEND_URL}/placeholder.svg`],
            },
          },
          quantity: 1,
        },
      ],

      metadata: {
        booking_id: booking.id,
        booking_ref: booking.booking_ref,
        guest_name: booking.guest_name,
      },

      success_url: `${FRONTEND_URL}/booking/success?session_id={CHECKOUT_SESSION_ID}&ref=${booking.booking_ref}`,
      cancel_url: `${FRONTEND_URL}/booking?room=${booking.room_slug}&cancelled=true`,
    });

    console.log(
      `💳 Sesiune Stripe creată: ${session.id} pentru ${booking.booking_ref}`,
    );

    res.json({
      success: true,
      checkout_url: session.url,
      session_id: session.id,
    });
  } catch (err) {
    console.error("❌ POST /api/payments/create-checkout:", err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─── POST /api/payments/webhook ──────────────────────────────────────────────
router.post(
  "/webhook",
  express.raw({ type: "application/json" }),
  async (req, res) => {
    if (!stripe) {
      return res.status(503).json({ error: "Stripe nu este configurat" });
    }

    const sig = req.headers["stripe-signature"];
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    let event;

    try {
      event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
    } catch (err) {
      console.error("❌ Webhook signature error:", err.message);
      return res.status(400).json({ error: err.message });
    }

    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object;
        const bookingId = session.metadata?.booking_id;

        if (bookingId) {
          try {
            // Actualizăm statusul și returnăm datele pentru email
            const result = await query(
              `UPDATE bookings SET status = 'confirmed', updated_at = NOW()
               WHERE id = $1
               RETURNING booking_ref, guest_name, guest_email, guest_phone,
                         check_in, check_out, nights, total_price, room_id`,
              [bookingId],
            );

            if (result.rows.length > 0) {
              const booking = result.rows[0];

              // Luăm numele camerei
              const roomResult = await query(
                `SELECT name FROM rooms WHERE id = $1`,
                [booking.room_id],
              );
              const roomName = roomResult.rows[0]?.name || "cameră";

              console.log(
                `✅ Plată confirmată: ${booking.booking_ref} (${booking.guest_name})`,
              );

              const bookingData = {
                guestName: booking.guest_name,
                guestEmail: booking.guest_email,
                guestPhone: booking.guest_phone || null,
                roomName,
                checkIn: String(booking.check_in).substring(0, 10),
                checkOut: String(booking.check_out).substring(0, 10),
                nights: booking.nights,
                totalPrice: (session.amount_total / 100).toFixed(0),
                bookingRef: booking.booking_ref,
              };

              // Trimitem ambele emailuri simultan (non-blocking)
              Promise.allSettled([
                sendClientBookingConfirmation(booking.guest_email, bookingData),
                sendAdminNewBookingAlert(
                  process.env.ADMIN_EMAIL || process.env.EMAIL_USER,
                  bookingData,
                ),
              ]).then((results) => {
                results.forEach((r, i) => {
                  if (r.status === "rejected") {
                    console.error(
                      `⚠️  Email ${i === 0 ? "client" : "admin"} eșuat:`,
                      r.reason?.message,
                    );
                  }
                });
              });
            }
          } catch (err) {
            console.error("❌ Eroare la confirmarea rezervării:", err.message);
          }
        }
        break;
      }

      case "checkout.session.expired": {
        const session = event.data.object;
        const bookingId = session.metadata?.booking_id;
        if (bookingId) {
          await query(
            `UPDATE bookings SET status = 'cancelled', updated_at = NOW() WHERE id = $1`,
            [bookingId],
          ).catch(console.error);
          console.log(
            `⏰ Sesiune Stripe expirată, rezervare anulată: ${bookingId}`,
          );
        }
        break;
      }

      default:
        console.log(`📬 Stripe event ignorat: ${event.type}`);
    }

    res.json({ received: true });
  },
);

// ─── GET /api/payments/verify/:sessionId ─────────────────────────────────────
router.get("/verify/:sessionId", async (req, res) => {
  if (!stripe) {
    return res
      .status(503)
      .json({ success: false, error: "Stripe nu este configurat" });
  }

  try {
    const session = await stripe.checkout.sessions.retrieve(
      req.params.sessionId,
    );

    const bookingId = session.metadata?.booking_id;
    let booking = null;

    if (bookingId) {
      const result = await query(
        `SELECT b.*, r.name AS room_name FROM bookings b
         JOIN rooms r ON r.id = b.room_id WHERE b.id = $1`,
        [bookingId],
      );
      booking = result.rows[0] || null;
    }

    res.json({
      success: true,
      paid: session.payment_status === "paid",
      session_status: session.status,
      payment_status: session.payment_status,
      booking,
    });
  } catch (err) {
    console.error("❌ GET /api/payments/verify:", err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─── TEST EMAIL (doar development) ───────────────────────────────────────────
if (process.env.NODE_ENV !== "production") {
  router.get("/test-emails", async (req, res) => {
    const bookingData = {
      guestName: "Ion Popescu",
      guestEmail: "ardeleanvalentin737@yahoo.com",
      guestPhone: "+40 700 000 000",
      roomName: "Camera 1 — Comfort",
      checkIn: "2026-11-01",
      checkOut: "2026-11-03",
      nights: 2,
      totalPrice: 500,
      bookingRef: "BLV-2026-TEST",
    };

    await Promise.allSettled([
      sendClientBookingConfirmation(
        "ardeleanvalentin737@yahoo.com",
        bookingData,
      ),
      sendAdminNewBookingAlert(process.env.ADMIN_EMAIL, bookingData),
    ]);

    res.json({ success: true, message: "Emailuri trimise!" });
  });
}

module.exports = router;
