require("dotenv").config({ path: require("path").join(__dirname, "../.env") });
const { pool, testConnection } = require("../config/db");

async function seed() {
  console.log(
    "🌱 Adaugă facilitățile Mâncare și Evenimente în site_settings...\n",
  );

  const connected = await testConnection();
  if (!connected) {
    console.error("❌ Nu mă pot conecta la DB.");
    process.exit(1);
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    await client.query(`
      INSERT INTO site_settings (key, value, type, label, group_name, sort_order) VALUES
        ('facility_food_title_ro', 'Mâncare Tradițională', 'text', 'Facilitate: Titlu Mâncare (RO)', 'facilities', 17),
        ('facility_food_title_en', 'Traditional Food', 'text', 'Facilitate: Titlu Mâncare (EN)', 'facilities', 17),
        ('facility_food_desc_ro', 'Preparate tradiționale maramureșene gătite cu ingrediente locale. O experiență culinară autentică pe care nu o vei uita.', 'textarea', 'Facilitate: Descriere Mâncare (RO)', 'facilities', 18),
        ('facility_food_desc_en', 'Traditional Maramureș dishes cooked with local ingredients. An authentic culinary experience you will never forget.', 'textarea', 'Facilitate: Descriere Mâncare (EN)', 'facilities', 18),
        ('facility_events_title_ro', 'Sală Evenimente', 'text', 'Facilitate: Titlu Evenimente (RO)', 'facilities', 19),
        ('facility_events_title_en', 'Events Hall', 'text', 'Facilitate: Titlu Evenimente (EN)', 'facilities', 19),
        ('facility_events_desc_ro', 'Spațiu amenajat pentru evenimente private, reuniuni de familie sau celebrări speciale. Capacitate flexibilă și dotări complete.', 'textarea', 'Facilitate: Descriere Evenimente (RO)', 'facilities', 20),
        ('facility_events_desc_en', 'Dedicated space for private events, family gatherings or special celebrations. Flexible capacity and full amenities.', 'textarea', 'Facilitate: Descriere Evenimente (EN)', 'facilities', 20)
      ON CONFLICT (key) DO NOTHING
    `);

    await client.query("COMMIT");
    console.log(
      "✅ Facilitățile Mâncare și Evenimente au fost adăugate cu succes!",
    );
    console.log("   Chei inserate:");
    console.log("   - facility_food_title_ro / _en");
    console.log("   - facility_food_desc_ro / _en");
    console.log("   - facility_events_title_ro / _en");
    console.log("   - facility_events_desc_ro / _en");
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("\n❌ Eroare:", err.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

seed();
