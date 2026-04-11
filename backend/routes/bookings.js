const express = require("express");
const router = express.Router();
const { query } = require("../config/db");

// ─── Helper: formatează data PostgreSQL → "YYYY-MM-DD" ───────────────────────
// PostgreSQL poate returna DATE fie ca string, fie ca Date object.
// String(Date) dă "Fri Apr 17 2026..." — incorect pentru email/afișare.
function fmtISO(val) {
  if (!val) return "";
  // String: "2026-05-03" sau "2026-05-03T00:00:00.000Z" → primii 10 chars
  if (typeof val === "string") return val.substring(0, 10);
  // Date object: folosim getters LOCALI (nu toISOString care e UTC)
  if (val instanceof Date) {
    const y = val.getFullYear();
    const m = String(val.getMonth() + 1).padStart(2, "0");
    const d = String(val.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }
  return String(val).substring(0, 10);
}

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
async function isRoomAvailable(
  roomId,
  checkIn,
  checkOut,
  excludeBookingId = null,
) {
  let sql = `
    SELECT COUNT(*) as count FROM bookings
    WHERE room_id = $1
      AND status NOT IN ('cancelled', 'finished')
      AND check_in < $3 AND check_out > $2
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
router.get("/", async (req, res) => {
  try {
    const { status, room_id, from, to, limit = 50, offset = 0 } = req.query;
    let conditions = [],
      params = [],
      paramIdx = 1;

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
      `SELECT b.*, r.name AS room_name, r.slug AS room_slug, r.price AS room_price
       FROM bookings b JOIN rooms r ON r.id = b.room_id
       ${whereClause} ORDER BY b.created_at DESC
       LIMIT $${paramIdx++} OFFSET $${paramIdx}`,
      params,
    );

    const countResult = await query(
      `SELECT COUNT(*) FROM bookings b ${whereClause}`,
      params.slice(0, -2),
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
       FROM bookings b JOIN rooms r ON r.id = b.room_id
       WHERE b.status IN ('confirmed', 'pending') AND b.check_out >= CURRENT_DATE
       ORDER BY b.check_in`,
    );
    res.json({ success: true, data: rows });
  } catch (err) {
    console.error("❌ GET /api/bookings/availability:", err.message);
    res.status(500).json({ success: false, error: "Eroare server" });
  }
});

