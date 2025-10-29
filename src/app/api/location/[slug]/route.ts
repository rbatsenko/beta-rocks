import { NextRequest, NextResponse } from "next/server";
import {
  searchCrags,
  fetchReportsByCrag,
  fetchSectorsByCrag,
  findCragByCoordinates,
} from "@/lib/db/queries";
import { getWeatherForecast } from "@/lib/external-apis/open-meteo";
import { computeConditions } from "@/lib/conditions/conditions.service";
import { parseCoordinatesFromSlug, getBaseSlug, generateSlug } from "@/lib/utils/slug";
import type { RockType } from "@/lib/conditions/conditions.service";

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    console.log(`[API /location/${slug}] Processing request`);

    // Find crag by slug
    const baseSlug = getBaseSlug(slug);
    const slugParts = baseSlug.split("-");
    const searchName = slugParts[slugParts.length - 1];

    const results = await searchCrags(searchName);

    let crag = null;

    if (results && results.length > 0) {
      if (results.length === 1) {
        crag = results[0];
      } else {
        // Multiple results - try exact slug match
        const exactMatch = results.find((c) => generateSlug(c.name) === baseSlug);
        if (exactMatch) {
          crag = exactMatch;
        } else {
          // Try coordinate disambiguation
          const coords = parseCoordinatesFromSlug(slug);
          if (coords) {
            crag = await findCragByCoordinates(coords.lat, coords.lon, 0.01);
          } else {
            crag = results[0];
          }
        }
      }
    }

    // Fallback to coordinate lookup
    if (!crag) {
      const coords = parseCoordinatesFromSlug(slug);
      if (coords) {
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
      { includeNightHours: false }
    );

    if (!rawConditions || typeof rawConditions.frictionRating !== "number") {
      throw new Error("Failed to compute conditions");
    }

    const conditions = {
      ...rawConditions,
      frictionScore: rawConditions.frictionRating,
      dailyForecast: weather.daily,
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
