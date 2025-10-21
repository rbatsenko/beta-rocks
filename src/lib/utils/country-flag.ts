/**
 * Convert country code (ISO 3166-1 alpha-2) to flag emoji
 *
 * @param countryCode - Two-letter country code (e.g., "PL", "US", "DE")
 * @returns Flag emoji (e.g., "🇵🇱", "🇺🇸", "🇩🇪") or empty string if invalid
 *
 * @example
 * getCountryFlag("PL") // returns "🇵🇱"
 * getCountryFlag("US") // returns "🇺🇸"
 * getCountryFlag("pl") // returns "🇵🇱" (case insensitive)
 */
export function getCountryFlag(countryCode: string | null | undefined): string {
  if (!countryCode || countryCode.length !== 2) {
    return "";
  }

  const code = countryCode.toUpperCase();

  // Regional Indicator Symbol offset
  // A (0x41) maps to 🇦 (0x1F1E6)
  const OFFSET = 0x1f1e6 - 0x41;

  const firstChar = code.charCodeAt(0);
  const secondChar = code.charCodeAt(1);

  // Validate that both characters are A-Z
  if (firstChar < 0x41 || firstChar > 0x5a || secondChar < 0x41 || secondChar > 0x5a) {
    return "";
  }

  // Convert to Regional Indicator Symbols
  const flag = String.fromCodePoint(firstChar + OFFSET, secondChar + OFFSET);

  return flag;
}
