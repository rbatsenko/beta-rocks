/**
 * Climbing Conditions Service
 * Adapted from ClimbingPartnerAI weather.service.ts
 * Calculates friction ratings based on weather data
 */

export type RockType =
  | 'granite'
  | 'sandstone'
  | 'limestone'
  | 'basalt'
  | 'gneiss'
  | 'quartzite'
  | 'unknown';

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
}

export interface ConditionsResult {
  frictionRating: number; // 1-5 scale
  rating: 'Nope' | 'Meh' | 'OK' | 'Great'; // Human-readable
  reasons: string[];
  dryingTimeHours?: number;
  isDry: boolean;
  optimalWindows?: string[];
  warnings: string[];
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
  if (rockType === 'sandstone') {
    penalty *= 1.25; // Stays wet longer
  } else if (rockType === 'granite' || rockType === 'gneiss') {
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
 * Compute climbing conditions from weather data
 */
export function computeConditions(
  weather: WeatherForecast,
  rockType: RockType = 'unknown',
  recentPrecipitationMm: number = 0
): ConditionsResult {
  const { current } = weather;
  const rockConditions = getRockTypeConditions(rockType);
  const { optimalTemp, optimalHumidity, maxHumidity } = rockConditions;

  // Start with neutral friction rating
  let frictionScore = 3;
  const reasons: string[] = [];
  const warnings: string[] = [];
  let dryingTimeHours: number | undefined;

  // === TEMPERATURE ASSESSMENT ===
  const inOptimalTemp =
    current.temp_c >= optimalTemp.min && current.temp_c <= optimalTemp.max;
  const tooHot = current.temp_c > optimalTemp.max;
  const tooCold = current.temp_c < optimalTemp.min;

  if (inOptimalTemp) {
    frictionScore += 1.5;
    reasons.push(`Perfect temperature (${current.temp_c}°C)`);
  } else if (tooHot) {
    frictionScore -= 1.5;
    warnings.push(`Too warm for ${rockType} (${current.temp_c}°C)`);
    reasons.push('Temperature too high - fingers may slip');
  } else if (tooCold) {
    if (rockType === 'granite' || rockType === 'gneiss') {
      frictionScore += 1;
      reasons.push(`Cold but good for ${rockType} friction`);
    } else {
      frictionScore -= 0.5;
      warnings.push(`Cold and suboptimal for ${rockType}`);
    }
  }

  // === HUMIDITY ASSESSMENT ===
  const inOptimalHumidity =
    current.humidity >= optimalHumidity.min &&
    current.humidity <= optimalHumidity.max;
  const highHumidity = current.humidity > maxHumidity;
  const lowHumidity = current.humidity < optimalHumidity.min;

  if (inOptimalHumidity) {
    frictionScore += 1;
    reasons.push(`Ideal humidity (${current.humidity}%)`);
  } else if (highHumidity) {
    frictionScore -= 1.5;
    warnings.push(
      `High humidity (${current.humidity}%) - rock will be slippery`
    );
  } else if (lowHumidity && (rockType === 'granite' || rockType === 'gneiss')) {
    frictionScore += 0.5;
    reasons.push('Low humidity aids friction on granite');
  }

  // === WETNESS & DRYING ===
  const isCurrentlyWet = current.precip_mm > 0;
  const hasRecentPrecip = recentPrecipitationMm >= 1;
  const baseDryingHours = rockConditions.dryingHours;

  if (isCurrentlyWet) {
    frictionScore = Math.min(frictionScore, 1.5);
    dryingTimeHours = baseDryingHours;
    warnings.push('Rock is currently wet - dangerous to climb');
  } else if (hasRecentPrecip) {
    const penalty = calculateWeatherAwareDryingPenalty(
      recentPrecipitationMm,
      rockType,
      current.temp_c,
      current.humidity,
      current.wind_kph
    );
    frictionScore -= penalty;

    const dryingFactor =
      (current.temp_c >= 15 && current.humidity < 50) ? 0.8 : 1.2;
    dryingTimeHours = baseDryingHours * dryingFactor;

    warnings.push(
      `Recent precipitation (${recentPrecipitationMm.toFixed(1)}mm) - will dry in ~${Math.round(dryingTimeHours)}h`
    );
  }

  // === WIND ASSESSMENT ===
  if (current.wind_kph > 40) {
    frictionScore -= 0.5;
    warnings.push(`Very high winds (${current.wind_kph} km/h) - danger of blown off`);
  } else if (current.wind_kph > 25) {
    frictionScore -= 0.3;
    warnings.push(`High wind (${current.wind_kph} km/h)`);
  }

  // === CLAMP SCORE ===
  frictionScore = Math.max(1, Math.min(5, frictionScore));

  // === CONVERT TO RATING ===
  let rating: 'Nope' | 'Meh' | 'OK' | 'Great';
  if (frictionScore >= 4.5) {
    rating = 'Great';
  } else if (frictionScore >= 3.5) {
    rating = 'OK';
  } else if (frictionScore >= 2) {
    rating = 'Meh';
  } else {
    rating = 'Nope';
  }

  // === BUILD RESPONSE ===
  const isDry = !isCurrentlyWet && !hasRecentPrecip;

  if (!isDry && dryingTimeHours) {
    reasons.push(
      `Will be ready to climb in ~${Math.round(dryingTimeHours)} hours`
    );
  }

  if (reasons.length === 0) {
    reasons.push('Conditions are acceptable');
  }

  return {
    frictionRating: Math.round(frictionScore),
    rating,
    reasons,
    dryingTimeHours: dryingTimeHours
      ? Math.round(dryingTimeHours)
      : undefined,
    isDry,
    warnings,
  };
}

/**
 * Analyze hourly forecast for optimal climbing windows
 */
export function findOptimalWindows(
  hourly: Array<{
    time: string;
    temp_c: number;
    humidity: number;
    wind_kph: number;
    precip_mm: number;
  }> | undefined,
  rockType: RockType = 'unknown'
): string[] {
  if (!hourly || hourly.length === 0) return [];

  const rockConditions = getRockTypeConditions(rockType);
  const { optimalTemp, optimalHumidity } = rockConditions;

  // Find hours with good conditions (score >= 4)
  const goodHours = hourly.filter((hour) => {
    let score = 3;
    if (hour.temp_c >= optimalTemp.min && hour.temp_c <= optimalTemp.max)
      score += 1;
    if (hour.humidity >= optimalHumidity.min &&
      hour.humidity <= optimalHumidity.max)
      score += 1;
    if (hour.precip_mm === 0) score += 0.5;
    if (hour.wind_kph < 25) score += 0.5;
    return score >= 4;
  });

  // Group consecutive hours into windows
  const windows: string[] = [];
  let windowStart: string | null = null;
  let windowEnd: string | null = null;

  for (let i = 0; i < goodHours.length; i++) {
    const hour = goodHours[i];

    if (!windowStart) {
      windowStart = hour.time;
      windowEnd = hour.time;
    } else {
      windowEnd = hour.time;
    }

    // Check if next hour breaks the window
    if (i === goodHours.length - 1 || goodHours[i + 1] === undefined) {
      if (windowStart && windowEnd) {
        if (windowStart === windowEnd) {
          windows.push(`${windowStart}`);
        } else {
          windows.push(`${windowStart}-${windowEnd}`);
        }
      }
      windowStart = null;
      windowEnd = null;
    } else {
      const nextHour = goodHours[i + 1];
      const currentHour = parseInt(hour.time.split(':')[0]);
      const nextHourNum = parseInt(nextHour.time.split(':')[0]);

      // Break if not consecutive
      if (nextHourNum - currentHour !== 1 && nextHourNum !== 0) {
        if (windowStart && windowEnd) {
          if (windowStart === windowEnd) {
            windows.push(`${windowStart}`);
          } else {
            windows.push(`${windowStart}-${windowEnd}`);
          }
        }
        windowStart = null;
        windowEnd = null;
      }
    }
  }

  return windows;
}
