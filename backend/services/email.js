/**
 * services/email.js — Serviciul centralizat de notificări prin e-mail
 *
 * ═══════════════════════════════════════════════════════════════════
 * ARHITECTURĂ & PRINCIPII DE DESIGN
 * ═══════════════════════════════════════════════════════════════════
 *
 * 1. SINGLE RESPONSIBILITY: Fiecare funcție trimite UN singur tip de email.
 * 2. NON-BLOCKING: Apelantul folosește .catch() → eșecul emailului nu
 * afectează fluxul principal (rezervarea rămâne salvată).
 * 3. INLINE CSS: Obligatoriu pentru Gmail/Outlook/Yahoo/Apple Mail.
 * 4. SINGLETON TRANSPORTER: Creat o dată, reutilizat (connection pool).
 *
 * ═══════════════════════════════════════════════════════════════════
 * FUNCȚII EXPORTATE
 * ═══════════════════════════════════════════════════════════════════
 *
 * CLIENT:
 * sendClientBookingConfirmation(email, bookingData)
 * sendWelcomeEmail(email, name)
 * sendBookingCancellation(email, bookingData)
 * sendCheckInReminder(email, bookingData)
 *
 * ADMIN:
 * sendAdminNewBookingAlert(adminEmail, bookingData)
 * sendAdminContactMessage(adminEmail, contactData)
 *
 * UTILITAR:
 * verifyConnection()
 *
 * ═══════════════════════════════════════════════════════════════════
 * VARIABILE .env
 * ═══════════════════════════════════════════════════════════════════
 * EMAIL_USER=adresa@gmail.com
 * EMAIL_PASS=xxxx xxxx xxxx xxxx
 * EMAIL_FROM="Maramureș Belvedere <adresa@gmail.com>"
 * ADMIN_EMAIL=admin@pensiune.ro
 */

"use strict";

require("dotenv").config();
const nodemailer = require("nodemailer");

// ─── Detectare provider SMTP ──────────────────────────────────────────────────
function detectEmailService(email = "") {
  if (email.includes("@yahoo.")) return "yahoo";
  if (email.includes("@gmail.")) return "gmail";
  return "gmail";
}

const EMAIL_USER = process.env.EMAIL_USER || "";
const EMAIL_SERVICE = detectEmailService(EMAIL_USER);

