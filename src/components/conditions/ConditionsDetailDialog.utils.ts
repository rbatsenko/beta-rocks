/**
 * Utility functions for ConditionsDetailDialog component
 */

export const getLabelColor = (label: string): string => {
  switch (label) {
    case "looks_good":
      return "bg-green-500/10 text-green-500 border-green-500/20";
    case "watch_out":
      return "bg-amber-500/10 text-amber-500 border-amber-500/20";
    case "stay_home":
      return "bg-red-500/10 text-red-500 border-red-500/20";
    default:
      return "bg-muted text-muted-foreground";
  }
};

export const formatHourlyTime = (
  isoString: string,
  locale: string,
  t: (key: string) => string,
  timeFormat: "12h" | "24h" = "24h"
): string => {
  const date = new Date(isoString);
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const isToday = date.toDateString() === now.toDateString();
  const isTomorrow = date.toDateString() === tomorrow.toDateString();

  const hour12 = timeFormat === "12h";
  const timeStr = date.toLocaleTimeString(locale, {
    hour: "2-digit",
    minute: "2-digit",
    hour12,
  });

  if (isToday) return `${t("dialog.today")} ${timeStr}`;
  if (isTomorrow) return `${t("dialog.tomorrow")} ${timeStr}`;

  return date.toLocaleDateString(locale, {
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12,
  });
};

export const formatTimeRange = (start: string, end: string, locale: string, timeFormat: "12h" | "24h" = "24h"): string => {
  try {
    const startDate = new Date(start);
    const endDate = new Date(end);

    const formatTime = (date: Date) => {
      if (timeFormat === "12h") {
        return date.toLocaleTimeString(locale, { hour: "numeric", minute: "2-digit", hour12: true });
      }
      const hours = date.getHours().toString().padStart(2, "0");
      const minutes = date.getMinutes().toString().padStart(2, "0");
      return `${hours}:${minutes}`;
    };

    // Check if the window spans across days
    const isSameDay = startDate.toDateString() === endDate.toDateString();

    if (!isSameDay) {
      // Show date for end time if it's a different day
      const endDay = endDate.toLocaleDateString(locale, { month: "short", day: "numeric" });
      return `${formatTime(startDate)}-${formatTime(endDate)} (${endDay})`;
    }

    return `${formatTime(startDate)}-${formatTime(endDate)}`;
  } catch {
    return `${start}-${end}`;
  }
};

export type HourlyCondition = {
  time: string;
  temp_c: number;
  humidity: number;
  wind_kph: number;
  wind_direction?: number;
  precip_mm: number;
  dew_point_spread: number;
  weatherCode?: number;
  warnings: string[];
  flags: {
    rain_now: boolean;
    condensation_risk: boolean;
    high_humidity: boolean;
    wet_rock_likely: boolean;
    high_wind: boolean;
    extreme_wind: boolean;
  };
};

export const groupHourlyByDay = (
  hourlyConditions: HourlyCondition[] | undefined,
  t: (key: string) => string,
  locale: string
): Record<string, HourlyCondition[]> | null => {
  if (!hourlyConditions) return null;

  const grouped: Record<string, HourlyCondition[]> = {};
  const now = new Date();

  // Filter to only show current hour and future hours
  const futureHours = hourlyConditions.filter((hour) => new Date(hour.time) >= now);

  futureHours.forEach((hour) => {
    const date = new Date(hour.time);
    const isToday = date.toDateString() === now.toDateString();

    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const isTomorrow = date.toDateString() === tomorrow.toDateString();

    let dayKey: string;
    if (isToday) {
      dayKey = t("dialog.today");
    } else if (isTomorrow) {
      dayKey = t("dialog.tomorrow");
    } else {
      dayKey = date.toLocaleDateString(locale, {
        weekday: "short",
        month: "short",
        day: "numeric",
      });
    }

    if (!grouped[dayKey]) {
      grouped[dayKey] = [];
    }
    grouped[dayKey].push(hour);
  });

  return grouped;
};

export type DryWindow = {
  start?: string;
  end?: string;
  startTime?: string; // backward compat alias
  endTime?: string;   // backward compat alias
  hourCount?: number;
  hours: number;
  timeRange?: string;
};

export type DailyForecastDay = {
  date: string;
  tempMax: number;
  tempMin: number;
  precipitation: number;
  windSpeedMax: number;
  windDirectionDominant?: number;
  sunrise: string;
  sunset: string;
  weatherCode: number;
};

export type GroupedWindow = {
  windows: (DryWindow & { hourlyData?: HourlyCondition[] })[];
  isToday: boolean;
  isTomorrow: boolean;
  /** Label for the day (used when no dry windows) */
  label?: string;
  /** Weather code for the day (for icon display on non-optimal days) */
  weatherCode?: number;
};

