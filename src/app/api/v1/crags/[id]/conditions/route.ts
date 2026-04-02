import { NextRequest, NextResponse } from "next/server";
import { getSupabaseClient, isSupabaseConfigured } from "@/integrations/supabase/client";
import { computeWeather, RockType } from "@/lib/conditions/conditions.service";
import { getWeatherForecast } from "@/lib/external-apis/open-meteo";

/**
 * GET /api/v1/crags/:id/conditions
 * Get current weather and climbing conditions for a crag.
 */
export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    if (!isSupabaseConfigured) {
      return NextResponse.json({ error: "Service unavailable" }, { status: 500 });
    }

    const { id } = await params;
    const supabase = getSupabaseClient();

    // Fetch the crag
    const { data: crag, error } = await supabase
      .from("crags")
      .select("id, name, slug, lat, lon, rock_type")
      .eq("id", id)
      .eq("is_secret", false)
      .single();

    if (error || !crag) {
      return NextResponse.json({ error: "Crag not found" }, { status: 404 });
    }

    if (!crag.lat || !crag.lon) {
      return NextResponse.json({ error: "Crag has no coordinates" }, { status: 400 });
    }

    const rockType = (crag.rock_type || "unknown") as RockType;

    // Fetch 14-day weather forecast
    const forecast = await getWeatherForecast(crag.lat, crag.lon, 14);

    if (!forecast.current || !forecast.hourly) {
      return NextResponse.json({ error: "Failed to fetch weather data" }, { status: 502 });
    }

    // Compute conditions
    const hourlyData = forecast.hourly.map((h) => ({
      time: h.time,
      temp_c: h.temperature,
      humidity: h.humidity,
      wind_kph: h.windSpeed,
      wind_direction: h.windDirection,
      precip_mm: h.precipitation,
      weatherCode: h.weatherCode,
    }));

    const weatherResponse = await computeWeather(
      {
        current: {
          temp_c: forecast.current.temperature,
          humidity: forecast.current.humidity,
          wind_kph: forecast.current.windSpeed,
          precip_mm: forecast.current.precipitation,
        },
        hourly: hourlyData,
        daily: forecast.daily,
        latitude: crag.lat,
        longitude: crag.lon,
      },
      rockType,
      0
    );

    return NextResponse.json({
      data: {
        crag: {
          id: crag.id,
          name: crag.name,
          slug: crag.slug,
          lat: crag.lat,
          lon: crag.lon,
          rock_type: rockType,
        },
        conditions: {
          flags: weatherResponse.flags,
          label: weatherResponse.label,
          summary: weatherResponse.summary,
          dry_windows: weatherResponse.dry_windows,
          precipitation: {
            last_24h_mm: weatherResponse.precipitation.last24h,
            last_48h_mm: weatherResponse.precipitation.last48h,
            next_24h_mm: weatherResponse.precipitation.next24h,
          },
          warnings: weatherResponse.warnings,
          hourly_conditions: weatherResponse.weather.hourly.slice(0, 24).map((h) => ({
            time: h.time,
            temperature_c: h.temp_c,
            humidity: h.humidity,
            dew_point_spread: h.dew_point_spread,
            wind_speed_kph: h.wind_kph,
            wind_direction: h.wind_direction,
            precipitation_mm: h.precip_mm,
            weather_code: h.weather_code,
            flags: h.flags,
          })),
        },
        current_weather: weatherResponse.weather.now,
        daily_forecast: weatherResponse.weather.daily.slice(0, 7),
        updated_at: weatherResponse.updated_at,
      },
    }, {
      headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600" },
    });
  } catch (error) {
    console.error("[v1/crags/:id/conditions] Unexpected error:", error);
    return NextResponse.json({ error: "Failed to compute conditions" }, { status: 500 });
  }
}
