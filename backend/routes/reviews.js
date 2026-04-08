"use strict";

const express = require("express");
const router = express.Router();
const { query } = require("../config/db");

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || process.env.EMAIL_USER;

// ─── GET /api/reviews — recenzii publice aprobate ─────────────────────────────
router.get("/", async (req, res) => {
  try {
    const { rows } = await query(
      `SELECT rv.id, rv.guest_name, rv.rating, rv.text, rv.created_at,
              r.name AS room_name
       FROM reviews rv
       LEFT JOIN rooms r ON r.id = rv.room_id
       WHERE rv.is_visible = true
       ORDER BY rv.created_at DESC
       LIMIT 50`,
    );
    res.json({ success: true, data: rows });
  } catch (err) {
    console.error("❌ GET /api/reviews:", err.message);
    res.status(500).json({ success: false, error: "Eroare server" });
  }
});

// ─── GET /api/reviews/check/:bookingId — verifică dacă există deja recenzie ──
router.get("/check/:bookingId", async (req, res) => {
  try {
    const { bookingId } = req.params;
    const { rows } = await query(
      `SELECT id FROM reviews WHERE booking_id = $1`,
      [bookingId],
    );
    res.json({ success: true, hasReview: rows.length > 0 });
  } catch (err) {
    res.status(500).json({ success: false, error: "Eroare server" });
  }
});

// ─── POST /api/reviews ────────────────────────────────────────────────────────
router.post("/", async (req, res) => {
  try {
    const { booking_id, guest_name, guest_email, rating, text } = req.body;

    // 1. Câmpuri obligatorii
    if (
      !booking_id ||
      !guest_name?.trim() ||
      !guest_email?.trim() ||
      !rating ||
      !text?.trim()
    ) {
      return res.status(400).json({
        success: false,
        error:
          "Câmpurile obligatorii lipsesc (booking_id, nume, email, rating, text)",
      });
    }

    if (rating < 1 || rating > 5) {
      return res
        .status(400)
        .json({
          success: false,
          error: "Rating-ul trebuie să fie între 1 și 5",
        });
    }

    if (text.trim().length < 10) {
      return res
        .status(400)
        .json({
          success: false,
          error: "Recenzia trebuie să aibă minim 10 caractere",
        });
    }

    // 2. Verifică că rezervarea există
    const bookingRes = await query(
      `SELECT b.id, b.guest_email, b.status, b.check_out, b.room_id, r.name AS room_name
       FROM bookings b
       LEFT JOIN rooms r ON r.id = b.room_id
       WHERE b.id = $1`,
      [booking_id],
    );

    if (bookingRes.rows.length === 0) {
      return res
        .status(404)
        .json({ success: false, error: "Rezervarea nu a fost găsită" });
    }

    const booking = bookingRes.rows[0];

    // 3. Verifică că emailul aparține acestei rezervări
    if (booking.guest_email.toLowerCase() !== guest_email.toLowerCase()) {
      return res.status(403).json({
        success: false,
        error: "Această rezervare nu este asociată cu emailul furnizat",
      });
    }

    // 4. Verifică că sejurul s-a finalizat
    // Acceptăm status 'completed' SAU check_out în trecut
    const checkoutDate = new Date(booking.check_out);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const sejurFinalizat =
      booking.status === "completed" || checkoutDate < today;

    if (!sejurFinalizat) {
      return res.status(400).json({
        success: false,
        error: "Puteți lăsa o recenzie doar după finalizarea sejurului",
      });
    }

    // 5. Verifică că nu există deja o recenzie pentru această rezervare
    const existingReview = await query(
      `SELECT id FROM reviews WHERE booking_id = $1`,
      [booking_id],
    );

    if (existingReview.rows.length > 0) {
      return res.status(409).json({
        success: false,
        error: "Ați lăsat deja o recenzie pentru acest sejur",
      });
    }

    // 6. Salvează recenzia
    // room_id luat din rezervare (nu din request)
    // >= 4 stele → publicat automat; 1-3 stele → necesită aprobare admin
    const autoApprove = rating >= 4;

    const { rows } = await query(
      `INSERT INTO reviews (guest_name, rating, text, room_id, booking_id, is_visible)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id`,
      [
        guest_name.trim(),
        rating,
        text.trim(),
        booking.room_id,
        booking_id,
        autoApprove,
      ],
    );

    console.log(
      `⭐ Recenzie nouă: ${guest_name} | ${rating}/5 | booking #${booking_id}`,
    );

    // 7. Emailuri non-blocking
    try {
      const {
        sendAdminNewReviewAlert,
        sendClientReviewConfirmation,
      } = require("../services/email");

      sendAdminNewReviewAlert(ADMIN_EMAIL, {
        guestName: guest_name,
        guestEmail: guest_email,
        rating,
        text,
        roomName: booking.room_name,
        autoApproved: autoApprove,
      }).catch((err) =>
        console.error("⚠️ Email recenzie admin eșuat:", err.message),
      );

      if (guest_email) {
        sendClientReviewConfirmation(guest_email, {
          guestName: guest_name,
          rating,
          roomName: booking.room_name,
          autoApproved: autoApprove,
        }).catch((err) =>
          console.error("⚠️ Email confirmare recenzie eșuat:", err.message),
        );
      }
    } catch (emailErr) {
      console.error("⚠️ Eroare emailuri recenzie:", emailErr.message);
    }

    res.status(201).json({ success: true, data: { id: rows[0].id } });
  } catch (err) {
    console.error("❌ POST /api/reviews:", err.message);
    res.status(500).json({ success: false, error: "Eroare server" });
  }
});

// ─── GET /api/reviews/pending — recenzii în așteptare (admin) ────────────────
router.get("/pending", async (req, res) => {
  try {
    const { rows } = await query(
      `SELECT rv.id, rv.guest_name, rv.rating, rv.text, rv.created_at,
              r.name AS room_name
       FROM reviews rv
       LEFT JOIN rooms r ON r.id = rv.room_id
       WHERE rv.is_visible = false
       ORDER BY rv.created_at DESC`,
    );
    res.json({ success: true, data: rows });
  } catch (err) {
    console.error("❌ GET /api/reviews/pending:", err.message);
    res.status(500).json({ success: false, error: "Eroare server" });
  }
});

// ─── PATCH /api/reviews/:id/approve ──────────────────────────────────────────
router.patch("/:id/approve", async (req, res) => {
  try {
    const { id } = req.params;
    await query(`UPDATE reviews SET is_visible = true WHERE id = $1`, [id]);
    res.json({ success: true });
  } catch (err) {
    console.error("❌ PATCH /api/reviews/approve:", err.message);
    res.status(500).json({ success: false, error: "Eroare server" });
  }
});

// ─── DELETE /api/reviews/:id ──────────────────────────────────────────────────
router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    await query(`DELETE FROM reviews WHERE id = $1`, [id]);
    res.json({ success: true });
  } catch (err) {
    console.error("❌ DELETE /api/reviews:", err.message);
    res.status(500).json({ success: false, error: "Eroare server" });
  }
});

module.exports = router;
