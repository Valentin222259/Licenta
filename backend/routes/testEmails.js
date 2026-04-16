"use strict";

/**
 * routes/testEmails.js
 * Endpoint-uri individuale pentru testarea fiecărui tip de email.
 * Disponibil doar în development.
 */

const express = require("express");
const router = express.Router();
const email = require("../services/email");

const TEST_CLIENT_EMAIL = "ardeleanvalentin490@yahoo.com";
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || process.env.EMAIL_USER;

// ─── Date mock ────────────────────────────────────────────────────────────────
const MOCK = {
  bookingFull: {
    guestName: "Test Guest Full",
    guestEmail: TEST_CLIENT_EMAIL,
    guestPhone: "+40700000001",
    roomName: "Camera 1 — Confort",
    checkIn: "2026-07-10",
    checkOut: "2026-07-13",
    nights: 3,
    totalPrice: 900,
    bookingRef: "BLV-TEST-FULL",
    paymentSplit: "full",
    stripeAmount: 900,
    remainingAmount: 0,
    paymentMethod: "card",
    needsInvoice: false,
  },
  bookingAdvance: {
    guestName: "Test Guest Advance",
    guestEmail: TEST_CLIENT_EMAIL,
    guestPhone: "+40700000002",
    roomName: "Camera 2 — Balcon & Belvedere",
    checkIn: "2026-07-15",
    checkOut: "2026-07-17",
    nights: 2,
    totalPrice: 780,
    bookingRef: "BLV-TEST-ADV",
    paymentSplit: "advance",
    stripeAmount: 234,
    remainingAmount: 546,
    paymentMethod: "card",
    needsInvoice: false,
    extras: { breakfast: true, dinner: true, extra_beds: 1, jacuzzi: false },
  },
  bookingTransfer: {
    guestName: "Test Guest B2B",
    guestEmail: TEST_CLIENT_EMAIL,
    guestPhone: "+40700000003",
    roomName: "Camera 8 — Suite cu Cadă",
    checkIn: "2026-08-01",
    checkOut: "2026-08-04",
    nights: 3,
    totalPrice: 1350,
    bookingRef: "BLV-TEST-B2B",
    paymentSplit: "full",
    stripeAmount: null,
    remainingAmount: 1350,
    paymentMethod: "bank_transfer",
    needsInvoice: true,
    companyName: "SC Test SRL",
    companyCui: "RO12345678",
    companyRegNo: "J40/1234/2024",
    companyAddress: "Str. Exemplu nr. 1, București",
    extras: { breakfast: false, dinner: false, extra_beds: 1, jacuzzi: true },
  },
  cancelPlans: {
    guestName: "Test Guest Cancel",
    guestEmail: TEST_CLIENT_EMAIL,
    roomName: "Camera 3 — Balcon & Pădure",
    checkIn: "2026-07-20",
    checkOut: "2026-07-22",
    nights: 2,
    totalPrice: 600,
    bookingRef: "BLV-TEST-CAN1",
    reason: "Planuri schimbate",
  },
  cancelUnpaid: {
    guestName: "Test Guest Unpaid",
    guestEmail: TEST_CLIENT_EMAIL,
    roomName: "Camera 1 — Confort",
    checkIn: "2026-07-25",
    checkOut: "2026-07-27",
    nights: 2,
    totalPrice: 500,
    bookingRef: "BLV-TEST-CAN2",
    reason: "Neplata transferului bancar",
  },
  reminder: {
    guestName: "Test Guest Reminder",
    guestEmail: TEST_CLIENT_EMAIL,
    roomName: "Camera 6 — Balcon & Belvedere",
    checkIn: "2026-07-30",
    checkOut: "2026-08-02",
    nights: 3,
    totalPrice: 900,
    bookingRef: "BLV-TEST-REM",
  },
  reviewRequest: {
    guestName: "Test Guest Review",
    guestEmail: TEST_CLIENT_EMAIL,
    roomName: "Camera 4 — Confort",
    checkIn: "2026-07-01",
    checkOut: "2026-07-03",
    bookingRef: "BLV-TEST-REV",
  },
  reviewConfirm: {
    guestName: "Test Guest Review",
    rating: 5,
    roomName: "Camera 5 — Suite cu Cadă",
    autoApproved: true,
  },
  expire: {
    guestName: "Test Guest Expired",
    guestEmail: TEST_CLIENT_EMAIL,
    roomName: "Camera 7 — Balcon & Pădure",
    checkIn: "2026-07-10",
    checkOut: "2026-07-12",
    nights: 2,
    totalPrice: 600,
    bookingRef: "BLV-TEST-EXP",
    expireDays: 3,
  },
  expiredList: {
    count: 2,
    expireDays: 3,
    bookings: [
      {
        booking_ref: "BLV-TEST-EXP1",
        guest_name: "Client Expirat 1",
        guest_email: TEST_CLIENT_EMAIL,
        room_name: "Camera 1 — Confort",
        check_in: "2026-07-10",
        total_price: 500,
      },
      {
        booking_ref: "BLV-TEST-EXP2",
        guest_name: "Client Expirat 2",
        guest_email: TEST_CLIENT_EMAIL,
        room_name: "Camera 3 — Balcon & Pădure",
        check_in: "2026-07-15",
        total_price: 750,
      },
    ],
  },
};

