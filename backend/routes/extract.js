require("dotenv").config();
const express = require("express");
const router = express.Router();
const multer = require("multer");
const fs = require("fs");
const path = require("path");
const { GoogleGenerativeAI } = require("@google/generative-ai");

// ─── Configurare Gemini ──────────────────────────────────────────────────────
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

// ─── Multer: salvare TEMPORARĂ pe disc (șterge după Gemini) ─────────────────
// IMPORTANT: Aceasta e singura rută care folosește disc.
// Pozele de cameră merg direct în S3 (routes/images.js, memoryStorage).
const uploadsDir = path.join(__dirname, "../uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => {
    const uniqueName = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, uniqueName + path.extname(file.originalname));
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
  fileFilter: (req, file, cb) => {
    const allowed = ["image/jpeg", "image/png", "image/webp"];
    if (!allowed.includes(file.mimetype)) {
      return cb(new Error("Doar fișiere JPEG, PNG sau WebP sunt permise"));
    }
    cb(null, true);
  },
});

// ─── Helper: pauză pentru retry ─────────────────────────────────────────────
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// ─── Helper: convertește fișier local în format Gemini ──────────────────────
function fileToGenerativePart(filePath, mimeType) {
  return {
    inlineData: {
      data: Buffer.from(fs.readFileSync(filePath)).toString("base64"),
      mimeType,
    },
  };
}

// ─── Helper: apel Gemini cu retry la 429 ────────────────────────────────────
async function generateContentWithRetry(prompt, imagePart, maxRetries = 3) {
  let lastError;

  for (let i = 0; i < maxRetries; i++) {
    try {
      const result = await model.generateContent([prompt, imagePart]);
      return await result.response;
    } catch (error) {
      lastError = error;
      if (error.message?.includes("429") || error.status === 429) {
        const delay = (i + 1) * 3000; // 3s, 6s, 9s
        console.warn(
          `⚠️  Rate limit Gemini. Retry ${i + 1}/${maxRetries} în ${delay / 1000}s...`,
        );
        await wait(delay);
        continue;
      }
      throw error; // alte erori — aruncă imediat
    }
  }
  throw lastError;
}

// ─── POST /api/extract ───────────────────────────────────────────────────────
// Primește: form-data cu câmpul "file" (imagine buletin)
// Returnează: JSON cu datele extrase din cartea de identitate
router.post("/", upload.single("file"), async (req, res) => {
  let tempFilePath = null;

  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: "Nu a fost încărcat niciun fișier",
      });
    }

    tempFilePath = req.file.path;
    console.log(`📷 Procesare Gemini AI: ${req.file.originalname}`);

    const imagePart = fileToGenerativePart(tempFilePath, req.file.mimetype);

    const prompt = `
      Extract information from this Romanian Identity Card (Carte de Identitate).
      Return ONLY a valid JSON object with these exact keys:
      cnp, nume, prenume, cetatenie, locul_nasterii, domiciliu, data_nasterii,
      sex, emis_de, data_emiterii, data_expirarii, serie, numar.
      If a field is not visible or clear, use an empty string "".
      Respond ONLY with the JSON object, no other text.
    `;

    const response = await generateContentWithRetry(prompt, imagePart);
    let text = response.text();

    // Curățare markdown dacă Gemini adaugă ```json ... ```
    text = text.replace(/```json|```/g, "").trim();

    const extractedData = JSON.parse(text);

    console.log("✅ Extracție Gemini reușită");
    res.json({ success: true, data: extractedData });
  } catch (error) {
    console.error("❌ Eroare extracție:", error.message);
    res.status(500).json({
      success: false,
      error: error.message?.includes("429")
        ? "Serverul este ocupat (limită API). Încearcă peste un minut."
        : "Eroare la procesarea AI: " + error.message,
    });
  } finally {
    // ❗ ÎNTOTDEAUNA ștergem fișierul temporar, indiferent de rezultat
    if (tempFilePath && fs.existsSync(tempFilePath)) {
      fs.unlinkSync(tempFilePath);
      console.log("🗑️  Fișier temporar șters:", path.basename(tempFilePath));
    }
  }
});

module.exports = router;
