/**
 * Nominatim geocoding service
 * Provides both forward (search) and reverse (coordinates to address) geocoding
 * using OpenStreetMap data
 *
 * Rate limit: 1 request per second (enforced server-side)
 * Terms: https://operations.osmfoundation.org/policies/nominatim/
 */

export interface NominatimAddress {
  rock?: string;
  peak?: string;
  cliff?: string;
  natural?: string;
  village?: string;
  town?: string;
  city?: string;
  municipality?: string;
  county?: string;
  state?: string;
  region?: string;
  postcode?: string;
  country?: string;
  country_code?: string;
}

export interface NominatimResponse {
  place_id: number;
  osm_type: "node" | "way" | "relation";
  osm_id: number;
  lat: string;
  lon: string;
  category: string;
  type: string;
  display_name: string;
  address: NominatimAddress;
  boundingbox: [string, string, string, string];
  importance?: number;
  place_rank?: number;
}

export interface ReverseGeocodeParams {
  lat: number;
  lon: number;
  zoom?: number; // 0-18, default 18 (building level)
  acceptLanguage?: string; // e.g., "en", "de", "fr"
}

/**
 * Reverse geocode coordinates to address information
 * Uses OpenStreetMap Nominatim API with proper attribution
 */
export async function reverseGeocode(params: ReverseGeocodeParams): Promise<NominatimResponse> {
  const { lat, lon, zoom = 18, acceptLanguage = "en" } = params;

  // Build URL with required parameters
  const url = new URL("https://nominatim.openstreetmap.org/reverse");
  url.searchParams.set("lat", lat.toString());
  url.searchParams.set("lon", lon.toString());
  url.searchParams.set("format", "jsonv2");
  url.searchParams.set("addressdetails", "1");
  url.searchParams.set("zoom", zoom.toString());
  url.searchParams.set("accept-language", acceptLanguage);

  try {
    const response = await fetch(url.toString(), {
      headers: {
        "User-Agent": "temps-rocks/1.0 (https://temps.rocks)",
      },
      // Cache for 24 hours to respect rate limits
      next: { revalidate: 86400 },
    });

    if (!response.ok) {
      throw new Error(`Nominatim API error: ${response.status} ${response.statusText}`);
    }

    const data: NominatimResponse = await response.json();
    return data;
  } catch (error) {
    console.error("Reverse geocoding failed:", error);
    throw new Error("Failed to reverse geocode coordinates. Please try again.");
  }
}

/**
 * Extract crag name from Nominatim response
 * Tries multiple fields in priority order
 */
export function extractCragName(response: NominatimResponse): string {
  const { address, type } = response;

  // Try climbing-specific fields first
  if (address.rock) return address.rock;
  if (address.peak) return address.peak;
  if (address.cliff) return address.cliff;
  if (address.natural) return address.natural;

  // Fallback to location fields
  if (address.village) return address.village;
  if (address.town) return address.town;
  if (address.city) return address.city;

  // Use display name as last resort
  return response.display_name.split(",")[0];
}

/**
 * Format address components for form auto-fill
 */
export function formatAddressForCrag(response: NominatimResponse) {
  const { address } = response;

  return {
    suggestedName: extractCragName(response),
    country: address.country_code?.toUpperCase() || "",
    state: address.state || address.region || "",
    municipality: address.municipality || address.county || "",
    village: address.village || address.town || "",
    osmId: response.osm_id.toString(),
    osmType: response.osm_type,
  };
}

/**
 * Search for locations by name (forward geocoding)
 * Used for location search in the map
 */
export async function searchLocation(
  query: string,
  acceptLanguage: string = "en"
): Promise<NominatimResponse[]> {
  if (!query || query.trim().length < 2) {
    return [];
  }

  const url = new URL("https://nominatim.openstreetmap.org/search");
  url.searchParams.set("q", query.trim());
  url.searchParams.set("format", "jsonv2");
  url.searchParams.set("addressdetails", "1");
  url.searchParams.set("limit", "5");
  url.searchParams.set("accept-language", acceptLanguage);

  try {
    const response = await fetch(url.toString(), {
      headers: {
        "User-Agent": "temps-rocks/1.0 (https://temps.rocks)",
      },
      // Cache for 1 hour
      next: { revalidate: 3600 },
    });

    if (!response.ok) {
      throw new Error(`Nominatim API error: ${response.status} ${response.statusText}`);
    }

    const data: NominatimResponse[] = await response.json();
    return data;
  } catch (error) {
    console.error("Location search failed:", error);
    return [];
  }
}
