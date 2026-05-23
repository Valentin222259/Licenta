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

async function generateBookingRef() {
  const year = new Date().getFullYear();
  const result = await query(
    `SELECT MAX(CAST(SPLIT_PART(booking_ref, '-', 3) AS INTEGER)) as max_seq
     FROM bookings
     WHERE booking_ref LIKE $1`,
    [`BLV-${year}-%`],
  );
  const maxSeq = result.rows[0]?.max_seq || 0;
  const seq = (maxSeq + 1).toString().padStart(3, "0");
  return `BLV-${year}-${seq}`;
}

async function isRoomAvailable(
  roomId,
  checkIn,
  checkOut,
  excludeBookingId = null,
) {
  // Verifică rezervări existente
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
  if (parseInt(result.rows[0].count) > 0) return false;

  // Verifică perioade blocate (reparații/concediu)
  // Pentru blocări, end_date e inclusiv → check_in < end_date + 1 zi
  const blocked = await query(
    `SELECT COUNT(*) as count FROM blocked_periods
     WHERE (room_id = $1 OR all_rooms = TRUE)
       AND start_date <= $3::date
       AND end_date >= $2::date`,
    [roomId, checkIn, checkOut],
  );
  return parseInt(blocked.rows[0].count) === 0;
}

// ─── GET /api/bookings ────────────────────────────────────────────────────────
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
    params.push(Number.parseInt(limit), Number.parseInt(offset));

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

    const normalized = rows.map((b) => ({
      ...b,
      check_in: fmtISO(b.check_in),
      check_out: fmtISO(b.check_out),
    }));

    res.json({
      success: true,
      data: normalized,
      total: Number.parseInt(countResult.rows[0].count),
    });
  } catch (err) {
    console.error("❌ GET /api/bookings:", err.message);
    res.status(500).json({ success: false, error: "Eroare server" });
  }
});

// ─── GET /api/bookings/availability ──────────────────────────────────────────
router.get("/availability", async (req, res) => {
  try {
    // Rezervări confirmate/pending
    const { rows: bookingRows } = await query(
      `SELECT b.check_in::text, b.check_out::text, r.name AS room_name, r.id AS room_id, 'booking' AS type
       FROM bookings b JOIN rooms r ON r.id = b.room_id
       WHERE b.status IN ('confirmed', 'pending') AND b.check_out >= CURRENT_DATE
       ORDER BY b.check_in`,
    );

    // Perioade blocate per cameră specifică
    const { rows: blockedSpecific } = await query(
      `SELECT
         bp.start_date::text AS check_in,
         bp.end_date::text   AS check_out,
         r.name              AS room_name,
         bp.room_id,
         bp.reason           AS type
       FROM blocked_periods bp
       JOIN rooms r ON r.id = bp.room_id
       WHERE bp.all_rooms = FALSE
         AND bp.end_date >= CURRENT_DATE`,
    );

    // Perioade blocate pentru TOATE camerele (all_rooms = TRUE)
    // Trebuie expandate pentru fiecare cameră activă
    const { rows: allRoomsBlocked } = await query(
      `SELECT
         bp.start_date::text AS check_in,
         bp.end_date::text   AS check_out,
         bp.reason           AS type,
         r.id                AS room_id,
         r.name              AS room_name
       FROM blocked_periods bp
       CROSS JOIN rooms r
       WHERE bp.all_rooms = TRUE
         AND r.status = 'active'
         AND bp.end_date >= CURRENT_DATE`,
    );

    res.json({
      success: true,
      data: [...bookingRows, ...blockedSpecific, ...allRoomsBlocked],
    });
  } catch (err) {
    console.error("❌ GET /api/bookings/availability:", err.message);
    res.status(500).json({ success: false, error: "Eroare server" });
  }
});

// ─── GET /api/bookings/my ─────────────────────────────────────────────────────
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

    const normalized = rows.map((b) => ({
      ...b,
      check_in: fmtISO(b.check_in),
      check_out: fmtISO(b.check_out),
    }));

    res.json({ success: true, data: normalized });
  } catch (err) {
    console.error("❌ GET /api/bookings/my:", err.message);
    res.status(500).json({ success: false, error: "Eroare server" });
  }
});

// ─── GET /api/bookings/:id ────────────────────────────────────────────────────
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

    const b = bookingResult.rows[0];
    res.json({
      success: true,
      data: {
        ...b,
        check_in: fmtISO(b.check_in),
        check_out: fmtISO(b.check_out),
        guest_id: guestIdResult.rows[0] || null,
      },
    });
  } catch (err) {
    console.error("❌ GET /api/bookings/:id:", err.message);
    res.status(500).json({ success: false, error: "Eroare server" });
  }
});

