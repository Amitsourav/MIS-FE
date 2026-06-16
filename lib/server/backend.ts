// Server-only helpers for talking to the FastAPI backend.
// API_URL is server-only (NOT NEXT_PUBLIC) so the backend origin stays private.

export const API_URL = process.env.API_URL || "http://localhost:8000";

export function backendUrl(path: string, search = ""): string {
  const clean = path.startsWith("/") ? path : `/${path}`;
  return `${API_URL.replace(/\/$/, "")}${clean}${search ? `?${search}` : ""}`;
}
