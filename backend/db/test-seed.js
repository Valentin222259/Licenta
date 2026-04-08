require("dotenv").config({ path: require("path").join(__dirname, "../.env") });
const { pool } = require("../config/db");

async function seed() {
  const client = await pool.connect();
  try {
    const roomRes = await client.query(
      `SELECT id FROM rooms WHERE status = 'active' LIMIT 1`,
    );
    const roomId = roomRes.rows[0].id;

    const ref = `BLV-TEST-${Date.now()}`;

    const bookingRes = await client.query(
      `INSERT INTO bookings 
        (booking_ref, room_id, guest_name, guest_email, guest_phone,
         check_in, check_out, guests, total_price, status, source)
       VALUES 
        ($1, $2, 'Ion Popescu', 'ardeleanvalentin490@yahoo.com', '+40700000000',
         '2026-04-01', '2026-04-03', 2, 500, 'confirmed', 'website')
       RETURNING id, booking_ref`,
      [ref, roomId],
    );

    const booking = bookingRes.rows[0];
    console.log("✅ Rezervare de test creată:");
    console.log("   ID:", booking.id);
    console.log("   Ref:", booking.booking_ref);
    console.log("   Email client: ardeleanvalentin490@yahoo.com");
    console.log("\n🔗 Accesează in browser pentru a trimite emailul:");
    console.log(`   localhost:3001/api/reviews/test-email/${booking.id}`);
  } catch (err) {
    console.error("❌ Eroare:", err.message);
  } finally {
    client.release();
    await pool.end();
  }
}

seed();
