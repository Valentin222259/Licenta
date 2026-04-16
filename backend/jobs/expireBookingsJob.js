"use strict";

const cron = require("node-cron");
const { query } = require("../config/db");

const EXPIRE_AFTER_DAYS = 3;

function startExpireBookingsJob() {
  cron.schedule(
    "0 9 * * *",
    async () => {
      console.log(
        "\n⏰ Expire Bookings Job: pornit la",
        new Date().toLocaleString("ro-RO"),
      );

      try {
        const emailServices = require("../services/email");

        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - EXPIRE_AFTER_DAYS);

        const { rows: expired } = await query(
          `SELECT
             b.id,
             b.booking_ref,
             b.guest_name,
             b.guest_email,
             b.check_in::text AS check_in,
             b.check_out::text AS check_out,
             b.nights,
             b.total_price,
             b.created_at,
             b.preferred_language,
             r.name AS room_name
           FROM bookings b
           JOIN rooms r ON r.id = b.room_id
           WHERE b.status = 'pending'
             AND b.payment_method = 'bank_transfer'
             AND b.created_at < $1
             AND b.guest_email IS NOT NULL`,
          [cutoffDate.toISOString()],
        );

        if (expired.length === 0) {
          console.log(
            `   ℹ️  Nicio rezervare de expirat (limită: ${EXPIRE_AFTER_DAYS} zile).\n`,
          );
          return;
        }

        console.log(
          `   📋 ${expired.length} rezervare(i) de expirat (mai vechi de ${EXPIRE_AFTER_DAYS} zile)`,
        );

        const results = await Promise.allSettled(
          expired.map(async (booking) => {
            await query(
              `UPDATE bookings SET status = 'cancelled', updated_at = NOW() WHERE id = $1`,
              [booking.id],
            );

            console.log(
              `   🚫 Anulat automat: ${booking.booking_ref} | ${booking.guest_name}`,
            );

            await emailServices.sendBookingExpired(
              booking.guest_email,
              {
                guestName: booking.guest_name,
                roomName: booking.room_name,
                checkIn: booking.check_in?.substring(0, 10) || "",
                checkOut: booking.check_out?.substring(0, 10) || "",
                nights: booking.nights,
                totalPrice: booking.total_price,
                bookingRef: booking.booking_ref,
                expireDays: EXPIRE_AFTER_DAYS,
              },
              (booking.preferred_language || "ro").toLowerCase(),
            );
          }),
        );

        const succeeded = results.filter(
          (r) => r.status === "fulfilled",
        ).length;
        const failed = results.filter((r) => r.status === "rejected").length;

        if (failed > 0) {
          results.forEach((r, i) => {
            if (r.status === "rejected") {
              console.error(
                `   ❌ Eroare la ${expired[i]?.booking_ref}:`,
                r.reason?.message,
              );
            }
          });
        }

        if (succeeded > 0) {
          const adminEmail = process.env.ADMIN_EMAIL || process.env.EMAIL_USER;
          await emailServices
            .sendAdminExpiredBookingsAlert(adminEmail, {
              count: succeeded,
              bookings: expired.slice(0, succeeded),
              expireDays: EXPIRE_AFTER_DAYS,
            })
            .catch((err) =>
              console.error("   ⚠️  Email alertă admin eșuat:", err.message),
            );
        }

        console.log(`   ✅ Expirate: ${succeeded} | ❌ Erori: ${failed}\n`);
      } catch (err) {
        console.error("❌ Expire Bookings Job — eroare critică:", err.message);
      }
    },
    { timezone: "Europe/Bucharest" },
  );

  console.log(
    `✅ Job 4 — Expirare rezervări bank_transfer (zilnic 09:00, după ${EXPIRE_AFTER_DAYS} zile)`,
  );
}

module.exports = { startExpireBookingsJob };
