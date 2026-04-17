/**
 * migrate-jacuzzi-bookings.js
 *
 * Creează tabelul jacuzzi_bookings pentru gestionarea rezervărilor de ciubăr.
 * O singură sesiune pe zi — se verifică disponibilitatea în timp real.
 *
 * Rulare: node backend/db/migrate-jacuzzi-bookings.js
 */

require("dotenv").config({ path: require("path").join(__dirname, "../.env") });
const { pool, testConnection } = require("../config/db");

const migrations = [
  `CREATE TABLE IF NOT EXISTS jacuzzi_bookings (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    booking_id  UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
    date        DATE NOT NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT jacuzzi_bookings_date_unique UNIQUE (date)
  )`,

  `CREATE INDEX IF NOT EXISTS idx_jacuzzi_bookings_date
   ON jacuzzi_bookings(date)`,

  `CREATE INDEX IF NOT EXISTS idx_jacuzzi_bookings_booking_id
   ON jacuzzi_bookings(booking_id)`,
];

async function migrate() {
  console.log("🚀 Creare tabel jacuzzi_bookings...\n");

  const connected = await testConnection();
  if (!connected) {
    console.error("❌ Nu mă pot conecta la DB.");
    process.exit(1);
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    for (const sql of migrations) {
      const preview = sql.trim().substring(0, 70).replace(/\s+/g, " ");
      await client.query(sql);
      console.log(`  ✓ ${preview}...`);
    }

    await client.query("COMMIT");
    console.log("\n✅ Tabel jacuzzi_bookings creat cu succes!");
    console.log("   - O singură sesiune permisă per zi");
    console.log("   - Legat la bookings prin booking_id (CASCADE delete)");
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("\n❌ Eroare la migrare — ROLLBACK:", err.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

migrate();
