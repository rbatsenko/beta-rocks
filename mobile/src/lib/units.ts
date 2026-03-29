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
    timeFormat: "24h",
  },
  imperial: {
    temperature: "fahrenheit",
    windSpeed: "mph",
    precipitation: "inches",
    distance: "miles",
    elevation: "feet",
    timeFormat: "12h",
  },
  uk: {
    temperature: "celsius",
    windSpeed: "mph",
    precipitation: "mm",
    distance: "miles",
    elevation: "feet",
    timeFormat: "24h",
  },
  custom: {
    temperature: "celsius",
    windSpeed: "kmh",
    precipitation: "mm",
    distance: "km",
    elevation: "meters",
    timeFormat: "24h",
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

/**
 * Convert wind direction in degrees to cardinal direction string
 */
const CARDINAL_DIRECTIONS = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"] as const;
export type CardinalDirection = (typeof CARDINAL_DIRECTIONS)[number];

export function getWindCardinal(degrees: number): CardinalDirection {
  const normalized = ((degrees % 360) + 360) % 360;
  const index = Math.round(normalized / 45) % 8;
  return CARDINAL_DIRECTIONS[index];
}

export function getWindArrowRotation(degrees: number): number {
  return (degrees + 180) % 360;
}

export function formatWindWithDirection(
  speed: number,
  unit: UnitsConfig["windSpeed"],
  direction?: number,
  decimals = 0
): string {
  const speedStr = formatWindSpeed(speed, unit, decimals);
  if (direction == null) return speedStr;
  return `${speedStr} ${getWindCardinal(direction)}`;
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
 * Get default units — always metric for mobile users
 */
export function getDefaultUnits(_locale?: string): UnitsConfig {
  return UNIT_PRESETS.metric;
}
