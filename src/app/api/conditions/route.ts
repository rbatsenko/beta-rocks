import { NextRequest, NextResponse } from 'next/server';
import { computeConditions, findOptimalWindows, RockType } from '@/lib/conditions/conditions.service';
import { getWeatherForecast } from '@/lib/external-apis/open-meteo';

/**
 * GET /api/conditions
 * Returns climbing conditions for a given location and rock type
 *
 * Query params:
 * - lat: number (latitude)
 * - lon: number (longitude)
 * - rockType: string (granite, sandstone, limestone, basalt, gneiss, quartzite, unknown)
 * - recentPrecipMm: number (optional, recent precipitation in mm)
 */
export async function GET(request: NextRequest) {
  try {
    const lat = request.nextUrl.searchParams.get('lat');
    const lon = request.nextUrl.searchParams.get('lon');
    const rockType = (request.nextUrl.searchParams.get('rockType') || 'unknown') as RockType;
    const recentPrecipMm = parseFloat(request.nextUrl.searchParams.get('recentPrecipMm') || '0');

    // Validate required parameters
    if (!lat || !lon) {
      return NextResponse.json(
        { error: 'Missing required parameters: lat, lon' },
        { status: 400 }
      );
    }

    const latitude = parseFloat(lat);
    const longitude = parseFloat(lon);

    if (isNaN(latitude) || isNaN(longitude)) {
      return NextResponse.json(
        { error: 'Invalid coordinates' },
        { status: 400 }
      );
    }

    // Fetch weather data
    const forecast = await getWeatherForecast(latitude, longitude, 7);

    if (!forecast.current || !forecast.hourly) {
      throw new Error('Invalid forecast data structure');
    }

    // Compute conditions
    const conditions = computeConditions(
      {
        current: {
          temp_c: forecast.current.temperature,
          humidity: forecast.current.humidity,
          wind_kph: forecast.current.windSpeed,
          precip_mm: forecast.current.precipitation,
        },
        hourly: forecast.hourly.map((h) => ({
          time: new Date(h.time).toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: false,
          }),
          temp_c: h.temperature,
          humidity: h.humidity,
          wind_kph: h.windSpeed,
          precip_mm: h.precipitation,
        })),
      },
      rockType,
      recentPrecipMm
    );

    // Find optimal windows
    const optimalWindows = findOptimalWindows(
      forecast.hourly.map((h) => ({
        time: new Date(h.time).toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit',
          hour12: false,
        }),
        temp_c: h.temperature,
        humidity: h.humidity,
        wind_kph: h.windSpeed,
        precip_mm: h.precipitation,
      })),
      rockType
    );

    return NextResponse.json({
      location: { lat: latitude, lon: longitude },
      rockType,
      current: {
        temperature_c: forecast.current.temperature,
        humidity: forecast.current.humidity,
        windSpeed_kph: forecast.current.windSpeed,
        precipitation_mm: forecast.current.precipitation,
        weatherCode: forecast.current.weatherCode,
      },
      conditions: {
        ...conditions,
        optimalWindows,
      },
      updatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Conditions API error:', {
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    return NextResponse.json(
      {
        error: 'Failed to compute conditions',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
