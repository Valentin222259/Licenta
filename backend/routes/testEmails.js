"use strict";

/**
 * routes/testEmails.js
 * GET /api/test-emails/test-all-emails
 * Testează TOATE scenariile de email din email.js în RO și EN.
 * Disponibil doar în development.
 */

const express = require("express");
const router = express.Router();
const { query } = require("../config/db");
const email = require("../services/email");

const TEST_CLIENT_EMAIL = "ardeleanvalentin490@yahoo.com";
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || process.env.EMAIL_USER;

// ─── Date mock ────────────────────────────────────────────────────────────────
const MOCK = {
  bookingFull: {
    guestName: "Test Guest Full",
    guestEmail: TEST_CLIENT_EMAIL,
    guestPhone: "+40700000001",
    roomName: "Camera 5 — Suite cu Cadă",
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
    extras: { breakfast: true, dinner: true, extra_beds: 0, jacuzzi: false },
  },
  bookingBankB2B: {
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
  bookingCancelled1: {
    guestName: "Test Guest Cancel 1",
    guestEmail: TEST_CLIENT_EMAIL,
    guestPhone: "+40700000004",
    roomName: "Camera 3 — Balcon & Pădure",
    checkIn: "2026-07-20",
    checkOut: "2026-07-22",
    nights: 2,
    totalPrice: 600,
    bookingRef: "BLV-TEST-CAN1",
    reason: "Planuri schimbate",
  },
  bookingCancelled2: {
    guestName: "Test Guest Cancel 2",
    guestEmail: TEST_CLIENT_EMAIL,
    guestPhone: "+40700000005",
    roomName: "Camera 1 — Comfort",
    checkIn: "2026-07-25",
    checkOut: "2026-07-27",
    nights: 2,
    totalPrice: 500,
    bookingRef: "BLV-TEST-CAN2",
    reason: "Neplata transferului bancar",
  },
  bookingReminder: {
    guestName: "Test Guest Reminder",
    guestEmail: TEST_CLIENT_EMAIL,
    guestPhone: "+40700000006",
    roomName: "Camera 6 — Balcon & Belvedere",
    checkIn: "2026-07-30",
    checkOut: "2026-08-02",
    nights: 3,
    totalPrice: 900,
    bookingRef: "BLV-TEST-REM",
  },
  bookingReview: {
    guestName: "Test Guest Review",
    guestEmail: TEST_CLIENT_EMAIL,
    roomName: "Camera 4 — Comfort",
    checkIn: "2026-07-01",
    checkOut: "2026-07-03",
    bookingRef: "999",
  },
  bookingExpired: {
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
  contact: {
    name: "Test Contact",
    email: TEST_CLIENT_EMAIL,
    phone: "+40700000099",
    subject: "Întrebare despre disponibilitate",
    message:
      "Bună ziua, aș dori să știu dacă aveți disponibilitate în luna august.",
  },
  expiredBookingsList: {
    count: 2,
    expireDays: 3,
    bookings: [
      {
        booking_ref: "BLV-TEST-EXP1",
        guest_name: "Client Expirat 1",
        guest_email: TEST_CLIENT_EMAIL,
        room_name: "Camera 1 — Comfort",
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

// ─── Helper: rulează un scenariu și loghează rezultatul ───────────────────────
async function run(label, fn) {
  try {
    await fn();
    return { label, status: "✅ OK" };
  } catch (err) {
    return { label, status: "❌ FAILED", error: err.message };
  }
}

// ─── GET /api/test-emails/test-all-emails ─────────────────────────────────────
router.get("/test-all-emails", async (req, res) => {
  const results = [];
  const startTime = Date.now();

  console.log("\n🧪 [TEST-ALL-EMAILS] Start\n");

  // ═══════════════════════════════════════════════════════════════
  // A. EMAIL-URI CLIENT BILINGVE
  // ═══════════════════════════════════════════════════════════════

  // A1. Confirmare plată integrală Stripe
  results.push(
    await run("A1-RO | Confirmare Stripe integral", () =>
      email.sendClientBookingConfirmation(
        TEST_CLIENT_EMAIL,
        MOCK.bookingFull,
        "ro",
      ),
    ),
  );
  results.push(
    await run("A1-EN | Stripe full payment confirmation", () =>
      email.sendClientBookingConfirmation(
        TEST_CLIENT_EMAIL,
        MOCK.bookingFull,
        "en",
      ),
    ),
  );

  // A2. Confirmare avans Stripe 30% cu extra-uri
  results.push(
    await run("A2-RO | Confirmare Stripe avans 30%", () =>
      email.sendClientBookingConfirmation(
        TEST_CLIENT_EMAIL,
        MOCK.bookingAdvance,
        "ro",
      ),
    ),
  );
  results.push(
    await run("A2-EN | Stripe advance 30% confirmation", () =>
      email.sendClientBookingConfirmation(
        TEST_CLIENT_EMAIL,
        MOCK.bookingAdvance,
        "en",
      ),
    ),
  );

  // A3. Instrucțiuni transfer bancar + B2B + extra-uri
  results.push(
    await run("A3-RO | Transfer bancar B2B + extra-uri", () =>
      email.sendBankTransferInstructions(
        TEST_CLIENT_EMAIL,
        MOCK.bookingBankB2B,
        "ro",
      ),
    ),
  );
  results.push(
    await run("A3-EN | Bank transfer B2B + extras", () =>
      email.sendBankTransferInstructions(
        TEST_CLIENT_EMAIL,
        MOCK.bookingBankB2B,
        "en",
      ),
    ),
  );

  // A4. Anulare — planuri schimbate
  results.push(
    await run("A4-RO | Anulare rezervare (planuri schimbate)", () =>
      email.sendBookingCancellation(
        TEST_CLIENT_EMAIL,
        MOCK.bookingCancelled1,
        "ro",
      ),
    ),
  );
  results.push(
    await run("A4-EN | Booking cancellation (plans changed)", () =>
      email.sendBookingCancellation(
        TEST_CLIENT_EMAIL,
        MOCK.bookingCancelled1,
        "en",
      ),
    ),
  );

  // A5. Anulare — neplata transferului
  results.push(
    await run("A5-RO | Anulare rezervare (neplata transfer)", () =>
      email.sendBookingCancellation(
        TEST_CLIENT_EMAIL,
        MOCK.bookingCancelled2,
        "ro",
      ),
    ),
  );
  results.push(
    await run("A5-EN | Booking cancellation (unpaid transfer)", () =>
      email.sendBookingCancellation(
        TEST_CLIENT_EMAIL,
        MOCK.bookingCancelled2,
        "en",
      ),
    ),
  );

  // A6. Reminder check-in
  results.push(
    await run("A6-RO | Reminder check-in", () =>
      email.sendCheckInReminder(TEST_CLIENT_EMAIL, MOCK.bookingReminder, "ro"),
    ),
  );
  results.push(
    await run("A6-EN | Check-in reminder", () =>
      email.sendCheckInReminder(TEST_CLIENT_EMAIL, MOCK.bookingReminder, "en"),
    ),
  );

  // A7. Solicitare recenzie
  results.push(
    await run("A7-RO | Solicitare recenzie", () =>
      email.sendReviewRequest(TEST_CLIENT_EMAIL, MOCK.bookingReview, "ro"),
    ),
  );
  results.push(
    await run("A7-EN | Review request", () =>
      email.sendReviewRequest(TEST_CLIENT_EMAIL, MOCK.bookingReview, "en"),
    ),
  );

  // A8. Confirmare recenzie — auto-aprobată (rating 5)
  results.push(
    await run("A8-RO | Confirmare recenzie (auto-aprobată)", () =>
      email.sendClientReviewConfirmation(
        TEST_CLIENT_EMAIL,
        {
          guestName: "Test Guest",
          rating: 5,
          roomName: "Camera 4 — Confort",
          autoApproved: true,
        },
        "ro",
      ),
    ),
  );

  // A8b. Confirmare recenzie — necesită moderare (rating 2)
  results.push(
    await run("A8b-RO | Confirmare recenzie (moderare necesară)", () =>
      email.sendClientReviewConfirmation(
        TEST_CLIENT_EMAIL,
        {
          guestName: "Test Guest",
          rating: 2,
          roomName: "Camera 4 — Confort",
          autoApproved: false,
        },
        "ro",
      ),
    ),
  );

  // A9. Expirare automată rezervare
  results.push(
    await run("A9-RO | Expirare rezervare (transfer bancar)", () =>
      email.sendBookingExpired(TEST_CLIENT_EMAIL, MOCK.bookingExpired, "ro"),
    ),
  );
  results.push(
    await run("A9-EN | Booking expiry (bank transfer)", () =>
      email.sendBookingExpired(TEST_CLIENT_EMAIL, MOCK.bookingExpired, "en"),
    ),
  );

  // ═══════════════════════════════════════════════════════════════
  // B. EMAIL-URI CONT / SISTEM (bilingve)
  // ═══════════════════════════════════════════════════════════════

  results.push(
    await run("B10-RO | Bun venit (creare cont)", () =>
      email.sendWelcomeEmail(TEST_CLIENT_EMAIL, "Test User", "ro"),
    ),
  );
  results.push(
    await run("B10-EN | Welcome (account created)", () =>
      email.sendWelcomeEmail(TEST_CLIENT_EMAIL, "Test User", "en"),
    ),
  );

  results.push(
    await run("B11-RO | Confirmare schimbare parolă", () =>
      email.sendPasswordChangedEmail(TEST_CLIENT_EMAIL, "Test User", "ro"),
    ),
  );
  results.push(
    await run("B11-EN | Password change confirmation", () =>
      email.sendPasswordChangedEmail(TEST_CLIENT_EMAIL, "Test User", "en"),
    ),
  );

  results.push(
    await run("B12-RO | Confirmare ștergere cont", () =>
      email.sendAccountDeletedEmail(TEST_CLIENT_EMAIL, "Test User", "ro"),
    ),
  );
  results.push(
    await run("B12-EN | Account deletion confirmation", () =>
      email.sendAccountDeletedEmail(TEST_CLIENT_EMAIL, "Test User", "en"),
    ),
  );

  results.push(
    await run("B13-RO | Confirmare recepționare mesaj contact", () =>
      email.sendClientContactConfirmation(TEST_CLIENT_EMAIL, "Test User", "ro"),
    ),
  );
  results.push(
    await run("B13-EN | Contact message received confirmation", () =>
      email.sendClientContactConfirmation(TEST_CLIENT_EMAIL, "Test User", "en"),
    ),
  );

  // ═══════════════════════════════════════════════════════════════
  // C. ALERTE ADMIN (mereu română)
  // ═══════════════════════════════════════════════════════════════

  // C14. Alertă rezervare nouă — Stripe integral
  results.push(
    await run("C14 | Alertă admin — Stripe integral", () =>
      email.sendAdminNewBookingAlert(ADMIN_EMAIL, {
        ...MOCK.bookingFull,
        guestEmail: TEST_CLIENT_EMAIL,
        paymentMethod: "💳 Card online — Integral 900 RON",
      }),
    ),
  );

  // C15. Alertă rezervare nouă — Transfer bancar + B2B + extra-uri
  results.push(
    await run("C15 | Alertă admin — Transfer bancar B2B + extra-uri", () =>
      email.sendAdminNewBookingAlert(ADMIN_EMAIL, {
        ...MOCK.bookingBankB2B,
        guestEmail: TEST_CLIENT_EMAIL,
        paymentMethod: "🏦 Transfer Bancar",
      }),
    ),
  );

  // C16. Alertă anulare rezervare
  results.push(
    await run("C16 | Alertă admin — Anulare rezervare", () =>
      email.sendAdminCancellationAlert(ADMIN_EMAIL, {
        ...MOCK.bookingCancelled1,
        guestEmail: TEST_CLIENT_EMAIL,
        reason: "Planuri schimbate",
      }),
    ),
  );

  // C17a. Alertă recenzie nouă — auto-aprobată (≥4 stele)
  results.push(
    await run("C17a | Alertă admin — Recenzie nouă (5 stele, auto)", () =>
      email.sendAdminNewReviewAlert(ADMIN_EMAIL, {
        guestName: "Test Guest",
        guestEmail: TEST_CLIENT_EMAIL,
        rating: 5,
        text: "Pensiune extraordinară! Camera a fost impecabilă, personalul foarte amabil. Recomand cu căldură!",
        roomName: "Camera 5 — Suite cu Cadă",
        autoApproved: true,
      }),
    ),
  );

  // C17b. Alertă recenzie nouă — necesită moderare (<4 stele)
  results.push(
    await run("C17b | Alertă admin — Recenzie nouă (2 stele, moderare)", () =>
      email.sendAdminNewReviewAlert(ADMIN_EMAIL, {
        guestName: "Test Guest",
        guestEmail: TEST_CLIENT_EMAIL,
        rating: 2,
        text: "A fost ok, dar camera era mai mică decât în poze și curentul nu funcționa.",
        roomName: "Camera 1 — Comfort",
        autoApproved: false,
      }),
    ),
  );

  // C18. Alertă mesaj contact
  results.push(
    await run("C18 | Alertă admin — Mesaj contact", () =>
      email.sendAdminContactMessage(ADMIN_EMAIL, MOCK.contact),
    ),
  );

  // C19. Alertă job — rezervări expirate automat (array de 2)
  results.push(
    await run("C19 | Alertă admin — Job expirare rezervări (2 rezervări)", () =>
      email.sendAdminExpiredBookingsAlert(
        ADMIN_EMAIL,
        MOCK.expiredBookingsList,
      ),
    ),
  );

  // ═══════════════════════════════════════════════════════════════
  // SUMAR
  // ═══════════════════════════════════════════════════════════════

  const passed = results.filter((r) => r.status.startsWith("✅")).length;
  const failed = results.filter((r) => r.status.startsWith("❌")).length;
  const duration = ((Date.now() - startTime) / 1000).toFixed(1);

  console.log(
    `\n🧪 [TEST-ALL-EMAILS] Terminat în ${duration}s — ✅ ${passed} OK | ❌ ${failed} FAILED\n`,
  );
  results.forEach((r) => {
    console.log(`  ${r.status} ${r.label}${r.error ? ` → ${r.error}` : ""}`);
  });

  res.json({
    summary: {
      total: results.length,
      passed,
      failed,
      duration: `${duration}s`,
      testEmail: TEST_CLIENT_EMAIL,
      adminEmail: ADMIN_EMAIL,
    },
    results,
  });
});

const SCENARIOS = {
  "A1-confirmation-full": [
    "A1-RO | Confirmare Stripe integral",
    () =>
      email.sendClientBookingConfirmation(
        TEST_CLIENT_EMAIL,
        MOCK.bookingFull,
        "ro",
      ),
  ],
  "A1-confirmation-full-en": [
    "A1-EN | Stripe full payment confirmation",
    () =>
      email.sendClientBookingConfirmation(
        TEST_CLIENT_EMAIL,
        MOCK.bookingFull,
        "en",
      ),
  ],
  "A2-confirmation-advance": [
    "A2-RO | Confirmare avans",
    () =>
      email.sendClientBookingConfirmation(
        TEST_CLIENT_EMAIL,
        MOCK.bookingAdvance,
        "ro",
      ),
  ],
  "A2-confirmation-advance-en": [
    "A2-EN | Advance confirmation",
    () =>
      email.sendClientBookingConfirmation(
        TEST_CLIENT_EMAIL,
        MOCK.bookingAdvance,
        "en",
      ),
  ],
  "A3-bank-b2b": [
    "A3-RO | Transfer bancar B2B",
    () =>
      email.sendBankTransferInstructions(
        TEST_CLIENT_EMAIL,
        MOCK.bookingBankB2B,
        "ro",
      ),
  ],
  "A3-bank-b2b-en": [
    "A3-EN | Bank transfer B2B",
    () =>
      email.sendBankTransferInstructions(
        TEST_CLIENT_EMAIL,
        MOCK.bookingBankB2B,
        "en",
      ),
  ],
  "A4-cancel": [
    "A4-RO | Anulare",
    () =>
      email.sendBookingCancellation(
        TEST_CLIENT_EMAIL,
        MOCK.bookingCancelled1,
        "ro",
      ),
  ],
  "A4-cancel-en": [
    "A4-EN | Cancellation",
    () =>
      email.sendBookingCancellation(
        TEST_CLIENT_EMAIL,
        MOCK.bookingCancelled1,
        "en",
      ),
  ],
  "A6-reminder": [
    "A6-RO | Reminder check-in",
    () =>
      email.sendCheckInReminder(TEST_CLIENT_EMAIL, MOCK.bookingReminder, "ro"),
  ],
  "A6-reminder-en": [
    "A6-EN | Check-in reminder",
    () =>
      email.sendCheckInReminder(TEST_CLIENT_EMAIL, MOCK.bookingReminder, "en"),
  ],
  "A7-review-request": [
    "A7-RO | Solicitare recenzie",
    () => email.sendReviewRequest(TEST_CLIENT_EMAIL, MOCK.bookingReview, "ro"),
  ],
  "A7-review-request-en": [
    "A7-EN | Review request",
    () => email.sendReviewRequest(TEST_CLIENT_EMAIL, MOCK.bookingReview, "en"),
  ],
  "A8-review-confirm": [
    "A8-RO | Confirmare recenzie (5★)",
    () =>
      email.sendClientReviewConfirmation(
        TEST_CLIENT_EMAIL,
        {
          guestName: "Test Guest",
          rating: 5,
          roomName: "Camera 4 — Comfort",
          autoApproved: true,
        },
        "ro",
      ),
  ],
  "A8-review-confirm-en": [
    "A8-EN | Review confirmation (5★)",
    () =>
      email.sendClientReviewConfirmation(
        TEST_CLIENT_EMAIL,
        {
          guestName: "Test Guest",
          rating: 5,
          roomName: "Camera 4 — Comfort",
          autoApproved: true,
        },
        "en",
      ),
  ],
  "A9-expired": [
    "A9-RO | Expirare rezervare",
    () =>
      email.sendBookingExpired(TEST_CLIENT_EMAIL, MOCK.bookingExpired, "ro"),
  ],
  "A9-expired-en": [
    "A9-EN | Booking expiry",
    () =>
      email.sendBookingExpired(TEST_CLIENT_EMAIL, MOCK.bookingExpired, "en"),
  ],
  "B10-welcome": [
    "B10-RO | Bun venit",
    () => email.sendWelcomeEmail(TEST_CLIENT_EMAIL, "Test User", "ro"),
  ],
  "B10-welcome-en": [
    "B10-EN | Welcome",
    () => email.sendWelcomeEmail(TEST_CLIENT_EMAIL, "Test User", "en"),
  ],
  "B11-password": [
    "B11-RO | Schimbare parolă",
    () => email.sendPasswordChangedEmail(TEST_CLIENT_EMAIL, "Test User", "ro"),
  ],
  "B11-password-en": [
    "B11-EN | Password change",
    () => email.sendPasswordChangedEmail(TEST_CLIENT_EMAIL, "Test User", "en"),
  ],
  "B12-deleted": [
    "B12-RO | Ștergere cont",
    () => email.sendAccountDeletedEmail(TEST_CLIENT_EMAIL, "Test User", "ro"),
  ],
  "B12-deleted-en": [
    "B12-EN | Account deleted",
    () => email.sendAccountDeletedEmail(TEST_CLIENT_EMAIL, "Test User", "en"),
  ],
  "B13-contact": [
    "B13-RO | Confirmare contact",
    () =>
      email.sendClientContactConfirmation(TEST_CLIENT_EMAIL, "Test User", "ro"),
  ],
  "B13-contact-en": [
    "B13-EN | Contact confirmation",
    () =>
      email.sendClientContactConfirmation(TEST_CLIENT_EMAIL, "Test User", "en"),
  ],
  "C14-admin-booking": [
    "C14 | Admin alertă rezervare",
    () =>
      email.sendAdminNewBookingAlert(ADMIN_EMAIL, {
        ...MOCK.bookingFull,
        guestEmail: TEST_CLIENT_EMAIL,
        paymentMethod: "💳 Card",
      }),
  ],
  "C16-admin-cancel": [
    "C16 | Admin alertă anulare",
    () =>
      email.sendAdminCancellationAlert(ADMIN_EMAIL, {
        ...MOCK.bookingCancelled1,
        guestEmail: TEST_CLIENT_EMAIL,
        reason: "Planuri schimbate",
      }),
  ],
  "C19-admin-expired": [
    "C19 | Admin job expirare",
    () =>
      email.sendAdminExpiredBookingsAlert(
        ADMIN_EMAIL,
        MOCK.expiredBookingsList,
      ),
  ],
};

// GET /api/test-emails/list — listează toate scenariile
router.get("/list", (req, res) => {
  const list = Object.entries(SCENARIOS).map(([key, [label]]) => ({
    key,
    label,
  }));
  res.json({ total: list.length, scenarios: list });
});

// GET /api/test-emails/send/:key — trimite un singur scenariu
router.get("/send/:key", async (req, res) => {
  const { key } = req.params;
  const scenario = SCENARIOS[key];
  if (!scenario) {
    return res.status(404).json({
      error: `Scenariul "${key}" nu există.`,
      available: Object.keys(SCENARIOS),
    });
  }
  const [label, fn] = scenario;
  try {
    await fn();
    res.json({ status: "✅ OK", label, key });
  } catch (err) {
    res
      .status(500)
      .json({ status: "❌ FAILED", label, key, error: err.message });
  }
});

module.exports = router;
