/**
 * Climbing Conditions Service
 * Adapted from ClimbingPartnerAI weather.service.ts
 * Calculates friction ratings based on weather data
 */

import {
  calculateDaylightHours,
  detectTimeContext,
  getTimeContextData,
  getClimbingHours,
} from "./daylight.utils";

export type RockType =
  | "granite"
  | "sandstone"
  | "limestone"
  | "basalt"
  | "gneiss"
  | "quartzite"
  | "unknown";

export interface RockTypeConditions {
  optimalTemp: { min: number; max: number };
  optimalHumidity: { min: number; max: number };
  maxHumidity: number;
  dryingHours: number;
}

export interface HourlyCondition {
  time: string;
  temp_c: number;
  humidity: number;
  wind_kph: number;
  precip_mm: number;
  isOptimal: boolean;
  frictionScore: number;
  rating: "Nope" | "Poor" | "Fair" | "Good" | "Great";
  isDry: boolean;
  warnings: string[];
  weatherCode?: number;
}

export interface OptimalWindow {
  startTime: string;
  endTime: string;
  avgFrictionScore: number;
  rating: "Nope" | "Poor" | "Fair" | "Good" | "Great";
  hourCount: number;
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

export interface ConditionsResult {
  frictionRating: number; // 1-5 scale
  rating: "Nope" | "Poor" | "Fair" | "Good" | "Great"; // Human-readable
  reasons: string[];
  dryingTimeHours?: number;
  isDry: boolean;
  optimalWindows?: OptimalWindow[];
  warnings: string[];
  hourlyConditions?: HourlyCondition[];
  precipitationContext?: PrecipitationContext;
  dewPointSpread?: number;
  optimalTime?: string;
  timeContext?: TimeContext;
}

export interface WeatherForecast {
  current: {
    temp_c: number;
    humidity: number;
    wind_kph: number;
    precip_mm: number;
  };
  hourly?: Array<{
    time: string;
    temp_c: number;
    humidity: number;
    wind_kph: number;
    precip_mm: number;
    weatherCode?: number;
  }>;
}

/**
 * Get rock-specific optimal conditions
 */
function getRockTypeConditions(rockType: RockType): RockTypeConditions {
  const conditions: Record<RockType, RockTypeConditions> = {
    granite: {
      optimalTemp: { min: 0, max: 15 },
      optimalHumidity: { min: 20, max: 50 },
      maxHumidity: 65,
      dryingHours: 2, // Fast drying, impermeable
    },
    sandstone: {
      optimalTemp: { min: 5, max: 20 },
      optimalHumidity: { min: 30, max: 45 },
      maxHumidity: 50,
      dryingHours: 36, // Very porous, slow drying
    },
    limestone: {
      optimalTemp: { min: 10, max: 25 },
      optimalHumidity: { min: 45, max: 70 },
      maxHumidity: 80,
      dryingHours: 4,
    },
    basalt: {
      optimalTemp: { min: 5, max: 18 },
      optimalHumidity: { min: 30, max: 60 },
      maxHumidity: 70,
      dryingHours: 3,
    },
    gneiss: {
      optimalTemp: { min: 2, max: 18 },
      optimalHumidity: { min: 20, max: 50 },
      maxHumidity: 60,
      dryingHours: 2,
    },
    quartzite: {
      optimalTemp: { min: 5, max: 20 },
      optimalHumidity: { min: 25, max: 50 },
      maxHumidity: 60,
      dryingHours: 2,
    },
    unknown: {
      optimalTemp: { min: 5, max: 20 },
      optimalHumidity: { min: 30, max: 60 },
      maxHumidity: 70,
      dryingHours: 12,
    },
  };
  return conditions[rockType] || conditions.unknown;
}

/**
 * Calculate weather-aware wetness penalty based on drying conditions
 */
function calculateWeatherAwareDryingPenalty(
  recentPrecipMm: number,
  rockType: RockType,
  temp_c: number,
  humidity: number,
  wind_kph: number,
  dryingMultiplier: number = 1
): number {
  if (!recentPrecipMm || recentPrecipMm <= 0.1) {
    return 0;
  }

  // Base penalty from precipitation amount
  let penalty = 0;
  if (recentPrecipMm >= 12) {
    penalty = 1.2;
  } else if (recentPrecipMm >= 6) {
    penalty = 0.9;
  } else if (recentPrecipMm >= 3) {
    penalty = 0.6;
  } else if (recentPrecipMm >= 1.5) {
    penalty = 0.4;
  } else {
    penalty = 0.25;
  }

  // Adjust for rock type
  if (rockType === "sandstone") {
    penalty *= 1.25; // Stays wet longer
  } else if (rockType === "granite" || rockType === "gneiss") {
    penalty *= 0.9; // Dries faster
  }

  // Weather-based drying multiplier
  let weatherDrying = 1.0;

  // Temperature factor (warmer = faster drying)
  if (temp_c >= 20 && temp_c <= 25) {
    weatherDrying *= 1.3;
  } else if (temp_c >= 15 && temp_c < 20) {
    weatherDrying *= 1.15;
  } else if (temp_c >= 10 && temp_c < 15) {
    weatherDrying *= 1.0;
  } else if (temp_c < 10) {
    weatherDrying *= 0.7;
  }

  // Humidity factor (lower = faster drying)
  if (humidity < 40) {
    weatherDrying *= 1.4;
  } else if (humidity < 60) {
    weatherDrying *= 1.0;
  } else if (humidity < 75) {
    weatherDrying *= 0.7;
  } else {
    weatherDrying *= 0.4;
  }

  // Wind factor (higher wind = faster drying)
  if (wind_kph >= 20) {
    weatherDrying *= 1.3;
  } else if (wind_kph >= 10) {
    weatherDrying *= 1.15;
  } else if (wind_kph >= 5) {
    weatherDrying *= 1.05;
  } else {
    weatherDrying *= 0.9;
  }

  penalty *= weatherDrying * dryingMultiplier;
  return Math.min(2, penalty);
}

/**
 * Compute climbing conditions from weather data (enhanced version)
 *
 * This function is cached using Next.js Cache Components.
 * Cache duration: 1 hour (conditions change hourly)
 * Cache key includes: location, rock type, precipitation, night hours filter, and current hour
 */
export async function computeConditions(
  weather: WeatherForecast & { latitude?: number; longitude?: number; maxDailyTemp?: number },
  rockType: RockType = "unknown",
  recentPrecipitationMm: number = 0,
  options?: {
    includeNightHours?: boolean;
  }
): Promise<ConditionsResult> {
  const { current, hourly } = weather;
  const rockConditions = getRockTypeConditions(rockType);
  const { optimalTemp, optimalHumidity, maxHumidity } = rockConditions;

  // Start with neutral friction rating
  let frictionScore = 3;
  const reasons: string[] = [];
  const warnings: string[] = [];
  let dryingTimeHours: number | undefined;

  // Compute hourly conditions if available
  let hourlyConditions: HourlyCondition[] | undefined;
  let optimalWindows: OptimalWindow[] | undefined;
  let precipitationContext: PrecipitationContext | undefined;
  let optimalTime: string | undefined;

  if (hourly && hourly.length > 0) {
    hourlyConditions = computeHourlyConditions(hourly, rockType, recentPrecipitationMm, {
      includeNightHours: options?.includeNightHours ?? true, // Default to including all 24 hours
      latitude: weather.latitude,
      longitude: weather.longitude,
      maxDailyTemp: weather.maxDailyTemp,
    });
    optimalWindows = findOptimalWindowsEnhanced(hourlyConditions);
    precipitationContext = calculatePrecipitationContext(hourly);

    // Find optimal time (best friction score in next 48h)
    const bestHour = hourlyConditions.reduce(
      (best, hour) => (hour.frictionScore > best.frictionScore ? hour : best),
      hourlyConditions[0]
    );
    if (bestHour && bestHour.frictionScore >= 4) {
      optimalTime = bestHour.time;
    }
  }

  // Calculate dew point spread (condensation risk)
  const dewPoint = calculateDewPoint(current.temp_c, current.humidity);
  const dewPointSpread = Math.round((current.temp_c - dewPoint) * 10) / 10;

  // === TEMPERATURE ASSESSMENT ===
  const inOptimalTemp = current.temp_c >= optimalTemp.min && current.temp_c <= optimalTemp.max;
  const tooHot = current.temp_c > optimalTemp.max;
  const tooCold = current.temp_c < optimalTemp.min;

  if (inOptimalTemp) {
    frictionScore += 1.5;
    reasons.push(`Perfect temperature (${Math.round(current.temp_c)}°C)`);
  } else if (tooHot) {
    frictionScore -= 1.5;
    warnings.push(`Too warm for ${rockType} (${Math.round(current.temp_c)}°C)`);
    reasons.push("Temperature too high - fingers may slip");
  } else if (tooCold) {
    // Cold is generally good for friction on all rock types
    frictionScore += 1;
    reasons.push(`Cold but good for ${rockType} friction`);
  }

  // === DEW POINT SPREAD ASSESSMENT (condensation risk) ===
  // Dew point spread is more reliable than relative humidity for friction
  // Low spread = risk of condensation on rock surface = poor friction
  if (dewPointSpread <= 1) {
    // Very high risk of condensation - rock surface will be damp
    frictionScore -= 2;
    warnings.push(
      `Very high condensation risk (dew point spread ${dewPointSpread}°C) - rock surface likely damp`
    );
  } else if (dewPointSpread <= 2) {
    // High risk of condensation
    frictionScore -= 1.5;
    warnings.push(`High condensation risk (dew point spread ${dewPointSpread}°C)`);
  } else if (dewPointSpread <= 3) {
    // Moderate risk
    frictionScore -= 0.8;
    warnings.push(`Moderate condensation risk (dew point spread ${dewPointSpread}°C)`);
  } else if (dewPointSpread > 5) {
    // Good conditions - no condensation risk
    frictionScore += 0.5;
    reasons.push(`Low condensation risk (dew point spread ${dewPointSpread}°C)`);
  }

  // === HUMIDITY ASSESSMENT ===
  // Still consider relative humidity but with less weight since dew point is more accurate
  const inOptimalHumidity =
    current.humidity >= optimalHumidity.min && current.humidity <= optimalHumidity.max;
  const highHumidity = current.humidity > maxHumidity;
  const lowHumidity = current.humidity < optimalHumidity.min;

  if (inOptimalHumidity) {
    frictionScore += 0.5; // Reduced from 1.0 since dew point is more important
    reasons.push(`Good humidity (${Math.round(current.humidity)}%)`);
  } else if (highHumidity && dewPointSpread > 3) {
    // Only penalize high humidity if there's no condensation risk (already penalized above)
    frictionScore -= 0.5; // Reduced from 1.5 since dew point handles condensation
    warnings.push(`High humidity (${Math.round(current.humidity)}%)`);
  } else if (lowHumidity && (rockType === "granite" || rockType === "gneiss")) {
    frictionScore += 0.3;
    reasons.push("Low humidity aids friction");
  }

  // === WETNESS & DRYING ===
  const isCurrentlyWet = current.precip_mm > 0;
  const hasRecentPrecip = recentPrecipitationMm >= 1;
  const baseDryingHours = rockConditions.dryingHours;

  if (isCurrentlyWet) {
    frictionScore = Math.min(frictionScore, 1.5);
    dryingTimeHours = baseDryingHours;
    if (rockType === "sandstone") {
      warnings.push("Rock is currently wet - dangerous to climb (sandstone becomes weak when wet)");
    } else {
      warnings.push("Rock is currently wet - slippery conditions");
    }
  } else if (hasRecentPrecip) {
    const penalty = calculateWeatherAwareDryingPenalty(
      recentPrecipitationMm,
      rockType,
      current.temp_c,
      current.humidity,
      current.wind_kph
    );
    frictionScore -= penalty;

    const dryingFactor = current.temp_c >= 15 && current.humidity < 50 ? 0.8 : 1.2;
    dryingTimeHours = baseDryingHours * dryingFactor;

    warnings.push(
      `Recent precipitation (${recentPrecipitationMm.toFixed(1)}mm) - will dry in ~${Math.round(dryingTimeHours)}h`
    );
  }

  // === WIND ASSESSMENT ===
  if (current.wind_kph > 40) {
    frictionScore -= 0.5;
    warnings.push(`Very high winds (${Math.round(current.wind_kph)} km/h) - danger of blown off`);
  } else if (current.wind_kph > 25) {
    frictionScore -= 0.3;
    warnings.push(`High wind (${Math.round(current.wind_kph)} km/h)`);
  }

  // === CLAMP SCORE ===
  frictionScore = Math.max(1, Math.min(5, frictionScore));

  // === CONVERT TO RATING ===
  let rating: "Nope" | "Poor" | "Fair" | "Good" | "Great";
  if (frictionScore >= 4.5) {
    rating = "Great";
  } else if (frictionScore >= 3.5) {
    rating = "Good";
  } else if (frictionScore >= 2.5) {
    rating = "Fair";
  } else if (frictionScore >= 1.5) {
    rating = "Poor";
  } else {
    rating = "Nope";
  }

  // === BUILD RESPONSE ===
  const isDry = !isCurrentlyWet && !hasRecentPrecip;

  if (!isDry && dryingTimeHours) {
    reasons.push(`Will be ready to climb in ~${Math.round(dryingTimeHours)} hours`);
  }

  // Don't add a generic fallback - let warnings speak for themselves
  // The UI will show the rating and friction score

  // Calculate time context if location is provided
  let timeContext: TimeContext | undefined;
  if (weather.latitude && weather.longitude) {
    const now = new Date();
    const daylight = calculateDaylightHours(weather.latitude, weather.longitude, now);
    const context = detectTimeContext(
      weather.maxDailyTemp || current.temp_c,
      weather.latitude,
      now.getMonth()
    );

    timeContext = getTimeContextData(daylight, context);
  }

  return {
    frictionRating: Math.round(frictionScore),
    rating,
    reasons,
    dryingTimeHours: dryingTimeHours ? Math.round(dryingTimeHours) : undefined,
    isDry,
    warnings,
    hourlyConditions,
    optimalWindows,
    precipitationContext,
    dewPointSpread,
    optimalTime,
    timeContext,
  };
}

/**
 * Calculate dew point from temperature and humidity
 */
function calculateDewPoint(temp_c: number, humidity: number): number {
  const a = 17.27;
  const b = 237.7;
  const alpha = (a * temp_c) / (b + temp_c) + Math.log(humidity / 100);
  return (b * alpha) / (a - alpha);
}

/**
 * Compute friction score for a single hour
 */
function computeHourlyFrictionScore(
  hour: {
    temp_c: number;
    humidity: number;
    wind_kph: number;
    precip_mm: number;
  },
  rockType: RockType,
  recentPrecipMm: number = 0
): { score: number; warnings: string[]; isDry: boolean } {
  const rockConditions = getRockTypeConditions(rockType);
  const { optimalTemp, optimalHumidity, maxHumidity } = rockConditions;

  let score = 3;
  const warnings: string[] = [];

  // Temperature assessment
  if (hour.temp_c >= optimalTemp.min && hour.temp_c <= optimalTemp.max) {
    score += 1.5;
  } else if (hour.temp_c > optimalTemp.max) {
    score -= 1.5;
    warnings.push(`Too warm (${Math.round(hour.temp_c)}°C)`);
  } else if (hour.temp_c < optimalTemp.min) {
    // Cold is generally good for friction on all rock types
    score += 1;
  }

  // Dew point spread assessment (more accurate than raw humidity)
  const dewPoint = calculateDewPoint(hour.temp_c, hour.humidity);
  const dewPointSpread = Math.round((hour.temp_c - dewPoint) * 10) / 10;

  if (dewPointSpread <= 1) {
    score -= 2;
    warnings.push(`Condensation risk (${dewPointSpread}°C)`);
  } else if (dewPointSpread <= 2) {
    score -= 1.5;
    warnings.push(`High condensation risk`);
  } else if (dewPointSpread <= 3) {
    score -= 0.8;
  } else if (dewPointSpread > 5) {
    score += 0.5;
  }

  // Humidity assessment (with reduced weight)
  if (hour.humidity >= optimalHumidity.min && hour.humidity <= optimalHumidity.max) {
    score += 0.5; // Reduced from 1.0
  } else if (hour.humidity > maxHumidity && dewPointSpread > 3) {
    score -= 0.5; // Reduced from 1.5, only if no condensation risk
    warnings.push(`High humidity (${Math.round(hour.humidity)}%)`);
  } else if (
    hour.humidity < optimalHumidity.min &&
    (rockType === "granite" || rockType === "gneiss")
  ) {
    score += 0.3; // Reduced from 0.5
  }

  // Wetness assessment
  const isCurrentlyWet = hour.precip_mm > 0;
  const hasRecentPrecip = recentPrecipMm >= 1;

  if (isCurrentlyWet) {
    score = Math.min(score, 1.5);
    if (rockType === "sandstone") {
      warnings.push("Currently wet - dangerous");
    } else {
      warnings.push("Currently wet");
    }
  } else if (hasRecentPrecip) {
    const penalty = calculateWeatherAwareDryingPenalty(
      recentPrecipMm,
      rockType,
      hour.temp_c,
      hour.humidity,
      hour.wind_kph
    );
    score -= penalty;
  }

  // Wind assessment
  if (hour.wind_kph > 40) {
    score -= 0.5;
    warnings.push(`Very high winds (${Math.round(hour.wind_kph)} km/h)`);
  } else if (hour.wind_kph > 25) {
    score -= 0.3;
    warnings.push(`High wind (${Math.round(hour.wind_kph)} km/h)`);
  }

  score = Math.max(1, Math.min(5, score));
  const isDry = !isCurrentlyWet && !hasRecentPrecip;

  return { score, warnings, isDry };
}

/**
 * Convert friction score to rating
 */
function scoreToRating(score: number): "Nope" | "Poor" | "Fair" | "Good" | "Great" {
  if (score >= 4.5) return "Great";
  if (score >= 3.5) return "Good";
  if (score >= 2.5) return "Fair";
  if (score >= 1.5) return "Poor";
  return "Nope";
}

/**
 * Compute hourly conditions for next 48 hours
 */
export function computeHourlyConditions(
  hourly: Array<{
    time: string;
    temp_c: number;
    humidity: number;
    wind_kph: number;
    precip_mm: number;
    weatherCode?: number;
  }>,
  rockType: RockType = "unknown",
  recentPrecipMm: number = 0,
  options?: {
    includeNightHours?: boolean; // Default false - filter to climbing hours
    latitude?: number; // For daylight calculation
    longitude?: number; // For daylight calculation
    maxDailyTemp?: number; // For context detection (alpine starts, etc)
  }
): HourlyCondition[] {
  const allConditions = hourly.map((hour) => {
    const { score, warnings, isDry } = computeHourlyFrictionScore(hour, rockType, recentPrecipMm);

    return {
      time: hour.time,
      temp_c: hour.temp_c,
      humidity: hour.humidity,
      wind_kph: hour.wind_kph,
      precip_mm: hour.precip_mm,
      frictionScore: Math.round(score),
      rating: scoreToRating(score),
      isOptimal: score >= 4,
      isDry,
      warnings,
      weatherCode: hour.weatherCode,
    };
  });

  // If requested to include all hours or no location data, return everything
  if (options?.includeNightHours || !options?.latitude || !options?.longitude) {
    return allConditions;
  }

  // Get daylight hours for the location
  const now = new Date();
  const daylight = calculateDaylightHours(options.latitude, options.longitude, now);

  // Detect context (alpine start, winter, etc)
  const context = detectTimeContext(
    options.maxDailyTemp || 20,
    options.latitude,
    now.getMonth(),
    undefined // No query string here, but could be passed in future
  );

  const climbingHours = getClimbingHours(daylight, context, options.maxDailyTemp);

  // Filter to climbing hours only
  const filtered = allConditions.filter((hour) => {
    const hourTime = new Date(hour.time);
    const hourOfDay = hourTime.getHours();

    // Always include the next 3 hours (even if night) for "current conditions"
    const hoursFromNow = (hourTime.getTime() - now.getTime()) / (1000 * 60 * 60);
    if (hoursFromNow >= 0 && hoursFromNow <= 3) {
      return true;
    }

    // Check if hour is within climbing hours
    return hourOfDay >= climbingHours.start && hourOfDay <= climbingHours.end;
  });

  // If filtering removed all hours (shouldn't happen), return at least next 12 hours
  if (filtered.length === 0 && allConditions.length > 0) {
    return allConditions.slice(0, Math.min(12, allConditions.length));
  }

  return filtered;
}

/**
 * Calculate precipitation context from hourly data
 */
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

/**
 * Analyze hourly forecast for optimal climbing windows (enhanced version)
 */
export function findOptimalWindowsEnhanced(hourlyConditions: HourlyCondition[]): OptimalWindow[] {
  type WindowInProgress = { start: number; hours: HourlyCondition[] };

  const windows: OptimalWindow[] = [];
  let currentWindow: WindowInProgress | null = null;

  const closeWindow = (window: WindowInProgress) => {
    if (window.hours.length >= 2) {
      const avgScore =
        window.hours.reduce((sum, h) => sum + h.frictionScore, 0) / window.hours.length;

      // Calculate end time by adding 1 hour to the last hour's time
      const lastHourTime = new Date(window.hours[window.hours.length - 1].time);
      lastHourTime.setHours(lastHourTime.getHours() + 1);

      windows.push({
        startTime: window.hours[0].time,
        endTime: lastHourTime.toISOString(),
        avgFrictionScore: Math.round(avgScore * 10) / 10,
        rating: scoreToRating(avgScore),
        hourCount: window.hours.length,
      });
    }
  };

  hourlyConditions.forEach((hour, index) => {
    if (hour.frictionScore >= 4) {
      // Check if we need to split window at midnight
      if (currentWindow && currentWindow.hours.length > 0) {
        const lastHourDate = new Date(currentWindow.hours[currentWindow.hours.length - 1].time);
        const currentHourDate = new Date(hour.time);

        // If day changed, close current window and start new one
        if (lastHourDate.getDate() !== currentHourDate.getDate()) {
          closeWindow(currentWindow);
          currentWindow = { start: index, hours: [hour] };
          return;
        }
      }

      // Good hour, add to current window or start new one
      if (!currentWindow) {
        currentWindow = { start: index, hours: [hour] };
      } else {
        currentWindow.hours.push(hour);
      }
    } else {
      // Bad hour, close current window if exists
      if (currentWindow) {
        closeWindow(currentWindow);
      }
      currentWindow = null;
    }
  });

  // Close last window if exists
  if (currentWindow) {
    closeWindow(currentWindow);
  }

  return windows;
}
