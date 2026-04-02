import { NextRequest, NextResponse } from "next/server";
import { getSupabaseClient, isSupabaseConfigured } from "@/integrations/supabase/client";
import { computeConditions, RockType } from "@/lib/conditions/conditions.service";
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

    const conditions = await computeConditions(
      {
        current: {
          temp_c: forecast.current.temperature,
          humidity: forecast.current.humidity,
          wind_kph: forecast.current.windSpeed,
          precip_mm: forecast.current.precipitation,
        },
        hourly: hourlyData,
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
        current_weather: {
          temperature_c: forecast.current.temperature,
          humidity: forecast.current.humidity,
          wind_speed_kph: forecast.current.windSpeed,
          wind_direction: forecast.current.windDirection,
          precipitation_mm: forecast.current.precipitation,
          weather_code: forecast.current.weatherCode,
        },
        conditions: {
          label: conditions.rating,
          friction_score: conditions.frictionRating,
          note: "Friction score is a rough estimate based on weather, rock type, and recent precipitation.",
          is_dry: conditions.isDry,
          reasons: conditions.reasons,
          warnings: conditions.warnings,
          hourly_conditions: conditions.hourlyConditions?.slice(0, 24).map((h: any) => ({
            time: h.time,
            friction_score: h.frictionScore,
            temperature_c: h.temperature,
            humidity: h.humidity,
            wind_speed_kph: h.windSpeed,
            precipitation_mm: h.precipitation,
          })),
          optimal_windows: conditions.optimalWindows,
        },
        daily_forecast: forecast.daily?.slice(0, 7).map((day) => ({
          date: day.date,
          temp_max_c: day.tempMax,
          temp_min_c: day.tempMin,
          precipitation_mm: day.precipitation,
          wind_speed_max_kph: day.windSpeedMax,
          weather_code: day.weatherCode,
          sunrise: day.sunrise,
          sunset: day.sunset,
        })),
        updated_at: new Date().toISOString(),
      },
    }, {
      headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600" },
    });
  } catch (error) {
    console.error("[v1/crags/:id/conditions] Unexpected error:", error);
    return NextResponse.json({ error: "Failed to compute conditions" }, { status: 500 });
  }
}
