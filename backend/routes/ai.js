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

// ─── POST /api/ai/chat ────────────────────────────────────────────────────────
/**
 * Endpoint principal pentru chatbot-ul pensiunii Belvedere.
 *
 * Flux de date:
 *  1. Frontend trimite { messages: [...], isAdmin: bool, lang: "ro"|"en" }
 *  2. Backend încarcă context live din DB (camere, prețuri, disponibilitate)
 *  3. Se construiește systemPrompt cu datele pensiunii + context DB
 *  4. Se apelează Azure OpenAI cu istoricul complet al conversației
 *  5. Se detectează intenția și se atașează quick_actions relevante
 *  6. Se returnează { reply, quick_actions } către frontend
 *
 * Managementul stării conversației:
 *  - Istoricul (messages[]) este păstrat în state-ul React (frontend)
 *  - La fiecare mesaj nou, frontend-ul trimite ÎNTREGUL istoric
 *  - Backend-ul este STATELESS — nu salvează conversații în DB
 *  - Avantaj: simplitate; Dezavantaj: conversații se pierd la refresh
 */
router.post("/chat", async (req, res) => {
  try {
    const {
      messages = [], // istoricul conversației de la frontend
      isAdmin = false, // mod admin — răspunsuri cu date din DB
      lang = "ro", // limba detectată de frontend
    } = req.body;

    // ── Pasul 1: Validare input ────────────────────────────────────────────
    if (!Array.isArray(messages) || messages.length === 0) {
      return res
        .status(400)
        .json({ success: false, error: "messages[] este obligatoriu" });
    }

    // Limităm istoricul la ultimele 20 mesaje pentru a controla costul de tokeni
    const recentHistory = messages.slice(-20);

    // ── Pasul 2: Context live din DB ──────────────────────────────────────
    // Încărcăm datele actuale pentru ca AI-ul să răspundă cu informații reale
    let dbContext = "";
    try {
      // Camere active cu prețuri
      const roomsResult = await query(
        `SELECT name, price, capacity, description FROM rooms WHERE status = 'active' ORDER BY sort_order`,
      );

      // Disponibilitate generală (camere ocupate azi)
      const occupiedResult = await query(
        `SELECT COUNT(*) AS occupied FROM bookings
         WHERE status NOT IN ('cancelled')
           AND check_in <= CURRENT_DATE AND check_out > CURRENT_DATE`,
      );

      const totalRooms = roomsResult.rows.length;
      const occupiedRooms = parseInt(occupiedResult.rows[0]?.occupied || 0);
      const freeRooms = totalRooms - occupiedRooms;

      // Construim contextul ca text structurat pentru prompt
      dbContext = `
DATE LIVE DIN SISTEM (${new Date().toLocaleDateString("ro-RO")}):
Camere disponibile azi: ${freeRooms} din ${totalRooms}
Lista camere și prețuri:
${roomsResult.rows.map((r) => `  - ${r.name}: ${r.price} RON/noapte, capacitate ${r.capacity} persoane`).join("\n")}
      `.trim();

      // Context suplimentar pentru admin — date rezervări
      if (isAdmin) {
        const bookingsResult = await query(
          `SELECT COUNT(*) AS total,
                  COUNT(CASE WHEN status = 'confirmed' THEN 1 END) AS confirmed,
                  COUNT(CASE WHEN status = 'pending'   THEN 1 END) AS pending,
                  COALESCE(SUM(CASE WHEN status = 'confirmed' AND check_in >= DATE_TRUNC('month', NOW()) THEN total_price END), 0) AS revenue_month
           FROM bookings`,
        );
        const b = bookingsResult.rows[0];
        dbContext += `\n\nSTATISTICI REZERVĂRI (pentru admin):
  Total rezervări: ${b.total} | Confirmate: ${b.confirmed} | În așteptare: ${b.pending}
  Venituri luna curentă: ${b.revenue_month} RON`;
      }
    } catch (dbErr) {
      // Dacă DB-ul nu răspunde, continuăm cu datele hardcoded din systemPrompt
      console.warn(
        "⚠️  Chat: Nu s-a putut încărca contextul din DB:",
        dbErr.message,
      );
    }

    // ── Pasul 3: System Prompt ─────────────────────────────────────────────
    /**
     * System prompt-ul definește PERSONALITATEA și LIMITELE chatbot-ului.
     * Este trimis la fiecare request ca mesaj cu role: "system".
     * Datele hardcoded (check-in/out, facilități) sunt stabile în timp.
     * Datele din DB (prețuri, disponibilitate) sunt injectate dinamic.
     */
    const systemPrompt = isAdmin
      ? buildAdminSystemPrompt(dbContext, lang)
      : buildGuestSystemPrompt(dbContext, lang);

    // ── Pasul 4: Apel Azure OpenAI ─────────────────────────────────────────
    /**
     * Structura mesajelor trimise la Azure OpenAI:
     *  [system_prompt, ...istoricConversatie]
     *
     * TODO (dacă schimbi provider-ul):
     *  - Pentru OpenAI direct: același format, altă URL + cheie
     *  - Pentru Gemini: convertește la { role: "user"/"model", parts: [{ text }] }
     *  - Pentru Anthropic Claude: system separat, messages fără role:system
     */
    let replyText;

    if (azureReady) {
      // ✅ Apel real la Azure OpenAI
      replyText = await callAzureWithRetry(
        [{ role: "system", content: systemPrompt }, ...recentHistory],
        400, // max tokeni pentru răspuns — chatbot-ul trebuie să fie concis
      );
    } else {
      // 🔧 Mock response — pentru development fără cheie Azure
      replyText =
        lang === "ro"
          ? "Bună ziua! Sunt asistentul virtual al Pensiunii Belvedere. Cum vă pot ajuta?"
          : "Hello! I'm the virtual assistant of Belvedere Guesthouse. How can I help you?";
    }

    // ── Pasul 5: Detectare intenție → Quick Actions ────────────────────────
    /**
     * Analizăm ultimul mesaj al utilizatorului pentru a sugera
     * butoane de acțiune rapidă relevante contextului conversației.
     */
    const lastUserMessage =
      recentHistory
        .filter((m) => m.role === "user")
        .pop()
        ?.content?.toLowerCase() || "";

    const quickActions = detectQuickActions(
      lastUserMessage,
      replyText,
      isAdmin,
      lang,
    );

    // ── Pasul 6: Răspuns către frontend ───────────────────────────────────
    res.json({
      success: true,
      reply: replyText.trim(),
      quick_actions: quickActions, // butoane sugerate de afișat sub mesaj
    });
  } catch (err) {
    console.error("❌ POST /api/ai/chat:", err.message);
    res.status(500).json({
      success: false,
      error: "Asistentul nu este disponibil momentan. Vă rugăm reveniți.",
    });
  }
});

