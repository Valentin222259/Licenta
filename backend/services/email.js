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

<!-- preview text (hidden) -->
<div style="display:none;max-height:0;overflow:hidden;font-size:1px;color:${B.pageBg};">
  ${preview}&nbsp;&#8203;&nbsp;&#8203;&nbsp;&#8203;
</div>

<table width="100%" cellpadding="0" cellspacing="0" role="presentation"
  style="background:${B.pageBg};">
<tr><td align="center" style="padding:40px 16px 48px;">

  <!-- container 600px -->
  <table width="600" cellpadding="0" cellspacing="0" role="presentation"
    style="max-width:600px;width:100%;">

    <!-- ── HEADER ── -->
    <tr>
      <td style="
        background:linear-gradient(150deg, ${B.green} 0%, ${B.greenMid} 55%, #3a7a50 100%);
        border-radius:18px 18px 0 0;
        padding:44px 48px 40px;
        text-align:center;">

        <!-- monogram / logo mark -->
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
        <!-- linie aurie decorativă -->
        <div style="width:36px;height:2px;border-radius:2px;
          background:${B.gold};margin:20px auto 0;"></div>
      </td>
    </tr>

    <!-- ── BODY CARD ── -->
    <tr>
      <td style="background:${B.cardBg};padding:48px 48px 40px;">
        ${body}
      </td>
    </tr>

    <!-- ── FOOTER ── -->
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
    Dragă <strong style="color:${B.textH};">${name}</strong>,
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
// ─── PATCH pentru services/email.js ──────────────────────────────────────────
// Înlocuiește DOAR funcția sendClientBookingConfirmation cu această versiune.
// Restul fișierului rămâne identic.

async function sendClientBookingConfirmation(clientEmail, d) {
  const isAdvance = d.paymentSplit === "advance";
  const stripeAmount = d.stripeAmount || d.totalPrice;
  const remaining = d.remainingAmount || 0;

  // ── Bloc plată — diferit pentru avans vs integral ──────────────────────────
  const paymentBlock = isAdvance
    ? `
<div style="border-radius:12px;overflow:hidden;border:1px solid ${B.border};margin:24px 0;">
  <div style="background:${B.green};padding:12px 20px;">
    <p style="margin:0;font-size:12px;font-weight:700;text-transform:uppercase;
      letter-spacing:1px;color:rgba(255,255,255,0.8);">Detalii plată</p>
  </div>
  <table width="100%" cellpadding="0" cellspacing="0" role="presentation"
    style="background:${B.cardBg};">
  <tr>
    <td style="padding:13px 20px;font-size:11px;font-weight:700;text-transform:uppercase;
      letter-spacing:0.8px;color:${B.textM};width:45%;border-right:1px solid ${B.border};">
      Plătit acum online
    </td>
    <td style="padding:13px 20px;font-size:15px;font-weight:700;color:#16a34a;">
      ${stripeAmount} RON ✓
    </td>
  </tr>
  </table>
  <table width="100%" cellpadding="0" cellspacing="0" role="presentation"
    style="background:${B.rowEven};">
  <tr>
    <td style="padding:13px 20px;font-size:11px;font-weight:700;text-transform:uppercase;
      letter-spacing:0.8px;color:${B.textM};width:45%;border-right:1px solid ${B.border};">
      Rest de achitat la check-in
    </td>
    <td style="padding:13px 20px;font-size:15px;font-weight:700;color:${B.textH};">
      ${remaining} RON
    </td>
  </tr>
  </table>
  <table width="100%" cellpadding="0" cellspacing="0" role="presentation"
    style="background:${B.cardBg};">
  <tr>
    <td style="padding:13px 20px;font-size:11px;font-weight:700;text-transform:uppercase;
      letter-spacing:0.8px;color:${B.textM};width:45%;border-right:1px solid ${B.border};">
      Total sejur
    </td>
    <td style="padding:13px 20px;font-size:15px;font-weight:700;color:${B.textH};">
      ${d.totalPrice} RON
    </td>
  </tr>
  </table>
</div>
${banner(
  `💡 La check-in veți achita restul de <strong>${remaining} RON</strong> (card sau cash).`,
  B.goldLight,
  B.goldBorder,
  B.gold,
)}`
    : `
<div style="border-radius:12px;overflow:hidden;border:1px solid ${B.border};margin:24px 0;">
  <table width="100%" cellpadding="0" cellspacing="0" role="presentation"
    style="background:${B.cardBg};">
  <tr>
    <td style="padding:13px 20px;font-size:11px;font-weight:700;text-transform:uppercase;
      letter-spacing:0.8px;color:${B.textM};width:45%;border-right:1px solid ${B.border};">
      Plătit integral online
    </td>
    <td style="padding:13px 20px;font-size:15px;font-weight:700;color:#16a34a;">
      ${d.totalPrice} RON ✓
    </td>
  </tr>
  </table>
</div>`;

  const body = `
${title("✓", "Rezervare Confirmată!", isAdvance ? "Avans 30% plătit cu succes" : "Plata a fost procesată cu succes")}
${hi(d.guestName)}
<p style="margin:0 0 6px;font-size:15px;color:${B.textB};line-height:1.85;">
  Suntem bucuroși să vă confirmăm rezervarea la <strong>${B.name}</strong>.
  Vă așteptăm cu drag în Maramureș!
</p>
${bookingTable(d)}
${paymentBlock}
${hr()}
${infoRow("🚗", "Parcare", "Gratuită, supravegheată — intrați direct în curte")}
${infoRow("📶", "Wi-Fi", "Gratuit în toată pensiunea — parola la recepție")}
${infoRow("🍳", "Mic dejun", "Tradițional românesc · 08:00–10:00, inclus în preț")}
${infoRow("📞", "Recepție", B.phone)}
${btn("Gestionează Rezervarea", `${B.site}/account`)}
<p style="margin:22px 0 0;font-size:12px;color:${B.textM};text-align:center;">
  Întrebări? Scrie-ne la
  <a href="mailto:${B.email}" style="color:${B.green};">${B.email}</a>
</p>`;

  await transporter.sendMail({
    from: `"${B.name}" <${EMAIL_USER}>`,
    to: clientEmail,
    subject: isAdvance
      ? `✓ Avans confirmat · ${d.bookingRef} · ${B.name}`
      : `✓ Rezervare confirmată · ${d.bookingRef} · ${B.name}`,
    html: layout(
      body,
      isAdvance
        ? `Avans ${stripeAmount} RON plătit! Rest ${remaining} RON la check-in · ${fmtDate(d.checkIn)}`
        : `Rezervarea ${d.bookingRef} confirmată! Check-in: ${fmtDate(d.checkIn)}`,
    ),
  });
  console.log(
    `📧 [CLIENT] Confirmare${isAdvance ? " avans" : ""} → ${clientEmail} (${d.bookingRef})`,
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
  O nouă rezervare a fost înregistrată pe site.
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
${btn("Deschide în Panoul Admin", `${B.site}/admin/bookings`)}
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
async function sendBookingCancellation(clientEmail, d) {
  const body = `
${title("📋", "Rezervare Anulată", d.bookingRef)}
${hi(d.guestName)}
<p style="margin:0 0 6px;font-size:15px;color:${B.textB};line-height:1.85;">
  Rezervarea ta a fost anulată. Regretăm că nu ne vom putea vedea de această dată.
</p>
${bookingTable(d)}
${
  d.reason
    ? banner(
        `<strong>Motiv anulare:</strong> ${d.reason}`,
        B.orangeLight,
        B.orangeBorder,
        B.orange,
      )
    : ""
}
<p style="margin:24px 0 8px;font-size:14px;color:${B.textB};line-height:1.8;">
  Dacă ai întrebări sau crezi că e o eroare, te rugăm să ne contactezi:
</p>
${infoRow("📞", "Telefon", B.phone)}
${infoRow("✉️", "Email", `<a href="mailto:${B.email}" style="color:${B.green};">${B.email}</a>`)}
${btn("Fă o Nouă Rezervare", `${B.site}/rooms`)}`;

  await transporter.sendMail({
    from: `"${B.name}" <${EMAIL_USER}>`,
    to: clientEmail,
    subject: `Rezervare anulată · ${d.bookingRef} · ${B.name}`,
    html: layout(body, `Rezervarea ${d.bookingRef} a fost anulată.`),
  });
  console.log(
    `📧 [CLIENT] Anulare cu motiv → ${clientEmail} (${d.bookingRef})`,
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
${btn("Deschide în Panoul Admin", `${B.site}/admin/bookings`)}
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
async function sendBankTransferInstructions(clientEmail, d) {
  const body = `
${title("🏦", "Instrucțiuni Plată", "Transfer bancar")}
${hi(d.guestName)}
<p style="margin:0 0 6px;font-size:15px;color:${B.textB};line-height:1.85;">
  Rezervarea ta a fost înregistrată! Te rugăm să efectuezi plata prin transfer
  bancar în termen de <strong>48 de ore</strong> pentru a confirma rezervarea.
</p>
${bookingTable(d)}

<div style="border-radius:12px;overflow:hidden;border:1px solid ${B.border};margin:24px 0;">
  <div style="background:${B.green};padding:12px 20px;">
    <p style="margin:0;font-size:12px;font-weight:700;text-transform:uppercase;
      letter-spacing:1px;color:rgba(255,255,255,0.8);">Date cont bancar</p>
  </div>
  ${[
    ["Beneficiar", "SC Ciclotur Impex SRL"],
    ["IBAN", "RO49 BTRL 0130 1202 9574 3XXX"],
    ["Bancă", "Banca Transilvania"],
    [
      "Sumă",
      `<strong style="font-size:16px;color:${B.textH};">${d.totalPrice} RON</strong>`,
    ],
    [
      "Referință",
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

${banner(
  `⚠️ <strong>Important:</strong> Menționează obligatoriu referința
   <strong>${d.bookingRef}</strong> în descrierea transferului.
   Rezervarea va fi confirmată în maxim <strong>24 de ore</strong> de la primirea plății.`,
  B.orangeLight,
  B.orangeBorder,
  B.orange,
)}
${btn("Gestionează Rezervarea", `${B.site}/account`)}`;

  await transporter.sendMail({
    from: `"${B.name}" <${EMAIL_USER}>`,
    to: clientEmail,
    subject: `🏦 Instrucțiuni plată · ${d.bookingRef} · ${B.name}`,
    html: layout(
      body,
      `Transfer bancar pentru rezervarea ${d.bookingRef} — ${d.totalPrice} RON`,
    ),
  });
  console.log(
    `📧 [CLIENT] Instrucțiuni transfer → ${clientEmail} (${d.bookingRef})`,
  );
}

// 7. Reminder check-in → CLIENT
async function sendCheckInReminder(clientEmail, d) {
  const body = `
${title("🏔️", "Ne vedem mâine!", `Check-in: ${fmtDate(d.checkIn)}`)}
${hi(d.guestName)}
<p style="margin:0 0 24px;font-size:15px;color:${B.textB};line-height:1.85;">
  Abia așteptăm să vă primim mâine la <strong>${d.roomName}</strong>!
  Câteva informații utile pentru sosire:
</p>

<div style="border-radius:12px;overflow:hidden;border:1px solid ${B.border};margin:0 0 28px;">
  ${[
    [
      "🕑",
      "Check-in",
      `Mâine, ${fmtDate(d.checkIn)} &nbsp;·&nbsp; <strong>după ora 14:00</strong>`,
    ],
    ["🚗", "Parcare", "Gratuită — intrați direct în curte"],
    ["🍳", "Mic dejun", "Inclus · servit 08:00–10:00"],
    ["📶", "Wi-Fi", "Gratuit în toată pensiunea"],
    ["📞", "Recepție", B.phone],
  ]
    .map(
      ([emoji, l, v], i) => `
  <table width="100%" cellpadding="0" cellspacing="0" role="presentation"
    style="background:${i % 2 === 0 ? B.cardBg : B.rowEven};">
  <tr>
    <td style="padding:14px 16px;font-size:22px;width:48px;text-align:center;
      border-right:1px solid ${B.border};">${emoji}</td>
    <td style="padding:14px 12px;font-size:11px;font-weight:700;text-transform:uppercase;
      letter-spacing:0.8px;color:${B.textM};width:28%;border-right:1px solid ${B.border};">${l}</td>
    <td style="padding:14px 16px;font-size:14px;color:${B.textB};">${v}</td>
  </tr>
  </table>`,
    )
    .join("")}
</div>

${btn("Vezi Rezervarea", `${B.site}/account`)}`;

  await transporter.sendMail({
    from: `"${B.name}" <${EMAIL_USER}>`,
    to: clientEmail,
    subject: `🏔️ Ne vedem mâine! Check-in ${fmtDate(d.checkIn)} · ${B.name}`,
    html: layout(
      body,
      `Check-in mâine la ${d.roomName}. Vă așteptăm după 14:00!`,
    ),
  });
  console.log(`📧 [CLIENT] Reminder check-in → ${clientEmail}`);
}

// 8. Solicitare recenzie → CLIENT
async function sendReviewRequest(clientEmail, d) {
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
${title("⭐", "Cum a fost sejurul?", roomName)}
${hi(guestName)}
<p style="margin:0 0 28px;font-size:15px;color:${B.textB};line-height:1.85;">
  Sperăm că ai avut parte de o experiență de neuitat la ${B.name}.
  Opinia ta ne ajută enorm să creștem!
</p>

<div style="background:${B.rowEven};border-radius:14px;padding:28px;
  text-align:center;margin:0 0 28px;border:1px solid ${B.border};">
  <p style="margin:0 0 14px;font-size:12px;font-weight:700;text-transform:uppercase;
    letter-spacing:1px;color:${B.textM};">Apasă o stea pentru a lăsa recenzia</p>
  <div style="line-height:1;">${stars5}</div>
  <p style="margin:14px 0 0;font-size:12px;color:${B.textM};">
    ${fmtDate(checkIn)} → ${fmtDate(checkOut)}
  </p>
</div>

${btn("Lasă o Recenzie Completă", `${B.site}/reviews?ref=${bookingRef}&email=${encodeURIComponent(clientEmail)}&stars=5`)}
<p style="margin:22px 0 0;font-size:13px;color:${B.textM};text-align:center;line-height:1.8;">
  Îți mulțumim că ai ales ${B.name}.<br/>Abia așteptăm să te revedem!
</p>`;

  await transporter.sendMail({
    from: `"${B.name}" <${EMAIL_USER}>`,
    to: clientEmail,
    subject: `⭐ Cum a fost, ${guestName}? Spune-ne părerea ta!`,
    html: layout(body, `Cum a fost la ${roomName}? Lasă o recenzie!`),
  });
  console.log(`📧 [CLIENT] Solicitare recenzie → ${clientEmail}`);
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
${title("🙏", `Mulțumim, ${guestName}!`, "Recenzia ta a fost primită")}
<div style="background:${B.rowEven};border-radius:14px;padding:28px;
  text-align:center;margin:0 0 28px;border:1px solid ${B.border};">
  <div>${stars}</div>
  <p style="margin:10px 0 4px;font-size:17px;font-weight:700;color:${B.textH};">${rating}/5 stele</p>
  ${roomName ? `<p style="margin:0;font-size:13px;color:${B.textM};">${roomName}</p>` : ""}
</div>
<p style="margin:0 0 24px;font-size:15px;color:${B.textB};line-height:1.85;text-align:center;">
  ${
    autoApproved
      ? "Recenzia ta a fost publicată imediat. Mulțumim pentru aprecierea caldă!"
      : "Recenzia ta va fi verificată și publicată în scurt timp."
  }
</p>
${btn("Rezervă din Nou", `${B.site}/booking`)}`;

  await transporter.sendMail({
    from: `"${B.name}" <${EMAIL_USER}>`,
    to: clientEmail,
    subject: `🙏 Mulțumim pentru recenzie, ${guestName}!`,
    html: layout(
      body,
      `Recenzia ta de ${rating} stele a fost primită. Mulțumim!`,
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
        "⏳ Recenzia <strong>necesită aprobare</strong> — rating &lt; 4 stele.",
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
    "Rezervi camere rapid, fără să reintroduci datele",
    "Urmărești toate rezervările într-un singur loc",
    "Primești confirmări și reminder-uri automate",
    "Lași recenzii după fiecare sejur",
  ];
  const body = `
${title("🌿", `Bun venit, ${name}!`, "Contul tău a fost creat cu succes")}
<p style="margin:0 0 28px;font-size:15px;color:${B.textB};line-height:1.85;text-align:center;">
  Ești acum parte din comunitatea ${B.name}. Iată ce poți face:
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
${btn("Explorează Camerele", `${B.site}/rooms`)}`;

  await transporter.sendMail({
    from: `"${B.name}" <${EMAIL_USER}>`,
    to: userEmail,
    subject: `Bun venit la ${B.name}! 🌿`,
    html: layout(body, `Bun venit, ${name}! Contul tău a fost creat.`),
  });
  console.log(`📧 [CLIENT] Welcome → ${userEmail}`);
}

// 12. Schimbare parolă → CLIENT
async function sendPasswordChangedEmail(userEmail, name) {
  const body = `
${title("🔐", "Parolă Schimbată", "Securitatea contului tău")}
${hi(name)}
<p style="margin:0 0 24px;font-size:15px;color:${B.textB};line-height:1.85;">
  Parola contului tău a fost schimbată cu succes.
</p>
${banner(
  `⚠️ Dacă nu tu ai inițiat această schimbare, contactează-ne imediat la
  <strong>${B.phone}</strong> sau
  <a href="mailto:${B.email}" style="color:${B.green};">${B.email}</a>`,
  B.orangeLight,
  B.orangeBorder,
  B.orange,
)}
${btn("Mergi la Contul Meu", `${B.site}/account`)}`;

  await transporter.sendMail({
    from: `"${B.name}" <${EMAIL_USER}>`,
    to: userEmail,
    subject: `🔐 Parola a fost schimbată · ${B.name}`,
    html: layout(body, "Parola ta a fost schimbată cu succes."),
  });
  console.log(`📧 [CLIENT] Schimbare parolă → ${userEmail}`);
}

// 13. Ștergere cont → CLIENT
async function sendAccountDeletedEmail(userEmail, name) {
  const body = `
${title("👋", "Cont Șters", "Ne pare rău să te vedem plecând")}
${hi(name)}
<p style="margin:0 0 24px;font-size:15px;color:${B.textB};line-height:1.85;">
  Contul tău a fost șters cu succes. Toate datele tale personale au fost
  eliminate din sistemul nostru.
</p>
${banner(
  `Dacă te răzgândești, poți oricând să îți creezi un cont nou.
  Îți mulțumim că ai ales <strong>${B.name}</strong>!`,
  B.greenLight,
  B.greenBorder,
  B.green,
)}
${btn("Vizitează-ne din nou", B.site)}`;

  await transporter.sendMail({
    from: `"${B.name}" <${EMAIL_USER}>`,
    to: userEmail,
    subject: `Contul tău ${B.name} a fost șters`,
    html: layout(body, "Contul tău a fost șters. Îți mulțumim!"),
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
${btn(`Răspunde lui ${c.name}`, `mailto:${c.email}`)}
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
${title("✉️", "Mesaj Primit!", "Îți mulțumim că ne-ai contactat")}
${hi(name)}
<p style="margin:0 0 24px;font-size:15px;color:${B.textB};line-height:1.85;">
  Am primit mesajul tău și îți vom răspunde în cel mai scurt timp —
  de obicei în maximum <strong>24 de ore</strong>.
</p>
${banner(
  `Pentru urgențe ne poți contacta direct la <strong>${B.phone}</strong>`,
  B.greenLight,
  B.greenBorder,
  B.green,
)}
${btn("Explorează Camerele", `${B.site}/rooms`)}`;

  await transporter.sendMail({
    from: `"${B.name}" <${EMAIL_USER}>`,
    to: clientEmail,
    subject: `Mesajul tău a fost primit · ${B.name}`,
    html: layout(body, "Am primit mesajul tău. Îți vom răspunde în 24 de ore!"),
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

module.exports = {
  sendClientBookingConfirmation,
  sendAdminNewBookingAlert,
  sendBookingCancellation, // → CLIENT cu motiv
  sendAdminCancellationAlert, // → ADMIN simplă
  sendBankTransferInstructions,
  sendCheckInReminder,
  sendReviewRequest,
  sendClientReviewConfirmation,
  sendAdminNewReviewAlert,
  sendWelcomeEmail,
  sendPasswordChangedEmail,
  sendAccountDeletedEmail,
  sendAdminContactMessage,
  sendClientContactConfirmation,
  verifyConnection,
};
