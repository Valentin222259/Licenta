// backend/services/emailBilingual.js
// Wrapper care trimite emailuri în limba preferată de client.
// Adaugă preferred_language la POST /api/bookings și salvează în DB.
//
// Cum funcționează:
//  - Frontend trimite preferred_language: "en" | "ro" la creare rezervare
//  - Backend îl salvează în bookings.preferred_language
//  - La confirmare/anulare/reminder, emailul se trimite în acea limbă

"use strict";

// ─── Texte bilingve ───────────────────────────────────────────────────────────
const T = {
  ro: {
    confirmation: {
      subject: (ref) =>
        `✓ Confirmare rezervare · Ref: ${ref} · Maramureș Belvedere`,
      heading: "Rezervare Confirmată",
      subheading: (isAdvance) =>
        isAdvance
          ? "Avansul în cuantum de 30% a fost înregistrat cu succes"
          : "Plata integrală a fost procesată cu succes",
      greeting: (name) => `Stimate/Stimată ${name},`,
      body: "Vă mulțumim pentru încrederea acordată și pentru alegerea de a fi oaspeții <strong>Maramureș Belvedere</strong>. Ne face o deosebită plăcere să vă confirmăm oficial rezervarea.",
      paidOnline: "Sumă achitată online",
      remainingAtCheckin: "Sold rămas de achitat la recepție",
      totalStay: "Valoare totală sejur",
      arrivalNote:
        "La momentul sosirii, vă rugăm să aveți în vedere achitarea diferenței în valoare de",
      checkIn: "Dată check-in",
      checkOut: "Dată check-out",
      nights: (n) => `${n} ${n === 1 ? "noapte" : "nopți"}`,
      total: "Total",
      reference: "Număr referință",
      room: "Tip cameră",
      parking: "Parcare privată",
      parkingDesc: "Acces gratuit, cu supraveghere video",
      wifi: "Acces internet",
      wifiDesc: "Conexiune Wi-Fi gratuită în întreaga incintă",
      manageBooking: "Gestionare Rezervare",
    },
    cancellation: {
      subject: (ref) => `Anulare rezervare · Ref: ${ref} · Maramureș Belvedere`,
      heading: "Confirmare Anulare",
      greeting: (name) => `Stimate/Stimată ${name},`,
      body: "Vă aducem la cunoștință, prin prezentul mesaj, anularea rezervării dumneavoastră, conform solicitării sau condițiilor aplicabile.",
      cancelReason: "Motivul anulării",
      newBooking: "Inițiere Rezervare Nouă",
    },
    checkinReminder: {
      subject: (date) =>
        `🏔️ Așteptăm cu nerăbdare sosirea dumneavoastră · Check-in: ${date}`,
      heading: "În curând, oaspeții noștri!",
      greeting: (name) => `Stimate/Stimată ${name},`,
      body: "Data sejurului dumneavoastră se apropie. Vă reamintim detaliile rezervării pentru a vă asigura o sosire cât mai confortabilă și lipsită de griji.",
    },
    reviewRequest: {
      subject: (name) =>
        `⭐ Cum a decurs șederea dumneavoastră, ${name}? Feedback-ul este valoros pentru noi.`,
      heading: "Impresii despre șederea dumneavoastră",
      greeting: (name) => `Stimate/Stimată ${name},`,
      body: "Sperăm că experiența dumneavoastră la <strong>Maramureș Belvedere</strong> a fost la înălțimea așteptărilor. V-am fi profund recunoscători dacă ne-ați acorda câteva momente pentru a ne împărtăși opinia dumneavoastră.",
      clickStar: "Vă rugăm să selectați un punctaj pentru a lăsa o recenzie",
      leaveReview: "Redactare Recenzie Detaliată",
    },
    bankTransfer: {
      subject: (ref) =>
        `🏦 Instrucțiuni pentru plată · Ref: ${ref} · Maramureș Belvedere`,
      heading: "Instrucțiuni de Plată",
      subheading: "Prin transfer bancar",
      greeting: (name) => `Stimate/Stimată ${name},`,
      body: "Vă mulțumim pentru inițierea rezervării. Pentru definitivarea și garantarea acesteia, vă adresăm rugămintea de a efectua plata prin transfer bancar în decurs de <strong>48 de ore</strong>.",
      bankDetails: "Informații bancare",
      beneficiary: "Beneficiar",
      iban: "Cont IBAN",
      bank: "Banca",
      amount: "Suma de transferat",
      reference: "Referință plată",
      importantNote: (ref) =>
        `Vă rugăm imperativ să menționați codul de referință <strong>${ref}</strong> la detaliile tranzacției. Rezervarea va fi confirmată oficial în cel mult <strong>24 de ore</strong> de la creditarea contului nostru.`,
    },
    expired: {
      subject: (ref) =>
        `⏰ Rezervare anulată automat · Ref: ${ref} · Maramureș Belvedere`,
      heading: "Expirare Termen Rezervare",
      greeting: (name) => `Stimate/Stimată ${name},`,
      body: (days) =>
        `Ne pare rău să vă informăm că, în absența confirmării plății prin transfer bancar în termenul stipulat de <strong>${days} zile</strong>, rezervarea dumneavoastră a fost anulată automat din sistemul nostru.`,
      newBooking: "Inițiere Rezervare Nouă",
    },
  },
  en: {
    confirmation: {
      subject: (ref) =>
        `✓ Booking Confirmation · Ref: ${ref} · Maramureș Belvedere`,
      heading: "Reservation Confirmed",
      subheading: (isAdvance) =>
        isAdvance
          ? "Your 30% advance payment has been successfully recorded"
          : "Your payment has been successfully processed in full",
      greeting: (name) => `Dear ${name},`,
      body: "We sincerely thank you for choosing <strong>Maramureș Belvedere</strong> for your upcoming stay. It is our pleasure to formally confirm your reservation.",
      paidOnline: "Amount settled online",
      remainingAtCheckin: "Outstanding balance due upon arrival",
      totalStay: "Total stay value",
      arrivalNote:
        "Upon check-in, please be advised that the remaining balance to be settled is",
      checkIn: "Check-in date",
      checkOut: "Check-out date",
      nights: (n) => `${n} ${n === 1 ? "night" : "nights"}`,
      total: "Total",
      reference: "Reference number",
      room: "Room category",
      parking: "Private parking",
      parkingDesc: "Complimentary access with video surveillance",
      wifi: "Internet access",
      wifiDesc: "Complimentary Wi-Fi connection throughout the premises",
      manageBooking: "Manage Reservation",
    },
    cancellation: {
      subject: (ref) =>
        `Reservation Cancelled · Ref: ${ref} · Maramureș Belvedere`,
      heading: "Cancellation Confirmation",
      greeting: (name) => `Dear ${name},`,
      body: "We write to formally acknowledge the cancellation of your reservation with us, in accordance with your request or the applicable terms.",
      cancelReason: "Reason for cancellation",
      newBooking: "Initiate New Reservation",
    },
    checkinReminder: {
      subject: (date) =>
        `🏔️ We look forward to welcoming you · Check-in: ${date}`,
      heading: "Your upcoming stay",
      greeting: (name) => `Dear ${name},`,
      body: "Your planned stay with us is approaching. Please find below a summary of your reservation details to ensure a seamless and comfortable arrival.",
    },
    reviewRequest: {
      subject: (name) =>
        `⭐ How was your experience, ${name}? Your feedback is highly valued.`,
      heading: "Impressions of your stay",
      greeting: (name) => `Dear ${name},`,
      body: "We trust that your time at <strong>Maramureș Belvedere</strong> met all your expectations. We would be immensely grateful if you could spare a few moments to share your valuable insights with us.",
      clickStar: "Please select a rating to leave your review",
      leaveReview: "Draft a Comprehensive Review",
    },
    bankTransfer: {
      subject: (ref) =>
        `🏦 Payment Instructions · Ref: ${ref} · Maramureș Belvedere`,
      heading: "Payment Instructions",
      subheading: "Via bank transfer",
      greeting: (name) => `Dear ${name},`,
      body: "Thank you for initiating your reservation. To fully secure and guarantee your booking, we respectfully request that you complete the payment via bank transfer within <strong>48 hours</strong>.",
      bankDetails: "Banking details",
      beneficiary: "Beneficiary",
      iban: "IBAN",
      bank: "Bank",
      amount: "Amount to transfer",
      reference: "Payment reference",
      importantNote: (ref) =>
        `It is imperative that you include the reference code <strong>${ref}</strong> in your transaction details. Your reservation will be officially confirmed within a maximum of <strong>24 hours</strong> upon the funds reaching our account.`,
    },
    expired: {
      subject: (ref) =>
        `⏰ Reservation Automatically Cancelled · Ref: ${ref} · Maramureș Belvedere`,
      heading: "Reservation Expired",
      greeting: (name) => `Dear ${name},`,
      body: (days) =>
        `We regret to inform you that your reservation has been automatically cancelled due to the non-receipt of the required bank transfer payment confirmation within the stipulated <strong>${days}-day</strong> timeframe.`,
      newBooking: "Initiate New Reservation",
    },
  },
};

/**
 * Returnează textele pentru o limbă, cu fallback la română.
 * @param {string} lang - "en" | "ro"
 */
function t(lang) {
  return T[lang] || T.ro;
}

module.exports = { t, T };
