/**
 * routes/contact.js — Endpoint pentru formularul de contact public
 *
 * POST /api/contact
 *
 * Flux:
 *  1. Validare sumar a câmpurilor obligatorii (name, email, message)
 *  2. Trimitere email adminului via sendAdminContactMessage
 *  3. Răspuns imediat către frontend (emailul se trimite async)
 *
 * Decizie arhitecturală:
 *  Nu salvăm mesajele de contact în DB — adminul le primește direct pe email.
 *  Dacă în viitor vrei istoric, adaugi un INSERT în tabelul `contact_messages`.
 */

"use strict";

const express = require("express");
const router = express.Router();
const { sendAdminContactMessage } = require("../services/email");

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || process.env.EMAIL_USER;

// ─── POST /api/contact ────────────────────────────────────────────────────────
router.post("/", async (req, res) => {
  try {
    const { name, email, phone, subject, message } = req.body;

    // ── Validare câmpuri obligatorii ──────────────────────────────────────
    if (!name?.trim() || !email?.trim() || !message?.trim()) {
      return res.status(400).json({
        success: false,
        error: "Câmpurile nume, email și mesaj sunt obligatorii",
      });
    }

    // Validare format email (regex simplu)
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        error: "Adresa de email nu este validă",
      });
    }

    // Validare lungime mesaj
    if (message.trim().length < 10) {
      return res.status(400).json({
        success: false,
        error: "Mesajul trebuie să aibă cel puțin 10 caractere",
      });
    }

    // ── Trimitere email admin (non-blocking) ──────────────────────────────
    /**
     * Trimitem emailul FĂRĂ await în răspunsul HTTP.
     * Dacă SMTP-ul e lent, clientul nu așteaptă — primește succes imediat.
     * Erorile sunt prinse în .catch() și logate, fără să afecteze UX-ul.
     */
    sendAdminContactMessage(ADMIN_EMAIL, {
      name: name.trim(),
      email: email.trim(),
      phone: phone?.trim() || null,
      subject: subject?.trim() || null,
      message: message.trim(),
    }).catch((err) => console.error("⚠️  Contact email eșuat:", err.message));

    console.log(`📬 Mesaj contact primit de la ${name} (${email})`);

    // ── Răspuns succes ────────────────────────────────────────────────────
    res.json({
      success: true,
      message: "Mesajul a fost trimis. Vă vom contacta în cel mai scurt timp!",
    });
  } catch (err) {
    console.error("❌ POST /api/contact:", err.message);
    res.status(500).json({
      success: false,
      error: "Mesajul nu a putut fi trimis. Vă rugăm încercați din nou.",
    });
  }
});

module.exports = router;
