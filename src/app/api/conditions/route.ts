import { NextRequest, NextResponse } from 'next/server';
import { computeConditions, RockType } from '@/lib/conditions/conditions.service';
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

    console.log('[Conditions API] Received request:', {
      lat,
      lon,
      rockType,
      recentPrecipMm,
      url: request.nextUrl.toString(),
    });

    // Validate required parameters
    if (!lat || !lon) {
      console.error('[Conditions API] Missing parameters:', { lat, lon });
      return NextResponse.json(
        { error: 'Missing required parameters: lat, lon' },
        { status: 400 }
      );
    }

    const latitude = parseFloat(lat);
    const longitude = parseFloat(lon);

    if (isNaN(latitude) || isNaN(longitude)) {
      console.error('[Conditions API] Invalid coordinates:', { lat, lon, latitude, longitude });
      return NextResponse.json(
        { error: 'Invalid coordinates' },
        { status: 400 }
      );
    }

    console.log('[Conditions API] Fetching weather forecast for:', { latitude, longitude });

    // Fetch weather data
    const forecast = await getWeatherForecast(latitude, longitude, 7);

    console.log('[Conditions API] Weather forecast received:', {
      latitude,
      longitude,
      hasCurrent: !!forecast.current,
      hasHourly: !!forecast.hourly,
      hourlyCount: forecast.hourly?.length || 0,
    });

    if (!forecast.current || !forecast.hourly) {
      console.error('[Conditions API] Invalid forecast data structure:', {
        hasCurrent: !!forecast.current,
        hasHourly: !!forecast.hourly,
      });
      throw new Error('Invalid forecast data structure');
    }

    // Prepare hourly data with timestamps
    const hourlyData = forecast.hourly.map((h) => ({
      time: h.time, // Keep ISO timestamp for precipitation context calculation
      temp_c: h.temperature,
      humidity: h.humidity,
      wind_kph: h.windSpeed,
      precip_mm: h.precipitation,
    }));

    // Compute conditions with enhanced data (hourly conditions, optimal windows, etc.)
    const conditions = computeConditions(
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
      recentPrecipMm
    );

    // Format hourly conditions for response (convert ISO timestamps to readable format)
    const formattedHourlyConditions = conditions.hourlyConditions?.map((h) => ({
      ...h,
      time: new Date(h.time).toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      }),
    }));

    console.log('[Conditions API] Successfully computed conditions:', {
      latitude,
      longitude,
      rockType,
      rating: conditions.rating,
      frictionRating: conditions.frictionRating,
    });

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
        hourlyConditions: formattedHourlyConditions,
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
