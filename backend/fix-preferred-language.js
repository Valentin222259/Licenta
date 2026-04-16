"use strict";

require("dotenv").config();
const { query } = require("./config/db");

async function fixPreferredLanguage() {
  try {
    // Vedem câte rezervări au preferred_language null
    const check = await query(
      `SELECT COUNT(*) as count FROM bookings WHERE preferred_language IS NULL`,
    );
    console.log(`📋 Rezervări fără preferred_language: ${check.rows[0].count}`);

    // Le setăm pe toate pe "ro"
    const result = await query(
      `UPDATE bookings 
       SET preferred_language = 'ro' 
       WHERE preferred_language IS NULL
       RETURNING booking_ref, guest_name, preferred_language`,
    );

    console.log(`✅ Actualizate: ${result.rows.length} rezervări`);
    result.rows.forEach((r) => {
      console.log(
        `   → ${r.booking_ref} | ${r.guest_name} | ${r.preferred_language}`,
      );
    });

    process.exit(0);
  } catch (err) {
    console.error("❌ Eroare:", err.message);
    process.exit(1);
  }
}

fixPreferredLanguage();
