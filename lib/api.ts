"use client";

import axios, { AxiosError } from "axios";

// All client calls go through the same-origin BFF proxy at /api.
// The proxy injects the Bearer from the httpOnly cookie; the client never
// sees the token. The backend origin stays private (server-only API_URL).
export const api = axios.create({
  baseURL: "/api",
  headers: { "Content-Type": "application/json" },
});

// On any 401, the session has expired (or cookies were cleared by the proxy).
// Hard-redirect to /login so the user re-authenticates.
api.interceptors.response.use(
  (res) => res,
  (error: AxiosError) => {
    if (typeof window !== "undefined" && error.response?.status === 401) {
      const path = window.location.pathname;
      if (path !== "/login") {
        window.location.href = "/login";
      }
    }
    return Promise.reject(error);
  },
);

export const UNAVAILABLE_MESSAGE = "Data source temporarily unavailable, please retry.";

/** True when a CRM the backend reads live is temporarily unreachable (503). */
export function isUnavailable(err: unknown): boolean {
  return axios.isAxiosError(err) && err.response?.status === 503;
}

/** Pull a human-readable message out of an Axios error. */
export function errorMessage(err: unknown, fallback = "Something went wrong"): string {
  // 503 = a CRM is briefly down; its detail ("The fmc CRM is unavailable…") is too technical.
  if (isUnavailable(err)) return UNAVAILABLE_MESSAGE;
  if (axios.isAxiosError(err)) {
    const data = err.response?.data as { detail?: string | { msg?: string }[] } | undefined;
    if (typeof data?.detail === "string") return data.detail;
    if (Array.isArray(data?.detail) && data.detail[0]?.msg) return data.detail[0].msg!;
    if (err.response?.status === 429) return "Too many attempts — wait a minute and try again.";
    if (err.message) return err.message;
  }
  return fallback;
}

export function statusOf(err: unknown): number | undefined {
  if (axios.isAxiosError(err)) return err.response?.status;
  return undefined;
}
