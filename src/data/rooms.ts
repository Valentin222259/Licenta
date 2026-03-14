import roomDeluxe from "@/assets/room-deluxe.jpg";
import roomSuite from "@/assets/room-suite.jpg";
import roomStandard from "@/assets/room-standard.jpg";

// TODO: Înlocuiește imaginile de mai jos cu pozele reale ale camerelor
// când le ai disponibile. Momentan toate camerele folosesc pozele provizorii.
const roomWhite = roomStandard;   // Camera cu mobilier alb, fără balcon
const roomWhiteTub = roomDeluxe;  // Camera cu mobilier alb, fără balcon, cadă
const roomBordo = roomSuite;      // Camera cu mobilier bordo, cu balcon

export interface Room {
  id: string;
  name: string;
  description: string;
  shortDescription: string;
  price: number;
  capacity: number;
  image: string;
  images: string[];
  amenities: string[];
  reviews: { name: string; rating: number; text: string; date: string }[];
}

export const rooms: Room[] = [
  // ─── ETAJ 1 ────────────────────────────────────────────────────────────────

  {
    id: "camera-1",
    name: "Camera 1 — Comfort",
    shortDescription:
      "Cameră dublă cu mobilier alb, cabină de duș și vedere spre dealurile Maramureșului.",
    description:
      "Camera 1 este o cameră dublă spațioasă (18–23 mp), amenajată cu mobilier alb modern și pat matrimonial de 160×200 cm. Situată la primul etaj, oferă o priveliște liniștitoare spre dealurile și pădurile din jur. Baia proprie este dotată cu cabină de duș. La cerere se poate adăuga un pat suplimentar.",
    price: 250,
    capacity: 2,
    image: roomWhite,
    images: [roomWhite, roomBordo, roomStandard],
    amenities: [
      "Pat matrimonial 160×200 cm",
      "Cabină de duș",
      "Televizor cu canale prin satelit",
      "Wi-Fi gratuit",
      "Masă de birou",
      "Noptiere",
      "Măsuță de cafea",
      "Mobilier alb",
      "Încălzire centrală",
      "Pat suplimentar la cerere (+50 lei)",
    ],
    reviews: [
      {
        name: "Mihaela D.",
        rating: 5,
        text: "Cameră curată, confortabilă și cu o priveliște superbă. Gazdele sunt extraordinare!",
        date: "2025-08-10",
      },
    ],
  },

  {
    id: "camera-2",
    name: "Camera 2 — Balcon & Belvedere",
    shortDescription:
      "Cameră dublă cu balcon, mobilier bordo și priveliște panoramică spre Munții Maramureșului.",
    description:
      "Camera 2 dispune de un balcon generos de unde se poate admira panorama impresionantă spre Munții Maramureșului, Dealul Hera și, pe vreme senină, Creasta Cocoșului. Mobilierul bordo cald creează o atmosferă intimă și rustică, specifică Maramureșului. Baia proprie are cabină de duș. La cerere se poate adăuga pat suplimentar.",
    price: 250,
    capacity: 2,
    image: roomBordo,
    images: [roomBordo, roomWhite, roomSuite],
    amenities: [
      "Balcon cu vedere panoramică",
      "Pat matrimonial 160×200 cm",
      "Cabină de duș",
      "Televizor cu canale prin satelit",
      "Wi-Fi gratuit",
      "Masă de birou",
      "Noptiere",
      "Măsuță de cafea",
      "Mobilier bordo",
      "Încălzire centrală",
      "Pat suplimentar la cerere (+50 lei)",
    ],
    reviews: [
      {
        name: "Alexandru P.",
        rating: 5,
        text: "Balconul este pur și simplu magic. Am băut cafeaua dimineața cu muntele în față — de neuitat.",
        date: "2025-07-22",
      },
    ],
  },

  {
    id: "camera-3",
    name: "Camera 3 — Balcon & Pădure",
    shortDescription:
      "Cameră dublă cu balcon, mobilier bordo și vedere spre pădurea de pe Dealul Hera.",
    description:
      "Camera 3 oferă un balcon cu vedere spre pădurea de fag seculară de pe Dealul Hera. Mobilierul bordo și elementele decorative tradiționale maramureșene creează un ambient cald și primitor. Baia proprie este dotată cu cabină de duș. La cerere se poate adăuga pat suplimentar.",
    price: 250,
    capacity: 2,
    image: roomBordo,
    images: [roomBordo, roomStandard, roomDeluxe],
    amenities: [
      "Balcon cu vedere spre pădure",
      "Pat matrimonial 160×200 cm",
      "Cabină de duș",
      "Televizor cu canale prin satelit",
      "Wi-Fi gratuit",
      "Masă de birou",
      "Noptiere",
      "Măsuță de cafea",
      "Mobilier bordo",
      "Încălzire centrală",
      "Pat suplimentar la cerere (+50 lei)",
    ],
    reviews: [
      {
        name: "Ioana R.",
        rating: 5,
        text: "Liniștea de pe balcon, cu sunetul pădurii, a fost exact ce aveam nevoie. O cameră superbă.",
        date: "2025-09-05",
      },
    ],
  },

  {
    id: "camera-4",
    name: "Camera 4 — Comfort",
    shortDescription:
      "Cameră dublă cu mobilier alb, cabină de duș, fără balcon — liniște și confort.",
    description:
      "Camera 4 este o cameră dublă confortabilă la primul etaj, cu mobilier alb, pat matrimonial de 160×200 cm și baie proprie cu cabină de duș. Ideală pentru cupluri sau călătorii care caută liniște și confort la un preț accesibil. La cerere se poate adăuga pat suplimentar.",
    price: 250,
    capacity: 2,
    image: roomWhite,
    images: [roomWhite, roomBordo, roomStandard],
    amenities: [
      "Pat matrimonial 160×200 cm",
      "Cabină de duș",
      "Televizor cu canale prin satelit",
      "Wi-Fi gratuit",
      "Masă de birou",
      "Noptiere",
      "Măsuță de cafea",
      "Mobilier alb",
      "Încălzire centrală",
      "Pat suplimentar la cerere (+50 lei)",
    ],
    reviews: [
      {
        name: "Cristina M.",
        rating: 5,
        text: "Cameră foarte curată și confortabilă. Gazdele sunt ospitaliere și mâncarea tradițională este delicioasă.",
        date: "2025-06-18",
      },
    ],
  },

  // ─── ETAJ 2 ────────────────────────────────────────────────────────────────

  {
    id: "camera-5",
    name: "Camera 5 — Suite cu Cadă",
    shortDescription:
      "Cameră familială cu cadă, canapea extensibilă și mobilier alb — pentru până la 3 persoane.",
    description:
      "Camera 5 este cea mai spațioasă opțiune fără balcon de la etajul 2. Pe lângă patul matrimonial de 160×200 cm, dispune de o canapea extensibilă, ideală pentru o a treia persoană sau copii. Baia proprie este dotată cu cadă — un plus de confort după o zi de drumeții. La cerere se poate adăuga și un pat suplimentar.",
    price: 300,
    capacity: 3,
    image: roomWhiteTub,
    images: [roomWhiteTub, roomWhite, roomSuite],
    amenities: [
      "Pat matrimonial 160×200 cm",
      "Canapea extensibilă (loc 3)",
      "Cadă",
      "Televizor cu canale prin satelit",
      "Wi-Fi gratuit",
      "Masă de birou",
      "Noptiere",
      "Măsuță de cafea",
      "Mobilier alb",
      "Încălzire centrală",
      "Pat suplimentar la cerere (+50 lei)",
    ],
    reviews: [
      {
        name: "Familie Ionescu",
        rating: 5,
        text: "Am venit cu copilul și a fost perfect — canapea extensibilă, cadă, spațiu suficient. Recomandăm cu drag!",
        date: "2025-08-28",
      },
    ],
  },

  {
    id: "camera-6",
    name: "Camera 6 — Balcon & Belvedere",
    shortDescription:
      "Cameră dublă cu balcon la etaj 2, mobilier bordo și priveliște spre Munții Maramureșului.",
    description:
      "De la etajul 2, Camera 6 oferă una dintre cele mai spectaculoase priveliști ale pensiunii — Munții Maramureșului, Dealul Hera și, pe cer senin, silueta Vârfului Pietrosul. Balconul propriu, mobilierul bordo și atmosfera caldă o fac ideală pentru un sejur romantic sau o evadare în natură. Baia proprie are cabină de duș.",
    price: 250,
    capacity: 2,
    image: roomBordo,
    images: [roomBordo, roomDeluxe, roomStandard],
    amenities: [
      "Balcon etaj 2 — priveliște extinsă",
      "Pat matrimonial 160×200 cm",
      "Cabină de duș",
      "Televizor cu canale prin satelit",
      "Wi-Fi gratuit",
      "Masă de birou",
      "Noptiere",
      "Măsuță de cafea",
      "Mobilier bordo",
      "Încălzire centrală",
      "Pat suplimentar la cerere (+50 lei)",
    ],
    reviews: [
      {
        name: "Sophie & Marc",
        rating: 5,
        text: "The view from the balcony at sunrise was absolutely breathtaking. We will definitely come back!",
        date: "2025-07-14",
      },
    ],
  },

  {
    id: "camera-7",
    name: "Camera 7 — Balcon & Pădure",
    shortDescription:
      "Cameră dublă cu balcon la etaj 2, mobilier bordo și vedere spre pădurea Dealului Hera.",
    description:
      "Camera 7 este situată la etajul 2 și dispune de un balcon cu vedere spre pădurea de fag a Dealului Hera. Liniștea naturii, mobilierul bordo și dotările moderne fac din aceasta o alegere excelentă pentru cei care vor să se deconecteze. Baia proprie are cabină de duș. La cerere se poate adăuga pat suplimentar.",
    price: 250,
    capacity: 2,
    image: roomBordo,
    images: [roomBordo, roomSuite, roomWhite],
    amenities: [
      "Balcon etaj 2 — vedere spre pădure",
      "Pat matrimonial 160×200 cm",
      "Cabină de duș",
      "Televizor cu canale prin satelit",
      "Wi-Fi gratuit",
      "Masă de birou",
      "Noptiere",
      "Măsuță de cafea",
      "Mobilier bordo",
      "Încălzire centrală",
      "Pat suplimentar la cerere (+50 lei)",
    ],
    reviews: [
      {
        name: "Andrei V.",
        rating: 5,
        text: "Ne-am simțit ca acasă. Balconul cu vederea spre pădure, seara la apus, este pur și simplu de poveste.",
        date: "2025-09-20",
      },
    ],
  },

  {
    id: "camera-8",
    name: "Camera 8 — Suite cu Cadă",
    shortDescription:
      "Cameră familială la etaj 2, cu cadă, canapea extensibilă și mobilier alb — pentru până la 3 persoane.",
    description:
      "Camera 8 este sora camerei 5, situată la etajul 2. Spațioasă și luminoasă, dispune de pat matrimonial de 160×200 cm, canapea extensibilă pentru o a treia persoană și baie proprie cu cadă. Fără balcon, dar cu liniștea și confortul specific etajului superior. Ideală pentru familii sau grupuri mici.",
    price: 300,
    capacity: 3,
    image: roomWhiteTub,
    images: [roomWhiteTub, roomSuite, roomBordo],
    amenities: [
      "Pat matrimonial 160×200 cm",
      "Canapea extensibilă (loc 3)",
      "Cadă",
      "Televizor cu canale prin satelit",
      "Wi-Fi gratuit",
      "Masă de birou",
      "Noptiere",
      "Măsuță de cafea",
      "Mobilier alb",
      "Încălzire centrală",
      "Pat suplimentar la cerere (+50 lei)",
    ],
    reviews: [
      {
        name: "Julia W.",
        rating: 5,
        text: "Reminds me of our best Alpine lodges, but with a unique Romanian soul. The bathtub was a lovely touch after hiking.",
        date: "2025-10-03",
      },
    ],
  },
];