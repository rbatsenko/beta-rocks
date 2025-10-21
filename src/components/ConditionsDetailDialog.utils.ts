/**
 * Utility functions for ConditionsDetailDialog component
 */

export const getRatingColor = (rating: string): string => {
  switch (rating) {
    case "Great":
      return "bg-green-500/10 text-green-500 border-green-500/20";
    case "Good":
      return "bg-blue-500/10 text-blue-500 border-blue-500/20";
    case "Fair":
      return "bg-yellow-500/10 text-yellow-500 border-yellow-500/20";
    case "Poor":
      return "bg-orange-500/10 text-orange-500 border-orange-500/20";
    case "Nope":
      return "bg-red-500/10 text-red-500 border-red-500/20";
    default:
      return "bg-muted text-muted-foreground";
  }
};

export const formatHourlyTime = (
  isoString: string,
  locale: string,
  t: (key: string) => string
): string => {
  const date = new Date(isoString);
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const isToday = date.toDateString() === now.toDateString();
  const isTomorrow = date.toDateString() === tomorrow.toDateString();

  const timeStr = date.toLocaleTimeString(locale, {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });

  if (isToday) return `${t("dialog.today")} ${timeStr}`;
  if (isTomorrow) return `${t("dialog.tomorrow")} ${timeStr}`;

  return date.toLocaleDateString(locale, {
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
};

export const formatTimeRange = (start: string, end: string, locale: string): string => {
  try {
    const startDate = new Date(start);
    const endDate = new Date(end);

    // Format hours and minutes separately to avoid locale issues
    const formatTime = (date: Date) => {
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
  precip_mm: number;
  frictionScore: number;
  rating: string;
  weatherCode?: number;
  warnings: string[];
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

  // Filter to show every 3 hours to reduce clutter
  Object.keys(grouped).forEach((key) => {
    grouped[key] = grouped[key].filter((_, index) => index % 3 === 0);
  });

  return grouped;
};

export type OptimalWindow = {
  timeRange: string;
  startTime: string;
  endTime: string;
  avgFrictionScore: number;
  rating: string;
  hourCount: number;
  hours?: HourlyCondition[];
};

export type GroupedWindow = {
  windows: OptimalWindow[];
  isToday: boolean;
  isTomorrow: boolean;
};

export const groupWindowsByDay = (
  optimalWindows: OptimalWindow[] | undefined,
  hourlyConditions: HourlyCondition[] | undefined,
  t: (key: string) => string,
  locale: string
): Record<string, GroupedWindow> | null => {
  if (!optimalWindows || optimalWindows.length === 0) return null;

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const fiveDaysFromNow = new Date(today);
  fiveDaysFromNow.setDate(fiveDaysFromNow.getDate() + 5);

  const grouped: Record<string, GroupedWindow> = {};

  optimalWindows.forEach((window) => {
    const startDate = new Date(window.startTime);
    const endDate = new Date(window.endTime);

    // Skip windows that have already ended or are more than 5 days away
    if (endDate < now || startDate >= fiveDaysFromNow) return;

    // Skip windows with zero or very short duration (less than 30 minutes)
    const durationMs = endDate.getTime() - startDate.getTime();
    const durationMinutes = durationMs / (1000 * 60);
    if (durationMinutes < 30) return;

    const windowDay = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());

    let displayDay: string;
    let isToday = false;
    let isTomorrow = false;

    if (windowDay.getTime() === today.getTime()) {
      displayDay = t("dialog.today");
      isToday = true;
    } else if (windowDay.getTime() === tomorrow.getTime()) {
      displayDay = t("dialog.tomorrow");
      isTomorrow = true;
    } else {
      displayDay = startDate.toLocaleDateString(locale, {
        weekday: "short",
        month: "short",
        day: "numeric",
      });
    }

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
          const windowStart = new Date(window.startTime);
          const windowEnd = new Date(window.endTime);
          return hourTime >= windowStart && hourTime < windowEnd;
        })
      : [];

    grouped[displayDay].windows.push({
      ...window,
      hours: windowHours,
    });
  });

  return grouped;
};
