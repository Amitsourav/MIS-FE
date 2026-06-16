// Shared constants (safe for both server and client bundles).

export const TOKEN_COOKIE = "mis_token";
export const ROLE_COOKIE = "mis_role";
// Readable company scope for an admin: "fmc" | "av" for company admins, "" for super-admins.
export const BRAND_COOKIE = "mis_brand";

// Match backend ACCESS_TOKEN_EXPIRE_MINUTES=720 (12h).
export const COOKIE_MAX_AGE = 720 * 60;

export type Role = "provider" | "admin";

export const ROLE_HOME: Record<Role, string> = {
  provider: "/dashboard",
  admin: "/admin",
};
