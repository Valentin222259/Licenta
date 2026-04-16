require("dotenv").config({ path: require("path").join(__dirname, "../.env") });
const { pool, testConnection } = require("../config/db");

async function migrate() {
  console.log("🚀 Adaugă preferred_language în bookings...\n");
  const connected = await testConnection();
  if (!connected) {
    console.error("❌ Nu mă pot conecta la DB.");
    process.exit(1);
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query(`
      ALTER TABLE bookings
      ADD COLUMN IF NOT EXISTS preferred_language VARCHAR(2) DEFAULT 'ro'
      CHECK (preferred_language IN ('ro', 'en'))
    `);
    console.log("  ✓ Coloana preferred_language adăugată");
    await client.query("COMMIT");
    console.log("\n✅ Gata!");
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("\n❌ Eroare:", err.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

migrate();
