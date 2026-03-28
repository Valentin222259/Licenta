require("dotenv").config({ path: require("path").join(__dirname, "../.env") });
const { pool, testConnection } = require("../config/db");

const rooms = [
  {
    slug: "camera-1-comfort",
    name: "Camera 1 — Comfort",
    short_description:
      "Cameră dublă cu mobilier alb, cabină de duș și vedere spre dealurile Maramureșului.",
    description:
      "Camera 1 este o cameră dublă spațioasă (18–23 mp), amenajată cu mobilier alb modern și pat matrimonial de 160×200 cm. Situată la primul etaj, oferă o priveliște liniștitoare spre dealurile și pădurile din jur. Baia proprie este dotată cu cabină de duș. La cerere se poate adăuga un pat suplimentar.",
    price: 250,
    capacity: 2,
    amenities: [
      "Pat matrimonial 160×200 cm",
      "Cabină de duș",
      "Televizor",
      "Wi-Fi gratuit",
      "Masă de birou",
      "Mobilier alb",
      "Încălzire centrală",
      "Pat suplimentar la cerere (+50 RON)",
    ],
    sort_order: 1,
  },
  {
    slug: "camera-2-balcon-belvedere",
    name: "Camera 2 — Balcon & Belvedere",
    short_description:
      "Cameră dublă cu balcon și priveliște panoramică spre Munții Maramureșului.",
    description:
      "Camera 2 dispune de un balcon generos de unde se poate admira panorama spre Munții Maramureșului și Dealul Hera. Mobilierul bordo creează o atmosferă intimă și rustică. Baia proprie are cabină de duș.",
    price: 250,
    capacity: 2,
    amenities: [
      "Balcon cu vedere panoramică",
      "Pat matrimonial 160×200 cm",
      "Cabină de duș",
      "Televizor",
      "Wi-Fi gratuit",
      "Mobilier bordo",
      "Încălzire centrală",
      "Pat suplimentar la cerere (+50 RON)",
    ],
    sort_order: 2,
  },
  {
    slug: "camera-3-balcon-padure",
    name: "Camera 3 — Balcon & Pădure",
    short_description:
      "Cameră dublă cu balcon și vedere spre pădurea de pe Dealul Hera.",
    description:
      "Camera 3 oferă un balcon cu vedere spre pădurea de fag seculară de pe Dealul Hera. Mobilierul bordo și elementele decorative tradiționale maramureșene creează un ambient cald și primitor.",
    price: 250,
    capacity: 2,
    amenities: [
      "Balcon cu vedere spre pădure",
      "Pat matrimonial 160×200 cm",
      "Cabină de duș",
      "Televizor",
      "Wi-Fi gratuit",
      "Mobilier bordo",
      "Încălzire centrală",
      "Pat suplimentar la cerere (+50 RON)",
    ],
    sort_order: 3,
  },
  {
    slug: "camera-4-comfort",
    name: "Camera 4 — Comfort",
    short_description:
      "Cameră dublă cu mobilier alb, fără balcon — liniște și confort.",
    description:
      "Camera 4 este o cameră dublă confortabilă la primul etaj, cu mobilier alb și pat matrimonial de 160×200 cm. Ideală pentru cupluri care caută liniște la un preț accesibil.",
    price: 250,
    capacity: 2,
    amenities: [
      "Pat matrimonial 160×200 cm",
      "Cabină de duș",
      "Televizor",
      "Wi-Fi gratuit",
      "Mobilier alb",
      "Încălzire centrală",
      "Pat suplimentar la cerere (+50 RON)",
    ],
    sort_order: 4,
  },
  {
    slug: "camera-5-suite-cada",
    name: "Camera 5 — Suite cu Cadă",
    short_description:
      "Cameră familială cu cadă și canapea extensibilă — până la 3 persoane.",
    description:
      "Camera 5 dispune de pat matrimonial, canapea extensibilă pentru o a treia persoană și baie cu cadă — ideal după o zi de drumeții în Munții Maramureșului.",
    price: 300,
    capacity: 3,
    amenities: [
      "Pat matrimonial 160×200 cm",
      "Canapea extensibilă",
      "Cadă",
      "Televizor",
      "Wi-Fi gratuit",
      "Mobilier alb",
      "Încălzire centrală",
      "Pat suplimentar la cerere (+50 RON)",
    ],
    sort_order: 5,
  },
  {
    slug: "camera-6-balcon-belvedere",
    name: "Camera 6 — Balcon & Belvedere",
    short_description:
      "Cameră dublă cu balcon la etaj 2 și priveliște extinsă spre munți.",
    description:
      "De la etajul 2, Camera 6 oferă una dintre cele mai spectaculoase priveliști — Munții Maramureșului și, pe cer senin, Vârful Pietrosul. Balconul propriu și mobilierul bordo o fac ideală pentru un sejur romantic.",
    price: 250,
    capacity: 2,
    amenities: [
      "Balcon etaj 2",
      "Pat matrimonial 160×200 cm",
      "Cabină de duș",
      "Televizor",
      "Wi-Fi gratuit",
      "Mobilier bordo",
      "Încălzire centrală",
      "Pat suplimentar la cerere (+50 RON)",
    ],
    sort_order: 6,
  },
  {
    slug: "camera-7-balcon-padure",
    name: "Camera 7 — Balcon & Pădure",
    short_description:
      "Cameră dublă cu balcon la etaj 2 și vedere spre pădurea Dealului Hera.",
    description:
      "Camera 7 la etajul 2 cu balcon spre pădurea de fag. Liniștea naturii și mobilierul bordo creează o atmosferă perfectă pentru relaxare.",
    price: 250,
    capacity: 2,
    amenities: [
      "Balcon etaj 2 — pădure",
      "Pat matrimonial 160×200 cm",
      "Cabină de duș",
      "Televizor",
      "Wi-Fi gratuit",
      "Mobilier bordo",
      "Încălzire centrală",
      "Pat suplimentar la cerere (+50 RON)",
    ],
    sort_order: 7,
  },
  {
    slug: "camera-8-suite-cada",
    name: "Camera 8 — Suite cu Cadă",
    short_description:
      "Cameră familială la etaj 2, cu cadă și canapea extensibilă — până la 3 persoane.",
    description:
      "Camera 8 la etajul 2, spațioasă cu pat matrimonial, canapea extensibilă și baie cu cadă. Ideală pentru familii.",
    price: 300,
    capacity: 3,
    amenities: [
      "Pat matrimonial 160×200 cm",
      "Canapea extensibilă",
      "Cadă",
      "Televizor",
      "Wi-Fi gratuit",
      "Mobilier alb",
      "Încălzire centrală",
      "Pat suplimentar la cerere (+50 RON)",
    ],
    sort_order: 8,
  },
];

