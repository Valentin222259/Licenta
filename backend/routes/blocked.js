// backend/routes/blocked.js
// Adaugă în server.js: const blockedRouter = require("./routes/blocked"); app.use("/api/blocked", blockedRouter);

const express = require("express");
const router = express.Router();
const { query } = require("../config/db");

function fmtDate(val) {
  if (!val) return "";
  if (val instanceof Date) {
    const y = val.getFullYear();
    const m = String(val.getMonth() + 1).padStart(2, "0");
    const d = String(val.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }
  return String(val).substring(0, 10);
}

// ─── GET /api/blocked ──────────────────────────────────────────────────────
// Returnează toate perioadele blocate active (viitoare + curente)
// Folosit de: admin (lista) + calendar client (disponibilitate)
router.get("/", async (req, res) => {
  try {
    const { room_id, from, to } = req.query;
    let conditions = ["bp.end_date >= CURRENT_DATE"];
    let params = [];
    let idx = 1;

    if (room_id) {
      conditions.push(`(bp.room_id = $${idx++} OR bp.all_rooms = TRUE)`);
      params.push(room_id);
    }
    if (from) {
      conditions.push(`bp.end_date >= $${idx++}`);
      params.push(from);
    }
    if (to) {
      conditions.push(`bp.start_date <= $${idx++}`);
      params.push(to);
    }

    const where = "WHERE " + conditions.join(" AND ");

    const { rows } = await query(
      `SELECT
         bp.id,
         bp.room_id,
         r.name AS room_name,
         bp.reason,
         bp.reason_note,
         bp.start_date::text AS start_date,
         bp.end_date::text   AS end_date,
         bp.all_rooms,
         bp.created_by,
         bp.created_at
       FROM blocked_periods bp
       LEFT JOIN rooms r ON r.id = bp.room_id
       ${where}
       ORDER BY bp.start_date ASC`,
      params,
    );

    res.json({ success: true, data: rows });
  } catch (err) {
    console.error("❌ GET /api/blocked:", err.message);
    res.status(500).json({ success: false, error: "Eroare server" });
  }
});

// ─── GET /api/blocked/all-rooms ───────────────────────────────────────────
// Returnează perioadele blocate pentru toate camerele (pentru calendar client)
// Include atât blocked_periods cât și bookings confirmed/pending
router.get("/availability/:room_id", async (req, res) => {
  try {
    const { room_id } = req.params;

    // Rezervări confirmate/pending
    const { rows: bookingRows } = await query(
      `SELECT check_in::text AS start_date, check_out::text AS end_date, 'booking' AS type
       FROM bookings
       WHERE room_id = $1
         AND status IN ('confirmed', 'pending')
         AND check_out >= CURRENT_DATE`,
      [room_id],
    );

    // Perioade blocate (specifice camerei sau all_rooms)
    const { rows: blockedRows } = await query(
      `SELECT start_date::text, end_date::text, reason AS type
       FROM blocked_periods
       WHERE (room_id = $1 OR all_rooms = TRUE)
         AND end_date >= CURRENT_DATE`,
      [room_id],
    );

    const combined = [
      ...bookingRows.map((r) => ({
        check_in: r.start_date,
        check_out: r.end_date,
        type: "booking",
      })),
      ...blockedRows.map((r) => ({
        check_in: r.start_date,
        check_out: r.end_date,
        type: r.type,
      })),
    ];

    res.json({ success: true, data: combined });
  } catch (err) {
    console.error("❌ GET /api/blocked/availability/:room_id:", err.message);
    res.status(500).json({ success: false, error: "Eroare server" });
  }
});

// ─── POST /api/blocked ────────────────────────────────────────────────────
// Crează o perioadă blocată
// Body: { room_id?, reason, reason_note?, start_date, end_date, all_rooms }
router.post("/", async (req, res) => {
  try {
    const {
      room_id = null,
      reason,
      reason_note = null,
      start_date,
      end_date,
      all_rooms = false,
      created_by = "admin",
    } = req.body;

    if (!reason || !start_date || !end_date) {
      return res.status(400).json({
        success: false,
        error: "Câmpurile reason, start_date și end_date sunt obligatorii.",
      });
    }

    if (!["maintenance", "holiday", "other"].includes(reason)) {
      return res.status(400).json({
        success: false,
        error: "reason trebuie să fie: maintenance, holiday sau other",
      });
    }

    if (new Date(end_date) <= new Date(start_date)) {
      return res.status(400).json({
        success: false,
        error: "end_date trebuie să fie după start_date.",
      });
    }

    if (!all_rooms && !room_id) {
      return res.status(400).json({
        success: false,
        error: "Specifică room_id sau setează all_rooms = true.",
      });
    }

    if (all_rooms) {
      // Inserează câte un rând per cameră activă + un rând cu all_rooms=TRUE
      const { rows: allRooms } = await query(
        `SELECT id FROM rooms WHERE status = 'active'`,
      );

      // Inserare rând principal cu all_rooms=TRUE (fără room_id specific)
      const { rows } = await query(
        `INSERT INTO blocked_periods (room_id, reason, reason_note, start_date, end_date, all_rooms, created_by)
         VALUES (NULL, $1, $2, $3, $4, TRUE, $5)
         RETURNING id, reason, reason_note, start_date::text, end_date::text, all_rooms, created_at`,
        [reason, reason_note, start_date, end_date, created_by],
      );

      console.log(
        `🔒 Toate camerele blocate: ${reason} | ${start_date} → ${end_date}`,
      );
      res.status(201).json({
        success: true,
        data: rows[0],
        rooms_affected: allRooms.length,
      });
    } else {
      const { rows } = await query(
        `INSERT INTO blocked_periods (room_id, reason, reason_note, start_date, end_date, all_rooms, created_by)
         VALUES ($1, $2, $3, $4, $5, FALSE, $6)
         RETURNING id, room_id, reason, reason_note, start_date::text, end_date::text, all_rooms, created_at`,
        [room_id, reason, reason_note, start_date, end_date, created_by],
      );

      console.log(
        `🔒 Cameră blocată: ${room_id} | ${reason} | ${start_date} → ${end_date}`,
      );
      res.status(201).json({ success: true, data: rows[0] });
    }
  } catch (err) {
    console.error("❌ POST /api/blocked:", err.message);
    res.status(500).json({ success: false, error: "Eroare server" });
  }
});

// ─── DELETE /api/blocked/:id ──────────────────────────────────────────────
// Deblochează o perioadă (șterge rândul)
router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const check = await query(
      `SELECT id, reason, start_date::text, end_date::text, all_rooms FROM blocked_periods WHERE id = $1`,
      [id],
    );

    if (check.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: "Perioada blocată nu a fost găsită.",
      });
    }

    await query(`DELETE FROM blocked_periods WHERE id = $1`, [id]);

    const b = check.rows[0];
    console.log(
      `🔓 Perioadă deblocată: ${b.reason} | ${b.start_date} → ${b.end_date} | all_rooms=${b.all_rooms}`,
    );

    res.json({ success: true, message: "Perioadă deblocată cu succes." });
  } catch (err) {
    console.error("❌ DELETE /api/blocked/:id:", err.message);
    res.status(500).json({ success: false, error: "Eroare server" });
  }
});

module.exports = router;
