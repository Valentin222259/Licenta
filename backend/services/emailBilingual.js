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
      subject: (ref) => `✓ Rezervare confirmată · ${ref} · Maramureș Belvedere`,
      heading: "Rezervare Confirmată!",
      subheading: (isAdvance) =>
        isAdvance
          ? "Avansul de 30% a fost plătit cu succes"
          : "Plata a fost procesată cu succes",
      greeting: (name) => `Bună ziua, ${name},`,
      body: "Vă mulțumim că ați ales <strong>Maramureș Belvedere</strong>! Rezervarea dumneavoastră este confirmată.",
      paidOnline: "Plătit acum online",
      remainingAtCheckin: "Rest de achitat la check-in",
      totalStay: "Total sejur",
      arrivalNote: "La sosire, vă rugăm să achitați diferența de",
      checkIn: "Check-in",
      checkOut: "Check-out",
      nights: (n) => `${n} ${n === 1 ? "noapte" : "nopți"}`,
      total: "Total",
      reference: "Referință",
      room: "Cameră",
      parking: "Parcare",
      parkingDesc: "Gratuită și supravegheată",
      wifi: "Wi-Fi",
      wifiDesc: "Gratuit în toată pensiunea",
      manageBooking: "Gestionați Rezervarea",
    },
    cancellation: {
      subject: (ref) => `Rezervare anulată · ${ref} · Maramureș Belvedere`,
      heading: "Rezervare Anulată",
      greeting: (name) => `Bună ziua, ${name},`,
      body: "Vă confirmăm pe această cale anularea rezervării dumneavoastră.",
      cancelReason: "Motivul anulării",
      newBooking: "Efectuați o Nouă Rezervare",
    },
    checkinReminder: {
      subject: (date) =>
        `🏔️ Ne vedem mâine! Check-in ${date} · Maramureș Belvedere`,
      heading: "Ne vedem mâine!",
      greeting: (name) => `Bună ziua, ${name},`,
      body: "Mai este foarte puțin până la vacanța dumneavoastră!",
    },
    reviewRequest: {
      subject: (name) =>
        `⭐ Cum v-ați simțit, ${name}? Părerea dumneavoastră contează!`,
      heading: "Cum a fost șederea dumneavoastră?",
      greeting: (name) => `Bună ziua, ${name},`,
      body: "Sperăm că v-ați simțit minunat la <strong>Maramureș Belvedere</strong>. Recenzia dumneavoastră ne ajută enorm!",
      clickStar: "Apăsați pe o stea pentru a lăsa recenzia",
      leaveReview: "Lăsați o Recenzie Completă",
    },
    bankTransfer: {
      subject: (ref) => `🏦 Instrucțiuni plată · ${ref} · Maramureș Belvedere`,
      heading: "Instrucțiuni Plată",
      subheading: "Transfer bancar",
      greeting: (name) => `Bună ziua, ${name},`,
      body: "Vă mulțumim pentru rezervare! Pentru a o confirma definitiv, vă rugăm să efectuați plata prin transfer bancar în termen de <strong>48 de ore</strong>.",
      bankDetails: "Date cont bancar",
      beneficiary: "Beneficiar",
      iban: "IBAN",
      bank: "Bancă",
      amount: "Sumă",
      reference: "Referință",
      importantNote: (ref) =>
        `Vă rugăm să menționați obligatoriu referința <strong>${ref}</strong> în detaliile transferului. Rezervarea va fi confirmată oficial în maximum <strong>24 de ore</strong>.`,
    },
    expired: {
      subject: (ref) => `⏰ Rezervare expirată · ${ref} · Maramureș Belvedere`,
      heading: "Rezervare Expirată",
      greeting: (name) => `Bună ziua, ${name},`,
      body: (days) =>
        `Vă informăm că rezervarea dumneavoastră a fost anulată automat, deoarece nu am recepționat confirmarea plății prin transfer bancar în intervalul alocat de <strong>${days} zile</strong>.`,
      newBooking: "Efectuați o Nouă Rezervare",
    },
  },
  en: {
    confirmation: {
      subject: (ref) => `✓ Booking confirmed · ${ref} · Maramureș Belvedere`,
      heading: "Booking Confirmed!",
      subheading: (isAdvance) =>
        isAdvance
          ? "Your 30% advance has been processed successfully"
          : "Your payment has been processed successfully",
      greeting: (name) => `Dear ${name},`,
      body: "Thank you for choosing <strong>Maramureș Belvedere</strong>! Your booking is confirmed.",
      paidOnline: "Paid online now",
      remainingAtCheckin: "Remaining at check-in",
      totalStay: "Total stay",
      arrivalNote: "Upon arrival, please pay the remaining balance of",
      checkIn: "Check-in",
      checkOut: "Check-out",
      nights: (n) => `${n} ${n === 1 ? "night" : "nights"}`,
      total: "Total",
      reference: "Reference",
      room: "Room",
      parking: "Parking",
      parkingDesc: "Free and supervised",
      wifi: "Wi-Fi",
      wifiDesc: "Free throughout the guesthouse",
      manageBooking: "Manage Your Booking",
    },
    cancellation: {
      subject: (ref) => `Booking cancelled · ${ref} · Maramureș Belvedere`,
      heading: "Booking Cancelled",
      greeting: (name) => `Dear ${name},`,
      body: "We hereby confirm the cancellation of your booking.",
      cancelReason: "Reason for cancellation",
      newBooking: "Make a New Booking",
    },
    checkinReminder: {
      subject: (date) =>
        `🏔️ See you tomorrow! Check-in ${date} · Maramureș Belvedere`,
      heading: "See you tomorrow!",
      greeting: (name) => `Dear ${name},`,
      body: "Your holiday is almost here!",
    },
    reviewRequest: {
      subject: (name) => `⭐ How was your stay, ${name}? Your opinion matters!`,
      heading: "How was your stay?",
      greeting: (name) => `Dear ${name},`,
      body: "We hope you had a wonderful stay at <strong>Maramureș Belvedere</strong>. Your review means the world to us!",
      clickStar: "Click a star to leave your review",
      leaveReview: "Leave a Full Review",
    },
    bankTransfer: {
      subject: (ref) =>
        `🏦 Payment instructions · ${ref} · Maramureș Belvedere`,
      heading: "Payment Instructions",
      subheading: "Bank transfer",
      greeting: (name) => `Dear ${name},`,
      body: "Thank you for your booking! To confirm it, please make the bank transfer within <strong>48 hours</strong>.",
      bankDetails: "Bank account details",
      beneficiary: "Beneficiary",
      iban: "IBAN",
      bank: "Bank",
      amount: "Amount",
      reference: "Reference",
      importantNote: (ref) =>
        `Please include the reference <strong>${ref}</strong> in your transfer details. Your booking will be confirmed within <strong>24 hours</strong> of receiving payment.`,
    },
    expired: {
      subject: (ref) => `⏰ Booking expired · ${ref} · Maramureș Belvedere`,
      heading: "Booking Expired",
      greeting: (name) => `Dear ${name},`,
      body: (days) =>
        `We regret to inform you that your booking has been automatically cancelled because we did not receive your bank transfer confirmation within the allotted <strong>${days} days</strong>.`,
      newBooking: "Make a New Booking",
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
