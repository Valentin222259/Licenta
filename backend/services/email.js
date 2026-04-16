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
const { t } = require("./emailBilingual");

const transporter = nodemailer.createTransport({
  service: EMAIL_SERVICE,
  auth: { user: EMAIL_USER, pass: process.env.EMAIL_PASS },
  pool: true,
  maxConnections: 3,
  rateDelta: 1000,
  rateLimit: 5,
});

console.log(
  `📧 Email service: ${EMAIL_SERVICE} (${EMAIL_USER || "neconfigurat"})`,
);

// ─── Branding & tokens ────────────────────────────────────────────────────────
const B = {
  name: "Maramureș Belvedere",
  green: "#1e4d2b", // verde pădure — header gradient start
  greenMid: "#2d6a3f", // gradient end
  greenLight: "#e8f0ea", // fundal badge verde / banner
  greenBorder: "#b8d4be",
  gold: "#b8973a", // accent auriu
  goldLight: "#f5edd8",
  goldBorder: "#dfc98a",
  orange: "#c0541a", // avertisment
  orangeLight: "#fdf0e8",
  orangeBorder: "#f0b88a",
  red: "#a33025",
  redLight: "#fdf0ee",
  redBorder: "#e8b8b4",
  pageBg: "#f0ede8", // fundal email
  cardBg: "#ffffff",
  rowEven: "#f8f6f2",
  border: "#e0dbd4",
  textH: "#16301d", // heading
  textB: "#3a4a3e", // body
  textM: "#7a8c7e", // muted
  addr: "Str. Hera, Nr. 2, Petrova, Maramureș",
  phone: "+40 262 330 123",
  email: process.env.ADMIN_EMAIL || "contact@belvedere-maramures.ro",
  site: (process.env.FRONTEND_URL || "http://localhost:5173").split(",")[0],
};

// ─── Format dată ──────────────────────────────────────────────────────────────
function fmtDate(s) {
  if (!s) return "—";
  const [y, m, d] = String(s).substring(0, 10).split("-");
  return `${d}/${m}/${y}`;
}

// ═════════════════════════════════════════════════════════════════════════════
//  HELPERS DE LAYOUT
// ═════════════════════════════════════════════════════════════════════════════

/** Wrapper complet HTML — header gradient + footer */
function layout(body, preview = "") {
  return `<!DOCTYPE html>
<html lang="ro">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>${B.name}</title>
</head>
<body style="margin:0;padding:0;background:${B.pageBg};
  font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;">

<div style="display:none;max-height:0;overflow:hidden;font-size:1px;color:${B.pageBg};">
  ${preview}&nbsp;&#8203;&nbsp;&#8203;&nbsp;&#8203;
</div>

<table width="100%" cellpadding="0" cellspacing="0" role="presentation"
  style="background:${B.pageBg};">
<tr><td align="center" style="padding:40px 16px 48px;">

  <table width="600" cellpadding="0" cellspacing="0" role="presentation"
    style="max-width:600px;width:100%;">

    <tr>
      <td style="
        background:linear-gradient(150deg, ${B.green} 0%, ${B.greenMid} 55%, #3a7a50 100%);
        border-radius:18px 18px 0 0;
        padding:44px 48px 40px;
        text-align:center;">

        <div style="display:inline-block;width:52px;height:52px;border-radius:50%;
          border:2px solid rgba(255,255,255,0.25);
          background:rgba(255,255,255,0.1);
          line-height:52px;margin-bottom:18px;">
          <span style="font-size:22px;">🏔️</span>
        </div>

        <p style="margin:0 0 4px;font-size:11px;letter-spacing:6px;
          text-transform:uppercase;color:rgba(255,255,255,0.5);font-weight:400;">
          PENSIUNEA
        </p>
        <h1 style="margin:0;font-size:26px;font-weight:300;letter-spacing:2px;
          color:#ffffff;font-family:Georgia,'Times New Roman',serif;">
          ${B.name}
        </h1>
        <div style="width:36px;height:2px;border-radius:2px;
          background:${B.gold};margin:20px auto 0;"></div>
      </td>
    </tr>

    <tr>
      <td style="background:${B.cardBg};padding:48px 48px 40px;">
        ${body}
      </td>
    </tr>

    <tr>
      <td style="
        background:${B.pageBg};
        border-top:1px solid ${B.border};
        border-radius:0 0 18px 18px;
        padding:28px 48px 32px;
        text-align:center;">
        <p style="margin:0 0 6px;font-size:12px;color:${B.textM};">${B.addr}</p>
        <p style="margin:0 0 18px;font-size:12px;color:${B.textM};">
          <a href="tel:${B.phone}" style="color:${B.textM};text-decoration:none;">${B.phone}</a>
          &nbsp;·&nbsp;
          <a href="mailto:${B.email}" style="color:${B.textM};text-decoration:none;">${B.email}</a>
        </p>
        <p style="margin:0;font-size:11px;color:${B.border};">
          © ${new Date().getFullYear()} ${B.name} · Toate drepturile rezervate
        </p>
      </td>
    </tr>

  </table>
</td></tr>
</table>
</body>
</html>`;
}

/** Bloc titlu centrat cu icon rotund */
function title(icon, heading, sub = "") {
  return `
<div style="text-align:center;margin-bottom:38px;">
  <div style="display:inline-flex;align-items:center;justify-content:center;
    width:68px;height:68px;border-radius:50%;
    background:linear-gradient(135deg,${B.greenLight},${B.greenBorder});
    margin-bottom:20px;font-size:30px;line-height:68px;">
    ${icon}
  </div>
  <h2 style="margin:0 0 8px;font-size:22px;font-weight:600;color:${B.textH};
    font-family:Georgia,serif;letter-spacing:0.4px;">
    ${heading}
  </h2>
  ${sub ? `<p style="margin:0;font-size:13px;color:${B.textM};">${sub}</p>` : ""}
</div>`;
}

/** Salut personalizat */
function hi(name) {
  return `<p style="margin:0 0 22px;font-size:15px;line-height:1.8;color:${B.textB};">
    Bună ziua, <strong style="color:${B.textH};">${name}</strong>,
  </p>`;
}

