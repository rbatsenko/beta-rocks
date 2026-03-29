/**
 * Unit conversion utilities
 */

import type {
  TemperatureUnit,
  WindSpeedUnit,
  PrecipitationUnit,
  DistanceUnit,
  ElevationUnit,
  UnitsConfig,
} from "./types";

/**
 * Temperature conversions
 */
export function convertTemperature(
  value: number,
  from: TemperatureUnit,
  to: TemperatureUnit
): number {
  if (from === to) return value;

  if (from === "celsius" && to === "fahrenheit") {
    return (value * 9) / 5 + 32;
  }

  if (from === "fahrenheit" && to === "celsius") {
    return ((value - 32) * 5) / 9;
  }

  return value;
}

/**
 * Format temperature with unit symbol
 */
export function formatTemperature(value: number, unit: TemperatureUnit, decimals = 1): string {
  const symbol = unit === "celsius" ? "°C" : "°F";
  return `${value.toFixed(decimals)}${symbol}`;
}

/**
 * Wind speed conversions
 */
export function convertWindSpeed(value: number, from: WindSpeedUnit, to: WindSpeedUnit): number {
  if (from === to) return value;

  // Convert to m/s first (base unit)
  let ms: number;
  switch (from) {
    case "ms":
      ms = value;
      break;
    case "kmh":
      ms = value / 3.6;
      break;
    case "mph":
      ms = value * 0.44704;
      break;
    case "knots":
      ms = value * 0.514444;
      break;
  }

  // Convert from m/s to target unit
  switch (to) {
    case "ms":
      return ms;
    case "kmh":
      return ms * 3.6;
    case "mph":
      return ms / 0.44704;
    case "knots":
      return ms / 0.514444;
  }
}

/**
 * Get wind speed unit symbol
 */
export function getWindSpeedSymbol(unit: WindSpeedUnit): string {
  switch (unit) {
    case "kmh":
      return "km/h";
    case "mph":
      return "mph";
    case "ms":
      return "m/s";
    case "knots":
      return "kn";
  }
}

/**
 * Format wind speed with unit symbol
 */
export function formatWindSpeed(value: number, unit: WindSpeedUnit, decimals = 1): string {
  return `${value.toFixed(decimals)} ${getWindSpeedSymbol(unit)}`;
}

/**
 * Convert wind direction in degrees to cardinal direction string
 * Degrees follow meteorological convention: 0°=N, 90°=E, 180°=S, 270°=W
 */
const CARDINAL_DIRECTIONS = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"] as const;
export type CardinalDirection = (typeof CARDINAL_DIRECTIONS)[number];

export function getWindCardinal(degrees: number): CardinalDirection {
  const normalized = ((degrees % 360) + 360) % 360;
  const index = Math.round(normalized / 45) % 8;
  return CARDINAL_DIRECTIONS[index];
}

/**
 * Get CSS rotation for a wind direction arrow.
 * Takes an up-arrow (↑) and rotates it to point in the direction the wind blows TO.
 * Wind "from" 0° (north) → arrow points south → 180° rotation.
 */
export function getWindArrowRotation(degrees: number): number {
  return (degrees + 180) % 360;
}

/**
 * Format wind with speed and direction
 */
export function formatWindWithDirection(
  speed: number,
  unit: WindSpeedUnit,
  direction?: number,
  decimals = 0
): string {
  const speedStr = formatWindSpeed(speed, unit, decimals);
  if (direction == null) return speedStr;
  return `${speedStr} ${getWindCardinal(direction)}`;
}

/**
 * Precipitation conversions
 */
export function convertPrecipitation(
  value: number,
  from: PrecipitationUnit,
  to: PrecipitationUnit
): number {
  if (from === to) return value;

  if (from === "mm" && to === "inches") {
    return value / 25.4;
  }

  if (from === "inches" && to === "mm") {
    return value * 25.4;
  }

  return value;
}

/**
 * Format precipitation with unit symbol
 */
export function formatPrecipitation(value: number, unit: PrecipitationUnit, decimals = 1): string {
  const symbol = unit === "mm" ? "mm" : "in";
  return `${value.toFixed(decimals)} ${symbol}`;
}

/**
 * Distance conversions
 */
export function convertDistance(value: number, from: DistanceUnit, to: DistanceUnit): number {
  if (from === to) return value;

  if (from === "km" && to === "miles") {
    return value * 0.621371;
  }

  if (from === "miles" && to === "km") {
    return value / 0.621371;
  }

  return value;
}

/**
 * Format distance with unit symbol
 */
export function formatDistance(value: number, unit: DistanceUnit, decimals = 1): string {
  const symbol = unit === "km" ? "km" : "mi";
  return `${value.toFixed(decimals)} ${symbol}`;
}

/**
 * Elevation conversions
 */
export function convertElevation(value: number, from: ElevationUnit, to: ElevationUnit): number {
  if (from === to) return value;

  if (from === "meters" && to === "feet") {
    return value * 3.28084;
  }

  if (from === "feet" && to === "meters") {
    return value / 3.28084;
  }

  return value;
}

/**
 * Format elevation with unit symbol
 */
export function formatElevation(value: number, unit: ElevationUnit, decimals = 0): string {
  const symbol = unit === "meters" ? "m" : "ft";
  return `${value.toFixed(decimals)} ${symbol}`;
}

/**
 * Convert all weather data to user's preferred units
 */
export interface WeatherData {
  temperature: number;
  windSpeed: number;
  precipitation: number;
  // Add other fields as needed
}

export function convertWeatherData(
  data: WeatherData,
  fromUnits: UnitsConfig,
  toUnits: UnitsConfig
): WeatherData {
  return {
    temperature: convertTemperature(data.temperature, fromUnits.temperature, toUnits.temperature),
    windSpeed: convertWindSpeed(data.windSpeed, fromUnits.windSpeed, toUnits.windSpeed),
    precipitation: convertPrecipitation(
      data.precipitation,
      fromUnits.precipitation,
      toUnits.precipitation
    ),
  };
}
