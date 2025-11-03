/**
 * Convert country name to emoji flag
 * Uses ISO 3166-1 alpha-2 codes and regional indicator symbols
 */

const COUNTRY_TO_ISO: Record<string, string> = {
  // Europe
  France: "FR",
  Spain: "ES",
  Italy: "IT",
  Germany: "DE",
  Switzerland: "CH",
  Austria: "AT",
  "United Kingdom": "GB",
  Poland: "PL",
  "Czech Republic": "CZ",
  Slovenia: "SI",
  Croatia: "HR",
  Greece: "GR",
  Norway: "NO",
  Sweden: "SE",
  Portugal: "PT",
  Belgium: "BE",
  Netherlands: "NL",
  Denmark: "DK",
  Finland: "FI",
  Iceland: "IS",
  Ireland: "IE",
  Slovakia: "SK",
  Romania: "RO",
  Bulgaria: "BG",
  Serbia: "RS",
  Montenegro: "ME",
  Albania: "AL",
  "North Macedonia": "MK",
  "Bosnia and Herzegovina": "BA",

  // Americas
  "United States": "US",
  USA: "US",
  Canada: "CA",
  Mexico: "MX",
  Brazil: "BR",
  Argentina: "AR",
  Chile: "CL",
  Peru: "PE",
  Colombia: "CO",
  Venezuela: "VE",
  Ecuador: "EC",
  Bolivia: "BO",

  // Asia
  China: "CN",
  Japan: "JP",
  Thailand: "TH",
  Vietnam: "VN",
  India: "IN",
  Nepal: "NP",
  Pakistan: "PK",
  Turkey: "TR",
  Jordan: "JO",
  Lebanon: "LB",
  Israel: "IL",
  "South Korea": "KR",
  Malaysia: "MY",
  Indonesia: "ID",
  Philippines: "PH",

  // Oceania
  Australia: "AU",
  "New Zealand": "NZ",

  // Africa
  "South Africa": "ZA",
  Morocco: "MA",
  Egypt: "EG",
  Tunisia: "TN",
  Kenya: "KE",
  Madagascar: "MG",
  Namibia: "NA",
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

  // Otherwise, look up the code from the country name
  const isoCode = COUNTRY_TO_ISO[country];
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