/** Card detalii rezervare — tabel cu zebra */
function bookingTable(d) {
  const rows = [
    [
      "Referință",
      `<span style="font-weight:700;color:${B.green};font-size:15px;">${d.bookingRef}</span>`,
    ],
    ["Cameră", d.roomName],
    [
      "Check-in",
      `${fmtDate(d.checkIn)}&nbsp;<span style="color:${B.textM};font-size:12px;">· după ora 14:00</span>`,
    ],
    [
      "Check-out",
      `${fmtDate(d.checkOut)}&nbsp;<span style="color:${B.textM};font-size:12px;">· până la 11:00</span>`,
    ],
    ["Nopți", `${d.nights} ${d.nights === 1 ? "noapte" : "nopți"}`],
    [
      "Total",
      `<strong style="font-size:16px;color:${B.textH};">${d.totalPrice} RON</strong>`,
    ],
  ];
  return `
<div style="border-radius:12px;overflow:hidden;border:1px solid ${B.border};margin:28px 0;">
  ${rows
    .map(
      ([l, v], i) => `
  <table width="100%" cellpadding="0" cellspacing="0" role="presentation"
    style="background:${i % 2 === 0 ? B.cardBg : B.rowEven};">
  <tr>
    <td style="padding:13px 20px;font-size:11px;font-weight:700;
      text-transform:uppercase;letter-spacing:0.9px;color:${B.textM};width:40%;
      border-right:1px solid ${B.border};">
      ${l}
    </td>
    <td style="padding:13px 20px;font-size:14px;color:${B.textB};">
      ${v}
    </td>
  </tr>
  </table>`,
    )
    .join("")}
</div>`;
}

/** Buton CTA centrat */
function btn(text, url, color = B.green) {
  return `
<div style="text-align:center;margin:32px 0 4px;">
  <a href="${url}"
    style="display:inline-block;background:${color};color:#fff;
    text-decoration:none;padding:14px 38px;border-radius:50px;
    font-size:14px;font-weight:600;letter-spacing:0.4px;
    box-shadow:0 4px 18px ${color}55;">
    ${text}
  </a>
</div>`;
}

/** Banner colorat (info / warn) */
function banner(
  html,
  bg = B.greenLight,
  border = B.greenBorder,
  left = B.green,
) {
  return `
<div style="background:${bg};border:1px solid ${border};
  border-left:4px solid ${left};border-radius:0 10px 10px 0;
  padding:16px 20px;margin:20px 0;font-size:13px;
  color:${B.textB};line-height:1.75;">
  ${html}
</div>`;
}

/** Separator subțire */
function hr() {
  return `<div style="height:1px;background:${B.border};margin:28px 0;"></div>`;
}

/** Rând info cu emoji */
function infoRow(emoji, label, value) {
  return `
<table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="margin-bottom:4px;">
<tr>
  <td style="width:36px;vertical-align:top;padding-top:10px;font-size:20px;">${emoji}</td>
  <td style="padding:8px 0 8px 10px;vertical-align:top;">
    <p style="margin:0;font-size:11px;font-weight:700;text-transform:uppercase;
      letter-spacing:0.8px;color:${B.textM};">${label}</p>
    <p style="margin:3px 0 0;font-size:14px;color:${B.textB};">${value}</p>
  </td>
</tr>
</table>`;
}

// ═════════════════════════════════════════════════════════════════════════════
//  FUNCȚII PRINCIPALE
// ═════════════════════════════════════════════════════════════════════════════

// 1. Confirmare rezervare → CLIENT
async function sendClientBookingConfirmation(clientEmail, d, lang = "ro") {
  const tx = t(lang).confirmation;
  const isAdvance = d.paymentSplit === "advance";
  const stripeAmount = d.stripeAmount || d.totalPrice;
  const remaining = d.remainingAmount || 0;

  const paymentBlock = isAdvance
    ? `
<div style="border-radius:12px;overflow:hidden;border:1px solid ${B.border};margin:24px 0;">
  <div style="background:${B.green};padding:12px 20px;">
    <p style="margin:0;font-size:12px;font-weight:700;text-transform:uppercase;
      letter-spacing:1px;color:rgba(255,255,255,0.8);">Detalii plată</p>
  </div>
  <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background:${B.cardBg};">
  <tr>
    <td style="padding:13px 20px;font-size:11px;font-weight:700;text-transform:uppercase;
      letter-spacing:0.8px;color:${B.textM};width:45%;border-right:1px solid ${B.border};">
      ${tx.paidOnline}
    </td>
    <td style="padding:13px 20px;font-size:15px;font-weight:700;color:#16a34a;">
      ${stripeAmount} RON ✓
    </td>
  </tr>
  </table>
  <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background:${B.rowEven};">
  <tr>
    <td style="padding:13px 20px;font-size:11px;font-weight:700;text-transform:uppercase;
      letter-spacing:0.8px;color:${B.textM};width:45%;border-right:1px solid ${B.border};">
      ${tx.remainingAtCheckin}
    </td>
    <td style="padding:13px 20px;font-size:15px;font-weight:700;color:${B.textH};">
      ${remaining} RON
    </td>
  </tr>
  </table>
  <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background:${B.cardBg};">
  <tr>
    <td style="padding:13px 20px;font-size:11px;font-weight:700;text-transform:uppercase;
      letter-spacing:0.8px;color:${B.textM};width:45%;border-right:1px solid ${B.border};">
      ${tx.totalStay}
    </td>
    <td style="padding:13px 20px;font-size:15px;font-weight:700;color:${B.textH};">
      ${d.totalPrice} RON
    </td>
  </tr>
  </table>
</div>
${banner(
  `💡 ${tx.arrivalNote} <strong>${remaining} RON</strong>.`,
  B.goldLight,
  B.goldBorder,
  B.gold,
)}`
    : `
<div style="border-radius:12px;overflow:hidden;border:1px solid ${B.border};margin:24px 0;">
  <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background:${B.cardBg};">
  <tr>
    <td style="padding:13px 20px;font-size:11px;font-weight:700;text-transform:uppercase;
      letter-spacing:0.8px;color:${B.textM};width:45%;border-right:1px solid ${B.border};">
      ${tx.paidOnline}
    </td>
    <td style="padding:13px 20px;font-size:15px;font-weight:700;color:#16a34a;">
      ${d.totalPrice} RON ✓
    </td>
  </tr>
  </table>
</div>`;

  // bookingTable e hardcodat în română — facem unul inline cu tx
  const bookingRows = [
    [
      tx.reference,
      `<span style="font-weight:700;color:${B.green};font-size:15px;">${d.bookingRef}</span>`,
    ],
    [tx.room, d.roomName],
    [
      tx.checkIn,
      `${fmtDate(d.checkIn)}&nbsp;<span style="color:${B.textM};font-size:12px;">· ${lang === "en" ? "after 14:00" : "după ora 14:00"}</span>`,
    ],
    [
      tx.checkOut,
      `${fmtDate(d.checkOut)}&nbsp;<span style="color:${B.textM};font-size:12px;">· ${lang === "en" ? "by 11:00" : "până la 11:00"}</span>`,
    ],
    [lang === "en" ? "Nights" : "Nopți", tx.nights(d.nights)],
    [
      tx.total,
      `<strong style="font-size:16px;color:${B.textH};">${d.totalPrice} RON</strong>`,
    ],
  ];

  const bookingTableI18n = `
<div style="border-radius:12px;overflow:hidden;border:1px solid ${B.border};margin:28px 0;">
  ${bookingRows
    .map(
      ([l, v], i) => `
  <table width="100%" cellpadding="0" cellspacing="0" role="presentation"
    style="background:${i % 2 === 0 ? B.cardBg : B.rowEven};">
  <tr>
    <td style="padding:13px 20px;font-size:11px;font-weight:700;text-transform:uppercase;
      letter-spacing:0.9px;color:${B.textM};width:40%;border-right:1px solid ${B.border};">${l}</td>
    <td style="padding:13px 20px;font-size:14px;color:${B.textB};">${v}</td>
  </tr>
  </table>`,
    )
    .join("")}
</div>`;

  const body = `
${title("✓", tx.heading, tx.subheading(isAdvance))}
<p style="margin:0 0 22px;font-size:15px;line-height:1.8;color:${B.textB};">
  ${tx.greeting(d.guestName)}
</p>
<p style="margin:0 0 6px;font-size:15px;color:${B.textB};line-height:1.85;">
  ${tx.body}
</p>
${bookingTableI18n}
${paymentBlock}
${hr()}
${infoRow("🚗", tx.parking, tx.parkingDesc)}
${infoRow("📶", tx.wifi, tx.wifiDesc)}
${infoRow("📞", lang === "en" ? "Reception" : "Recepție", B.phone)}
${btn(tx.manageBooking, `${B.site}/account`)}
<p style="margin:22px 0 0;font-size:12px;color:${B.textM};text-align:center;">
  <a href="mailto:${B.email}" style="color:${B.green};">${B.email}</a>
</p>`;

  await transporter.sendMail({
    from: `"${B.name}" <${EMAIL_USER}>`,
    to: clientEmail,
    subject: tx.subject(d.bookingRef),
    html: layout(body),
  });
  console.log(
    `📧 [CLIENT] Confirmare (${lang}) → ${clientEmail} (${d.bookingRef})`,
  );
}

