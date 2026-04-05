require("dotenv").config();
const express = require("express");
const router = express.Router();
const { query } = require("../config/db");

// ─── Inițializare Azure OpenAI ────────────────────────────────────────────────
const AZURE_ENDPOINT = process.env.AZURE_OPENAI_ENDPOINT;
const AZURE_KEY = process.env.AZURE_OPENAI_KEY;
const AZURE_DEPLOYMENT = process.env.AZURE_OPENAI_DEPLOYMENT || "gpt-4o-2";
const AZURE_VERSION = process.env.AZURE_OPENAI_VERSION || "2024-02-15-preview";

let azureReady = false;
if (AZURE_ENDPOINT && AZURE_KEY) {
  azureReady = true;
  console.log(`✅ Azure OpenAI inițializat (deployment: ${AZURE_DEPLOYMENT})`);
} else {
  console.warn(
    "⚠️  AZURE_OPENAI_ENDPOINT sau AZURE_OPENAI_KEY lipsesc din .env",
  );
}

// ─── Helper: apel Azure OpenAI ───────────────────────────────────────────────
async function callAzure(messages, maxTokens = 1000) {
  if (!azureReady) throw new Error("Azure OpenAI nu este configurat");

  const url = `${AZURE_ENDPOINT}/openai/deployments/${AZURE_DEPLOYMENT}/chat/completions?api-version=${AZURE_VERSION}`;

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "api-key": AZURE_KEY,
    },
    body: JSON.stringify({
      messages,
      max_tokens: maxTokens,
      temperature: 0.4,
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Azure OpenAI error ${response.status}: ${err}`);
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content || "";
}

// ─── Helper: retry cu backoff ────────────────────────────────────────────────
async function callAzureWithRetry(messages, maxTokens = 1000, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await callAzure(messages, maxTokens);
    } catch (err) {
      const isRateLimit =
        err.message.includes("429") || err.message.includes("Too Many");
      if (isRateLimit && i < maxRetries - 1) {
        const delay = (i + 1) * 3000;
        console.warn(
          `⚠️  Rate limit Azure, retry ${i + 1}/${maxRetries} în ${delay / 1000}s...`,
        );
        await new Promise((r) => setTimeout(r, delay));
        continue;
      }
      throw err;
    }
  }
}

// ─── GET /api/ai/smart-pricing ────────────────────────────────────────────────
router.get("/smart-pricing", async (req, res) => {
  try {
    const statsResult = await query(`
      SELECT
        r.id, r.name,
        r.price AS current_price,
        r.capacity,
        COUNT(b.id) AS total_bookings,
        COUNT(CASE WHEN b.status = 'confirmed' THEN 1 END) AS confirmed_bookings,
        COUNT(CASE WHEN b.status = 'cancelled' THEN 1 END) AS cancelled_bookings,
        COUNT(CASE WHEN b.check_in >= NOW() AND b.status != 'cancelled' THEN 1 END) AS upcoming_bookings,
        COALESCE(SUM(CASE WHEN b.status = 'confirmed' THEN b.total_price END), 0) AS total_revenue,
        COALESCE(AVG(b.nights), 0) AS avg_nights
      FROM rooms r
      LEFT JOIN bookings b ON b.room_id = r.id
        AND b.created_at >= NOW() - INTERVAL '6 months'
      WHERE r.status = 'active'
      GROUP BY r.id, r.name, r.price, r.capacity
      ORDER BY r.sort_order
    `);

    const monthlyResult = await query(`
      SELECT
        TO_CHAR(DATE_TRUNC('month', check_in), 'Mon YYYY') AS month,
        COUNT(*) AS bookings,
        SUM(total_price) AS revenue,
        ROUND(AVG(nights)::numeric, 1) AS avg_nights
      FROM bookings
      WHERE status = 'confirmed'
        AND check_in >= NOW() - INTERVAL '6 months'
      GROUP BY DATE_TRUNC('month', check_in)
      ORDER BY DATE_TRUNC('month', check_in)
    `);

    const upcomingWeekends = await query(`
      SELECT check_in::date, COUNT(*) AS bookings
      FROM bookings
      WHERE check_in >= NOW()
        AND check_in <= NOW() + INTERVAL '60 days'
        AND status != 'cancelled'
        AND EXTRACT(DOW FROM check_in) IN (5, 6)
      GROUP BY check_in::date
      ORDER BY check_in LIMIT 10
    `);

    const roomStats = statsResult.rows;
    const monthlyStats = monthlyResult.rows;

    if (!azureReady) {
      return res.json({
        success: true,
        ai_powered: false,
        recommendations: generateStaticPricing(roomStats),
        monthly_stats: monthlyStats,
        room_stats: roomStats,
      });
    }

    const dataForAI = {
      rooms: roomStats.map((r) => ({
        name: r.name,
        current_price_ron: r.current_price,
        total_bookings_6mo: parseInt(r.total_bookings),
        confirmed: parseInt(r.confirmed_bookings),
        cancelled: parseInt(r.cancelled_bookings),
        upcoming: parseInt(r.upcoming_bookings),
        revenue_6mo_ron: parseInt(r.total_revenue),
        avg_stay_nights: parseFloat(r.avg_nights).toFixed(1),
      })),
      monthly_trend: monthlyStats,
      upcoming_busy_weekends: upcomingWeekends.rows.length,
      current_season: getCurrentSeason(),
    };

    const messages = [
      {
        role: "system",
        content:
          "Ești un consultant de revenue management pentru pensiuni boutique din România. Răspunzi DOAR cu JSON valid, fără markdown, fără backticks, fără explicații în afara JSON-ului.",
      },
      {
        role: "user",
        content: `Analizează datele de mai jos pentru Pensiunea Maramureș Belvedere și generează recomandări de prețuri.

DATE:
${JSON.stringify(dataForAI, null, 2)}

Returnează EXACT acest JSON (fără nimic altceva):
{
  "summary": "Rezumat scurt 2-3 propoziții",
  "overall_health": "good|warning|critical",
  "recommendations": [
    {
      "room_name": "numele camerei",
      "current_price": 250,
      "recommended_price": 280,
      "change_percent": 12,
      "direction": "up|down|stable",
      "reasoning": "Motivul în 1-2 propoziții",
      "urgency": "high|medium|low",
      "action": "Acțiunea specifică"
    }
  ],
  "seasonal_tips": ["sfat 1", "sfat 2", "sfat 3"],
  "weekend_premium": "recomandare weekend",
  "occupancy_insight": "insight ocupare"
}`,
      },
    ];

    const rawText = await callAzureWithRetry(messages, 1200);
    const cleanText = rawText.replace(/```json|```/g, "").trim();
    const aiAnalysis = JSON.parse(cleanText);

    console.log("✅ Smart Pricing generat cu Azure OpenAI");

    res.json({
      success: true,
      ai_powered: true,
      ...aiAnalysis,
      monthly_stats: monthlyStats,
      room_stats: roomStats,
      generated_at: new Date().toISOString(),
    });
  } catch (err) {
    console.error("❌ GET /api/ai/smart-pricing:", err.message);

    try {
      const fallback = await query(
        `SELECT r.id, r.name, r.price AS current_price, COUNT(b.id) AS total_bookings
         FROM rooms r LEFT JOIN bookings b ON b.room_id = r.id
         WHERE r.status = 'active' GROUP BY r.id, r.name, r.price`,
      );
      res.json({
        success: true,
        ai_powered: false,
        recommendations: generateStaticPricing(fallback.rows),
        error_fallback: "AI temporar indisponibil — analiză statică",
        generated_at: new Date().toISOString(),
      });
    } catch (dbErr) {
      res.status(500).json({ success: false, error: err.message });
    }
  }
});

// ─── POST /api/ai/sentiment ───────────────────────────────────────────────────
router.post("/sentiment", async (req, res) => {
  try {
    const reviewsResult = await query(`
      SELECT rv.id, rv.guest_name, rv.rating, rv.text, rv.created_at, r.name AS room_name
      FROM reviews rv
      LEFT JOIN rooms r ON r.id = rv.room_id
      WHERE rv.is_visible = true
        AND rv.text IS NOT NULL
        AND LENGTH(rv.text) > 10
      ORDER BY rv.created_at DESC
      LIMIT 50
    `);

    const reviews = reviewsResult.rows;

    if (reviews.length === 0) {
      return res.json({
        success: true,
        ai_powered: false,
        message: "Nu există recenzii de analizat",
        stats: { total: 0, positive: 0, negative: 0, neutral: 0 },
      });
    }

    const stats = {
      total: reviews.length,
      positive: reviews.filter((r) => r.rating >= 4).length,
      neutral: reviews.filter((r) => r.rating === 3).length,
      negative: reviews.filter((r) => r.rating <= 2).length,
      avg_rating: (
        reviews.reduce((s, r) => s + r.rating, 0) / reviews.length
      ).toFixed(1),
    };

    if (!azureReady) {
      return res.json({
        success: true,
        ai_powered: false,
        stats,
        reviews: reviews.slice(0, 10),
      });
    }

    const reviewTexts = reviews
      .map(
        (r) =>
          `[Rating: ${r.rating}/5, Camera: ${r.room_name || "N/A"}] ${r.text}`,
      )
      .join("\n\n");

    const messages = [
      {
        role: "system",
        content:
          "Ești un analist de customer experience pentru o pensiune boutique din România. Răspunzi DOAR cu JSON valid, fără markdown, fără backticks.",
      },
      {
        role: "user",
        content: `Analizează ${reviews.length} recenzii pentru Maramureș Belvedere.
Statistici: ${stats.positive} pozitive, ${stats.neutral} neutre, ${stats.negative} negative, medie ${stats.avg_rating}/5.

RECENZII:
${reviewTexts}

Returnează EXACT acest JSON:
{
  "overall_sentiment": "excellent|good|average|poor",
  "sentiment_score": 8.5,
  "executive_summary": "Rezumat 2-3 propoziții",
  "top_praised": [
    {"aspect": "aspect apreciat", "mentions": 12, "example_quote": "citat scurt"}
  ],
  "improvement_areas": [
    {"aspect": "de îmbunătățit", "mentions": 3, "suggestion": "sugestie concretă"}
  ],
  "alerts": [
    {"message": "alertă dacă există", "severity": "high|medium|low"}
  ],
  "monthly_trend": "improving|stable|declining",
  "response_recommendation": "Cum să răspundă proprietarul la recenzii"
}`,
      },
    ];

    const rawText = await callAzureWithRetry(messages, 1200);
    const cleanText = rawText.replace(/```json|```/g, "").trim();
    const aiAnalysis = JSON.parse(cleanText);

    console.log("✅ Sentiment Analysis generat cu Azure OpenAI");

    res.json({
      success: true,
      ai_powered: true,
      stats,
      ...aiAnalysis,
      recent_reviews: reviews.slice(0, 5),
      analyzed_at: new Date().toISOString(),
    });
  } catch (err) {
    console.error("❌ POST /api/ai/sentiment:", err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─── POST /api/ai/generate-description ───────────────────────────────────────
router.post("/generate-description", async (req, res) => {
  if (!azureReady) {
    return res
      .status(503)
      .json({ success: false, error: "Azure OpenAI nu este configurat" });
  }

  try {
    const { room_name, capacity, amenities, view, floor } = req.body;
    if (!room_name) {
      return res
        .status(400)
        .json({ success: false, error: "room_name este obligatoriu" });
    }

    const messages = [
      {
        role: "system",
        content:
          "Ești un copywriter pentru o pensiune boutique din Maramureș, România. Scrii descrieri calde, autentice, în română.",
      },
      {
        role: "user",
        content: `Scrie o descriere atractivă (max 120 cuvinte) pentru:
- Cameră: ${room_name}
- Capacitate: ${capacity || 2} persoane
- Dotări: ${amenities?.join(", ") || "pat matrimonial, baie privată, TV, Wi-Fi"}
- Vedere: ${view || "spre dealurile Maramureșului"}
- Etaj: ${floor || "1"}

Ton cald, montan, invitant. Returnează DOAR textul, fără titlu, fără ghilimele.`,
      },
    ];

    const description = await callAzureWithRetry(messages, 300);

    res.json({ success: true, description: description.trim() });
  } catch (err) {
    console.error("❌ POST /api/ai/generate-description:", err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─── Helpers ──────────────────────────────────────────────────────────────────
function getCurrentSeason() {
  const m = new Date().getMonth() + 1;
  if (m >= 12 || m <= 2) return "iarna (sezon inalt - schi, saniute)";
  if (m >= 3 && m <= 5) return "primavara (sezon mediu - drumetii)";
  if (m >= 6 && m <= 8) return "vara (sezon inalt - turism maxim)";
  return "toamna (sezon mediu - foliaj)";
}

function generateStaticPricing(rooms) {
  return rooms.map((room) => {
    const bookings = parseInt(room.total_bookings) || 0;
    const currentPrice = parseInt(room.current_price) || 250;
    let direction = "stable",
      change = 0;
    let reasoning = "Ocupare normală, prețul este optim.";

    if (bookings > 10) {
      direction = "up";
      change = 10;
      reasoning = "Cerere ridicată. Recomandăm creșterea prețului.";
    } else if (bookings < 3) {
      direction = "down";
      change = -8;
      reasoning = "Ocupare scăzută. O reducere poate stimula rezervările.";
    }

    return {
      room_name: room.name,
      current_price: currentPrice,
      recommended_price: Math.round(currentPrice * (1 + change / 100)),
      change_percent: change,
      direction,
      reasoning,
      urgency: bookings > 10 ? "high" : bookings < 3 ? "medium" : "low",
      action:
        direction === "up"
          ? "Crește prețul gradual"
          : direction === "down"
            ? "Rulează o promoție"
            : "Menține prețul actual",
    };
  });
}

module.exports = router;
