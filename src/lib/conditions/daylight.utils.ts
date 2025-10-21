/**
 * Daylight hours calculation utility
 * Calculates sunrise, sunset, and climbing-appropriate hours
 */

export interface DaylightHours {
  sunrise: string; // ISO string
  sunset: string; // ISO string
  civilDawn: string; // Sun 6° below horizon - can see without artificial light
  civilDusk: string; // Sun 6° below horizon - last usable light
  climbingStart: number; // Hour of day (0-23) for practical climbing start
  climbingEnd: number; // Hour of day (0-23) for practical climbing end
  totalDaylightHours: number;
}

export enum ClimbingTimeContext {
  NORMAL = "normal", // Show 6am-8pm (adjust by season)
  ALPINE_START = "alpine", // Show from 4am when hot
  DAWN_PATROL = "dawn", // Emphasis on early morning
  EVENING_SESSION = "evening", // Extend to 9pm in summer
  WINTER_SHORT = "winter", // Only 9am-4pm
}

/**
 * Calculate sunrise/sunset times using simplified solar position algorithm
 * This is approximate but sufficient for climbing purposes
 */
export function calculateDaylightHours(
  latitude: number,
  longitude: number,
  date: Date
): DaylightHours {
  // Convert date to Julian day number
  const julianDay = Math.floor(date.getTime() / 86400000) + 2440587.5;

  // Calculate equation of time and solar declination
  const n = julianDay - 2451545.0;
  const L = (280.46 + 0.9856474 * n) % 360;
  const g = (((357.528 + 0.9856003 * n) % 360) * Math.PI) / 180;
  const lambda = ((L + 1.915 * Math.sin(g) + 0.02 * Math.sin(2 * g)) * Math.PI) / 180;

  // Solar declination
  const declination = Math.asin(Math.sin((23.45 * Math.PI) / 180) * Math.sin(lambda));

  // Hour angle for sunrise/sunset
  const latRad = (latitude * Math.PI) / 180;
  const cosH = -Math.tan(latRad) * Math.tan(declination);

  // Check for polar day/night
  let sunrise: Date, sunset: Date, civilDawn: Date, civilDusk: Date;

  if (cosH < -1) {
    // Polar day
    sunrise = new Date(date);
    sunrise.setHours(0, 0, 0, 0);
    sunset = new Date(date);
    sunset.setHours(23, 59, 59, 999);
    civilDawn = sunrise;
    civilDusk = sunset;
  } else if (cosH > 1) {
    // Polar night
    sunrise = new Date(date);
    sunrise.setHours(12, 0, 0, 0);
    sunset = sunrise;
    civilDawn = sunrise;
    civilDusk = sunset;
  } else {
    // Normal day
    const H = (Math.acos(cosH) * 180) / Math.PI;
    const sunriseTime = 12 - H / 15 - longitude / 15;
    const sunsetTime = 12 + H / 15 - longitude / 15;

    // Civil twilight (sun 6° below horizon)
    const cosHCivil =
      -Math.tan(latRad) * Math.tan(declination) -
      Math.sin((-6 * Math.PI) / 180) / (Math.cos(latRad) * Math.cos(declination));
    const HCivil = (Math.acos(Math.max(-1, Math.min(1, cosHCivil))) * 180) / Math.PI;
    const civilDawnTime = 12 - HCivil / 15 - longitude / 15;
    const civilDuskTime = 12 + HCivil / 15 - longitude / 15;

    sunrise = new Date(date);
    sunrise.setHours(Math.floor(sunriseTime), (sunriseTime % 1) * 60, 0, 0);

    sunset = new Date(date);
    sunset.setHours(Math.floor(sunsetTime), (sunsetTime % 1) * 60, 0, 0);

    civilDawn = new Date(date);
    civilDawn.setHours(Math.floor(civilDawnTime), (civilDawnTime % 1) * 60, 0, 0);

    civilDusk = new Date(date);
    civilDusk.setHours(Math.floor(civilDuskTime), (civilDuskTime % 1) * 60, 0, 0);
  }

  // Calculate practical climbing hours (typically 30min after dawn, 30min before dusk)
  const climbingStart = Math.max(5, civilDawn.getHours() + 1); // Not before 5am
  const climbingEnd = Math.min(21, civilDusk.getHours()); // Not after 9pm

  const totalDaylightHours = (sunset.getTime() - sunrise.getTime()) / (1000 * 60 * 60);

  return {
    sunrise: sunrise.toISOString(),
    sunset: sunset.toISOString(),
    civilDawn: civilDawn.toISOString(),
    civilDusk: civilDusk.toISOString(),
    climbingStart,
    climbingEnd,
    totalDaylightHours: Math.round(totalDaylightHours * 10) / 10,
  };
}

