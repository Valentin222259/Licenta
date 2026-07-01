const express = require("express");
const router = express.Router();
const { query } = require("../config/db");

// GET /api/jacuzzi/availability?from=YYYY-MM-DD&to=YYYY-MM-DD
// Returnează datele ocupate din intervalul dat
router.get("/availability", async (req, res) => {
  try {
    const { from, to } = req.query;
    if (!from || !to)
      return res.status(400).json({
        success: false,
        error: "Parametrii from și to sunt obligatorii",
      });

    const { rows } = await query(
      `SELECT date::text FROM jacuzzi_bookings
       WHERE date >= $1 AND date <= $2
       ORDER BY date`,
      [from, to],
    );

    res.json({
      success: true,
      occupied: rows.map((r) => r.date),
    });
  } catch (err) {
    console.error("❌ GET /api/jacuzzi/availability:", err.message);
    res.status(500).json({ success: false, error: "Eroare server" });
  }
});

// POST /api/jacuzzi/reserve
// Rezervă sesiunile de ciubăr pentru un booking (apelat după crearea rezervării)
router.post("/reserve", async (req, res) => {
  try {
    const { booking_id, dates } = req.body;
    if (!booking_id || !Array.isArray(dates) || dates.length === 0)
      return res.status(400).json({
        success: false,
        error: "booking_id și dates sunt obligatorii",
      });

    // Verificăm că toate datele sunt libere
    const { rows: occupied } = await query(
      `SELECT date::text FROM jacuzzi_bookings WHERE date = ANY($1::date[])`,
      [dates],
    );

    if (occupied.length > 0) {
      return res.status(409).json({
        success: false,
        error: "Una sau mai multe date sunt deja rezervate",
        occupied: occupied.map((r) => r.date),
      });
    }

    // Inserăm toate datele
    for (const date of dates) {
      await query(
        `INSERT INTO jacuzzi_bookings (booking_id, date) VALUES ($1, $2)`,
        [booking_id, date],
      );
    }

    console.log(
      `🫧 Ciubăr rezervat: ${dates.join(", ")} → booking ${booking_id}`,
    );

    res.json({ success: true, reserved: dates });
  } catch (err) {
    console.error("❌ POST /api/jacuzzi/reserve:", err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
