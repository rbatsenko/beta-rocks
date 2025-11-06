import { NextRequest, NextResponse } from "next/server";
import { fetchCragById } from "@/lib/db/queries";
import { getWeatherForecast } from "@/lib/external-apis/open-meteo";
import { computeConditions } from "@/lib/conditions/conditions.service";
import type { RockType } from "@/lib/conditions/conditions.service";

// Function-level caching (computeConditions, getWeatherForecast) provides 1-hour cache
// With cacheComponents enabled, route segment configs are not needed
// Cache Components automatically handles caching and revalidation

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ cragId: string }> }
) {
  try {
    const { cragId } = await params;
    console.log(`[API /conditions/${cragId}] Processing request`);

    // Fetch the crag/sector (sectors are now stored in crags table with parent_crag_id)
    const cragOrSector = await fetchCragById(cragId);

    if (!cragOrSector) {
      return NextResponse.json({ error: "Crag or sector not found" }, { status: 404 });
    }

    let lat: number;
    let lon: number;
    let rockType: string | null;
    let name: string;

    // Check if this is a sector (has parent_crag_id)
    if (cragOrSector.parent_crag_id) {
      // It's a sector - fetch parent crag for rock type
      const parentCrag = await fetchCragById(cragOrSector.parent_crag_id);
      if (!parentCrag) {
        return NextResponse.json({ error: "Parent crag not found" }, { status: 404 });
      }

      lat = cragOrSector.lat;
      lon = cragOrSector.lon;
      rockType = parentCrag.rock_type; // Use parent crag's rock type
      name = cragOrSector.name;
      console.log(`[API /conditions/${cragId}] Using sector coordinates: ${lat}, ${lon}`);
    } else {
      // It's a crag
      lat = cragOrSector.lat;
      lon = cragOrSector.lon;
      rockType = cragOrSector.rock_type;
      name = cragOrSector.name;
      console.log(`[API /conditions/${cragId}] Using crag coordinates: ${lat}, ${lon}`);
    }

    // Fetch weather data (14 days)
    const weather = await getWeatherForecast(lat, lon, 14);

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
      latitude: lat,
      longitude: lon,
    };

    // Compute conditions (cached for 1 hour with Cache Components)
    const rawConditions = await computeConditions(
      transformedWeather,
      (rockType as RockType) || "unknown",
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

    console.log(`[API /conditions/${cragId}] Successfully computed conditions for ${name}`);

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