// 2. Alertă rezervare nouă → ADMIN
async function sendAdminNewBookingAlert(adminEmail, d) {
  const pmLabel =
    {
      card: "💳 Card online (Stripe)",
      bank_transfer: "🏦 Transfer bancar",
      reception: "🏨 Plată la recepție",
    }[d.paymentMethod] ||
    d.paymentMethod ||
    "—";

  const body = `
${title("🔔", "Rezervare Nouă!", pmLabel)}
<p style="text-align:center;margin:0 0 28px;font-size:15px;color:${B.textB};">
  Ai primit o nouă rezervare prin intermediul site-ului.
</p>

<div style="border-radius:12px;overflow:hidden;border:1px solid ${B.border};margin:0 0 24px;">
  ${[
    ["👤 Oaspete", d.guestName],
    [
      "✉️ Email",
      `<a href="mailto:${d.guestEmail}" style="color:${B.green};">${d.guestEmail}</a>`,
    ],
    ["📞 Telefon", d.guestPhone || "—"],
    ["💳 Metodă plată", `<strong>${pmLabel}</strong>`],
  ]
    .map(
      ([l, v], i) => `
  <table width="100%" cellpadding="0" cellspacing="0" role="presentation"
    style="background:${i % 2 === 0 ? B.cardBg : B.rowEven};">
  <tr>
    <td style="padding:12px 20px;font-size:12px;color:${B.textM};width:40%;
      border-right:1px solid ${B.border};">${l}</td>
    <td style="padding:12px 20px;font-size:14px;color:${B.textB};">${v}</td>
  </tr>
  </table>`,
    )
    .join("")}
</div>

${bookingTable(d)}
${
  d.needsInvoice
    ? `
<div style="border-radius:12px;overflow:hidden;border:2px solid #d97706;margin:20px 0;">
  <div style="background:#92400e;padding:10px 20px;">
    <p style="margin:0;font-size:12px;font-weight:700;text-transform:uppercase;
      letter-spacing:1px;color:#fef3c7;">🧾 Facturare pe Firmă — Date Fiscale</p>
  </div>
  ${[
    ["Denumire Firmă", d.companyName || "—"],
    ["CUI / CIF", d.companyCui || "—"],
    ["Nr. Reg. Com.", d.companyRegNo || "—"],
    ["Adresă Sediu", d.companyAddress || "—"],
  ]
    .map(
      ([label, value], i) => `
  <table width="100%" cellpadding="0" cellspacing="0" role="presentation"
    style="background:${i % 2 === 0 ? "#fffbeb" : "#fef3c7"};">
    <tr>
      <td style="padding:10px 20px;font-size:11px;font-weight:700;text-transform:uppercase;
        letter-spacing:0.8px;color:#92400e;width:40%;border-right:1px solid #fde68a;">
        ${label}
      </td>
      <td style="padding:10px 20px;font-size:14px;font-weight:600;color:#1c1917;">
        ${value}
      </td>
    </tr>
  </table>`,
    )
    .join("")}
  <div style="background:#fffbeb;padding:10px 20px;border-top:1px solid #fde68a;">
    <p style="margin:0;font-size:12px;color:#92400e;">
      ⚠️ <strong>Acțiune necesară:</strong> Emite factura fiscală în SmartBill după check-in
      și trimite-o pe email la <strong>${d.guestEmail}</strong>.
    </p>
  </div>
</div>
`
    : ""
}
${btn("Deschide Panoul de Administrare", `${B.site}/admin/bookings`)}
<p style="margin:16px 0 0;font-size:11px;color:${B.textM};text-align:center;">
  Generat automat · ${new Date().toLocaleString("ro-RO")}
</p>`;

  await transporter.sendMail({
    from: `"${B.name}" <${EMAIL_USER}>`,
    to: adminEmail,
    replyTo: `"${d.guestName}" <${d.guestEmail}>`,
    subject: `🔔 Rezervare nouă · ${d.bookingRef} · ${d.guestName}`,
    html: layout(body, `Rezervare nouă de la ${d.guestName} — ${d.roomName}`),
  });
  console.log(`📧 [ADMIN] Alertă rezervare → ${adminEmail} (${d.bookingRef})`);
}

