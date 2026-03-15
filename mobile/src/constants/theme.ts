/**
 * Theme constants matching web app design tokens
 */

export const Colors = {
  light: {
    text: "#0f172a",
    textSecondary: "#64748b",
    background: "#ffffff",
    surface: "#f8fafc",
    surfaceElevated: "#ffffff",
    border: "#e2e8f0",
    primary: "#2563eb",
    primaryForeground: "#ffffff",
    accent: "#f1f5f9",
    destructive: "#ef4444",
    success: "#22c55e",
    warning: "#eab308",
    muted: "#94a3b8",
    card: "#ffffff",
    cardBorder: "#e2e8f0",
  },
  dark: {
    text: "#f8fafc",
    textSecondary: "#94a3b8",
    background: "#0f172a",
    surface: "#1e293b",
    surfaceElevated: "#334155",
    border: "#334155",
    primary: "#3b82f6",
    primaryForeground: "#ffffff",
    accent: "#1e293b",
    destructive: "#ef4444",
    success: "#22c55e",
    warning: "#eab308",
    muted: "#64748b",
    card: "#1e293b",
    cardBorder: "#334155",
  },
};

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
} as const;

export const FontSize = {
  xs: 12,
  sm: 14,
  md: 16,
  lg: 18,
  xl: 24,
  xxl: 32,
} as const;

export const BorderRadius = {
  sm: 6,
  md: 8,
  lg: 12,
  xl: 16,
  full: 9999,
} as const;
