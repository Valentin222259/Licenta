/**
 * jobs/reminderJob.js — Cron job pentru reminder-uri check-in
 *
 * Rulează zilnic la 10:00 și trimite email oaspeților
 * care au check-in A DOUA ZI.
 *
 * Tehnologie: node-cron (npm install node-cron)
 * Pattern cron: "0 10 * * *" = în fiecare zi la 10:00
 *
 * Pornit din server.js la inițializare.
 */

"use strict";

const cron = require("node-cron");
const { query } = require("../config/db");
const { sendCheckInReminder } = require("../services/email");

/**
 * startReminderJob — Înregistrează și pornește job-ul cron.
 * Apelat O SINGURĂ DATĂ din server.js.
 */
function startReminderJob() {
  // Cron expression: minute oră zi-lună lună zi-săptămână
  // "0 10 * * *" = la 10:00 în fiecare zi
  cron.schedule(
    "0 10 * * *",
    async () => {
      console.log(
        "\n⏰ Reminder Job: pornit la",
        new Date().toLocaleString("ro-RO"),
      );

      try {
        // Căutăm rezervările cu check-in MÂINE (status confirmed sau pending)
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        const tomorrowStr = tomorrow.toISOString().split("T")[0];

        const { rows: bookings } = await query(
          `SELECT
           b.guest_name,
           b.guest_email,
           b.booking_ref,
           b.check_in::text AS check_in,
           b.check_out::text AS check_out,
           b.nights,
           b.total_price,
           r.name AS room_name
         FROM bookings b
         JOIN rooms r ON r.id = b.room_id
         WHERE b.check_in::date = $1
           AND b.status IN ('confirmed', 'pending')
           AND b.guest_email IS NOT NULL`,
          [tomorrowStr],
        );

        if (bookings.length === 0) {
          console.log("   ℹ️  Nicio rezervare pentru mâine.");
          return;
        }

        console.log(
          `   📋 ${bookings.length} rezervări cu check-in mâine (${tomorrowStr})`,
        );

        // Trimitem emailuri în paralel cu Promise.allSettled
        // allSettled (nu Promise.all) — un eșec nu oprește celelalte emailuri
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

        // Raport rezultate
        const sent = results.filter((r) => r.status === "fulfilled").length;
        const failed = results.filter((r) => r.status === "rejected").length;
        console.log(
          `   ✅ Reminder-uri trimise: ${sent} | ❌ Eșuate: ${failed}\n`,
        );
      } catch (err) {
        console.error("❌ Reminder Job — eroare:", err.message);
      }
    },
    {
      timezone: "Europe/Bucharest", // fusul orar al pensiunii
    },
  );

  console.log("✅ Reminder Job înregistrat (zilnic la 10:00 Europe/Bucharest)");
}

module.exports = { startReminderJob };