// 3. Anulare rezervare → CLIENT (cu motiv detaliat)
async function sendBookingCancellation(clientEmail, d, lang = "ro") {
  const tx = t(lang).cancellation;

  const bookingRows = [
    [
      tx.reference || "Referință",
      `<span style="font-weight:700;color:${B.green};font-size:15px;">${d.bookingRef}</span>`,
    ],
    [tx.room || "Cameră", d.roomName],
    [tx.checkIn || "Check-in", fmtDate(d.checkIn)],
    [tx.checkOut || "Check-out", fmtDate(d.checkOut)],
    [
      lang === "en" ? "Nights" : "Nopți",
      `${d.nights} ${d.nights === 1 ? (lang === "en" ? "night" : "noapte") : lang === "en" ? "nights" : "nopți"}`,
    ],
    [
      tx.total || "Total",
      `<strong style="font-size:16px;color:${B.textH};">${d.totalPrice} RON</strong>`,
    ],
  ];

  const bookingTableI18n = `
<div style="border-radius:12px;overflow:hidden;border:1px solid ${B.border};margin:28px 0;">
  ${bookingRows
    .map(
      ([l, v], i) => `
  <table width="100%" cellpadding="0" cellspacing="0" role="presentation"
    style="background:${i % 2 === 0 ? B.cardBg : B.rowEven};">
  <tr>
    <td style="padding:13px 20px;font-size:11px;font-weight:700;text-transform:uppercase;
      letter-spacing:0.9px;color:${B.textM};width:40%;border-right:1px solid ${B.border};">${l}</td>
    <td style="padding:13px 20px;font-size:14px;color:${B.textB};">${v}</td>
  </tr>
  </table>`,
    )
    .join("")}
</div>`;

  const body = `
${title("📋", tx.heading, d.bookingRef)}
<p style="margin:0 0 22px;font-size:15px;line-height:1.8;color:${B.textB};">
  ${tx.greeting(d.guestName)}
</p>
<p style="margin:0 0 6px;font-size:15px;color:${B.textB};line-height:1.85;">
  ${tx.body}
</p>
${bookingTableI18n}
${d.reason ? banner(`<strong>${tx.cancelReason}:</strong> ${d.reason}`, B.orangeLight, B.orangeBorder, B.orange) : ""}
<p style="margin:24px 0 8px;font-size:14px;color:${B.textB};line-height:1.8;">
  ${lang === "en" ? "If you have any questions, please contact us:" : "Dacă aveți întrebări sau considerați că s-a produs o eroare, vă rugăm să ne contactați:"}
</p>
${infoRow("📞", lang === "en" ? "Phone" : "Telefon", B.phone)}
${infoRow("✉️", "Email", `<a href="mailto:${B.email}" style="color:${B.green};">${B.email}</a>`)}
${btn(tx.newBooking, `${B.site}/rooms`)}`;

  await transporter.sendMail({
    from: `"${B.name}" <${EMAIL_USER}>`,
    to: clientEmail,
    subject: tx.subject(d.bookingRef),
    html: layout(body),
  });
  console.log(
    `📧 [CLIENT] Anulare (${lang}) → ${clientEmail} (${d.bookingRef})`,
  );
}

// 4. Notificare anulare → ADMIN (simplă, fără motiv lung)
async function sendAdminCancellationAlert(adminEmail, d) {
  const body = `
${title("📋", "Rezervare Anulată", d.bookingRef)}
<div style="border-radius:12px;overflow:hidden;border:1px solid ${B.border};margin:0 0 24px;">
  ${[
    ["Referință", `<strong style="color:${B.green};">${d.bookingRef}</strong>`],
    ["Oaspete", d.guestName],
    [
      "Email",
      `<a href="mailto:${d.guestEmail}" style="color:${B.green};">${d.guestEmail}</a>`,
    ],
    ["Cameră", d.roomName],
    ["Check-in", fmtDate(d.checkIn)],
    ["Check-out", fmtDate(d.checkOut)],
    [
      "Motiv",
      `<strong style="color:${B.orange};">${d.reason || "Nespecificat"}</strong>`,
    ],
  ]
    .map(
      ([l, v], i) => `
  <table width="100%" cellpadding="0" cellspacing="0" role="presentation"
    style="background:${i % 2 === 0 ? B.cardBg : B.rowEven};">
  <tr>
    <td style="padding:12px 20px;font-size:11px;font-weight:700;text-transform:uppercase;
      letter-spacing:0.8px;color:${B.textM};width:38%;border-right:1px solid ${B.border};">${l}</td>
    <td style="padding:12px 20px;font-size:14px;color:${B.textB};">${v}</td>
  </tr>
  </table>`,
    )
    .join("")}
</div>
${btn("Deschide Panoul de Administrare", `${B.site}/admin/bookings`)}
<p style="margin:16px 0 0;font-size:11px;color:${B.textM};text-align:center;">
  Generat automat · ${new Date().toLocaleString("ro-RO")}
</p>`;

  await transporter.sendMail({
    from: `"${B.name}" <${EMAIL_USER}>`,
    to: adminEmail,
    subject: `Anulare rezervare · ${d.bookingRef} · ${d.guestName}`,
    html: layout(body, `Rezervarea ${d.bookingRef} a fost anulată.`),
  });
  console.log(
    `📧 [ADMIN] Notificare anulare → ${adminEmail} (${d.bookingRef})`,
  );
}

// 5. Instrucțiuni transfer bancar → CLIENT
async function sendBankTransferInstructions(clientEmail, d, lang = "ro") {
  const tx = t(lang).bankTransfer;

  const bookingRows = [
    [
      tx.reference || "Referință",
      `<span style="font-weight:700;color:${B.green};font-size:15px;">${d.bookingRef}</span>`,
    ],
    [tx.room || "Cameră", d.roomName],
    [tx.checkIn || "Check-in", fmtDate(d.checkIn)],
    [tx.checkOut || "Check-out", fmtDate(d.checkOut)],
    [
      lang === "en" ? "Nights" : "Nopți",
      `${d.nights} ${d.nights === 1 ? (lang === "en" ? "night" : "noapte") : lang === "en" ? "nights" : "nopți"}`,
    ],
    [
      tx.amount || "Total",
      `<strong style="font-size:16px;color:${B.textH};">${d.totalPrice} RON</strong>`,
    ],
  ];

  const bookingTableI18n = `
<div style="border-radius:12px;overflow:hidden;border:1px solid ${B.border};margin:28px 0;">
  ${bookingRows
    .map(
      ([l, v], i) => `
  <table width="100%" cellpadding="0" cellspacing="0" role="presentation"
    style="background:${i % 2 === 0 ? B.cardBg : B.rowEven};">
  <tr>
    <td style="padding:13px 20px;font-size:11px;font-weight:700;text-transform:uppercase;
      letter-spacing:0.9px;color:${B.textM};width:40%;border-right:1px solid ${B.border};">${l}</td>
    <td style="padding:13px 20px;font-size:14px;color:${B.textB};">${v}</td>
  </tr>
  </table>`,
    )
    .join("")}
</div>`;

  const body = `
${title("🏦", tx.heading, tx.subheading)}
<p style="margin:0 0 22px;font-size:15px;line-height:1.8;color:${B.textB};">
  ${tx.greeting(d.guestName)}
</p>
<p style="margin:0 0 6px;font-size:15px;color:${B.textB};line-height:1.85;">
  ${tx.body}
</p>
${bookingTableI18n}
<div style="border-radius:12px;overflow:hidden;border:1px solid ${B.border};margin:24px 0;">
  <div style="background:${B.green};padding:12px 20px;">
    <p style="margin:0;font-size:12px;font-weight:700;text-transform:uppercase;
      letter-spacing:1px;color:rgba(255,255,255,0.8);">${tx.bankDetails}</p>
  </div>
  ${[
    [tx.beneficiary, "SC Ciclotur Impex SRL"],
    [tx.iban, "RO49 BTRL 0130 1202 9574 3XXX"],
    [tx.bank, "Banca Transilvania"],
    [
      tx.amount,
      `<strong style="font-size:16px;color:${B.textH};">${d.totalPrice} RON</strong>`,
    ],
    [
      tx.reference,
      `<strong style="color:${B.green};font-size:15px;">${d.bookingRef}</strong>`,
    ],
  ]
    .map(
      ([l, v], i) => `
  <table width="100%" cellpadding="0" cellspacing="0" role="presentation"
    style="background:${i % 2 === 0 ? B.cardBg : B.rowEven};">
  <tr>
    <td style="padding:13px 20px;font-size:11px;font-weight:700;text-transform:uppercase;
      letter-spacing:0.8px;color:${B.textM};width:38%;border-right:1px solid ${B.border};">${l}</td>
    <td style="padding:13px 20px;font-size:14px;color:${B.textB};">${v}</td>
  </tr>
  </table>`,
    )
    .join("")}
</div>
${banner(`⚠️ <strong>${lang === "en" ? "Important" : "Important"}:</strong> ${tx.importantNote(d.bookingRef)}`, B.orangeLight, B.orangeBorder, B.orange)}
${
  d.needsInvoice
    ? `
<div style="border-radius:10px;border:1px solid #fde68a;background:#fffbeb;padding:14px 20px;margin:16px 0;">
  <p style="margin:0 0 4px;font-size:13px;font-weight:700;color:#92400e;">🧾 ${lang === "en" ? "Company invoice requested" : "Factură pe firmă solicitată"}</p>
  <p style="margin:0;font-size:14px;color:#1c1917;font-weight:600;">${d.companyName}</p>
  <p style="margin:4px 0 0;font-size:12px;color:#78716c;">CUI: ${d.companyCui}</p>
</div>`
    : ""
}
${btn(lang === "en" ? "Manage Your Booking" : "Gestionați Rezervarea", `${B.site}/account`)}`;

  await transporter.sendMail({
    from: `"${B.name}" <${EMAIL_USER}>`,
    to: clientEmail,
    subject: tx.subject(d.bookingRef),
    html: layout(body),
  });
  console.log(
    `📧 [CLIENT] Transfer bancar (${lang}) → ${clientEmail} (${d.bookingRef})`,
  );
}

