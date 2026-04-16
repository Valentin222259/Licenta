"use strict";

const express = require("express");
const router = express.Router();
const { query } = require("../config/db");

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

router.get("/", (req, res) => {
  res.json({
    message: "🧪 Endpoint-uri de test pentru job-urile cron",
    endpoints: [
      {
        url: "GET /api/test-jobs/trigger-reminders",
        description: "Job 1 — Reminder check-in",
      },
      {
        url: "GET /api/test-jobs/trigger-reviews",
        description: "Job 2 — Cerere recenzie",
      },
      {
        url: "GET /api/test-jobs/trigger-finalize",
        description: "Job 3 — Finalizare rezervări",
      },
      {
        url: "GET /api/test-jobs/trigger-expire",
        description: "Job 4 — Expirare bank_transfer",
      },
      {
        url: "GET /api/test-jobs/preview-reminders",
        description: "Previzualizare reminder",
      },
      {
        url: "GET /api/test-jobs/preview-expire",
        description: "Previzualizare expirare",
      },
    ],
    note: "Disponibil doar în NODE_ENV=development",
  });
});

// ─── Preview reminders ────────────────────────────────────────────────────────
router.get("/preview-reminders", async (req, res) => {
  try {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = fmtISO(tomorrow);

    const { rows } = await query(
      `SELECT b.booking_ref, b.guest_name, b.guest_email,
              b.check_in::text, b.check_out::text, b.status,
              b.preferred_language, r.name AS room_name
       FROM bookings b JOIN rooms r ON r.id = b.room_id
       WHERE b.check_in::date = $1 AND b.status IN ('confirmed', 'pending')`,
      [tomorrowStr],
    );

    res.json({
      job: "Job 1 — Reminder check-in",
      targetDate: tomorrowStr,
      count: rows.length,
      wouldSendTo: rows,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Preview expire ───────────────────────────────────────────────────────────
router.get("/preview-expire", async (req, res) => {
  try {
    const EXPIRE_AFTER_DAYS = 3;
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - EXPIRE_AFTER_DAYS);

    const { rows } = await query(
      `SELECT b.booking_ref, b.guest_name, b.guest_email,
              b.check_in::text, b.created_at::text, b.total_price,
              b.status, b.preferred_language, r.name AS room_name
       FROM bookings b JOIN rooms r ON r.id = b.room_id
       WHERE b.status = 'pending' AND b.created_at < $1`,
      [cutoff.toISOString()],
    );

    res.json({
      job: "Job 4 — Expirare",
      expireAfterDays: EXPIRE_AFTER_DAYS,
      cutoffDate: fmtISO(cutoff),
      count: rows.length,
      wouldCancel: rows,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Trigger reminders ────────────────────────────────────────────────────────
router.get("/trigger-reminders", async (req, res) => {
  try {
    const emailServices = require("../services/email");

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = fmtISO(tomorrow);

    const { rows: bookings } = await query(
      `SELECT b.guest_name, b.guest_email, b.booking_ref,
              b.check_in::text, b.check_out::text, b.nights, b.total_price,
              b.preferred_language, r.name AS room_name
       FROM bookings b JOIN rooms r ON r.id = b.room_id
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
      });
    }

    const results = await Promise.allSettled(
      bookings.map((b) =>
        emailServices.sendCheckInReminder(
          b.guest_email,
          {
            guestName: b.guest_name,
            roomName: b.room_name,
            checkIn: b.check_in?.substring(0, 10),
            checkOut: b.check_out?.substring(0, 10),
            nights: b.nights,
            totalPrice: b.total_price,
            bookingRef: b.booking_ref,
          },
          b.preferred_language || "ro",
        ),
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
        lang: b.preferred_language,
      })),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Trigger reviews ──────────────────────────────────────────────────────────
router.get("/trigger-reviews", async (req, res) => {
  try {
    const emailServices = require("../services/email");

    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = fmtISO(yesterday);

    const { rows: bookings } = await query(
      `SELECT b.guest_name, b.guest_email, b.booking_ref, b.id AS booking_id,
              b.check_in::text, b.check_out::text, b.preferred_language,
              r.name AS room_name
       FROM bookings b JOIN rooms r ON r.id = b.room_id
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
      });
    }

    const results = await Promise.allSettled(
      bookings.map((b) =>
        emailServices.sendReviewRequest(
          b.guest_email,
          {
            guestName: b.guest_name,
            roomName: b.room_name,
            checkIn: b.check_in?.substring(0, 10),
            checkOut: b.check_out?.substring(0, 10),
            bookingRef: b.booking_id,
          },
          b.preferred_language || "ro",
        ),
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
        lang: b.preferred_language,
      })),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Trigger finalize ─────────────────────────────────────────────────────────
router.get("/trigger-finalize", async (req, res) => {
  try {
    const today = fmtISO(new Date());

    const { rows: toFinalize } = await query(
      `SELECT id, booking_ref, guest_name, check_out::text
       FROM bookings WHERE status = 'confirmed' AND check_out::date <= $1`,
      [today],
    );

    if (toFinalize.length === 0) {
      return res.json({
        job: "Job 3 — Finalizare rezervări",
        status: "skip",
        message: "Nicio rezervare de finalizat.",
      });
    }

    await query(
      `UPDATE bookings SET status = 'finished', updated_at = NOW() WHERE status = 'confirmed' AND check_out::date <= $1`,
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

// ─── Trigger expire ───────────────────────────────────────────────────────────
router.get("/trigger-expire", async (req, res) => {
  try {
    const emailServices = require("../services/email");
    const EXPIRE_AFTER_DAYS = 3;

    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - EXPIRE_AFTER_DAYS);

    const { rows: expired } = await query(
      `SELECT b.id, b.booking_ref, b.guest_name, b.guest_email,
              b.check_in::text, b.check_out::text, b.nights, b.total_price,
              b.created_at::text, b.preferred_language, r.name AS room_name
       FROM bookings b JOIN rooms r ON r.id = b.room_id
       WHERE b.status = 'pending'
         AND b.created_at < $1
         AND b.guest_email IS NOT NULL`,
      [cutoff.toISOString()],
    );

    if (expired.length === 0) {
      return res.json({
        job: "Job 4 — Expirare bank_transfer",
        status: "skip",
        message: `Nicio rezervare pending mai veche de ${EXPIRE_AFTER_DAYS} zile.`,
        cutoffDate: fmtISO(cutoff),
      });
    }

    const results = await Promise.allSettled(
      expired.map(async (b) => {
        await query(
          `UPDATE bookings SET status = 'cancelled', updated_at = NOW() WHERE id = $1`,
          [b.id],
        );
        await emailServices.sendBookingExpired(
          b.guest_email,
          {
            guestName: b.guest_name,
            roomName: b.room_name,
            checkIn: b.check_in?.substring(0, 10),
            checkOut: b.check_out?.substring(0, 10),
            nights: b.nights,
            totalPrice: b.total_price,
            bookingRef: b.booking_ref,
            expireDays: EXPIRE_AFTER_DAYS,
          },
          b.preferred_language || "ro",
        );
      }),
    );

    const succeeded = results.filter((r) => r.status === "fulfilled").length;
    const failed = results.filter((r) => r.status === "rejected").length;

    if (succeeded > 0) {
      const adminEmail = process.env.ADMIN_EMAIL || process.env.EMAIL_USER;
      await emailServices
        .sendAdminExpiredBookingsAlert(adminEmail, {
          count: succeeded,
          bookings: expired,
          expireDays: EXPIRE_AFTER_DAYS,
        })
        .catch((err) =>
          console.error("⚠️ Email alertă admin expirate:", err.message),
        );
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
        lang: b.preferred_language,
      })),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Seed ─────────────────────────────────────────────────────────────────────
router.get("/seed", async (req, res) => {
  try {
    const { rows: rooms } = await query(
      `SELECT id FROM rooms WHERE status = 'active' LIMIT 1`,
    );
    if (rooms.length === 0)
      return res.status(400).json({ error: "Nicio cameră activă." });

    const roomId = rooms[0].id;
    const now = new Date(
      new Date().toLocaleString("en-US", { timeZone: "Europe/Bucharest" }),
    );
    const pad = (n) => String(n).padStart(2, "0");
    const toDate = (d) =>
      `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);
    const fiveDaysAgo = new Date(now);
    fiveDaysAgo.setDate(now.getDate() - 5);
    const tenDaysAhead = new Date(now);
    tenDaysAhead.setDate(now.getDate() + 10);
    const thirteenDaysAhead = new Date(now);
    thirteenDaysAhead.setDate(now.getDate() + 13);
    const fourDaysAgo = new Date(now);
    fourDaysAgo.setDate(now.getDate() - 4);

    await query(
      `DELETE FROM bookings WHERE booking_ref IN ('BLV-TEST-001', 'BLV-TEST-002')`,
    );
    await query(
      `DELETE FROM guest_ids WHERE booking_id NOT IN (SELECT id FROM bookings)`,
    );

    await query(
      `INSERT INTO bookings (booking_ref, room_id, guest_name, guest_email, guest_phone,
        check_in, check_out, guests, total_price, status, payment_split, source,
        stripe_amount, remaining_amount, preferred_language)
       VALUES ('BLV-TEST-001', $1, 'Test Client Job3', 'ardeleanvalentin490@yahoo.com', '+40700000000',
        $2, $3, 2, 750, 'confirmed', 'full', 'website', 750, 0, 'ro')`,
      [roomId, toDate(fiveDaysAgo), toDate(yesterday)],
    );

    await query(
      `INSERT INTO bookings (booking_ref, room_id, guest_name, guest_email, guest_phone,
        check_in, check_out, guests, total_price, status, payment_split, source,
        stripe_amount, remaining_amount, created_at, preferred_language)
       VALUES ('BLV-TEST-002', $1, 'Test Client Job4', 'ardeleanvalentin490@yahoo.com', '+40700000000',
        $2, $3, 2, 750, 'pending', 'full', 'website', NULL, 750, $4, 'ro')`,
      [
        roomId,
        toDate(tenDaysAhead),
        toDate(thirteenDaysAhead),
        toDate(fourDaysAgo),
      ],
    );

    res.json({
      status: "done",
      message: "Rezervări de test create.",
      created: [
        "BLV-TEST-001 — confirmed, check-out ieri",
        "BLV-TEST-002 — pending vechi 4 zile",
      ],
      nextSteps: [
        "1. /trigger-finalize → BLV-TEST-001 devine finished",
        "2. /trigger-reviews  → trimite email recenzie",
        "3. /trigger-expire   → BLV-TEST-002 devine cancelled",
        "4. /cleanup          → șterge rezervările de test",
      ],
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Cleanup ──────────────────────────────────────────────────────────────────
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
    const { rows } = await query(
      `SELECT column_name FROM information_schema.columns WHERE table_name = 'bookings' ORDER BY ordinal_position`,
    );
    res.json({ columns: rows.map((r) => r.column_name) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/seed-en", async (req, res) => {
  try {
    const { rows: rooms } = await query(
      `SELECT id FROM rooms WHERE status = 'active' LIMIT 1`,
    );
    if (rooms.length === 0)
      return res.status(400).json({ error: "Nicio cameră activă." });

    const roomId = rooms[0].id;
    const now = new Date(
      new Date().toLocaleString("en-US", { timeZone: "Europe/Bucharest" }),
    );
    const pad = (n) => String(n).padStart(2, "0");
    const toDate = (d) =>
      `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

    const tomorrow = new Date(now);
    tomorrow.setDate(now.getDate() + 1);
    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);
    const fiveDaysAgo = new Date(now);
    fiveDaysAgo.setDate(now.getDate() - 5);
    const tenDaysAhead = new Date(now);
    tenDaysAhead.setDate(now.getDate() + 10);
    const thirteenDaysAhead = new Date(now);
    thirteenDaysAhead.setDate(now.getDate() + 13);
    const fourDaysAgo = new Date(now);
    fourDaysAgo.setDate(now.getDate() - 4);

    await query(
      `DELETE FROM bookings WHERE booking_ref IN ('BLV-TEST-EN-001', 'BLV-TEST-EN-002', 'BLV-TEST-EN-003')`,
    );
    await query(
      `DELETE FROM guest_ids WHERE booking_id NOT IN (SELECT id FROM bookings)`,
    );

    // EN-001 — confirmed, check-out ieri → testează Job 3 (finalize) + Job 2 (review)
    await query(
      `INSERT INTO bookings (booking_ref, room_id, guest_name, guest_email, guest_phone,
        check_in, check_out, guests, total_price, status, payment_split, source,
        stripe_amount, remaining_amount, preferred_language)
       VALUES ('BLV-TEST-EN-001', $1, 'English Test Guest', 'ardeleanvalentin490@yahoo.com', '+40700000000',
        $2, $3, 2, 750, 'confirmed', 'full', 'website', 750, 0, 'en')`,
      [roomId, toDate(fiveDaysAgo), toDate(yesterday)],
    );

    // EN-002 — confirmed, check-in mâine → testează Job 1 (reminder)
    await query(
      `INSERT INTO bookings (booking_ref, room_id, guest_name, guest_email, guest_phone,
        check_in, check_out, guests, total_price, status, payment_split, source,
        stripe_amount, remaining_amount, preferred_language)
       VALUES ('BLV-TEST-EN-002', $1, 'English Test Guest', 'ardeleanvalentin490@yahoo.com', '+40700000000',
        $2, $3, 2, 500, 'confirmed', 'full', 'website', 500, 0, 'en')`,
      [roomId, toDate(tomorrow), toDate(tenDaysAhead)],
    );

    // EN-003 — pending vechi 4 zile → testează Job 4 (expire)
    await query(
      `INSERT INTO bookings (booking_ref, room_id, guest_name, guest_email, guest_phone,
        check_in, check_out, guests, total_price, status, payment_split, source,
        stripe_amount, remaining_amount, created_at, preferred_language)
       VALUES ('BLV-TEST-EN-003', $1, 'English Test Guest', 'ardeleanvalentin490@yahoo.com', '+40700000000',
        $2, $3, 2, 750, 'pending', 'full', 'website', NULL, 750, $4, 'en')`,
      [
        roomId,
        toDate(tenDaysAhead),
        toDate(thirteenDaysAhead),
        toDate(fourDaysAgo),
      ],
    );

    res.json({
      status: "done",
      message: "Rezervări de test EN create cu succes.",
      created: [
        {
          ref: "BLV-TEST-EN-001",
          lang: "en",
          description:
            "confirmed, check-out ieri → trigger-finalize + trigger-reviews",
        },
        {
          ref: "BLV-TEST-EN-002",
          lang: "en",
          description: "confirmed, check-in mâine → trigger-reminders",
        },
        {
          ref: "BLV-TEST-EN-003",
          lang: "en",
          description: "pending vechi 4 zile → trigger-expire",
        },
      ],
      nextSteps: [
        "1. /trigger-reminders → EN-002 primește reminder în engleză",
        "2. /trigger-finalize  → EN-001 devine finished",
        "3. /trigger-reviews   → EN-001 primește recenzie în engleză",
        "4. /trigger-expire    → EN-003 devine cancelled + email expirare în engleză",
        "5. /cleanup-en        → șterge rezervările de test EN",
      ],
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── GET /api/test-jobs/cleanup-en ────────────────────────────────────────────
router.get("/cleanup-en", async (req, res) => {
  try {
    const { rowCount } = await query(
      `DELETE FROM bookings WHERE booking_ref IN ('BLV-TEST-EN-001', 'BLV-TEST-EN-002', 'BLV-TEST-EN-003')`,
    );
    await query(
      `DELETE FROM guest_ids WHERE booking_id NOT IN (SELECT id FROM bookings)`,
    );
    res.json({
      status: "done",
      message: `${rowCount} rezervare(i) de test EN șterse.`,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
