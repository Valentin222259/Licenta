const express = require("express");
const router = express.Router();
const multer = require("multer");
const {
  uploadToS3,
  deleteFromS3,
  ALLOWED_MIME_TYPES,
  MAX_FILE_SIZE,
} = require("../config/s3");
const { query } = require("../config/db");

// ─── Multer: memoryStorage (NU salvăm pe disc) ───────────────────────────────
// Buffer-ul merge direct în S3. Zero fișiere temporare.
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_SIZE },
  fileFilter: (req, file, cb) => {
    if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      return cb(new Error("Doar fișiere JPEG, PNG sau WebP sunt permise"));
    }
    cb(null, true);
  },
});

// ─── GET /api/images ─────────────────────────────────────────────────────────
// Returnează imaginile filtrate după categorie și/sau cameră
// Query params: ?category=room&room_id=uuid
router.get("/", async (req, res) => {
  try {
    const { category, room_id } = req.query;

    let conditions = [];
    let params = [];
    let paramIdx = 1;

    if (category) {
      conditions.push(`category = $${paramIdx++}`);
      params.push(category);
    }
    if (room_id) {
      conditions.push(`room_id = $${paramIdx++}`);
      params.push(room_id);
    }

    const whereClause =
      conditions.length > 0 ? "WHERE " + conditions.join(" AND ") : "";

    const { rows } = await query(
      `
      SELECT id, url, s3_key, category, room_id, caption, sort_order, is_primary, created_at
      FROM images
      ${whereClause}
      ORDER BY is_primary DESC, sort_order ASC, created_at ASC
    `,
      params,
    );

    res.json({ success: true, data: rows });
  } catch (err) {
    console.error("❌ GET /api/images:", err.message);
    res.status(500).json({ success: false, error: "Eroare server" });
  }
});

