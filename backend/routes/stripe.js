require("dotenv").config();
const express = require("express");
const router = express.Router();
const { query } = require("../config/db");
const {
  sendClientBookingConfirmation,
  sendAdminNewBookingAlert,
} = require("../services/email");

// ─── Helper: formatează data PostgreSQL → "YYYY-MM-DD" ───────────────────────
function fmtISO(val) {
  if (!val) return "";
  // String: "2026-05-03" sau "2026-05-03T00:00:00.000Z" → primii 10 chars
  if (typeof val === "string") return val.substring(0, 10);
  // Date object: folosim getters LOCALI (nu toISOString care e UTC)
  if (val instanceof Date) {
    const y = val.getFullYear();
    const m = String(val.getMonth() + 1).padStart(2, "0");
    const d = String(val.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }
  return String(val).substring(0, 10);
}

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
    return res
      .status(503)
      .json({ success: false, error: "Serviciul de plăți nu este configurat" });
  }

  try {
    const { booking_id } = req.body;
    if (!booking_id)
      return res
        .status(400)
        .json({ success: false, error: "booking_id este obligatoriu" });

    const result = await query(
      `SELECT b.*, r.name AS room_name, r.slug AS room_slug
       FROM bookings b JOIN rooms r ON r.id = b.room_id WHERE b.id = $1`,
      [booking_id],
    );

    if (result.rows.length === 0)
      return res
        .status(404)
        .json({ success: false, error: "Rezervarea nu a fost găsită" });

    const booking = result.rows[0];

    if (booking.status !== "pending")
      return res.status(400).json({
        success: false,
        error: `Rezervarea nu poate fi plătită (status: ${booking.status})`,
      });

    const FRONTEND_URL =
      process.env.FRONTEND_URL?.split(",")[0] || "http://localhost:5173";

    const isAdvance = booking.payment_split === "advance";
    const chargeAmount = booking.stripe_amount || booking.total_price;
    const remainingAmount = booking.remaining_amount || 0;

    // ── Datele formatate corect pentru descrierea produsului ───────────────
    const checkInStr = fmtISO(booking.check_in); // ← FIX
    const checkOutStr = fmtISO(booking.check_out); // ← FIX

    const productName = isAdvance
      ? `Avans rezervare — ${booking.room_name}`
      : `Cazare — ${booking.room_name}`;

    const productDescription = isAdvance
      ? `Avans 30% · ${booking.room_name} · ${checkInStr} → ${checkOutStr} · ${booking.nights} nopți · Rest la check-in: ${remainingAmount} RON · Ref: ${booking.booking_ref}`
      : `Cazare · ${booking.room_name} · ${checkInStr} → ${checkOutStr} · ${booking.nights} nopți · Ref: ${booking.booking_ref}`;

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      mode: "payment",
      locale: "ro",
      customer_email: booking.guest_email,

      line_items: [
        {
          price_data: {
            currency: "ron",
            unit_amount: chargeAmount * 100,
            product_data: {
              name: productName,
              description: productDescription,
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
        payment_split: booking.payment_split || "full",
        charge_amount: String(chargeAmount),
        remaining_amount: String(remainingAmount),
        total_price: String(booking.total_price),
        nights: String(booking.nights),
        // Salvăm datele formatate în metadata — le folosim în webhook
        check_in: checkInStr,
        check_out: checkOutStr,
      },

      success_url: `${FRONTEND_URL}/booking/success?session_id={CHECKOUT_SESSION_ID}&ref=${booking.booking_ref}`,
      cancel_url: `${FRONTEND_URL}/booking?room=${booking.room_slug}&cancelled=true`,
    });

    console.log(
      `💳 Sesiune Stripe: ${session.id} | ${booking.booking_ref} | ` +
        `${isAdvance ? `avans ${chargeAmount} RON / total ${booking.total_price} RON` : `integral ${chargeAmount} RON`}`,
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
    if (!stripe)
      return res.status(503).json({ error: "Stripe nu este configurat" });

    const sig = req.headers["stripe-signature"];
    let event;
    try {
      event = stripe.webhooks.constructEvent(
        req.body,
        sig,
        process.env.STRIPE_WEBHOOK_SECRET,
      );
    } catch (err) {
      console.error("❌ Webhook signature error:", err.message);
      return res.status(400).json({ error: err.message });
    }

    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object;
        const bookingId = session.metadata?.booking_id;
        const paymentSplit = session.metadata?.payment_split || "full";
        const isAdvance = paymentSplit === "advance";
        const paidAmount = Math.round(session.amount_total / 100);
        const remainingAmount = parseInt(
          session.metadata?.remaining_amount || "0",
        );
        const totalPrice = parseInt(session.metadata?.total_price || "0");
        const nights = parseInt(session.metadata?.nights || "1");

        // ── Datele din metadata — deja formatate la creare ────────────────
        const checkIn = session.metadata?.check_in || ""; // ← "2026-04-17"
        const checkOut = session.metadata?.check_out || ""; // ← "2026-04-21"

        if (bookingId) {
          try {
            const result = await query(
              `UPDATE bookings SET status = 'confirmed', stripe_amount = $2, updated_at = NOW()
               WHERE id = $1
               RETURNING booking_ref, guest_name, guest_email, guest_phone,
                         check_in, check_out, nights, total_price,
                         payment_split, stripe_amount, remaining_amount, room_id`,
              [bookingId, paidAmount],
            );

            if (result.rows.length > 0) {
              const booking = result.rows[0];
              const roomResult = await query(
                `SELECT name FROM rooms WHERE id = $1`,
                [booking.room_id],
              );
              const roomName = roomResult.rows[0]?.name || "cameră";

              console.log(
                `✅ Plată confirmată: ${booking.booking_ref} | ${booking.guest_name} | ` +
                  `${isAdvance ? `avans ${paidAmount} RON, rest ${remainingAmount} RON la check-in, total ${totalPrice} RON` : `integral ${paidAmount} RON`}`,
              );

              // ── Folosim datele din metadata (deja string "YYYY-MM-DD") ──
              // SAU fmtISO() ca fallback dacă metadata lipsește
              const bookingData = {
                guestName: booking.guest_name,
                guestEmail: booking.guest_email,
                guestPhone: booking.guest_phone || null,
                roomName,
                checkIn: checkIn || fmtISO(booking.check_in), // ← FIX
                checkOut: checkOut || fmtISO(booking.check_out), // ← FIX
                nights: booking.nights || nights,
                totalPrice,
                bookingRef: booking.booking_ref,
                paymentSplit,
                stripeAmount: paidAmount,
                remainingAmount,
              };

              const paymentMethodLabel = isAdvance
                ? `💳 Card online — Avans ${paidAmount} RON plătit (rest ${remainingAmount} RON la check-in, total ${totalPrice} RON)`
                : `💳 Card online — Integral ${paidAmount} RON`;

              Promise.allSettled([
                sendClientBookingConfirmation(booking.guest_email, bookingData),
                sendAdminNewBookingAlert(
                  process.env.ADMIN_EMAIL || process.env.EMAIL_USER,
                  { ...bookingData, paymentMethod: paymentMethodLabel },
                ),
              ]).then((results) => {
                results.forEach((r, i) => {
                  if (r.status === "rejected")
                    console.error(
                      `⚠️ Email ${i === 0 ? "client" : "admin"} eșuat:`,
                      r.reason?.message,
                    );
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
  if (!stripe)
    return res
      .status(503)
      .json({ success: false, error: "Stripe nu este configurat" });

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
      payment_split: session.metadata?.payment_split || "full",
      charge_amount: session.amount_total
        ? Math.round(session.amount_total / 100)
        : null,
      remaining_amount: parseInt(session.metadata?.remaining_amount || "0"),
      total_price: parseInt(session.metadata?.total_price || "0"),
      booking,
    });
  } catch (err) {
    console.error("❌ GET /api/payments/verify:", err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
