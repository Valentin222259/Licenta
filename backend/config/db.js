const { Pool } = require("pg");

// ─── Configurare pool PostgreSQL ──────────────────────────────────────────────
//
// În development: setezi variabilele individual în .env
//   DB_HOST=localhost  DB_PORT=5432  DB_NAME=belvedere  DB_USER=...  DB_PASSWORD=...
//
// În producție (Elastic Beanstalk + RDS):
//   Poți folosi fie variabilele individuale (recomandat pentru RDS)
//   fie DATABASE_URL=postgresql://user:pass@host:5432/dbname

let poolConfig;

if (process.env.DATABASE_URL) {
  // Mod cloud — un singur string de conexiune
  poolConfig = {
    connectionString: process.env.DATABASE_URL,
    // SSL obligatoriu pentru RDS în producție
    ssl:
      process.env.NODE_ENV === "production"
        ? { rejectUnauthorized: false }
        : false,
  };
} else {
  // Mod development — variabile individuale
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
  // Pool settings — important pentru t2.micro (resurse limitate)
  max: 10, // maxim 10 conexiuni simultane
  idleTimeoutMillis: 30000, // închide conexiuni idle după 30s
  connectionTimeoutMillis: 5000, // eroare dacă nu se conectează în 5s
});

pool.on("connect", () => {
  if (process.env.NODE_ENV !== "production") {
    console.log("🗄️  PostgreSQL conectat");
  }
});

pool.on("error", (err) => {
  console.error("❌ Eroare pool PostgreSQL:", err.message);
});

module.exports = pool;
