"use strict";

/**
 * routes/settings.js — Configurări generale ale pensiunii
 *
 * GET  /api/settings              — toate setările (public, pentru frontend)
 * GET  /api/settings/:group       — setările unui grup (prices, content_home, etc.)
 * PATCH /api/settings/:key        — actualizează o setare (admin only)
 * PATCH /api/settings             — actualizează mai multe setări deodată (admin only)
 */

const express = require("express");
const router = express.Router();
const { query } = require("../config/db");

// Auto-creare tabelă dacă nu există
router.get("/init", async (req, res) => {
  try {
    await query(`
      CREATE TABLE IF NOT EXISTS site_settings (
        key         VARCHAR(100) PRIMARY KEY,
        value       TEXT         NOT NULL DEFAULT '',
        type        VARCHAR(20)  NOT NULL DEFAULT 'text'
                    CHECK (type IN ('text', 'number', 'textarea', 'boolean')),
        label       VARCHAR(200) NOT NULL DEFAULT '',
        group_name  VARCHAR(100) NOT NULL DEFAULT 'general',
        sort_order  INTEGER      NOT NULL DEFAULT 0,
        updated_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
      )
    `);
    res.json({ success: true, message: "Tabelă creată!" });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.get("/seed", async (req, res) => {
  try {
    await query(`
      INSERT INTO site_settings (key, value, type, label, group_name, sort_order) VALUES
        ('price_breakfast', '50', 'number', 'Preț Mic Dejun (RON/persoană/noapte)', 'prices', 1),
        ('price_dinner', '80', 'number', 'Preț Cină (RON/persoană/noapte)', 'prices', 2),
        ('price_extra_bed', '50', 'number', 'Preț Pat Suplimentar (RON/noapte/loc)', 'prices', 3),
        ('price_jacuzzi', '100', 'number', 'Preț Ciubăr/Jacuzzi (RON/sesiune)', 'prices', 4),
        ('home_story_title', 'Povestea Noastră', 'text', 'Titlu secțiune Povestea Noastră (home)', 'content_home', 1),
        ('home_story_p1', 'Situată pe dealurile Maramureșului — una dintre ultimele regiuni cu adevărat nespoilate din Europa — Belvedere s-a născut din dragostea pentru acest pământ și tradițiile sale eterne.', 'textarea', 'Paragraf 1 Povestea Noastră (home)', 'content_home', 2),
        ('home_story_p2', 'Fiecare detaliu, de la balcoanele sculptate manual la micul dejun cu produse locale, reflectă sufletul Maramureșului.', 'textarea', 'Paragraf 2 Povestea Noastră (home)', 'content_home', 3),
        ('about_story_title', 'Povestea Pensiunii', 'text', 'Titlu secțiune Povestea Pensiunii (about)', 'content_about', 1),
        ('about_story_p1', 'Pensiunea Maramureș Belvedere este situată pe un vârf de deal, la intrarea în Petrova dinspre Sighetu Marmației, lângă pădurea de pe Dealul Hera.', 'textarea', 'Paragraf 1 Povestea Pensiunii (about)', 'content_about', 2),
        ('about_story_p2', 'Accesul este facil — la doar 100 m de pe DN 18, drumul care leagă Sighetu Marmației de Vișeu, pensiunea aflându-se aproximativ la jumătatea distanței dintre cele două orașe.', 'textarea', 'Paragraf 2 Povestea Pensiunii (about)', 'content_about', 3),
        ('about_story_p3', 'Primii vecini se află la 500–700 m distanță, ceea ce face din pensiune un refugiu perfect pentru relaxare, departe de agitația orașului, într-un cadru natural de excepție.', 'textarea', 'Paragraf 3 Povestea Pensiunii (about)', 'content_about', 4),
        ('facility_jacuzzi_title', 'Jacuzzi / Ciubăr', 'text', 'Facilitate: Titlu Jacuzzi', 'facilities', 1),
        ('facility_jacuzzi_desc', 'Ciubăr cu sistem de jacuzzi și iluminat ambiental. Poate fi rezervat contra cost pentru o experiență relaxantă sub cerul liber.', 'textarea', 'Facilitate: Descriere Jacuzzi', 'facilities', 2),
        ('facility_bikes_title', 'Biciclete Gratuite', 'text', 'Facilitate: Titlu Biciclete', 'facilities', 3),
        ('facility_bikes_desc', '8 biciclete disponibile gratuit pentru oaspeți. Explorați traseele din împrejurimi în propriul ritm.', 'textarea', 'Facilitate: Descriere Biciclete', 'facilities', 4),
        ('facility_pingpong_title', 'Masă de Ping Pong', 'text', 'Facilitate: Titlu Ping Pong', 'facilities', 5),
        ('facility_pingpong_desc', 'Masă de ping pong disponibilă gratuit pentru distracție și relaxare în aer liber.', 'textarea', 'Facilitate: Descriere Ping Pong', 'facilities', 6),
        ('facility_sleds_title', 'Săniuțe (Iarnă)', 'text', 'Facilitate: Titlu Săniuțe', 'facilities', 7),
        ('facility_sleds_desc', 'Săniuțe gratuite pentru oaspeți și un derdeluș amenajat chiar în curtea pensiunii.', 'textarea', 'Facilitate: Descriere Săniuțe', 'facilities', 8),
        ('facility_grill_title', 'Grătar & Ceaun', 'text', 'Facilitate: Titlu Grătar', 'facilities', 9),
        ('facility_grill_desc', 'Zonă amenajată pentru grătar și gătit la ceaun în aer liber. Savurați o masă tradițională în natură.', 'textarea', 'Facilitate: Descriere Grătar', 'facilities', 10),
        ('facility_parking_title', 'Parcare Gratuită', 'text', 'Facilitate: Titlu Parcare', 'facilities', 11),
        ('facility_parking_desc', 'Parcare privată gratuită disponibilă pentru toți oaspeții pensiunii.', 'textarea', 'Facilitate: Descriere Parcare', 'facilities', 12),
        ('facility_playground_title', 'Loc de Joacă Copii', 'text', 'Facilitate: Titlu Loc de Joacă', 'facilities', 13),
        ('facility_playground_desc', 'Loc de joacă amenajat cu trambulină, leagăn și tobogan. Copiii se vor simți minunat!', 'textarea', 'Facilitate: Descriere Loc de Joacă', 'facilities', 14),
        ('facility_traditional_title', 'Port Tradițional', 'text', 'Facilitate: Titlu Port Tradițional', 'facilities', 15),
        ('facility_traditional_desc', 'Posibilitate de a îmbrăca portul tradițional specific zonei Maramureșului Istoric.', 'textarea', 'Facilitate: Descriere Port Tradițional', 'facilities', 16)
      ON CONFLICT (key) DO NOTHING
    `);

    await query(`
      ALTER TABLE bookings ADD COLUMN IF NOT EXISTS extras_json JSONB DEFAULT NULL;
      ALTER TABLE bookings ADD COLUMN IF NOT EXISTS extras_price INTEGER DEFAULT 0;
    `);

    res.json({ success: true, message: "Date inserate cu succes!" });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─── GET /api/settings ───────────────────────────────────────────────────────
// Returnează toate setările ca obiect { key: value }
// Folosit de frontend pentru a afișa conținut dinamic
router.get("/", async (req, res) => {
  try {
    const { rows } = await query(
      `SELECT key, value, type, label, group_name, sort_order
       FROM site_settings
       ORDER BY group_name, sort_order`,
    );

    // Transformăm în { key: value } pentru consum ușor în React
    const settings = {};
    rows.forEach((r) => {
      settings[r.key] =
        r.type === "number" ? Number.parseFloat(r.value) : r.value;
    });

    res.json({ success: true, data: settings, rows });
  } catch (err) {
    console.error("❌ GET /api/settings:", err.message);
    res.status(500).json({ success: false, error: "Eroare server" });
  }
});

// ─── GET /api/settings/group/:group ─────────────────────────────────────────
// Returnează setările unui grup specific
router.get("/group/:group", async (req, res) => {
  try {
    const { group } = req.params;
    const { rows } = await query(
      `SELECT key, value, type, label, sort_order
       FROM site_settings
       WHERE group_name = $1
       ORDER BY sort_order`,
      [group],
    );

    const settings = {};
    rows.forEach((r) => {
      settings[r.key] =
        r.type === "number" ? Number.parseFloat(r.value) : r.value;
    });

    res.json({ success: true, data: settings, rows });
  } catch (err) {
    console.error("❌ GET /api/settings/group/:group:", err.message);
    res.status(500).json({ success: false, error: "Eroare server" });
  }
});

router.get("/seed-general", async (req, res) => {
  try {
    await query(`
      INSERT INTO site_settings (key, value, type, label, group_name, sort_order) VALUES
        ('guesthouse_name', 'Maramureș Belvedere', 'text', 'Nume Pensiune', 'general', 1),
        ('guesthouse_address', 'Str. Hera, Nr. 2, Petrova, Maramureș, România', 'text', 'Adresă', 'general', 2),
        ('guesthouse_phone', '+40 262 330 123', 'text', 'Telefon', 'general', 3),
        ('guesthouse_email', 'contact@maramures-belvedere.ro', 'text', 'Email', 'general', 4)
      ON CONFLICT (key) DO NOTHING
    `);
    res.json({ success: true, message: "Date generale inserate!" });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─── PATCH /api/settings/:key ────────────────────────────────────────────────
// Actualizează o singură setare — admin only
router.patch("/:key", async (req, res) => {
  try {
    const { key } = req.params;
    const { value } = req.body;

    if (value === undefined || value === null) {
      return res
        .status(400)
        .json({ success: false, error: "Câmpul 'value' este obligatoriu" });
    }

    const { rows } = await query(
      `UPDATE site_settings
       SET value = $1, updated_at = NOW()
       WHERE key = $2
       RETURNING key, value, type, label`,
      [String(value), key],
    );

    if (rows.length === 0) {
      return res
        .status(404)
        .json({ success: false, error: `Setarea '${key}' nu există` });
    }

    console.log(`⚙️  Setare actualizată: ${key} = ${value}`);
    res.json({ success: true, data: rows[0] });
  } catch (err) {
    console.error("❌ PATCH /api/settings/:key:", err.message);
    res.status(500).json({ success: false, error: "Eroare server" });
  }
});

// ─── PATCH /api/settings ─────────────────────────────────────────────────────
// Actualizează mai multe setări simultan — admin only
// Body: { key1: value1, key2: value2, ... }
router.patch("/", async (req, res) => {
  try {
    const updates = req.body;
    if (!updates || typeof updates !== "object" || Array.isArray(updates)) {
      return res
        .status(400)
        .json({ success: false, error: "Body trebuie să fie un obiect" });
    }

    const entries = Object.entries(updates);
    if (entries.length === 0) {
      return res
        .status(400)
        .json({ success: false, error: "Nicio setare de actualizat" });
    }

    const client = await require("../config/db").pool.connect();
    try {
      await client.query("BEGIN");

      const results = [];
      for (const [key, value] of entries) {
        const { rows } = await client.query(
          `UPDATE site_settings
           SET value = $1, updated_at = NOW()
           WHERE key = $2
           RETURNING key, value`,
          [String(value), key],
        );
        if (rows.length > 0) results.push(rows[0]);
      }

      await client.query("COMMIT");
      console.log(
        `⚙️  Setări actualizate în batch: ${entries.map(([k]) => k).join(", ")}`,
      );
      res.json({ success: true, data: results, updated: results.length });
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  } catch (err) {
    console.error("❌ PATCH /api/settings:", err.message);
    res.status(500).json({ success: false, error: "Eroare server" });
  }
});

router.get("/run-migration", async (req, res) => {
  try {
    await query(
      `ALTER TABLE bookings ADD COLUMN IF NOT EXISTS guest_data JSONB DEFAULT NULL`,
    );
    await query(`DROP TABLE IF EXISTS guest_ids`);
    res.json({ success: true, message: "Migrare completă!" });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
