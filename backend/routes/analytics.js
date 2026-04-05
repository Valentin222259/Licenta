/**
 * analytics.js — Router Express pentru modulul de analiză AI
 *
 * Arhitectură:
 *  - Datele sunt extrase din PostgreSQL (sau mock în development)
 *  - Se construiește un prompt structurat pentru LLM (Azure OpenAI)
 *  - Răspunsul LLM este parseuit și returnat frontend-ului ca JSON curat
 *
 * Endpoint-uri expuse:
 *  POST /api/analytics/sentiment      — analiză sentiment recenzii
 *  GET  /api/analytics/smart-pricing  — recomandare preț bazată pe ocupare
 */

require("dotenv").config();
const express = require("express");
const router = express.Router();
const { query } = require("../config/db");

// ─── Configurare Azure OpenAI ─────────────────────────────────────────────────
const AZURE_ENDPOINT = process.env.AZURE_OPENAI_ENDPOINT;
const AZURE_KEY = process.env.AZURE_OPENAI_KEY;
const AZURE_DEPLOYMENT = process.env.AZURE_OPENAI_DEPLOYMENT || "gpt-4o-2";
const AZURE_VERSION = process.env.AZURE_OPENAI_VERSION || "2024-02-15-preview";

const azureReady = !!(AZURE_ENDPOINT && AZURE_KEY);

/**
 * callAzureOpenAI — Trimite un prompt la Azure OpenAI și returnează textul răspuns
 * @param {Array} messages  — Array de mesaje în format OpenAI Chat
 * @param {number} maxTokens — Limita de tokeni pentru răspuns
 * @returns {Promise<string>}
 */
