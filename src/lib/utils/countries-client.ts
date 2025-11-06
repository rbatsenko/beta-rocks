"use client";

/**
 * Client-side country utilities
 * Registers i18n-iso-countries locale for browser use
 */

import countries from "i18n-iso-countries";
import enLocale from "i18n-iso-countries/langs/en.json";

// Register English locale for browser
if (typeof window !== "undefined") {
  countries.registerLocale(enLocale);
}

/**
 * Get all country codes (ISO 3166-1 alpha-2) - client-side
 * @returns Array of all country codes sorted alphabetically
 */
export function getAllCountryCodes(): string[] {
  const codes = countries.getAlpha2Codes();
  return Object.keys(codes).sort();
}

/**
 * Get all countries as { code, name } objects - client-side
 * @param language - Language code for country names (default: "en")
 * @returns Array of country objects with code and name
 */
export function getAllCountries(language: string = "en"): Array<{ code: string; name: string }> {
  const names = countries.getNames(language, { select: "official" });
  return Object.entries(names)
    .map(([code, name]) => ({ code, name }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * Convert ISO 3166-1 alpha-2 code to country name - client-side
 * @param isoCode - ISO country code (e.g., "US", "FR")
 * @param language - Language code (default: "en")
 * @returns Full country name or the original code if not found
 */
export function getCountryName(
  isoCode: string | null | undefined,
  language: string = "en"
): string {
  if (!isoCode) return "";
  const name = countries.getName(isoCode.toUpperCase(), language, { select: "official" });
  return name || isoCode;
}

/**
 * Convert ISO 3166-1 alpha-2 code to flag emoji
 * @param isoCode - ISO country code (e.g., "US", "FR")
 * @returns Flag emoji
 */
export function getCountryFlag(isoCode: string): string {
  return isoCode
    .toUpperCase()
    .split("")
    .map((char) => String.fromCodePoint(127397 + char.charCodeAt(0)))
    .join("");
}