// 7. Reminder check-in → CLIENT
async function sendCheckInReminder(clientEmail, d, lang = "ro") {
  const tx = t(lang).checkinReminder;

  const body = `
${title("🏔️", tx.heading, `Check-in: ${fmtDate(d.checkIn)}`)}
<p style="margin:0 0 22px;font-size:15px;line-height:1.8;color:${B.textB};">
  ${tx.greeting(d.guestName)}
</p>
<p style="margin:0 0 24px;font-size:15px;color:${B.textB};line-height:1.85;">
  ${tx.body} <strong>${d.roomName}</strong>.
</p>
<div style="border-radius:12px;overflow:hidden;border:1px solid ${B.border};margin:0 0 28px;">
  ${[
    [
      "🕑",
      lang === "en" ? "Check-in" : "Check-in",
      `${fmtDate(d.checkIn)} · <strong>${lang === "en" ? "after 14:00" : "după ora 14:00"}</strong>`,
    ],
    [
      "🚗",
      lang === "en" ? "Parking" : "Parcare",
      lang === "en"
        ? "Free and supervised — direct access to the courtyard"
        : "Gratuită — acces direct cu mașina în curtea interioară",
    ],
    [
      "📶",
      "Wi-Fi",
      lang === "en"
        ? "Free throughout the guesthouse"
        : "Internet gratuit în toată incinta pensiunii",
    ],
    ["📞", lang === "en" ? "Reception" : "Recepție", B.phone],
  ]
    .map(
      ([emoji, l, v], i) => `
  <table width="100%" cellpadding="0" cellspacing="0" role="presentation"
    style="background:${i % 2 === 0 ? B.cardBg : B.rowEven};">
  <tr>
    <td style="padding:14px 16px;font-size:22px;width:48px;text-align:center;border-right:1px solid ${B.border};">${emoji}</td>
    <td style="padding:14px 12px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.8px;color:${B.textM};width:28%;border-right:1px solid ${B.border};">${l}</td>
    <td style="padding:14px 16px;font-size:14px;color:${B.textB};">${v}</td>
  </tr>
  </table>`,
    )
    .join("")}
</div>
${btn(lang === "en" ? "View Your Booking" : "Vedeți Rezervarea", `${B.site}/account`)}`;

  await transporter.sendMail({
    from: `"${B.name}" <${EMAIL_USER}>`,
    to: clientEmail,
    subject: tx.subject(fmtDate(d.checkIn)),
    html: layout(body),
  });
  console.log(`📧 [CLIENT] Reminder check-in (${lang}) → ${clientEmail}`);
}

// 8. Solicitare recenzie → CLIENT
async function sendReviewRequest(clientEmail, d, lang = "ro") {
  const tx = t(lang).reviewRequest;
  const { guestName, roomName, checkIn, checkOut, bookingRef } = d;

  const stars5 = [1, 2, 3, 4, 5]
    .map(
      (n) => `
<a href="${B.site}/reviews?ref=${bookingRef}&email=${encodeURIComponent(clientEmail)}&stars=${n}"
  style="text-decoration:none;font-size:38px;color:#d4c4a8;line-height:1;margin:0 2px;">★</a>
`,
    )
    .join("");

  const body = `
${title("⭐", tx.heading, roomName)}
<p style="margin:0 0 22px;font-size:15px;line-height:1.8;color:${B.textB};">
  ${tx.greeting(guestName)}
</p>
<p style="margin:0 0 28px;font-size:15px;color:${B.textB};line-height:1.85;">
  ${tx.body}
</p>
<div style="background:${B.rowEven};border-radius:14px;padding:28px;text-align:center;margin:0 0 28px;border:1px solid ${B.border};">
  <p style="margin:0 0 14px;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:${B.textM};">${tx.clickStar}</p>
  <div style="line-height:1;">${stars5}</div>
  <p style="margin:14px 0 0;font-size:12px;color:${B.textM};">${fmtDate(checkIn)} → ${fmtDate(checkOut)}</p>
</div>
${btn(tx.leaveReview, `${B.site}/reviews?ref=${bookingRef}&email=${encodeURIComponent(clientEmail)}&stars=5`)}`;

  await transporter.sendMail({
    from: `"${B.name}" <${EMAIL_USER}>`,
    to: clientEmail,
    subject: tx.subject(guestName),
    html: layout(body),
  });
  console.log(`📧 [CLIENT] Solicitare recenzie (${lang}) → ${clientEmail}`);
}

