const express = require("express");
const router = express.Router();
const { query } = require("../config/db");

// ─── Helper: generează referință rezervare (BLV-2025-001) ───────────────────
async function generateBookingRef() {
  const year = new Date().getFullYear();
  const result = await query(
    `SELECT COUNT(*) as count FROM bookings WHERE EXTRACT(YEAR FROM created_at) = $1`,
    [year],
  );
  const seq = (parseInt(result.rows[0].count) + 1).toString().padStart(3, "0");
  return `BLV-${year}-${seq}`;
}

// ─── Helper: verifică disponibilitate cameră ────────────────────────────────
// Returnează true dacă camera este liberă în perioada dată
async function isRoomAvailable(
  roomId,
  checkIn,
  checkOut,
  excludeBookingId = null,
) {
  let sql = `
    SELECT COUNT(*) as count
    FROM bookings
    WHERE room_id = $1
      AND status NOT IN ('cancelled')
      AND check_in < $3
      AND check_out > $2
  `;
  const params = [roomId, checkIn, checkOut];

  if (excludeBookingId) {
    sql += ` AND id != $4`;
    params.push(excludeBookingId);
  }

  const result = await query(sql, params);
  return parseInt(result.rows[0].count) === 0;
}

// ─── GET /api/bookings ───────────────────────────────────────────────────────
// Lista completă pentru admin, cu filtre opționale
router.get("/", async (req, res) => {
  try {
    const { status, room_id, from, to, limit = 50, offset = 0 } = req.query;

    let conditions = [];
    let params = [];
    let paramIdx = 1;

    if (status) {
      conditions.push(`b.status = $${paramIdx++}`);
      params.push(status);
    }
    if (room_id) {
      conditions.push(`b.room_id = $${paramIdx++}`);
      params.push(room_id);
    }
    if (from) {
      conditions.push(`b.check_in >= $${paramIdx++}`);
      params.push(from);
    }
    if (to) {
      conditions.push(`b.check_out <= $${paramIdx++}`);
      params.push(to);
    }

    const whereClause =
      conditions.length > 0 ? "WHERE " + conditions.join(" AND ") : "";

    params.push(parseInt(limit), parseInt(offset));

    const { rows } = await query(
      `
      SELECT
        b.*,
        r.name  AS room_name,
        r.slug  AS room_slug,
        r.price AS room_price
      FROM bookings b
      JOIN rooms r ON r.id = b.room_id
      ${whereClause}
      ORDER BY b.created_at DESC
      LIMIT $${paramIdx++} OFFSET $${paramIdx}
    `,
      params,
    );

    // Total pentru paginare
    const countResult = await query(
      `SELECT COUNT(*) FROM bookings b ${whereClause}`,
      params.slice(0, -2), // fără limit/offset
    );

    res.json({
      success: true,
      data: rows,
      total: parseInt(countResult.rows[0].count),
    });
  } catch (err) {
    console.error("❌ GET /api/bookings:", err.message);
    res.status(500).json({ success: false, error: "Eroare server" });
  }
});

// ─── GET /api/bookings/availability ──────────────────────────────────────────
router.get("/availability", async (req, res) => {
  try {
    const { rows } = await query(
      `SELECT b.check_in::text, b.check_out::text, r.name AS room_name, r.id AS room_id
       FROM bookings b
       JOIN rooms r ON r.id = b.room_id
       WHERE b.status IN ('confirmed', 'pending')
         AND b.check_out >= CURRENT_DATE
       ORDER BY b.check_in`,
    );
    res.json({ success: true, data: rows });
  } catch (err) {
    console.error("❌ GET /api/bookings/availability:", err.message);
    res.status(500).json({ success: false, error: "Eroare server" });
  }
});

// ─── GET /api/bookings/my ────────────────────────────────────────────────────
// Rezervările unui client specific (după email sau user_id)
// TODO: înlocuiește cu user_id din JWT când adăugăm auth
router.get("/my", async (req, res) => {
  try {
    const { email } = req.query;

    if (!email) {
      return res.status(400).json({
        success: false,
        error: "Parametrul 'email' este obligatoriu",
      });
    }

    const { rows } = await query(
      `
      SELECT
        b.*,
        r.name AS room_name,
        r.slug AS room_slug
      FROM bookings b
      JOIN rooms r ON r.id = b.room_id
      WHERE b.guest_email = $1
      ORDER BY b.check_in DESC
    `,
      [email],
    );

    res.json({ success: true, data: rows });
  } catch (err) {
    console.error("❌ GET /api/bookings/my:", err.message);
    res.status(500).json({ success: false, error: "Eroare server" });
  }
});

