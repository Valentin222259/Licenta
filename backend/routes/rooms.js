// backend/routes/rooms.js — versiune bilingvă
// Returnează câmpurile în limba cerută prin query param ?lang=en|ro
// sau Accept-Language header.

const express = require("express");
const router = express.Router();
const { query } = require("../config/db");

// Helper: alege valoarea corectă în funcție de limbă
function pick(roVal, enVal, lang) {
  if (lang === "en" && enVal && enVal.trim() !== "") return enVal;
  return roVal;
}

// Helper: detectează limba din request
function detectLang(req) {
  // 1. Query param explicit: ?lang=en
  if (req.query.lang === "en" || req.query.lang === "ro") return req.query.lang;
  // 2. Header Accept-Language
  const al = req.headers["accept-language"] || "";
  if (al.startsWith("en")) return "en";
  return "ro";
}

// Helper: construiește obiect cameră localizat
function localizeRoom(room, lang) {
  return {
    ...room,
    name: pick(room.name, room.name_en, lang),
    short_description: pick(
      room.short_description,
      room.short_description_en,
      lang,
    ),
    description: pick(room.description, room.description_en, lang),
    amenities:
      lang === "en" && room.amenities_en && room.amenities_en.length > 0
        ? room.amenities_en
        : room.amenities,
    // Păstrăm și variantele raw pentru admin
    _name_ro: room.name,
    _name_en: room.name_en,
  };
}

// GET /api/rooms
router.get("/", async (req, res) => {
  try {
    const lang = detectLang(req);
    const { rows } = await query(`
      SELECT
  r.id, r.slug, r.name, r.name_en,
  r.short_description, r.short_description_en,
  r.price,
  r.smart_multiplier,
  ROUND(r.price * COALESCE(r.smart_multiplier, 1.0)) AS current_price,
  r.capacity, r.status, r.amenities, r.amenities_en, r.sort_order,
  (SELECT i.url FROM images i WHERE i.room_id = r.id AND i.category = 'room' AND i.is_primary = true LIMIT 1) AS primary_image,
  (SELECT COUNT(*) FROM images i WHERE i.room_id = r.id AND i.category = 'room')::integer AS image_count
FROM rooms r
WHERE r.status = 'active'
ORDER BY r.sort_order ASC, r.created_at ASC
    `);

    const localized = rows.map((r) => localizeRoom(r, lang));
    res.json({ success: true, data: localized });
  } catch (err) {
    console.error("❌ GET /api/rooms:", err.message);
    res.status(500).json({ success: false, error: "Eroare server" });
  }
});

// GET /api/rooms/admin
router.get("/admin", async (req, res) => {
  try {
    const { rows } = await query(`
      SELECT
        r.*,
        (
          SELECT i.url FROM images i
          WHERE i.room_id = r.id AND i.is_primary = true
          LIMIT 1
        ) AS primary_image,
        (
          SELECT COUNT(*) FROM images i WHERE i.room_id = r.id
        )::integer AS image_count,
        (
          SELECT COUNT(*) FROM bookings b
          WHERE b.room_id = r.id AND b.status = 'confirmed'
        )::integer AS confirmed_bookings
      FROM rooms r
      ORDER BY r.sort_order ASC, r.created_at ASC
    `);

    // Admin primește toate câmpurile (RO + EN) pentru editare
    res.json({ success: true, data: rows });
  } catch (err) {
    console.error("❌ GET /api/rooms/admin:", err.message);
    res.status(500).json({ success: false, error: "Eroare server" });
  }
});

// GET /api/rooms/:slug
router.get("/:slug", async (req, res) => {
  try {
    const { slug } = req.params;
    const lang = detectLang(req);

    const roomResult = await query(
      `SELECT *, ROUND(price * COALESCE(smart_multiplier, 1.0)) AS current_price
 FROM rooms WHERE slug = $1 AND status = 'active'`,
      [slug],
    );

    if (roomResult.rows.length === 0) {
      return res
        .status(404)
        .json({ success: false, error: "Camera nu a fost găsită" });
    }

    const room = localizeRoom(roomResult.rows[0], lang);

    const imagesResult = await query(
      `SELECT id, url, s3_key, caption, sort_order, is_primary
       FROM images
       WHERE room_id = $1 AND category = 'room'
       ORDER BY is_primary DESC, sort_order ASC`,
      [roomResult.rows[0].id],
    );

    const reviewsResult = await query(
      `SELECT id, guest_name, rating, text, created_at
       FROM reviews
       WHERE room_id = $1 AND is_visible = true
       ORDER BY created_at DESC
       LIMIT 10`,
      [roomResult.rows[0].id],
    );

    res.json({
      success: true,
      data: {
        ...room,
        images: imagesResult.rows,
        reviews: reviewsResult.rows,
      },
    });
  } catch (err) {
    console.error("❌ GET /api/rooms/:slug:", err.message);
    res.status(500).json({ success: false, error: "Eroare server" });
  }
});

