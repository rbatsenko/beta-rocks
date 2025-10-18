/**
 * Open-Meteo Weather API Integration
 * Free weather API - no API key required
 * https://open-meteo.com/
 */

export interface WeatherData {
  temperature: number;
  humidity: number;
  windSpeed: number;
  windDirection: number;
  precipitation: number;
  weatherCode: number;
  time: string;
}

export interface ForecastData {
  current: WeatherData;
  hourly: WeatherData[];
  daily: {
    date: string;
    tempMax: number;
    tempMin: number;
    precipitation: number;
    windSpeedMax: number;
  }[];
}

/**
 * Fetch weather data from Open-Meteo API
 * @param lat - Latitude
 * @param lon - Longitude
 * @param days - Number of days to forecast (default 7)
 */
export async function getWeatherForecast(
  lat: number,
  lon: number,
  days: number = 7
): Promise<ForecastData> {
  try {
    const url = new URL("https://api.open-meteo.com/v1/forecast");
    url.searchParams.append("latitude", lat.toString());
    url.searchParams.append("longitude", lon.toString());
    url.searchParams.append(
      "current",
      "temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m,wind_direction_10m,precipitation"
    );
    url.searchParams.append(
      "hourly",
      "temperature_2m,relative_humidity_2m,wind_speed_10m,weather_code,precipitation"
    );
    url.searchParams.append(
      "daily",
      "temperature_2m_max,temperature_2m_min,precipitation_sum,wind_speed_10m_max"
    );
    url.searchParams.append("timezone", "auto");
    url.searchParams.append("forecast_days", days.toString());

    console.log("[Weather] Fetching forecast:", {
      lat,
      lon,
      days,
      url: url.toString(),
    });

    const response = await fetch(url.toString(), {
      headers: {
        "User-Agent": "temps.rocks",
      },
    });

    console.log("[Weather] Response status:", response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error("[Weather] API error response:", {
        status: response.status,
        statusText: response.statusText,
        body: errorText,
      });
      throw new Error(`Open-Meteo API error: ${response.status}`);
    }

    const data = await response.json();
    console.log("[Weather] Received forecast data:", {
      lat,
      lon,
      currentTemp: data.current?.temperature_2m,
      hourlyDataPoints: data.hourly?.time?.length || 0,
      dailyDataPoints: data.daily?.time?.length || 0,
    });

    return {
      current: {
        temperature: data.current.temperature_2m,
        humidity: data.current.relative_humidity_2m,
        windSpeed: data.current.wind_speed_10m,
        windDirection: data.current.wind_direction_10m,
        precipitation: data.current.precipitation,
        weatherCode: data.current.weather_code,
        time: data.current.time,
      },
      hourly: (data.hourly.time || []).map((time: string, idx: number) => ({
        temperature: data.hourly.temperature_2m[idx],
        humidity: data.hourly.relative_humidity_2m[idx],
        windSpeed: data.hourly.wind_speed_10m[idx],
        windDirection: 0, // Not provided in hourly
        precipitation: data.hourly.precipitation[idx],
        weatherCode: data.hourly.weather_code[idx],
        time,
      })),
      daily: (data.daily.time || []).map((date: string, idx: number) => ({
        date,
        tempMax: data.daily.temperature_2m_max[idx],
        tempMin: data.daily.temperature_2m_min[idx],
        precipitation: data.daily.precipitation_sum[idx],
        windSpeedMax: data.daily.wind_speed_10m_max[idx],
      })),
    };
  } catch (error) {
    console.error("[Weather] Error:", {
      lat,
      lon,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    throw error;
  }
}

/**
 * Get current weather for a location
 */
export async function getCurrentWeather(lat: number, lon: number): Promise<WeatherData> {
  const forecast = await getWeatherForecast(lat, lon, 1);
  return forecast.current;
}

/**
 * Get hourly forecast for next 24 hours
 */
export async function getHourlyForecast(lat: number, lon: number): Promise<WeatherData[]> {
  const forecast = await getWeatherForecast(lat, lon, 1);
  return forecast.hourly.slice(0, 24);
}
