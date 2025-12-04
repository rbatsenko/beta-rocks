/**
 * Windy Webcams API Integration
 * https://api.windy.com/webcams/docs
 */

export interface Webcam {
  id: string;
  title: string;
  viewCount: number;
  status: "active" | "inactive";
  lastUpdatedOn: string;
  location: {
    city: string;
    region: string;
    country: string;
    countryCode: string;
    latitude: number;
    longitude: number;
  };
  images: {
    current: {
      preview: string;
      thumbnail: string;
    };
    daylight?: {
      preview: string;
      thumbnail: string;
    };
  };
  player: {
    live: {
      available: boolean;
      embed: string;
    };
    day: {
      available: boolean;
      embed: string;
    };
    month?: {
      available: boolean;
      embed: string;
    };
    year?: {
      available: boolean;
      embed: string;
    };
  };
  urls: {
    detail: string;
    edit: string;
  };
}

export interface WebcamsResponse {
  total: number;
  webcams: Webcam[];
}

const WINDY_API_BASE = "https://api.windy.com/webcams/api/v3/webcams";

/**
 * Fetch webcams near a location
 * @param lat - Latitude
 * @param lon - Longitude
 * @param radiusKm - Search radius in kilometers (max 250)
 * @param limit - Max number of webcams to return (max 50)
 */
export async function getNearbyWebcams(
  lat: number,
  lon: number,
  radiusKm: number = 50,
  limit: number = 10
): Promise<WebcamsResponse> {
  const apiKey = process.env.WINDY_API_KEY;

  if (!apiKey) {
    console.warn("[Webcams] WINDY_API_KEY not configured");
    return { total: 0, webcams: [] };
  }

  try {
    // Round coordinates to avoid cache fragmentation
    const roundedLat = Number(lat.toFixed(3));
    const roundedLon = Number(lon.toFixed(3));

    // Clamp radius to API maximum
    const clampedRadius = Math.min(radiusKm, 250);
    const clampedLimit = Math.min(limit, 50);

    const url = new URL(WINDY_API_BASE);
    url.searchParams.append("nearby", `${roundedLat},${roundedLon},${clampedRadius}`);
    url.searchParams.append("limit", clampedLimit.toString());
    url.searchParams.append("include", "location,images,player,urls");

    console.log("[Webcams] Fetching nearby webcams:", {
      lat: roundedLat,
      lon: roundedLon,
      radiusKm: clampedRadius,
      limit: clampedLimit,
    });

    const response = await fetch(url.toString(), {
      headers: {
        "x-windy-api-key": apiKey,
        "User-Agent": "beta.rocks",
      },
      // Cache for 10 minutes (webcam images refresh periodically)
      next: { revalidate: 600 },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("[Webcams] API error response:", {
        status: response.status,
        statusText: response.statusText,
        body: errorText,
      });
      throw new Error(`Windy Webcams API error: ${response.status}`);
    }

    const data = await response.json();

    console.log("[Webcams] Received webcams data:", {
      lat: roundedLat,
      lon: roundedLon,
      total: data.total,
      returned: data.webcams?.length || 0,
    });

    return {
      total: data.total || 0,
      webcams: data.webcams || [],
    };
  } catch (error) {
    console.error("[Webcams] Error:", {
      lat,
      lon,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    // Return empty result instead of throwing to gracefully degrade
    return { total: 0, webcams: [] };
  }
}

/**
 * Calculate distance between two coordinates in km
 */
export function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Earth's radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}