// ─── POST /api/images/room/:roomId ───────────────────────────────────────────
// Upload imagine pentru o cameră specifică → S3 → URL salvat în DB
router.post("/room/:roomId", upload.single("image"), async (req, res) => {
  try {
    const { roomId } = req.params;
    const { caption, is_primary = false } = req.body;

    if (!req.file) {
      return res
        .status(400)
        .json({ success: false, error: "Niciun fișier uploadat" });
    }

    // Verifică că camera există
    const roomCheck = await query(`SELECT id FROM rooms WHERE id = $1`, [
      roomId,
    ]);
    if (roomCheck.rows.length === 0) {
      return res
        .status(404)
        .json({ success: false, error: "Camera nu există" });
    }

    // Upload în S3 — folderul este rooms/roomId/
    const { url, key } = await uploadToS3(
      req.file.buffer,
      req.file.originalname,
      req.file.mimetype,
      `rooms/${roomId}`,
    );

    // Dacă e primară, resetăm celelalte imagini primare ale camerei
    if (is_primary === "true" || is_primary === true) {
      await query(
        `UPDATE images SET is_primary = false WHERE room_id = $1 AND category = 'room'`,
        [roomId],
      );
    }

    // Salvăm URL-ul în DB
    const { rows } = await query(
      `
      INSERT INTO images (url, s3_key, category, room_id, caption, is_primary)
      VALUES ($1, $2, 'room', $3, $4, $5)
      RETURNING *
    `,
      [
        url,
        key,
        roomId,
        caption || null,
        is_primary === "true" || is_primary === true,
      ],
    );

    console.log(`📸 Imagine cameră uploadată: ${key}`);
    res.status(201).json({ success: true, data: rows[0] });
  } catch (err) {
    console.error("❌ POST /api/images/room/:roomId:", err.message);
    // Verificăm dacă e eroare de configurare S3
    if (
      err.message?.includes("neconfigurat") ||
      err.message?.includes("credentials")
    ) {
      return res.status(503).json({
        success: false,
        error:
          "Serviciul S3 nu este configurat. Verifică variabilele AWS_* din .env",
      });
    }
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─── POST /api/images/hero ───────────────────────────────────────────────────
// Upload imagine hero (banner principal de pe homepage)
router.post("/hero", upload.single("image"), async (req, res) => {
  try {
    const { caption } = req.body;

    if (!req.file) {
      return res
        .status(400)
        .json({ success: false, error: "Niciun fișier uploadat" });
    }

    const { url, key } = await uploadToS3(
      req.file.buffer,
      req.file.originalname,
      req.file.mimetype,
      "hero",
    );

    const { rows } = await query(
      `
      INSERT INTO images (url, s3_key, category, caption)
      VALUES ($1, $2, 'hero', $3)
      RETURNING *
    `,
      [url, key, caption || null],
    );

    console.log(`🖼️  Imagine hero uploadată: ${key}`);
    res.status(201).json({ success: true, data: rows[0] });
  } catch (err) {
    console.error("❌ POST /api/images/hero:", err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─── POST /api/images/facility ───────────────────────────────────────────────
// Upload imagine facilitate (jacuzzi, biciclete, etc.)
router.post("/facility", upload.single("image"), async (req, res) => {
  try {
    const { caption } = req.body;

    if (!req.file) {
      return res
        .status(400)
        .json({ success: false, error: "Niciun fișier uploadat" });
    }

    const { url, key } = await uploadToS3(
      req.file.buffer,
      req.file.originalname,
      req.file.mimetype,
      "facilities",
    );

    const { rows } = await query(
      `
      INSERT INTO images (url, s3_key, category, caption)
      VALUES ($1, $2, 'facility', $3)
      RETURNING *
    `,
      [url, key, caption || null],
    );

    res.status(201).json({ success: true, data: rows[0] });
  } catch (err) {
    console.error("❌ POST /api/images/facility:", err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post("/about", upload.single("image"), async (req, res) => {
  try {
    const { caption } = req.body;

    if (!req.file) {
      return res
        .status(400)
        .json({ success: false, error: "Niciun fișier uploadat" });
    }

    const { url, key } = await uploadToS3(
      req.file.buffer,
      req.file.originalname,
      req.file.mimetype,
      "about",
    );

    const { rows } = await query(
      `
      INSERT INTO images (url, s3_key, category, caption)
      VALUES ($1, $2, 'about', $3)
      RETURNING *
    `,
      [url, key, caption || null],
    );

    console.log(`🖼️  Imagine despre-noi uploadată: ${key}`);
    res.status(201).json({ success: true, data: rows[0] });
  } catch (err) {
    console.error("❌ POST /api/images/about:", err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─── PATCH /api/images/:id/primary ──────────────────────────────────────────
// Setează o imagine ca primară pentru camera ei
router.patch("/:id/primary", async (req, res) => {
  try {
    const { id } = req.params;

    // Găsim imaginea ca să știm room_id-ul ei
    const imageResult = await query(
      `SELECT id, room_id, category FROM images WHERE id = $1`,
      [id],
    );

    if (imageResult.rows.length === 0) {
      return res
        .status(404)
        .json({ success: false, error: "Imaginea nu există" });
    }

    const image = imageResult.rows[0];

    if (image.category !== "room" || !image.room_id) {
      return res.status(400).json({
        success: false,
        error: "Doar imaginile de tip 'room' pot fi setate ca primare",
      });
    }

    // Resetăm toate imaginile primare din camera respectivă
    await query(`UPDATE images SET is_primary = false WHERE room_id = $1`, [
      image.room_id,
    ]);

    // Setăm noua imagine primară
    const { rows } = await query(
      `UPDATE images SET is_primary = true WHERE id = $1 RETURNING *`,
      [id],
    );

    res.json({ success: true, data: rows[0] });
  } catch (err) {
    console.error("❌ PATCH /api/images/:id/primary:", err.message);
    res.status(500).json({ success: false, error: "Eroare server" });
  }
});

// ─── DELETE /api/images/:id ──────────────────────────────────────────────────
// Șterge imaginea din S3 ȘI din DB
router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    // Găsim cheia S3 înainte de ștergere
    const imageResult = await query(
      `SELECT id, s3_key, url FROM images WHERE id = $1`,
      [id],
    );

    if (imageResult.rows.length === 0) {
      return res
        .status(404)
        .json({ success: false, error: "Imaginea nu există" });
    }

    const { s3_key } = imageResult.rows[0];

    // Ștergem din S3 (dacă avem cheia)
    if (s3_key) {
      try {
        await deleteFromS3(s3_key);
        console.log(`🗑️  Imagine ștearsă din S3: ${s3_key}`);
      } catch (s3Err) {
        // Log warning dar continuăm cu ștergerea din DB
        console.warn(
          `⚠️  Nu s-a putut șterge din S3 (${s3_key}):`,
          s3Err.message,
        );
      }
    }

    // Ștergem din DB
    await query(`DELETE FROM images WHERE id = $1`, [id]);

    res.json({ success: true, message: "Imaginea a fost ștearsă" });
  } catch (err) {
    console.error("❌ DELETE /api/images/:id:", err.message);
    res.status(500).json({ success: false, error: "Eroare server" });
  }
});

module.exports = router;
