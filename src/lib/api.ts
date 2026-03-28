const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3001";

// ─── GET ────────────────────────────────────────────────────────────────────
export async function apiGet<T>(path: string): Promise<T> {
  const token = sessionStorage.getItem("token");
  const res = await fetch(`${API_URL}${path}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
}

// ─── POST ───────────────────────────────────────────────────────────────────
export async function apiPost<T>(path: string, body: unknown): Promise<T> {
  const token = sessionStorage.getItem("token");
  const res = await fetch(`${API_URL}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `API error: ${res.status}`);
  }
  return res.json();
}

// ─── PATCH ──────────────────────────────────────────────────────────────────
export async function apiPatch<T>(path: string, body: unknown): Promise<T> {
  const token = sessionStorage.getItem("token");
  const res = await fetch(`${API_URL}${path}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `API error: ${res.status}`);
  }
  return res.json();
}