// ─── Transporter singleton ────────────────────────────────────────────────────
const transporter = nodemailer.createTransport({
  service: EMAIL_SERVICE,
  auth: {
    user: EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
  pool: true,
  maxConnections: 3,
  rateDelta: 1000,
  rateLimit: 5,
});

console.log(
  `📧 Email service: ${EMAIL_SERVICE} (${EMAIL_USER || "neconfigurat"})`,
);

// ─── Branding ─────────────────────────────────────────────────────────────────
const BRAND = {
  name: "Maramureș Belvedere",
  color: "#2d5a3d",
  accent: "#c9a96e",
  light: "#f9f8f6",
  address: "Strada Principală 42, Petrova, Maramureș",
  phone: "+40 755 123 456",
  email: process.env.ADMIN_EMAIL || "contact@belvedere-maramures.ro",
  website: (process.env.FRONTEND_URL || "http://localhost:5173").split(",")[0],
};

// ─── Helper: layout HTML ──────────────────────────────────────────────────────
function wrapLayout(content, previewText = "") {
  return `<!DOCTYPE html>
<html lang="ro">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1.0"/>
  <title>${BRAND.name}</title>
</head>
<body style="margin:0;padding:0;background:#f0ede8;font-family:Georgia,serif;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;">${previewText}&nbsp;‌</div>
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f0ede8;padding:32px 16px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0"
             style="max-width:600px;width:100%;border-radius:12px;overflow:hidden;
                    box-shadow:0 4px 24px rgba(0,0,0,0.08);">
        <tr>
          <td style="background:${BRAND.color};padding:36px 40px;text-align:center;">
            <p style="margin:0 0 4px;font-size:10px;letter-spacing:4px;
                      text-transform:uppercase;color:rgba(255,255,255,0.55);">PENSIUNEA</p>
            <h1 style="margin:0;font-size:28px;font-weight:400;color:#fff;letter-spacing:1px;">
              ${BRAND.name}
            </h1>
            <div style="width:48px;height:1px;background:${BRAND.accent};margin:20px auto 0;"></div>
          </td>
        </tr>
        <tr>
          <td style="background:#ffffff;padding:40px;">${content}</td>
        </tr>
        <tr>
          <td style="background:${BRAND.light};padding:24px 40px;text-align:center;
                     border-top:1px solid #eeece8;">
            <p style="margin:0 0 6px;font-size:12px;color:#999;font-family:Arial,sans-serif;">
              ${BRAND.address}
            </p>
            <p style="margin:0;font-size:12px;color:#999;font-family:Arial,sans-serif;">
              <a href="tel:${BRAND.phone}" style="color:#999;text-decoration:none;">${BRAND.phone}</a>
              &nbsp;·&nbsp;
              <a href="mailto:${BRAND.email}" style="color:#999;text-decoration:none;">${BRAND.email}</a>
            </p>
            <p style="margin:16px 0 0;font-size:11px;color:#bbb;font-family:Arial,sans-serif;">
              © ${new Date().getFullYear()} ${BRAND.name}
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

// ─── Helper: tabel sumar rezervare ───────────────────────────────────────────
function bookingTable(data) {
  const { bookingRef, roomName, checkIn, checkOut, nights, totalPrice } = data;
  const rows = [
    [
      "Referință",
      `<strong style="color:${BRAND.color};">${bookingRef}</strong>`,
    ],
    ["Cameră", roomName],
    [
      "Check-in",
      `${checkIn} <span style="color:#999;font-size:12px;">(după 14:00)</span>`,
    ],
    [
      "Check-out",
      `${checkOut} <span style="color:#999;font-size:12px;">(până la 11:00)</span>`,
    ],
    ["Nopți", `${nights}`],
    ["Total plătit", `<strong>${totalPrice} RON</strong>`],
  ];
  return `
    <table width="100%" cellpadding="0" cellspacing="0"
           style="background:${BRAND.light};border-radius:8px;margin:24px 0;border:1px solid #eeece8;">
      ${rows
        .map(
          ([l, v], i) => `
        <tr style="border-bottom:${i < rows.length - 1 ? "1px solid #eeece8" : "none"};">
          <td style="padding:12px 20px;font-size:12px;color:#888;font-family:Arial,sans-serif;width:40%;">${l}</td>
          <td style="padding:12px 20px;font-size:14px;color:#333;font-family:Arial,sans-serif;">${v}</td>
        </tr>`,
        )
        .join("")}
    </table>`;
}

// ─── Helper: buton CTA ────────────────────────────────────────────────────────
function ctaButton(text, url) {
  return `
    <div style="text-align:center;margin:28px 0 8px;">
      <a href="${url}" style="display:inline-block;background:${BRAND.color};color:#fff;
         text-decoration:none;padding:14px 36px;border-radius:8px;
         font-size:14px;font-family:Arial,sans-serif;font-weight:500;">
        ${text}
      </a>
    </div>`;
}

// ─── Helper: titlu secțiune ───────────────────────────────────────────────────
function sectionTitle(icon, title) {
  return `
    <div style="text-align:center;margin-bottom:28px;">
      <div style="display:inline-block;width:56px;height:56px;border-radius:50%;
                  line-height:56px;font-size:24px;background:${BRAND.light};margin-bottom:16px;">
        ${icon}
      </div>
      <h2 style="margin:0;font-size:22px;font-weight:400;color:#1a1a1a;">${title}</h2>
    </div>`;
}

// ═════════════════════════════════════════════════════════════════════════════
//  1. CONFIRMARE REZERVARE → CLIENT
// ═════════════════════════════════════════════════════════════════════════════
/**
 * Trimis clientului după plata Stripe (webhook checkout.session.completed).
 * Conține: sumar rezervare + informații practice (parcare, WiFi, mic dejun).
 */
async function sendClientBookingConfirmation(clientEmail, bookingData) {
  const { guestName } = bookingData;

  const content = `
    ${sectionTitle("✓", "Rezervare Confirmată!")}
    <p style="margin:0 0 8px;font-size:14px;color:#888;text-align:center;font-family:Arial,sans-serif;">
      Plata a fost procesată cu succes
    </p>
    <p style="margin:24px 0 4px;font-size:15px;color:#444;font-family:Arial,sans-serif;line-height:1.7;">
      Dragă <strong>${guestName}</strong>,<br/>
      Suntem încântați să vă confirmăm rezervarea. Vă așteptăm cu drag în Maramureș!
    </p>
    ${bookingTable(bookingData)}
    <table width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 24px;">
      ${[
        ["🚗", "Parcare", "Gratuită, supravegheată"],
        ["📶", "WiFi", "Parolă la recepție"],
        ["🍳", "Mic dejun", "08:00–10:00, inclus"],
        ["📞", "Recepție", BRAND.phone],
      ]
        .map(
          ([i, l, v]) => `
        <tr>
          <td style="padding:7px 4px;font-size:18px;width:32px;">${i}</td>
          <td style="padding:7px 8px;font-size:12px;color:#888;font-family:Arial,sans-serif;width:28%;">${l}</td>
          <td style="padding:7px 4px;font-size:13px;color:#555;font-family:Arial,sans-serif;">${v}</td>
        </tr>`,
        )
        .join("")}
    </table>
    ${ctaButton("Gestionează Rezervarea", `${BRAND.website}/account`)}
    <p style="margin:20px 0 0;font-size:12px;color:#aaa;text-align:center;font-family:Arial,sans-serif;">
      Întrebări? <a href="mailto:${BRAND.email}" style="color:${BRAND.color};">${BRAND.email}</a>
    </p>`;

  await transporter.sendMail({
    from: process.env.EMAIL_FROM || `"${BRAND.name}" <${EMAIL_USER}>`,
    to: clientEmail,
    subject: `✓ Rezervare confirmată — ${bookingData.bookingRef} | ${BRAND.name}`,
    html: wrapLayout(
      content,
      `Rezervarea ${bookingData.bookingRef} confirmată! Check-in: ${bookingData.checkIn}`,
    ),
  });

  console.log(
    `📧 [CLIENT] Confirmare rezervare → ${clientEmail} (${bookingData.bookingRef})`,
  );
}

// ═════════════════════════════════════════════════════════════════════════════
//  2. ALERTĂ REZERVARE NOUĂ → ADMIN
// ═════════════════════════════════════════════════════════════════════════════
/**
 * Trimis adminului SIMULTAN cu emailul clientului (Promise.allSettled).
 * Conține: date complete client + sumar rezervare + link panou admin.
 * Reply-to setat la clientul care a rezervat.
 */
async function sendAdminNewBookingAlert(adminEmail, bookingData) {
  const {
    guestName,
    guestEmail,
    guestPhone,
    bookingRef,
    roomName,
    checkIn,
    checkOut,
    nights,
    totalPrice,
  } = bookingData;

  const content = `
    ${sectionTitle("🔔", "Rezervare Nouă Primită!")}
    <p style="margin:0 0 24px;font-size:14px;color:#555;text-align:center;font-family:Arial,sans-serif;">
      O nouă rezervare a fost finalizată și plătită prin Stripe.
    </p>
    <h3 style="margin:0 0 10px;font-size:11px;font-weight:600;color:#888;
                font-family:Arial,sans-serif;text-transform:uppercase;letter-spacing:1.5px;">
      Date Client
    </h3>
    <table width="100%" cellpadding="0" cellspacing="0"
           style="background:${BRAND.light};border-radius:8px;margin:0 0 20px;border:1px solid #eeece8;">
      ${[
        ["Nume", guestName],
        [
          "Email",
          `<a href="mailto:${guestEmail}" style="color:${BRAND.color};">${guestEmail}</a>`,
        ],
        ["Telefon", guestPhone || "—"],
      ]
        .map(
          ([l, v]) => `
        <tr style="border-bottom:1px solid #eeece8;">
          <td style="padding:10px 20px;font-size:12px;color:#888;font-family:Arial,sans-serif;width:35%;">${l}</td>
          <td style="padding:10px 20px;font-size:14px;color:#333;font-family:Arial,sans-serif;">${v}</td>
        </tr>`,
        )
        .join("")}
    </table>
    <h3 style="margin:0 0 10px;font-size:11px;font-weight:600;color:#888;
                font-family:Arial,sans-serif;text-transform:uppercase;letter-spacing:1.5px;">
      Detalii Rezervare
    </h3>
    ${bookingTable({ bookingRef, roomName, checkIn, checkOut, nights, totalPrice })}
    ${ctaButton("Vezi în Panoul Admin", `${BRAND.website}/admin/bookings`)}
    <p style="margin:16px 0 0;font-size:11px;color:#bbb;text-align:center;font-family:Arial,sans-serif;">
      Generat automat la ${new Date().toLocaleString("ro-RO")}
    </p>`;

  await transporter.sendMail({
    from: process.env.EMAIL_FROM || `"${BRAND.name}" <${EMAIL_USER}>`,
    to: adminEmail,
    replyTo: `"${guestName}" <${guestEmail}>`,
    subject: `🔔 Rezervare nouă — ${bookingRef} | ${guestName} | ${totalPrice} RON`,
    html: wrapLayout(
      content,
      `Rezervare nouă de la ${guestName} pentru ${roomName}`,
    ),
  });

  console.log(`📧 [ADMIN] Alertă rezervare → ${adminEmail} (${bookingRef})`);
}

// ═════════════════════════════════════════════════════════════════════════════
//  3. MESAJ CONTACT → ADMIN
// ═════════════════════════════════════════════════════════════════════════════
/**
 * Redirecționează mesajul din formularul de contact.
 * replyTo setat la vizitatorul → adminul poate răspunde direct cu Reply.
 */
async function sendAdminContactMessage(adminEmail, contactData) {
  const { name, email, phone, subject, message } = contactData;

  const content = `
    ${sectionTitle("✉️", "Mesaj Nou de Contact")}
    <p style="margin:0 0 24px;font-size:14px;color:#555;text-align:center;font-family:Arial,sans-serif;">
      Un vizitator a completat formularul de contact de pe site.
    </p>
    <table width="100%" cellpadding="0" cellspacing="0"
           style="background:${BRAND.light};border-radius:8px;margin:0 0 20px;border:1px solid #eeece8;">
      ${[
        ["Nume", name],
        [
          "Email",
          `<a href="mailto:${email}" style="color:${BRAND.color};">${email}</a>`,
        ],
        ["Telefon", phone || "—"],
        ["Subiect", subject || "—"],
      ]
        .map(
          ([l, v]) => `
        <tr style="border-bottom:1px solid #eeece8;">
          <td style="padding:10px 20px;font-size:12px;color:#888;font-family:Arial,sans-serif;width:35%;">${l}</td>
          <td style="padding:10px 20px;font-size:14px;color:#333;font-family:Arial,sans-serif;">${v}</td>
        </tr>`,
        )
        .join("")}
    </table>
    <h3 style="margin:0 0 10px;font-size:11px;font-weight:600;color:#888;
                font-family:Arial,sans-serif;text-transform:uppercase;letter-spacing:1.5px;">
      Mesaj
    </h3>
    <div style="background:${BRAND.light};border-radius:8px;padding:20px;
                border-left:3px solid ${BRAND.color};margin:0 0 24px;">
      <p style="margin:0;font-size:14px;color:#444;font-family:Arial,sans-serif;
                 line-height:1.8;white-space:pre-wrap;">${message}</p>
    </div>
    ${ctaButton(`Răspunde lui ${name}`, `mailto:${email}`)}
    <p style="margin:16px 0 0;font-size:11px;color:#bbb;text-align:center;font-family:Arial,sans-serif;">
      Apasă Reply pentru a răspunde direct vizitatorului.
    </p>`;

  await transporter.sendMail({
    from: process.env.EMAIL_FROM || `"${BRAND.name}" <${EMAIL_USER}>`,
    to: adminEmail,
    replyTo: `"${name}" <${email}>`,
    subject: `✉️ Contact de la ${name}${subject ? ` — ${subject}` : ""}`,
    html: wrapLayout(
      content,
      `Mesaj de la ${name}: ${(message || "").substring(0, 80)}`,
    ),
  });

  console.log(`📧 [ADMIN] Mesaj contact → ${adminEmail} (de la: ${email})`);
}

// ═════════════════════════════════════════════════════════════════════════════
//  4. BUN VENIT → CLIENT
// ═════════════════════════════════════════════════════════════════════════════
async function sendWelcomeEmail(userEmail, name) {
  const content = `
    ${sectionTitle("🌿", `Bun venit, ${name}!`)}
    <p style="margin:0 0 24px;font-size:14px;color:#888;text-align:center;font-family:Arial,sans-serif;">
      Contul tău a fost creat cu succes
    </p>
    <table width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 28px;">
      ${[
        ["✓", "Rezervă camere rapid, fără date repetate"],
        ["✓", "Urmărești toate rezervările într-un singur loc"],
        ["✓", "Primești confirmări și remindere automate"],
      ]
        .map(
          ([i, t]) => `
        <tr>
          <td style="padding:8px 12px;font-size:16px;color:${BRAND.color};width:28px;vertical-align:top;">${i}</td>
          <td style="padding:8px 0;font-size:14px;color:#555;font-family:Arial,sans-serif;line-height:1.6;">${t}</td>
        </tr>`,
        )
        .join("")}
    </table>
    ${ctaButton("Explorează Camerele", `${BRAND.website}/rooms`)}`;

  await transporter.sendMail({
    from: process.env.EMAIL_FROM || `"${BRAND.name}" <${EMAIL_USER}>`,
    to: userEmail,
    subject: `Bun venit la ${BRAND.name}! 🌿`,
    html: wrapLayout(content, `Contul tău a fost creat. Bun venit, ${name}!`),
  });

  console.log(`📧 [CLIENT] Welcome → ${userEmail}`);
}

// ═════════════════════════════════════════════════════════════════════════════
//  5. ANULARE REZERVARE → CLIENT
// ═════════════════════════════════════════════════════════════════════════════
async function sendBookingCancellation(userEmail, bookingData) {
  const { guestName } = bookingData;
  const content = `
    ${sectionTitle("✕", "Rezervare Anulată")}
    <p style="margin:0 0 24px;font-size:15px;color:#444;font-family:Arial,sans-serif;line-height:1.7;">
      Dragă <strong>${guestName}</strong>,<br/>
      Rezervarea ta a fost anulată. Dacă e o greșeală, contactează-ne.
    </p>
    ${bookingTable(bookingData)}
    ${ctaButton("Fă o Nouă Rezervare", `${BRAND.website}/booking`)}`;

  await transporter.sendMail({
    from: process.env.EMAIL_FROM || `"${BRAND.name}" <${EMAIL_USER}>`,
    to: userEmail,
    subject: `Rezervare anulată — ${bookingData.bookingRef} | ${BRAND.name}`,
    html: wrapLayout(
      content,
      `Rezervarea ${bookingData.bookingRef} a fost anulată.`,
    ),
  });

  console.log(`📧 [CLIENT] Anulare → ${userEmail} (${bookingData.bookingRef})`);
}

// ═════════════════════════════════════════════════════════════════════════════
//  6. REMINDER CHECK-IN → CLIENT (cron job zilnic 10:00)
// ═════════════════════════════════════════════════════════════════════════════
async function sendCheckInReminder(userEmail, bookingData) {
  const { guestName, roomName, checkIn } = bookingData;
  const content = `
    ${sectionTitle("🏔️", "Ne vedem mâine!")}
    <p style="margin:0 0 24px;font-size:15px;color:#444;font-family:Arial,sans-serif;line-height:1.7;">
      Dragă <strong>${guestName}</strong>,<br/>
      Abia așteptăm să vă primim mâine la <strong>${roomName}</strong>!
    </p>
    <table width="100%" cellpadding="0" cellspacing="0"
           style="background:${BRAND.light};border-radius:8px;margin:0 0 24px;border:1px solid #eeece8;">
      ${[
        ["🕑", "Check-in", `Mâine, ${checkIn}, după 14:00`],
        ["🚗", "Parcare", "Gratuită, intrați direct în curte"],
        ["🍳", "Mic dejun", "08:00–10:00, inclus"],
        ["📞", "Recepție", BRAND.phone],
      ]
        .map(
          ([i, l, v]) => `
        <tr style="border-bottom:1px solid #eeece8;">
          <td style="padding:12px 16px;font-size:20px;width:40px;">${i}</td>
          <td style="padding:12px 8px;font-size:12px;color:#888;font-family:Arial,sans-serif;width:30%;">${l}</td>
          <td style="padding:12px 16px;font-size:13px;color:#555;font-family:Arial,sans-serif;">${v}</td>
        </tr>`,
        )
        .join("")}
    </table>
    ${ctaButton("Vezi Rezervarea", `${BRAND.website}/account`)}`;

  await transporter.sendMail({
    from: process.env.EMAIL_FROM || `"${BRAND.name}" <${EMAIL_USER}>`,
    to: userEmail,
    subject: `🏔️ Ne vedem mâine! Check-in ${checkIn} — ${BRAND.name}`,
    html: wrapLayout(
      content,
      `Check-in mâine la ${roomName}. Vă așteptăm după 14:00!`,
    ),
  });

  console.log(`📧 [CLIENT] Reminder check-in → ${userEmail} (${checkIn})`);
}

// ═════════════════════════════════════════════════════════════════════════════
//  7. CONFIRMARE CONTACT → CLIENT
// ═════════════════════════════════════════════════════════════════════════════
/**
 * Trimis clientului după ce completează formularul de contact.
 * Îl asigură că mesajul a fost primit și că va fi contactat în curând.
 */
async function sendClientContactConfirmation(clientEmail, name) {
  const content = `
    ${sectionTitle("✉️", "Mesaj Primit!")}
    <p style="margin:0 0 24px;font-size:14px;color:#888;text-align:center;font-family:Arial,sans-serif;">
      Îți mulțumim că ne-ai contactat
    </p>
    <p style="margin:0 0 24px;font-size:15px;color:#444;font-family:Arial,sans-serif;line-height:1.7;">
      Dragă <strong>${name}</strong>,<br/><br/>
      Am primit mesajul tău și îți vom răspunde în cel mai scurt timp,
      de obicei în maximum 24 de ore.
    </p>
    <div style="background:${BRAND.light};border-radius:8px;padding:20px;margin:0 0 24px;
                border-left:3px solid ${BRAND.color};text-align:center;">
      <p style="margin:0;font-size:14px;color:#555;font-family:Arial,sans-serif;">
        Pentru urgențe ne poți contacta direct la<br/>
        <strong>${BRAND.phone}</strong>
      </p>
    </div>
    ${ctaButton("Explorează Camerele", BRAND.website + "/rooms")}`;

  await transporter.sendMail({
    from: process.env.EMAIL_FROM || `"${BRAND.name}" <${EMAIL_USER}>`,
    to: clientEmail,
    subject: `Mesajul tău a fost primit — ${BRAND.name}`,
    html: wrapLayout(
      content,
      "Am primit mesajul tau. Iti vom raspunde in 24 de ore!",
    ),
  });

  console.log(`📧 [CLIENT] Confirmare contact → ${clientEmail}`);
}

// ═════════════════════════════════════════════════════════════════════════════
//  VERIFICARE CONEXIUNE SMTP
// ═════════════════════════════════════════════════════════════════════════════
async function verifyConnection() {
  if (!EMAIL_USER || !process.env.EMAIL_PASS) {
    console.warn("⚠️  Email dezactivat — EMAIL_USER sau EMAIL_PASS lipsesc");
    return false;
  }
  try {
    await transporter.verify();
    console.log(`✅ Email service conectat (${EMAIL_USER})`);
    return true;
  } catch (err) {
    console.error("❌ Email SMTP error:", err.message);
    return false;
  }
}

// ═════════════════════════════════════════════════════════════════════════════
//  8. NOTIFICARE SCHIMBARE PAROLĂ → CLIENT
// ═════════════════════════════════════════════════════════════════════════════
async function sendPasswordChangedEmail(userEmail, name) {
  const content = `
    ${sectionTitle("🔐", "Parola a fost schimbată")}
    <p style="margin:0 0 24px;font-size:14px;color:#888;text-align:center;font-family:Arial,sans-serif;">
      Securitatea contului tău
    </p>
    <p style="margin:0 0 24px;font-size:15px;color:#444;font-family:Arial,sans-serif;line-height:1.7;">
      Dragă <strong>${name}</strong>,<br/><br/>
      Parola contului tău a fost schimbată cu succes.
    </p>
    <div style="background:#fff8f0;border-radius:8px;padding:20px;margin:0 0 24px;border-left:3px solid #e8733a;">
      <p style="margin:0;font-size:14px;color:#555;font-family:Arial,sans-serif;">
        ⚠️ Dacă nu tu ai făcut această schimbare, contactează-ne imediat la<br/>
        <strong>${BRAND.phone}</strong> sau <a href="mailto:${BRAND.email}" style="color:${BRAND.color};">${BRAND.email}</a>
      </p>
    </div>
    ${ctaButton("Mergi la Contul Meu", BRAND.website + "/account")}`;

  await transporter.sendMail({
    from: process.env.EMAIL_FROM || `"${BRAND.name}" <${EMAIL_USER}>`,
    to: userEmail,
    subject: `🔐 Parola contului tău a fost schimbată — ${BRAND.name}`,
    html: wrapLayout(content, "Parola ta a fost schimbată cu succes."),
  });

  console.log(`📧 [CLIENT] Notificare schimbare parolă → ${userEmail}`);
}

// ═════════════════════════════════════════════════════════════════════════════
//  9. CONFIRMARE ȘTERGERE CONT → CLIENT
// ═════════════════════════════════════════════════════════════════════════════
async function sendAccountDeletedEmail(userEmail, name) {
  const content = `
    ${sectionTitle("👋", "Contul tău a fost șters")}
    <p style="margin:0 0 24px;font-size:14px;color:#888;text-align:center;font-family:Arial,sans-serif;">
      Ne pare rău să te vedem plecând
    </p>
    <p style="margin:0 0 24px;font-size:15px;color:#444;font-family:Arial,sans-serif;line-height:1.7;">
      Dragă <strong>${name}</strong>,<br/><br/>
      Contul tău a fost șters cu succes. Toate datele tale personale au fost eliminate din sistemul nostru.
    </p>
    <div style="background:${BRAND.light};border-radius:8px;padding:20px;margin:0 0 24px;border-left:3px solid ${BRAND.color};">
      <p style="margin:0;font-size:14px;color:#555;font-family:Arial,sans-serif;">
        Dacă te răzgândești, poți oricând să îți creezi un cont nou.<br/>
        Îți mulțumim că ai ales <strong>${BRAND.name}</strong>!
      </p>
    </div>
    ${ctaButton("Vizitează-ne din nou", BRAND.website)}`;

  await transporter.sendMail({
    from: process.env.EMAIL_FROM || `"${BRAND.name}" <${EMAIL_USER}>`,
    to: userEmail,
    subject: `Contul tău ${BRAND.name} a fost șters`,
    html: wrapLayout(
      content,
      "Contul tău a fost șters. Datele tale personale au fost eliminate.",
    ),
  });

  console.log(`📧 [CLIENT] Confirmare ștergere cont → ${userEmail}`);
}

// =============================================================================
//  RECENZIE NOUĂ → ADMIN
// =============================================================================
async function sendAdminNewReviewAlert(adminEmail, reviewData) {
  const { guestName, guestEmail, rating, text, roomName, autoApproved } =
    reviewData;

  // Stele vizuale
  const starsHTML = Array.from(
    { length: 5 },
    (_, i) =>
      `<span style="font-size:24px;color:${i < rating ? "#d4a547" : "#ddd"};">&#9733;</span>`,
  ).join("");

  const content = `
    ${sectionTitle("⭐", "Recenzie Nouă")}
    <p style="margin:0 0 24px;font-size:14px;color:#555;text-align:center;font-family:Arial,sans-serif;">
      Un oaspete a lăsat o recenzie pe site. Verificați și aprobați-o din panoul de administrare.
    </p>

    <div style="text-align:center;margin:0 0 24px;">
      ${starsHTML}
      <p style="margin:8px 0 0;font-size:13px;font-weight:600;color:#d4a547;font-family:Arial,sans-serif;">
        ${rating}/5 stele
      </p>
    </div>

    <table width="100%" cellpadding="0" cellspacing="0"
           style="background:${BRAND.light};border-radius:8px;margin:0 0 20px;border:1px solid #eeece8;">
      ${[
        ["Oaspete", guestName],
        [
          "Email",
          `<a href="mailto:${guestEmail}" style="color:${BRAND.color};">${guestEmail}</a>`,
        ],
        ["Camera", roomName || "—"],
        ["Rating", `${rating}/5 stele`],
      ]
        .map(
          ([l, v]) => `
        <tr style="border-bottom:1px solid #eeece8;">
          <td style="padding:10px 20px;font-size:12px;color:#888;font-family:Arial,sans-serif;width:35%;">${l}</td>
          <td style="padding:10px 20px;font-size:14px;color:#333;font-family:Arial,sans-serif;">${v}</td>
        </tr>`,
        )
        .join("")}
    </table>

    <h3 style="margin:0 0 10px;font-size:11px;font-weight:600;color:#888;
                font-family:Arial,sans-serif;text-transform:uppercase;letter-spacing:1.5px;">
      Recenzia
    </h3>
    <div style="background:${BRAND.light};border-radius:8px;padding:20px;
                border-left:3px solid #d4a547;margin:0 0 24px;">
      <p style="margin:0;font-size:15px;color:#444;font-family:Arial,sans-serif;
                 line-height:1.9;font-style:italic;">"${text}"</p>
    </div>

    ${
      autoApproved
        ? `<p style="margin:0 0 24px;font-size:12px;color:#2e7d4f;text-align:center;font-family:Arial,sans-serif;background:#f0faf4;border-radius:8px;padding:12px;">
            ✅ Recenzia a fost publicată automat (${rating} stele).
         </p>`
        : `<p style="margin:0 0 24px;font-size:12px;color:#b45309;text-align:center;font-family:Arial,sans-serif;background:#fffbeb;border-radius:8px;padding:12px;">
            ⏳ Recenzia este în așteptare — necesită aprobare (${rating} stele).
         </p>
         ${ctaButton("Aprobă Recenzia", BRAND.website + "/admin/reviews")}`
    }
    <p style="margin:16px 0 0;font-size:11px;color:#bbb;text-align:center;font-family:Arial,sans-serif;">
      Puteți răspunde oaspetelui direct la <a href="mailto:${guestEmail}" style="color:${BRAND.color};">${guestEmail}</a>
    </p>`;

  await transporter.sendMail({
    from: process.env.EMAIL_FROM || `"${BRAND.name}" <${EMAIL_USER}>`,
    to: adminEmail,
    replyTo: `"${guestName}" <${guestEmail}>`,
    subject: `${autoApproved ? "⭐" : "⏳"} Recenzie nouă ${rating}/5 — ${guestName}${roomName ? ` (${roomName})` : ""}`,
    html: wrapLayout(
      content,
      `${guestName} a lăsat ${rating} stele: ${text.substring(0, 80)}`,
    ),
  });

  console.log(
    `📧 [ADMIN] Recenzie nouă → ${adminEmail} (de la: ${guestEmail}, rating: ${rating}/5)`,
  );
}

