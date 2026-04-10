"use strict";

const cron = require("node-cron");
const { query } = require("../config/db");
const { sendCheckInReminder, sendReviewRequest } = require("../services/email");

/**
 * startReminderJob — Înregistrează și pornește toate job-urile cron.
 * Apelat O SINGURĂ DATĂ din server.js.
 *
 * Job-uri active:
 *  1. Reminder check-in     — zilnic la 10:00 → oaspeți cu check-in mâine
 *  2. Solicitare recenzie   — zilnic la 12:00 → oaspeți cu check-out azi
 *  3. Finalizare rezervări  — zilnic la 01:00 → confirmed cu check-out trecut → finished
 */
function startReminderJob() {
  // ══════════════════════════════════════════════════════════════════════════
  // JOB 1 — Reminder check-in (zilnic la 10:00)
  // ══════════════════════════════════════════════════════════════════════════
  cron.schedule(
    "0 10 * * *",
    async () => {
      console.log(
        "\n⏰ Reminder Job: pornit la",
        new Date().toLocaleString("ro-RO"),
      );

      try {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        const tomorrowStr = tomorrow.toISOString().split("T")[0];

        const { rows: bookings } = await query(
          `SELECT
             b.guest_name,
             b.guest_email,
             b.booking_ref,
             b.check_in::text  AS check_in,
             b.check_out::text AS check_out,
             b.nights,
             b.total_price,
             r.name AS room_name
           FROM bookings b
           JOIN rooms r ON r.id = b.room_id
           WHERE b.check_in::date = $1
             AND b.status = 'confirmed'
             AND b.guest_email IS NOT NULL`,
          [tomorrowStr],
        );

        if (bookings.length === 0) {
          console.log("   ℹ️  Nicio rezervare confirmată pentru mâine.");
          return;
        }

        console.log(
          `   📋 ${bookings.length} rezervări cu check-in mâine (${tomorrowStr})`,
        );

        const results = await Promise.allSettled(
          bookings.map((booking) =>
            sendCheckInReminder(booking.guest_email, {
              guestName: booking.guest_name,
              roomName: booking.room_name,
              checkIn: booking.check_in.substring(0, 10),
              checkOut: booking.check_out.substring(0, 10),
              nights: booking.nights,
              totalPrice: booking.total_price,
              bookingRef: booking.booking_ref,
            }),
          ),
        );

        const sent = results.filter((r) => r.status === "fulfilled").length;
        const failed = results.filter((r) => r.status === "rejected").length;
        console.log(
          `   ✅ Reminder-uri trimise: ${sent} | ❌ Eșuate: ${failed}\n`,
        );
      } catch (err) {
        console.error("❌ Reminder Job (check-in) — eroare:", err.message);
      }
    },
    { timezone: "Europe/Bucharest" },
  );

  console.log("✅ Job 1 — Reminder check-in înregistrat (zilnic 10:00)");

  // ══════════════════════════════════════════════════════════════════════════
  // JOB 2 — Solicitare recenzie (zilnic la 12:00)
  // Trimite email oaspeților cu check-out AZI (după ce au plecat)
  // ══════════════════════════════════════════════════════════════════════════
  cron.schedule(
    "0 12 * * *",
    async () => {
      console.log(
        "\n⭐ Review Request Job: pornit la",
        new Date().toLocaleString("ro-RO"),
      );

      try {
        const todayStr = new Date().toISOString().split("T")[0];

        const { rows: bookings } = await query(
          `SELECT
             b.guest_name,
             b.guest_email,
             b.booking_ref,
             b.id            AS booking_id,
             b.check_in::text  AS check_in,
             b.check_out::text AS check_out,
             r.name AS room_name
           FROM bookings b
           JOIN rooms r ON r.id = b.room_id
           WHERE b.check_out::date = $1
             AND b.status IN ('confirmed', 'finished')
             AND b.guest_email IS NOT NULL`,
          [todayStr],
        );

        if (bookings.length === 0) {
          console.log("   ℹ️  Nicio rezervare cu check-out azi.");
          return;
        }

        console.log(
          `   📋 ${bookings.length} rezervări cu check-out azi (${todayStr})`,
        );

        const results = await Promise.allSettled(
          bookings.map((b) =>
            sendReviewRequest(b.guest_email, {
              guestName: b.guest_name,
              roomName: b.room_name,
              checkIn: b.check_in.substring(0, 10),
              checkOut: b.check_out.substring(0, 10),
              bookingRef: b.booking_id, // ID-ul rezervării pentru link-ul de recenzie
            }),
          ),
        );

        const sent = results.filter((r) => r.status === "fulfilled").length;
        const failed = results.filter((r) => r.status === "rejected").length;
        console.log(
          `   ✅ Solicitări recenzie trimise: ${sent} | ❌ Eșuate: ${failed}\n`,
        );
      } catch (err) {
        console.error("❌ Review Request Job — eroare:", err.message);
      }
    },
    { timezone: "Europe/Bucharest" },
  );

  console.log("✅ Job 2 — Review Request înregistrat (zilnic 12:00)");

  // ══════════════════════════════════════════════════════════════════════════
  // JOB 3 — Finalizare rezervări (zilnic la 01:00)
  //
  // Logică:
  //   • Caută rezervările cu status = 'confirmed' la care check_out < IERI
  //     (oaspeții au plecat deja — ziua de check-out e considerată liberă)
  //   • Le trece în status = 'finished'
  //   • Trimite email de mulțumire + link pentru recenzie
  //
  // De ce la 01:00?
  //   • Rulăm după miezul nopții pentru a prinde zilele de check-out de ieri
  //   • Evităm conflictul cu Job 2 (care trimite emailuri la 12:00 în ziua
  //     check-out-ului, când statusul e încă 'confirmed')
  // ══════════════════════════════════════════════════════════════════════════
  cron.schedule(
    "0 1 * * *",
    async () => {
      console.log(
        "\n🏁 Finalizare Rezervări Job: pornit la",
        new Date().toLocaleString("ro-RO"),
      );

      try {
        // Ziua de ieri — rezervările cu check-out în trecut
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = yesterday.toISOString().split("T")[0];

        // Găsim toate rezervările confirmed cu check-out <= ieri
        const { rows: toFinish } = await query(
          `SELECT
             b.id,
             b.guest_name,
             b.guest_email,
             b.booking_ref,
             b.check_in::text  AS check_in,
             b.check_out::text AS check_out,
             r.name AS room_name
           FROM bookings b
           JOIN rooms r ON r.id = b.room_id
           WHERE b.status = 'confirmed'
             AND b.check_out::date <= $1
             AND b.guest_email IS NOT NULL`,
          [yesterdayStr],
        );

        if (toFinish.length === 0) {
          console.log("   ℹ️  Nicio rezervare de finalizat.");
          return;
        }

        console.log(
          `   📋 ${toFinish.length} rezervări de marcat ca finalizate`,
        );

        // Actualizăm statusul în batch
        const bookingIds = toFinish.map((b) => b.id);
        const placeholders = bookingIds.map((_, i) => `$${i + 1}`).join(", ");

        await query(
          `UPDATE bookings
           SET status = 'finished', updated_at = NOW()
           WHERE id IN (${placeholders})`,
          bookingIds,
        );

        console.log(`   ✅ ${toFinish.length} rezervări marcate ca 'finished'`);

        // Trimitem email de mulțumire + link recenzie pentru fiecare
        // (folosim allSettled ca un eșec de email să nu blocheze celelalte)
        const emailResults = await Promise.allSettled(
          toFinish.map((b) =>
            sendReviewRequest(b.guest_email, {
              guestName: b.guest_name,
              roomName: b.room_name,
              checkIn: b.check_in.substring(0, 10),
              checkOut: b.check_out.substring(0, 10),
              bookingRef: b.id,
            }),
          ),
        );

        const emailSent = emailResults.filter(
          (r) => r.status === "fulfilled",
        ).length;
        const emailFailed = emailResults.filter(
          (r) => r.status === "rejected",
        ).length;

        console.log(
          `   📧 Emailuri recenzie trimise: ${emailSent} | ❌ Eșuate: ${emailFailed}\n`,
        );

        // Log detaliat pentru eșecuri
        emailResults.forEach((result, i) => {
          if (result.status === "rejected") {
            console.error(
              `   ⚠️  Email eșuat pentru ${toFinish[i].guest_email}:`,
              result.reason?.message,
            );
          }
        });
      } catch (err) {
        console.error("❌ Finalizare Rezervări Job — eroare:", err.message);
      }
    },
    { timezone: "Europe/Bucharest" },
  );

  console.log("✅ Job 3 — Finalizare Rezervări înregistrat (zilnic 01:00)");
}

module.exports = { startReminderJob };
