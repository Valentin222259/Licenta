"use strict";

/**
 * routes/testJobs.js
 * Test endpoints for jobs and emails.
 * Available ONLY in development (NODE_ENV !== 'production').
 *
 * Structure:
 *  A. SEED - populate DB with test data by category
 *  B. CLEANUP - delete test data
 *  C. INDIVIDUAL EMAIL TRIGGERS - one endpoint per email type
 *  D. CRON JOB TRIGGERS - simulate cron jobs
 *  E. PREVIEW - read-only, no side effects
 */

const express = require("express");
const router = express.Router();
const { query, pool } = require("../config/db");
const emailServices = require("../services/email");

const TEST_CLIENT_EMAIL = "ardeleanvalentin490@yahoo.com";
const ADMIN_EMAIL = "ardeleanvalentin737@yahoo.com";

// ─── Helper: today's date in Romania timezone (UTC+2/+3) ─────────────────────
// Always use Romanian time so seed dates match cron job expectations.
// new Date() is UTC on most servers — toLocaleDateString with timeZone fixes it.
function todayRO() {
  const now = new Date();
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Bucharest",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const get = (t) => parts.find((p) => p.type === t).value;
  return new Date(`${get("year")}-${get("month")}-${get("day")}T00:00:00.000Z`);
}

