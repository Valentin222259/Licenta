require("dotenv").config();
const express = require("express");
const router = express.Router();
const { query } = require("../config/db");

// ─── Inițializare Stripe ──────────────────────────────────────────────────────
// Stripe se inițializează doar dacă există cheia în .env
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
// Creează o sesiune Stripe Checkout pentru o rezervare
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

    // Creăm sesiunea Stripe Checkout
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      mode: "payment",
      locale: "ro",
      customer_email: booking.guest_email,

      line_items: [
        {
          price_data: {
            currency: "ron",
            unit_amount: booking.total_price * 100, // Stripe folosește bani (cea mai mică unitate)
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
// Stripe trimite evenimentele de plată la acest endpoint
// IMPORTANT: trebuie să fie înregistrat ÎNAINTE de express.json() în server.js
// și să folosească express.raw() pentru a verifica semnătura
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
      if (webhookSecret) {
        // Verificăm semnătura pentru securitate
        event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
      } else {
        // În development fără webhook secret, parsăm direct
        event = JSON.parse(req.body.toString());
        console.warn(
          "⚠️  Webhook fără verificare semnătură (STRIPE_WEBHOOK_SECRET lipsește)",
        );
      }
    } catch (err) {
      console.error("❌ Webhook signature invalid:", err.message);
      return res.status(400).json({ error: `Webhook Error: ${err.message}` });
    }

    // Procesăm evenimentele Stripe
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object;
        const bookingId = session.metadata?.booking_id;

        if (bookingId) {
          try {
            // Actualizăm statusul rezervării la "confirmed"
            const result = await query(
              `UPDATE bookings SET status = 'confirmed', updated_at = NOW()
               WHERE id = $1 RETURNING booking_ref, guest_name, guest_email`,
              [bookingId],
            );

            if (result.rows.length > 0) {
              const booking = result.rows[0];
              console.log(
                `✅ Plată confirmată: ${booking.booking_ref} (${booking.guest_name})`,
              );

              // Mock email — în producție înlocuiești cu Nodemailer
              sendConfirmationEmail(booking, session);
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
// Frontend-ul verifică statusul plății după redirect
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

// ─── Mock Email Service ───────────────────────────────────────────────────────
// În producție: înlocuiește cu Nodemailer + Gmail / SendGrid
function sendConfirmationEmail(booking, session) {
  console.log("\n📧 ══════════════════════════════════════════");
  console.log("   EMAIL DE CONFIRMARE REZERVARE (MOCK)");
  console.log("═══════════════════════════════════════════");
  console.log(`   Către:    ${booking.guest_email}`);
  console.log(`   Ref:      ${booking.booking_ref}`);
  console.log(`   Oaspete:  ${booking.guest_name}`);
  console.log(`   Sumă:     ${(session.amount_total / 100).toFixed(2)} RON`);
  console.log(`   Status:   CONFIRMAT ✅`);
  console.log("═══════════════════════════════════════════\n");

  // TODO: Înlocuiește cu cod Nodemailer real:
  //
  // const transporter = nodemailer.createTransport({
  //   service: 'gmail',
  //   auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASSWORD }
  // });
  //
  // await transporter.sendMail({
  //   from: `"Maramureș Belvedere" <${process.env.EMAIL_USER}>`,
  //   to: booking.guest_email,
  //   subject: `Confirmare rezervare ${booking.booking_ref}`,
  //   html: `<h2>Rezervarea ta a fost confirmată!</h2>
  //          <p>Ref: <strong>${booking.booking_ref}</strong></p>
  //          <p>Check-in: ${booking.check_in}</p>
  //          <p>Check-out: ${booking.check_out}</p>`
  // });
}

module.exports = router;
