/**
 * Climbing Weather Service
 * Provides flag-based weather assessment for climbing conditions.
 * No scoring — just flags, labels, and plain-language summaries.
 */

import {
  calculateDaylightHours,
  detectTimeContext,
  getClimbingHours,
} from "./daylight.utils";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type RockType =
  | "granite"
  | "sandstone"
  | "limestone"
  | "basalt"
  | "gneiss"
  | "quartzite"
  | "unknown";

export type WeatherLabel = "looks_good" | "watch_out" | "stay_home";

export interface WeatherFlags {
  rain_now: boolean;
  rain_expected: { in_hours: number; mm: number } | null;
  recent_rain: { last_24h_mm: number; last_48h_mm: number };
  condensation_risk: boolean;
  high_humidity: boolean;
  wet_rock_likely: boolean;
  estimated_dry_by: string | null;
  sandstone_wet_warning: boolean;
  extreme_wind: boolean;
  high_wind: boolean;
}

export interface DryWindow {
  start: string;
  end: string;
  hours: number;
}

export interface HourlyWeather {
  time: string;
  temp_c: number;
  humidity: number;
  dew_point_spread: number;
  wind_kph: number;
  wind_direction?: number;
  precip_mm: number;
  weather_code?: number;
  flags: WeatherFlags;
}

export interface WeatherResponse {
  weather: {
    now: {
      temp_c: number;
      humidity: number;
      dew_point_spread: number;
      wind_kph: number;
      wind_direction?: number;
      precip_mm: number;
      weather_code?: number;
    };
    hourly: HourlyWeather[];
    daily: Array<{
      date: string;
      temp_max_c: number;
      temp_min_c: number;
      precipitation_mm: number;
      wind_speed_max_kph: number;
      weather_code: number;
      sunrise: string;
      sunset: string;
    }>;
  };
  flags: WeatherFlags;
  label: WeatherLabel;
  summary: string; // English fallback
  summary_template: SummaryTemplate; // For i18n
  dry_windows: DryWindow[];
  precipitation: PrecipitationContext;
  warnings: string[];
  updated_at: string;
}

export interface PrecipitationContext {
  last24h: number;
  last48h: number;
  next24h: number;
}

export interface TimeContext {
  sunriseISO: string;
  sunsetISO: string;
  climbingStartHour: number;
  climbingEndHour: number;
  totalDaylightHours: number;
  contextNote?: string;
}

export interface WeatherForecast {
  current: {
    temp_c: number;
    humidity: number;
    wind_kph: number;
    wind_direction?: number;
    precip_mm: number;
  };
  hourly?: Array<{
    time: string;
    temp_c: number;
    humidity: number;
    wind_kph: number;
    wind_direction?: number;
    precip_mm: number;
    weatherCode?: number;
  }>;
  daily?: Array<{
    date: string;
    tempMax: number;
    tempMin: number;
    precipitation: number;
    windSpeedMax: number;
    windDirectionDominant?: number;
    sunrise: string;
    sunset: string;
    weatherCode: number;
  }>;
}

export interface RockTypeConditions {
  humidityThreshold: number;
  dryingHours: number;
  optimalTemp: { min: number; max: number };
}

// ---------------------------------------------------------------------------
// Rock type config
// ---------------------------------------------------------------------------

function getRockTypeConditions(rockType: RockType): RockTypeConditions {
  const conditions: Record<RockType, RockTypeConditions> = {
    granite: {
      optimalTemp: { min: 0, max: 15 },
      humidityThreshold: 65,
      dryingHours: 2,
    },
    sandstone: {
      optimalTemp: { min: 5, max: 20 },
      humidityThreshold: 50,
      dryingHours: 36,
    },
    limestone: {
      optimalTemp: { min: 10, max: 25 },
      humidityThreshold: 65,
      dryingHours: 4,
    },
    basalt: {
      optimalTemp: { min: 5, max: 18 },
      humidityThreshold: 70,
      dryingHours: 3,
    },
    gneiss: {
      optimalTemp: { min: 2, max: 18 },
      humidityThreshold: 60,
      dryingHours: 2,
    },
    quartzite: {
      optimalTemp: { min: 5, max: 20 },
      humidityThreshold: 60,
      dryingHours: 2,
    },
    unknown: {
      optimalTemp: { min: 5, max: 20 },
      humidityThreshold: 70,
      dryingHours: 12,
    },
  };
  return conditions[rockType] || conditions.unknown;
}

