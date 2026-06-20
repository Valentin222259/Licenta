require("dotenv").config();
const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { query } = require("../config/db");
const { sendWelcomeEmail } = require("../services/email");
const { OAuth2Client } = require("google-auth-library");
const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

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

// ─── POST /api/auth/google ───────────────────────────────────────────────────
router.post("/google", async (req, res) => {
  try {
    const { credential } = req.body;
    if (!credential) {
      return res
        .status(400)
        .json({ success: false, error: "Token Google lipsă" });
    }

    const ticket = await googleClient.verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    const { email, name, email_verified } = ticket.getPayload();

    if (!email_verified) {
      return res
        .status(401)
        .json({ success: false, error: "Email Google neverificat" });
    }

    let result = await query(
      "SELECT id, name, email, role FROM users WHERE email = $1",
      [email],
    );
    let user = result.rows[0];

    if (!user) {
      const inserted = await query(
        `INSERT INTO users (name, email, password, role)
         VALUES ($1, $2, NULL, 'client')
         RETURNING id, name, email, role`,
        [name, email],
      );
      user = inserted.rows[0];
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role, name: user.name },
      JWT_SECRET,
      { expiresIn: "7d" },
    );

    res.json({ success: true, token, user });
  } catch (err) {
    console.error("❌ POST /api/auth/google:", err.message);
    res
      .status(401)
      .json({ success: false, error: "Autentificare Google invalidă" });
  }
});

// ─── POST /api/auth/register ─────────────────────────────────────────────────
router.post("/register", async (req, res) => {
  try {
    // 1. AM ADĂUGAT 'lang' AICI:
    const { name, email, phone, password, lang } = req.body;

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
    // 2. AM ADĂUGAT 'lang' AICI:
    sendWelcomeEmail(user.email, user.name, lang).catch((err) =>
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

// ─── POST /api/auth/change-password ──────────────────────────────────────────
router.post("/change-password", async (req, res) => {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    return res.status(401).json({ success: false, error: "Token lipsă" });
  }

  try {
    const decoded = jwt.verify(header.split(" ")[1], JWT_SECRET);
    // 1. AM ADĂUGAT 'lang' AICI:
    const { current_password, new_password, lang } = req.body;

    if (!current_password || !new_password) {
      return res
        .status(400)
        .json({ success: false, error: "Câmpurile sunt obligatorii" });
    }

    // Validare complexitate parolă nouă
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
    if (!passwordRegex.test(new_password)) {
      return res.status(400).json({
        success: false,
        error:
          "Parola trebuie să aibă minim 8 caractere, o literă mare, o literă mică și o cifră",
      });
    }

    // Verificăm parola curentă
    const result = await query("SELECT password FROM users WHERE id = $1", [
      decoded.id,
    ]);
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: "User negăsit" });
    }

    const user = result.rows[0];
    let passwordOk = false;
    if (user.password?.endsWith("_hashed")) {
      passwordOk = current_password === user.password.replace("_hashed", "");
    } else {
      passwordOk = await bcrypt.compare(current_password, user.password);
    }

    if (!passwordOk) {
      return res
        .status(401)
        .json({ success: false, error: "Parola curentă este incorectă" });
    }

    // Salvăm parola nouă
    const hashedPassword = await bcrypt.hash(new_password, 12);
    await query(
      "UPDATE users SET password = $1, updated_at = NOW() WHERE id = $2",
      [hashedPassword, decoded.id],
    );

    // Email notificare schimbare parolă
    const userResult = await query(
      "SELECT name, email FROM users WHERE id = $1",
      [decoded.id],
    );
    if (userResult.rows.length > 0) {
      const { sendPasswordChangedEmail } = require("../services/email");
      // 2. AM ADĂUGAT 'lang' AICI:
      sendPasswordChangedEmail(
        userResult.rows[0].email,
        userResult.rows[0].name,
        lang,
      ).catch((err) =>
        console.error("⚠️ Email schimbare parolă eșuat:", err.message),
      );
    }

    console.log(`🔐 Parolă schimbată pentru user ${decoded.id}`);
    res.json({ success: true, message: "Parola a fost schimbată cu succes" });
  } catch {
    res.status(401).json({ success: false, error: "Token invalid" });
  }
});

// ─── DELETE /api/auth/account ────────────────────────────────────────────────
router.delete("/account", async (req, res) => {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    return res.status(401).json({ success: false, error: "Token lipsă" });
  }

  try {
    const decoded = jwt.verify(header.split(" ")[1], JWT_SECRET);
    // 1. AM ADĂUGAT 'lang' AICI:
    const { password, lang } = req.body;

    if (!password) {
      return res.status(400).json({
        success: false,
        error: "Parola este obligatorie pentru ștergerea contului",
      });
    }

    // Verificăm parola înainte de ștergere
    const result = await query("SELECT password FROM users WHERE id = $1", [
      decoded.id,
    ]);
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: "User negăsit" });
    }

    const user = result.rows[0];
    let passwordOk = false;
    if (user.password?.endsWith("_hashed")) {
      passwordOk = password === user.password.replace("_hashed", "");
    } else {
      passwordOk = await bcrypt.compare(password, user.password);
    }

    if (!passwordOk) {
      return res
        .status(401)
        .json({ success: false, error: "Parola este incorectă" });
    }

    // Ștergem contul (rezervările rămân în DB cu user_id = NULL)
    await query("UPDATE bookings SET user_id = NULL WHERE user_id = $1", [
      decoded.id,
    ]);
    await query("DELETE FROM users WHERE id = $1", [decoded.id]);

    // Email confirmare ștergere cont
    const { sendAccountDeletedEmail } = require("../services/email");
    // 2. AM ADĂUGAT 'lang' AICI:
    sendAccountDeletedEmail(decoded.email, decoded.name, lang).catch((err) =>
      console.error("⚠️ Email ștergere cont eșuat:", err.message),
    );

    console.log(`🗑️  Cont șters: ${decoded.email}`);
    res.json({ success: true, message: "Contul a fost șters" });
  } catch {
    res.status(401).json({ success: false, error: "Token invalid" });
  }
});

module.exports = router;
