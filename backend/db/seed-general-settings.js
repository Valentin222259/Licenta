require("dotenv").config({ path: require("path").join(__dirname, "../.env") });
const { pool, testConnection } = require("../config/db");

async function seed() {
  const connected = await testConnection();
  if (!connected) process.exit(1);

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query(`
      INSERT INTO site_settings (key, value, type, label, group_name, sort_order) VALUES
        ('guesthouse_name', 'Maramureș Belvedere', 'text', 'Nume Pensiune', 'general', 1),
        ('guesthouse_address', 'Str. Hera, Nr. 2, Petrova, Maramureș, România', 'text', 'Adresă', 'general', 2),
        ('guesthouse_phone', '+40 262 330 123', 'text', 'Telefon', 'general', 3),
        ('guesthouse_email', 'contact@maramures-belvedere.ro', 'text', 'Email Contact', 'general', 4)
      ON CONFLICT (key) DO NOTHING
    `);
    await client.query("COMMIT");
    console.log("✅ Informații generale adăugate!");
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("❌", err.message);
  } finally {
    client.release();
    await pool.end();
  }
}

seed();
