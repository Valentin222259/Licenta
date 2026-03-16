const express = require("express");
const router = express.Router();
const { query } = require("../config/db");

// ─── GET /api/rooms ──────────────────────────────────────────────────────────
// Returnează toate camerele active cu imaginea primară
// Folosit de: pagina publică /rooms și /rooms/:slug
router.get("/", async (req, res) => {
  try {
    const { rows } = await query(`
      SELECT
        r.id,
        r.slug,
        r.name,
        r.short_description,
        r.price,
        r.capacity,
        r.status,
        r.amenities,
        r.sort_order,
        -- Imaginea primară (dacă există)
        (
          SELECT i.url
          FROM images i
          WHERE i.room_id = r.id
            AND i.category = 'room'
            AND i.is_primary = true
          LIMIT 1
        ) AS primary_image,
        -- Numărul total de imagini
        (
          SELECT COUNT(*)
          FROM images i
          WHERE i.room_id = r.id AND i.category = 'room'
        )::integer AS image_count
      FROM rooms r
      WHERE r.status = 'active'
      ORDER BY r.sort_order ASC, r.created_at ASC
    `);

    res.json({ success: true, data: rows });
  } catch (err) {
    console.error("❌ GET /api/rooms:", err.message);
    res.status(500).json({ success: false, error: "Eroare server" });
  }
});

// ─── GET /api/rooms/admin ────────────────────────────────────────────────────
// Returnează TOATE camerele (inclusiv inactive) — pentru panoul admin
// TODO: adaugă middleware requireAdmin după ce implementăm JWT
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

    res.json({ success: true, data: rows });
  } catch (err) {
    console.error("❌ GET /api/rooms/admin:", err.message);
    res.status(500).json({ success: false, error: "Eroare server" });
  }
});

// ─── GET /api/rooms/:slug ────────────────────────────────────────────────────
// Returnează o cameră cu toate imaginile și recenziile
router.get("/:slug", async (req, res) => {
  try {
    const { slug } = req.params;

    // Camera de bază
    const roomResult = await query(
      `SELECT * FROM rooms WHERE slug = $1 AND status = 'active'`,
      [slug],
    );

    if (roomResult.rows.length === 0) {
      return res
        .status(404)
        .json({ success: false, error: "Camera nu a fost găsită" });
    }

    const room = roomResult.rows[0];

    // Imaginile camerei (ordonate)
    const imagesResult = await query(
      `SELECT id, url, s3_key, caption, sort_order, is_primary
       FROM images
       WHERE room_id = $1 AND category = 'room'
       ORDER BY is_primary DESC, sort_order ASC`,
      [room.id],
    );

    // Recenziile vizibile
    const reviewsResult = await query(
      `SELECT id, guest_name, rating, text, created_at
       FROM reviews
       WHERE room_id = $1 AND is_visible = true
       ORDER BY created_at DESC
       LIMIT 10`,
      [room.id],
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

// ─── POST /api/rooms ─────────────────────────────────────────────────────────
// Creează o cameră nouă — doar admin
// TODO: requireAdmin middleware
router.post("/", async (req, res) => {
  try {
    const {
      slug,
      name,
      description,
      short_description,
      price,
      capacity = 2,
      amenities = [],
      sort_order = 0,
    } = req.body;

    // Validare câmpuri obligatorii
    if (!slug || !name || !price) {
      return res.status(400).json({
        success: false,
        error: "Câmpurile slug, name și price sunt obligatorii",
      });
    }

    const { rows } = await query(
      `INSERT INTO rooms (slug, name, description, short_description, price, capacity, amenities, sort_order)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [
        slug,
        name,
        description,
        short_description,
        price,
        capacity,
        amenities,
        sort_order,
      ],
    );

    console.log(`✅ Cameră creată: ${name} (${slug})`);
    res.status(201).json({ success: true, data: rows[0] });
  } catch (err) {
    // Slug duplicat → eroare uniqueness
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

// ─── PUT /api/rooms/:id ──────────────────────────────────────────────────────
// Actualizează o cameră — doar admin
router.put("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const {
      name,
      description,
      short_description,
      price,
      capacity,
      status,
      amenities,
      sort_order,
    } = req.body;

    const { rows } = await query(
      `UPDATE rooms SET
        name              = COALESCE($1, name),
        description       = COALESCE($2, description),
        short_description = COALESCE($3, short_description),
        price             = COALESCE($4, price),
        capacity          = COALESCE($5, capacity),
        status            = COALESCE($6, status),
        amenities         = COALESCE($7, amenities),
        sort_order        = COALESCE($8, sort_order),
        updated_at        = NOW()
       WHERE id = $9
       RETURNING *`,
      [
        name,
        description,
        short_description,
        price,
        capacity,
        status,
        amenities,
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

// ─── DELETE /api/rooms/:id ───────────────────────────────────────────────────
// Șterge o cameră (soft delete — setează status=inactive)
// Nu ștergem fizic — păstrăm istoricul rezervărilor
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

module.exports = router;