// ─── POST /api/bookings ───────────────────────────────────────────────────────
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
      preferred_language = "ro",
      user_id,
      payment_method = "card",
      payment_split = "full",
      needs_invoice = false,
      company_name = null,
      company_cui = null,
      company_reg_no = null,
      company_address = null,
      extras = null,
    } = req.body;

    if (!room_id || !guest_name || !guest_email || !check_in || !check_out)
      return res
        .status(400)
        .json({ success: false, error: "Câmpuri obligatorii lipsesc" });

    if (!["card", "bank_transfer", "reception"].includes(payment_method))
      return res
        .status(400)
        .json({ success: false, error: "Metodă de plată invalidă" });

    if (
      needs_invoice &&
      (!company_name || !company_cui || !company_reg_no || !company_address)
    )
      return res.status(400).json({
        success: false,
        error:
          "Pentru facturare pe firmă sunt obligatorii: denumirea firmei, CUI, nr. Reg. Comerțului și adresa sediului.",
      });

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
      `SELECT id, price, capacity, smart_multiplier,
          ROUND(price * COALESCE(smart_multiplier, 1.0)) AS current_price
   FROM rooms WHERE id = $1 AND status = 'active'`,
      [room_id],
    );
    if (roomResult.rows.length === 0)
      return res.status(404).json({
        success: false,
        error: "Camera nu există sau nu este disponibilă",
      });

    const room = roomResult.rows[0];
    const extraBeds = extras?.extra_beds || 0;

    if (extraBeds < 0 || extraBeds > 2)
      return res.status(400).json({
        success: false,
        error: "Numărul de paturi suplimentare poate fi 0, 1 sau 2",
      });

    const totalGuests = 2 + extraBeds;
    if (guests > totalGuests)
      return res.status(400).json({
        success: false,
        error: `Camera acceptă maxim ${totalGuests} oaspeți cu ${extraBeds} pat(uri) suplimentar(e)`,
      });

    const available = await isRoomAvailable(room_id, check_in, check_out);
    if (!available)
      return res.status(409).json({
        success: false,
        error: "Camera nu este disponibilă în perioada selectată",
      });

    const nights = Math.ceil(
      (checkOutDate - checkInDate) / (1000 * 60 * 60 * 24),
    );

    let extrasPrice = 0;
    let extrasJson = null;

    if (extras && typeof extras === "object") {
      const settingsResult = await query(
        `SELECT key, value FROM site_settings WHERE key IN ('price_breakfast', 'price_dinner', 'price_extra_bed', 'price_jacuzzi')`,
      );
      const prices = {};
      settingsResult.rows.forEach((r) => {
        prices[r.key] = Number.parseFloat(r.value) || 0;
      });

      if (extras.breakfast && typeof extras.breakfast === "object") {
        const totalBreakfast = Object.values(extras.breakfast).reduce(
          (s, n) => s + (n || 0),
          0,
        );
        extrasPrice += (prices.price_breakfast || 50) * totalBreakfast;
      }

      if (extras.dinner && typeof extras.dinner === "object") {
        const totalDinner = Object.values(extras.dinner).reduce(
          (s, n) => s + (n || 0),
          0,
        );
        extrasPrice += (prices.price_dinner || 80) * totalDinner;
      }

      if (extraBeds > 0)
        extrasPrice += (prices.price_extra_bed || 50) * extraBeds * nights;

      const jacuzziSessions = Array.isArray(extras.jacuzzi_dates)
        ? extras.jacuzzi_dates.length
        : extras.jacuzzi || 0;
      if (jacuzziSessions > 0)
        extrasPrice += (prices.price_jacuzzi || 100) * jacuzziSessions;

      extrasJson = {
        breakfast: extras.breakfast || {},
        dinner: extras.dinner || {},
        extra_beds: extraBeds,
        jacuzzi: jacuzziSessions,
        jacuzzi_dates: extras.jacuzzi_dates || [],
      };
    }

    const room_price = Number(room.current_price || room.price) * nights;
    const total_price = room_price + extrasPrice;

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
         payment_split, stripe_amount, remaining_amount,
         needs_invoice, company_name, company_cui, company_reg_no, company_address,
         extras_json, extras_price, preferred_language)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24)
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
        needs_invoice ? true : false,
        needs_invoice ? company_name : null,
        needs_invoice ? company_cui : null,
        needs_invoice ? company_reg_no : null,
        needs_invoice ? company_address : null,
        extrasJson ? JSON.stringify(extrasJson) : null,
        extrasPrice,
        preferred_language || "ro",
      ],
    );

    const booking = rows[0];
    console.log(
      `✅ Rezervare: ${booking_ref} | ${guest_name} | ${nights} nopți | cameră: ${room_price} RON | extras: ${extrasPrice} RON | total: ${total_price} RON`,
    );

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
          checkIn: fmtISO(check_in),
          checkOut: fmtISO(check_out),
          nights,
          roomPrice: room_price,
          extrasPrice,
          totalPrice: total_price,
          bookingRef: booking_ref,
          extras: extrasJson,
          needsInvoice: needs_invoice,
          companyName: needs_invoice ? company_name : null,
          companyCui: needs_invoice ? company_cui : null,
          companyRegNo: needs_invoice ? company_reg_no : null,
          companyAddress: needs_invoice ? company_address : null,
        };

        if (payment_method === "bank_transfer") {
          emailServices
            .sendBankTransferInstructions(
              guest_email,
              bookingEmailData,
              preferred_language || "ro",
            )
            .catch((err) =>
              console.error("⚠️ Email transfer bancar eșuat:", err.message),
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
      room_price,
      extras_price: extrasPrice,
      extras: extrasJson,
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

    try {
      const emailServices = require("../services/email");
      const bookingFull = await query(
        `SELECT b.*, r.name AS room_name FROM bookings b JOIN rooms r ON r.id = b.room_id WHERE b.id = $1`,
        [id],
      );

      if (bookingFull.rows.length > 0) {
        const b = bookingFull.rows[0];
        const lang = b.preferred_language || "ro";

        const emailData = {
          guestName: b.guest_name,
          guestEmail: b.guest_email,
          guestPhone: b.guest_phone || null,
          roomName: b.room_name,
          checkIn: fmtISO(b.check_in),
          checkOut: fmtISO(b.check_out),
          nights: b.nights,
          totalPrice: b.total_price,
          bookingRef: b.booking_ref,
          paymentSplit: b.payment_split,
          stripeAmount: b.stripe_amount,
          remainingAmount: b.remaining_amount,
          needsInvoice: b.needs_invoice,
          companyName: b.company_name,
          companyCui: b.company_cui,
          companyRegNo: b.company_reg_no,
          extras: b.extras_json,
          companyAddress: b.company_address,
        };

        if (status === "confirmed") {
          emailServices
            .sendClientBookingConfirmation(b.guest_email, emailData, lang)
            .catch((err) =>
              console.error("⚠️ Email confirmare eșuat:", err.message),
            );
        }

        if (status === "cancelled") {
          emailServices
            .sendBookingCancellation(
              b.guest_email,
              { ...emailData, reason: reason || null },
              lang,
            )
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
            .sendReviewRequest(
              b.guest_email,
              {
                guestName: b.guest_name,
                roomName: b.room_name,
                checkIn: fmtISO(b.check_in),
                checkOut: fmtISO(b.check_out),
                bookingRef: b.id,
              },
              lang,
            )
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

// ─── PUT /api/bookings/:id/guest ──────────────────────────────────────────────
router.put("/:id/guest", async (req, res) => {
  try {
    const { id } = req.params;
    const guestData = req.body;

    if (!guestData || typeof guestData !== "object") {
      return res.status(400).json({ success: false, error: "Date invalide" });
    }

    const { rows } = await query(
      `UPDATE bookings SET guest_data = $1, updated_at = NOW()
       WHERE id = $2 RETURNING id, booking_ref, guest_data`,
      [JSON.stringify(guestData), id],
    );

    if (rows.length === 0) {
      return res
        .status(404)
        .json({ success: false, error: "Rezervarea nu a fost găsită" });
    }

    console.log(
      `🪪 Date act identitate salvate pentru rezervarea ${rows[0].booking_ref}`,
    );
    res.json({ success: true, data: rows[0] });
  } catch (err) {
    console.error("❌ PUT /api/bookings/:id/guest:", err.message);
    res.status(500).json({ success: false, error: "Eroare server" });
  }
});

// ─── PATCH /api/bookings/:id/status ──────────────────────────────────────────
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
        `SELECT b.*, r.name AS room_name FROM bookings b JOIN rooms r ON r.id = b.room_id WHERE b.id = $1`,
        [id],
      );
      if (full.rows.length > 0) {
        const b = full.rows[0];
        sendBookingCancellation(
          b.guest_email,
          {
            guestName: b.guest_name,
            roomName: b.room_name,
            checkIn: fmtISO(b.check_in),
            checkOut: fmtISO(b.check_out),
            nights: b.nights,
            totalPrice: b.total_price,
            bookingRef: b.booking_ref,
          },
          b.preferred_language || "ro",
        ).catch((err) => console.error("⚠️ Email anulare eșuat:", err.message));
      }
    }

    res.json({ success: true, data: rows[0] });
  } catch (err) {
    console.error("❌ PATCH /api/bookings/:id/status:", err.message);
    res.status(500).json({ success: false, error: "Eroare server" });
  }
});

// ─── POST /api/bookings/:id/guest-id ─────────────────────────────────────────
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

// ─── DELETE /api/bookings/:id ─────────────────────────────────────────────────
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
    await query(`DELETE FROM bookings WHERE id = $1`, [id]);
    console.log(`🗑️  Rezervare ștearsă: ${id}`);
    res.json({ success: true });
  } catch (err) {
    console.error("❌ DELETE /api/bookings/:id:", err.message);
    res.status(500).json({ success: false, error: "Eroare server" });
  }
});

module.exports = router;
