const { Pool } = require("pg");

let poolConfig;

if (process.env.DATABASE_URL) {
  poolConfig = {
    connectionString: process.env.DATABASE_URL,
    ssl:
      process.env.NODE_ENV === "production"
        ? { rejectUnauthorized: false }
        : false,
  };
} else {
  poolConfig = {
    host: process.env.DB_HOST || "localhost",
    port: parseInt(process.env.DB_PORT || "5432"),
    database: process.env.DB_NAME || "belvedere",
    user: process.env.DB_USER || "postgres",
    password: process.env.DB_PASSWORD || "",
    ssl: false,
  };
}

const pool = new Pool({
  ...poolConfig,
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

pool.on("error", (err) => {
  console.error("❌ Eroare pool PostgreSQL:", err.message);
});

// ─── Helper: execută un query ────────────────────────────────────────────────
async function query(text, params) {
  const client = await pool.connect();
  try {
    return await client.query(text, params);
  } finally {
    client.release();
  }
}

// ─── Helper: testează conexiunea la pornire ──────────────────────────────────
async function testConnection() {
  try {
    await pool.query("SELECT 1");
    console.log("🗄️  PostgreSQL conectat cu succes");
    return true;
  } catch (err) {
    console.warn("⚠️  PostgreSQL: nu s-a putut conecta —", err.message);
    return false;
  }
}

module.exports = pool;
module.exports.query = query;
module.exports.testConnection = testConnection;
module.exports.pool = pool;
