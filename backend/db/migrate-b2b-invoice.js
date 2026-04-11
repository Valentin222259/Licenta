/**
 * migrate-b2b-invoice.js
 *
 * Adaugă câmpurile pentru facturare B2B în tabela bookings:
 *  - needs_invoice   : BOOLEAN DEFAULT false — clientul dorește factură pe firmă
 *  - company_name    : VARCHAR(255) — denumirea firmei
 *  - company_cui     : VARCHAR(50)  — CUI / CIF fiscal
 *  - company_reg_no  : VARCHAR(50)  — Nr. Registrul Comerțului (J...)
 *  - company_address : TEXT         — adresa sediului social
 *
 * Rulare: node db/migrate-b2b-invoice.js
 */

require("dotenv").config({ path: require("path").join(__dirname, "../.env") });
const { pool, testConnection } = require("../config/db");

const migrations = [
  `ALTER TABLE bookings
   ADD COLUMN IF NOT EXISTS needs_invoice BOOLEAN DEFAULT false`,

  `ALTER TABLE bookings
   ADD COLUMN IF NOT EXISTS company_name VARCHAR(255) DEFAULT NULL`,

  `ALTER TABLE bookings
   ADD COLUMN IF NOT EXISTS company_cui VARCHAR(50) DEFAULT NULL`,

  `ALTER TABLE bookings
   ADD COLUMN IF NOT EXISTS company_reg_no VARCHAR(50) DEFAULT NULL`,

  `ALTER TABLE bookings
   ADD COLUMN IF NOT EXISTS company_address TEXT DEFAULT NULL`,

  // Index pentru filtrare rapidă după rezervările cu factură
  `CREATE INDEX IF NOT EXISTS idx_bookings_needs_invoice
   ON bookings(needs_invoice) WHERE needs_invoice = true`,
];

async function migrate() {
  console.log("🚀 Rulare migrare B2B invoice...\n");

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
    console.log("\n✅ Migrare B2B finalizată cu succes!");
    console.log("   Coloane adăugate în tabelul bookings:");
    console.log("   - needs_invoice   (BOOLEAN, default: false)");
    console.log("   - company_name    (VARCHAR 255, nullable)");
    console.log("   - company_cui     (VARCHAR 50, nullable)");
    console.log("   - company_reg_no  (VARCHAR 50, nullable)");
    console.log("   - company_address (TEXT, nullable)");
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
