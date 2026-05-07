const { query } = require("./config/db");

async function migrate() {
  try {
    await query(`
      ALTER TABLE rooms ADD COLUMN IF NOT EXISTS smart_multiplier NUMERIC(4,2) DEFAULT 1.0;
      UPDATE rooms SET smart_multiplier = 1.0 WHERE smart_multiplier IS NULL;
    `);
    console.log("✅ Migrare completă: smart_multiplier adăugat");
    process.exit(0);
  } catch (err) {
    console.error("❌ Eroare migrare:", err);
    process.exit(1);
  }
}

migrate();
