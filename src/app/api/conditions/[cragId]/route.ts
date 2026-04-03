import { NextRequest, NextResponse } from "next/server";
import { fetchCragById } from "@/lib/db/queries";
import { getWeatherForecast } from "@/lib/external-apis/open-meteo";
import { computeWeather } from "@/lib/conditions/conditions.service";
import type { RockType } from "@/lib/conditions/conditions.service";

// Function-level caching (computeWeather, getWeatherForecast) provides 1-hour cache
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

    // Locationless crags have no coordinates - can't compute conditions
    if (cragOrSector.lat == null || cragOrSector.lon == null) {
      return NextResponse.json(
        { error: "This crag has no location data. Weather conditions are not available." },
        { status: 400 }
      );
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
        wind_direction: hour.windDirection,
        precip_mm: hour.precipitation,
        weatherCode: hour.weatherCode,
      })),
      daily: weather.daily,
      latitude: lat,
      longitude: lon,
    };

    // Compute weather conditions
    const weatherResponse = await computeWeather(
      transformedWeather,
      (rockType as RockType) || "unknown",
      0,
      { includeNightHours: true }
    );

    console.log(`[API /conditions/${cragId}] Successfully computed conditions for ${name}`);

    // TODO: Remove backward compat shim after mobile app v2.0 is widely adopted (target: July 2026)
    // Backward compat: mobile app expects flattened fields alongside the new WeatherResponse shape
    const todayDaily = weatherResponse.weather.daily?.[0];
    const backwardCompat = {
      // Legacy friction-based fields
      frictionRating: weatherResponse.label === "looks_good" ? 4 : weatherResponse.label === "watch_out" ? 3 : 1,
      rating: weatherResponse.label === "looks_good" ? "Good" : weatherResponse.label === "watch_out" ? "Fair" : "Poor",
      isDry: !weatherResponse.flags.rain_now && !weatherResponse.flags.wet_rock_likely,
      reasons: weatherResponse.warnings,

      // Mobile app reads conditions.current with camelCase field names
      current: {
        temperature_c: weatherResponse.weather.now.temp_c,
        humidity: weatherResponse.weather.now.humidity,
        windSpeed_kph: weatherResponse.weather.now.wind_kph,
        windDirection: weatherResponse.weather.now.wind_direction,
        precipitation_mm: weatherResponse.weather.now.precip_mm,
        weatherCode: transformedWeather.current.weatherCode ?? 0,
      },

      // Sunrise/sunset from first daily entry
      astro: todayDaily
        ? { sunrise: todayDaily.sunrise, sunset: todayDaily.sunset }
        : undefined,

      // Precipitation context
      precipitationContext: weatherResponse.precipitation,

      // Dew point spread
      dewPointSpread: weatherResponse.weather.now.dew_point_spread,

      // Hourly conditions with both old and new field names + flags
      hourlyConditions: weatherResponse.weather.hourly.map((h) => ({
        time: h.time,
        temp_c: h.temp_c,
        temperature_c: h.temp_c,
        humidity: h.humidity,
        dew_point_spread: h.dew_point_spread,
        wind_kph: h.wind_kph,
        windSpeed_kph: h.wind_kph,
        wind_direction: h.wind_direction,
        precip_mm: h.precip_mm,
        precipitation_mm: h.precip_mm,
        weatherCode: h.weather_code,
        flags: {
          rain_now: h.flags.rain_now,
          condensation_risk: h.flags.condensation_risk,
          high_humidity: h.flags.high_humidity,
          wet_rock_likely: h.flags.wet_rock_likely,
          high_wind: h.flags.high_wind,
          extreme_wind: h.flags.extreme_wind,
        },
        // Legacy fields
        frictionScore: h.flags.rain_now ? 1 : h.flags.condensation_risk ? 2 : h.flags.high_humidity ? 3 : 4,
        rating: h.flags.rain_now ? "Poor" : h.flags.condensation_risk ? "Poor" : h.flags.high_humidity ? "Fair" : "Good",
        isOptimal: !h.flags.rain_now && !h.flags.condensation_risk && !h.flags.wet_rock_likely,
        isDry: !h.flags.rain_now && !h.flags.wet_rock_likely,
        warnings: [],
      })),

      // Daily forecast with mobile-expected field names
      dailyForecast: weatherResponse.weather.daily.map((d) => ({
        date: d.date,
        tempMax: d.temp_max_c,
        tempMin: d.temp_min_c,
        precipitation: d.precipitation_mm,
        windSpeedMax: d.wind_speed_max_kph,
        weatherCode: d.weather_code,
        sunrise: d.sunrise,
        sunset: d.sunset,
      })),

      // Legacy optimal windows
      optimalWindows: weatherResponse.dry_windows.map((w) => ({
        startTime: w.start,
        endTime: w.end,
        avgFrictionScore: 4,
        rating: "Good",
        hourCount: w.hours,
      })),
    };

    return NextResponse.json({
      conditions: { ...weatherResponse, ...backwardCompat },
      updatedAt: weatherResponse.updated_at,
    });
  } catch (error) {
    console.error(`[API /conditions] Error:`, error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to compute conditions" },
      { status: 500 }
    );
  }
}
