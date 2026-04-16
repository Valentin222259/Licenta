require("dotenv").config({ path: require("path").join(__dirname, "../.env") });
const { query } = require("../config/db");

async function check() {
  const result = await query(
    `SELECT key, value FROM site_settings WHERE key LIKE 'home_story%' ORDER BY key`,
  );
  console.log("\n📋 Setări home_story din DB:\n");
  result.rows.forEach((r) => {
    console.log(`  ${r.key}: "${r.value}"`);
  });
  process.exit(0);
}

check();
