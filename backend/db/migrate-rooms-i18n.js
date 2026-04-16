require("dotenv").config({ path: require("path").join(__dirname, "../.env") });
const { pool, testConnection } = require("../config/db");

const migrations = [
  `ALTER TABLE rooms ADD COLUMN IF NOT EXISTS name_en VARCHAR(200) DEFAULT NULL`,
  `ALTER TABLE rooms ADD COLUMN IF NOT EXISTS short_description_en VARCHAR(500) DEFAULT NULL`,
  `ALTER TABLE rooms ADD COLUMN IF NOT EXISTS description_en TEXT DEFAULT NULL`,
  `ALTER TABLE rooms ADD COLUMN IF NOT EXISTS amenities_en TEXT[] DEFAULT '{}'`,
];

const ROOM_TRANSLATIONS = [
  {
    slug: "camera-1-comfort",
    name_en: "Room 1 — Comfort",
    short_description_en:
      "Double room with white furniture, shower cabin and views over the hills of Maramureș.",
    description_en:
      "Room 1 is a spacious double room (18–23 sqm), furnished with modern white furniture and a 160×200 cm king bed. Located on the first floor, it offers a peaceful view of the surrounding hills and forests. The ensuite bathroom features a shower cabin. An extra bed can be added on request.",
    amenities_en: [
      "King bed 160×200 cm",
      "Shower cabin",
      "TV",
      "Free Wi-Fi",
      "Desk",
      "White furniture",
      "Central heating",
      "Extra bed on request (+50 RON)",
    ],
  },
  {
    slug: "camera-2-balcon-belvedere",
    name_en: "Room 2 — Balcony & Belvedere",
    short_description_en:
      "Double room with balcony and panoramic views of the Maramureș Mountains.",
    description_en:
      "Room 2 features a generous balcony from which you can admire the panorama of the Maramureș Mountains and Dealul Hera. The burgundy furniture creates an intimate and rustic atmosphere. The ensuite bathroom has a shower cabin.",
    amenities_en: [
      "Balcony with panoramic view",
      "King bed 160×200 cm",
      "Shower cabin",
      "TV",
      "Free Wi-Fi",
      "Burgundy furniture",
      "Central heating",
      "Extra bed on request (+50 RON)",
    ],
  },
  {
    slug: "camera-3-balcon-padure",
    name_en: "Room 3 — Balcony & Forest",
    short_description_en:
      "Double room with balcony and views over the Dealul Hera forest.",
    description_en:
      "Room 3 offers a balcony with views of the ancient beech forest on Dealul Hera. The burgundy furniture and traditional Maramureș decorative elements create a warm and welcoming atmosphere.",
    amenities_en: [
      "Balcony with forest view",
      "King bed 160×200 cm",
      "Shower cabin",
      "TV",
      "Free Wi-Fi",
      "Burgundy furniture",
      "Central heating",
      "Extra bed on request (+50 RON)",
    ],
  },
  {
    slug: "camera-4-comfort",
    name_en: "Room 4 — Comfort",
    short_description_en:
      "Double room with white furniture, shower cabin, no balcony — peace and comfort.",
    description_en:
      "Room 4 is a comfortable double room on the first floor, with white furniture and a 160×200 cm king bed. Ideal for couples or travellers looking for peace and comfort at an accessible price.",
    amenities_en: [
      "King bed 160×200 cm",
      "Shower cabin",
      "TV",
      "Free Wi-Fi",
      "Desk",
      "White furniture",
      "Central heating",
      "Extra bed on request (+50 RON)",
    ],
  },
  {
    slug: "camera-5-suite-cada",
    name_en: "Room 5 — Suite with Bathtub",
    short_description_en:
      "Family room with bathtub and sofa bed — up to 3 guests.",
    description_en:
      "Room 5 features a king bed, a sofa bed for a third guest and a bathroom with a bathtub — ideal after a day of hiking in the Maramureș Mountains.",
    amenities_en: [
      "King bed 160×200 cm",
      "Sofa bed",
      "Bathtub",
      "TV",
      "Free Wi-Fi",
      "White furniture",
      "Central heating",
      "Extra bed on request (+50 RON)",
    ],
  },
  {
    slug: "camera-6-balcon-belvedere",
    name_en: "Room 6 — Balcony & Belvedere",
    short_description_en:
      "Double room with 2nd-floor balcony and extended mountain views.",
    description_en:
      "From the 2nd floor, Room 6 offers one of the most spectacular views — the Maramureș Mountains and, on a clear day, Vârful Pietrosul peak. The private balcony and burgundy furniture make it ideal for a romantic stay.",
    amenities_en: [
      "2nd-floor balcony",
      "King bed 160×200 cm",
      "Shower cabin",
      "TV",
      "Free Wi-Fi",
      "Burgundy furniture",
      "Central heating",
      "Extra bed on request (+50 RON)",
    ],
  },
  {
    slug: "camera-7-balcon-padure",
    name_en: "Room 7 — Balcony & Forest",
    short_description_en:
      "Double room with 2nd-floor balcony and views of the Dealul Hera forest.",
    description_en:
      "Room 7 on the 2nd floor has a balcony overlooking the beech forest. The tranquillity of nature and the burgundy furniture create the perfect atmosphere for relaxation.",
    amenities_en: [
      "2nd-floor balcony — forest view",
      "King bed 160×200 cm",
      "Shower cabin",
      "TV",
      "Free Wi-Fi",
      "Burgundy furniture",
      "Central heating",
      "Extra bed on request (+50 RON)",
    ],
  },
  {
    slug: "camera-8-suite-cada",
    name_en: "Room 8 — Suite with Bathtub",
    short_description_en:
      "Family room on the 2nd floor with bathtub and sofa bed — up to 3 guests.",
    description_en:
      "Room 8 on the 2nd floor is spacious and bright, with a king bed, sofa bed for a third guest, and an ensuite bathroom with bathtub. Ideal for families or small groups.",
    amenities_en: [
      "King bed 160×200 cm",
      "Sofa bed",
      "Bathtub",
      "TV",
      "Free Wi-Fi",
      "White furniture",
      "Central heating",
      "Extra bed on request (+50 RON)",
    ],
  },
];

async function migrate() {
  console.log("🚀 Migrare bilingvă camere...\n");
  const connected = await testConnection();
  if (!connected) {
    console.error("❌ Nu mă pot conecta la DB.");
    process.exit(1);
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    for (const sql of migrations) {
      await client.query(sql);
      console.log("  ✓", sql.substring(0, 65) + "...");
    }

    for (const t of ROOM_TRANSLATIONS) {
      await client.query(
        `UPDATE rooms SET name_en=$1, short_description_en=$2, description_en=$3, amenities_en=$4 WHERE slug=$5`,
        [
          t.name_en,
          t.short_description_en,
          t.description_en,
          t.amenities_en,
          t.slug,
        ],
      );
      console.log(`  ✓ ${t.slug} → "${t.name_en}"`);
    }

    await client.query("COMMIT");
    console.log("\n✅ Gata! Coloane adăugate și traduceri populate.");
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("\n❌ Eroare:", err.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

migrate();
