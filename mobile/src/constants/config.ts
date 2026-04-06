/**
 * App configuration constants
 */

export const API_URL =
  process.env.EXPO_PUBLIC_API_URL || "https://beta.rocks";

export const SUPABASE_URL =
  process.env.EXPO_PUBLIC_SUPABASE_URL || "https://tgvcjhzjdyfloppunnna.supabase.co";

export const SUPABASE_ANON_KEY =
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || "sb_publishable_l3JH7lREcNNPqL6lHBxjuQ_KuX6jhEK";

export const APP_NAME = "beta.rocks";
export const APP_VERSION = "0.6.0";

/**
 * Label colors for the 3-tier conditions system
 * Each has a solid color, a tinted bg (12% opacity), and text color
 */
export const LABEL_COLORS = {
  good: { solid: "#22C55E", bg: "rgba(34, 197, 94, 0.12)", text: "#22C55E" },
  fair: { solid: "#F59E0B", bg: "rgba(245, 158, 11, 0.12)", text: "#F59E0B" },
  poor: { solid: "#EF4444", bg: "rgba(239, 68, 68, 0.12)", text: "#EF4444" },
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
  climbing_info: { bg: "rgba(14,165,233,0.12)", text: "#0ea5e9" },
  lost_found: { bg: "rgba(244,63,94,0.12)", text: "#f43f5e" },
  other: { bg: "rgba(107,114,128,0.12)", text: "#6b7280" },
};

/**
 * Rock types supported by the conditions engine
 */
export const ROCK_TYPES = [
  "granite",
  "sandstone",
  "limestone",
  "gneiss",
  "quartzite",
  "gritstone",
  "basalt",
  "volcanic",
  "conglomerate",
  "schist",
  "slate",
  "other",
] as const;

export const CLIMBING_TYPES = [
  "sport",
  "trad",
  "boulder",
  "mixed",
  "aid",
  "ice",
] as const;

export const ASPECTS = [
  { value: 0, label: "N" },
  { value: 45, label: "NE" },
  { value: 90, label: "E" },
  { value: 135, label: "SE" },
  { value: 180, label: "S" },
  { value: 225, label: "SW" },
  { value: 270, label: "W" },
  { value: 315, label: "NW" },
] as const;

export type RockType = (typeof ROCK_TYPES)[number];