async function callAzureOpenAI(messages, maxTokens = 800) {
  if (!azureReady) throw new Error("Azure OpenAI nu este configurat în .env");

  const url = `${AZURE_ENDPOINT}/openai/deployments/${AZURE_DEPLOYMENT}/chat/completions?api-version=${AZURE_VERSION}`;

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", "api-key": AZURE_KEY },
    body: JSON.stringify({ messages, max_tokens: maxTokens, temperature: 0.3 }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Azure OpenAI ${response.status}: ${errText}`);
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content || "";
}

// ─── DATE MOCK ────────────────────────────────────────────────────────────────
// În producție, aceste date vin din PostgreSQL via query()
// Structura este identică — mock-ul facilitează testarea fără DB populat

/**
 * Mock: recenzii oaspeți
 * În producție: SELECT rating, text, created_at FROM reviews WHERE is_visible = true
 */
const MOCK_REVIEWS = [
  {
    id: 1,
    guest_name: "Maria P.",
    rating: 5,
    text: "Priveliște superbă, personal foarte amabil, mic dejun excelent!",
    created_at: "2026-03-10",
  },
  {
    id: 2,
    guest_name: "Ion D.",
    rating: 4,
    text: "Cameră curată și confortabilă, Wi-Fi puțin slab dar altfel perfect.",
    created_at: "2026-03-15",
  },
  {
    id: 3,
    guest_name: "Elena M.",
    rating: 5,
    text: "Liniște totală, natură, mâncare tradițională delicioasă. Revin!",
    created_at: "2026-03-20",
  },
  {
    id: 4,
    guest_name: "Andrei S.",
    rating: 3,
    text: "Ok în general, dar Wi-Fi-ul nu funcționa bine și patul era dur.",
    created_at: "2026-03-25",
  },
  {
    id: 5,
    guest_name: "Cristina B.",
    rating: 5,
    text: "Cel mai frumos loc din Maramureș. Personalul a fost excepțional.",
    created_at: "2026-04-01",
  },
  {
    id: 6,
    guest_name: "Vlad T.",
    rating: 4,
    text: "Atmosferă autentică, prețuri corecte. Wi-Fi de îmbunătățit.",
    created_at: "2026-04-02",
  },
  {
    id: 7,
    guest_name: "Ana R.",
    rating: 2,
    text: "Camera era rece dimineața, încălzirea nu funcționa corect.",
    created_at: "2026-04-03",
  },
  {
    id: 8,
    guest_name: "Mihai G.",
    rating: 5,
    text: "Experiență de neuitat. Priveliștea din balcon este spectaculoasă.",
    created_at: "2026-04-04",
  },
];

/**
 * Mock: rata de ocupare pe următoarele 14 zile (per cameră)
 * În producție: calculat din bookings cu check_in/check_out în intervalul dorit
 */
const MOCK_OCCUPANCY = [
  { date: "2026-04-06", occupancy_rate: 45, bookings: 2, revenue: 500 },
  { date: "2026-04-07", occupancy_rate: 60, bookings: 3, revenue: 750 },
  { date: "2026-04-08", occupancy_rate: 80, bookings: 4, revenue: 1000 },
  { date: "2026-04-09", occupancy_rate: 95, bookings: 5, revenue: 1250 }, // weekend
  { date: "2026-04-10", occupancy_rate: 90, bookings: 5, revenue: 1250 }, // weekend
  { date: "2026-04-11", occupancy_rate: 55, bookings: 3, revenue: 750 },
  { date: "2026-04-12", occupancy_rate: 50, bookings: 2, revenue: 500 },
  { date: "2026-04-13", occupancy_rate: 70, bookings: 4, revenue: 1000 },
  { date: "2026-04-14", occupancy_rate: 85, bookings: 4, revenue: 1000 },
  { date: "2026-04-15", occupancy_rate: 100, bookings: 5, revenue: 1250 }, // Paște
  { date: "2026-04-16", occupancy_rate: 100, bookings: 5, revenue: 1250 }, // Paște
  { date: "2026-04-17", occupancy_rate: 95, bookings: 5, revenue: 1250 }, // Paște
  { date: "2026-04-18", occupancy_rate: 75, bookings: 4, revenue: 1000 },
  { date: "2026-04-19", occupancy_rate: 65, bookings: 3, revenue: 750 },
];

// ─── ENDPOINT 1: POST /api/analytics/sentiment ───────────────────────────────
/**
 * Analizează recenziile oaspeților cu ajutorul LLM-ului.
 *
 * Flux:
 *  1. Extrage recenziile din DB (sau mock)
 *  2. Calculează statistici simple (distribuție rating)
 *  3. Construiește prompt structurat pentru Azure OpenAI
 *  4. Parsează răspunsul JSON al LLM-ului
 *  5. Returnează agregatul către frontend
 */
router.post("/sentiment", async (req, res) => {
  try {
    // ── Pasul 1: Date din DB (cu fallback la mock) ──────────────────────────
    let reviews;
    try {
      const result = await query(
        `SELECT id, guest_name, rating, text, created_at
         FROM reviews
         WHERE is_visible = true AND text IS NOT NULL AND LENGTH(text) > 10
         ORDER BY created_at DESC LIMIT 50`,
      );
      reviews = result.rows.length > 0 ? result.rows : MOCK_REVIEWS;
    } catch {
      reviews = MOCK_REVIEWS; // fallback dacă tabelul nu există încă
    }

    // ── Pasul 2: Statistici simple (nu necesită AI) ─────────────────────────
    const distribution = {
      positive: reviews.filter((r) => r.rating >= 4).length,
      neutral: reviews.filter((r) => r.rating === 3).length,
      negative: reviews.filter((r) => r.rating <= 2).length,
    };
    const avgRating = (
      reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
    ).toFixed(1);

    // ── Pasul 3: Construire prompt pentru LLM ──────────────────────────────
    // Trimitem textele recenziilor și cerem un JSON structurat
    const reviewTexts = reviews
      .map((r) => `[${r.rating}/5] ${r.text}`)
      .join("\n");

    const prompt = `
Ești un analist de customer experience pentru o pensiune boutique din Maramureș, România.
Analizează următoarele ${reviews.length} recenzii și returnează DOAR un obiect JSON valid.

RECENZII:
${reviewTexts}

Returnează EXACT acest format JSON (fără markdown, fără explicații):
{
  "overall_sentiment": "Excelent|Bun|Mediu|Slab",
  "confidence": 0.95,
  "top_strengths": ["punct forte 1", "punct forte 2", "punct forte 3"],
  "improvement_areas": ["îmbunătățire 1", "îmbunătățire 2"],
  "summary": "Rezumat executiv în 2 propoziții",
  "trend": "în creștere|stabil|în scădere"
}`;

    // ── Pasul 4: Apel Azure OpenAI ─────────────────────────────────────────
    // TODO (producție): înlocuiește mock-ul de mai jos cu apelul real
    let aiInsights;

    if (azureReady) {
      // ✅ Apel real la Azure OpenAI
      const rawText = await callAzureOpenAI([
        {
          role: "system",
          content: "Răspunzi DOAR cu JSON valid, fără markdown.",
        },
        { role: "user", content: prompt },
      ]);
      aiInsights = JSON.parse(rawText.replace(/```json|```/g, "").trim());
    } else {
      // 🔧 Mock response — folosit când Azure nu e disponibil
      aiInsights = {
        overall_sentiment: "Bun",
        confidence: 0.88,
        top_strengths: [
          "Priveliște montană",
          "Personal amabil",
          "Mic dejun tradițional",
        ],
        improvement_areas: ["Viteză Wi-Fi", "Sistem încălzire"],
        summary:
          "Oaspeții apreciază în mod deosebit cadrul natural și ospitalitatea. Wi-Fi-ul și încălzirea sunt menționate ca puncte de îmbunătățit.",
        trend: "stabil",
      };
    }

    // ── Pasul 5: Răspuns structurat către frontend ──────────────────────────
    res.json({
      success: true,
      ai_powered: azureReady,
      data: {
        distribution, // { positive: 6, neutral: 1, negative: 1 }
        avg_rating: avgRating, // "4.4"
        total_reviews: reviews.length,
        ...aiInsights, // câmpurile generate de AI
        recent_reviews: reviews.slice(0, 5),
      },
    });
  } catch (err) {
    console.error("❌ POST /api/analytics/sentiment:", err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─── ENDPOINT 2: GET /api/analytics/smart-pricing ────────────────────────────
/**
 * Generează recomandări de prețuri bazate pe gradul de ocupare.
 *
 * Flux:
 *  1. Extrage rata de ocupare din DB (sau mock)
 *  2. Calculează statistici agregat (medie, peak, trend)
 *  3. Construiește prompt pentru LLM cu contextul de business
 *  4. LLM returnează factor de ajustare + motivație
 *  5. Returnează recomandarea cu date pentru grafic
 */
router.get("/smart-pricing", async (req, res) => {
  try {
    // ── Pasul 1: Date ocupare din DB (cu fallback la mock) ──────────────────
    let occupancyData;
    try {
      const result = await query(`
        SELECT
          check_in::date AS date,
          COUNT(*) AS bookings,
          ROUND(COUNT(*) * 100.0 / (SELECT COUNT(*) FROM rooms WHERE status = 'active'), 0) AS occupancy_rate,
          SUM(total_price) AS revenue
        FROM bookings
        WHERE status != 'cancelled'
          AND check_in >= CURRENT_DATE
          AND check_in <= CURRENT_DATE + INTERVAL '14 days'
        GROUP BY check_in::date
        ORDER BY date
      `);
      occupancyData = result.rows.length >= 3 ? result.rows : MOCK_OCCUPANCY;
    } catch {
      occupancyData = MOCK_OCCUPANCY;
    }

    // ── Pasul 2: Statistici agregate ────────────────────────────────────────
    const avgOccupancy = Math.round(
      occupancyData.reduce((s, d) => s + parseInt(d.occupancy_rate), 0) /
        occupancyData.length,
    );
    const peakOccupancy = Math.max(
      ...occupancyData.map((d) => parseInt(d.occupancy_rate)),
    );
    const highDemandDays = occupancyData.filter(
      (d) => parseInt(d.occupancy_rate) >= 80,
    ).length;

    // ── Pasul 3: Prompt pentru LLM ──────────────────────────────────────────
    const prompt = `
Ești un consultant de revenue management pentru o pensiune boutique din România (5 camere, preț mediu 250 RON/noapte).

Date ocupare pentru următoarele 14 zile:
- Ocupare medie: ${avgOccupancy}%
- Ocupare maximă: ${peakOccupancy}%
- Zile cu cerere mare (>80%): ${highDemandDays} din ${occupancyData.length}
- Sezon curent: ${getCurrentSeason()}

Returnează DOAR un obiect JSON valid (fără markdown):
{
  "price_factor": 1.12,
  "recommended_price": 280,
  "urgency": "high|medium|low",
  "reasoning": "Motivul în 1-2 propoziții",
  "strategy": "Numele strategiei (ex: Peak Season Premium)",
  "apply_from": "imediat|weekend|săptămâna viitoare",
  "tips": ["sfat 1", "sfat 2"]
}`;

    // ── Pasul 4: Apel Azure OpenAI ─────────────────────────────────────────
    let aiRecommendation;

    if (azureReady) {
      // ✅ Apel real la Azure OpenAI
      const rawText = await callAzureOpenAI([
        {
          role: "system",
          content:
            "Ești expert în revenue management hotelier. Răspunzi DOAR cu JSON valid.",
        },
        { role: "user", content: prompt },
      ]);
      aiRecommendation = JSON.parse(rawText.replace(/```json|```/g, "").trim());
    } else {
      // 🔧 Mock response
      aiRecommendation = {
        price_factor: 1.15,
        recommended_price: 288,
        urgency: "high",
        reasoning:
          "Cerere foarte mare în perioada Paștelui (15-17 aprilie). Ocupare 95-100% justifică o creștere de preț.",
        strategy: "Holiday Peak Pricing",
        apply_from: "imediat",
        tips: [
          "Activează tarif special pentru weekend-uri",
          "Oferă pachete 3 nopți cu reducere 10%",
        ],
      };
    }

    // ── Pasul 5: Răspuns către frontend ─────────────────────────────────────
    res.json({
      success: true,
      ai_powered: azureReady,
      data: {
        occupancy_chart: occupancyData, // date pentru graficul Recharts
        stats: { avgOccupancy, peakOccupancy, highDemandDays },
        recommendation: aiRecommendation, // recomandarea AI
        current_price: 250, // prețul de bază din DB
      },
    });
  } catch (err) {
    console.error("❌ GET /api/analytics/smart-pricing:", err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─── Helper: sezon curent ─────────────────────────────────────────────────────
function getCurrentSeason() {
  const m = new Date().getMonth() + 1;
  if (m >= 12 || m <= 2) return "Iarnă (sezon înalt)";
  if (m >= 3 && m <= 5) return "Primăvară (sezon mediu)";
  if (m >= 6 && m <= 8) return "Vară (sezon înalt)";
  return "Toamnă (sezon mediu)";
}

module.exports = router;
