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

function translateRoomName(roomName, lang) {
  if (lang !== "en" || !roomName) return roomName;
  console.log(
    `🔍 roomName primit: "${roomName}" | lungime: ${roomName.length}`,
  );

  const dictionary = {
    "Camera 1 — Confort": "Room 1 — Comfort",
    "Camera 2 — Balcon & Belvedere": "Room 2 — Balcony & Panoramic View",
    "Camera 3 — Balcon & Pădure": "Room 3 — Balcony & Forest View",
    "Camera 4 — Confort": "Room 4 — Comfort",
    "Camera 5 — Suite cu Cadă": "Room 5 — Suite with Bathtub",
    "Camera 6 — Balcon & Belvedere": "Room 6 — Balcony & Panoramic View",
    "Camera 7 — Balcon & Pădure": "Room 7 — Balcony & Forest View",
    "Camera 8 — Suite cu Cadă": "Room 8 — Suite with Bathtub",
  };

  // Returnează varianta în engleză sau face un fallback simplu (Camera -> Room)
  return dictionary[roomName] || roomName.replace("Camera", "Room");
}
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
function layout(body, preview = "", lang = "ro") {
  const isEn = lang === "en";
  const rightsText = isEn
    ? "All rights reserved"
    : "Toate drepturile rezervate";

  return `<!DOCTYPE html>
<html lang="${isEn ? "en" : "ro"}">
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
          © ${new Date().getFullYear()} ${B.name} · ${rightsText}
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

/** Salut personalizat bilingv*/
function hi(name, lang = "ro") {
  const greeting = lang === "en" ? "Hello" : "Bună ziua";
  return `<p style="margin:0 0 22px;font-size:15px;line-height:1.8;color:${B.textB};">
    ${greeting}, <strong style="color:${B.textH};">${name}</strong>,
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

/** Bloc servicii suplimentare (Apare doar dacă există extra-uri) */
function buildExtrasHtml(extras, lang = "ro") {
  // Verificăm dacă există obiectul și dacă are cel puțin o opțiune selectată
  if (!extras || typeof extras !== "object") return "";

  const { breakfast, dinner, extra_beds, jacuzzi, jacuzzi_dates } = extras;

  // Calculăm totaluri din structura per-zi
  const totalBreakfast =
    breakfast && typeof breakfast === "object"
      ? Object.values(breakfast).reduce((s, n) => s + (n || 0), 0)
      : breakfast || 0;
  const totalDinner =
    dinner && typeof dinner === "object"
      ? Object.values(dinner).reduce((s, n) => s + (n || 0), 0)
      : dinner || 0;
  const totalJacuzzi = Array.isArray(jacuzzi_dates)
    ? jacuzzi_dates.length
    : jacuzzi || 0;

  if (!totalBreakfast && !totalDinner && !extra_beds && !totalJacuzzi)
    return "";

  const fmtDate = (iso) => {
    const [y, m, d] = iso.split("-");
    return `${d}/${m}/${y}`;
  };

  const items = [];

  // Mic dejun — afișăm per zi dacă avem structura detaliată
  if (totalBreakfast > 0) {
    if (breakfast && typeof breakfast === "object") {
      const dayLines = Object.entries(breakfast)
        .filter(([, n]) => n > 0)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([date, n]) => {
          const unit =
            lang === "en"
              ? n === 1
                ? "menu"
                : "menus"
              : n === 1
                ? "meniu"
                : "meniuri";
          return `${fmtDate(date)}: ${n} ${unit}`;
        })
        .join(", ");
      items.push(
        lang === "en"
          ? `🥞 Traditional Breakfast — ${dayLines} (total: ${totalBreakfast} ${totalBreakfast === 1 ? "menu" : "menus"})`
          : `🥞 Mic dejun tradițional — ${dayLines} (total: ${totalBreakfast} ${totalBreakfast === 1 ? "meniu" : "meniuri"})`,
      );
    } else {
      items.push(
        lang === "en"
          ? `🥞 Traditional Breakfast — ${totalBreakfast} ${totalBreakfast === 1 ? "menu" : "menus"}`
          : `🥞 Mic dejun tradițional — ${totalBreakfast} ${totalBreakfast === 1 ? "meniu" : "meniuri"}`,
      );
    }
  }

  // Cină — la fel
  if (totalDinner > 0) {
    if (dinner && typeof dinner === "object") {
      const dayLines = Object.entries(dinner)
        .filter(([, n]) => n > 0)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([date, n]) => {
          const unit =
            lang === "en"
              ? n === 1
                ? "menu"
                : "menus"
              : n === 1
                ? "meniu"
                : "meniuri";
          return `${fmtDate(date)}: ${n} ${unit}`;
        })
        .join(", ");
      items.push(
        lang === "en"
          ? `🍲 Traditional Dinner — ${dayLines} (total: ${totalDinner} ${totalDinner === 1 ? "menu" : "menus"})`
          : `🍲 Cină tradițională — ${dayLines} (total: ${totalDinner} ${totalDinner === 1 ? "meniu" : "meniuri"})`,
      );
    } else {
      items.push(
        lang === "en"
          ? `🍲 Traditional Dinner — ${totalDinner} ${totalDinner === 1 ? "menu" : "menus"}`
          : `🍲 Cină tradițională — ${totalDinner} ${totalDinner === 1 ? "meniu" : "meniuri"}`,
      );
    }
  }

  if (extra_beds)
    items.push(
      lang === "en"
        ? `🛏️ Extra Bed (${extra_beds})`
        : `🛏️ Pat suplimentar (${extra_beds})`,
    );

  // Ciubăr — afișăm datele exacte
  if (totalJacuzzi > 0) {
    if (Array.isArray(jacuzzi_dates) && jacuzzi_dates.length > 0) {
      const dateList = jacuzzi_dates.sort().map(fmtDate).join(", ");
      items.push(
        lang === "en"
          ? `🫧 Outdoor Jacuzzi / Hot Tub — ${dateList} (${totalJacuzzi} ${totalJacuzzi === 1 ? "session" : "sessions"})`
          : `🫧 Ciubăr / Jacuzzi exterior — ${dateList} (${totalJacuzzi} ${totalJacuzzi === 1 ? "sesiune" : "sesiuni"})`,
      );
    } else {
      items.push(
        lang === "en"
          ? `🫧 Outdoor Jacuzzi / Hot Tub — ${totalJacuzzi} ${totalJacuzzi === 1 ? "session" : "sessions"}`
          : `🫧 Ciubăr / Jacuzzi exterior — ${totalJacuzzi} ${totalJacuzzi === 1 ? "sesiune" : "sesiuni"}`,
      );
    }
  }

  const titleText =
    lang === "en"
      ? "Requested Extra Services"
      : "Servicii Suplimentare Solicitate";

  return `
<div style="border-radius:12px;overflow:hidden;border:2px solid ${B.goldBorder};margin:0 0 28px 0;">
  <div style="background:${B.gold};padding:10px 20px;">
    <p style="margin:0;font-size:12px;font-weight:700;text-transform:uppercase;
      letter-spacing:1px;color:#fff;">${titleText}</p>
  </div>
  <div style="background:${B.goldLight};padding:16px 20px;">
    <ul style="margin:0;padding:0 0 0 20px;font-size:14px;color:${B.textB};line-height:1.8;">
      ${items.map((item) => `<li><strong>${item}</strong></li>`).join("")}
    </ul>
  </div>
</div>`;
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

  const roomNameTrans = translateRoomName(d.roomName, lang);

  // TRADUCERE PENTRU HEADER-UL VERDE DE PLATĂ
  const lblPaymentDetails = lang === "en" ? "Payment Details" : "Detalii plată";

  const paymentBlock = isAdvance
    ? `
<div style="border-radius:12px;overflow:hidden;border:1px solid ${B.border};margin:24px 0;">
  <div style="background:${B.green};padding:12px 20px;">
    <p style="margin:0;font-size:12px;font-weight:700;text-transform:uppercase;
      letter-spacing:1px;color:rgba(255,255,255,0.8);">${lblPaymentDetails}</p>
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

  const bookingRows = [
    [
      tx.reference,
      `<span style="font-weight:700;color:${B.green};font-size:15px;">${d.bookingRef}</span>`,
    ],
    [tx.room, roomNameTrans],
    [
      tx.checkIn,
      `${fmtDate(d.checkIn)}&nbsp;<span style="color:${B.textM};font-size:12px;">· ${lang === "en" ? "after 14:00" : "începând cu ora 14:00"}</span>`,
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
${buildExtrasHtml(d.extras, lang)}
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
    html: layout(body, "", lang),
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
${title("🔔", "Notificare Rezervare Nouă", pmLabel)}
<p style="text-align:center;margin:0 0 28px;font-size:15px;color:${B.textB};">
  Sistemul a înregistrat o nouă rezervare prin intermediul platformei online.
</p>

<div style="border-radius:12px;overflow:hidden;border:1px solid ${B.border};margin:0 0 24px;">
  ${[
    ["👤 Oaspete", d.guestName],
    [
      "✉️ E-mail",
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
${buildExtrasHtml(d.extras, "ro")}
${
  d.needsInvoice
    ? `
