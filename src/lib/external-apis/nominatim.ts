/**
 * Nominatim API Client
 * Searches for climbing-related features in OpenStreetMap
 * Useful for auto-filling missing crag data when users search for unknown locations
 */

export type NominatimElement = {
  place_id: number;
  osm_type: "node" | "way" | "relation";
  osm_id: number;
  lat: string;
  lon: string;
  display_name: string;
  address?: {
    village?: string;
    town?: string;
    city?: string;
    municipality?: string;
    state?: string;
    country?: string;
    country_code?: string;
  };
  extratags?: Record<string, string>;
  category?: string;
  type?: string;
  importance?: number;
};

const NOMINATIM_ENDPOINT = "https://nominatim.openstreetmap.org";

/**
 * Search for climbing features near coordinates or by name
 * Uses Nominatim's reverse geocoding and search API
 */
export async function searchClimbingFeatures(params: {
  query?: string;
  lat?: number;
  lon?: number;
  radius?: number; // meters
}): Promise<NominatimElement[]> {
  const { query, lat, lon, radius = 5000 } = params;

  let url: string;

  if (lat !== undefined && lon !== undefined) {
    // Reverse geocoding - find climbing features near coordinates
    url = `${NOMINATIM_ENDPOINT}/reverse?lat=${lat}&lon=${lon}&format=json&extratags=1&addressdetails=1`;
  } else if (query) {
    // Forward search - find climbing features by name
    url = `${NOMINATIM_ENDPOINT}/search?q=${encodeURIComponent(query)}&format=json&extratags=1&addressdetails=1&limit=10`;
  } else {
    throw new Error("Either query or lat/lon must be provided");
  }

  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent": "beta.rocks/1.0 (climbing conditions app)",
      },
    });

    if (!response.ok) {
      throw new Error(`Nominatim API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();

    // Nominatim reverse returns single object, search returns array
    const results: NominatimElement[] = Array.isArray(data) ? data : [data];

    // Filter to climbing-related features only
    const climbingFeatures = results.filter((element) => {
      const tags = element.extratags || {};

      // Check for climbing tags
      const hasClimbingTag =
        tags.climbing ||
        tags["sport"] === "climbing" ||
        tags["leisure"] === "climbing" ||
        tags["natural"] === "cliff" ||
        tags["natural"] === "rock";

      return hasClimbingTag;
    });

    console.log("[Nominatim] Found", climbingFeatures.length, "climbing features");
    return climbingFeatures;
  } catch (error) {
    console.error("[Nominatim] Query failed:", error);
    throw error;
  }
}

/**
 * Extract rock type from Nominatim extratags
 */
export function extractRockTypeFromNominatim(element: NominatimElement): string | null {
  const tags = element.extratags || {};
  return tags["rock_type"] || tags["climbing:rock"] || tags["rock"] || null;
}

/**
 * Extract climbing types from Nominatim extratags
 */
export function extractClimbingTypesFromNominatim(element: NominatimElement): string[] {
  const tags = element.extratags || {};
  const types: string[] = [];

  if (tags["climbing:sport"] === "yes") types.push("sport");
  if (tags["climbing:trad"] === "yes") types.push("trad");
  if (tags["climbing:boulder"] === "yes") types.push("boulder");
  if (tags["climbing:ice"] === "yes") types.push("ice");
  if (tags["climbing:mixed"] === "yes") types.push("mixed");

  return types;
}

/**
 * Get crag name from Nominatim element
 * Prefers climbing-specific names, falls back to display_name
 */
export function getCragNameFromNominatim(element: NominatimElement): string {
  const tags = element.extratags || {};
  return tags["name"] || element.display_name.split(",")[0];
}

/**
 * Build location string from address components
 */
export function getLocationFromNominatim(element: NominatimElement): {
  country?: string;
  state?: string;
  municipality?: string;
  village?: string;
} {
  const addr = element.address || {};

  return {
    country: addr.country,
    state: addr.state,
    municipality: addr.municipality || addr.city || addr.town,
    village: addr.village,
  };
}