// ─── GET /api/bookings/my ────────────────────────────────────────────────────
router.get("/my", async (req, res) => {
  try {
    const { email } = req.query;
    if (!email)
      return res
        .status(400)
        .json({ success: false, error: "Parametrul 'email' este obligatoriu" });

    const { rows } = await query(
      `SELECT b.*, r.name AS room_name, r.slug AS room_slug
       FROM bookings b JOIN rooms r ON r.id = b.room_id
       WHERE b.guest_email = $1 ORDER BY b.check_in DESC`,
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
      `SELECT b.*, r.name AS room_name, r.slug AS room_slug, r.price AS room_price
       FROM bookings b JOIN rooms r ON r.id = b.room_id WHERE b.id = $1`,
      [id],
    );
    if (bookingResult.rows.length === 0)
      return res
        .status(404)
        .json({ success: false, error: "Rezervarea nu a fost găsită" });

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
      payment_method = "card",
      payment_split = "full",
    } = req.body;

    if (!room_id || !guest_name || !guest_email || !check_in || !check_out)
      return res
        .status(400)
        .json({ success: false, error: "Câmpuri obligatorii lipsesc" });

    if (!["card", "bank_transfer", "reception"].includes(payment_method))
      return res
        .status(400)
        .json({ success: false, error: "Metodă de plată invalidă" });

    const checkInDate = new Date(check_in);
    const checkOutDate = new Date(check_out);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (checkInDate < today)
      return res.status(400).json({
        success: false,
        error: "Data de check-in nu poate fi în trecut",
      });
    if (checkOutDate <= checkInDate)
      return res.status(400).json({
        success: false,
        error: "Data de check-out trebuie să fie după check-in",
      });

    const roomResult = await query(
      `SELECT id, price, capacity FROM rooms WHERE id = $1 AND status = 'active'`,
      [room_id],
    );
    if (roomResult.rows.length === 0)
      return res.status(404).json({
        success: false,
        error: "Camera nu există sau nu este disponibilă",
      });

    const room = roomResult.rows[0];
    if (guests > room.capacity)
      return res.status(400).json({
        success: false,
        error: `Camera acceptă maxim ${room.capacity} oaspeți`,
      });

    const available = await isRoomAvailable(room_id, check_in, check_out);
    if (!available)
      return res.status(409).json({
        success: false,
        error: "Camera nu este disponibilă în perioada selectată",
      });

    // ── Calculăm din prețul real din DB — nu din ce trimite frontend-ul ──
    const nights = Math.ceil(
      (checkOutDate - checkInDate) / (1000 * 60 * 60 * 24),
    );
    const total_price = room.price * nights;

    const ADVANCE_PERCENT = 0.3;
    const effectiveSplit = payment_method === "card" ? payment_split : "full";

    let effectiveStripeAmount = null;
    let effectiveRemainingAmount = 0;

    if (payment_method === "card") {
      if (effectiveSplit === "advance") {
        effectiveStripeAmount = Math.round(total_price * ADVANCE_PERCENT);
        effectiveRemainingAmount = total_price - effectiveStripeAmount;
      } else {
        effectiveStripeAmount = total_price;
        effectiveRemainingAmount = 0;
      }
    } else {
      effectiveStripeAmount = null;
      effectiveRemainingAmount = total_price;
    }

    const booking_ref = await generateBookingRef();

    const { rows } = await query(
      `INSERT INTO bookings
        (booking_ref, user_id, room_id, guest_name, guest_email, guest_phone,
         check_in, check_out, guests, total_price, status, source, special_requests,
         payment_split, stripe_amount, remaining_amount)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)
       RETURNING *`,
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
        "pending",
        source,
        special_requests || null,
        effectiveSplit,
        effectiveStripeAmount,
        effectiveRemainingAmount,
      ],
    );

    const booking = rows[0];

    console.log(
      `✅ Rezervare: ${booking_ref} | ${guest_name} | ${nights} nopți | ` +
        `${payment_method} | split: ${effectiveSplit} | ` +
        `stripe: ${effectiveStripeAmount ?? "N/A"} RON | rest: ${effectiveRemainingAmount} RON`,
    );

    // Emailuri pentru non-Stripe
    if (payment_method === "bank_transfer" || payment_method === "reception") {
      try {
        const emailServices = require("../services/email");
        const roomNameResult = await query(
          `SELECT name FROM rooms WHERE id = $1`,
          [room_id],
        );
        const roomName = roomNameResult.rows[0]?.name || "cameră";

        const bookingEmailData = {
          guestName: guest_name,
          guestEmail: guest_email,
          guestPhone: guest_phone || null,
          roomName,
          checkIn: fmtISO(check_in), // ← fix: fmtISO în loc de String().substring
          checkOut: fmtISO(check_out), // ← fix
          nights,
          totalPrice: total_price,
          bookingRef: booking_ref,
        };

        if (payment_method === "bank_transfer") {
          emailServices
            .sendBankTransferInstructions(guest_email, bookingEmailData)
            .catch((err) =>
              console.error("⚠️ Email transfer bancar eșuat:", err.message),
            );
        } else {
          // Plată la recepție — rezervare în așteptare, fără email automat
          console.log(
            `📋 Rezervare recepție ${booking_ref} — admin contactează clientul`,
          );
        }

        emailServices
          .sendAdminNewBookingAlert(
            process.env.ADMIN_EMAIL || process.env.EMAIL_USER,
            {
              ...bookingEmailData,
              paymentMethod:
                payment_method === "bank_transfer"
                  ? "Transfer Bancar"
                  : "Plată la Recepție",
            },
          )
          .catch((err) =>
            console.error("⚠️ Email alertă admin eșuat:", err.message),
          );
      } catch (emailErr) {
        console.error("⚠️ Eroare serviciu email:", emailErr.message);
      }
    }

    res.status(201).json({
      success: true,
      data: booking,
      payment_method,
      payment_split: effectiveSplit,
      stripe_amount: effectiveStripeAmount,
      remaining_amount: effectiveRemainingAmount,
    });
  } catch (err) {
    console.error("❌ POST /api/bookings:", err.message);
    res.status(500).json({ success: false, error: "Eroare server" });
  }
});

