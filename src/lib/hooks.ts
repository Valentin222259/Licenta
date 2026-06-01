// src/lib/hooks.ts — versiune bilingvă
// Trimite ?lang=en|ro la API pentru a primi conținutul în limba corectă

import { useState, useEffect } from "react";
import i18n from "@/i18n";
import { apiGet } from "./api";
import type { ApiResponse, Room, Booking } from "./types";

/** Returnează limba curentă pentru query param */
function getLang(): "en" | "ro" {
  return i18n.language?.startsWith("en") ? "en" : "ro";
}

// Hook camere
export function useRooms() {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const lang = getLang();

  useEffect(() => {
    setLoading(true);
    apiGet<ApiResponse<Room[]>>(`/api/rooms?lang=${lang}`)
      .then((res) => setRooms(res.data))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [lang]); // re-fetch când se schimbă limba

  return { rooms, loading, error };
}

// ─── Hook cameră individuală ─────────────────────────────────────────────────
export function useRoom(slug: string | undefined) {
  const [room, setRoom] = useState<Room | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const lang = getLang();

  useEffect(() => {
    if (!slug) return;
    setLoading(true);
    apiGet<ApiResponse<Room>>(`/api/rooms/${slug}?lang=${lang}`)
      .then((res) => setRoom(res.data))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [slug, lang]);

  return { room, loading, error };
}

// ─── Hook rezervări user ─────────────────────────────────────────────────────
export function useMyBookings(email: string | null) {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!email) {
      setLoading(false);
      return;
    }
    apiGet<ApiResponse<Booking[]>>(`/api/bookings/my?email=${email}`)
      .then((res) => setBookings(res.data))
      .catch(() => setBookings([]))
      .finally(() => setLoading(false));
  }, [email]);

  return { bookings, loading };
}