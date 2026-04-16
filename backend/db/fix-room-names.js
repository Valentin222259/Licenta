require("dotenv").config({ path: require("path").join(__dirname, "../.env") });
const { pool, testConnection } = require("../config/db");

async function fix() {
  console.log("🚀 Corectare nume camere...\n");

  const connected = await testConnection();
  if (!connected) {
    console.error("❌ Nu mă pot conecta la DB.");
    process.exit(1);
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // Fix Camera 1 și Camera 4 — Comfort → Confort
    const fixes = [
      { slug: "camera-1-comfort", name: "Camera 1 — Confort" },
      { slug: "camera-4-comfort", name: "Camera 4 — Confort" },
    ];

    for (const fix of fixes) {
      const result = await client.query(
        `UPDATE rooms SET name = $1 WHERE slug = $2 RETURNING name, slug`,
        [fix.name, fix.slug],
      );
      if (result.rows.length > 0) {
        console.log(`  ✓ ${fix.slug} → "${fix.name}"`);
      } else {
        console.log(`  ⚠️  ${fix.slug} — nu a fost găsit`);
      }
    }

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

fix();
