require("dotenv").config();
const { query } = require("./config/db");

async function check() {
  console.log("=".repeat(60));
  console.log("CRON JOB — BOOKING COMPATIBILITY CHECK");
  console.log("=".repeat(60));

  // Show current date reference
  const dateRef = await query(`
    SELECT
      NOW()::text as utc_now,
      (NOW() + INTERVAL '3 hours')::date::text as azi_ro,
      ((NOW() + INTERVAL '3 hours')::date + INTERVAL '1 day')::text as maine_ro,
      ((NOW() + INTERVAL '3 hours')::date - INTERVAL '1 day')::text as ieri_ro
  `);
  const d = dateRef.rows[0];
  console.log(`\nDate reference (PostgreSQL):`);
  console.log(`  UTC now : ${d.utc_now}`);
  console.log(`  Azi RO  : ${d.azi_ro}`);
  console.log(`  Maine RO: ${d.maine_ro}`);
  console.log(`  Ieri RO : ${d.ieri_ro}`);

  // JOB 1 — Check-in reminder
  console.log("\n" + "-".repeat(60));
  console.log("JOB 1 — Check-in reminder (cauta check_in = maine)");
  console.log("-".repeat(60));
  const job1 = await query(`
    SELECT b.booking_ref, b.check_in::text, b.check_out::text, b.status, b.preferred_language, r.name AS room_name
    FROM bookings b JOIN rooms r ON r.id = b.room_id
    WHERE b.check_in::date = (NOW() + INTERVAL '3 hours')::date + INTERVAL '1 day'
      AND b.status IN ('confirmed', 'pending')
      AND b.guest_email IS NOT NULL
  `);
  if (job1.rows.length === 0) {
    console.log("  ❌ Nicio rezervare gasita pentru maine");
  } else {
    job1.rows.forEach((r) =>
      console.log(
        `  ✅ ${r.booking_ref} | check_in: ${r.check_in} | ${r.preferred_language} | ${r.status}`,
      ),
    );
  }

  // JOB 2 — Review request
  console.log("\n" + "-".repeat(60));
  console.log("JOB 2 — Review request (cauta check_out = ieri)");
  console.log("-".repeat(60));
  const job2 = await query(`
    SELECT b.booking_ref, b.check_in::text, b.check_out::text, b.status, b.preferred_language, r.name AS room_name
    FROM bookings b JOIN rooms r ON r.id = b.room_id
    WHERE b.check_out::date = (NOW() + INTERVAL '3 hours')::date - INTERVAL '1 day'
      AND b.status IN ('confirmed', 'finished')
      AND b.guest_email IS NOT NULL
  `);
  if (job2.rows.length === 0) {
    console.log("  ❌ Nicio rezervare gasita cu check_out ieri");
  } else {
    job2.rows.forEach((r) =>
      console.log(
        `  ✅ ${r.booking_ref} | check_out: ${r.check_out} | ${r.preferred_language} | ${r.status}`,
      ),
    );
  }

  // JOB 3 — Finalize
  console.log("\n" + "-".repeat(60));
  console.log("JOB 3 — Finalize (cauta check_out <= azi, status confirmed)");
  console.log("-".repeat(60));
  const job3 = await query(`
    SELECT b.booking_ref, b.check_in::text, b.check_out::text, b.status, b.preferred_language
    FROM bookings b
    WHERE b.status = 'confirmed'
      AND b.check_out::date <= (NOW() + INTERVAL '3 hours')::date
  `);
  if (job3.rows.length === 0) {
    console.log("  ❌ Nicio rezervare de finalizat");
  } else {
    job3.rows.forEach((r) =>
      console.log(
        `  ✅ ${r.booking_ref} | check_out: ${r.check_out} | ${r.preferred_language} | ${r.status}`,
      ),
    );
  }

  // JOB 4 — Expire
  console.log("\n" + "-".repeat(60));
  console.log("JOB 4 — Expire (cauta pending > 3 zile)");
  console.log("-".repeat(60));
  const job4 = await query(`
    SELECT b.booking_ref, b.check_in::text, b.created_at::text, b.status, b.preferred_language
    FROM bookings b
    WHERE b.status = 'pending'
      AND b.created_at < (NOW() + INTERVAL '3 hours') - INTERVAL '3 days'
      AND b.guest_email IS NOT NULL
  `);
  if (job4.rows.length === 0) {
    console.log("  ❌ Nicio rezervare de expirat");
  } else {
    job4.rows.forEach((r) =>
      console.log(
        `  ✅ ${r.booking_ref} | created_at: ${r.created_at} | ${r.preferred_language} | ${r.status}`,
      ),
    );
  }

  console.log("\n" + "=".repeat(60));
  process.exit(0);
}

check().catch((err) => {
  console.error("Eroare:", err.message);
  process.exit(1);
});