// ---------------------------------------------------------------------------
// Physics helpers
// ---------------------------------------------------------------------------

/**
 * Calculate dew point from temperature and humidity (Magnus formula)
 */
function calculateDewPoint(temp_c: number, humidity: number): number {
  const a = 17.27;
  const b = 237.7;
  const alpha = (a * temp_c) / (b + temp_c) + Math.log(humidity / 100);
  return (b * alpha) / (a - alpha);
}

/**
 * Estimate hours until rock is dry given current weather conditions.
 * Returns 0 if already dry.
 */
function estimateDryingHours(
  recentPrecipMm: number,
  rockType: RockType,
  temp_c: number,
  humidity: number,
  wind_kph: number
): number {
  if (!recentPrecipMm || recentPrecipMm <= 0.1) {
    return 0;
  }

  const rockConditions = getRockTypeConditions(rockType);
  let baseDrying = rockConditions.dryingHours;

  // Scale base drying by precipitation intensity
  if (recentPrecipMm < 2) {
    baseDrying *= 0.5;
  } else if (recentPrecipMm < 5) {
    baseDrying *= 0.7;
  } else if (recentPrecipMm >= 12) {
    baseDrying *= 1.3;
  }

  // Weather-based drying multiplier (higher = faster drying = fewer hours)
  let weatherFactor = 1.0;

  // Temperature factor
  if (temp_c >= 20) {
    weatherFactor *= 0.7;
  } else if (temp_c >= 15) {
    weatherFactor *= 0.85;
  } else if (temp_c < 5) {
    weatherFactor *= 1.4;
  }

  // Humidity factor
  if (humidity < 40) {
    weatherFactor *= 0.6;
  } else if (humidity < 60) {
    weatherFactor *= 0.85;
  } else if (humidity >= 75) {
    weatherFactor *= 1.5;
  }

  // Wind factor
  if (wind_kph >= 20) {
    weatherFactor *= 0.7;
  } else if (wind_kph >= 10) {
    weatherFactor *= 0.85;
  } else if (wind_kph < 5) {
    weatherFactor *= 1.15;
  }

  return Math.max(1, Math.round(baseDrying * weatherFactor));
}

// ---------------------------------------------------------------------------
// Precipitation context
// ---------------------------------------------------------------------------

export function calculatePrecipitationContext(
  hourly: Array<{
    time: string;
    precip_mm: number;
  }>
): PrecipitationContext {
  const now = new Date();

  let last24h = 0;
  let last48h = 0;
  let next24h = 0;

  hourly.forEach((hour) => {
    const hourTime = new Date(hour.time);
    const diffHours = (now.getTime() - hourTime.getTime()) / (1000 * 60 * 60);

    if (diffHours <= 24 && diffHours >= 0) {
      last24h += hour.precip_mm;
    }
    if (diffHours <= 48 && diffHours >= 0) {
      last48h += hour.precip_mm;
    }
    if (diffHours >= -24 && diffHours < 0) {
      next24h += hour.precip_mm;
    }
  });

  return {
    last24h: Math.round(last24h * 10) / 10,
    last48h: Math.round(last48h * 10) / 10,
    next24h: Math.round(next24h * 10) / 10,
  };
}

// ---------------------------------------------------------------------------
// Flag computation
// ---------------------------------------------------------------------------

/**
 * Compute weather flags for a single point in time.
 */
