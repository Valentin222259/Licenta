import { useState, useEffect, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { apiGet } from "@/lib/api";

interface SettingsRow {
  key: string;
  value: string;
  type: string;
  group_name: string;
}

// 1. ADAUGĂ DEFAULTS AICI PENTRU A AVEA TEXT ÎNAINTE DE RĂSPUNSUL API-ULUI
const DEFAULTS: Record<string, any> = {
  price_breakfast: 50,
  price_dinner: 80,
  price_extra_bed: 50,
  price_jacuzzi: 100,
  home_story_title: "Povestea Noastră",
  home_story_p1: "Situată pe dealurile Maramureșului — una dintre ultimele regiuni cu adevărat nespoilate din Europa — Belvedere s-a născut din dragostea pentru acest pământ și tradițiile sale eterne.",
  home_story_p2: "Fiecare detaliu, de la balcoanele sculptate manual la micul dejun cu produse locale, reflectă sufletul Maramureșului.",
  about_story_title: "Povestea Pensiunii",
  // Adaugă și restul textelor de care ai nevoie...
};

export function useSettings() {
  const { i18n } = useTranslation();
  
  // 2. FOLOSEȘTE DEFAULTS AICI ÎN LOC DE {}
  const [rawSettings, setRawSettings] = useState<Record<string, any>>(DEFAULTS);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiGet<{ data: SettingsRow[] }>("/api/settings")
      .then((res) => {
        // 3. COMBINĂ DEFAULTS CU DATELE PRIMITE DE LA BAZA DE DATE
        const map: Record<string, any> = { ...DEFAULTS }; 
        for (const row of res.data) {
          map[row.key] = row.value;
        }
        setRawSettings(map);
      })
      .catch((err) => {
        console.error("useSettings error:", err);
      })
      .finally(() => setLoading(false));
  }, []);

  // Build the localized settings map
  const settings = useMemo(() => {
    const lang = i18n.language?.startsWith("en") ? "en" : "ro";
    const resolved: Record<string, any> = {};

    // Collect all base keys (strip _ro/_en suffixes)
    const baseKeys = new Set<string>();
    const allKeys = Object.keys(rawSettings);

    for (const key of allKeys) {
      if (key.endsWith("_ro")) {
        baseKeys.add(key.slice(0, -3));
      } else if (key.endsWith("_en")) {
        baseKeys.add(key.slice(0, -3));
      }
    }

    // For each bilingual base key, resolve the correct language
    for (const base of baseKeys) {
      const localizedKey = `${base}_${lang}`;
      const fallbackKey = `${base}_ro`; // fallback to Romanian if EN is empty

      const value = rawSettings[localizedKey];
      const fallback = rawSettings[fallbackKey];

      // Use localized value if it exists and is non-empty, otherwise fallback
      resolved[base] = value && value.trim() !== "" ? value : fallback || "";
    }

    // Copy all non-bilingual keys (those that don't have _ro/_en variants)
    for (const key of allKeys) {
      if (key.endsWith("_ro") || key.endsWith("_en")) continue;

      // Only add if not already resolved as a bilingual base
      const possibleBase = key;
      if (!baseKeys.has(possibleBase)) {
        // Convert numeric strings to numbers for price fields
        if (key.startsWith("price_")) {
          resolved[key] = Number(rawSettings[key]) || 0;
        } else {
          resolved[key] = rawSettings[key];
        }
      }
    }

    // Also convert price fields that might have been in the raw settings
    for (const key of allKeys) {
      if (key.startsWith("price_") && !(key in resolved)) {
        resolved[key] = Number(rawSettings[key]) || 0;
      }
    }

    // Expose raw settings for admin panel (which needs both _ro and _en)
    resolved._raw = rawSettings;

    return resolved;
  }, [rawSettings, i18n.language]);

  return { settings, loading };
}