// ─── Helper: format date → "YYYY-MM-DD" ──────────────────────────────────────
function fmtISO(val) {
  if (!val) return "";
  if (val instanceof Date) {
    const y = val.getUTCFullYear();
    const m = String(val.getUTCMonth() + 1).padStart(2, "0");
    const d = String(val.getUTCDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }
  return String(val).substring(0, 10);
}

// ─── Helper: date relative to today (Romania time) ───────────────────────────
function relDate(days) {
  const d = todayRO();
  d.setUTCDate(d.getUTCDate() + days);
  return fmtISO(d);
}

// ─── Helper: get first active room from DB ────────────────────────────────────
async function getActiveRoomId() {
  const { rows } = await query(
    `SELECT id FROM rooms WHERE status = 'active' ORDER BY sort_order LIMIT 1`,
  );
  if (rows.length === 0) throw new Error("No active room found in DB.");
  return rows[0].id;
}

// ─── Helper: send structured response ────────────────────────────────────────
function ok(res, data) {
  res.json({ success: true, ...data });
}
function err(res, e) {
  console.error("❌", e.message);
  res.status(500).json({ success: false, error: e.message });
}

// ═══════════════════════════════════════════════════════════════════════════════
//  INDEX
// ═══════════════════════════════════════════════════════════════════════════════

router.get("/", (req, res) => {
  ok(res, {
    message: "Test Jobs — Development Only",
    sections: {
      "A. SEED": {
        "/api/test-jobs/seed/bookings": "Seed bookings (all types, RO+EN)",
        "/api/test-jobs/seed/jobs": "Seed bookings positioned for cron jobs",
      },
      "B. CLEANUP": {
        "/api/test-jobs/cleanup/all": "Delete all test data",
      },
      "C. EMAIL TRIGGERS": {
        "Bookings (client, bilingual)": {
          "/api/test-jobs/trigger/booking-confirmed-full":
            "[A1] Card full payment confirmation (RO+EN)",
          "/api/test-jobs/trigger/booking-confirmed-advance":
            "[A2] Card advance 30% confirmation (RO+EN)",
          "/api/test-jobs/trigger/booking-transfer":
            "[A3] Bank transfer instructions (RO+EN)",
          "/api/test-jobs/trigger/booking-transfer-b2b":
            "[A3b] Bank transfer + company invoice (RO+EN)",
          "/api/test-jobs/trigger/booking-cancelled":
            "[A4] Booking cancellation (RO+EN)",
          "/api/test-jobs/trigger/booking-expired":
            "[A5] Booking expired (RO+EN)",
          "/api/test-jobs/trigger/booking-reminder":
            "[A6] Check-in reminder (RO+EN)",
          "/api/test-jobs/trigger/booking-review-request":
            "[A7] Review request (RO+EN)",
          "/api/test-jobs/trigger/booking-review-confirm":
            "[A8] Review received confirmation (RO+EN)",
        },
        "Account (client, bilingual)": {
          "/api/test-jobs/trigger/account-welcome":
            "[B1] Welcome - account created (RO+EN)",
          "/api/test-jobs/trigger/account-password":
            "[B2] Password changed (RO+EN)",
          "/api/test-jobs/trigger/account-deleted":
            "[B3] Account deleted (RO+EN)",
          "/api/test-jobs/trigger/contact-confirm":
            "[B4] Contact message confirmation (RO+EN)",
        },
        "Admin (Romanian only)": {
          "/api/test-jobs/trigger/admin-new-booking":
            "[C1] Admin - new booking alert",
          "/api/test-jobs/trigger/admin-cancellation":
            "[C2] Admin - cancellation alert",
          "/api/test-jobs/trigger/admin-review":
            "[C3] Admin - new review alert",
          "/api/test-jobs/trigger/admin-contact":
            "[C4] Admin - contact message received",
          "/api/test-jobs/trigger/admin-expired":
            "[C5] Admin - expired bookings report",
        },
      },
      "D. CRON JOB TRIGGERS": {
        "/api/test-jobs/run/job-reminders?date=YYYY-MM-DD":
          "Job 1 - Check-in reminder (daily 10:00)",
        "/api/test-jobs/run/job-reviews?date=YYYY-MM-DD":
          "Job 2 - Review request (daily 12:00)",
        "/api/test-jobs/run/job-finalize":
          "Job 3 - Finalize bookings (daily 01:00)",
        "/api/test-jobs/run/job-expire":
          "Job 4 - Expire pending bookings (daily 09:00)",
      },
      "E. PREVIEW (no side effects)": {
        "/api/test-jobs/preview/reminders":
          "Preview bookings with check-in tomorrow",
        "/api/test-jobs/preview/expire":
          "Preview pending bookings older than 3 days",
      },
    },
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
//  A. SEED
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * @swagger
 * /api/test-jobs/seed/bookings:
 *   get:
 *     summary: "🌱 Seed - Bookings (all types, RO+EN)"
 *     tags: [Test Jobs]
 *     description: |
 *       Creates one booking for each possible combination:
 *       - Card full payment - RO and EN
 *       - Card advance 30% - RO and EN
 *       - Bank transfer - RO and EN
 *       - Bank transfer + company invoice (B2B) - RO and EN
 *       - With extras (breakfast, dinner, jacuzzi, extra bed) - RO and EN
 *       - Pay at reception - RO and EN
 *       - Cancelled booking - RO and EN
 *     responses:
 *       200:
 *         description: Bookings created successfully
 */
router.get("/seed/bookings", async (req, res) => {
  try {
    const roomId = await getActiveRoomId();
    const client = await pool.connect();

    try {
      await client.query("BEGIN");
      await client.query(
        `DELETE FROM bookings WHERE booking_ref LIKE 'BLV-BK-%'`,
      );

      const extrasJson = JSON.stringify({
        breakfast: { [relDate(1)]: 2, [relDate(2)]: 2 },
        dinner: { [relDate(1)]: 1 },
        extra_beds: 1,
        jacuzzi: 1,
        jacuzzi_dates: [relDate(1)],
      });

      const bookings = [
        {
          ref: "BLV-BK-FULL-RO",
          lang: "ro",
          status: "confirmed",
          payment_split: "full",
          stripe_amount: 750,
          remaining: 0,
          total: 750,
          desc: "Card full payment - RO",
        },
        {
          ref: "BLV-BK-FULL-EN",
          lang: "en",
          status: "confirmed",
          payment_split: "full",
          stripe_amount: 750,
          remaining: 0,
          total: 750,
          desc: "Card full payment - EN",
        },
        {
          ref: "BLV-BK-ADV-RO",
          lang: "ro",
          status: "confirmed",
          payment_split: "advance",
          stripe_amount: 225,
          remaining: 525,
          total: 750,
          desc: "Card advance 30% - RO",
        },
        {
          ref: "BLV-BK-ADV-EN",
          lang: "en",
          status: "confirmed",
          payment_split: "advance",
          stripe_amount: 225,
          remaining: 525,
          total: 750,
          desc: "Card advance 30% - EN",
        },
        {
          ref: "BLV-BK-TRF-RO",
          lang: "ro",
          status: "pending",
          payment_split: "full",
          stripe_amount: null,
          remaining: 750,
          total: 750,
          desc: "Bank transfer - RO",
        },
        {
          ref: "BLV-BK-TRF-EN",
          lang: "en",
          status: "pending",
          payment_split: "full",
          stripe_amount: null,
          remaining: 750,
          total: 750,
          desc: "Bank transfer - EN",
        },
        {
          ref: "BLV-BK-B2B-RO",
          lang: "ro",
          status: "pending",
          payment_split: "full",
          stripe_amount: null,
          remaining: 1350,
          total: 1350,
          needs_invoice: true,
          desc: "Bank transfer + B2B invoice - RO",
        },
        {
          ref: "BLV-BK-B2B-EN",
          lang: "en",
          status: "pending",
          payment_split: "full",
          stripe_amount: null,
          remaining: 1350,
          total: 1350,
          needs_invoice: true,
          desc: "Bank transfer + B2B invoice - EN",
        },
        {
          ref: "BLV-BK-EXT-RO",
          lang: "ro",
          status: "confirmed",
          payment_split: "full",
          stripe_amount: 1100,
          remaining: 0,
          total: 1100,
          extras: extrasJson,
          extras_price: 350,
          desc: "With extras - RO",
        },
        {
          ref: "BLV-BK-EXT-EN",
          lang: "en",
          status: "confirmed",
          payment_split: "full",
          stripe_amount: 1100,
          remaining: 0,
          total: 1100,
          extras: extrasJson,
          extras_price: 350,
          desc: "With extras - EN",
        },
        {
          ref: "BLV-BK-REC-RO",
          lang: "ro",
          status: "pending",
          payment_split: "full",
          stripe_amount: null,
          remaining: 750,
          total: 750,
          desc: "Pay at reception - RO",
        },
        {
          ref: "BLV-BK-REC-EN",
          lang: "en",
          status: "pending",
          payment_split: "full",
          stripe_amount: null,
          remaining: 750,
          total: 750,
          desc: "Pay at reception - EN",
        },
        {
          ref: "BLV-BK-CAN-RO",
          lang: "ro",
          status: "cancelled",
          payment_split: "full",
          stripe_amount: null,
          remaining: 0,
          total: 750,
          desc: "Cancelled - RO",
        },
        {
          ref: "BLV-BK-CAN-EN",
          lang: "en",
          status: "cancelled",
          payment_split: "full",
          stripe_amount: null,
          remaining: 0,
          total: 750,
          desc: "Cancelled - EN",
        },
      ];

      const created = [];
      for (const b of bookings) {
        await client.query(
          `INSERT INTO bookings (
            booking_ref, room_id, guest_name, guest_email, guest_phone,
            check_in, check_out, guests, total_price, status, source,
            payment_split, stripe_amount, remaining_amount,
            needs_invoice, company_name, company_cui, company_reg_no, company_address,
            extras_json, extras_price, preferred_language
          ) VALUES ($1,$2,$3,$4,$5,$6,$7,2,$8,$9,'website',$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20)`,
          [
            b.ref,
            roomId,
            `Test Guest [${b.ref}]`,
            TEST_CLIENT_EMAIL,
            "+40700000000",
            relDate(10),
            relDate(13),
            b.total,
            b.status,
            b.payment_split,
            b.stripe_amount || null,
            b.remaining,
            b.needs_invoice || false,
            b.needs_invoice ? "SC Test SRL" : null,
            b.needs_invoice ? "RO12345678" : null,
            b.needs_invoice ? "J40/1234/2024" : null,
            b.needs_invoice ? "Str. Exemplu nr. 1, Bucuresti" : null,
            b.extras || null,
            b.extras_price || 0,
            b.lang,
          ],
        );
        created.push({ ref: b.ref, lang: b.lang, desc: b.desc });
      }

      await client.query("COMMIT");
      ok(res, {
        message: `${created.length} test bookings created (type: bookings)`,
        created,
        tip: "Use endpoints from section C. EMAIL TRIGGERS to send the corresponding emails.",
      });
    } catch (e) {
      await client.query("ROLLBACK");
      throw e;
    } finally {
      client.release();
    }
  } catch (e) {
    err(res, e);
  }
});

/**
 * @swagger
 * /api/test-jobs/seed/jobs:
 *   get:
 *     summary: "🌱 Seed - Cron Jobs (time-positioned bookings)"
 *     tags: [Test Jobs]
 *     description: |
 *       Creates bookings positioned in time to test cron jobs:
 *       - BLV-JB-REM-RO/EN — check-in tomorrow → Job 1 (reminder)
 *       - BLV-JB-REV-RO/EN — check-out yesterday → Job 2 (review request)
 *       - BLV-JB-FIN-RO/EN — check-out 2 days ago, confirmed → Job 3 (finalize)
 *       - BLV-JB-EXP-RO/EN — pending, created 4 days ago → Job 4 (expire)
 *     responses:
 *       200:
 *         description: Bookings created successfully
 */
router.get("/seed/jobs", async (req, res) => {
  try {
    const roomId = await getActiveRoomId();
    const client = await pool.connect();

    // All dates calculated by PostgreSQL using Romania timezone
    // This ensures seed and cron jobs use the exact same date reference
    const RO_TODAY = `(NOW() + INTERVAL '3 hours')::date`;

    try {
      await client.query("BEGIN");
      await client.query(
        `DELETE FROM bookings WHERE booking_ref LIKE 'BLV-JB-%'`,
      );

      const jobBookings = [
        // Job 1 — check-in tomorrow Romania time
        {
          ref: "BLV-JB-REM-RO",
          lang: "ro",
          status: "confirmed",
          checkIn: `${RO_TODAY} + INTERVAL '1 day'`,
          checkOut: `${RO_TODAY} + INTERVAL '4 days'`,
          createdAt: null,
          desc: "Check-in tomorrow → Job 1 Reminder",
        },
        {
          ref: "BLV-JB-REM-EN",
          lang: "en",
          status: "confirmed",
          checkIn: `${RO_TODAY} + INTERVAL '1 day'`,
          checkOut: `${RO_TODAY} + INTERVAL '4 days'`,
          createdAt: null,
          desc: "Check-in tomorrow → Job 1 Reminder",
        },

        // Job 2 — check-out yesterday Romania time
        {
          ref: "BLV-JB-REV-RO",
          lang: "ro",
          status: "confirmed",
          checkIn: `${RO_TODAY} - INTERVAL '5 days'`,
          checkOut: `${RO_TODAY} - INTERVAL '1 day'`,
          createdAt: null,
          desc: "Check-out yesterday → Job 2 Review",
        },
        {
          ref: "BLV-JB-REV-EN",
          lang: "en",
          status: "confirmed",
          checkIn: `${RO_TODAY} - INTERVAL '5 days'`,
          checkOut: `${RO_TODAY} - INTERVAL '1 day'`,
          createdAt: null,
          desc: "Check-out yesterday → Job 2 Review",
        },

        // Job 3 — check-out 2 days ago, still confirmed
        {
          ref: "BLV-JB-FIN-RO",
          lang: "ro",
          status: "confirmed",
          checkIn: `${RO_TODAY} - INTERVAL '6 days'`,
          checkOut: `${RO_TODAY} - INTERVAL '2 days'`,
          createdAt: null,
          desc: "Past check-out → Job 3 Finalize",
        },
        {
          ref: "BLV-JB-FIN-EN",
          lang: "en",
          status: "confirmed",
          checkIn: `${RO_TODAY} - INTERVAL '6 days'`,
          checkOut: `${RO_TODAY} - INTERVAL '2 days'`,
          createdAt: null,
          desc: "Past check-out → Job 3 Finalize",
        },

        // Job 4 — pending, created 4 days ago
        {
          ref: "BLV-JB-EXP-RO",
          lang: "ro",
          status: "pending",
          checkIn: `${RO_TODAY} + INTERVAL '10 days'`,
          checkOut: `${RO_TODAY} + INTERVAL '13 days'`,
          createdAt: `${RO_TODAY} - INTERVAL '4 days'`,
          desc: "Pending 4 days → Job 4 Expire",
        },
        {
          ref: "BLV-JB-EXP-EN",
          lang: "en",
          status: "pending",
          checkIn: `${RO_TODAY} + INTERVAL '10 days'`,
          checkOut: `${RO_TODAY} + INTERVAL '13 days'`,
          createdAt: `${RO_TODAY} - INTERVAL '4 days'`,
          desc: "Pending 4 days → Job 4 Expire",
        },
      ];

      const created = [];
      for (const b of jobBookings) {
        if (b.createdAt) {
          await client.query(
            `INSERT INTO bookings (
              booking_ref, room_id, guest_name, guest_email, guest_phone,
              check_in, check_out, guests, total_price, status, source,
              payment_split, stripe_amount, remaining_amount, preferred_language,
              created_at
            ) VALUES (
              $1, $2, $3, $4, $5,
              ${b.checkIn}, ${b.checkOut},
              2, 750, $6, 'website', 'full', 750, 0, $7,
              ${b.createdAt}
            )`,
            [
              b.ref,
              roomId,
              `Test Guest [${b.ref}]`,
              TEST_CLIENT_EMAIL,
              "+40700000000",
              b.status,
              b.lang,
            ],
          );
        } else {
          await client.query(
            `INSERT INTO bookings (
              booking_ref, room_id, guest_name, guest_email, guest_phone,
              check_in, check_out, guests, total_price, status, source,
              payment_split, stripe_amount, remaining_amount, preferred_language
            ) VALUES (
              $1, $2, $3, $4, $5,
              ${b.checkIn}, ${b.checkOut},
              2, 750, $6, 'website', 'full', 750, 0, $7
            )`,
            [
              b.ref,
              roomId,
              `Test Guest [${b.ref}]`,
              TEST_CLIENT_EMAIL,
              "+40700000000",
              b.status,
              b.lang,
            ],
          );
        }
        created.push({ ref: b.ref, lang: b.lang, desc: b.desc });
      }

      await client.query("COMMIT");
      ok(res, {
        message: `${created.length} test bookings created (type: jobs)`,
        note: "All dates calculated by PostgreSQL using Europe/Bucharest timezone.",
        created,
        nextSteps: [
          "GET /api/test-jobs/run/job-reminders  → BLV-JB-REM-RO + EN receive reminder",
          "GET /api/test-jobs/run/job-reviews     → BLV-JB-REV-RO + EN receive review request",
          "GET /api/test-jobs/run/job-finalize    → BLV-JB-FIN-RO + EN become 'finished'",
          "GET /api/test-jobs/run/job-expire      → BLV-JB-EXP-RO + EN become 'cancelled'",
        ],
      });
    } catch (e) {
      await client.query("ROLLBACK");
      throw e;
    } finally {
      client.release();
    }
  } catch (e) {
    err(res, e);
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
//  B. CLEANUP
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * @swagger
 * /api/test-jobs/seed/analytics:
 *   get:
 *     summary: "🌱 Seed - Analytics (distributed bookings for AI testing)"
 *     tags: [Test Jobs]
 *     description: |
 *       Creates bookings distributed across all rooms and next 14 days.
 *       Use this before opening Analytics to get realistic AI recommendations.
 *     responses:
 *       200:
 *         description: Bookings created successfully
 */
router.get("/seed/analytics", async (req, res) => {
  try {
    const { rows: rooms } = await query(
      `SELECT id FROM rooms WHERE status = 'active' ORDER BY sort_order`,
    );
    if (rooms.length === 0) throw new Error("No active rooms found.");

    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      await client.query(
        `DELETE FROM bookings WHERE booking_ref LIKE 'BLV-AN-%'`,
      );

      const RO_TODAY = `(NOW() + INTERVAL '3 hours')::date`;
      const created = [];
      let seq = 1;

      // Distribuie rezervări pe 14 zile și toate camerele
      for (let day = 1; day <= 14; day++) {
        // Câte camere ocupăm în ziua asta (variabil pentru grafic realist)
        const occupiedRooms =
          day % 7 === 0 || day % 7 === 6
            ? Math.floor(rooms.length * 0.9) // weekend — 90% ocupare
            : Math.floor(rooms.length * 0.4 + (day % 3)); // săptămână — 40-60%

        for (let r = 0; r < occupiedRooms && r < rooms.length; r++) {
          const ref = `BLV-AN-${String(seq).padStart(3, "0")}`;
          await client.query(
            `INSERT INTO bookings (
              booking_ref, room_id, guest_name, guest_email, guest_phone,
              check_in, check_out, guests, total_price, status, source,
              payment_split, stripe_amount, remaining_amount, preferred_language
            ) VALUES (
              $1, $2, $3, $4, $5,
              ${RO_TODAY} + INTERVAL '${day} days',
              ${RO_TODAY} + INTERVAL '${day + 2} days',
              2, 500, 'confirmed', 'website', 'full', 500, 0, 'ro'
            )`,
            [
              ref,
              rooms[r].id,
              `Analytics Guest ${seq}`,
              TEST_CLIENT_EMAIL,
              "+40700000000",
            ],
          );
          created.push({ ref, day, room: r + 1 });
          seq++;
        }
      }

      await client.query("COMMIT");
      ok(res, {
        message: `${created.length} bookings created for analytics testing`,
        note: "Open /admin/analytics → Smart Pricing → Actualizează",
        distribution: `${rooms.length} rooms × 14 days, weekend peaks included`,
        created,
      });
    } catch (e) {
      await client.query("ROLLBACK");
      throw e;
    } finally {
      client.release();
    }
  } catch (e) {
    err(res, e);
  }
});

/**
 * @swagger
 * /api/test-jobs/seed/analytics-low:
 *   get:
 *     summary: "🌱 Seed - Analytics LOW occupancy (20-30%)"
 *     tags: [Test Jobs]
 *     description: Creates few bookings to simulate low demand. AI should recommend price decrease or promotions.
 *     responses:
 *       200:
 *         description: Bookings created successfully
 */
router.get("/seed/analytics-low", async (req, res) => {
  try {
    const { rows: rooms } = await query(
      `SELECT id FROM rooms WHERE status = 'active' ORDER BY sort_order`,
    );
    if (rooms.length === 0) throw new Error("No active rooms found.");

    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      await client.query(
        `DELETE FROM bookings WHERE booking_ref LIKE 'BLV-AN-%'`,
      );

      const RO_TODAY = `(NOW() + INTERVAL '3 hours')::date`;
      const created = [];
      let seq = 1;

      // Doar 1-2 camere ocupate per zi, nu în fiecare zi
      for (let day = 1; day <= 14; day++) {
        if (day % 3 === 0) continue; // sari peste fiecare a 3-a zi — zile goale
        const occupiedRooms = 1; // maxim 1 cameră pe zi → ~12% ocupare

        for (let r = 0; r < occupiedRooms; r++) {
          const ref = `BLV-AN-${String(seq).padStart(3, "0")}`;
          await client.query(
            `INSERT INTO bookings (
              booking_ref, room_id, guest_name, guest_email, guest_phone,
              check_in, check_out, guests, total_price, status, source,
              payment_split, stripe_amount, remaining_amount, preferred_language
            ) VALUES (
              $1, $2, $3, $4, $5,
              ${RO_TODAY} + INTERVAL '${day} days',
              ${RO_TODAY} + INTERVAL '${day + 2} days',
              2, 500, 'confirmed', 'website', 'full', 500, 0, 'ro'
            )`,
            [
              ref,
              rooms[r].id,
              `Analytics Guest ${seq}`,
              TEST_CLIENT_EMAIL,
              "+40700000000",
            ],
          );
          created.push({ ref, day });
          seq++;
        }
      }

      await client.query("COMMIT");
      ok(res, {
        message: `${created.length} bookings created — LOW occupancy scenario`,
        note: "Open /admin/analytics → Smart Pricing → Actualizează",
        expectedAI: "Price decrease or promotional packages recommended",
        created,
      });
    } catch (e) {
      await client.query("ROLLBACK");
      throw e;
    } finally {
      client.release();
    }
  } catch (e) {
    err(res, e);
  }
});

/**
 * @swagger
 * /api/test-jobs/seed/analytics-high:
 *   get:
 *     summary: "🌱 Seed - Analytics HIGH occupancy (90-100%)"
 *     tags: [Test Jobs]
 *     description: Creates bookings for almost all rooms every day. AI should recommend significant price increase.
 *     responses:
 *       200:
 *         description: Bookings created successfully
 */
router.get("/seed/analytics-high", async (req, res) => {
  try {
    const { rows: rooms } = await query(
      `SELECT id FROM rooms WHERE status = 'active' ORDER BY sort_order`,
    );
    if (rooms.length === 0) throw new Error("No active rooms found.");

    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      await client.query(
        `DELETE FROM bookings WHERE booking_ref LIKE 'BLV-AN-%'`,
      );

      const RO_TODAY = `(NOW() + INTERVAL '3 hours')::date`;
      const created = [];
      let seq = 1;

      // Toate camerele ocupate în toate zilele → 100% ocupare
      for (let day = 1; day <= 14; day++) {
        const occupiedRooms = rooms.length; // toate camerele

        for (let r = 0; r < occupiedRooms; r++) {
          const ref = `BLV-AN-${String(seq).padStart(3, "0")}`;
          await client.query(
            `INSERT INTO bookings (
              booking_ref, room_id, guest_name, guest_email, guest_phone,
              check_in, check_out, guests, total_price, status, source,
              payment_split, stripe_amount, remaining_amount, preferred_language
            ) VALUES (
              $1, $2, $3, $4, $5,
              ${RO_TODAY} + INTERVAL '${day} days',
              ${RO_TODAY} + INTERVAL '${day + 2} days',
              2, 500, 'confirmed', 'website', 'full', 500, 0, 'ro'
            )`,
            [
              ref,
              rooms[r].id,
              `Analytics Guest ${seq}`,
              TEST_CLIENT_EMAIL,
              "+40700000000",
            ],
          );
          created.push({ ref, day, room: r + 1 });
          seq++;
        }
      }

      await client.query("COMMIT");
      ok(res, {
        message: `${created.length} bookings created — HIGH occupancy scenario`,
        note: "Open /admin/analytics → Smart Pricing → Actualizează",
        expectedAI: "Significant price increase recommended (15-25%)",
        created,
      });
    } catch (e) {
      await client.query("ROLLBACK");
      throw e;
    } finally {
      client.release();
    }
  } catch (e) {
    err(res, e);
  }
});

/**
 * @swagger
 * /api/test-jobs/seed/analytics-mixed:
 *   get:
 *     summary: "🌱 Seed - Analytics MIXED occupancy (weekend peaks)"
 *     tags: [Test Jobs]
 *     description: Creates bookings with weekend peaks and slow weekdays. AI should recommend dynamic pricing strategy.
 *     responses:
 *       200:
 *         description: Bookings created successfully
 */
router.get("/seed/analytics-mixed", async (req, res) => {
  try {
    const { rows: rooms } = await query(
      `SELECT id FROM rooms WHERE status = 'active' ORDER BY sort_order`,
    );
    if (rooms.length === 0) throw new Error("No active rooms found.");

    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      await client.query(
        `DELETE FROM bookings WHERE booking_ref LIKE 'BLV-AN-%'`,
      );

      const RO_TODAY = `(NOW() + INTERVAL '3 hours')::date`;
      const created = [];
      let seq = 1;

      for (let day = 1; day <= 14; day++) {
        // Weekend (ziua 6,7,13,14) → 90% ocupare, săptămână → 25%
        const isWeekend = day % 7 === 6 || day % 7 === 0;
        const occupiedRooms = isWeekend
          ? Math.ceil(rooms.length * 0.9)
          : Math.ceil(rooms.length * 0.25);

        for (let r = 0; r < occupiedRooms && r < rooms.length; r++) {
          const ref = `BLV-AN-${String(seq).padStart(3, "0")}`;
          await client.query(
            `INSERT INTO bookings (
              booking_ref, room_id, guest_name, guest_email, guest_phone,
              check_in, check_out, guests, total_price, status, source,
              payment_split, stripe_amount, remaining_amount, preferred_language
            ) VALUES (
              $1, $2, $3, $4, $5,
              ${RO_TODAY} + INTERVAL '${day} days',
              ${RO_TODAY} + INTERVAL '${day + 2} days',
              2, 500, 'confirmed', 'website', 'full', 500, 0, 'ro'
            )`,
            [
              ref,
              rooms[r].id,
              `Analytics Guest ${seq}`,
              TEST_CLIENT_EMAIL,
              "+40700000000",
            ],
          );
          created.push({ ref, day, type: isWeekend ? "weekend" : "weekday" });
          seq++;
        }
      }

      await client.query("COMMIT");
      ok(res, {
        message: `${created.length} bookings created — MIXED occupancy scenario`,
        note: "Open /admin/analytics → Smart Pricing → Actualizează",
        expectedAI: "Dynamic pricing — higher rates for weekends recommended",
        created,
      });
    } catch (e) {
      await client.query("ROLLBACK");
      throw e;
    } finally {
      client.release();
    }
  } catch (e) {
    err(res, e);
  }
});

/**
 * @swagger
 * /api/test-jobs/cleanup/all:
 *   get:
 *     summary: "🗑️ Cleanup - All test data (BLV-BK-* + BLV-JB-*)"
 *     tags: [Test Jobs]
 *     responses:
 *       200:
 *         description: All test data deleted
 */
router.get("/cleanup/all", async (req, res) => {
  try {
    const { rowCount } = await query(
      `DELETE FROM bookings WHERE booking_ref LIKE 'BLV-BK-%' OR booking_ref LIKE 'BLV-JB-%' OR booking_ref LIKE 'BLV-AN-%'`,
    );
    ok(res, {
      message: `${rowCount} test bookings deleted (BLV-BK-* + BLV-JB-*).`,
    });
  } catch (e) {
    err(res, e);
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
//  C. INDIVIDUAL EMAIL TRIGGERS
// ═══════════════════════════════════════════════════════════════════════════════

const MOCK_BASE = {
  guestName: "John Doe",
  guestEmail: TEST_CLIENT_EMAIL,
  guestPhone: "+40700000001",
  roomName: "Camera 1 — Confort",
  checkIn: relDate(10),
  checkOut: relDate(13),
  nights: 3,
  totalPrice: 900,
  bookingRef: "BLV-MOCK-001",
};

const MOCK_EXTRAS = {
  breakfast: { [relDate(10)]: 2, [relDate(11)]: 2 },
  dinner: { [relDate(10)]: 1 },
  extra_beds: 1,
  jacuzzi: 1,
  jacuzzi_dates: [relDate(10)],
};

async function sendBilingual(fn, label) {
  const results = [];
  for (const lang of ["ro", "en"]) {
    try {
      await fn(lang);
      results.push({ lang, status: "sent" });
    } catch (e) {
      results.push({ lang, status: `failed: ${e.message}` });
    }
  }
  return { label, results, clientEmail: TEST_CLIENT_EMAIL };
}

// ─────────────────────────────────────────────────────────────────────────────
/**
 * @swagger
 * /api/test-jobs/trigger/booking-confirmed-full:
 *   get:
 *     summary: "[A1] Card full payment confirmation (RO+EN)"
 *     tags: [Test Jobs - Email Triggers]
 *     description: Sends booking confirmation email for full card payment.
 *     responses:
 *       200:
 *         description: Email sent
 */
router.get("/trigger/booking-confirmed-full", async (req, res) => {
  try {
    const data = {
      ...MOCK_BASE,
      paymentSplit: "full",
      stripeAmount: 900,
      remainingAmount: 0,
      needsInvoice: false,
    };
    const result = await sendBilingual(
      (lang) =>
        emailServices.sendClientBookingConfirmation(
          TEST_CLIENT_EMAIL,
          data,
          lang,
        ),
      "A1 - Card full payment confirmation",
    );
    ok(res, result);
  } catch (e) {
    err(res, e);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
/**
 * @swagger
 * /api/test-jobs/trigger/booking-confirmed-advance:
 *   get:
 *     summary: "[A2] Card advance 30% confirmation (RO+EN)"
 *     tags: [Test Jobs - Email Triggers]
 *     description: Sends booking confirmation email for 30% advance card payment.
 *     responses:
 *       200:
 *         description: Email sent
 */
router.get("/trigger/booking-confirmed-advance", async (req, res) => {
  try {
    const data = {
      ...MOCK_BASE,
      paymentSplit: "advance",
      stripeAmount: 270,
      remainingAmount: 630,
      needsInvoice: false,
      extras: MOCK_EXTRAS,
    };
    const result = await sendBilingual(
      (lang) =>
        emailServices.sendClientBookingConfirmation(
          TEST_CLIENT_EMAIL,
          data,
          lang,
        ),
      "A2 - Card advance 30% confirmation",
    );
    ok(res, result);
  } catch (e) {
    err(res, e);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
/**
 * @swagger
 * /api/test-jobs/trigger/booking-transfer:
 *   get:
 *     summary: "[A3] Bank transfer instructions (RO+EN)"
 *     tags: [Test Jobs - Email Triggers]
 *     description: Sends bank transfer payment instructions, no company invoice.
 *     responses:
 *       200:
 *         description: Email sent
 */
router.get("/trigger/booking-transfer", async (req, res) => {
  try {
    const data = {
      ...MOCK_BASE,
      paymentSplit: "full",
      stripeAmount: null,
      remainingAmount: 900,
      needsInvoice: false,
    };
    const result = await sendBilingual(
      (lang) =>
        emailServices.sendBankTransferInstructions(
          TEST_CLIENT_EMAIL,
          data,
          lang,
        ),
      "A3 - Bank transfer instructions",
    );
    ok(res, result);
  } catch (e) {
    err(res, e);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
/**
 * @swagger
 * /api/test-jobs/trigger/booking-transfer-b2b:
 *   get:
 *     summary: "[A3b] Bank transfer + company invoice (RO+EN)"
 *     tags: [Test Jobs - Email Triggers]
 *     description: Sends bank transfer instructions with company invoice request.
 *     responses:
 *       200:
 *         description: Email sent
 */
router.get("/trigger/booking-transfer-b2b", async (req, res) => {
  try {
    const data = {
      ...MOCK_BASE,
      totalPrice: 1350,
      paymentSplit: "full",
      stripeAmount: null,
      remainingAmount: 1350,
      needsInvoice: true,
      companyName: "SC Test SRL",
      companyCui: "RO12345678",
      companyRegNo: "J40/1234/2024",
      companyAddress: "Str. Exemplu nr. 1, Bucuresti",
      extras: MOCK_EXTRAS,
    };
    const result = await sendBilingual(
      (lang) =>
        emailServices.sendBankTransferInstructions(
          TEST_CLIENT_EMAIL,
          data,
          lang,
        ),
      "A3b - Bank transfer + company invoice",
    );
    ok(res, result);
  } catch (e) {
    err(res, e);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
/**
 * @swagger
 * /api/test-jobs/trigger/booking-cancelled:
 *   get:
 *     summary: "[A4] Booking cancellation (RO+EN)"
 *     tags: [Test Jobs - Email Triggers]
 *     description: Sends booking cancellation email with reason.
 *     responses:
 *       200:
 *         description: Email sent
 */
router.get("/trigger/booking-cancelled", async (req, res) => {
  try {
    const data = { ...MOCK_BASE, reason: "Plans changed" };
    const result = await sendBilingual(
      (lang) =>
        emailServices.sendBookingCancellation(TEST_CLIENT_EMAIL, data, lang),
      "A4 - Booking cancellation",
    );
    ok(res, result);
  } catch (e) {
    err(res, e);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
/**
 * @swagger
 * /api/test-jobs/trigger/booking-expired:
 *   get:
 *     summary: "[A5] Booking expired - auto cancelled (RO+EN)"
 *     tags: [Test Jobs - Email Triggers]
 *     description: Sends expiration email for pending booking not paid within 3 days.
 *     responses:
 *       200:
 *         description: Email sent
 */
router.get("/trigger/booking-expired", async (req, res) => {
  try {
    const data = { ...MOCK_BASE, expireDays: 3 };
    const result = await sendBilingual(
      (lang) => emailServices.sendBookingExpired(TEST_CLIENT_EMAIL, data, lang),
      "A5 - Booking expired",
    );
    ok(res, result);
  } catch (e) {
    err(res, e);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
/**
 * @swagger
 * /api/test-jobs/trigger/booking-reminder:
 *   get:
 *     summary: "[A6] Check-in reminder (RO+EN)"
 *     tags: [Test Jobs - Email Triggers]
 *     description: Sends check-in reminder email, one day before arrival.
 *     responses:
 *       200:
 *         description: Email sent
 */
router.get("/trigger/booking-reminder", async (req, res) => {
  try {
    const result = await sendBilingual(
      (lang) =>
        emailServices.sendCheckInReminder(TEST_CLIENT_EMAIL, MOCK_BASE, lang),
      "A6 - Check-in reminder",
    );
    ok(res, result);
  } catch (e) {
    err(res, e);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
/**
 * @swagger
 * /api/test-jobs/trigger/booking-review-request:
 *   get:
 *     summary: "[A7] Review request (RO+EN)"
 *     tags: [Test Jobs - Email Triggers]
 *     description: Sends review request email after check-out.
 *     responses:
 *       200:
 *         description: Email sent
 */
router.get("/trigger/booking-review-request", async (req, res) => {
  try {
    const result = await sendBilingual(
      (lang) =>
        emailServices.sendReviewRequest(
          TEST_CLIENT_EMAIL,
          {
            ...MOCK_BASE,
            checkIn: relDate(-5),
            checkOut: relDate(-1),
            bookingRef: "BLV-MOCK-001",
          },
          lang,
        ),
      "A7 - Review request",
    );
    ok(res, result);
  } catch (e) {
    err(res, e);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
/**
 * @swagger
 * /api/test-jobs/trigger/booking-review-confirm:
 *   get:
 *     summary: "[A8] Review received confirmation (RO+EN)"
 *     tags: [Test Jobs - Email Triggers]
 *     description: Sends confirmation that review was successfully registered.
 *     responses:
 *       200:
 *         description: Email sent
 */
router.get("/trigger/booking-review-confirm", async (req, res) => {
  try {
    const result = await sendBilingual(
      (lang) =>
        emailServices.sendClientReviewConfirmation(
          TEST_CLIENT_EMAIL,
          {
            guestName: "John Doe",
            rating: 5,
            roomName: "Camera 1 — Confort",
            autoApproved: true,
          },
          lang,
        ),
      "A8 - Review received confirmation",
    );
    ok(res, result);
  } catch (e) {
    err(res, e);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
/**
 * @swagger
 * /api/test-jobs/trigger/account-welcome:
 *   get:
 *     summary: "[B1] Welcome - account created (RO+EN)"
 *     tags: [Test Jobs - Email Triggers]
 *     description: Welcome email sent when a new account is created.
 *     responses:
 *       200:
 *         description: Email sent
 */
router.get("/trigger/account-welcome", async (req, res) => {
  try {
    const result = await sendBilingual(
      (lang) =>
        emailServices.sendWelcomeEmail(TEST_CLIENT_EMAIL, "John Doe", lang),
      "B1 - Welcome account created",
    );
    ok(res, result);
  } catch (e) {
    err(res, e);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
/**
 * @swagger
 * /api/test-jobs/trigger/account-password:
 *   get:
 *     summary: "[B2] Password changed (RO+EN)"
 *     tags: [Test Jobs - Email Triggers]
 *     description: Security notification sent when password is changed.
 *     responses:
 *       200:
 *         description: Email sent
 */
router.get("/trigger/account-password", async (req, res) => {
  try {
    const result = await sendBilingual(
      (lang) =>
        emailServices.sendPasswordChangedEmail(
          TEST_CLIENT_EMAIL,
          "John Doe",
          lang,
        ),
      "B2 - Password changed",
    );
    ok(res, result);
  } catch (e) {
    err(res, e);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
/**
 * @swagger
 * /api/test-jobs/trigger/account-deleted:
 *   get:
 *     summary: "[B3] Account deleted confirmation (RO+EN)"
 *     tags: [Test Jobs - Email Triggers]
 *     description: Confirmation that account and personal data have been deleted.
 *     responses:
 *       200:
 *         description: Email sent
 */
router.get("/trigger/account-deleted", async (req, res) => {
  try {
    const result = await sendBilingual(
      (lang) =>
        emailServices.sendAccountDeletedEmail(
          TEST_CLIENT_EMAIL,
          "John Doe",
          lang,
        ),
      "B3 - Account deleted",
    );
    ok(res, result);
  } catch (e) {
    err(res, e);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
/**
 * @swagger
 * /api/test-jobs/trigger/contact-confirm:
 *   get:
 *     summary: "[B4] Contact message confirmation (RO+EN)"
 *     tags: [Test Jobs - Email Triggers]
 *     description: Auto-confirmation sent to client after submitting a contact form.
 *     responses:
 *       200:
 *         description: Email sent
 */
router.get("/trigger/contact-confirm", async (req, res) => {
  try {
    const result = await sendBilingual(
      (lang) =>
        emailServices.sendClientContactConfirmation(
          TEST_CLIENT_EMAIL,
          "John Doe",
          lang,
        ),
      "B4 - Contact message confirmation",
    );
    ok(res, result);
  } catch (e) {
    err(res, e);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
/**
 * @swagger
 * /api/test-jobs/trigger/admin-new-booking:
 *   get:
 *     summary: "[C1] Admin - New booking alert"
 *     tags: [Test Jobs - Email Triggers]
 *     description: Admin notification on new booking received (includes B2B details).
 *     responses:
 *       200:
 *         description: Email sent
 */
router.get("/trigger/admin-new-booking", async (req, res) => {
  try {
    await emailServices.sendAdminNewBookingAlert(ADMIN_EMAIL, {
      ...MOCK_BASE,
      paymentMethod: "bank_transfer",
      needsInvoice: true,
      companyName: "SC Test SRL",
      companyCui: "RO12345678",
      companyRegNo: "J40/1234/2024",
      companyAddress: "Str. Exemplu nr. 1, Bucuresti",
      extras: MOCK_EXTRAS,
    });
    ok(res, {
      label: "C1 - Admin new booking alert",
      status: "sent",
      adminEmail: ADMIN_EMAIL,
    });
  } catch (e) {
    err(res, e);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
/**
 * @swagger
 * /api/test-jobs/trigger/admin-cancellation:
 *   get:
 *     summary: "[C2] Admin - Cancellation alert"
 *     tags: [Test Jobs - Email Triggers]
 *     description: Admin notification when a booking is cancelled.
 *     responses:
 *       200:
 *         description: Email sent
 */
router.get("/trigger/admin-cancellation", async (req, res) => {
  try {
    await emailServices.sendAdminCancellationAlert(ADMIN_EMAIL, {
      ...MOCK_BASE,
      reason: "Plans changed",
    });
    ok(res, {
      label: "C2 - Admin cancellation alert",
      status: "sent",
      adminEmail: ADMIN_EMAIL,
    });
  } catch (e) {
    err(res, e);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
/**
 * @swagger
 * /api/test-jobs/trigger/admin-review:
 *   get:
 *     summary: "[C3] Admin - New review alert"
 *     tags: [Test Jobs - Email Triggers]
 *     description: |
 *       Admin notification on new review received.
 *       Rating >= 4 → auto approved. Rating < 4 → needs manual moderation.
 *     responses:
 *       200:
 *         description: Email sent
 */
router.get("/trigger/admin-review", async (req, res) => {
  try {
    await emailServices.sendAdminNewReviewAlert(ADMIN_EMAIL, {
      guestName: "John Doe",
      guestEmail: TEST_CLIENT_EMAIL,
      rating: 5,
      text: "Excellent guesthouse! The room was impeccable and the staff very friendly. Highly recommended!",
      roomName: "Camera 1 — Confort",
      autoApproved: true,
    });
    ok(res, {
      label: "C3 - Admin new review alert",
      status: "sent",
      adminEmail: ADMIN_EMAIL,
    });
  } catch (e) {
    err(res, e);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
/**
 * @swagger
 * /api/test-jobs/trigger/admin-contact:
 *   get:
 *     summary: "[C4] Admin - Contact message received"
 *     tags: [Test Jobs - Email Triggers]
 *     description: Admin notification when a contact form message is received.
 *     responses:
 *       200:
 *         description: Email sent
 */
router.get("/trigger/admin-contact", async (req, res) => {
  try {
    await emailServices.sendAdminContactMessage(ADMIN_EMAIL, {
      name: "John Doe",
      email: TEST_CLIENT_EMAIL,
      phone: "+40700000099",
      subject: "Availability inquiry for August",
      message:
        "Hello, I would like to know if you have availability in August for 3 nights. We are a family of 4.",
    });
    ok(res, {
      label: "C4 - Admin contact message",
      status: "sent",
      adminEmail: ADMIN_EMAIL,
    });
  } catch (e) {
    err(res, e);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
/**
 * @swagger
 * /api/test-jobs/trigger/admin-expired:
 *   get:
 *     summary: "[C5] Admin - Expired bookings report"
 *     tags: [Test Jobs - Email Triggers]
 *     description: Report sent to admin after the expire job runs.
 *     responses:
 *       200:
 *         description: Email sent
 */
router.get("/trigger/admin-expired", async (req, res) => {
  try {
    await emailServices.sendAdminExpiredBookingsAlert(ADMIN_EMAIL, {
      count: 2,
      expireDays: 3,
      bookings: [
        {
          booking_ref: "BLV-MOCK-EXP1",
          guest_name: "John Doe",
          guest_email: TEST_CLIENT_EMAIL,
          room_name: "Camera 1 — Confort",
          check_in: relDate(-4),
          total_price: 750,
        },
        {
          booking_ref: "BLV-MOCK-EXP2",
          guest_name: "Jane Smith",
          guest_email: TEST_CLIENT_EMAIL,
          room_name: "Camera 3 — Balcon & Padure",
          check_in: relDate(-3),
          total_price: 500,
        },
      ],
    });
    ok(res, {
      label: "C5 - Admin expired bookings report",
      status: "sent",
      adminEmail: ADMIN_EMAIL,
    });
  } catch (e) {
    err(res, e);
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
//  D. CRON JOB TRIGGERS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * @swagger
 * /api/test-jobs/run/job-reminders:
 *   get:
 *     summary: "▶️ Job 1 - Check-in reminder (daily 10:00)"
 *     tags: [Test Jobs - Cron Jobs]
 *     description: |
 *       Sends check-in reminder for bookings with check-in tomorrow (or on specified date).
 *       Run seed/jobs first to create BLV-JB-REM-* bookings.
 *     parameters:
 *       - in: query
 *         name: date
 *         schema:
 *           type: string
 *           format: date
 *         description: "Target check-in date (default: tomorrow)"
 *         example: "2026-06-15"
 *     responses:
 *       200:
 *         description: Job executed
 */
router.get("/run/job-reminders", async (req, res) => {
  try {
    // Uses PostgreSQL CURRENT_DATE in Romania timezone — avoids Node.js UTC issues
    const { rows: bookings } = await query(
      `SELECT b.guest_name, b.guest_email, b.booking_ref,
              b.check_in::text, b.check_out::text, b.nights, b.total_price,
              b.preferred_language, r.name AS room_name
       FROM bookings b JOIN rooms r ON r.id = b.room_id
       WHERE b.check_in::date = (NOW() + INTERVAL '3 hours')::date + INTERVAL '1 day'
         AND b.status IN ('confirmed', 'pending')
         AND b.guest_email IS NOT NULL`,
    );

    if (bookings.length === 0) {
      return ok(res, {
        job: "Job 1 - Check-in reminder",
        status: "skip",
        message: "No bookings with check-in tomorrow (Romania time).",
        tip: "Run GET /api/test-jobs/seed/jobs first.",
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

    ok(res, {
      job: "Job 1 - Check-in reminder",
      status: "done",
      emailsSent: results.filter((r) => r.status === "fulfilled").length,
      emailsFailed: results.filter((r) => r.status === "rejected").length,
      bookings: bookings.map((b) => ({
        ref: b.booking_ref,
        lang: b.preferred_language,
        email: b.guest_email,
      })),
    });
  } catch (e) {
    err(res, e);
  }
});

/**
 * @swagger
 * /api/test-jobs/run/job-reviews:
 *   get:
 *     summary: "▶️ Job 2 - Review request (daily 12:00)"
 *     tags: [Test Jobs - Cron Jobs]
 *     description: |
 *       Sends review request for bookings with check-out yesterday (or on specified date).
 *       Run seed/jobs first to create BLV-JB-REV-* bookings.
 *     parameters:
 *       - in: query
 *         name: date
 *         schema:
 *           type: string
 *           format: date
 *         description: "Target check-out date (default: yesterday)"
 *         example: "2026-06-14"
 *     responses:
 *       200:
 *         description: Job executed
 */
router.get("/run/job-reviews", async (req, res) => {
  try {
    // Uses PostgreSQL CURRENT_DATE in Romania timezone
    const { rows: bookings } = await query(
      `SELECT b.guest_name, b.guest_email, b.booking_ref, b.id AS booking_id,
              b.check_in::text, b.check_out::text, b.preferred_language, r.name AS room_name
       FROM bookings b JOIN rooms r ON r.id = b.room_id
       WHERE b.check_out::date = (NOW() + INTERVAL '3 hours')::date - INTERVAL '1 day'
         AND b.status IN ('confirmed', 'finished')
         AND b.guest_email IS NOT NULL`,
    );

    if (bookings.length === 0) {
      return ok(res, {
        job: "Job 2 - Review request",
        status: "skip",
        message: "No bookings with check-out yesterday (Romania time).",
        tip: "Run GET /api/test-jobs/seed/jobs first.",
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

    ok(res, {
      job: "Job 2 - Review request",
      status: "done",
      emailsSent: results.filter((r) => r.status === "fulfilled").length,
      emailsFailed: results.filter((r) => r.status === "rejected").length,
      bookings: bookings.map((b) => ({
        ref: b.booking_ref,
        lang: b.preferred_language,
      })),
    });
  } catch (e) {
    err(res, e);
  }
});

/**
 * @swagger
 * /api/test-jobs/run/job-finalize:
 *   get:
 *     summary: "▶️ Job 3 - Finalize bookings (daily 01:00)"
 *     tags: [Test Jobs - Cron Jobs]
 *     description: |
 *       Marks as 'finished' all confirmed bookings with past check-out.
 *       Run seed/jobs first to create BLV-JB-FIN-* bookings.
 *     responses:
 *       200:
 *         description: Job executed
 */
router.get("/run/job-finalize", async (req, res) => {
  try {
    // Uses PostgreSQL CURRENT_DATE in Romania timezone
    const { rows: toFinalize } = await query(
      `SELECT id, booking_ref, guest_name, check_out::text
       FROM bookings
       WHERE status = 'confirmed'
         AND check_out::date <= (NOW() + INTERVAL '3 hours')::date`,
    );

    if (toFinalize.length === 0) {
      return ok(res, {
        job: "Job 3 - Finalize bookings",
        status: "skip",
        message: "No confirmed bookings with past check-out (Romania time).",
        tip: "Run GET /api/test-jobs/seed/jobs first.",
      });
    }

    const ids = toFinalize.map((b) => b.id);
    await query(
      `UPDATE bookings SET status = 'finished', updated_at = NOW()
       WHERE id = ANY($1::uuid[])`,
      [ids],
    );

    ok(res, {
      job: "Job 3 - Finalize bookings",
      status: "done",
      finalized: toFinalize.length,
      bookings: toFinalize.map((b) => ({
        ref: b.booking_ref,
        name: b.guest_name,
        checkOut: b.check_out?.substring(0, 10),
      })),
    });
  } catch (e) {
    err(res, e);
  }
});

/**
 * @swagger
 * /api/test-jobs/run/job-expire:
 *   get:
 *     summary: "▶️ Job 4 - Expire pending bookings (daily 09:00)"
 *     tags: [Test Jobs - Cron Jobs]
 *     description: |
 *       Cancels pending bookings older than 3 days and sends expiration email.
 *       Run seed/jobs first to create BLV-JB-EXP-* bookings.
 *     responses:
 *       200:
 *         description: Job executed
 */
router.get("/run/job-expire", async (req, res) => {
  try {
    const EXPIRE_AFTER_DAYS = 3;

    // Uses PostgreSQL CURRENT_TIMESTAMP in Romania timezone
    const { rows: expired } = await query(
      `SELECT b.id, b.booking_ref, b.guest_name, b.guest_email,
              b.check_in::text, b.check_out::text, b.nights, b.total_price,
              b.preferred_language, r.name AS room_name
       FROM bookings b JOIN rooms r ON r.id = b.room_id
       WHERE b.status = 'pending'
         AND b.created_at < (NOW() + INTERVAL '3 hours') - INTERVAL '3 days'
         AND b.guest_email IS NOT NULL`,
    );

    if (expired.length === 0) {
      return ok(res, {
        job: "Job 4 - Expire pending bookings",
        status: "skip",
        message: `No pending bookings older than ${EXPIRE_AFTER_DAYS} days (Romania time).`,
        tip: "Run GET /api/test-jobs/seed/jobs first.",
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

    if (succeeded > 0) {
      await emailServices
        .sendAdminExpiredBookingsAlert(ADMIN_EMAIL, {
          count: succeeded,
          bookings: expired,
          expireDays: EXPIRE_AFTER_DAYS,
        })
        .catch((e) => console.error("Admin expire alert failed:", e.message));
    }

    ok(res, {
      job: "Job 4 - Expire pending bookings",
      status: "done",
      expireDays: EXPIRE_AFTER_DAYS,
      cancelled: succeeded,
      failed: results.filter((r) => r.status === "rejected").length,
      bookings: expired.map((b) => ({
        ref: b.booking_ref,
        lang: b.preferred_language,
      })),
    });
  } catch (e) {
    err(res, e);
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
//  E. PREVIEW (no side effects)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * @swagger
 * /api/test-jobs/preview/reminders:
 *   get:
 *     summary: "👁 Preview - check-in reminders (no side effects)"
 *     tags: [Test Jobs - Preview]
 *     description: Shows bookings with check-in tomorrow. Does not send emails.
 *     responses:
 *       200:
 *         description: OK
 */
router.get("/preview/reminders", async (req, res) => {
  try {
    const { rows } = await query(
      `SELECT b.booking_ref, b.guest_name, b.guest_email,
              b.check_in::text, b.check_out::text, b.status, b.preferred_language,
              r.name AS room_name
       FROM bookings b JOIN rooms r ON r.id = b.room_id
       WHERE b.check_in::date = $1 AND b.status IN ('confirmed', 'pending')`,
      [relDate(1)],
    );
    ok(res, {
      job: "Job 1 - Preview check-in reminders",
      targetDate: relDate(1),
      count: rows.length,
      wouldSendTo: rows,
    });
  } catch (e) {
    err(res, e);
  }
});

/**
 * @swagger
 * /api/test-jobs/preview/expire:
 *   get:
 *     summary: "👁 Preview - bookings about to expire (no side effects)"
 *     tags: [Test Jobs - Preview]
 *     description: Shows pending bookings older than 3 days. Makes no changes.
 *     responses:
 *       200:
 *         description: OK
 */
router.get("/preview/expire", async (req, res) => {
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
    ok(res, {
      job: "Job 4 - Preview expire",
      expireAfterDays: EXPIRE_AFTER_DAYS,
      cutoffDate: fmtISO(cutoff),
      count: rows.length,
      wouldCancel: rows,
    });
  } catch (e) {
    err(res, e);
  }
});

router.get("/migrate-multiplier", async (req, res) => {
  try {
    await query(
      `ALTER TABLE rooms ADD COLUMN IF NOT EXISTS smart_multiplier NUMERIC(4,2) DEFAULT 1.0`,
    );
    await query(
      `UPDATE rooms SET smart_multiplier = 1.0 WHERE smart_multiplier IS NULL`,
    );
    res.json({ success: true, message: "Migrare completă" });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