// POST /api/rooms
router.post("/", async (req, res) => {
  try {
    const {
      slug,
      name,
      name_en,
      description,
      description_en,
      short_description,
      short_description_en,
      price,
      capacity = 2,
      amenities = [],
      amenities_en = [],
      sort_order = 0,
    } = req.body;

    if (!slug || !name || !price) {
      return res.status(400).json({
        success: false,
        error: "Câmpurile slug, name și price sunt obligatorii",
      });
    }

    const { rows } = await query(
      `INSERT INTO rooms (
         slug, name, name_en,
         description, description_en,
         short_description, short_description_en,
         price, capacity,
         amenities, amenities_en,
         sort_order
       )
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
       RETURNING *`,
      [
        slug,
        name,
        name_en || null,
        description,
        description_en || null,
        short_description,
        short_description_en || null,
        price,
        capacity,
        amenities,
        amenities_en,
        sort_order,
      ],
    );

    console.log(`✅ Cameră creată: ${name} (${slug})`);
    res.status(201).json({ success: true, data: rows[0] });
  } catch (err) {
    if (err.code === "23505") {
      return res.status(409).json({
        success: false,
        error: `Slug-ul "${req.body.slug}" există deja`,
      });
    }
    console.error("❌ POST /api/rooms:", err.message);
    res.status(500).json({ success: false, error: "Eroare server" });
  }
});

// PUT /api/rooms/:id
router.put("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const {
      name,
      name_en,
      description,
      description_en,
      short_description,
      short_description_en,
      price,
      capacity,
      status,
      amenities,
      amenities_en,
      sort_order,
    } = req.body;

    const { rows } = await query(
      `UPDATE rooms SET
        name                  = COALESCE($1,  name),
        name_en               = COALESCE($2,  name_en),
        description           = COALESCE($3,  description),
        description_en        = COALESCE($4,  description_en),
        short_description     = COALESCE($5,  short_description),
        short_description_en  = COALESCE($6,  short_description_en),
        price                 = COALESCE($7,  price),
        capacity              = COALESCE($8,  capacity),
        status                = COALESCE($9,  status),
        amenities             = COALESCE($10, amenities),
        amenities_en          = COALESCE($11, amenities_en),
        sort_order            = COALESCE($12, sort_order),
        updated_at            = NOW()
       WHERE id = $13
       RETURNING *`,
      [
        name,
        name_en,
        description,
        description_en,
        short_description,
        short_description_en,
        price,
        capacity,
        status,
        amenities,
        amenities_en,
        sort_order,
        id,
      ],
    );

    if (rows.length === 0) {
      return res
        .status(404)
        .json({ success: false, error: "Camera nu a fost găsită" });
    }

    res.json({ success: true, data: rows[0] });
  } catch (err) {
    console.error("❌ PUT /api/rooms/:id:", err.message);
    res.status(500).json({ success: false, error: "Eroare server" });
  }
});

// DELETE /api/rooms/:id
router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const { rows } = await query(
      `UPDATE rooms SET status = 'inactive', updated_at = NOW()
       WHERE id = $1 RETURNING id, name`,
      [id],
    );

    if (rows.length === 0) {
      return res
        .status(404)
        .json({ success: false, error: "Camera nu a fost găsită" });
    }

    console.log(`🗑️  Cameră dezactivată: ${rows[0].name}`);
    res.json({ success: true, message: "Camera a fost dezactivată" });
  } catch (err) {
    console.error("❌ DELETE /api/rooms/:id:", err.message);
    res.status(500).json({ success: false, error: "Eroare server" });
  }
});

// POST /api/pricing/apply
router.post("/pricing/apply", async (req, res) => {
  try {
    const multiplier = parseFloat(req.body.multiplier);
    if (isNaN(multiplier) || multiplier <= 0 || multiplier > 3) {
      return res
        .status(400)
        .json({ success: false, error: "Multiplicator invalid" });
    }

    const { rows: preview } = await query(
      `SELECT id, name, price, smart_multiplier,
              ROUND(price * $1::numeric) AS new_price
       FROM rooms WHERE status = 'active' ORDER BY sort_order`,
      [multiplier],
    );

    const { rowCount } = await query(
      `UPDATE rooms SET smart_multiplier = $1::numeric, updated_at = NOW()
       WHERE status = 'active'`,
      [multiplier],
    );

    console.log(
      `💰 Smart multiplier aplicat: ${multiplier} pe ${rowCount} camere`,
    );
    res.json({
      success: true,
      updatedRooms: rowCount,
      multiplier,
      rooms: preview,
    });
  } catch (err) {
    console.error("❌ POST /api/rooms/pricing/apply:", err.message);
    res.status(500).json({ success: false, error: "Eroare server" });
  }
});

// PUT /api/rooms/:id/base-price
router.put("/:id/base-price", async (req, res) => {
  try {
    const { id } = req.params;
    const price = parseInt(req.body.price);

    if (isNaN(price) || price < 50 || price > 5000) {
      return res.status(400).json({ success: false, error: "Preț invalid" });
    }

    const { rows } = await query(
      `UPDATE rooms SET price = $1, updated_at = NOW()
 WHERE id = $2 RETURNING id, name, price`,
      [price, id],
    );

    if (rows.length === 0) {
      return res
        .status(404)
        .json({ success: false, error: "Camera nu a fost găsită" });
    }

    console.log(`💰 Preț de bază actualizat: ${rows[0].name} → ${price} RON`);
    res.json({ success: true, data: rows[0] });
  } catch (err) {
    console.error("❌ PUT /api/rooms/:id/base-price:", err.message);
    res.status(500).json({ success: false, error: "Eroare server" });
  }
});

// POST /api/rooms/pricing/reset
router.post("/pricing/reset", async (req, res) => {
  try {
    const { rowCount } = await query(
      `UPDATE rooms SET smart_multiplier = 1.0, updated_at = NOW()
       WHERE status = 'active'`,
    );
    console.log(`🔄 Smart multiplier resetat: ${rowCount} camere`);
    res.json({ success: true, updatedRooms: rowCount });
  } catch (err) {
    console.error("❌ POST /api/rooms/pricing/reset:", err.message);
    res.status(500).json({ success: false, error: "Eroare server" });
  }
});

module.exports = router;
