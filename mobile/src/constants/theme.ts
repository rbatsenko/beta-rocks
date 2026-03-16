/**
 * Theme constants matching web app design tokens
 * Earthy climbing palette: terracotta primary, warm grays, sage accents
 */

export const Colors = {
  light: {
    text: "#2b2420",
    textSecondary: "#70625b",
    background: "#f6f5f2",
    surface: "#eceae8",
    surfaceElevated: "#ffffff",
    border: "#ded8d3",
    primary: "#d66641",
    primaryForeground: "#ffffff",
    accent: "#36a8e2",
    accentForeground: "#ffffff",
    secondary: "#84ad92",
    secondaryForeground: "#ffffff",
    destructive: "#ee4343",
    success: "#84ad92",
    warning: "#f3ae24",
    muted: "#70625b",
    card: "#ffffff",
    cardBorder: "#ded8d3",
  },
  dark: {
    text: "#f3f2f0",
    textSecondary: "#aaa5a1",
    background: "#1e1714",
    surface: "#231d1a",
    surfaceElevated: "#342b27",
    border: "#3a302b",
    primary: "#e07551",
    primaryForeground: "#ffffff",
    accent: "#269dd8",
    accentForeground: "#ffffff",
    secondary: "#568f69",
    secondaryForeground: "#ffffff",
    destructive: "#cf2f2f",
    success: "#568f69",
    warning: "#f3ae24",
    muted: "#aaa5a1",
    card: "#231d1a",
    cardBorder: "#3a302b",
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