function computeFlags(
  weather: {
    temp_c: number;
    humidity: number;
    wind_kph: number;
    precip_mm: number;
  },
  rockType: RockType,
  precipContext: PrecipitationContext,
  dryingHoursRemaining: number,
  futureHourly: Array<{ time: string; precip_mm: number }>,
  now: Date
): WeatherFlags {
  const rockConditions = getRockTypeConditions(rockType);
  const dewPoint = calculateDewPoint(weather.temp_c, weather.humidity);
  const dewPointSpread = weather.temp_c - dewPoint;

  const rain_now = weather.precip_mm > 0;

  // Scan next 6 hours for rain
  let rain_expected: { in_hours: number; mm: number } | null = null;
  for (const fh of futureHourly) {
    const hourTime = new Date(fh.time);
    const hoursAhead = (hourTime.getTime() - now.getTime()) / (1000 * 60 * 60);
    if (hoursAhead > 0 && hoursAhead <= 6 && fh.precip_mm > 0) {
      rain_expected = {
        in_hours: Math.round(hoursAhead),
        mm: Math.round(fh.precip_mm * 10) / 10,
      };
      break;
    }
  }

  const recent_rain = {
    last_24h_mm: precipContext.last24h,
    last_48h_mm: precipContext.last48h,
  };

  const condensation_risk = dewPointSpread < 3;
  // Humidity % alone is misleading — a large dew point spread means the air
  // is far from saturation and moisture on rock is unlikely.  Only flag when
  // humidity exceeds the rock-type threshold AND dew point spread confirms
  // moisture is a real concern (< 5 °C).
  const high_humidity =
    weather.humidity > rockConditions.humidityThreshold && dewPointSpread < 5;
  const wet_rock_likely = precipContext.last48h > 1 && dryingHoursRemaining > 0;

  let estimated_dry_by: string | null = null;
  if (wet_rock_likely || rain_now) {
    const dryByDate = new Date(now.getTime() + dryingHoursRemaining * 3600000);
    estimated_dry_by = dryByDate.toISOString();
  }

  const sandstone_wet_warning =
    rockType === "sandstone" && (rain_now || wet_rock_likely);
  const extreme_wind = weather.wind_kph > 40;
  const high_wind = weather.wind_kph > 25;

  return {
    rain_now,
    rain_expected,
    recent_rain,
    condensation_risk,
    high_humidity,
    wet_rock_likely,
    estimated_dry_by,
    sandstone_wet_warning,
    extreme_wind,
    high_wind,
  };
}

// ---------------------------------------------------------------------------
// Label derivation
// ---------------------------------------------------------------------------

function deriveLabel(flags: WeatherFlags): WeatherLabel {
  if (flags.rain_now || flags.extreme_wind || flags.sandstone_wet_warning) {
    return "stay_home";
  }

  if (
    flags.rain_expected !== null ||
    flags.condensation_risk ||
    flags.high_humidity ||
    flags.wet_rock_likely ||
    flags.high_wind
  ) {
    return "watch_out";
  }

  return "looks_good";
}

// ---------------------------------------------------------------------------
// Summary generation
// ---------------------------------------------------------------------------

export interface SummaryTemplate {
  key: string;
  params?: Record<string, string | number>;
  fallback: string; // English fallback
}

function generateSummary(
  flags: WeatherFlags,
  weather: { temp_c: number; humidity: number; wind_kph: number; precip_mm: number }
): SummaryTemplate {
  const humidity = Math.round(weather.humidity);
  const wind = Math.round(weather.wind_kph);

  if (flags.sandstone_wet_warning) {
    return { key: "summary.sandstoneWet", fallback: "Sandstone is wet. Do not climb — wet sandstone is fragile." };
  }

  if (flags.rain_now) {
    return { key: "summary.rainingNow", params: { mm: weather.precip_mm }, fallback: `Rain. ${weather.precip_mm}mm precipitation.` };
  }

  if (flags.wet_rock_likely && flags.estimated_dry_by) {
    const dryBy = new Date(flags.estimated_dry_by);
    const h = dryBy.getHours();
    const m = String(dryBy.getMinutes()).padStart(2, "0");
    return { key: "summary.wetRockDryBy", params: { time: `${h}:${m}` }, fallback: `Recent rain. Estimated dry by ${h}:${m}.` };
  }

  if (flags.rain_expected) {
    return { key: "summary.rainExpected", params: { hours: flags.rain_expected.in_hours }, fallback: `Rain expected in ${flags.rain_expected.in_hours}h.` };
  }

  if (flags.condensation_risk) {
    return { key: "summary.condensationRisk", params: { humidity }, fallback: `Condensation risk. ${humidity}% humidity.` };
  }

  if (flags.extreme_wind) {
    return { key: "summary.extremeWind", params: { wind }, fallback: `Extreme wind (${wind} km/h).` };
  }

  if (flags.high_wind) {
    return { key: "summary.highWind", params: { wind }, fallback: `Wind ${wind} km/h.` };
  }

  if (flags.high_humidity) {
    return { key: "summary.highHumidity", params: { humidity }, fallback: `${humidity}% humidity.` };
  }

  // No flags — just weather facts
  return { key: "summary.dryAndGood", params: { humidity }, fallback: `Dry. ${humidity}% humidity.` };
}

