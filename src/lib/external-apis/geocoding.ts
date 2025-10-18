/**
 * Open-Meteo Geocoding API
 * Free geocoding - no API key required
 * https://open-meteo.com/en/docs/geocoding-api
 */

export interface GeocodingResult {
  id: number;
  name: string;
  latitude: number;
  longitude: number;
  elevation?: number;
  feature_code?: string;
  country_code?: string;
  admin1?: string;
  admin2?: string;
  timezone?: string;
  population?: number;
  country?: string;
}

export interface GeocodingResponse {
  results: GeocodingResult[];
  generationtime_ms: number;
}

/**
 * Search for locations using Open-Meteo Geocoding API
 * @param query - Location search query (e.g., "Siurana" limestone, "El Pati")
 * @param limit - Maximum number of results (default 10)
 */
export async function searchLocations(
  query: string,
  limit: number = 10
): Promise<GeocodingResult[]> {
  try {
    const url = new URL('https://geocoding-api.open-meteo.com/v1/search');
    url.searchParams.append('name', query);
    url.searchParams.append('count', limit.toString());
    url.searchParams.append('language', 'en');
    url.searchParams.append('format', 'json');

    console.log('[Geocoding] Fetching location:', {
      query,
      limit,
      url: url.toString(),
    });

    const response = await fetch(url.toString(), {
      headers: {
        'User-Agent': 'temps.rocks',
      },
    });

    console.log('[Geocoding] Response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[Geocoding] API error response:', {
        status: response.status,
        statusText: response.statusText,
        body: errorText,
      });
      throw new Error(`Geocoding API error: ${response.status}`);
    }

    const data: GeocodingResponse = await response.json();
    console.log('[Geocoding] Found results:', {
      query,
      count: data.results?.length || 0,
      results: data.results?.map(r => ({ name: r.name, country: r.country })),
    });
    return data.results || [];
  } catch (error) {
    console.error('[Geocoding] Error:', {
      query,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    throw error;
  }
}

/**
 * Search for a specific location and return the best match
 * @param query - Location search query
 */
export async function searchLocationBest(query: string): Promise<GeocodingResult | null> {
  const results = await searchLocations(query, 1);
  return results.length > 0 ? results[0] : null;
}

/**
 * Search for locations and return multiple results with disambiguation info
 * @param query - Location search query
 * @param limit - Maximum number of results (default 5)
 */
export async function searchLocationMultiple(query: string, limit: number = 5): Promise<GeocodingResult[]> {
  return await searchLocations(query, limit);
}
