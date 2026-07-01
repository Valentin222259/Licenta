/**
 * migrate-i18n-settings.js
 *
 * Migrare: transformă câmpurile text din site_settings în perechi bilingve (_ro / _en).
 *
 * Logică:
 * 1. Pentru fiecare câmp text/textarea existent (ex: about_story_p1):
 * - Redenumește cheia existentă în about_story_p1_ro
 * - Creează o cheie nouă about_story_p1_en cu valoare goală
 * 2. Câmpurile de tip number (prețuri) NU sunt afectate — sunt universale
 * 3. Câmpurile de tip general (guesthouse_name, etc.) NU sunt afectate
 *
 * Rulare: node db/migrate-i18n-settings.js
 *
 * IMPORTANT: Rulează o singură dată. Scriptul verifică dacă migrarea a fost deja aplicată.
 */

require("dotenv").config({ path: require("path").join(__dirname, "../.env") });
const { pool, testConnection } = require("../config/db");

// Câmpurile care trebuie transformate în bilingve
// Format: { oldKey, groupName, sortOrder, labelRo, labelEn, defaultEn }
const BILINGUAL_FIELDS = [
  // Content Home
  {
    oldKey: "home_story_title",
    group: "content_home",
    sort: 1,
    labelRo: 'Titlu „Povestea Noastră" (RO)',
    labelEn: 'Title "Our Story" (EN)',
    defaultEn: "Our Story",
  },
  {
    oldKey: "home_story_p1",
    group: "content_home",
    sort: 2,
    labelRo: 'Paragraf 1 „Povestea Noastră" (RO)',
    labelEn: 'Paragraph 1 "Our Story" (EN)',
    defaultEn:
      "Nestled in the rolling hills of Maramureș — one of Europe's last truly unspoiled regions — Belvedere was born from a love for this land and its timeless traditions.",
  },
  {
    oldKey: "home_story_p2",
    group: "content_home",
    sort: 3,
    labelRo: 'Paragraf 2 „Povestea Noastră" (RO)',
    labelEn: 'Paragraph 2 "Our Story" (EN)',
    defaultEn:
      "Every detail, from the hand-carved wooden balconies to the locally sourced breakfast, reflects the soul of Maramureș.",
  },

  // Content About
  {
    oldKey: "about_story_title",
    group: "content_about",
    sort: 1,
    labelRo: 'Titlu „Povestea Pensiunii" (RO)',
    labelEn: 'Title "Our Story" (EN)',
    defaultEn: "Our Story",
  },
  {
    oldKey: "about_story_p1",
    group: "content_about",
    sort: 2,
    labelRo: 'Paragraf 1 „Povestea Pensiunii" (RO)',
    labelEn: 'Paragraph 1 "Our Story" (EN)',
    defaultEn:
      "Maramureș Belvedere is located on a hilltop at the entrance to Petrova from Sighetu Marmației, near the Dealul Hera forest.",
  },
  {
    oldKey: "about_story_p2",
    group: "content_about",
    sort: 3,
    labelRo: 'Paragraf 2 „Povestea Pensiunii" (RO)',
    labelEn: 'Paragraph 2 "Our Story" (EN)',
    defaultEn:
      "Access is easy — just 100 m off DN 18, the road connecting Sighetu Marmației and Vișeu, with the guesthouse located approximately halfway between the two towns.",
  },
  {
    oldKey: "about_story_p3",
    group: "content_about",
    sort: 4,
    labelRo: 'Paragraf 3 „Povestea Pensiunii" (RO)',
    labelEn: 'Paragraph 3 "Our Story" (EN)',
    defaultEn:
      "The nearest neighbors are 500–700 m away, making the guesthouse a perfect retreat from city bustle, in an exceptional natural setting.",
  },

  // Facilities
  {
    oldKey: "facility_jacuzzi_title",
    group: "facilities",
    sort: 1,
    labelRo: "Titlu Jacuzzi (RO)",
    labelEn: "Jacuzzi Title (EN)",
    defaultEn: "Jacuzzi / Hot Tub",
  },
  {
    oldKey: "facility_jacuzzi_desc",
    group: "facilities",
    sort: 2,
    labelRo: "Descriere Jacuzzi (RO)",
    labelEn: "Jacuzzi Description (EN)",
    defaultEn:
      "Hot tub with jacuzzi system and ambient lighting. Can be reserved for an extra fee for a relaxing experience under the open sky.",
  },
  {
    oldKey: "facility_bikes_title",
    group: "facilities",
    sort: 3,
    labelRo: "Titlu Biciclete (RO)",
    labelEn: "Bicycles Title (EN)",
    defaultEn: "Free Bicycles",
  },
  {
    oldKey: "facility_bikes_desc",
    group: "facilities",
    sort: 4,
    labelRo: "Descriere Biciclete (RO)",
    labelEn: "Bicycles Description (EN)",
    defaultEn:
      "8 bicycles available free of charge for guests. Explore the surrounding trails at your own pace.",
  },
  {
    oldKey: "facility_pingpong_title",
    group: "facilities",
    sort: 5,
    labelRo: "Titlu Ping Pong (RO)",
    labelEn: "Ping Pong Title (EN)",
    defaultEn: "Ping Pong Table",
  },
  {
    oldKey: "facility_pingpong_desc",
    group: "facilities",
    sort: 6,
    labelRo: "Descriere Ping Pong (RO)",
    labelEn: "Ping Pong Description (EN)",
    defaultEn:
      "Ping pong table available free of charge for fun and relaxation outdoors.",
  },
  {
    oldKey: "facility_sleds_title",
    group: "facilities",
    sort: 7,
    labelRo: "Titlu Săniuțe (RO)",
    labelEn: "Sleds Title (EN)",
    defaultEn: "Sleds (Winter)",
  },
  {
    oldKey: "facility_sleds_desc",
    group: "facilities",
    sort: 8,
    labelRo: "Descriere Săniuțe (RO)",
    labelEn: "Sleds Description (EN)",
    defaultEn:
      "Free sleds for guests and a sledding hill right in the guesthouse yard — guaranteed fun in winter.",
  },
  {
    oldKey: "facility_grill_title",
    group: "facilities",
    sort: 9,
    labelRo: "Titlu Grătar (RO)",
    labelEn: "Grill Title (EN)",
    defaultEn: "Grill & Cauldron",
  },
  {
    oldKey: "facility_grill_desc",
    group: "facilities",
    sort: 10,
    labelRo: "Descriere Grătar (RO)",
    labelEn: "Grill Description (EN)",
    defaultEn:
      "Outdoor area equipped for grilling and cooking in a cauldron. Enjoy a traditional meal in nature.",
  },
  {
    oldKey: "facility_parking_title",
    group: "facilities",
    sort: 11,
    labelRo: "Titlu Parcare (RO)",
    labelEn: "Parking Title (EN)",
    defaultEn: "Free Parking",
  },
  {
    oldKey: "facility_parking_desc",
    group: "facilities",
    sort: 12,
    labelRo: "Descriere Parcare (RO)",
    labelEn: "Parking Description (EN)",
    defaultEn: "Free private parking available for all guesthouse guests.",
  },
  {
    oldKey: "facility_playground_title",
    group: "facilities",
    sort: 13,
    labelRo: "Titlu Loc de Joacă (RO)",
    labelEn: "Playground Title (EN)",
    defaultEn: "Children's Playground",
  },
  {
    oldKey: "facility_playground_desc",
    group: "facilities",
    sort: 14,
    labelRo: "Descriere Loc de Joacă (RO)",
    labelEn: "Playground Description (EN)",
    defaultEn:
      "Playground with trampoline, swing and slide. Kids will have a wonderful time!",
  },
  {
    oldKey: "facility_traditional_title",
    group: "facilities",
    sort: 15,
    labelRo: "Titlu Port Tradițional (RO)",
    labelEn: "Traditional Costume Title (EN)",
    defaultEn: "Traditional Costume",
  },
  {
    oldKey: "facility_traditional_desc",
    group: "facilities",
    sort: 16,
    labelRo: "Descriere Port Tradițional (RO)",
    labelEn: "Traditional Costume Description (EN)",
    defaultEn:
      "Opportunity to wear the traditional costume specific to Historic Maramureș — a unique cultural experience.",
  },
];

