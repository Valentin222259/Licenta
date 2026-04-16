"use strict";

require("dotenv").config();
const { query } = require("./config/db");

async function checkLanguages() {
  try {
    const result = await query(
      `SELECT booking_ref, guest_name, preferred_language, status, created_at::date
       FROM bookings 
       ORDER BY created_at DESC`,
    );

    console.log(`📋 Toate rezervările (${result.rows.length} total):\n`);
    result.rows.forEach((r) => {
      console.log(
        `   ${r.booking_ref} | ${r.guest_name} | lang: "${r.preferred_language}" | ${r.status}`,
      );
    });

    process.exit(0);
  } catch (err) {
    console.error("❌ Eroare:", err.message);
    process.exit(1);
  }
}

checkLanguages();
