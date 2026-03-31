import { useState, useEffect } from "react";
import { apiGet } from "./api";
import type { ApiResponse } from "./types";

export interface SiteImage {
  id: string;
  url: string;
  s3_key?: string;
  caption?: string | null;
  sort_order?: number;
  is_primary?: boolean;
  category?: string;
  room_id?: string | null;
}

// ─── Hook imagini după categorie ─────────────────────────────────────────────
export function useImages(category: string, roomId?: string) {
  const [images, setImages] = useState<SiteImage[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const params = new URLSearchParams({ category });
    if (roomId) params.append("room_id", roomId);

    apiGet<ApiResponse<SiteImage[]>>(`/api/images?${params.toString()}`)
      .then((res) => setImages(res.data))
      .catch(() => setImages([]))
      .finally(() => setLoading(false));
  }, [category, roomId]);

  // Prima imagine sau imaginea marcată ca primară
  const primary = images.find((i) => i.is_primary) || images[0] || null;

  return { images, primary, loading };
}

// ─── Hook hero images ─────────────────────────────────────────────────────────
export function useHeroImages() {
  return useImages("hero");
}

// ─── Hook facility images ─────────────────────────────────────────────────────
export function useFacilityImages() {
  return useImages("facility");
}

// ─── Hook about images ────────────────────────────────────────────────────────
export function useAboutImages() {
  return useImages("about");
}