async function migrate() {
  console.log("🌐 Migrare i18n site_settings...\n");

  const connected = await testConnection();
  if (!connected) {
    console.error("❌ Nu mă pot conecta la DB.");
    process.exit(1);
  }

  const client = await pool.connect();

  try {
    // Verificăm dacă migrarea a fost deja aplicată
    const check = await client.query(
      "SELECT key FROM site_settings WHERE key = 'home_story_title_ro' LIMIT 1",
    );
    if (check.rows.length > 0) {
      console.log("ℹ️  Migrarea i18n a fost deja aplicată. Nimic de făcut.");
      return;
    }

    await client.query("BEGIN");

    for (const field of BILINGUAL_FIELDS) {
      const { oldKey, group, sort, labelRo, labelEn, defaultEn } = field;

      // 1. Verificăm că cheia veche există
      const existing = await client.query(
        "SELECT value, type FROM site_settings WHERE key = $1",
        [oldKey],
      );

      if (existing.rows.length === 0) {
        console.log(`  ⚠️  ${oldKey} nu există — skip`);
        continue;
      }

      const { value: roValue, type } = existing.rows[0];

      // 2. Redenumim cheia veche -> _ro
      await client.query(
        `UPDATE site_settings
         SET key = $1, label = $2, sort_order = $3
         WHERE key = $4`,
        [`${oldKey}_ro`, labelRo, sort * 2 - 1, oldKey],
      );

      // 3. Inserăm cheia _en
      await client.query(
        `INSERT INTO site_settings (key, value, type, label, group_name, sort_order)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (key) DO NOTHING`,
        [`${oldKey}_en`, defaultEn, type, labelEn, group, sort * 2],
      );

      console.log(`  ✓ ${oldKey} → ${oldKey}_ro + ${oldKey}_en`);
    }

    await client.query("COMMIT");
    console.log(
      `\n✅ Migrare i18n completă! ${BILINGUAL_FIELDS.length} câmpuri transformate în bilingve.`,
    );
    console.log("   Fiecare câmp text are acum varianta _ro și _en.");
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