// =============================================================================
//  CONFIRMARE RECENZIE → CLIENT
// =============================================================================
async function sendClientReviewConfirmation(clientEmail, reviewData) {
  const { guestName, rating, roomName, autoApproved } = reviewData;

  const starsHTML = Array.from(
    { length: 5 },
    (_, i) =>
      `<span style="font-size:22px;color:${i < rating ? "#d4a547" : "#ddd"};">&#9733;</span>`,
  ).join("");

  const content = `
    ${sectionTitle("🙏", `Mulțumim, ${guestName}!`)}
    <p style="margin:0 0 24px;font-size:14px;color:#555;text-align:center;font-family:Arial,sans-serif;">
      ${
        autoApproved
          ? "Recenzia dumneavoastră a fost publicată imediat. Mulțumim pentru aprecierea caldă!"
          : "Recenzia dumneavoastră a fost primită și va fi verificată în scurt timp înainte de publicare."
      }
    </p>

    <div style="background:${BRAND.light};border-radius:12px;padding:24px;text-align:center;margin:0 0 24px;border:1px solid #eeece8;">
      ${starsHTML}
      <p style="margin:10px 0 4px;font-size:16px;font-weight:600;color:#333;font-family:Arial,sans-serif;">
        ${rating}/5 stele
      </p>
      ${roomName ? `<p style="margin:0;font-size:13px;color:#888;font-family:Arial,sans-serif;">${roomName}</p>` : ""}
    </div>

    <p style="margin:0 0 24px;font-size:14px;color:#555;text-align:center;font-family:Arial,sans-serif;line-height:1.8;">
      Opinia dumneavoastră ne ajută să îmbunătățim continuu serviciile și să oferim experiențe memorabile 
      tuturor oaspeților noștri. Abia așteptăm să vă revedem la Maramureș Belvedere!
    </p>

    ${ctaButton("Rezervă din Nou", BRAND.website + "/booking")}`;

  await transporter.sendMail({
    from: process.env.EMAIL_FROM || `"${BRAND.name}" <${EMAIL_USER}>`,
    to: clientEmail,
    subject: `🙏 Mulțumim pentru recenzie, ${guestName}!`,
    html: wrapLayout(
      content,
      `Recenzia ta de ${rating} stele a fost primită. Mulțumim!`,
    ),
  });

  console.log(`📧 [CLIENT] Confirmare recenzie → ${clientEmail}`);
}