// ─── GET /api/bookings/:id ───────────────────────────────────────────────────
router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const bookingResult = await query(
      `
      SELECT b.*, r.name AS room_name, r.slug AS room_slug, r.price AS room_price
      FROM bookings b
      JOIN rooms r ON r.id = b.room_id
      WHERE b.id = $1
    `,
      [id],
    );

    if (bookingResult.rows.length === 0) {
      return res
        .status(404)
        .json({ success: false, error: "Rezervarea nu a fost găsită" });
    }

    // Date buletin (dacă există)
    const guestIdResult = await query(
      `SELECT * FROM guest_ids WHERE booking_id = $1`,
      [id],
    );

    res.json({
      success: true,
      data: {
        ...bookingResult.rows[0],
        guest_id: guestIdResult.rows[0] || null,
      },
    });
  } catch (err) {
    console.error("❌ GET /api/bookings/:id:", err.message);
    res.status(500).json({ success: false, error: "Eroare server" });
  }
});

// ─── POST /api/bookings ──────────────────────────────────────────────────────
// Creează o rezervare nouă cu verificare disponibilitate
router.post("/", async (req, res) => {
  try {
    const {
      room_id,
      guest_name,
      guest_email,
      guest_phone,
      check_in,
      check_out,
      guests = 1,
      special_requests,
      source = "website",
      user_id,
    } = req.body;

    // ── Validare câmpuri obligatorii ─────────────────────────────────────
    if (!room_id || !guest_name || !guest_email || !check_in || !check_out) {
      return res.status(400).json({
        success: false,
        error:
          "Câmpurile room_id, guest_name, guest_email, check_in, check_out sunt obligatorii",
      });
    }

    // ── Validare date ────────────────────────────────────────────────────
    const checkInDate = new Date(check_in);
    const checkOutDate = new Date(check_out);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (checkInDate < today) {
      return res.status(400).json({
        success: false,
        error: "Data de check-in nu poate fi în trecut",
      });
    }

    if (checkOutDate <= checkInDate) {
      return res.status(400).json({
        success: false,
        error: "Data de check-out trebuie să fie după check-in",
      });
    }

    // ── Verifică că camera există și e activă ────────────────────────────
    const roomResult = await query(
      `SELECT id, price, capacity FROM rooms WHERE id = $1 AND status = 'active'`,
      [room_id],
    );

    if (roomResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: "Camera nu există sau nu este disponibilă",
      });
    }

    const room = roomResult.rows[0];

    // ── Verifică capacitate ──────────────────────────────────────────────
    if (guests > room.capacity) {
      return res.status(400).json({
        success: false,
        error: `Camera acceptă maxim ${room.capacity} oaspeți`,
      });
    }

    // ── Verifică disponibilitate ─────────────────────────────────────────
    const available = await isRoomAvailable(room_id, check_in, check_out);
    if (!available) {
      return res.status(409).json({
        success: false,
        error: "Camera nu este disponibilă în perioada selectată",
      });
    }

    // ── Calculează prețul total ──────────────────────────────────────────
    const nights = Math.ceil(
      (checkOutDate - checkInDate) / (1000 * 60 * 60 * 24),
    );
    const total_price = room.price * nights;

    // ── Generează referința ──────────────────────────────────────────────
    const booking_ref = await generateBookingRef();

    // ── Inserează rezervarea ─────────────────────────────────────────────
    const { rows } = await query(
      `
      INSERT INTO bookings
        (booking_ref, user_id, room_id, guest_name, guest_email, guest_phone,
         check_in, check_out, guests, total_price, status, source, special_requests)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'pending', $11, $12)
      RETURNING *
    `,
      [
        booking_ref,
        user_id || null,
        room_id,
        guest_name,
        guest_email,
        guest_phone || null,
        check_in,
        check_out,
        guests,
        total_price,
        source,
        special_requests || null,
      ],
    );

    console.log(
      `✅ Rezervare creată: ${booking_ref} (${guest_name}, ${nights} nopți)`,
    );

    res.status(201).json({
      success: true,
      data: rows[0],
      message: `Rezervarea ${booking_ref} a fost înregistrată cu succes`,
    });
  } catch (err) {
    console.error("❌ POST /api/bookings:", err.message);
    res.status(500).json({ success: false, error: "Eroare server" });
  }
});

