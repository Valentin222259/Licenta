// src/lib/useSettings.ts
// Hook React pentru citirea setărilor configurabile din admin

import { useState, useEffect } from "react";
import { apiGet } from "./api";

export interface SiteSettings {
  // Prețuri
  price_breakfast: number;
  price_dinner: number;
  price_extra_bed: number;
  price_jacuzzi: number;
  // Home
  home_story_title: string;
  home_story_p1: string;
  home_story_p2: string;
  // About
  about_story_title: string;
  about_story_p1: string;
  about_story_p2: string;
  about_story_p3: string;
  // Facilități — titluri
  facility_jacuzzi_title: string;
  facility_bikes_title: string;
  facility_pingpong_title: string;
  facility_sleds_title: string;
  facility_grill_title: string;
  facility_parking_title: string;
  facility_playground_title: string;
  facility_traditional_title: string;
  // Facilități — descrieri
  facility_jacuzzi_desc: string;
  facility_bikes_desc: string;
  facility_pingpong_desc: string;
  facility_sleds_desc: string;
  facility_grill_desc: string;
  facility_parking_desc: string;
  facility_playground_desc: string;
  facility_traditional_desc: string;
  [key: string]: string | number;
}

// Valori implicite (fallback dacă backend-ul nu răspunde)
const DEFAULTS: SiteSettings = {
  price_breakfast: 50,
  price_dinner: 80,
  price_extra_bed: 50,
  price_jacuzzi: 100,
  home_story_title: "Povestea Noastră",
  home_story_p1:
    "Situată pe dealurile Maramureșului — una dintre ultimele regiuni cu adevărat nespoilate din Europa — Belvedere s-a născut din dragostea pentru acest pământ și tradițiile sale eterne.",
  home_story_p2:
    "Fiecare detaliu, de la balcoanele sculptate manual la micul dejun cu produse locale, reflectă sufletul Maramureșului.",
  about_story_title: "Povestea Pensiunii",
  about_story_p1:
    "Pensiunea Maramureș Belvedere este situată pe un vârf de deal, la intrarea în Petrova dinspre Sighetu Marmației.",
  about_story_p2:
    "Accesul este facil — la doar 100 m de pe DN 18.",
  about_story_p3:
    "Primii vecini se află la 500–700 m distanță.",
  facility_jacuzzi_title: "Jacuzzi / Ciubăr",
  facility_bikes_title: "Biciclete Gratuite",
  facility_pingpong_title: "Masă de Ping Pong",
  facility_sleds_title: "Săniuțe (Iarnă)",
  facility_grill_title: "Grătar & Ceaun",
  facility_parking_title: "Parcare Gratuită",
  facility_playground_title: "Loc de Joacă Copii",
  facility_traditional_title: "Port Tradițional",
  facility_jacuzzi_desc:
    "Ciubăr cu sistem de jacuzzi și iluminat ambiental. Poate fi rezervat contra cost.",
  facility_bikes_desc: "8 biciclete disponibile gratuit pentru oaspeți.",
  facility_pingpong_desc: "Masă de ping pong disponibilă gratuit.",
  facility_sleds_desc: "Săniuțe gratuite și derdeluș în curtea pensiunii.",
  facility_grill_desc: "Zonă pentru grătar și gătit la ceaun în aer liber.",
  facility_parking_desc: "Parcare privată gratuită pentru toți oaspeții.",
  facility_playground_desc:
    "Loc de joacă cu trambulină, leagăn și tobogan.",
  facility_traditional_desc:
    "Posibilitate de a îmbrăca portul tradițional maramureșean.",
};

export function useSettings() {
  const [settings, setSettings] = useState<SiteSettings>(DEFAULTS);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiGet<{ success: boolean; data: Partial<SiteSettings> }>("/api/settings")
      .then((res) => {
        setSettings({ ...DEFAULTS, ...res.data });
      })
      .catch(() => {
        // Folosim valorile implicite dacă backend-ul nu răspunde
      })
      .finally(() => setLoading(false));
  }, []);

  return { settings, loading };
}