async function seed() {
  console.log("🌱 Pornesc seed-ul...\n");

  const connected = await testConnection();
  if (!connected) {
    console.error("❌ Nu mă pot conecta la DB.");
    process.exit(1);
  }

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    // Ștergem în ordine (FK constraints)
    await client.query("DELETE FROM reviews");
    await client.query("DELETE FROM guest_ids");
    await client.query("DELETE FROM bookings");
    await client.query("DELETE FROM images");
    await client.query("DELETE FROM rooms");
    await client.query("DELETE FROM users");
    console.log("🗑️  Date vechi șterse\n");

    // Inserăm camerele
    for (const room of rooms) {
      const { rows } = await client.query(
        `INSERT INTO rooms (slug, name, description, short_description, price, capacity, amenities, sort_order, status)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'active')
         RETURNING id, name`,
        [
          room.slug,
          room.name,
          room.description,
          room.short_description,
          room.price,
          room.capacity,
          room.amenities,
          room.sort_order,
        ],
      );
      console.log(`  ✓ ${rows[0].name}`);
    }

    // Admin user
    await client.query(
      `INSERT INTO users (name, email, password, role)
       VALUES ('Administrator', 'admin@belvedere.ro', 'admin123_hashed', 'admin')`,
    );
    console.log("\n  ✓ Admin: admin@belvedere.ro / admin123");

    await client.query("COMMIT");
    console.log("\n✅ Seed complet! 8 camere + 1 admin creat.");
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("❌ Eroare seed:", err.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

seed();