// ─── PATCH /api/bookings/:id/status ─────────────────────────────────────────
// Actualizează statusul rezervării — admin
router.patch("/:id/status", async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const validStatuses = ["pending", "confirmed", "cancelled", "completed"];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        error: `Status invalid. Valori permise: ${validStatuses.join(", ")}`,
      });
    }

    const { rows } = await query(
      `
      UPDATE bookings
      SET status = $1, updated_at = NOW()
      WHERE id = $2
      RETURNING id, booking_ref, guest_name, status
    `,
      [status, id],
    );

    if (rows.length === 0) {
      return res
        .status(404)
        .json({ success: false, error: "Rezervarea nu a fost găsită" });
    }

    console.log(`📋 Status rezervare ${rows[0].booking_ref}: ${status}`);
    if (status === "cancelled") {
      const { sendBookingCancellation } = require("../services/email");
      const full = await query(
        `SELECT b.*, r.name AS room_name FROM bookings b
     JOIN rooms r ON r.id = b.room_id WHERE b.id = $1`,
        [id],
      );
      if (full.rows.length > 0) {
        const b = full.rows[0];
        sendBookingCancellation(b.guest_email, {
          guestName: b.guest_name,
          roomName: b.room_name,
          checkIn: String(b.check_in).substring(0, 10),
          checkOut: String(b.check_out).substring(0, 10),
          nights: b.nights,
          totalPrice: b.total_price,
          bookingRef: b.booking_ref,
        }).catch((err) =>
          console.error("⚠️ Email anulare eșuat:", err.message),
        );
      }
    }
    res.json({ success: true, data: rows[0] });
  } catch (err) {
    console.error("❌ PATCH /api/bookings/:id/status:", err.message);
    res.status(500).json({ success: false, error: "Eroare server" });
  }
});

// ─── POST /api/bookings/:id/guest-id ────────────────────────────────────────
// Salvează datele buletinului scanat cu Gemini (OG 97/2005)
router.post("/:id/guest-id", async (req, res) => {
  try {
    const { id } = req.params;
    const {
      cnp,
      serie,
      numar,
      nume,
      prenume,
      data_nasterii,
      sex,
      cetatenie,
      locul_nasterii,
      domiciliu,
      emis_de,
      data_emiterii,
      data_expirarii,
    } = req.body;

    // Verifică că rezervarea există
    const bookingCheck = await query(
      `SELECT id, guest_name FROM bookings WHERE id = $1`,
      [id],
    );
    if (bookingCheck.rows.length === 0) {
      return res
        .status(404)
        .json({ success: false, error: "Rezervarea nu există" });
    }

    // Upsert: dacă există deja date pentru această rezervare, le actualizăm
    const { rows } = await query(
      `
      INSERT INTO guest_ids
        (booking_id, cnp, serie, numar, nume, prenume, data_nasterii, sex,
         cetatenie, locul_nasterii, domiciliu, emis_de, data_emiterii, data_expirarii)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
      ON CONFLICT (booking_id)
      DO UPDATE SET
        cnp = EXCLUDED.cnp, serie = EXCLUDED.serie, numar = EXCLUDED.numar,
        nume = EXCLUDED.nume, prenume = EXCLUDED.prenume,
        data_nasterii = EXCLUDED.data_nasterii, sex = EXCLUDED.sex,
        cetatenie = EXCLUDED.cetatenie, locul_nasterii = EXCLUDED.locul_nasterii,
        domiciliu = EXCLUDED.domiciliu, emis_de = EXCLUDED.emis_de,
        data_emiterii = EXCLUDED.data_emiterii, data_expirarii = EXCLUDED.data_expirarii
      RETURNING *
    `,
      [
        id,
        cnp,
        serie,
        numar,
        nume,
        prenume,
        data_nasterii,
        sex,
        cetatenie,
        locul_nasterii,
        domiciliu,
        emis_de,
        data_emiterii,
        data_expirarii,
      ],
    );

    console.log(`🪪 Date buletin salvate pentru rezervarea ${id}`);
    res.json({ success: true, data: rows[0] });
  } catch (err) {
    console.error("❌ POST /api/bookings/:id/guest-id:", err.message);
    res.status(500).json({ success: false, error: "Eroare server" });
  }
});

// ─── DELETE /api/bookings/:id ─────────────────────────────────────────────
router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const check = await query(`SELECT status FROM bookings WHERE id = $1`, [
      id,
    ]);
    if (check.rows.length === 0) {
      return res
        .status(404)
        .json({ success: false, error: "Rezervarea nu există" });
    }
    if (check.rows[0].status !== "cancelled") {
      return res.status(400).json({
        success: false,
        error: "Poți șterge doar rezervările anulate",
      });
    }
    await query(`DELETE FROM guest_ids WHERE booking_id = $1`, [id]);
    await query(`DELETE FROM bookings WHERE id = $1`, [id]);
    console.log(`🗑️  Rezervare ștearsă: ${id}`);
    res.json({ success: true });
  } catch (err) {
    console.error("❌ DELETE /api/bookings/:id:", err.message);
    res.status(500).json({ success: false, error: "Eroare server" });
  }
});

module.exports = router;