// ─── Helper: System Prompt pentru oaspeți ─────────────────────────────────────
function buildGuestSystemPrompt(dbContext, lang) {
  const isRo = lang === "ro";
  return `${isRo ? "Ești asistentul virtual" : "You are the virtual assistant"} al Pensiunii Maramureș Belvedere${isRo ? ", o pensiune boutique din Petrova, Maramureș, România" : ", a boutique guesthouse in Petrova, Maramureș, Romania"}.

${isRo ? "PERSONALITATE" : "PERSONALITY"}:
- ${isRo ? "Cald, prietenos, profesionist — ca un concierge de lux" : "Warm, friendly, professional — like a luxury concierge"}
- ${isRo ? "Răspunsuri SCURTE (2-4 propoziții maxim)" : "SHORT answers (2-4 sentences max)"}
- ${isRo ? "Folosești emoji-uri cu moderație (1-2 per mesaj)" : "Use emojis with moderation (1-2 per message)"}
- ${isRo ? "Răspunzi DOAR în română sau engleză, în funcție de limba utilizatorului" : "Reply ONLY in Romanian or English, matching the user's language"}

${isRo ? "INFORMAȚII PENSIUNE (hardcoded — stabile)" : "GUESTHOUSE INFO (hardcoded — stable)"}:
- Adresă: Strada Principală 42, Petrova, Maramureș, România
- Check-in: 14:00 | Check-out: 11:00
- Contact: +40 755 123 456 | contact@belvedere-maramures.ro
- WiFi: gratuit în toată pensiunea
- Parcare: gratuită, supravegheată
- Facilități: ciubăr cu apă termală, grătar, loc de joacă copii, închiriere biciclete, săniuțe iarna, port tradițional maramureșean
- Mic dejun: inclus în tarif, tradițional românesc
- Animale de companie: nu sunt acceptate
- Plată: card sau numerar la recepție, sau online prin site

${isRo ? "ZONA MARAMUREȘ" : "MARAMUREȘ AREA"}:
- ${isRo ? "Mănăstiri celebre: Bârsana, Moisei, Sapânța (Cimitirul Vesel — 30 km)" : "Famous monasteries: Bârsana, Moisei, Sapânța (Merry Cemetery — 30 km)"}
- ${isRo ? "Activități: drumeții în Munții Maramureșului, schi la Borșa (25 km), rafting pe Vaser" : "Activities: hiking in Maramureș Mountains, skiing at Borșa (25 km), rafting on Vaser river"}
- ${isRo ? "Atracții: Muzeul Satului, Centrul Vechi Sighetu Marmației (15 km)" : "Attractions: Village Museum, Old Town Sighetu Marmației (15 km)"}

${dbContext ? `${isRo ? "DATE ACTUALE DIN SISTEM" : "LIVE SYSTEM DATA"}:\n${dbContext}` : ""}

${isRo ? "LIMITE IMPORTANTE" : "IMPORTANT LIMITS"}:
- ${isRo ? "Nu confirmi rezervări direct din chat — trimiți utilizatorul la formularul de rezervare" : "Don't confirm bookings directly from chat — redirect to the booking form"}
- ${isRo ? "Nu inventa prețuri sau disponibilități dacă nu le ai în date" : "Don't invent prices or availability if not in your data"}
- ${isRo ? "Dacă nu știi ceva, spune sincer și oferă datele de contact" : "If you don't know something, say so honestly and provide contact info"}`;
}

