/**
 * migrate-payment-split.js
 *
 * Adaugă 3 coloane noi în tabelul bookings pentru sistemul de plată în avans:
 *  - payment_split    : "full" | "advance"  (implicit "full" pentru rezervările existente)
 *  - stripe_amount    : suma efectiv trimisă la Stripe (RON, NULL pentru non-card)
 *  - remaining_amount : restanța de plătit la recepție (0 dacă s-a plătit integral)
 *
 * Rulare: node migrate-payment-split.js
 */

require("dotenv").config({ path: require("path").join(__dirname, "../.env") });
const { pool, testConnection } = require("../config/db");

const migrations = [
  // ── Coloana payment_split ──────────────────────────────────────────────────
  // "full"    = clientul a plătit sau va plăti 100% online
  // "advance" = clientul a plătit 30% online, restul la recepție
  `ALTER TABLE bookings
   ADD COLUMN IF NOT EXISTS payment_split VARCHAR(20) DEFAULT 'full'
   CHECK (payment_split IN ('full', 'advance'))`,

  // ── Coloana stripe_amount ──────────────────────────────────────────────────
  // Suma în RON trimisă efectiv la Stripe.
  // NULL = plata nu s-a făcut prin Stripe (transfer bancar, recepție)
  // Exemplu: total=500, avans 30% → stripe_amount=150
  `ALTER TABLE bookings
   ADD COLUMN IF NOT EXISTS stripe_amount INTEGER DEFAULT NULL`,

  // ── Coloana remaining_amount ───────────────────────────────────────────────
  // Restanța de plătit la recepție la check-in.
  // 0 = totul a fost plătit online
  // Exemplu: total=500, avans 30% → remaining_amount=350
  `ALTER TABLE bookings
   ADD COLUMN IF NOT EXISTS remaining_amount INTEGER DEFAULT 0`,

  // ── Index pentru rapoarte rapide ───────────────────────────────────────────
  `CREATE INDEX IF NOT EXISTS idx_bookings_payment_split
   ON bookings(payment_split)`,
];

async function migrate() {
  console.log("🚀 Rulare migrare payment_split...\n");

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
    console.log("\n✅ Migrare payment_split finalizată cu succes!");
    console.log("   Coloane adăugate în tabelul bookings:");
    console.log("   - payment_split  (VARCHAR 20, default: 'full')");
    console.log("   - stripe_amount  (INTEGER, nullable)");
    console.log("   - remaining_amount (INTEGER, default: 0)");
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
