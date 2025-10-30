import { NextRequest, NextResponse } from "next/server";
import { fetchCragById } from "@/lib/db/queries";
import { getWeatherForecast } from "@/lib/external-apis/open-meteo";
import { computeConditions } from "@/lib/conditions/conditions.service";
import type { RockType } from "@/lib/conditions/conditions.service";

export const dynamic = "force-dynamic";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ cragId: string }> }
) {
  try {
    const { cragId } = await params;
    console.log(`[API /conditions/${cragId}] Processing request`);

    // Fetch crag from database
    const crag = await fetchCragById(cragId);

    if (!crag) {
      return NextResponse.json({ error: "Crag not found" }, { status: 404 });
    }

    // Fetch weather data (14 days)
    const weather = await getWeatherForecast(crag.lat, crag.lon, 14);

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

    console.log(
      `[API /conditions/${cragId}] Successfully computed conditions for ${crag.name}`
    );

    return NextResponse.json({
      conditions,
      updatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error(`[API /conditions] Error:`, error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to compute conditions" },
      { status: 500 }
    );
  }
}