// 9. Confirmare recenzie → CLIENT
async function sendClientReviewConfirmation(clientEmail, d) {
  const { guestName, rating, roomName, autoApproved } = d;
  const stars = [1, 2, 3, 4, 5]
    .map(
      (i) =>
        `<span style="font-size:30px;color:${i <= rating ? "#d4a547" : B.border};">★</span>`,
    )
    .join("");

  const body = `
${title("🙏", `Vă mulțumim, ${guestName}!`, "Am primit recenzia dumneavoastră")}
<div style="background:${B.rowEven};border-radius:14px;padding:28px;
  text-align:center;margin:0 0 28px;border:1px solid ${B.border};">
  <div>${stars}</div>
  <p style="margin:10px 0 4px;font-size:17px;font-weight:700;color:${B.textH};">${rating}/5 stele</p>
  ${roomName ? `<p style="margin:0;font-size:13px;color:${B.textM};">${roomName}</p>` : ""}
</div>
<p style="margin:0 0 24px;font-size:15px;color:${B.textB};line-height:1.85;text-align:center;">
  ${
    autoApproved
      ? "Vă mulțumim din suflet pentru recenzie și pentru timpul acordat! Cuvintele frumoase ne motivează să fim și mai buni în ceea ce facem."
      : "Vă mulțumim din suflet pentru recenzie! Părerea dumneavoastră a fost înregistrată cu succes și urmează să fie publicată pe site în scurt timp."
  }
</p>
${btn("Rezervați din Nou", `${B.site}/booking`)}`;

  await transporter.sendMail({
    from: `"${B.name}" <${EMAIL_USER}>`,
    to: clientEmail,
    subject: `🙏 Vă mulțumim pentru recenzie, ${guestName}!`,
    html: layout(
      body,
      `Am primit recenzia dumneavoastră de ${rating} stele. Vă mulțumim pentru feedback!`,
    ),
  });
  console.log(`📧 [CLIENT] Confirmare recenzie → ${clientEmail}`);
}

// 10. Alertă recenzie nouă → ADMIN
async function sendAdminNewReviewAlert(adminEmail, d) {
  const { guestName, guestEmail, rating, text, roomName, autoApproved } = d;
  const stars = [1, 2, 3, 4, 5]
    .map(
      (i) =>
        `<span style="font-size:24px;color:${i <= rating ? "#d4a547" : B.border};">★</span>`,
    )
    .join("");

  const body = `
${title("⭐", "Recenzie Nouă", autoApproved ? "Publicată automat" : "Necesită aprobare")}
<div style="text-align:center;margin:0 0 28px;">
  ${stars}
  <p style="margin:8px 0 0;font-size:14px;font-weight:700;color:#d4a547;">${rating}/5 stele</p>
</div>
<div style="border-radius:12px;overflow:hidden;border:1px solid ${B.border};margin:0 0 24px;">
  ${[
    ["Oaspete", guestName],
    [
      "Email",
      `<a href="mailto:${guestEmail}" style="color:${B.green};">${guestEmail}</a>`,
    ],
    ["Cameră", roomName || "—"],
    ["Rating", `${rating}/5 stele`],
  ]
    .map(
      ([l, v], i) => `
  <table width="100%" cellpadding="0" cellspacing="0" role="presentation"
    style="background:${i % 2 === 0 ? B.cardBg : B.rowEven};">
  <tr>
    <td style="padding:12px 20px;font-size:11px;font-weight:700;text-transform:uppercase;
      letter-spacing:0.8px;color:${B.textM};width:35%;border-right:1px solid ${B.border};">${l}</td>
    <td style="padding:12px 20px;font-size:14px;color:${B.textB};">${v}</td>
  </tr>
  </table>`,
    )
    .join("")}
</div>
<div style="background:${B.rowEven};border-left:4px solid #d4a547;border-radius:0 10px 10px 0;
  padding:20px 24px;margin:0 0 20px;">
  <p style="margin:0 0 6px;font-size:11px;font-weight:700;text-transform:uppercase;
    letter-spacing:0.8px;color:${B.textM};">Recenzie</p>
  <p style="margin:0;font-size:15px;color:${B.textB};line-height:1.9;font-style:italic;">
    "${text}"
  </p>
</div>
${
  autoApproved
    ? banner(
        "✅ Recenzia a fost <strong>publicată automat</strong> (rating ≥ 4 stele).",
        B.greenLight,
        B.greenBorder,
        B.green,
      )
    : banner(
        "⏳ Recenzia <strong>necesită aprobare</strong> manuală — rating &lt; 4 stele.",
        B.orangeLight,
        B.orangeBorder,
        B.orange,
      )
}
${!autoApproved ? btn("Aprobă Recenzia", `${B.site}/admin/reviews`) : ""}`;

  await transporter.sendMail({
    from: `"${B.name}" <${EMAIL_USER}>`,
    to: adminEmail,
    replyTo: `"${guestName}" <${guestEmail}>`,
    subject: `${autoApproved ? "⭐" : "⏳"} Recenzie ${rating}/5 · ${guestName}`,
    html: layout(
      body,
      `${guestName}: ${rating} stele — ${(text || "").substring(0, 80)}`,
    ),
  });
  console.log(`📧 [ADMIN] Recenzie nouă → ${adminEmail}`);
}

// 11. Bun venit → CLIENT
async function sendWelcomeEmail(userEmail, name) {
  const items = [
    "Rezervați camere rapid, fără să reintroduceți datele",
    "Urmăriți toate rezervările dumneavoastră într-un singur loc",
    "Primiți confirmări și reminder-uri automate",
    "Lăsați recenzii rapid după fiecare sejur",
  ];
  const body = `
${title("🌿", `Bun venit, ${name}!`, "Contul dumneavoastră a fost creat")}
<p style="margin:0 0 28px;font-size:15px;color:${B.textB};line-height:1.85;text-align:center;">
  Ne bucurăm să vă avem alături! De acum, planificarea vacanțelor la <strong>${B.name}</strong> va fi mult mai simplă:
</p>
<div style="border-radius:12px;overflow:hidden;border:1px solid ${B.border};margin:0 0 32px;">
  ${items
    .map(
      (text, i) => `
  <table width="100%" cellpadding="0" cellspacing="0" role="presentation"
    style="background:${i % 2 === 0 ? B.cardBg : B.rowEven};">
  <tr>
    <td style="padding:14px 16px;width:36px;text-align:center;
      border-right:1px solid ${B.border};">
      <div style="width:22px;height:22px;border-radius:50%;background:${B.green};
        color:#fff;font-size:12px;font-weight:700;line-height:22px;text-align:center;
        margin:auto;">✓</div>
    </td>
    <td style="padding:14px 16px;font-size:14px;color:${B.textB};">${text}</td>
  </tr>
  </table>`,
    )
    .join("")}
</div>
${btn("Explorați Camerele Noastre", `${B.site}/rooms`)}`;

  await transporter.sendMail({
    from: `"${B.name}" <${EMAIL_USER}>`,
    to: userEmail,
    subject: `Bun venit la ${B.name}! 🌿`,
    html: layout(
      body,
      `Bun venit, ${name}! Contul dumneavoastră a fost creat cu succes.`,
    ),
  });
  console.log(`📧 [CLIENT] Welcome → ${userEmail}`);
}