// ---------------------------------------------------------------------------
// Build warnings list
// ---------------------------------------------------------------------------

function buildWarnings(flags: WeatherFlags): string[] {
  const warnings: string[] = [];

  if (flags.sandstone_wet_warning) {
    warnings.push(
      "Sandstone is wet — please let it dry to preserve the rock"
    );
  }
  if (flags.rain_now) {
    warnings.push("Currently raining");
  }
  if (flags.wet_rock_likely && flags.estimated_dry_by) {
    const dryBy = new Date(flags.estimated_dry_by);
    const hours = dryBy.getHours();
    const minutes = String(dryBy.getMinutes()).padStart(2, "0");
    warnings.push(`Rock may still be wet — estimated dry by ${hours}:${minutes}`);
  }
  if (flags.rain_expected) {
    warnings.push(
      `Rain expected in ${flags.rain_expected.in_hours}h (${flags.rain_expected.mm}mm)`
    );
  }
  if (flags.condensation_risk) {
    warnings.push("High condensation risk — rock may be damp");
  }
  if (flags.high_humidity) {
    warnings.push("Humidity above threshold for this rock type");
  }
  if (flags.extreme_wind) {
    warnings.push("Extreme wind — unsafe for exposed routes");
  } else if (flags.high_wind) {
    warnings.push("High wind — consider sheltered areas");
  }

  return warnings;
}

// ---------------------------------------------------------------------------
// Dry windows
// ---------------------------------------------------------------------------

export function findDryWindows(hourlyConditions: HourlyWeather[]): DryWindow[] {
  const windows: DryWindow[] = [];
  let windowStart: number | null = null;

  const isGoodHour = (h: HourlyWeather): boolean =>
    !h.flags.rain_now &&
    !h.flags.condensation_risk &&
    !h.flags.wet_rock_likely;

  const pushWindow = (startIdx: number, endIdx: number) => {
    const count = endIdx - startIdx;
    if (count >= 2) {
      const lastHourTime = new Date(hourlyConditions[endIdx - 1].time);
      const endDate = new Date(lastHourTime.getTime() + 3600000);
      windows.push({
        start: hourlyConditions[startIdx].time,
        end: endDate.toISOString(),
        hours: count,
      });
    }
  };

  for (let i = 0; i < hourlyConditions.length; i++) {
    if (isGoodHour(hourlyConditions[i])) {
      if (windowStart === null) {
        windowStart = i;
      } else {
        // Split at midnight
        const prevDate = new Date(hourlyConditions[i - 1].time);
        const currDate = new Date(hourlyConditions[i].time);
        if (prevDate.getDate() !== currDate.getDate()) {
          pushWindow(windowStart, i);
          windowStart = i;
        }
      }
    } else {
      if (windowStart !== null) {
        pushWindow(windowStart, i);
        windowStart = null;
      }
    }
  }

  // Close trailing window
  if (windowStart !== null) {
    pushWindow(windowStart, hourlyConditions.length);
  }

  return windows;
}

// ---------------------------------------------------------------------------
// Hourly conditions
// ---------------------------------------------------------------------------

