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
 * Rating colors matching web's getRatingColor()
 * Each has a solid color, a tinted bg (10% opacity), and text color
 */
export const RATING_COLORS = {
  Great: { solid: "#22c55e", bg: "rgba(34,197,94,0.12)", text: "#22c55e" },
  Good: { solid: "#3b82f6", bg: "rgba(59,130,246,0.12)", text: "#3b82f6" },
  Fair: { solid: "#eab308", bg: "rgba(234,179,8,0.12)", text: "#eab308" },
  Poor: { solid: "#f97316", bg: "rgba(249,115,22,0.12)", text: "#f97316" },
  Nope: { solid: "#ef4444", bg: "rgba(239,68,68,0.12)", text: "#ef4444" },
} as const;

/**
 * Friction score ratings - maps numeric scores to rating labels
 */
export const FRICTION_RATINGS = {
  1: { label: "Nope" as const, color: "#ef4444" },
  2: { label: "Poor" as const, color: "#f97316" },
  3: { label: "Fair" as const, color: "#eab308" },
  4: { label: "Good" as const, color: "#3b82f6" },
  5: { label: "Great" as const, color: "#22c55e" },
} as const;

/**
 * Category badge colors matching web
 */
export const CATEGORY_COLORS: Record<string, { bg: string; text: string }> = {
  conditions: { bg: "rgba(59,130,246,0.12)", text: "#3b82f6" },
  safety: { bg: "rgba(239,68,68,0.12)", text: "#ef4444" },
  access: { bg: "rgba(234,179,8,0.12)", text: "#eab308" },
  beta: { bg: "rgba(34,197,94,0.12)", text: "#22c55e" },
  facilities: { bg: "rgba(168,85,247,0.12)", text: "#a855f7" },
  other: { bg: "rgba(107,114,128,0.12)", text: "#6b7280" },
};

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