// =============================================================================
//  SOLICITARE RECENZIE → CLIENT (trimis în ziua check-out)
// =============================================================================
async function sendReviewRequest(clientEmail, bookingData) {
  const { guestName, roomName, checkIn, checkOut, bookingRef } = bookingData;
  const reviewUrl = BRAND.website + "/reviews";

  // Stele interactive — link direct cu rating pre-selectat
  const starsHTML = Array.from({ length: 5 }, (_, i) => {
    const starNum = i + 1;
    const url = `${reviewUrl}?ref=${bookingRef}&stars=${starNum}`;
    return `<a href="${url}" style="text-decoration:none;font-size:32px;color:#ddd;margin:0 2px;transition:color 0.2s;" 
                title="${starNum} stele">&#9733;</a>`;
  }).join("");

  const content = `
    ${sectionTitle("🌟", `Cum a fost sejurul, ${guestName}?`)}
    <p style="margin:0 0 24px;font-size:14px;color:#555;text-align:center;font-family:Arial,sans-serif;line-height:1.8;">
      Sperăm că ați avut parte de o experiență de neuitat la Maramureș Belvedere.<br>
      Câteva cuvinte din partea dumneavoastră ne ajută enorm să creștem și să oferim<br>
      experiențe și mai bune viitorilor oaspeți.
    </p>

    <table width="100%" cellpadding="0" cellspacing="0"
           style="background:${BRAND.light};border-radius:8px;margin:0 0 28px;border:1px solid #eeece8;">
      ${[
        ["Camera", roomName || "—"],
        ["Check-in", checkIn],
        ["Check-out", checkOut],
        ["Rezervare", bookingRef || "—"],
      ]
        .map(
          ([l, v]) => `
        <tr style="border-bottom:1px solid #eeece8;">
          <td style="padding:10px 20px;font-size:12px;color:#888;font-family:Arial,sans-serif;width:35%;">${l}</td>
          <td style="padding:10px 20px;font-size:14px;color:#333;font-family:Arial,sans-serif;">${v}</td>
        </tr>`,
        )
        .join("")}
    </table>

    <h3 style="margin:0 0 12px;font-size:11px;font-weight:600;color:#888;
                font-family:Arial,sans-serif;text-transform:uppercase;letter-spacing:1.5px;text-align:center;">
      Selectați un rating
    </h3>
    <div style="text-align:center;margin:0 0 8px;">
      ${starsHTML}
    </div>
    <p style="margin:0 0 28px;font-size:11px;color:#bbb;text-align:center;font-family:Arial,sans-serif;">
      Apăsați pe o stea pentru a deschide formularul pre-completat
    </p>

    ${ctaButton("Lasă o Recenzie", reviewUrl)}

    <p style="margin:20px 0 0;font-size:12px;color:#bbb;text-align:center;font-family:Arial,sans-serif;">
      Vă mulțumim că ați ales Maramureș Belvedere.<br>
      Abia așteptăm să vă revedem!
    </p>`;

  await transporter.sendMail({
    from: process.env.EMAIL_FROM || `"${BRAND.name}" <${EMAIL_USER}>`,
    to: clientEmail,
    subject: `🌟 Cum a fost sejurul, ${guestName}? Spuneți-ne părerea!`,
    html: wrapLayout(
      content,
      `${guestName}, cum a fost la ${roomName}? Lăsați o recenzie în 1 minut.`,
    ),
  });

  console.log(
    `📧 [CLIENT] Solicitare recenzie → ${clientEmail} (ref: ${bookingRef})`,
  );
}

module.exports = {
  sendClientBookingConfirmation,
  sendClientContactConfirmation,
  sendAdminNewBookingAlert,
  sendAdminContactMessage,
  sendAdminNewReviewAlert,
  sendClientReviewConfirmation,
  sendReviewRequest,
  sendWelcomeEmail,
  sendBookingCancellation,
  sendCheckInReminder,
  sendPasswordChangedEmail,
  sendAccountDeletedEmail,
  verifyConnection,
};
