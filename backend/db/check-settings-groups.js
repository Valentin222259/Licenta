require("dotenv").config({ path: require("path").join(__dirname, "../.env") });
const { query } = require("../config/db");

async function check() {
  const result = await query(
    `SELECT key, group_name FROM site_settings ORDER BY group_name, key`,
  );
  console.log("\n📋 Toate setările cu group_name:\n");
  result.rows.forEach((r) => {
    console.log(`  [${r.group_name}] ${r.key}`);
  });
  process.exit(0);
}

check();
