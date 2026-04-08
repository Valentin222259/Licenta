"use strict";

const express = require("express");
const router = express.Router();
const { query } = require("../config/db");

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || process.env.EMAIL_USER;

// ─── GET /api/reviews ─────────────────────────────────────────────────────────
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

// ─── POST /api/reviews ────────────────────────────────────────────────────────
router.post("/", async (req, res) => {
  try {
    const { guest_name, guest_email, rating, text, room_id } = req.body;

    if (
      !guest_name?.trim() ||
      !guest_email?.trim() ||
      !rating ||
      !text?.trim()
    ) {
      return res
        .status(400)
        .json({ success: false, error: "Câmpurile obligatorii lipsesc" });
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

    // Salvăm recenzia (is_visible = false până adminul o aprobă)
    const { rows } = await query(
      `INSERT INTO reviews (guest_name, rating, text, room_id, is_visible)
       VALUES ($1, $2, $3, $4, true)
       RETURNING id`,
      [guest_name.trim(), rating, text.trim(), room_id || null],
    );

    console.log(`⭐ Recenzie nouă de la ${guest_name} (${rating}/5)`);

    // Luăm numele camerei pentru email
    let roomName = null;
    if (room_id) {
      const roomRes = await query(`SELECT name FROM rooms WHERE id = $1`, [
        room_id,
      ]);
      if (roomRes.rows.length > 0) roomName = roomRes.rows[0].name;
    }

    // Emailuri — non-blocking
    try {
      const {
        sendAdminNewReviewAlert,
        sendClientReviewConfirmation,
      } = require("../services/email");

      // Notificare admin cu template dedicat recenzie
      sendAdminNewReviewAlert(ADMIN_EMAIL, {
        guestName: guest_name,
        guestEmail: guest_email,
        rating,
        text,
        roomName,
      }).catch((err) =>
        console.error("⚠️ Email recenzie admin eșuat:", err.message),
      );

      // Confirmare client cu template dedicat
      if (guest_email) {
        sendClientReviewConfirmation(guest_email, {
          guestName: guest_name,
          rating,
          roomName,
        }).catch((err) =>
          console.error("⚠️ Email confirmare recenzie eșuat:", err.message),
        );
      }
    } catch (emailErr) {
      console.error(
        "⚠️ Eroare la trimiterea emailurilor recenzie:",
        emailErr.message,
      );
    }

    res.status(201).json({ success: true, data: { id: rows[0].id } });
  } catch (err) {
    console.error("❌ POST /api/reviews:", err.message);
    res.status(500).json({ success: false, error: "Eroare server" });
  }
});

module.exports = router;