export function computeHourlyConditions(
  hourly: Array<{
    time: string;
    temp_c: number;
    humidity: number;
    wind_kph: number;
    wind_direction?: number;
    precip_mm: number;
    weatherCode?: number;
  }>,
  rockType: RockType = "unknown",
  recentPrecipMm: number = 0,
  options?: {
    includeNightHours?: boolean;
    latitude?: number;
    longitude?: number;
    maxDailyTemp?: number;
  }
): HourlyWeather[] {
  const now = new Date();
  const precipContext = calculatePrecipitationContext(hourly);
  const dryingHrs = estimateDryingHours(
    recentPrecipMm,
    rockType,
    hourly[0]?.temp_c ?? 15,
    hourly[0]?.humidity ?? 50,
    hourly[0]?.wind_kph ?? 5
  );

  const allConditions: HourlyWeather[] = hourly.map((hour, idx) => {
    const dewPoint = calculateDewPoint(hour.temp_c, hour.humidity);
    const dewPointSpread =
      Math.round((hour.temp_c - dewPoint) * 10) / 10;

    // For per-hour drying estimate, adjust based on hours elapsed since now
    const hourTime = new Date(hour.time);
    const hoursFromNow =
      (hourTime.getTime() - now.getTime()) / (1000 * 60 * 60);
    const hourDryingRemaining = Math.max(0, dryingHrs - Math.max(0, hoursFromNow));

    // Build per-hour precip context (accumulated from past hours in the data)
    const hourPrecipContext: PrecipitationContext = {
      last24h: precipContext.last24h,
      last48h: precipContext.last48h,
      next24h: precipContext.next24h,
    };

    // Future hourly data for rain_expected scanning
    const futureHours = hourly.slice(idx + 1);

    const flags = computeFlags(
      {
        temp_c: hour.temp_c,
        humidity: hour.humidity,
        wind_kph: hour.wind_kph,
        precip_mm: hour.precip_mm,
      },
      rockType,
      hourPrecipContext,
      hourDryingRemaining,
      futureHours,
      hourTime
    );

    return {
      time: hour.time,
      temp_c: hour.temp_c,
      humidity: hour.humidity,
      dew_point_spread: dewPointSpread,
      wind_kph: hour.wind_kph,
      wind_direction: hour.wind_direction,
      precip_mm: hour.precip_mm,
      weather_code: hour.weatherCode,
      flags,
    };
  });

  // If requested to include all hours or no location data, return everything
  if (options?.includeNightHours || !options?.latitude || !options?.longitude) {
    return allConditions;
  }

  // Get daylight hours for the location
  const daylight = calculateDaylightHours(
    options.latitude,
    options.longitude,
    now
  );
  const context = detectTimeContext(
    options.maxDailyTemp || 20,
    options.latitude,
    now.getMonth()
  );
  const climbingHours = getClimbingHours(daylight, context, options.maxDailyTemp);

  // Filter to climbing hours only
  const filtered = allConditions.filter((hour) => {
    const hourTime = new Date(hour.time);
    const hourOfDay = hourTime.getHours();

    // Always include the next 3 hours for "current conditions"
    const hoursFromNow =
      (hourTime.getTime() - now.getTime()) / (1000 * 60 * 60);
    if (hoursFromNow >= 0 && hoursFromNow <= 3) {
      return true;
    }

    return hourOfDay >= climbingHours.start && hourOfDay <= climbingHours.end;
  });

  if (filtered.length === 0 && allConditions.length > 0) {
    return allConditions.slice(0, Math.min(12, allConditions.length));
  }

  return filtered;
}

// ---------------------------------------------------------------------------
// Daily aggregation helper
// ---------------------------------------------------------------------------

function buildDailyFromHourly(
  hourly: Array<{
    time: string;
    temp_c: number;
    humidity: number;
    wind_kph: number;
    precip_mm: number;
    weatherCode?: number;
  }>,
  latitude?: number,
  longitude?: number
): Array<{
  date: string;
  temp_max_c: number;
  temp_min_c: number;
  precipitation_mm: number;
  wind_speed_max_kph: number;
  weather_code: number;
  sunrise: string;
  sunset: string;
}> {
  // Group by date
  const byDate = new Map<
    string,
    Array<{
      temp_c: number;
      wind_kph: number;
      precip_mm: number;
      weatherCode?: number;
    }>
  >();

  for (const h of hourly) {
    const date = h.time.substring(0, 10); // YYYY-MM-DD
    if (!byDate.has(date)) {
      byDate.set(date, []);
    }
    byDate.get(date)!.push(h);
  }

  const result: Array<{
    date: string;
    temp_max_c: number;
    temp_min_c: number;
    precipitation_mm: number;
    wind_speed_max_kph: number;
    weather_code: number;
    sunrise: string;
    sunset: string;
  }> = [];

  for (const [date, hours] of Array.from(byDate.entries())) {
    const temps = hours.map((h) => h.temp_c);
    const winds = hours.map((h) => h.wind_kph);
    const precip = hours.reduce((sum, h) => sum + h.precip_mm, 0);
    // Pick the first non-zero weather code for the day, or 0
    const codes = hours
      .map((h) => h.weatherCode ?? 0)
      .filter((c) => c > 0);
    const weatherCode = codes.length > 0 ? codes[0] : 0;

    let sunrise = `${date}T06:00:00`;
    let sunset = `${date}T20:00:00`;

    if (latitude && longitude) {
      const daylight = calculateDaylightHours(
        latitude,
        longitude,
        new Date(date)
      );
      sunrise = daylight.sunrise;
      sunset = daylight.sunset;
    }

    result.push({
      date,
      temp_max_c: Math.round(Math.max(...temps) * 10) / 10,
      temp_min_c: Math.round(Math.min(...temps) * 10) / 10,
      precipitation_mm: Math.round(precip * 10) / 10,
      wind_speed_max_kph: Math.round(Math.max(...winds) * 10) / 10,
      weather_code: weatherCode,
      sunrise,
      sunset,
    });
  }

  return result;
}

