/**
 * Unit conversion utilities for mobile
 * Reuses the same logic as the web app
 */

import type { UnitsConfig } from "../types/api";

export type UnitSystem = "metric" | "imperial" | "uk" | "custom";

export const UNIT_PRESETS: Record<UnitSystem, UnitsConfig> = {
  metric: {
    temperature: "celsius",
    windSpeed: "kmh",
    precipitation: "mm",
    distance: "km",
    elevation: "meters",
  },
  imperial: {
    temperature: "fahrenheit",
    windSpeed: "mph",
    precipitation: "inches",
    distance: "miles",
    elevation: "feet",
  },
  uk: {
    temperature: "celsius",
    windSpeed: "mph",
    precipitation: "mm",
    distance: "miles",
    elevation: "feet",
  },
  custom: {
    temperature: "celsius",
    windSpeed: "kmh",
    precipitation: "mm",
    distance: "km",
    elevation: "meters",
  },
};

export function convertTemperature(
  value: number,
  from: UnitsConfig["temperature"],
  to: UnitsConfig["temperature"]
): number {
  if (from === to) return value;
  if (from === "celsius" && to === "fahrenheit") return (value * 9) / 5 + 32;
  if (from === "fahrenheit" && to === "celsius") return ((value - 32) * 5) / 9;
  return value;
}

export function formatTemperature(
  value: number,
  unit: UnitsConfig["temperature"],
  decimals = 1
): string {
  const symbol = unit === "celsius" ? "°C" : "°F";
  return `${value.toFixed(decimals)}${symbol}`;
}

export function convertWindSpeed(
  value: number,
  from: UnitsConfig["windSpeed"],
  to: UnitsConfig["windSpeed"]
): number {
  if (from === to) return value;

  // Convert to m/s first
  const toMs: Record<UnitsConfig["windSpeed"], number> = {
    ms: 1,
    kmh: 1 / 3.6,
    mph: 0.44704,
    knots: 0.514444,
  };
  const fromMs: Record<UnitsConfig["windSpeed"], number> = {
    ms: 1,
    kmh: 3.6,
    mph: 2.23694,
    knots: 1.94384,
  };

  const ms = value * toMs[from];
  return ms * fromMs[to];
}

export function formatWindSpeed(
  value: number,
  unit: UnitsConfig["windSpeed"],
  decimals = 1
): string {
  const symbols: Record<UnitsConfig["windSpeed"], string> = {
    kmh: "km/h",
    mph: "mph",
    ms: "m/s",
    knots: "kn",
  };
  return `${value.toFixed(decimals)} ${symbols[unit]}`;
}

export function convertPrecipitation(
  value: number,
  from: UnitsConfig["precipitation"],
  to: UnitsConfig["precipitation"]
): number {
  if (from === to) return value;
  if (from === "mm" && to === "inches") return value / 25.4;
  if (from === "inches" && to === "mm") return value * 25.4;
  return value;
}

export function formatPrecipitation(
  value: number,
  unit: UnitsConfig["precipitation"],
  decimals = 1
): string {
  const symbols: Record<UnitsConfig["precipitation"], string> = {
    mm: "mm",
    inches: "in",
  };
  return `${value.toFixed(decimals)} ${symbols[unit]}`;
}

/**
 * Get default units based on device locale
 */
export function getDefaultUnits(locale: string): UnitsConfig {
  if (locale.startsWith("en-US") || locale === "en") {
    return UNIT_PRESETS.imperial;
  }
  if (locale.startsWith("en-GB")) {
    return UNIT_PRESETS.uk;
  }
  return UNIT_PRESETS.metric;
}