// ─── Helper ───────────────────────────────────────────────────────────────────
async function sendBoth(res, label, fn) {
  try {
    await fn("ro");
    await fn("en");
    res.json({
      success: true,
      message: `${label} trimis RO + EN la ${TEST_CLIENT_EMAIL}`,
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
}

async function sendAdmin(res, label, fn) {
  try {
    await fn();
    res.json({ success: true, message: `${label} trimis la ${ADMIN_EMAIL}` });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
}

// ═══════════════════════════════════════════════════════════════
// A. EMAIL-URI CLIENT BILINGVE
// ═══════════════════════════════════════════════════════════════

/**
 * @swagger
 * /api/test-emails/booking-full:
 *   get:
 *     summary: "[A1] Confirmare Stripe integral (RO + EN)"
 *     tags: [Test Emails]
 *     responses:
 *       200:
 *         description: Email trimis
 */
router.get("/booking-full", async (req, res) => {
  await sendBoth(res, "A1 Confirmare Stripe integral", (lang) =>
    email.sendClientBookingConfirmation(
      TEST_CLIENT_EMAIL,
      MOCK.bookingFull,
      lang,
    ),
  );
});

/**
 * @swagger
 * /api/test-emails/booking-advance:
 *   get:
 *     summary: "[A2] Confirmare Stripe avans 30% + extra-uri (RO + EN)"
 *     tags: [Test Emails]
 *     responses:
 *       200:
 *         description: Email trimis
 */
router.get("/booking-advance", async (req, res) => {
  await sendBoth(res, "A2 Confirmare Stripe avans", (lang) =>
    email.sendClientBookingConfirmation(
      TEST_CLIENT_EMAIL,
      MOCK.bookingAdvance,
      lang,
    ),
  );
});

/**
 * @swagger
 * /api/test-emails/booking-transfer:
 *   get:
 *     summary: "[A3] Transfer bancar + factură firmă + extra-uri (RO + EN)"
 *     tags: [Test Emails]
 *     responses:
 *       200:
 *         description: Email trimis
 */
router.get("/booking-transfer", async (req, res) => {
  await sendBoth(res, "A3 Transfer bancar B2B", (lang) =>
    email.sendBankTransferInstructions(
      TEST_CLIENT_EMAIL,
      MOCK.bookingTransfer,
      lang,
    ),
  );
});

/**
 * @swagger
 * /api/test-emails/cancel-plans:
 *   get:
 *     summary: "[A4] Anulare rezervare — Planuri schimbate (RO + EN)"
 *     tags: [Test Emails]
 *     responses:
 *       200:
 *         description: Email trimis
 */
router.get("/cancel-plans", async (req, res) => {
  await sendBoth(res, "A4 Anulare planuri schimbate", (lang) =>
    email.sendBookingCancellation(TEST_CLIENT_EMAIL, MOCK.cancelPlans, lang),
  );
});

/**
 * @swagger
 * /api/test-emails/cancel-unpaid:
 *   get:
 *     summary: "[A5] Anulare rezervare — Neplata transferului (RO + EN)"
 *     tags: [Test Emails]
 *     responses:
 *       200:
 *         description: Email trimis
 */
router.get("/cancel-unpaid", async (req, res) => {
  await sendBoth(res, "A5 Anulare neplata transfer", (lang) =>
    email.sendBookingCancellation(TEST_CLIENT_EMAIL, MOCK.cancelUnpaid, lang),
  );
});

/**
 * @swagger
 * /api/test-emails/reminder:
 *   get:
 *     summary: "[A6] Reminder check-in (RO + EN)"
 *     tags: [Test Emails]
 *     responses:
 *       200:
 *         description: Email trimis
 */
router.get("/reminder", async (req, res) => {
  await sendBoth(res, "A6 Reminder check-in", (lang) =>
    email.sendCheckInReminder(TEST_CLIENT_EMAIL, MOCK.reminder, lang),
  );
});

/**
 * @swagger
 * /api/test-emails/review-request:
 *   get:
 *     summary: "[A7] Solicitare recenzie (RO + EN)"
 *     tags: [Test Emails]
 *     responses:
 *       200:
 *         description: Email trimis
 */
router.get("/review-request", async (req, res) => {
  await sendBoth(res, "A7 Solicitare recenzie", (lang) =>
    email.sendReviewRequest(TEST_CLIENT_EMAIL, MOCK.reviewRequest, lang),
  );
});

/**
 * @swagger
 * /api/test-emails/review-confirm:
 *   get:
 *     summary: "[A8] Confirmare recenzie primită (RO + EN)"
 *     tags: [Test Emails]
 *     responses:
 *       200:
 *         description: Email trimis
 */
router.get("/review-confirm", async (req, res) => {
  await sendBoth(res, "A8 Confirmare recenzie", (lang) =>
    email.sendClientReviewConfirmation(
      TEST_CLIENT_EMAIL,
      MOCK.reviewConfirm,
      lang,
    ),
  );
});

/**
 * @swagger
 * /api/test-emails/expire:
 *   get:
 *     summary: "[A9] Expirare automată rezervare (RO + EN)"
 *     tags: [Test Emails]
 *     responses:
 *       200:
 *         description: Email trimis
 */
router.get("/expire", async (req, res) => {
  await sendBoth(res, "A9 Expirare rezervare", (lang) =>
    email.sendBookingExpired(TEST_CLIENT_EMAIL, MOCK.expire, lang),
  );
});

// ═══════════════════════════════════════════════════════════════
// B. EMAIL-URI CONT / SISTEM CLIENT
// ═══════════════════════════════════════════════════════════════

/**
 * @swagger
 * /api/test-emails/welcome:
 *   get:
 *     summary: "[B10] Bun venit — creare cont (RO + EN)"
 *     tags: [Test Emails]
 *     responses:
 *       200:
 *         description: Email trimis
 */
router.get("/welcome", async (req, res) => {
  await sendBoth(res, "B10 Bun venit", (lang) =>
    email.sendWelcomeEmail(TEST_CLIENT_EMAIL, "Test User", lang),
  );
});

/**
 * @swagger
 * /api/test-emails/password:
 *   get:
 *     summary: "[B11] Confirmare schimbare parolă (RO + EN)"
 *     tags: [Test Emails]
 *     responses:
 *       200:
 *         description: Email trimis
 */
router.get("/password", async (req, res) => {
  await sendBoth(res, "B11 Schimbare parolă", (lang) =>
    email.sendPasswordChangedEmail(TEST_CLIENT_EMAIL, "Test User", lang),
  );
});

/**
 * @swagger
 * /api/test-emails/delete-account:
 *   get:
 *     summary: "[B12] Confirmare ștergere cont (RO + EN)"
 *     tags: [Test Emails]
 *     responses:
 *       200:
 *         description: Email trimis
 */
router.get("/delete-account", async (req, res) => {
  await sendBoth(res, "B12 Ștergere cont", (lang) =>
    email.sendAccountDeletedEmail(TEST_CLIENT_EMAIL, "Test User", lang),
  );
});

/**
 * @swagger
 * /api/test-emails/contact-confirm:
 *   get:
 *     summary: "[B13] Confirmare mesaj contact recepționat (RO + EN)"
 *     tags: [Test Emails]
 *     responses:
 *       200:
 *         description: Email trimis
 */
router.get("/contact-confirm", async (req, res) => {
  await sendBoth(res, "B13 Confirmare contact", (lang) =>
    email.sendClientContactConfirmation(TEST_CLIENT_EMAIL, "Test User", lang),
  );
});

// ═══════════════════════════════════════════════════════════════
// C. ALERTE ADMIN (doar română)
// ═══════════════════════════════════════════════════════════════

/**
 * @swagger
 * /api/test-emails/admin-booking:
 *   get:
 *     summary: "[C14] Alertă admin — Rezervare nouă"
 *     tags: [Test Emails]
 *     responses:
 *       200:
 *         description: Email trimis
 */
router.get("/admin-booking", async (req, res) => {
  await sendAdmin(res, "C14 Alertă rezervare nouă", () =>
    email.sendAdminNewBookingAlert(ADMIN_EMAIL, {
      ...MOCK.bookingTransfer,
      guestEmail: TEST_CLIENT_EMAIL,
      paymentMethod: "bank_transfer",
    }),
  );
});

/**
 * @swagger
 * /api/test-emails/admin-cancel:
 *   get:
 *     summary: "[C15] Alertă admin — Anulare rezervare"
 *     tags: [Test Emails]
 *     responses:
 *       200:
 *         description: Email trimis
 */
router.get("/admin-cancel", async (req, res) => {
  await sendAdmin(res, "C15 Alertă anulare", () =>
    email.sendAdminCancellationAlert(ADMIN_EMAIL, {
      ...MOCK.cancelPlans,
      guestEmail: TEST_CLIENT_EMAIL,
    }),
  );
});

/**
 * @swagger
 * /api/test-emails/admin-review:
 *   get:
 *     summary: "[C16] Alertă admin — Recenzie nouă"
 *     tags: [Test Emails]
 *     responses:
 *       200:
 *         description: Email trimis
 */
router.get("/admin-review", async (req, res) => {
  await sendAdmin(res, "C16 Alertă recenzie", () =>
    email.sendAdminNewReviewAlert(ADMIN_EMAIL, {
      guestName: "Test Guest",
      guestEmail: TEST_CLIENT_EMAIL,
      rating: 5,
      text: "Pensiune extraordinară! Camera a fost impecabilă, personalul foarte amabil. Recomand cu căldură!",
      roomName: "Camera 5 — Suite cu Cadă",
      autoApproved: true,
    }),
  );
});

/**
 * @swagger
 * /api/test-emails/admin-contact:
 *   get:
 *     summary: "[C17] Alertă admin — Mesaj contact"
 *     tags: [Test Emails]
 *     responses:
 *       200:
 *         description: Email trimis
 */
router.get("/admin-contact", async (req, res) => {
  await sendAdmin(res, "C17 Alertă contact", () =>
    email.sendAdminContactMessage(ADMIN_EMAIL, {
      name: "Test Contact",
      email: TEST_CLIENT_EMAIL,
      phone: "+40700000099",
      subject: "Întrebare despre disponibilitate",
      message:
        "Bună ziua, aș dori să știu dacă aveți disponibilitate în luna august pentru 3 nopți.",
    }),
  );
});

/**
 * @swagger
 * /api/test-emails/admin-expire:
 *   get:
 *     summary: "[C18] Alertă admin — Job expirare rezervări"
 *     tags: [Test Emails]
 *     responses:
 *       200:
 *         description: Email trimis
 */
router.get("/admin-expire", async (req, res) => {
  await sendAdmin(res, "C18 Alertă expirare job", () =>
    email.sendAdminExpiredBookingsAlert(ADMIN_EMAIL, MOCK.expiredList),
  );
});

module.exports = router;