export const groupWindowsByDay = (
  dryWindows: DryWindow[] | undefined,
  hourlyConditions: HourlyCondition[] | undefined,
  t: (key: string) => string,
  locale: string,
  dailyForecast?: DailyForecastDay[]
): Record<string, GroupedWindow> | null => {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const fiveDaysFromNow = new Date(today);
  fiveDaysFromNow.setDate(fiveDaysFromNow.getDate() + 5);

  const grouped: Record<string, GroupedWindow> = {};

  // Helper to get display label and flags for a date
  const getDayInfo = (date: Date) => {
    const dayStart = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const isToday = dayStart.getTime() === today.getTime();
    const isTomorrow = dayStart.getTime() === tomorrow.getTime();
    let displayDay: string;
    if (isToday) {
      displayDay = t("dialog.today");
    } else if (isTomorrow) {
      displayDay = t("dialog.tomorrow");
    } else {
      displayDay = date.toLocaleDateString(locale, {
        weekday: "short",
        month: "short",
        day: "numeric",
      });
    }
    return { displayDay, isToday, isTomorrow };
  };

  // Group dry windows by day
  if (dryWindows) {
    dryWindows.forEach((window) => {
      const startDate = new Date(window.start || window.startTime || "");
      const endDate = new Date(window.end || window.endTime || "");

      // Skip windows that have already ended or are more than 5 days away
      if (endDate < now || startDate >= fiveDaysFromNow) return;

      // Skip windows with zero or very short duration (less than 30 minutes)
      const durationMs = endDate.getTime() - startDate.getTime();
      const durationMinutes = durationMs / (1000 * 60);
      if (durationMinutes < 30) return;

      const { displayDay, isToday, isTomorrow } = getDayInfo(startDate);

      if (!grouped[displayDay]) {
        grouped[displayDay] = {
          windows: [],
          isToday,
          isTomorrow,
        };
      }

      // Get hourly data for this window
      const windowHours = hourlyConditions
        ? hourlyConditions.filter((hour) => {
            const hourTime = new Date(hour.time);
            const windowStart = new Date(window.start || window.startTime || "");
            const windowEnd = new Date(window.end || window.endTime || "");
            return hourTime >= windowStart && hourTime < windowEnd;
          })
        : [];

      grouped[displayDay].windows.push({
        ...window,
        hourlyData: windowHours,
      });
    });
  }

  // Fill in days without dry windows from daily forecast
  if (dailyForecast) {
    dailyForecast.forEach((day) => {
      const dayDate = new Date(day.date);
      const dayStart = new Date(dayDate.getFullYear(), dayDate.getMonth(), dayDate.getDate());

      // Only include days from today up to 5 days out
      if (dayStart < today || dayStart >= fiveDaysFromNow) return;

      const { displayDay, isToday, isTomorrow } = getDayInfo(dayDate);

      // Skip if this day already has dry windows
      if (grouped[displayDay]) {
        // Add weather code for display
        grouped[displayDay].weatherCode = day.weatherCode;
        return;
      }

      // Determine label for this day from hourly data
      let label = "stay_home";
      if (hourlyConditions) {
        const dayEnd = new Date(dayStart);
        dayEnd.setDate(dayEnd.getDate() + 1);
        const hoursForDay = hourlyConditions.filter((h) => {
          const ht = new Date(h.time);
          return ht >= dayStart && ht < dayEnd;
        });
        // No dry windows on this day — label based on how bad it is
        const allRain = hoursForDay.length > 0 && hoursForDay.every(
          (h) => h.flags?.rain_now || h.flags?.wet_rock_likely
        );
        if (!allRain && hoursForDay.length > 0) {
          label = "watch_out";
        }
      }

      grouped[displayDay] = {
        windows: [],
        isToday,
        isTomorrow,
        label,
        weatherCode: day.weatherCode,
      };
    });
  }

  // Return null only if there's nothing at all
  if (Object.keys(grouped).length === 0) return null;

  // Sort chronologically: today first, then tomorrow, then by date
  const sorted: Record<string, GroupedWindow> = {};
  const entries = Object.entries(grouped);
  entries.sort(([, a], [, b]) => {
    if (a.isToday && !b.isToday) return -1;
    if (!a.isToday && b.isToday) return 1;
    if (a.isTomorrow && !b.isTomorrow) return -1;
    if (!a.isTomorrow && b.isTomorrow) return 1;
    return 0; // preserve order for other days (already chronological from forecast)
  });
  for (const [key, value] of entries) {
    sorted[key] = value;
  }

  return sorted;
};
