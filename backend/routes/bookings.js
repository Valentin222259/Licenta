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
      AND status NOT IN ('cancelled', 'finished')
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
/**
 * Creează o rezervare nouă.
 *
 * Body fields:
 *  - payment_method: "card" | "bank_transfer"
 *    - "card"          → statusul inițial e "pending", se va confirma prin webhook Stripe
 *    - "bank_transfer" → statusul inițial e "pending", adminul confirmă manual
 *
 * Ambele metode returnează rezervarea creată.
 * Diferența de flux (redirect Stripe vs pagina de confirmare) se gestionează în frontend.
 */
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
      payment_method = "card", // "card" | "bank_transfer"
    } = req.body;

    // ── Validare câmpuri obligatorii ─────────────────────────────────────
    if (!room_id || !guest_name || !guest_email || !check_in || !check_out) {
      return res.status(400).json({
        success: false,
        error:
          "Câmpurile room_id, guest_name, guest_email, check_in, check_out sunt obligatorii",
      });
    }

    // ── Validare metodă de plată ─────────────────────────────────────────
    const validPaymentMethods = ["card", "bank_transfer", "reception"];
    if (!validPaymentMethods.includes(payment_method)) {
      return res.status(400).json({
        success: false,
        error: `Metodă de plată invalidă. Valori permise: ${validPaymentMethods.join(", ")}`,
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

    // ── Statusul inițial e întotdeauna "pending" ─────────────────────────
    // • Pentru "card": Stripe webhook-ul schimbă statusul în "confirmed" după plată
    // • Pentru "bank_transfer": Adminul confirmă manual din panou
    const initial_status = "pending";

    // ── Inserează rezervarea ─────────────────────────────────────────────
    const { rows } = await query(
      `
      INSERT INTO bookings
        (booking_ref, user_id, room_id, guest_name, guest_email, guest_phone,
         check_in, check_out, guests, total_price, status, source, special_requests)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
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
        initial_status,
        source,
        special_requests || null,
      ],
    );

    console.log(
      `✅ Rezervare creată: ${booking_ref} (${guest_name}, ${nights} nopți, metodă: ${payment_method})`,
    );

    // ── Trimitem emailuri pentru plăți non-Stripe ────────────────────────
    // Pentru card, emailul se trimite din webhook-ul Stripe după confirmare
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
          checkIn: check_in,
          checkOut: check_out,
          nights,
          totalPrice: total_price,
          bookingRef: booking_ref,
        };

        if (payment_method === "bank_transfer") {
          // Email cu instrucțiuni transfer bancar → client
          emailServices
            .sendBankTransferInstructions(guest_email, bookingEmailData)
            .catch((err) =>
              console.error("⚠️ Email transfer bancar eșuat:", err.message),
            );
        } else {
          // Email confirmare rezervare la recepție → client
          emailServices
            .sendReceptionPaymentConfirmation(guest_email, bookingEmailData)
            .catch((err) =>
              console.error("⚠️ Email plată recepție eșuat:", err.message),
            );
        }

        // Alertă admin pentru ambele metode
        const paymentLabel =
          payment_method === "bank_transfer"
            ? "Transfer Bancar"
            : "Plată la Recepție";

        emailServices
          .sendAdminNewBookingAlert(
            process.env.ADMIN_EMAIL || process.env.EMAIL_USER,
            { ...bookingEmailData, paymentMethod: paymentLabel },
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
      data: rows[0],
      payment_method,
      message:
        payment_method === "bank_transfer"
          ? `Rezervarea ${booking_ref} a fost înregistrată. Vă vom contacta cu detaliile de plată prin transfer bancar.`
          : `Rezervarea ${booking_ref} a fost înregistrată cu succes`,
    });
  } catch (err) {
    console.error("❌ POST /api/bookings:", err.message);
    res.status(500).json({ success: false, error: "Eroare server" });
  }
});

// ─── PUT /api/bookings/:id/status ────────────────────────────────────────────
/**
 * Actualizează statusul unei rezervări — acțiune admin.
 *
 * Statusuri permise: pending → confirmed | cancelled
 *                    confirmed → cancelled | finished
 *                    finished → (doar citire, nu se poate schimba)
 *
 * Tranzițiile valide:
 *  pending     → confirmed  (admin confirmă rezervarea / plata prin transfer)
 *  pending     → cancelled  (admin anulează)
 *  confirmed   → cancelled  (admin anulează o rezervare confirmată)
 *  confirmed   → finished   (marcat manual sau automat de cron job)
 */
router.put("/:id/status", async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const { reason } = req.body;

    const validStatuses = ["pending", "confirmed", "cancelled", "finished"];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        error: `Status invalid. Valori permise: ${validStatuses.join(", ")}`,
      });
    }

    // Verificăm că rezervarea există și obținem statusul curent
    const current = await query(
      `SELECT id, status, booking_ref, guest_name, guest_email, room_id FROM bookings WHERE id = $1`,
      [id],
    );

    if (current.rows.length === 0) {
      return res
        .status(404)
        .json({ success: false, error: "Rezervarea nu a fost găsită" });
    }

    const currentStatus = current.rows[0].status;

    // Validare tranziții permise
    const allowedTransitions = {
      pending: ["confirmed", "cancelled"],
      confirmed: ["cancelled", "finished"],
      cancelled: [], // statusul final nu se poate schimba
      finished: [], // statusul final nu se poate schimba
    };

    if (!allowedTransitions[currentStatus]?.includes(status)) {
      return res.status(400).json({
        success: false,
        error: `Nu se poate trece din statusul "${currentStatus}" în "${status}"`,
      });
    }

    // Actualizăm statusul
    const { rows } = await query(
      `UPDATE bookings
       SET status = $1, updated_at = NOW()
       WHERE id = $2
       RETURNING id, booking_ref, guest_name, guest_email, status`,
      [status, id],
    );

    console.log(
      `📋 Status rezervare ${rows[0].booking_ref}: ${currentStatus} → ${status}`,
    );

    // ── Acțiuni post-actualizare ─────────────────────────────────────────
    try {
      const emailServices = require("../services/email");

      if (status === "confirmed") {
        // Trimitem email de confirmare rezervare
        const bookingFull = await query(
          `SELECT b.*, r.name AS room_name FROM bookings b
           JOIN rooms r ON r.id = b.room_id WHERE b.id = $1`,
          [id],
        );
        if (bookingFull.rows.length > 0) {
          const b = bookingFull.rows[0];
          emailServices
            .sendClientBookingConfirmation(b.guest_email, {
              guestName: b.guest_name,
              guestEmail: b.guest_email,
              guestPhone: b.guest_phone || null,
              roomName: b.room_name,
              checkIn: String(b.check_in).substring(0, 10),
              checkOut: String(b.check_out).substring(0, 10),
              nights: b.nights,
              totalPrice: b.total_price,
              bookingRef: b.booking_ref,
            })
            .catch((err) =>
              console.error("⚠️ Email confirmare eșuat:", err.message),
            );
        }
      }
      if (status === "cancelled") {
        const bookingFull = await query(
          `SELECT b.*, r.name AS room_name FROM bookings b
     JOIN rooms r ON r.id = b.room_id WHERE b.id = $1`,
          [id],
        );
        if (bookingFull.rows.length > 0) {
          const b = bookingFull.rows[0];
          // Email client
          emailServices
            .sendBookingCancellation(b.guest_email, {
              guestName: b.guest_name,
              roomName: b.room_name,
              checkIn: String(b.check_in).substring(0, 10),
              checkOut: String(b.check_out).substring(0, 10),
              nights: b.nights,
              totalPrice: b.total_price,
              bookingRef: b.booking_ref,
              reason: reason || null,
            })
            .catch((err) =>
              console.error("⚠️ Email anulare client eșuat:", err.message),
            );

          // Email admin
          emailServices
            .sendAdminCancellationAlert(
              process.env.ADMIN_EMAIL || process.env.EMAIL_USER,
              {
                guestName: b.guest_name,
                guestEmail: b.guest_email,
                roomName: b.room_name,
                checkIn: String(b.check_in).substring(0, 10),
                checkOut: String(b.check_out).substring(0, 10),
                bookingRef: b.booking_ref,
                reason: reason || "Motiv nespecificat",
              },
            )
            .catch((err) =>
              console.error("⚠️ Email anulare admin eșuat:", err.message),
            );
        }
      }

      if (status === "finished") {
        // Trimitem email de mulțumire + link recenzie
        const bookingFull = await query(
          `SELECT b.*, r.name AS room_name FROM bookings b
           JOIN rooms r ON r.id = b.room_id WHERE b.id = $1`,
          [id],
        );
        if (bookingFull.rows.length > 0) {
          const b = bookingFull.rows[0];
          emailServices
            .sendReviewRequest(b.guest_email, {
              guestName: b.guest_name,
              roomName: b.room_name,
              checkIn: String(b.check_in).substring(0, 10),
              checkOut: String(b.check_out).substring(0, 10),
              bookingRef: b.id,
            })
            .catch((err) =>
              console.error("⚠️ Email recenzie eșuat:", err.message),
            );
        }
      }
    } catch (emailErr) {
      console.error("⚠️ Eroare serviciu email post-status:", emailErr.message);
    }

    res.json({ success: true, data: rows[0] });
  } catch (err) {
    console.error("❌ PUT /api/bookings/:id/status:", err.message);
    res.status(500).json({ success: false, error: "Eroare server" });
  }
});

// ─── PATCH /api/bookings/:id/status (backward compat cu codul vechi) ─────────
/**
 * Alias pentru PUT /:id/status — menținut pentru compatibilitate cu codul
 * existent (webhook Stripe folosea PATCH).
 */
router.patch("/:id/status", async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const validStatuses = ["pending", "confirmed", "cancelled", "finished"];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        error: `Status invalid. Valori permise: ${validStatuses.join(", ")}`,
      });
    }

    const { rows } = await query(
      `UPDATE bookings
       SET status = $1, updated_at = NOW()
       WHERE id = $2
       RETURNING id, booking_ref, guest_name, status`,
      [status, id],
    );

    if (rows.length === 0) {
      return res
        .status(404)
        .json({ success: false, error: "Rezervarea nu a fost găsită" });
    }

    console.log(`📋 Status rezervare ${rows[0].booking_ref}: ${status}`);

    // Email anulare (comportament existent)
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

    const bookingCheck = await query(
      `SELECT id, guest_name FROM bookings WHERE id = $1`,
      [id],
    );
    if (bookingCheck.rows.length === 0) {
      return res
        .status(404)
        .json({ success: false, error: "Rezervarea nu există" });
    }

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
    if (!["cancelled", "finished"].includes(check.rows[0].status)) {
      return res.status(400).json({
        success: false,
        error: "Poți șterge doar rezervările anulate sau finalizate",
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
