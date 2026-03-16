// ─────────────────────────────────────────────────────────────────────────────
//  server.js — Pensiunea Maramureș Belvedere
//  Extins din actomat-node-backend (păstrăm logica Gemini originală)
//  Adăugat: PostgreSQL (RDS), Amazon S3, rute camere și rezervări
// ─────────────────────────────────────────────────────────────────────────────

require("dotenv").config();
const express = require("express");
const cors = require("cors");

// ─── Configurări ─────────────────────────────────────────────────────────────
const { testConnection } = require("./config/db");
const { checkS3Config } = require("./config/s3");

// ─── Rute ────────────────────────────────────────────────────────────────────
const extractRouter = require("./routes/extract");
const roomsRouter = require("./routes/rooms");
const bookingsRouter = require("./routes/bookings");
const imagesRouter = require("./routes/images");

const app = express();

// ─── CORS ────────────────────────────────────────────────────────────────────
// Citim originile permise din .env (separate cu virgulă)
// Ex: FRONTEND_URL=http://localhost:5173,https://main.d1234.amplifyapp.com
const allowedOrigins = (process.env.FRONTEND_URL || "http://localhost:5173")
  .split(",")
  .map((o) => o.trim())
  .filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      // Permite requests fără origin (ex: Postman, curl, server-to-server)
      if (!origin) return callback(null, true);

      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      console.warn(`CORS blocat pentru origin: ${origin}`);
      callback(new Error(`Origin ${origin} nu este permis de CORS`));
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  }),
);

// ─── Middleware global ───────────────────────────────────────────────────────
app.use(express.json({ limit: "5mb" }));
app.use(express.urlencoded({ extended: true, limit: "5mb" }));

// ─── Logging simplu (development) ───────────────────────────────────────────
if (process.env.NODE_ENV !== "production") {
  app.use((req, res, next) => {
    console.log(`${req.method} ${req.path}`);
    next();
  });
}

// ─────────────────────────────────────────────────────────────────────────────
//  RUTE
// ─────────────────────────────────────────────────────────────────────────────

// ── Health check ─────────────────────────────────────────────────────────────
// Elastic Beanstalk face health check pe /health (sau /)
app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    service: "belvedere-backend",
    timestamp: new Date().toISOString(),
    env: process.env.NODE_ENV || "development",
  });
});

// Rută rădăcină — utilă și pentru EB health check dacă e configurat pe /
app.get("/", (req, res) => {
  res.json({ message: "Belvedere API functioneaza" });
});

// ── API routes ────────────────────────────────────────────────────────────────
// /api/extract  — scanare buletin cu Gemini AI (logica originală din actomat)
app.use("/api/extract", extractRouter);

// /api/rooms    — CRUD camere (PostgreSQL)
app.use("/api/rooms", roomsRouter);

// /api/bookings — CRUD rezervări cu validare disponibilitate (PostgreSQL)
app.use("/api/bookings", bookingsRouter);

// /api/images   — upload/delete imagini (S3 + PostgreSQL pentru URL-uri)
app.use("/api/images", imagesRouter);

// ─────────────────────────────────────────────────────────────────────────────
//  GESTIONARE ERORI
// ─────────────────────────────────────────────────────────────────────────────

// 404 — rută inexistentă
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: `Ruta ${req.method} ${req.path} nu exista`,
  });
});

// Handler global de erori
app.use((err, req, res, next) => {
  console.error("Eroare neasteptata:", err.message);

  if (err.message?.includes("CORS")) {
    return res.status(403).json({ success: false, error: err.message });
  }

  if (err.code === "LIMIT_FILE_SIZE") {
    return res.status(413).json({
      success: false,
      error: "Fisierul depaseste limita de 10 MB",
    });
  }

  if (err.message?.includes("JPEG") || err.message?.includes("PNG")) {
    return res.status(415).json({ success: false, error: err.message });
  }

  res.status(500).json({
    success: false,
    error:
      process.env.NODE_ENV === "production"
        ? "Eroare interna server"
        : err.message,
  });
});

// ─────────────────────────────────────────────────────────────────────────────
//  PORNIRE SERVER
// ─────────────────────────────────────────────────────────────────────────────

const PORT = process.env.PORT || 3001;

async function startServer() {
  console.log("\nPensiunea Maramures Belvedere - Backend\n");
  console.log(`   Mediu:   ${process.env.NODE_ENV || "development"}`);
  console.log(`   Port:    ${PORT}`);
  console.log(`   CORS:    ${allowedOrigins.join(", ")}\n`);

  await testConnection();
  checkS3Config();

  app.listen(PORT, () => {
    console.log(`\nServer pornit pe http://localhost:${PORT}`);
    console.log(`Health: http://localhost:${PORT}/health\n`);
  });
}

startServer();
