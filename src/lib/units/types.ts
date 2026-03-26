/**
 * Units system for beta.rocks
 * Handles temperature, wind speed, precipitation, distance, and elevation units
 */

export type TemperatureUnit = "celsius" | "fahrenheit";
export type WindSpeedUnit = "kmh" | "mph" | "ms" | "knots";
export type PrecipitationUnit = "mm" | "inches";
export type DistanceUnit = "km" | "miles";
export type ElevationUnit = "meters" | "feet";
export type TimeFormat = "12h" | "24h";

/**
 * Complete units configuration for a user
 */
export interface UnitsConfig {
  temperature: TemperatureUnit;
  windSpeed: WindSpeedUnit;
  precipitation: PrecipitationUnit;
  distance: DistanceUnit;
  elevation: ElevationUnit;
  timeFormat?: TimeFormat;
}

/**
 * Unit system presets
 */
export type UnitSystem = "metric" | "imperial" | "uk" | "custom";

/**
 * Default units for different systems
 */
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
    // UK uses mixed system: Celsius but mph
    temperature: "celsius",
    windSpeed: "mph",
    precipitation: "mm",
    distance: "miles",
    elevation: "feet",
    timeFormat: "24h",
  },
  custom: {
    // Placeholder - user will set custom values
    temperature: "celsius",
    windSpeed: "kmh",
    precipitation: "mm",
    distance: "km",
    elevation: "meters",
    timeFormat: "24h",
  },
};

/**
 * Locale to unit system mapping
 * Based on common usage in each country/region
 */
export const LOCALE_TO_UNIT_SYSTEM: Record<string, UnitSystem> = {
  // Imperial system (US)
  en: "imperial", // Default US English
  "en-US": "imperial",

  // UK - mixed system
  "en-GB": "uk",

  // Metric with mph (Canada)
  "en-CA": "metric",
  "fr-CA": "metric",

  // Metric system (most of the world)
  "en-AU": "metric",
  "bg-BG": "metric",
  "ca-AD": "metric",
  "cs-CZ": "metric",
  "da-DK": "metric",
  "de-AT": "metric",
  "de-CH": "metric",
  "de-DE": "metric",
  "el-GR": "metric",
  "es-ES": "metric",
  "fi-FI": "metric",
  "fr-BE": "metric",
  "fr-CH": "metric",
  "fr-FR": "metric",
  "hr-HR": "metric",
  "it-CH": "metric",
  "it-IT": "metric",
  "nb-NO": "metric",
  "nl-BE": "metric",
  pl: "metric",
  "pt-PT": "metric",
  "ro-RO": "metric",
  "sk-SK": "metric",
  "sl-SI": "metric",
  "sv-SE": "metric",
  uk: "metric",
};

/**
 * Get default units for a locale
 */
export function getDefaultUnitsForLocale(locale: string): UnitsConfig {
  const system = LOCALE_TO_UNIT_SYSTEM[locale] || "metric";
  return UNIT_PRESETS[system];
}

/**
 * Detect unit system from units config
 */
export function detectUnitSystem(config: UnitsConfig): UnitSystem {
  // Check if it matches any preset exactly
  for (const [system, preset] of Object.entries(UNIT_PRESETS)) {
    if (system === "custom") continue;

    if (
      config.temperature === preset.temperature &&
      config.windSpeed === preset.windSpeed &&
      config.precipitation === preset.precipitation &&
      config.distance === preset.distance &&
      config.elevation === preset.elevation &&
      (!config.timeFormat || config.timeFormat === preset.timeFormat)
    ) {
      return system as UnitSystem;
    }
  }

  return "custom";
}