<div style="border-radius:12px;overflow:hidden;border:2px solid #d97706;margin:20px 0;">
  <div style="background:#92400e;padding:10px 20px;">
    <p style="margin:0;font-size:12px;font-weight:700;text-transform:uppercase;
      letter-spacing:1px;color:#fef3c7;">🧾 Solicitare Factură Fiscală</p>
  </div>
  ${[
    ["Denumire Companie", d.companyName || "—"],
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
      ⚠️ <strong>Acțiune necesară:</strong> Vă rugăm să emiteți factura fiscală în sistemul SmartBill ulterior procedurii de check-in și să o transmiteți la adresa <strong>${d.guestEmail}</strong>.
    </p>
  </div>
</div>
`
    : ""
}
${btn("Accesare Panou de Administrare", `${B.site}/admin/bookings`)}
<p style="margin:16px 0 0;font-size:11px;color:${B.textM};text-align:center;">
  Mesaj generat automat · ${new Date().toLocaleString("ro-RO")}
</p>`;

  await transporter.sendMail({
    from: `"${B.name}" <${EMAIL_USER}>`,
    to: adminEmail,
    replyTo: `"${d.guestName}" <${d.guestEmail}>`,
    subject: `🔔 Rezervare nouă · Ref: ${d.bookingRef} · ${d.guestName}`,
    html: layout(
      body,
      `Rezervare nouă recepționată de la ${d.guestName} — ${d.roomName}`,
    ),
  });
  console.log(`📧 [ADMIN] Alertă rezervare → ${adminEmail} (${d.bookingRef})`);
}

// 3. Anulare rezervare → CLIENT (cu motiv detaliat)
async function sendBookingCancellation(clientEmail, d, lang = "ro") {
  const tx = t(lang).cancellation;

  // TRADUCEM NUMELE CAMEREI
  const roomNameTrans = translateRoomName(d.roomName, lang);

  // NOU: TRADUCEM MOTIVUL ANULĂRII
  let reasonTrans = d.reason;
  if (lang === "en" && reasonTrans) {
    const reasonsDict = {
      "Planuri schimbate": "Plans changed",
      "Probleme de sănătate": "Health issues",
      "Eroare la rezervare": "Booking error",
      "Forță majoră": "Force majeure",
      "Neplata avansului": "Advance payment not received",
      "Neplata transferului bancar": "Bank transfer payment not received",
      "Cererea clientului": "Customer request",
      "Motiv personal": "Personal reasons",
    };
    // Traducem dacă găsim în dicționar, altfel îl lăsăm cum e
    reasonTrans = reasonsDict[reasonTrans] || reasonTrans;
  }

  // TRADUCEM ETICHETELE TABELULUI
  const lblRef = lang === "en" ? "Reference" : "Referință";
  const lblRoom = lang === "en" ? "Room" : "Cameră";
  const lblCheckIn = "Check-in";
  const lblCheckOut = "Check-out";
  const lblNights = lang === "en" ? "Nights" : "Nopți";
  const valNights = `${d.nights} ${d.nights === 1 ? (lang === "en" ? "night" : "noapte") : lang === "en" ? "nights" : "nopți"}`;
  const lblTotal = lang === "en" ? "Total" : "Total";

  const bookingRows = [
    [
      lblRef,
      `<span style="font-weight:700;color:${B.green};font-size:15px;">${d.bookingRef}</span>`,
    ],
    [lblRoom, roomNameTrans],
    [lblCheckIn, fmtDate(d.checkIn)],
    [lblCheckOut, fmtDate(d.checkOut)],
    [lblNights, valNights],
    [
      lblTotal,
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
${reasonTrans ? banner(`<strong>${tx.cancelReason}:</strong> ${reasonTrans}`, B.orangeLight, B.orangeBorder, B.orange) : ""}
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
    html: layout(body, "", lang),
  });
  console.log(
    `📧 [CLIENT] Anulare (${lang}) → ${clientEmail} (${d.bookingRef})`,
  );
}

// 4. Notificare anulare → ADMIN (simplă, fără motiv lung)
async function sendAdminCancellationAlert(adminEmail, d) {
  const body = `
${title("📋", "Notificare Anulare Rezervare", d.bookingRef)}
<div style="border-radius:12px;overflow:hidden;border:1px solid ${B.border};margin:0 0 24px;">
  ${[
    ["Referință", `<strong style="color:${B.green};">${d.bookingRef}</strong>`],
    ["Oaspete", d.guestName],
    [
      "E-mail",
      `<a href="mailto:${d.guestEmail}" style="color:${B.green};">${d.guestEmail}</a>`,
    ],
    ["Cameră", d.roomName],
    ["Dată Check-in", fmtDate(d.checkIn)],
    ["Dată Check-out", fmtDate(d.checkOut)],
    [
      "Motiv Anulare",
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
${btn("Accesare Panou de Administrare", `${B.site}/admin/bookings`)}
<p style="margin:16px 0 0;font-size:11px;color:${B.textM};text-align:center;">
  Mesaj generat automat · ${new Date().toLocaleString("ro-RO")}
</p>`;

  await transporter.sendMail({
    from: `"${B.name}" <${EMAIL_USER}>`,
    to: adminEmail,
    subject: `Anulare rezervare · Ref: ${d.bookingRef} · ${d.guestName}`,
    html: layout(
      body,
      `Rezervarea cu referința ${d.bookingRef} a fost anulată din sistem.`,
    ),
  });
  console.log(
    `📧 [ADMIN] Notificare anulare → ${adminEmail} (${d.bookingRef})`,
  );
}

// 5. Instrucțiuni transfer bancar → CLIENT
async function sendBankTransferInstructions(clientEmail, d, lang = "ro") {
  const tx = t(lang).bankTransfer;

  // TRADUCEM NUMELE CAMEREI (Helper intern curat)
  const roomNameTrans = translateRoomName(d.roomName, lang);

  // TRADUCEM ETICHETELE TABELULUI (evităm lipsa lor din emailBilingual.js)
  const lblRef = lang === "en" ? "Reference" : "Referință";
  const lblRoom = lang === "en" ? "Room" : "Cameră";
  const lblCheckIn = "Check-in";
  const lblCheckOut = "Check-out";
  const lblNights = lang === "en" ? "Nights" : "Nopți";
  const valNights = `${d.nights} ${d.nights === 1 ? (lang === "en" ? "night" : "noapte") : lang === "en" ? "nights" : "nopți"}`;
  const lblTotal = lang === "en" ? "Total" : "Total";

  const bookingRows = [
    [
      lblRef,
      `<span style="font-weight:700;color:${B.green};font-size:15px;">${d.bookingRef}</span>`,
    ],
    [lblRoom, roomNameTrans],
    [lblCheckIn, fmtDate(d.checkIn)],
    [lblCheckOut, fmtDate(d.checkOut)],
    [lblNights, valNights],
    [
      lblTotal,
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
${buildExtrasHtml(d.extras, lang)}
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
    html: layout(body, "", lang),
  });
  console.log(
    `📧 [CLIENT] Transfer bancar (${lang}) → ${clientEmail} (${d.bookingRef})`,
  );
}

// 6. Rezervare expirată (neplata avansului/transferului) → CLIENT
async function sendBookingExpired(clientEmail, d, lang = "ro") {
  // CURĂȚĂM LIMBA: forțăm litere mici și tăiem spațiile
  const safeLang = String(lang || "ro")
    .trim()
    .toLowerCase();

  // PRINTĂM ÎN CONSOLĂ PENTRU DEBUG:
  console.log(
    `\n🐛 [DEBUG EMAIL EXPIRARE] Ref: ${d.bookingRef} | Limba trimisă: "${lang}" | Limba curățată: "${safeLang}"\n`,
  );

  const tx = t(safeLang).expired;

  const i18n = {
    en: {
      ref: "Reference",
      room: "Room",
      checkIn: "Check-in",
      checkOut: "Check-out",
      nights: "Nights",
      total: "Total",
      nightsVal: `${d.nights} ${d.nights === 1 ? "night" : "nights"}`,
      subheading: "Payment could not be confirmed",
      warning: `⚠️ Reservation with reference ${d.bookingRef} has been automatically cancelled.`,
      contact:
        "If you have already made the payment or believe this cancellation is an error, please contact us urgently:",
      welcomeBack:
        "We remain at your disposal and hope to have the honor of hosting you on a future occasion.",
      phone: "Phone",
      email: "Email",
      footer: `Questions? Contact us anytime at <a href="mailto:${B.email}" style="color:${B.green};">${B.email}</a> or call us at ${B.phone}.`,
      preview: `Reservation ${d.bookingRef} has expired — payment was not confirmed within the allotted ${d.expireDays} days.`,
    },
    ro: {
      ref: "Referință",
      room: "Cameră",
      checkIn: "Check-in",
      checkOut: "Check-out",
      nights: "Nopți",
      total: "Total",
      nightsVal: `${d.nights} ${d.nights === 1 ? "noapte" : "nopți"}`,
      subheading: "Plata nu a putut fi confirmată",
      warning: `⚠️ Rezervarea cu numărul de referință ${d.bookingRef} a fost anulată automat din sistem.`,
      contact:
        "Dacă ați efectuat deja plata sau considerați că această anulare s-a produs dintr-o eroare, vă rugăm să ne contactați cât mai curând posibil:",
      welcomeBack:
        "Dacă totuși doriți să ne vizitați cu o altă ocazie, sunteți mai mult decât binevenit să plasați o nouă rezervare.",
      phone: "Telefon",
      email: "Email",
      footer: `Aveți întrebări? Ne puteți scrie oricând la <a href="mailto:${B.email}" style="color:${B.green};">${B.email}</a> sau ne puteți suna la ${B.phone}.`,
      preview: `Rezervarea ${d.bookingRef} a expirat — plata nu a fost confirmată în cele ${d.expireDays} zile acordate.`,
    },
  };

  const l = i18n[safeLang] || i18n.ro;

  const roomNameTrans = translateRoomName(d.roomName, safeLang);

  const bookingRows = [
    [
      l.ref,
      `<span style="font-weight:700;color:${B.green};font-size:15px;">${d.bookingRef}</span>`,
    ],
    [l.room, roomNameTrans],
    [l.checkIn, fmtDate(d.checkIn)],
    [l.checkOut, fmtDate(d.checkOut)],
    [l.nights, l.nightsVal],
    [
      l.total,
      `<strong style="font-size:16px;color:${B.textH};">${d.totalPrice} RON</strong>`,
    ],
  ];

  const bookingTableI18n = `
<div style="border-radius:12px;overflow:hidden;border:1px solid ${B.border};margin:28px 0;">
  ${bookingRows
    .map(
      ([label, value], i) => `
  <table width="100%" cellpadding="0" cellspacing="0" role="presentation"
    style="background:${i % 2 === 0 ? B.cardBg : B.rowEven};">
  <tr>
    <td style="padding:13px 20px;font-size:11px;font-weight:700;text-transform:uppercase;
      letter-spacing:0.9px;color:${B.textM};width:40%;border-right:1px solid ${B.border};">${label}</td>
    <td style="padding:13px 20px;font-size:14px;color:${B.textB};">${value}</td>
  </tr>
  </table>`,
    )
    .join("")}
</div>`;

  const body = `
${title("⏰", tx.heading, l.subheading)}
<p style="margin:0 0 22px;font-size:15px;line-height:1.8;color:${B.textB};">
  ${lang === "en" ? `Dear <strong style="color:${B.textH};">${d.guestName}</strong>,` : `Bună ziua, <strong style="color:${B.textH};">${d.guestName}</strong>,`}
</p>
<p style="margin:0 0 6px;font-size:15px;color:${B.textB};line-height:1.85;">
  ${tx.body(d.expireDays)}
</p>
 
${bookingTableI18n}
 
<div style="border-radius:10px;border:1px solid #fca5a5;background:#fef2f2;
  padding:14px 20px;margin:20px 0;">
  <p style="margin:0;font-size:14px;color:#b91c1c;font-weight:600;">
    ${l.warning}
  </p>
</div>
 
<p style="margin:0 0 16px;font-size:14px;color:${B.textB};line-height:1.8;">
  ${l.contact}
</p>
${infoRow("📞", l.phone, B.phone)}
${infoRow("✉️", l.email, `<a href="mailto:${B.email}" style="color:${B.green};">${B.email}</a>`)}
<p style="margin:24px 0 6px;font-size:15px;color:${B.textB};line-height:1.85;">
  ${l.welcomeBack}
</p>
 
${hr()}
${btn(tx.newBooking, `${B.site}/booking`)}
<p style="margin:22px 0 0;font-size:12px;color:${B.textM};text-align:center;">
  ${l.footer}
</p>`;

  await transporter.sendMail({
    from: `"${B.name}" <${EMAIL_USER}>`,
    to: clientEmail,
    subject: tx.subject(d.bookingRef),
    html: layout(body, l.preview, safeLang),
  });
  console.log(
    `📧 [CLIENT] Expirare rezervare (${safeLang}) → ${clientEmail} (${d.bookingRef})`,
  );
}

// 7. Reminder check-in → CLIENT
async function sendCheckInReminder(clientEmail, d, lang = "ro") {
  const tx = t(lang).checkinReminder;

  // TRADUCEM NUMELE CAMEREI
  const roomNameTranslated = translateRoomName(d.roomName, lang);

  const checkInLabel = lang === "en" ? "Check-in Date" : "Dată Check-in";
  const confirmText =
    lang === "en"
      ? "We formally confirm your reservation for"
      : "Vă confirmăm rezervarea pentru";

  const body = `
${title("🏔️", tx.heading, `${checkInLabel}: ${fmtDate(d.checkIn)}`)}
<p style="margin:0 0 22px;font-size:15px;line-height:1.8;color:${B.textB};">
  ${tx.greeting(d.guestName)}
</p>
<p style="margin:0 0 24px;font-size:15px;color:${B.textB};line-height:1.85;">
  ${tx.body} ${confirmText} <strong>${roomNameTranslated}</strong>.
</p>
<div style="border-radius:12px;overflow:hidden;border:1px solid ${B.border};margin:0 0 28px;">
  ${[
    [
      "🕑",
      "Check-in",
      `${fmtDate(d.checkIn)} · <strong>${lang === "en" ? "after 14:00" : "începând cu ora 14:00"}</strong>`,
    ],
    [
      "🚗",
      lang === "en" ? "Private Parking" : "Parcare Privată",
      lang === "en"
        ? "Complimentary access with video surveillance — direct courtyard access for your comfort."
        : "Acces gratuit și supravegheat video — parcare în curtea interioară pentru un plus de confort.",
    ],
    [
      "📶",
      "Wi-Fi",
      lang === "en"
        ? "Complimentary high-speed Wi-Fi connection throughout the premises"
        : "Conexiune de mare viteză gratuită în întreaga incintă a pensiunii",
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
${btn(lang === "en" ? "Manage Your Reservation" : "Detalii Rezervare", `${B.site}/account`)}`;

  await transporter.sendMail({
    from: `"${B.name}" <${EMAIL_USER}>`,
    to: clientEmail,
    subject: tx.subject(fmtDate(d.checkIn)),
    html: layout(body, "", lang),
  });
  console.log(`📧 [CLIENT] Reminder check-in (${lang}) → ${clientEmail}`);
}

// 8. Solicitare recenzie → CLIENT
async function sendReviewRequest(clientEmail, d, lang = "ro") {
  const tx = t(lang).reviewRequest;
  const { guestName, checkIn, checkOut, bookingRef } = d;

  // TRADUCEM NUMELE CAMEREI
  const roomNameTranslated = translateRoomName(d.roomName, lang);

  const stars5 = [1, 2, 3, 4, 5]
    .map(
      (n) => `
<a href="${B.site}/reviews?ref=${bookingRef}&email=${encodeURIComponent(clientEmail)}&stars=${n}"
  style="text-decoration:none;font-size:38px;color:#d4c4a8;line-height:1;margin:0 2px;">★</a>
`,
    )
    .join("");

  const body = `
${title("⭐", tx.heading, roomNameTranslated)}
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
    html: layout(body, "", lang),
  });
  console.log(`📧 [CLIENT] Solicitare recenzie (${lang}) → ${clientEmail}`);
}

// 9. Confirmare recenzie → CLIENT
async function sendClientReviewConfirmation(clientEmail, d, lang = "ro") {
  const safeLang = String(lang || "ro")
    .trim()
    .toLowerCase();
  const { guestName, rating, roomName, autoApproved } = d;

  const i18n = {
    en: {
      heading: `Thank you for your feedback, ${guestName}!`,
      subheading: "Your review has been successfully recorded",
      bodyApproved:
        "Thank you sincerely for the rating provided and for the precious time allocated! Your kind words are an honor and motivate us to maintain the highest standards of comfort and hospitality.",
      bodyPending:
        "Thank you for the feedback provided! Your review has been successfully recorded and will be published on our platform shortly.",
      btn: "Book Your Next Stay",
      subject: `🙏 Thank you for your review, ${guestName}!`,
      preview: `We have received your ${rating}-star review. Thank you for your trust!`,
      stars_label: `${rating}/5 stars`,
    },
    ro: {
      heading: `Vă mulțumim pentru feedback, ${guestName}!`,
      subheading: "Am înregistrat cu succes evaluarea dumneavoastră",
      bodyApproved:
        "Vă mulțumim deosebit pentru evaluarea acordată și pentru timpul prețios alocat! Aprecierile dumneavoastră reprezintă o onoare și ne motivează să menținem cele mai înalte standarde de confort și ospitalitate.",
      bodyPending:
        "Vă mulțumim pentru feedback-ul oferit! Evaluarea dumneavoastră a fost înregistrată cu succes și urmează să fie publicată pe platforma noastră în cel mai scurt timp.",
      btn: "Inițiere Rezervare Nouă",
      subject: `🙏 Vă mulțumim pentru recenzie, ${guestName}!`,
      preview: `Am primit evaluarea dumneavoastră de ${rating} stele. Vă mulțumim pentru încredere!`,
      stars_label: `${rating}/5 ${safeLang === "en" ? "stars" : "stele"}`,
    },
  };

  const l = i18n[safeLang] || i18n.ro;

  const stars = [1, 2, 3, 4, 5]
    .map(
      (i) =>
        `<span style="font-size:30px;color:${i <= rating ? "#d4a547" : B.border};">★</span>`,
    )
    .join("");

  const body = `
${title("🙏", l.heading, l.subheading)}
<div style="background:${B.rowEven};border-radius:14px;padding:28px;
  text-align:center;margin:0 0 28px;border:1px solid ${B.border};">
  <div>${stars}</div>
  <p style="margin:10px 0 4px;font-size:17px;font-weight:700;color:${B.textH};">${l.stars_label}</p>
  ${roomName ? `<p style="margin:0;font-size:13px;color:${B.textM};">${translateRoomName(roomName, safeLang)}</p>` : ""}
</div>
<p style="margin:0 0 24px;font-size:15px;color:${B.textB};line-height:1.85;text-align:center;">
  ${autoApproved ? l.bodyApproved : l.bodyPending}
</p>
${btn(l.btn, `${B.site}/booking`)}`;

  await transporter.sendMail({
    from: `"${B.name}" <${EMAIL_USER}>`,
    to: clientEmail,
    subject: l.subject,
    html: layout(body, l.preview, safeLang),
  });
  console.log(`📧 [CLIENT] Confirmare recenzie (${safeLang}) → ${clientEmail}`);
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
${title("⭐", "Evaluare Nouă", autoApproved ? "Aprobată și publicată automat" : "Necesită moderare manuală")}
<div style="text-align:center;margin:0 0 28px;">
  ${stars}
  <p style="margin:8px 0 0;font-size:14px;font-weight:700;color:#d4a547;">${rating}/5 stele</p>
</div>
<div style="border-radius:12px;overflow:hidden;border:1px solid ${B.border};margin:0 0 24px;">
  ${[
    ["Oaspete", guestName],
    [
      "E-mail",
      `<a href="mailto:${guestEmail}" style="color:${B.green};">${guestEmail}</a>`,
    ],
    ["Cameră", roomName || "—"],
    ["Punctaj", `${rating}/5 stele`],
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
    letter-spacing:0.8px;color:${B.textM};">Conținut Recenzie</p>
  <p style="margin:0;font-size:15px;color:${B.textB};line-height:1.9;font-style:italic;">
    "${text}"
  </p>
</div>
${
  autoApproved
    ? banner(
        "✅ Prezenta evaluare a fost <strong>publicată automat</strong> pe platformă (punctaj ≥ 4 stele).",
        B.greenLight,
        B.greenBorder,
        B.green,
      )
    : banner(
        "⏳ Această evaluare <strong>necesită aprobare manuală</strong> înainte de publicare (punctaj &lt; 4 stele).",
        B.orangeLight,
        B.orangeBorder,
        B.orange,
      )
}
${!autoApproved ? btn("Aprobare Recenzie", `${B.site}/admin/reviews`) : ""}`;

  await transporter.sendMail({
    from: `"${B.name}" <${EMAIL_USER}>`,
    to: adminEmail,
    replyTo: `"${guestName}" <${guestEmail}>`,
    subject: `${autoApproved ? "⭐" : "⏳"} Evaluare ${rating}/5 · ${guestName}`,
    html: layout(body, `Evaluare nouă de la ${guestName}: ${rating} stele.`),
  });
  console.log(`📧 [ADMIN] Recenzie nouă → ${adminEmail}`);
}

// 11. Bun venit → CLIENT
async function sendWelcomeEmail(userEmail, name, lang = "ro") {
  const safeLang = String(lang || "ro")
    .trim()
    .toLowerCase();

  const i18n = {
    en: {
      heading: `Welcome, ${name}!`,
      subheading: "Your account has been successfully created",
      body: `It is a great pleasure to welcome you! From now on, planning your stays at <strong>${B.name}</strong> becomes a simplified and more enjoyable experience:`,
      items: [
        "Fast booking process without the need to re-enter your personal details",
        "Centralized management of all your reservations",
        "Automatic receipt of confirmations and stay details",
        "The ability to quickly provide feedback at the end of each stay",
      ],
      btn: "Explore Available Rooms",
      preview: `Welcome, ${name}! Your account has been created and is ready to use.`,
    },
    ro: {
      heading: `Bun venit, ${name}!`,
      subheading: "Contul dumneavoastră a fost creat cu succes",
      body: `Este o deosebită plăcere să vă urăm bun venit! Începând de acum, planificarea sejururilor dumneavoastră la <strong>${B.name}</strong> devine o experiență simplificată și mai plăcută:`,
      items: [
        "Efectuarea rapidă a rezervărilor, fără necesitatea reintroducerii datelor personale",
        "Gestionarea centralizată a tuturor rezervărilor dumneavoastră",
        "Recepționarea automată a confirmărilor și a detaliilor privind sejurul",
        "Posibilitatea de a oferi feedback rapid la finalul fiecărei șederi",
      ],
      btn: "Explorare Camere Disponibile",
      preview: `Bun venit, ${name}! Contul dumneavoastră a fost creat și este gata de utilizare.`,
    },
  };

  const l = i18n[safeLang] || i18n.ro;

  const body = `
${title("🌿", l.heading, l.subheading)}
<p style="margin:0 0 28px;font-size:15px;color:${B.textB};line-height:1.85;text-align:center;">
  ${l.body}
</p>
<div style="border-radius:12px;overflow:hidden;border:1px solid ${B.border};margin:0 0 32px;">
  ${l.items
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
${btn(l.btn, `${B.site}/rooms`)}`;

  await transporter.sendMail({
    from: `"${B.name}" <${EMAIL_USER}>`,
    to: userEmail,
    subject:
      safeLang === "en"
        ? `Welcome to ${B.name}! 🌿`
        : `Bun venit la ${B.name}! 🌿`,
    html: layout(body, l.preview, safeLang),
  });
  console.log(`📧 [CLIENT] Welcome (${safeLang}) → ${userEmail}`);
}

// 12. Schimbare parolă → CLIENT
async function sendPasswordChangedEmail(userEmail, name, lang = "ro") {
  const safeLang = String(lang || "ro")
    .trim()
    .toLowerCase();

  const i18n = {
    en: {
      heading: "Password Updated",
      subheading: "Security notification",
      body: "Please be advised that the password associated with your account has been successfully updated.",
      warning: `⚠️ If you did not authorize this change, it is imperative that you contact us urgently at <strong>${B.phone}</strong> or by email at <a href="mailto:${B.email}" style="color:${B.green};">${B.email}</a>.`,
      btn: "Access My Account",
      preview: "The password for your account has been successfully updated.",
    },
    ro: {
      heading: "Parolă Actualizată",
      subheading: "Notificare de securitate",
      body: "Vă aducem la cunoștință faptul că parola asociată contului dumneavoastră a fost actualizată cu succes.",
      warning: `⚠️ Dacă nu dumneavoastră ați autorizat această modificare, vă rugăm imperativ să ne contactați de urgență la <strong>${B.phone}</strong> sau prin e-mail la <a href="mailto:${B.email}" style="color:${B.green};">${B.email}</a>.`,
      btn: "Accesare Contul Meu",
      preview: "Parola contului dumneavoastră a fost actualizată cu succes.",
    },
  };

  const l = i18n[safeLang] || i18n.ro;

  const body = `
${title("🔐", l.heading, l.subheading)}
${hi(name, safeLang)}
<p style="margin:0 0 24px;font-size:15px;color:${B.textB};line-height:1.85;">
  ${l.body}
</p>
${banner(l.warning, B.orangeLight, B.orangeBorder, B.orange)}
${btn(l.btn, `${B.site}/account`)}`;

  await transporter.sendMail({
    from: `"${B.name}" <${EMAIL_USER}>`,
    to: userEmail,
    subject:
      safeLang === "en"
        ? `🔐 Password has been updated · ${B.name}`
        : `🔐 Parola a fost actualizată · ${B.name}`,
    html: layout(body, l.preview, safeLang),
  });
  console.log(`📧 [CLIENT] Schimbare parolă (${safeLang}) → ${userEmail}`);
}

// 13. Ștergere cont → CLIENT
async function sendAccountDeletedEmail(userEmail, name, lang = "ro") {
  const safeLang = String(lang || "ro")
    .trim()
    .toLowerCase();

  const i18n = {
    en: {
      heading: "Account Deletion Confirmation",
      subheading: "Procedure successfully completed",
      body: "We formally confirm the completion of the closure and deletion procedure for your account. All personal data has been permanently removed from our systems, in strict compliance with our privacy policies.",
      banner: `Thank you for your trust and for your visits! Should you wish to return as a guest to <strong>${B.name}</strong>, you will always be welcome to re-register.`,
      btn: "Visit Website",
      preview: "Your account has been successfully deleted from our system.",
    },
    ro: {
      heading: "Confirmare Ștergere Cont",
      subheading: "Procedură finalizată cu succes",
      body: "Vă confirmăm oficial finalizarea procedurii de închidere și ștergere a contului dumneavoastră. Toate datele cu caracter personal au fost eliminate definitiv din sistemele noastre, în deplină conformitate cu politicile de confidențialitate.",
      banner: `Vă mulțumim pentru încrederea acordată și pentru vizitele dumneavoastră! În cazul în care doriți să reveniți ca oaspete la <strong>${B.name}</strong>, veți fi oricând binevenit să vă reînregistrați.`,
      btn: "Vizitare Website",
      preview:
        "Contul dumneavoastră a fost șters cu succes din sistemul nostru.",
    },
  };

  const l = i18n[safeLang] || i18n.ro;

  const body = `
${title("👋", l.heading, l.subheading)}
${hi(name, safeLang)}
<p style="margin:0 0 24px;font-size:15px;color:${B.textB};line-height:1.85;">
  ${l.body}
</p>
${banner(l.banner, B.greenLight, B.greenBorder, B.green)}
${btn(l.btn, B.site)}`;

  await transporter.sendMail({
    from: `"${B.name}" <${EMAIL_USER}>`,
    to: userEmail,
    subject:
      safeLang === "en"
        ? `Your ${B.name} account has been deleted`
        : `Contul dumneavoastră ${B.name} a fost șters`,
    html: layout(body, l.preview, safeLang),
  });
  console.log(`📧 [CLIENT] Ștergere cont (${safeLang}) → ${userEmail}`);
}

// 14. Mesaj contact → ADMIN
async function sendAdminContactMessage(adminEmail, c) {
  const body = `
${title("✉️", "Mesaj Nou de Contact", "Solicitare recepționată via website")}
<div style="border-radius:12px;overflow:hidden;border:1px solid ${B.border};margin:0 0 24px;">
  ${[
    ["Nume Expeditor", c.name],
    [
      "E-mail",
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
  letter-spacing:0.8px;color:${B.textM};">Conținut Mesaj</p>
<div style="background:${B.rowEven};border-left:4px solid ${B.green};
  border-radius:0 10px 10px 0;padding:20px 24px;margin:0 0 28px;">
  <p style="margin:0;font-size:15px;color:${B.textB};line-height:1.9;white-space:pre-wrap;">${c.message}</p>
</div>
${btn(`Răspunde către ${c.name}`, `mailto:${c.email}`)}
<p style="margin:16px 0 0;font-size:12px;color:${B.textM};text-align:center;">
  Puteți utiliza funcția Reply a clientului dumneavoastră de e-mail pentru a răspunde direct expeditorului.
</p>`;

  await transporter.sendMail({
    from: `"${B.name}" <${EMAIL_USER}>`,
    to: adminEmail,
    replyTo: `"${c.name}" <${c.email}>`,
    subject: `✉️ Solicitare Contact: ${c.name}${c.subject ? ` · ${c.subject}` : ""}`,
    html: layout(
      body,
      `Mesaj de la ${c.name}: ${(c.message || "").substring(0, 80)}`,
    ),
  });
  console.log(`📧 [ADMIN] Mesaj contact → ${adminEmail}`);
}

// 15. Confirmare contact → CLIENT
async function sendClientContactConfirmation(clientEmail, name, lang = "ro") {
  const safeLang = String(lang || "ro")
    .trim()
    .toLowerCase();

  const i18n = {
    en: {
      heading: "Message Received",
      subheading: "Thank you for contacting us!",
      body: "We hereby confirm the receipt of your message. Our team will review your request and provide a detailed response as soon as possible (typically within a maximum of <strong>24 hours</strong>).",
      banner: `For situations requiring immediate assistance, we remain at your disposal directly at our phone number <strong>${B.phone}</strong>.`,
      btn: "Explore Available Rooms",
      preview:
        "We have received your message and will reply as soon as possible.",
    },
    ro: {
      heading: "Mesaj Recepționat",
      subheading: "Vă mulțumim pentru contact!",
      body: "Vă confirmăm recepționarea mesajului dumneavoastră. Echipa noastră va analiza solicitarea și va formula un răspuns detaliat în cel mai scurt timp posibil (în mod standard, în decurs de maximum <strong>24 de ore</strong>).",
      banner: `Pentru situații care necesită asistență imediată, vă stăm la dispoziție direct la numărul de telefon <strong>${B.phone}</strong>.`,
      btn: "Explorare Camere Disponibile",
      preview:
        "Am recepționat mesajul dumneavoastră și vă vom răspunde în cel mai scurt timp posibil.",
    },
  };

  const l = i18n[safeLang] || i18n.ro;

  const body = `
${title("✉️", l.heading, l.subheading)}
${hi(name, safeLang)}
<p style="margin:0 0 24px;font-size:15px;color:${B.textB};line-height:1.85;">
  ${l.body}
</p>
${banner(l.banner, B.greenLight, B.greenBorder, B.green)}
${btn(l.btn, `${B.site}/rooms`)}`;

  await transporter.sendMail({
    from: `"${B.name}" <${EMAIL_USER}>`,
    to: clientEmail,
    subject:
      safeLang === "en"
        ? `Your message has been registered · ${B.name}`
        : `Mesajul dumneavoastră a fost înregistrat · ${B.name}`,
    html: layout(body, l.preview, safeLang),
  });
  console.log(`📧 [CLIENT] Confirmare contact (${safeLang}) → ${clientEmail}`);
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
  translateRoomName,
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
