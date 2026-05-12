import { NextRequest, NextResponse } from "next/server";
import { getSupabaseClient, isSupabaseConfigured } from "@/integrations/supabase/client";
import { getWeatherForecast } from "@/lib/external-apis/open-meteo";
import { computeWeather, type RockType } from "@/lib/conditions/conditions.service";
import type { ConditionsLabel, MapCrag } from "@/components/home/home-map-types";

// Each conditions computation triggers a weather fetch, so give the route some headroom.
export const maxDuration = 30;

const DEFAULT_RADIUS_M = 50_000;
const MAX_RADIUS_M = 100_000;
const MIN_RADIUS_M = 1_000;

const DEFAULT_MARKERS = 100;
const MAX_MARKERS = 150;
// We only compute (slow) conditions for the closest crags so the response stays fast; the rest
// are returned as plain markers (label: null → grey) and get full conditions on click.
const CONDITIONS_CAP = 30;
// Open-Meteo's free tier rejects bursts of concurrent requests ("429 Too many concurrent
// requests"), so keep the fan-out small. Repeat areas are served from the CDN cache anyway.
const WEATHER_CONCURRENCY = 3;

interface CragRow {
  id: string;
  name: string;
  slug: string;
  lat: number | null;
  lon: number | null;
  rock_type: string | null;
  country: string | null;
}

type CragWithDistance = CragRow & { lat: number; lon: number; distance_m: number };

function haversineMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6_371_000;
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(a)));
}

async function mapWithConcurrency<T, R>(
  items: T[],
  limit: number,
  fn: (item: T) => Promise<R>
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let cursor = 0;
  async function worker() {
    while (cursor < items.length) {
      const index = cursor++;
      results[index] = await fn(items[index]);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return results;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchWeatherWithRetry(lat: number, lon: number) {
  try {
    return await getWeatherForecast(lat, lon, 14);
  } catch {
    // Most failures here are Open-Meteo's transient "429 Too many concurrent requests".
    await sleep(600 + Math.random() * 400);
    return await getWeatherForecast(lat, lon, 14);
  }
}

function toMarker(crag: CragWithDistance, label: ConditionsLabel | null): MapCrag {
  return {
    id: crag.id,
    name: crag.name,
    slug: crag.slug,
    lat: crag.lat,
    lon: crag.lon,
    rock_type: crag.rock_type,
    country: crag.country,
    distance_m: crag.distance_m,
    label,
  };
}

async function computeLabel(crag: CragWithDistance): Promise<ConditionsLabel | null> {
  try {
    const weather = await fetchWeatherWithRetry(crag.lat, crag.lon);
    if (!weather?.current) return null;

    const transformedWeather = {
      current: {
        temp_c: weather.current.temperature,
        humidity: weather.current.humidity,
        wind_kph: weather.current.windSpeed,
        wind_direction: weather.current.windDirection,
        precip_mm: weather.current.precipitation,
        weatherCode: weather.current.weatherCode,
      },
      hourly: weather.hourly.map((hour) => ({
        time: hour.time,
        temp_c: hour.temperature,
        humidity: hour.humidity,
        wind_kph: hour.windSpeed,
        wind_direction: hour.windDirection,
        precip_mm: hour.precipitation,
        weatherCode: hour.weatherCode,
      })),
      daily: weather.daily,
      latitude: crag.lat,
      longitude: crag.lon,
    };

    const computed = await computeWeather(
      transformedWeather,
      (crag.rock_type as RockType) || "unknown",
      0,
      { includeNightHours: true }
    );
    return computed.label as ConditionsLabel;
  } catch (error) {
    console.warn(`[/api/conditions/nearby] conditions failed for crag ${crag.id}:`, error);
    return null;
  }
}

/**
 * GET /api/conditions/nearby?lat=&lon=&radius=&limit=
 *
 * Returns up to `limit` (default 100, capped at 150) non-secret, top-level crags within `radius`
 * metres of the given coordinates (default 50 km, capped at 100 km), closest first. The closest
 * ~30 are annotated with their current conditions friction label ("good" | "fair" | "poor"); the
 * rest have `label: null` (full conditions are fetched on demand when a crag is opened).
 */
export async function GET(request: NextRequest) {
  try {
    if (!isSupabaseConfigured) {
      return NextResponse.json({ error: "Supabase is not configured" }, { status: 500 });
    }

    const { searchParams } = new URL(request.url);
    const lat = Number(searchParams.get("lat"));
    const lon = Number(searchParams.get("lon"));
    const radiusM = Math.min(
      MAX_RADIUS_M,
      Math.max(MIN_RADIUS_M, Number(searchParams.get("radius")) || DEFAULT_RADIUS_M)
    );
    const markerLimit = Math.min(
      MAX_MARKERS,
      Math.max(1, Number(searchParams.get("limit")) || DEFAULT_MARKERS)
    );

    if (
      !Number.isFinite(lat) ||
      !Number.isFinite(lon) ||
      lat < -90 ||
      lat > 90 ||
      lon < -180 ||
      lon > 180
    ) {
      return NextResponse.json({ error: "Invalid lat/lon parameters" }, { status: 400 });
    }

    const supabase = getSupabaseClient();

    // Bounding-box pre-filter (cheap, index-friendly); precise distance is computed below.
    const radiusKm = radiusM / 1000;
    const latDelta = radiusKm / 111;
    const lonDelta = radiusKm / (111 * Math.max(0.01, Math.cos((lat * Math.PI) / 180)));

    const { data, error } = await supabase
      .from("crags")
      .select("id, name, slug, lat, lon, rock_type, country")
      .eq("is_secret", false)
      .is("parent_crag_id", null)
      .not("lat", "is", null)
      .not("lon", "is", null)
      .gte("lat", lat - latDelta)
      .lte("lat", lat + latDelta)
      .gte("lon", lon - lonDelta)
      .lte("lon", lon + lonDelta)
      .limit(500);

    if (error) {
      console.error("[/api/conditions/nearby] crag query error:", error);
      return NextResponse.json({ error: "Failed to query crags" }, { status: 500 });
    }

    const withinRadius: CragWithDistance[] = ((data as CragRow[] | null) ?? [])
      .filter((c): c is CragRow & { lat: number; lon: number } => c.lat != null && c.lon != null)
      .map((c) => ({ ...c, distance_m: Math.round(haversineMeters(lat, lon, c.lat, c.lon)) }))
      .filter((c) => c.distance_m <= radiusM)
      .sort((a, b) => a.distance_m - b.distance_m)
      .slice(0, markerLimit);

    const detailed = withinRadius.slice(0, CONDITIONS_CAP);
    const plain = withinRadius.slice(CONDITIONS_CAP);

    const labels = await mapWithConcurrency(detailed, WEATHER_CONCURRENCY, computeLabel);

    const results: MapCrag[] = [
      ...detailed.map((crag, i) => toMarker(crag, labels[i])),
      ...plain.map((crag) => toMarker(crag, null)),
    ];

    return NextResponse.json(
      {
        data: results,
        query: {
          lat,
          lon,
          radius_m: radiusM,
          count: results.length,
          with_conditions: detailed.length,
        },
      },
      {
        headers: {
          "Cache-Control": "public, max-age=300, s-maxage=600, stale-while-revalidate=1800",
        },
      }
    );
  } catch (error) {
    console.error("[/api/conditions/nearby] error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal error" },
      { status: 500 }
    );
  }
}
