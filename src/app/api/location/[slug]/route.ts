import { NextRequest, NextResponse } from "next/server";
import {
  fetchCragBySlug,
  fetchReportsByCrag,
  fetchSectorsByCrag,
  findCragByCoordinates,
} from "@/lib/db/queries";
import { getWeatherForecast } from "@/lib/external-apis/open-meteo";
import { computeConditions } from "@/lib/conditions/conditions.service";
import { parseCoordinatesFromSlug } from "@/lib/utils/slug";
import type { RockType } from "@/lib/conditions/conditions.service";

export const dynamic = "force-dynamic";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    console.log(`[API /location/${slug}] Processing request`);

    let crag = null;

    // Try direct slug lookup first (new system)
    crag = await fetchCragBySlug(slug);

    // Fallback to old coordinate-based slug parsing for backward compatibility
    if (!crag) {
      const coords = parseCoordinatesFromSlug(slug);
      if (coords) {
        console.log(`[API /location/${slug}] Falling back to coordinate lookup`);
        crag = await findCragByCoordinates(coords.lat, coords.lon, 0.01);
      }
    }

    if (!crag) {
      return NextResponse.json({ error: "Crag not found" }, { status: 404 });
    }

    // Fetch all data in parallel
    const [weather, reports, sectors] = await Promise.all([
      getWeatherForecast(crag.lat, crag.lon, 14),
      fetchReportsByCrag(crag.id, 20).catch(() => []),
      fetchSectorsByCrag(crag.id).catch(() => []),
    ]);

    if (!weather || !weather.current) {
      throw new Error("Failed to fetch weather data");
    }

    // Transform weather data
    const transformedWeather = {
      current: {
        temp_c: weather.current.temperature,
        humidity: weather.current.humidity,
        wind_kph: weather.current.windSpeed,
        precip_mm: weather.current.precipitation,
        weatherCode: weather.current.weatherCode,
      },
      hourly: weather.hourly.map((hour) => ({
        time: hour.time,
        temp_c: hour.temperature,
        humidity: hour.humidity,
        wind_kph: hour.windSpeed,
        precip_mm: hour.precipitation,
        weatherCode: hour.weatherCode,
      })),
      daily: weather.daily,
      latitude: crag.lat,
      longitude: crag.lon,
    };

    // Compute conditions
    const rawConditions = computeConditions(
      transformedWeather,
      (crag.rock_type as RockType) || "unknown",
      0,
      { includeNightHours: true }
    );

    if (!rawConditions || typeof rawConditions.frictionRating !== "number") {
      throw new Error("Failed to compute conditions");
    }

    const conditions = {
      ...rawConditions,
      frictionScore: rawConditions.frictionRating,
      dailyForecast: weather.daily,
      current: {
        temperature_c: weather.current.temperature,
        humidity: weather.current.humidity,
        windSpeed_kph: weather.current.windSpeed,
        precipitation_mm: weather.current.precipitation,
        weatherCode: weather.current.weatherCode,
      },
      astro: {
        sunrise: weather.daily[0].sunrise,
        sunset: weather.daily[0].sunset,
      },
    };

    return NextResponse.json({
      crag,
      conditions,
      reports,
      sectors,
    });
  } catch (error) {
    console.error(`[API /location] Error:`, error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to load location data" },
      { status: 500 }
    );
  }
}
