import { useState, useEffect } from "react";
import { apiGet } from "./api";
import type { ApiResponse, Room, Booking } from "./types";

// ─── Hook camere ─────────────────────────────────────────────────────────────
export function useRooms() {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiGet<ApiResponse<Room[]>>("/api/rooms")
      .then((res) => setRooms(res.data))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  return { rooms, loading, error };
}

// ─── Hook cameră individuală ─────────────────────────────────────────────────
export function useRoom(slug: string | undefined) {
  const [room, setRoom] = useState<Room | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!slug) return;
    apiGet<ApiResponse<Room>>(`/api/rooms/${slug}`)
      .then((res) => setRoom(res.data))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [slug]);

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