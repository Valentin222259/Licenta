// backend/db/create-blocked-periods.js
// Rulează cu: node db/create-blocked-periods.js

require("dotenv").config({ path: require("path").join(__dirname, "../.env") });
const { query } = require("../config/db");

async function createBlockedPeriodsTable() {
  try {
    console.log("🔨 Creare tabel blocked_periods...");

    await query(`
      CREATE TABLE IF NOT EXISTS blocked_periods (
        id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        room_id       UUID REFERENCES rooms(id) ON DELETE CASCADE,
        reason        VARCHAR(20) NOT NULL CHECK (reason IN ('maintenance', 'holiday', 'other')),
        reason_note   TEXT,
        start_date    DATE NOT NULL,
        end_date      DATE NOT NULL,
        all_rooms     BOOLEAN DEFAULT FALSE,
        created_by    VARCHAR(100) DEFAULT 'admin',
        created_at    TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        CONSTRAINT valid_dates CHECK (end_date > start_date)
      )
    `);

    await query(
      `CREATE INDEX IF NOT EXISTS idx_blocked_periods_room_id ON blocked_periods(room_id);`,
    );
    await query(
      `CREATE INDEX IF NOT EXISTS idx_blocked_periods_dates ON blocked_periods(start_date, end_date);`,
    );

    console.log("✅ Tabel blocked_periods creat cu succes!");
    process.exit(0);
  } catch (err) {
    console.error("❌ Eroare:", err.message);
    console.error("❌ Stack:", err.stack);
    process.exit(1);
  }
}

createBlockedPeriodsTable();