// ─── Helper: System Prompt pentru admin ──────────────────────────────────────
function buildAdminSystemPrompt(dbContext, lang) {
  return `Ești un asistent inteligent pentru administratorul Pensiunii Maramureș Belvedere.

ROL: Ajuți administratorul cu informații operative despre pensiune — rezervări, ocupare, venituri, camere.
TON: Direct, concis, profesionist. Răspunsuri scurte cu date concrete.
LIMBĂ: Română (administratorul e român).

${dbContext ? `DATE LIVE DIN SISTEM:\n${dbContext}` : ""}

CAPABILITĂȚI:
- Raportezi statistici din datele de mai sus
- Explici tendințe și dai recomandări simple
- Răspunzi la întrebări despre operațiunile pensiunii

LIMITE:
- Nu modifici date în sistem direct din chat
- Dacă datele nu sunt disponibile, spui că trebuie verificate în panoul admin`;
}

// ─── Helper: Detectare intenție → Quick Actions ───────────────────────────────
/**
 * Analizează mesajul utilizatorului și răspunsul bot-ului pentru a sugera
 * butoane de navigare rapide relevante contextului curent al conversației.
 *
 * @returns Array de obiecte { label, action, url? }
 */
function detectQuickActions(userMsg, botReply, isAdmin, lang) {
  const isRo = lang === "ro";
  const text = (userMsg + " " + botReply).toLowerCase();

  // Admin nu primește quick actions de navigare publică
  if (isAdmin) return [];

  // Potrivire după cuvinte cheie în mesaj + răspuns
  if (text.match(/rezerv|book|disponibil|liber|cazare/)) {
    return [
      { label: isRo ? "🛏 Rezervă Acum" : "🛏 Book Now", url: "/booking" },
      { label: isRo ? "🏠 Vezi Camere" : "🏠 View Rooms", url: "/rooms" },
    ];
  }
  if (text.match(/camer|room|suite|confort|comfort|preț|pret|price|tarif/)) {
    return [
      { label: isRo ? "🏠 Vezi Camere" : "🏠 View Rooms", url: "/rooms" },
      { label: isRo ? "🛏 Rezervă Acum" : "🛏 Book Now", url: "/booking" },
    ];
  }
  if (text.match(/contact|telefon|email|adres|map|harta/)) {
    return [
      { label: isRo ? "📞 Contactează-ne" : "📞 Contact Us", url: "/contact" },
    ];
  }
  if (
    text.match(/despre|about|facilit|wifi|parcare|ciubăr|mic dejun|breakfast/)
  ) {
    return [
      { label: isRo ? "ℹ️ Despre Noi" : "ℹ️ About Us", url: "/about" },
      { label: isRo ? "🏠 Vezi Camere" : "🏠 View Rooms", url: "/rooms" },
    ];
  }
  if (text.match(/rezervar|booking|cont|account|modific|anulez|cancel/)) {
    return [
      { label: isRo ? "👤 Contul Meu" : "👤 My Account", url: "/account" },
      { label: isRo ? "📞 Contactează-ne" : "📞 Contact Us", url: "/contact" },
    ];
  }

  // Default — butoane generale
  return [
    { label: isRo ? "🏠 Vezi Camere" : "🏠 View Rooms", url: "/rooms" },
    { label: isRo ? "📞 Contact" : "📞 Contact", url: "/contact" },
  ];
}

module.exports = router;