// ─── PUT /api/bookings/:id/status ────────────────────────────────────────────
router.put("/:id/status", async (req, res) => {
  try {
    const { id } = req.params;
    const { status, reason } = req.body;

    const validStatuses = ["pending", "confirmed", "cancelled", "finished"];
    if (!validStatuses.includes(status))
      return res.status(400).json({
        success: false,
        error: `Status invalid: ${validStatuses.join(", ")}`,
      });

    const current = await query(
      `SELECT id, status, booking_ref FROM bookings WHERE id = $1`,
      [id],
    );
    if (current.rows.length === 0)
      return res
        .status(404)
        .json({ success: false, error: "Rezervarea nu a fost găsită" });

    const currentStatus = current.rows[0].status;
    const allowedTransitions = {
      pending: ["confirmed", "cancelled"],
      confirmed: ["cancelled", "finished"],
      cancelled: [],
      finished: [],
    };

    if (!allowedTransitions[currentStatus]?.includes(status))
      return res.status(400).json({
        success: false,
        error: `Nu se poate trece din "${currentStatus}" în "${status}"`,
      });

    const { rows } = await query(
      `UPDATE bookings SET status = $1, updated_at = NOW()
       WHERE id = $2 RETURNING id, booking_ref, guest_name, guest_email, status`,
      [status, id],
    );

    console.log(
      `📋 Status rezervare ${rows[0].booking_ref}: ${currentStatus} → ${status}`,
    );

    // Emailuri post-actualizare
    try {
      const emailServices = require("../services/email");

      const bookingFull = await query(
        `SELECT b.*, r.name AS room_name FROM bookings b
         JOIN rooms r ON r.id = b.room_id WHERE b.id = $1`,
        [id],
      );

      if (bookingFull.rows.length > 0) {
        const b = bookingFull.rows[0];

        // ── fmtISO() pentru toate datele din DB ───────────────────────────
        const emailData = {
          guestName: b.guest_name,
          guestEmail: b.guest_email,
          guestPhone: b.guest_phone || null,
          roomName: b.room_name,
          checkIn: fmtISO(b.check_in), // ← FIX
          checkOut: fmtISO(b.check_out), // ← FIX
          nights: b.nights,
          totalPrice: b.total_price,
          bookingRef: b.booking_ref,
          paymentSplit: b.payment_split,
          stripeAmount: b.stripe_amount,
          remainingAmount: b.remaining_amount,
        };

        if (status === "confirmed") {
          emailServices
            .sendClientBookingConfirmation(b.guest_email, emailData)
            .catch((err) =>
              console.error("⚠️ Email confirmare eșuat:", err.message),
            );
        }

        if (status === "cancelled") {
          emailServices
            .sendBookingCancellation(b.guest_email, {
              ...emailData,
              reason: reason || null,
            })
            .catch((err) =>
              console.error("⚠️ Email anulare client eșuat:", err.message),
            );
          emailServices
            .sendAdminCancellationAlert(
              process.env.ADMIN_EMAIL || process.env.EMAIL_USER,
              { ...emailData, reason: reason || "Motiv nespecificat" },
            )
            .catch((err) =>
              console.error("⚠️ Email anulare admin eșuat:", err.message),
            );
        }

        if (status === "finished") {
          emailServices
            .sendReviewRequest(b.guest_email, {
              guestName: b.guest_name,
              roomName: b.room_name,
              checkIn: fmtISO(b.check_in),
              checkOut: fmtISO(b.check_out),
              bookingRef: b.id,
            })
            .catch((err) =>
              console.error("⚠️ Email recenzie eșuat:", err.message),
            );
        }
      }
    } catch (emailErr) {
      console.error("⚠️ Eroare email post-status:", emailErr.message);
    }

    res.json({ success: true, data: rows[0] });
  } catch (err) {
    console.error("❌ PUT /api/bookings/:id/status:", err.message);
    res.status(500).json({ success: false, error: "Eroare server" });
  }
});

// ─── PATCH /api/bookings/:id/status (backward compat) ────────────────────────
router.patch("/:id/status", async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const validStatuses = ["pending", "confirmed", "cancelled", "finished"];
    if (!validStatuses.includes(status))
      return res.status(400).json({ success: false, error: "Status invalid" });

    const { rows } = await query(
      `UPDATE bookings SET status = $1, updated_at = NOW()
       WHERE id = $2 RETURNING id, booking_ref, guest_name, status`,
      [status, id],
    );

    if (rows.length === 0)
      return res
        .status(404)
        .json({ success: false, error: "Rezervarea nu a fost găsită" });

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
          checkIn: fmtISO(b.check_in), // ← FIX
          checkOut: fmtISO(b.check_out), // ← FIX
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

    const bookingCheck = await query(`SELECT id FROM bookings WHERE id = $1`, [
      id,
    ]);
    if (bookingCheck.rows.length === 0)
      return res
        .status(404)
        .json({ success: false, error: "Rezervarea nu există" });

    const { rows } = await query(
      `INSERT INTO guest_ids
        (booking_id, cnp, serie, numar, nume, prenume, data_nasterii, sex,
         cetatenie, locul_nasterii, domiciliu, emis_de, data_emiterii, data_expirarii)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
       ON CONFLICT (booking_id) DO UPDATE SET
        cnp=EXCLUDED.cnp, serie=EXCLUDED.serie, numar=EXCLUDED.numar,
        nume=EXCLUDED.nume, prenume=EXCLUDED.prenume,
        data_nasterii=EXCLUDED.data_nasterii, sex=EXCLUDED.sex,
        cetatenie=EXCLUDED.cetatenie, locul_nasterii=EXCLUDED.locul_nasterii,
        domiciliu=EXCLUDED.domiciliu, emis_de=EXCLUDED.emis_de,
        data_emiterii=EXCLUDED.data_emiterii, data_expirarii=EXCLUDED.data_expirarii
       RETURNING *`,
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
    if (check.rows.length === 0)
      return res
        .status(404)
        .json({ success: false, error: "Rezervarea nu există" });
    if (!["cancelled", "finished"].includes(check.rows[0].status))
      return res.status(400).json({
        success: false,
        error: "Poți șterge doar rezervările anulate sau finalizate",
      });

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