// 12. Schimbare parolă → CLIENT
async function sendPasswordChangedEmail(userEmail, name) {
  const body = `
${title("🔐", "Parolă Actualizată", "Securitatea contului dumneavoastră")}
${hi(name)}
<p style="margin:0 0 24px;font-size:15px;color:${B.textB};line-height:1.85;">
  Vă confirmăm pe această cale că parola contului dumneavoastră a fost actualizată cu succes.
</p>
${banner(
  `⚠️ Dacă nu dumneavoastră ați inițiat această schimbare, vă rugăm să ne contactați imediat la
  <strong>${B.phone}</strong> sau
  <a href="mailto:${B.email}" style="color:${B.green};">${B.email}</a>`,
  B.orangeLight,
  B.orangeBorder,
  B.orange,
)}
${btn("Către Contul Meu", `${B.site}/account`)}`;

  await transporter.sendMail({
    from: `"${B.name}" <${EMAIL_USER}>`,
    to: userEmail,
    subject: `🔐 Parola a fost actualizată · ${B.name}`,
    html: layout(
      body,
      "Parola contului dumneavoastră a fost actualizată cu succes.",
    ),
  });
  console.log(`📧 [CLIENT] Schimbare parolă → ${userEmail}`);
}

// 13. Ștergere cont → CLIENT
async function sendAccountDeletedEmail(userEmail, name) {
  const body = `
${title("👋", "Cont Șters", "Ați ales să ne părăsiți")}
${hi(name)}
<p style="margin:0 0 24px;font-size:15px;color:${B.textB};line-height:1.85;">
  Vă confirmăm că procesul de ștergere a contului a fost finalizat. Toate datele dumneavoastră personale au fost eliminate definitiv din sistemul nostru.
</p>
${banner(
  `Vă mulțumim pentru timpul petrecut alături de noi! Dacă vă răzgândiți, sunteți oricând binevenit să vă creați un cont nou.
  Vă mulțumim că ați ales <strong>${B.name}</strong>!`,
  B.greenLight,
  B.greenBorder,
  B.green,
)}
${btn("Vizitați Site-ul Nostru", B.site)}`;

  await transporter.sendMail({
    from: `"${B.name}" <${EMAIL_USER}>`,
    to: userEmail,
    subject: `Contul dumneavoastră ${B.name} a fost șters`,
    html: layout(
      body,
      "Contul dumneavoastră a fost șters. Vă mulțumim pentru vizită!",
    ),
  });
  console.log(`📧 [CLIENT] Ștergere cont → ${userEmail}`);
}

// 14. Mesaj contact → ADMIN
async function sendAdminContactMessage(adminEmail, c) {
  const body = `
${title("✉️", "Mesaj Nou de Contact", "de pe site")}
<div style="border-radius:12px;overflow:hidden;border:1px solid ${B.border};margin:0 0 24px;">
  ${[
    ["Nume", c.name],
    [
      "Email",
      `<a href="mailto:${c.email}" style="color:${B.green};">${c.email}</a>`,
    ],
    ["Telefon", c.phone || "—"],
    ["Subiect", c.subject || "—"],
  ]
    .map(
      ([l, v], i) => `
  <table width="100%" cellpadding="0" cellspacing="0" role="presentation"
    style="background:${i % 2 === 0 ? B.cardBg : B.rowEven};">
  <tr>
    <td style="padding:12px 20px;font-size:11px;font-weight:700;text-transform:uppercase;
      letter-spacing:0.8px;color:${B.textM};width:32%;border-right:1px solid ${B.border};">${l}</td>
    <td style="padding:12px 20px;font-size:14px;color:${B.textB};">${v}</td>
  </tr>
  </table>`,
    )
    .join("")}
</div>
<p style="margin:0 0 10px;font-size:11px;font-weight:700;text-transform:uppercase;
  letter-spacing:0.8px;color:${B.textM};">Mesaj</p>
<div style="background:${B.rowEven};border-left:4px solid ${B.green};
  border-radius:0 10px 10px 0;padding:20px 24px;margin:0 0 28px;">
  <p style="margin:0;font-size:15px;color:${B.textB};line-height:1.9;white-space:pre-wrap;">${c.message}</p>
</div>
${btn(`Răspunde-i lui ${c.name}`, `mailto:${c.email}`)}
<p style="margin:16px 0 0;font-size:12px;color:${B.textM};text-align:center;">
  Apasă Reply pentru a răspunde direct vizitatorului.
</p>`;

  await transporter.sendMail({
    from: `"${B.name}" <${EMAIL_USER}>`,
    to: adminEmail,
    replyTo: `"${c.name}" <${c.email}>`,
    subject: `✉️ Mesaj de la ${c.name}${c.subject ? ` · ${c.subject}` : ""}`,
    html: layout(
      body,
      `Mesaj de la ${c.name}: ${(c.message || "").substring(0, 80)}`,
    ),
  });
  console.log(`📧 [ADMIN] Mesaj contact → ${adminEmail}`);
}

// 15. Confirmare contact → CLIENT
async function sendClientContactConfirmation(clientEmail, name) {
  const body = `
${title("✉️", "Mesaj Primit!", "Vă mulțumim că ne-ați contactat")}
${hi(name)}
<p style="margin:0 0 24px;font-size:15px;color:${B.textB};line-height:1.85;">
  Vă confirmăm recepționarea mesajului dumneavoastră. Colegii noștri îl vor analiza și vă vom răspunde în cel mai scurt timp (de regulă, în maximum <strong>24 de ore</strong>).
</p>
${banner(
  `Pentru întrebări urgente, ne puteți contacta direct la numărul de telefon <strong>${B.phone}</strong>`,
  B.greenLight,
  B.greenBorder,
  B.green,
)}
${btn("Explorați Camerele Noastre", `${B.site}/rooms`)}`;

  await transporter.sendMail({
    from: `"${B.name}" <${EMAIL_USER}>`,
    to: clientEmail,
    subject: `Mesajul dumneavoastră a fost primit · ${B.name}`,
    html: layout(
      body,
      "Am primit mesajul dumneavoastră. Vă vom răspunde în curând!",
    ),
  });
  console.log(`📧 [CLIENT] Confirmare contact → ${clientEmail}`);
}

// ─── Verificare conexiune SMTP ────────────────────────────────────────────────
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

