/**
 * Backward compatibility shim for the mobile app.
 *
 * The mobile app expects flattened, camelCase fields (e.g. hourlyConditions,
 * dailyForecast, current, astro) that were removed in the flag-based weather
 * refactor (#46). This helper maps the new WeatherResponse shape back to the
 * fields the mobile app reads.
 *
 * TODO: Remove after mobile app v2.0 is widely adopted (target: July 2026)
 */

import type { WeatherResponse } from "./conditions.service";

interface TransformedCurrent {
  weatherCode?: number;
  wind_direction?: number;
}

/**
 * Build backward-compatible fields from a WeatherResponse for the mobile app.
 *
 * @param weatherResponse - The new-format response from computeWeather()
 * @param rawCurrent      - The pre-transform current weather (has weatherCode
 *                          and wind_direction that computeWeather strips)
 */
export function buildMobileCompat(
  weatherResponse: WeatherResponse,
  rawCurrent: TransformedCurrent
) {
  const firstDaily = weatherResponse.weather.daily?.[0];

  return {
    // Legacy friction-based fields
    frictionRating:
      weatherResponse.label === "looks_good"
        ? 4
        : weatherResponse.label === "watch_out"
          ? 3
          : 1,
    rating:
      weatherResponse.label === "looks_good"
        ? "Good"
        : weatherResponse.label === "watch_out"
          ? "Fair"
          : "Poor",
    isDry:
      !weatherResponse.flags.rain_now &&
      !weatherResponse.flags.wet_rock_likely,
    reasons: weatherResponse.warnings,

    // Mobile app reads conditions.current with camelCase field names
    current: {
      temperature_c: weatherResponse.weather.now.temp_c,
      humidity: weatherResponse.weather.now.humidity,
      windSpeed_kph: weatherResponse.weather.now.wind_kph,
      windDirection:
        weatherResponse.weather.now.wind_direction ?? rawCurrent.wind_direction,
      precipitation_mm: weatherResponse.weather.now.precip_mm,
      weatherCode: rawCurrent.weatherCode ?? 0,
    },

    // Sunrise/sunset — always provide an object so mobile doesn't crash
    astro: firstDaily
      ? { sunrise: firstDaily.sunrise, sunset: firstDaily.sunset }
      : { sunrise: "", sunset: "" },

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
      frictionScore: h.flags.rain_now
        ? 1
        : h.flags.condensation_risk
          ? 2
          : h.flags.high_humidity
            ? 3
            : 4,
      rating: h.flags.rain_now
        ? "Poor"
        : h.flags.condensation_risk
          ? "Poor"
          : h.flags.high_humidity
            ? "Fair"
            : "Good",
      isOptimal:
        !h.flags.rain_now &&
        !h.flags.condensation_risk &&
        !h.flags.wet_rock_likely,
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
}