// ---------------------------------------------------------------------------
// Main entry point
// ---------------------------------------------------------------------------

export async function computeWeather(
  weather: WeatherForecast & {
    latitude?: number;
    longitude?: number;
    maxDailyTemp?: number;
  },
  rockType: RockType = "unknown",
  recentPrecipitationMm: number = 0,
  options?: { includeNightHours?: boolean }
): Promise<WeatherResponse> {
  const { current, hourly } = weather;
  const now = new Date();

  // Precipitation context
  const precipContext = hourly
    ? calculatePrecipitationContext(hourly)
    : { last24h: 0, last48h: 0, next24h: 0 };

  // Use computed precip context when no explicit recent precip is provided
  const effectivePrecipMm = recentPrecipitationMm > 0
    ? recentPrecipitationMm
    : precipContext.last48h;

  // Drying estimate
  const dryingHrs = estimateDryingHours(
    effectivePrecipMm,
    rockType,
    current.temp_c,
    current.humidity,
    current.wind_kph
  );

  // Current dew point spread
  const dewPoint = calculateDewPoint(current.temp_c, current.humidity);
  const dewPointSpread = Math.round((current.temp_c - dewPoint) * 10) / 10;

  // Compute hourly conditions
  let hourlyConditions: HourlyWeather[] = [];
  if (hourly && hourly.length > 0) {
    hourlyConditions = computeHourlyConditions(hourly, rockType, effectivePrecipMm, {
      includeNightHours: options?.includeNightHours ?? true,
      latitude: weather.latitude,
      longitude: weather.longitude,
      maxDailyTemp: weather.maxDailyTemp,
    });
  }

  // Aggregate flags for current conditions
  const currentFlags = computeFlags(
    {
      temp_c: current.temp_c,
      humidity: current.humidity,
      wind_kph: current.wind_kph,
      precip_mm: current.precip_mm,
    },
    rockType,
    precipContext,
    dryingHrs,
    hourly ?? [],
    now
  );

  // Label & summary
  const label = deriveLabel(currentFlags);
  const summaryTemplate = generateSummary(currentFlags, current);
  const warnings = buildWarnings(currentFlags);

  // Dry windows
  const dryWindows = hourlyConditions.length > 0
    ? findDryWindows(hourlyConditions)
    : [];

  // Use Open-Meteo daily data when available (has correct local-time sunrise/sunset)
  // Fall back to building from hourly data
  const daily = weather.daily
    ? weather.daily.map((d) => ({
        date: d.date,
        temp_max_c: d.tempMax,
        temp_min_c: d.tempMin,
        precipitation_mm: d.precipitation,
        wind_speed_max_kph: d.windSpeedMax,
        weather_code: d.weatherCode,
        sunrise: d.sunrise,
        sunset: d.sunset,
      }))
    : hourly
      ? buildDailyFromHourly(hourly, weather.latitude, weather.longitude)
      : [];

  return {
    weather: {
      now: {
        temp_c: current.temp_c,
        humidity: current.humidity,
        dew_point_spread: dewPointSpread,
        wind_kph: current.wind_kph,
        wind_direction: current.wind_direction,
        precip_mm: current.precip_mm,
      },
      hourly: hourlyConditions,
      daily,
    },
    flags: currentFlags,
    label,
    summary: summaryTemplate.fallback,
    summary_template: summaryTemplate,
    dry_windows: dryWindows,
    precipitation: precipContext,
    warnings,
    updated_at: now.toISOString(),
  };
}