async function sendBookingExpired(clientEmail, d) {
  const body = `
${title("⏰", "Rezervare Expirată", "Plata nu a fost confirmată în termenul alocat")}
${hi(d.guestName)}
<p style="margin:0 0 6px;font-size:15px;color:${B.textB};line-height:1.85;">
  Vă informăm că rezervarea dumneavoastră la <strong>${B.name}</strong> a fost anulată automat, deoarece nu am recepționat confirmarea plății prin transfer bancar în intervalul alocat de <strong>${d.expireDays} zile</strong>.
</p>
 
${bookingTable(d)}
 
<div style="border-radius:10px;border:1px solid #fca5a5;background:#fef2f2;
  padding:14px 20px;margin:20px 0;">
  <p style="margin:0;font-size:14px;color:#b91c1c;font-weight:600;">
    ⚠️ Rezervarea ${d.bookingRef} a fost anulată automat din sistem.
  </p>
</div>
 
<p style="margin:0 0 16px;font-size:14px;color:${B.textB};line-height:1.8;">
  Dacă ați efectuat deja plata sau considerați că această anulare s-a produs dintr-o eroare, vă rugăm să ne contactați cât mai curând posibil:
</p>
${infoRow("📞", "Telefon", B.phone)}
${infoRow("✉️", "Email", `<a href="mailto:${B.email}" style="color:${B.green};">${B.email}</a>`)}
<p style="margin:24px 0 6px;font-size:15px;color:${B.textB};line-height:1.85;">
  Dacă totuși doriți să ne vizitați cu o altă ocazie, sunteți mai mult decât binevenit să plasați o nouă rezervare.
</p>
 
${hr()}
${btn("Efectuați o Nouă Rezervare", `${B.site}/booking`)}
<p style="margin:22px 0 0;font-size:12px;color:${B.textM};text-align:center;">
  Aveți întrebări? Ne puteți scrie oricând la
  <a href="mailto:${B.email}" style="color:${B.green};">${B.email}</a>
  sau ne puteți suna la ${B.phone}.
</p>`;

  await transporter.sendMail({
    from: `"${B.name}" <${EMAIL_USER}>`,
    to: clientEmail,
    subject: `⏰ Rezervare expirată · ${d.bookingRef} · ${B.name}`,
    html: layout(
      body,
      `Rezervarea ${d.bookingRef} a expirat — plata nu a fost confirmată în cele ${d.expireDays} zile acordate.`,
    ),
  });
  console.log(
    `📧 [CLIENT] Expirare rezervare → ${clientEmail} (${d.bookingRef})`,
  );
}

async function sendAdminExpiredBookingsAlert(adminEmail, d) {
  console.log(
    "🔍 d.bookings type:",
    typeof d.bookings,
    Array.isArray(d.bookings),
    d.bookings?.length,
  );
  const bookings = Array.isArray(d.bookings) ? d.bookings : [];
  const count = d.count;
  const countLabel =
    count === 1 ? "o rezervare expirată" : `${count} rezervări expirate`;

  const rows = bookings
    .map(
      (b, i) => `
  <table width="100%" cellpadding="0" cellspacing="0" role="presentation"
    style="background:${i % 2 === 0 ? B.cardBg : B.rowEven};">
  <tr>
    <td style="padding:12px 20px;font-size:13px;font-weight:700;color:${B.green};width:20%;
      border-right:1px solid ${B.border};">${b.booking_ref}</td>
    <td style="padding:12px 20px;font-size:13px;color:${B.textB};width:20%;
      border-right:1px solid ${B.border};">${b.guest_name}</td>
    <td style="padding:12px 20px;font-size:13px;color:${B.textB};width:25%;
      border-right:1px solid ${B.border};">${b.guest_email}</td>
    <td style="padding:12px 20px;font-size:13px;color:${B.textB};width:15%;
      border-right:1px solid ${B.border};">${b.room_name}</td>
    <td style="padding:12px 20px;font-size:13px;color:${B.textB};width:10%;
      border-right:1px solid ${B.border};">${b.check_in?.substring(0, 10) || "—"}</td>
    <td style="padding:12px 20px;font-size:13px;font-weight:700;color:#b91c1c;width:10%;">
      ${b.total_price} RON</td>
  </tr>
  </table>`,
    )
    .join("");

  const body = `
${title("🚨", "Rezervări Expirate Automat", `${countLabel} anulate astăzi`)}
<p style="margin:0 0 16px;font-size:15px;color:${B.textB};line-height:1.85;">
  Job-ul automat a anulat <strong>${countLabel}</strong>
  de tip <em>Transfer Bancar</em> care nu au primit plata în termen de
  <strong>${d.expireDays} zile</strong>. ${count === 1 ? "Clientul a fost notificat" : "Clienții au fost notificați"} prin email.
</p>

${bookings
  .map(
    (b, i) => `
<div style="border-radius:12px;overflow:hidden;border:1px solid ${B.border};margin:12px 0;">
  <div style="background:#b91c1c;padding:8px 20px;">
    <p style="margin:0;font-size:12px;font-weight:700;color:#fff;letter-spacing:0.5px;">
      ${b.booking_ref}
    </p>
  </div>
  ${[
    ["Client", b.guest_name],
    ["Email", b.guest_email],
    ["Cameră", b.room_name],
    ["Check-in", b.check_in ? fmtDate(b.check_in.substring(0, 10)) : "—"],
    ["Valoare", `<strong style="color:#b91c1c;">${b.total_price} RON</strong>`],
  ]
    .map(
      ([l, v], j) => `
  <table width="100%" cellpadding="0" cellspacing="0" role="presentation"
    style="background:${j % 2 === 0 ? B.cardBg : B.rowEven};">
  <tr>
    <td style="padding:11px 20px;font-size:11px;font-weight:700;text-transform:uppercase;
      letter-spacing:0.8px;color:${B.textM};width:35%;border-right:1px solid ${B.border};">${l}</td>
    <td style="padding:11px 20px;font-size:13px;color:${B.textB};">${v}</td>
  </tr>
  </table>`,
    )
    .join("")}
</div>`,
  )
  .join("")}

${btn("Deschide Panoul de Administrare", `${B.site}/admin/bookings`)}
<p style="margin:16px 0 0;font-size:11px;color:${B.textM};text-align:center;">
  Generat automat · ${new Date().toLocaleString("ro-RO")}
</p>`;

  await transporter.sendMail({
    from: `"${B.name}" <${EMAIL_USER}>`,
    to: adminEmail,
    subject: `🚨 ${countLabel} automat · ${new Date().toLocaleDateString("ro-RO")} · ${B.name}`,
    html: layout(body, `${countLabel} de tip transfer bancar expirate astăzi`),
  });
  console.log(
    `📧 [ADMIN] Alertă expirare ${count} rezervare(i) → ${adminEmail}`,
  );
}

module.exports = {
  sendClientBookingConfirmation,
  sendAdminNewBookingAlert,
  sendBookingCancellation,
  sendAdminCancellationAlert,
  sendBankTransferInstructions,
  sendCheckInReminder,
  sendReviewRequest,
  sendBookingExpired,
  sendAdminExpiredBookingsAlert,
  sendClientReviewConfirmation,
  sendAdminNewReviewAlert,
  sendWelcomeEmail,
  sendPasswordChangedEmail,
  sendAccountDeletedEmail,
  sendAdminContactMessage,
  sendClientContactConfirmation,
  verifyConnection,
};
