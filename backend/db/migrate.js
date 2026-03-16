require("dotenv").config({ path: require("path").join(__dirname, "../.env") });
const { pool, testConnection } = require("../config/db");

// ─── Schema completă pentru Pensiunea Belvedere ─────────────────────────────

const migrations = [
  // ── 1. Extensii PostgreSQL ─────────────────────────────────────────────────
  `CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`,

  // ── 2. Tabel users ─────────────────────────────────────────────────────────
  `CREATE TABLE IF NOT EXISTS users (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name        VARCHAR(150)  NOT NULL,
    email       VARCHAR(255)  NOT NULL UNIQUE,
    phone       VARCHAR(30),
    password    VARCHAR(255),          -- NULL pentru OAuth
    role        VARCHAR(20)   NOT NULL DEFAULT 'client'
                CHECK (role IN ('client', 'admin')),
    created_at  TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ   NOT NULL DEFAULT NOW()
  )`,

  // ── 3. Tabel rooms ─────────────────────────────────────────────────────────
  `CREATE TABLE IF NOT EXISTS rooms (
    id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    slug              VARCHAR(100) NOT NULL UNIQUE,   -- ex: camera-1-comfort
    name              VARCHAR(200) NOT NULL,
    description       TEXT,
    short_description VARCHAR(500),
    price             INTEGER      NOT NULL,          -- RON/noapte
    capacity          INTEGER      NOT NULL DEFAULT 2,
    status            VARCHAR(20)  NOT NULL DEFAULT 'active'
                      CHECK (status IN ('active', 'inactive', 'maintenance')),
    amenities         TEXT[]       DEFAULT '{}',      -- array de string-uri
    sort_order        INTEGER      DEFAULT 0,
    created_at        TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at        TIMESTAMPTZ  NOT NULL DEFAULT NOW()
  )`,

  // ── 4. Tabel images ─────────────────────────────────────────────────────────
  // Stochează URL-urile din S3, nu fișierele în DB
  `CREATE TABLE IF NOT EXISTS images (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    url         TEXT         NOT NULL,    -- URL complet S3
    s3_key      VARCHAR(500),             -- cheia din S3 (pentru ștergere)
    category    VARCHAR(50)  NOT NULL
                CHECK (category IN ('room', 'hero', 'about', 'facility')),
    room_id     UUID REFERENCES rooms(id) ON DELETE CASCADE,
    caption     VARCHAR(300),
    sort_order  INTEGER      DEFAULT 0,
    is_primary  BOOLEAN      DEFAULT false,
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
  )`,

  // ── 5. Tabel bookings ──────────────────────────────────────────────────────
  `CREATE TABLE IF NOT EXISTS bookings (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    booking_ref     VARCHAR(30) UNIQUE,               -- ex: BLV-2025-001
    user_id         UUID REFERENCES users(id) ON DELETE SET NULL,
    room_id         UUID NOT NULL REFERENCES rooms(id) ON DELETE RESTRICT,
    -- Date oaspete (pot diferi de user dacă rezervă pentru altcineva)
    guest_name      VARCHAR(150) NOT NULL,
    guest_email     VARCHAR(255) NOT NULL,
    guest_phone     VARCHAR(30),
    -- Perioadă sejur
    check_in        DATE         NOT NULL,
    check_out       DATE         NOT NULL,
    nights          INTEGER GENERATED ALWAYS AS
                    (check_out - check_in) STORED,    -- calculat automat
    guests          INTEGER      NOT NULL DEFAULT 1,
    -- Preț și status
    total_price     INTEGER      NOT NULL,            -- RON total
    status          VARCHAR(30)  NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending', 'confirmed', 'cancelled', 'completed')),
    source          VARCHAR(50)  DEFAULT 'website'
                    CHECK (source IN ('website', 'booking.com', 'travelminit', 'direct', 'phone')),
    special_requests TEXT,
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    -- Validare: check_out trebuie să fie după check_in
    CONSTRAINT valid_dates CHECK (check_out > check_in)
  )`,

  // ── 6. Tabel guest_ids ─────────────────────────────────────────────────────
  // Stocare date buletin (conform OG 97/2005)
  `CREATE TABLE IF NOT EXISTS guest_ids (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    booking_id      UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
    -- Date din buletin (extrase de Gemini AI)
    cnp             VARCHAR(20),
    serie           VARCHAR(10),
    numar           VARCHAR(10),
    nume            VARCHAR(100),
    prenume         VARCHAR(100),
    data_nasterii   VARCHAR(20),
    sex             VARCHAR(10),
    cetatenie       VARCHAR(50),
    locul_nasterii  VARCHAR(200),
    domiciliu       TEXT,
    emis_de         VARCHAR(100),
    data_emiterii   VARCHAR(20),
    data_expirarii  VARCHAR(20),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`,

  // ── 7. Tabel reviews ──────────────────────────────────────────────────────
  `CREATE TABLE IF NOT EXISTS reviews (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    booking_id  UUID REFERENCES bookings(id) ON DELETE SET NULL,
    room_id     UUID REFERENCES rooms(id) ON DELETE SET NULL,
    guest_name  VARCHAR(150) NOT NULL,
    rating      INTEGER      NOT NULL CHECK (rating BETWEEN 1 AND 5),
    text        TEXT,
    is_visible  BOOLEAN      DEFAULT true,
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
  )`,

  // ── 8. Indecși pentru performanță ──────────────────────────────────────────
  `CREATE INDEX IF NOT EXISTS idx_bookings_room_id    ON bookings(room_id)`,
  `CREATE INDEX IF NOT EXISTS idx_bookings_user_id    ON bookings(user_id)`,
  `CREATE INDEX IF NOT EXISTS idx_bookings_check_in   ON bookings(check_in)`,
  `CREATE INDEX IF NOT EXISTS idx_bookings_status     ON bookings(status)`,
  `CREATE INDEX IF NOT EXISTS idx_images_room_id      ON images(room_id)`,
  `CREATE INDEX IF NOT EXISTS idx_images_category     ON images(category)`,
  `CREATE INDEX IF NOT EXISTS idx_guest_ids_booking   ON guest_ids(booking_id)`,
];

// ─── Rulează migrările ──────────────────────────────────────────────────────
async function migrate() {
  console.log("🚀 Pornesc migrările...\n");

  const connected = await testConnection();
  if (!connected) {
    console.error("❌ Migrările nu pot rula fără conexiune la DB.");
    process.exit(1);
  }

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    for (const sql of migrations) {
      // Afișăm primele 60 de caractere ale query-ului pentru debug
      const preview = sql.trim().substring(0, 60).replace(/\s+/g, " ");
      await client.query(sql);
      console.log(`  ✓ ${preview}...`);
    }

    await client.query("COMMIT");
    console.log("\n✅ Toate migrările au rulat cu succes!");
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("\n❌ Eroare la migrare — ROLLBACK executat:", err.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

migrate();
