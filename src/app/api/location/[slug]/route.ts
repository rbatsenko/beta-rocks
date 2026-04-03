import { NextRequest, NextResponse } from "next/server";
import {
  fetchCragBySlug,
  fetchReportsByCrag,
  fetchSectorsByCrag,
  findCragByCoordinates,
} from "@/lib/db/queries";
import { getWeatherForecast } from "@/lib/external-apis/open-meteo";
import { computeWeather } from "@/lib/conditions/conditions.service";
import { parseCoordinatesFromSlug } from "@/lib/utils/slug";
import type { RockType } from "@/lib/conditions/conditions.service";

// With cacheComponents enabled, route segment configs are not compatible
// Function-level caching handles data freshness

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

    // Locationless crags cannot provide weather/conditions
    if (crag.lat == null || crag.lon == null) {
      const reports = await fetchReportsByCrag(crag.id, 20).catch(() => []);
      const sectors = await fetchSectorsByCrag(crag.id).catch(() => []);
      return NextResponse.json({
        crag,
        reports,
        sectors,
        conditions: null,
        weather: null,
        locationless: true,
      });
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
        wind_direction: hour.windDirection,
        precip_mm: hour.precipitation,
        weatherCode: hour.weatherCode,
      })),
      daily: weather.daily,
      latitude: crag.lat,
      longitude: crag.lon,
    };

    // Compute weather conditions
    const weatherResponse = await computeWeather(
      transformedWeather,
      (crag.rock_type as RockType) || "unknown",
      0,
      { includeNightHours: true }
    );

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
      crag,
      conditions: { ...weatherResponse, ...backwardCompat },
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
