/**
 * App configuration constants
 */

export const API_URL =
  process.env.EXPO_PUBLIC_API_URL || "https://beta.rocks";

export const SUPABASE_URL =
  process.env.EXPO_PUBLIC_SUPABASE_URL || "";

export const SUPABASE_ANON_KEY =
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || "";

export const APP_NAME = "beta.rocks";
export const APP_VERSION = "1.0.0";

/**
 * Friction score ratings - matches web app
 */
export const FRICTION_RATINGS = {
  1: { label: "Nope", color: "#ef4444" },
  2: { label: "Poor", color: "#f97316" },
  3: { label: "Fair", color: "#eab308" },
  4: { label: "Good", color: "#22c55e" },
  5: { label: "Great", color: "#10b981" },
} as const;

/**
 * Rock types supported by the conditions engine
 */
export const ROCK_TYPES = [
  "granite",
  "sandstone",
  "limestone",
  "basalt",
  "gneiss",
  "quartzite",
  "unknown",
] as const;

export type RockType = (typeof ROCK_TYPES)[number];
