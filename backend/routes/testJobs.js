/**
 * routes/testJobs.js — Endpoint-uri pentru testarea manuală a job-urilor cron
 *
 * ATENȚIE: Disponibile DOAR în development (NODE_ENV !== 'production')
 * Aceste rute declanșează manual logica job-urilor, fără să aștepți ora fixă.
 *
 * Montare în server.js:
 *   if (process.env.NODE_ENV !== 'production') {
 *     app.use('/api/test-jobs', require('./routes/testJobs'));
 *   }
 *
 * Utilizare: GET http://localhost:3001/api/test-jobs/<endpoint>
 */

"use strict";

const express = require("express");
const router = express.Router();
const { query } = require("../config/db");

// ─── Helper: formatează data pentru afișare ───────────────────────────────────
function fmtISO(val) {
  if (!val) return "";
  if (val instanceof Date) {
    const y = val.getFullYear();
    const m = String(val.getMonth() + 1).padStart(2, "0");
    const d = String(val.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }
  return String(val).substring(0, 10);
}

// ─── GET /api/test-jobs ───────────────────────────────────────────────────────
// Lista tuturor endpoint-urilor disponibile
router.get("/", (req, res) => {
  res.json({
    message: "🧪 Endpoint-uri de test pentru job-urile cron",
    endpoints: [
      {
        url: "GET /api/test-jobs/trigger-reminders",
        description:
          "Job 1 — Trimite emailuri de reminder check-in (pentru rezervările cu check-in mâine)",
      },
      {
        url: "GET /api/test-jobs/trigger-reviews",
        description:
          "Job 2 — Trimite emailuri de cerere recenzie (pentru rezervările finalizate ieri)",
      },
      {
        url: "GET /api/test-jobs/trigger-finalize",
        description:
          "Job 3 — Finalizează rezervările al căror check-out a trecut",
      },
      {
        url: "GET /api/test-jobs/trigger-expire",
        description:
          "Job 4 — Anulează rezervările bank_transfer pending mai vechi de 3 zile",
      },
      {
        url: "GET /api/test-jobs/preview-reminders",
        description:
          "Previzualizare: ce rezervări ar primi reminder mâine (fără a trimite emailuri)",
      },
      {
        url: "GET /api/test-jobs/preview-expire",
        description:
          "Previzualizare: ce rezervări ar expira azi (fără a le anula)",
      },
    ],
    note: "Disponibil doar în NODE_ENV=development",
  });
});

// ─── GET /api/test-jobs/preview-reminders ─────────────────────────────────────
// Arată ce rezervări ar primi reminder mâine — fără să trimită emailuri
router.get("/preview-reminders", async (req, res) => {
  try {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = fmtISO(tomorrow);

    const { rows } = await query(
      `SELECT b.booking_ref, b.guest_name, b.guest_email,
              b.check_in::text, b.check_out::text, b.status, r.name AS room_name
       FROM bookings b
       JOIN rooms r ON r.id = b.room_id
       WHERE b.check_in::date = $1
         AND b.status IN ('confirmed', 'pending')`,
      [tomorrowStr],
    );

    res.json({
      job: "Job 1 — Reminder check-in",
      targetDate: tomorrowStr,
      count: rows.length,
      wouldSendTo: rows,
      note: "Aceste rezervări ar primi email reminder dacă job-ul rulează acum.",
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── GET /api/test-jobs/preview-expire ────────────────────────────────────────
// Arată ce rezervări ar expira azi — fără să le anuleze
router.get("/preview-expire", async (req, res) => {
  try {
    const EXPIRE_AFTER_DAYS = 3;
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - EXPIRE_AFTER_DAYS);

    const { rows } = await query(
      `SELECT b.booking_ref, b.guest_name, b.guest_email,
          b.check_in::text, b.created_at::text, b.total_price,
          b.status, r.name AS room_name
   FROM bookings b
   JOIN rooms r ON r.id = b.room_id
   WHERE b.status = 'pending'
     AND b.created_at < $1`,
      [cutoff.toISOString()],
    );

    res.json({
      job: "Job 4 — Expirare rezervări bank_transfer",
      expireAfterDays: EXPIRE_AFTER_DAYS,
      cutoffDate: fmtISO(cutoff),
      count: rows.length,
      wouldCancel: rows,
      note: "Aceste rezervări ar fi anulate dacă job-ul rulează acum.",
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── GET /api/test-jobs/trigger-reminders ─────────────────────────────────────
// Declanșează manual Job 1 (reminder check-in)
router.get("/trigger-reminders", async (req, res) => {
  try {
    const emailServices = require("../services/email");

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = fmtISO(tomorrow);

    const { rows: bookings } = await query(
      `SELECT b.guest_name, b.guest_email, b.booking_ref,
              b.check_in::text, b.check_out::text, b.nights, b.total_price,
              r.name AS room_name
       FROM bookings b
       JOIN rooms r ON r.id = b.room_id
       WHERE b.check_in::date = $1
         AND b.status IN ('confirmed', 'pending')
         AND b.guest_email IS NOT NULL`,
      [tomorrowStr],
    );

    if (bookings.length === 0) {
      return res.json({
        job: "Job 1 — Reminder check-in",
        status: "skip",
        message: `Nicio rezervare cu check-in mâine (${tomorrowStr}).`,
        tip: "Creează o rezervare cu check-in mâine și încearcă din nou.",
      });
    }

    const results = await Promise.allSettled(
      bookings.map((b) =>
        emailServices.sendCheckInReminder(b.guest_email, {
          guestName: b.guest_name,
          roomName: b.room_name,
          checkIn: b.check_in?.substring(0, 10),
          checkOut: b.check_out?.substring(0, 10),
          nights: b.nights,
          totalPrice: b.total_price,
          bookingRef: b.booking_ref,
        }),
      ),
    );

    const sent = results.filter((r) => r.status === "fulfilled").length;
    const failed = results.filter((r) => r.status === "rejected").length;

    res.json({
      job: "Job 1 — Reminder check-in",
      status: "done",
      targetDate: tomorrowStr,
      emailsSent: sent,
      emailsFailed: failed,
      bookings: bookings.map((b) => ({
        ref: b.booking_ref,
        email: b.guest_email,
        name: b.guest_name,
      })),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── GET /api/test-jobs/trigger-reviews ───────────────────────────────────────
// Declanșează manual Job 2 (cerere recenzie)
router.get("/trigger-reviews", async (req, res) => {
  try {
    const emailServices = require("../services/email");

    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = fmtISO(yesterday);

    const { rows: bookings } = await query(
      `SELECT b.guest_name, b.guest_email, b.booking_ref, b.id AS booking_id,
              b.check_in::text, b.check_out::text, r.name AS room_name
       FROM bookings b
       JOIN rooms r ON r.id = b.room_id
       WHERE b.check_out::date = $1
         AND b.status = 'finished'
         AND b.guest_email IS NOT NULL`,
      [yesterdayStr],
    );

    if (bookings.length === 0) {
      return res.json({
        job: "Job 2 — Cerere recenzie",
        status: "skip",
        message: `Nicio rezervare finalizată cu check-out ieri (${yesterdayStr}).`,
        tip: "Finalizează o rezervare cu check-out ieri și încearcă din nou.",
      });
    }

    const results = await Promise.allSettled(
      bookings.map((b) =>
        emailServices.sendReviewRequest(b.guest_email, {
          guestName: b.guest_name,
          roomName: b.room_name,
          checkIn: b.check_in?.substring(0, 10),
          checkOut: b.check_out?.substring(0, 10),
          bookingRef: b.booking_id,
        }),
      ),
    );

    const sent = results.filter((r) => r.status === "fulfilled").length;
    const failed = results.filter((r) => r.status === "rejected").length;

    res.json({
      job: "Job 2 — Cerere recenzie",
      status: "done",
      targetDate: yesterdayStr,
      emailsSent: sent,
      emailsFailed: failed,
      bookings: bookings.map((b) => ({
        ref: b.booking_ref,
        email: b.guest_email,
        name: b.guest_name,
      })),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── GET /api/test-jobs/trigger-finalize ──────────────────────────────────────
// Declanșează manual Job 3 (finalizare rezervări)
router.get("/trigger-finalize", async (req, res) => {
  try {
    const today = fmtISO(new Date());

    // Găsim rezervările care trebuie finalizate
    const { rows: toFinalize } = await query(
      `SELECT id, booking_ref, guest_name, check_out::text
       FROM bookings
       WHERE status = 'confirmed'
         AND check_out::date <= $1`,
      [today],
    );

    if (toFinalize.length === 0) {
      return res.json({
        job: "Job 3 — Finalizare rezervări",
        status: "skip",
        message:
          "Nicio rezervare confirmată cu check-out astăzi sau în trecut.",
      });
    }

    // Le marcăm ca 'finished'
    await query(
      `UPDATE bookings
       SET status = 'finished', updated_at = NOW()
       WHERE status = 'confirmed'
         AND check_out::date <= $1`,
      [today],
    );

    res.json({
      job: "Job 3 — Finalizare rezervări",
      status: "done",
      finalized: toFinalize.length,
      bookings: toFinalize.map((b) => ({
        ref: b.booking_ref,
        name: b.guest_name,
        checkOut: b.check_out?.substring(0, 10),
      })),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── GET /api/test-jobs/trigger-expire ────────────────────────────────────────
// Declanșează manual Job 4 (expirare rezervări bank_transfer)
router.get("/trigger-expire", async (req, res) => {
  try {
    const emailServices = require("../services/email");
    const EXPIRE_AFTER_DAYS = 3;

    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - EXPIRE_AFTER_DAYS);

    const { rows: expired } = await query(
      `SELECT b.id, b.booking_ref, b.guest_name, b.guest_email,
          b.check_in::text, b.check_out::text, b.nights, b.total_price,
          b.created_at::text, r.name AS room_name
   FROM bookings b
   JOIN rooms r ON r.id = b.room_id
   WHERE b.status = 'pending'
     AND b.created_at < $1
     AND b.guest_email IS NOT NULL`,
      [cutoff.toISOString()],
    );

    if (expired.length === 0) {
      return res.json({
        job: "Job 4 — Expirare bank_transfer",
        status: "skip",
        message: `Nicio rezervare bank_transfer pending mai veche de ${EXPIRE_AFTER_DAYS} zile.`,
        cutoffDate: fmtISO(cutoff),
        tip: `Creează o rezervare bank_transfer și setează created_at cu ${EXPIRE_AFTER_DAYS}+ zile în urmă pentru test.`,
      });
    }

    // Anulăm și trimitem emailuri
    const results = await Promise.allSettled(
      expired.map(async (b) => {
        await query(
          `UPDATE bookings SET status = 'cancelled', updated_at = NOW() WHERE id = $1`,
          [b.id],
        );
        await emailServices.sendBookingExpired(b.guest_email, {
          guestName: b.guest_name,
          roomName: b.room_name,
          checkIn: b.check_in?.substring(0, 10),
          checkOut: b.check_out?.substring(0, 10),
          nights: b.nights,
          totalPrice: b.total_price,
          bookingRef: b.booking_ref,
          expireDays: EXPIRE_AFTER_DAYS,
        });
      }),
    );

    const succeeded = results.filter((r) => r.status === "fulfilled").length;
    const failed = results.filter((r) => r.status === "rejected").length;

    // Alertă admin
    if (succeeded > 0) {
      const adminEmail = process.env.ADMIN_EMAIL || process.env.EMAIL_USER;
      await emailServices
        .sendAdminExpiredBookingsAlert(adminEmail, {
          count: succeeded,
          bookings: expired,
          expireDays: EXPIRE_AFTER_DAYS,
        })
        .catch(() => {});
    }

    res.json({
      job: "Job 4 — Expirare bank_transfer",
      status: "done",
      expireDays: EXPIRE_AFTER_DAYS,
      cutoffDate: fmtISO(cutoff),
      cancelled: succeeded,
      failed,
      bookings: expired.map((b) => ({
        ref: b.booking_ref,
        name: b.guest_name,
        email: b.guest_email,
        createdAt: b.created_at?.substring(0, 10),
      })),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

//ENDPOINTS
// ─── GET /api/test-jobs/seed ──────────────────────────────────────────────────
// Inserează rezervări de test direct în DB — fără pgAdmin sau SQL manual
router.get("/seed", async (req, res) => {
  try {
    // Luăm primul room_id activ din DB
    const { rows: rooms } = await query(
      `SELECT id FROM rooms WHERE status = 'active' LIMIT 1`,
    );

    if (rooms.length === 0) {
      return res
        .status(400)
        .json({ error: "Nicio cameră activă găsită în DB." });
    }

    const roomId = rooms[0].id;

    // Șterge rezervările de test vechi dacă există
    await query(
      `DELETE FROM bookings WHERE booking_ref IN ('BLV-TEST-001', 'BLV-TEST-002')`,
    );
    await query(
      `DELETE FROM guest_ids WHERE booking_id NOT IN (SELECT id FROM bookings)`,
    );

    // BLV-TEST-001 — confirmed, check-out ieri (mereu relativ la ziua curentă)
    await query(
      `INSERT INTO bookings (
    booking_ref, room_id, guest_name, guest_email, guest_phone,
    check_in, check_out, guests, total_price,
    status, payment_split, source,
    stripe_amount, remaining_amount
  ) VALUES (
    'BLV-TEST-001', $1, 'Test Client Job3', 'ardeleanvalentin490@yahoo.com', '+40700000000',
    (CURRENT_TIMESTAMP AT TIME ZONE 'Europe/Bucharest')::date - INTERVAL '5 days',
    (CURRENT_TIMESTAMP AT TIME ZONE 'Europe/Bucharest')::date - INTERVAL '1 day',
    2, 750, 'confirmed', 'full', 'website', 750, 0
  )`,
      [roomId],
    );

    // BLV-TEST-002 — pending, creat acum 4 zile (mereu relativ la ziua curentă)
    await query(
      `INSERT INTO bookings (
    booking_ref, room_id, guest_name, guest_email, guest_phone,
    check_in, check_out, guests, total_price,
    status, payment_split, source,
    stripe_amount, remaining_amount, created_at
  ) VALUES (
    'BLV-TEST-002', $1, 'Test Client Job4', 'ardeleanvalentin490@yahoo.com', '+40700000000',
    (CURRENT_TIMESTAMP AT TIME ZONE 'Europe/Bucharest')::date + INTERVAL '10 days',
    (CURRENT_TIMESTAMP AT TIME ZONE 'Europe/Bucharest')::date + INTERVAL '13 days',
    2, 750, 'pending', 'full', 'website', NULL, 750,
    (CURRENT_TIMESTAMP AT TIME ZONE 'Europe/Bucharest')::date - INTERVAL '4 days'
  )`,
      [roomId],
    );

    res.json({
      status: "done",
      message: "Rezervări de test create cu succes.",
      created: [
        {
          ref: "BLV-TEST-001",
          description:
            "confirmed + check-out în trecut → testează Job 3 și Job 2",
        },
        {
          ref: "BLV-TEST-002",
          description: "pending bank_transfer vechi 4 zile → testează Job 4",
        },
      ],
      nextSteps: [
        "1. /api/test-jobs/trigger-finalize  → BLV-TEST-001 devine finished",
        "2. /api/test-jobs/trigger-reviews   → trimite email recenzie",
        "3. /api/test-jobs/trigger-expire    → BLV-TEST-002 devine cancelled",
        "4. /api/test-jobs/cleanup           → șterge rezervările de test",
      ],
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── GET /api/test-jobs/cleanup ───────────────────────────────────────────────
// Șterge rezervările de test din DB
router.get("/cleanup", async (req, res) => {
  try {
    const { rowCount } = await query(
      `DELETE FROM bookings WHERE booking_ref IN ('BLV-TEST-001', 'BLV-TEST-002')`,
    );
    await query(
      `DELETE FROM guest_ids WHERE booking_id NOT IN (SELECT id FROM bookings)`,
    );
    res.json({
      status: "done",
      message: `${rowCount} rezervare(i) de test șterse.`,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/check-columns", async (req, res) => {
  try {
    const { rows } = await query(`
      SELECT column_name FROM information_schema.columns
      WHERE table_name = 'bookings'
      ORDER BY ordinal_position
    `);
    res.json({ columns: rows.map((r) => r.column_name) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
