/**
 * Convert country name to emoji flag
 * Uses ISO 3166-1 alpha-2 codes and regional indicator symbols
 * Now powered by i18n-iso-countries for complete coverage of all 249 countries
 */

import countries from "i18n-iso-countries";

// Register English locale (we'll use English names as the source)
// Note: In browser environments, this needs to be done client-side
if (typeof window === "undefined") {
  // Server-side: require the locale file
  countries.registerLocale(require("i18n-iso-countries/langs/en.json"));
}

/**
 * Legacy mapping for backwards compatibility
 * Used for common name variations and aliases
 */
const COUNTRY_NAME_ALIASES: Record<string, string> = {
  USA: "US",
  UK: "GB",
  "Great Britain": "GB",
  England: "GB",
  Scotland: "GB",
  Wales: "GB",
  "Northern Ireland": "GB",
  "South Korea": "KR",
  "North Korea": "KP",
  Holland: "NL",
  "Czech Republic": "CZ",
  Czechia: "CZ",
};

/**
 * Convert ISO 3166-1 alpha-2 code to flag emoji
 * Example: "US" → "🇺🇸"
 */
function isoToFlag(isoCode: string): string {
  return isoCode
    .toUpperCase()
    .split("")
    .map((char) => String.fromCodePoint(127397 + char.charCodeAt(0)))
    .join("");
}

/**
 * Get flag emoji for a country name or code
 * @param country - Full country name (e.g., "United States", "France") or ISO code (e.g., "US", "FR")
 * @returns Flag emoji or empty string if not found
 */
export function getCountryFlag(country: string | null | undefined): string {
  if (!country) return "";

  // If it's already a 2-letter code, use it directly
  if (country.length === 2) {
    return isoToFlag(country);
  }

  // Check aliases first for common variations
  const alias = COUNTRY_NAME_ALIASES[country];
  if (alias) {
    return isoToFlag(alias);
  }

  // Use i18n-iso-countries to convert name to code
  const isoCode = countries.getAlpha2Code(country, "en");
  if (!isoCode) return "";

  return isoToFlag(isoCode);
}

/**
 * Get flag emoji with fallback to mountain icon
 * @param country - Full country name
 * @returns Flag emoji or "🏔️" if not found
 */
export function getCountryFlagWithFallback(country: string | null | undefined): string {
  const flag = getCountryFlag(country);
  return flag || "🏔️";
}

/**
 * Convert ISO 3166-1 alpha-2 code to country name
 * @param isoCode - ISO country code (e.g., "US", "FR")
 * @param language - Language code (default: "en")
 * @returns Full country name or the original code if not found
 */
export function getCountryName(
  isoCode: string | null | undefined,
  language: string = "en"
): string {
  if (!isoCode) return "";

  // Use i18n-iso-countries to get the official country name
  const name = countries.getName(isoCode.toUpperCase(), language, { select: "official" });
  return name || isoCode;
}

/**
 * Get all country codes (ISO 3166-1 alpha-2)
 * @returns Array of all country codes sorted alphabetically
 */
export function getAllCountryCodes(): string[] {
  const codes = countries.getAlpha2Codes();
  return Object.keys(codes).sort();
}

/**
 * Get all countries as { code, name } objects
 * @param language - Language code for country names (default: "en")
 * @returns Array of country objects with code and name
 */
export function getAllCountries(language: string = "en"): Array<{ code: string; name: string }> {
  const names = countries.getNames(language, { select: "official" });
  return Object.entries(names)
    .map(([code, name]) => ({ code, name }))
    .sort((a, b) => a.name.localeCompare(b.name));
}