/**
 * Detect appropriate time context based on conditions and user query
 */
export function detectTimeContext(
  maxTemp: number,
  latitude: number,
  month: number,
  query?: string
): ClimbingTimeContext {
  // Heat avoidance - show early hours
  if (maxTemp > 30 || query?.match(/early|dawn|sunrise|alpine start/i)) {
    return ClimbingTimeContext.ALPINE_START;
  }

  // Winter at high latitudes - narrow window
  if ((month >= 11 || month <= 1) && Math.abs(latitude) > 40) {
    return ClimbingTimeContext.WINTER_SHORT;
  }

  // Evening preference (summer)
  if (query?.match(/evening|sunset|after work/i) && month >= 5 && month <= 8) {
    return ClimbingTimeContext.EVENING_SESSION;
  }

  // Dawn emphasis
  if (query?.match(/morning|first light/i)) {
    return ClimbingTimeContext.DAWN_PATROL;
  }

  return ClimbingTimeContext.NORMAL;
}

/**
 * Get climbing hours based on context
 */
export function getClimbingHours(
  daylight: DaylightHours,
  context: ClimbingTimeContext,
  maxTemp?: number
): { start: number; end: number } {
  switch (context) {
    case ClimbingTimeContext.ALPINE_START:
      // Start very early to beat heat
      return {
        start: Math.max(4, daylight.climbingStart - 2),
        end: Math.min(18, daylight.climbingEnd - 2), // End earlier when hot
      };

    case ClimbingTimeContext.WINTER_SHORT:
      // Narrow window when cold
      return {
        start: Math.max(9, daylight.climbingStart),
        end: Math.min(16, daylight.climbingEnd),
      };

    case ClimbingTimeContext.DAWN_PATROL:
      // Emphasize morning hours
      return {
        start: Math.max(5, daylight.climbingStart - 1),
        end: Math.min(14, daylight.climbingEnd),
      };

    case ClimbingTimeContext.EVENING_SESSION:
      // Extend into evening
      return {
        start: Math.max(14, daylight.climbingStart),
        end: Math.min(21, daylight.climbingEnd + 1),
      };

    case ClimbingTimeContext.NORMAL:
    default:
      // Adaptive based on temperature
      let start = daylight.climbingStart;
      let end = daylight.climbingEnd;

      // Adjust for temperature if provided
      if (maxTemp !== undefined) {
        if (maxTemp > 25) {
          // Start earlier and end later when warm
          start = Math.max(6, start - 1);
          end = Math.min(20, end);
        } else if (maxTemp < 10) {
          // Narrower window when cold
          start = Math.max(9, start);
          end = Math.min(17, end);
        }
      }

      return { start, end };
  }
}

/**
 * Check if a given hour is within climbing hours
 */
export function isClimbingHour(
  hour: number,
  climbingHours: { start: number; end: number }
): boolean {
  return hour >= climbingHours.start && hour <= climbingHours.end;
}

/**
 * Get raw time context data (without formatting)
 */
export function getTimeContextData(
  daylight: DaylightHours,
  context: ClimbingTimeContext
): {
  sunriseISO: string;
  sunsetISO: string;
  climbingStartHour: number;
  climbingEndHour: number;
  totalDaylightHours: number;
  contextNote?: string;
} {
  const hours = getClimbingHours(daylight, context);

  const contextNotes: Record<ClimbingTimeContext, string | undefined> = {
    [ClimbingTimeContext.ALPINE_START]: "earlyStartRecommended",
    [ClimbingTimeContext.WINTER_SHORT]: "limitedDaylight",
    [ClimbingTimeContext.DAWN_PATROL]: "morningConditionsBest",
    [ClimbingTimeContext.EVENING_SESSION]: "eveningSession",
    [ClimbingTimeContext.NORMAL]: undefined,
  };

  return {
    sunriseISO: daylight.sunrise,
    sunsetISO: daylight.sunset,
    climbingStartHour: hours.start,
    climbingEndHour: hours.end,
    totalDaylightHours: daylight.totalDaylightHours,
    contextNote: contextNotes[context],
  };
}
