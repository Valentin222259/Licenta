require("dotenv").config();
const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { query } = require("../config/db");
const { sendWelcomeEmail } = require("../services/email");

const JWT_SECRET =
  process.env.JWT_SECRET || "belvedere-jwt-secret-2025-upt-licenta";

// ─── POST /api/auth/login ────────────────────────────────────────────────────
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: "Email și parola sunt obligatorii",
      });
    }

    const result = await query(
      "SELECT id, name, email, password, role FROM users WHERE email = $1",
      [email],
    );

    if (result.rows.length === 0) {
      return res.status(401).json({
        success: false,
        error: "Email sau parolă incorectă",
      });
    }

    const user = result.rows[0];

    let passwordOk = false;
    if (user.password?.endsWith("_hashed")) {
      passwordOk = password === user.password.replace("_hashed", "");
    } else {
      passwordOk = await bcrypt.compare(password, user.password);
    }

    if (!passwordOk) {
      return res.status(401).json({
        success: false,
        error: "Email sau parolă incorectă",
      });
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role, name: user.name },
      JWT_SECRET,
      { expiresIn: "7d" },
    );

    res.json({
      success: true,
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (err) {
    console.error("❌ POST /api/auth/login:", err.message);
    res.status(500).json({ success: false, error: "Eroare server" });
  }
});

// ─── POST /api/auth/register ─────────────────────────────────────────────────
router.post("/register", async (req, res) => {
  try {
    const { name, email, phone, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        error: "Numele, emailul și parola sunt obligatorii",
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        error: "Parola trebuie să aibă cel puțin 6 caractere",
      });
    }

    const existing = await query("SELECT id FROM users WHERE email = $1", [
      email,
    ]);
    if (existing.rows.length > 0) {
      return res.status(409).json({
        success: false,
        error: "Există deja un cont cu acest email",
      });
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const { rows } = await query(
      `INSERT INTO users (name, email, phone, password, role)
       VALUES ($1, $2, $3, $4, 'client')
       RETURNING id, name, email, role`,
      [name, email, phone || null, hashedPassword],
    );

    const user = rows[0];

    // ── Email bun venit (non-blocking) ────────────────────────────────────
    // Trimitem DUPĂ ce răspunsul e pregătit — contul e creat indiferent de email
    sendWelcomeEmail(user.email, user.name).catch((err) =>
      console.error(
        "⚠️  Welcome email eșuat (contul e creat OK):",
        err.message,
      ),
    );

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role, name: user.name },
      JWT_SECRET,
      { expiresIn: "7d" },
    );

    res.status(201).json({
      success: true,
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (err) {
    console.error("❌ POST /api/auth/register:", err.message);
    res.status(500).json({ success: false, error: "Eroare server" });
  }
});

// ─── GET /api/auth/me ─────────────────────────────────────────────────────────
router.get("/me", async (req, res) => {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    return res.status(401).json({ success: false, error: "Token lipsă" });
  }

  try {
    const decoded = jwt.verify(header.split(" ")[1], JWT_SECRET);
    const result = await query(
      "SELECT id, name, email, phone, role, created_at FROM users WHERE id = $1",
      [decoded.id],
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: "User negăsit" });
    }

    res.json({ success: true, user: result.rows[0] });
  } catch {
    res.status(401).json({ success: false, error: "Token invalid" });
  }
});

module.exports = router;
