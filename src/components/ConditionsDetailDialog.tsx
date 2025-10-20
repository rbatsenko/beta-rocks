"use client";

import { useState, useMemo, memo, useEffect, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Cloud, Droplets, Wind, ThermometerSun, Clock, TrendingUp, Calendar, Sunrise, Sunset } from "lucide-react";
import { getWeatherEmoji, getWeatherDescription } from "@/lib/utils/weather-emojis";
import { getLocaleFromLanguage } from "@/lib/utils/locale";
import { useClientTranslation } from "@/hooks/useClientTranslation";
import { useConditionsTranslations } from "@/hooks/useConditionsTranslations";
import { logRender, isDebugRenders, logPhase } from "@/lib/debug/render-log";

interface ConditionsDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  data: {
    location: string;
    locationDetails?: string;
    rating: string;
    frictionScore: number;
    reasons?: string[];
    warnings?: string[];
    isDry: boolean;
    dryingTimeHours?: number;
    current?: {
      temperature_c: number;
      humidity: number;
      windSpeed_kph: number;
      precipitation_mm: number;
      weatherCode: number;
    };
    hourlyConditions?: Array<{
      time: string;
      temp_c: number;
      humidity: number;
      wind_kph: number;
      precip_mm: number;
      frictionScore: number;
      rating: string;
      isDry: boolean;
      warnings: string[];
      weatherCode?: number;
    }>;
    optimalWindows?: Array<{
      startTime: string;
      endTime: string;
      avgFrictionScore: number;
      rating: string;
      hourCount: number;
    }>;
    precipitationContext?: {
      last24h: number;
      last48h: number;
      next24h: number;
    };
    dewPointSpread?: number;
    optimalTime?: string;
    astro?: {
      sunrise: string;
      sunset: string;
    };
    dailyForecast?: Array<{
      date: string;
      tempMax: number;
      tempMin: number;
      precipitation: number;
      windSpeedMax: number;
      sunrise: string;
      sunset: string;
      weatherCode: number;
    }>;
  };
}

export const ConditionsDetailDialog = memo(function ConditionsDetailDialog({ open, onOpenChange, data }: ConditionsDetailDialogProps) {
  const { t, language } = useClientTranslation('common');
  const locale = getLocaleFromLanguage(language);
  const [activeTab, setActiveTab] = useState("overview");
  const tabSwitchStartRef = useRef<number | null>(null);

  logRender('ConditionsDetailDialog', {
    open,
    activeTab,
    hasHourly: !!data.hourlyConditions?.length,
    hasDaily: !!data.dailyForecast?.length,
    hasWindows: !!data.optimalWindows?.length,
  });

  // Get memoized translation functions
  const { translateRating, translateWeather } = useConditionsTranslations(t);

  // Helper to detect if it's night time (7pm-7am)
  const isNightTime = (dateOrHour: Date | number): boolean => {
    const hour = typeof dateOrHour === 'number' ? dateOrHour : dateOrHour.getHours();
    return hour >= 19 || hour < 7;
  };

  const getRatingColor = (rating: string) => {
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

  const formatHourlyTime = (isoString: string) => {
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

    if (isToday) return `${t('dialog.today')} ${timeStr}`;
    if (isTomorrow) return `${t('dialog.tomorrow')} ${timeStr}`;

    return date.toLocaleDateString(locale, {
      weekday: "short",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
  };

  const groupHourlyByDay = () => {
    if (!data.hourlyConditions) return null;

    const grouped: Record<string, typeof data.hourlyConditions> = {};
    const now = new Date();

    // Filter to only show current hour and future hours
    const futureHours = data.hourlyConditions.filter((hour) => new Date(hour.time) >= now);

    futureHours.forEach((hour) => {
      const date = new Date(hour.time);
      const isToday = date.toDateString() === now.toDateString();

      const tomorrow = new Date(now);
      tomorrow.setDate(tomorrow.getDate() + 1);
      const isTomorrow = date.toDateString() === tomorrow.toDateString();

      let dayKey: string;
      if (isToday) {
        dayKey = t('dialog.today');
      } else if (isTomorrow) {
        dayKey = t('dialog.tomorrow');
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

  const formatTimeRange = (start: string, end: string) => {
    try {
      const startDate = new Date(start);
      const endDate = new Date(end);

      // Format hours and minutes separately to avoid locale issues
      const formatTime = (date: Date) => {
        const hours = date.getHours().toString().padStart(2, '0');
        const minutes = date.getMinutes().toString().padStart(2, '0');
        return `${hours}:${minutes}`;
      };

      // Check if the window spans across days
      const isSameDay = startDate.toDateString() === endDate.toDateString();

      if (!isSameDay) {
        // Show date for end time if it's a different day
        const endDay = endDate.toLocaleDateString(locale, { month: 'short', day: 'numeric' });
        return `${formatTime(startDate)}-${formatTime(endDate)} (${endDay})`;
      }

      return `${formatTime(startDate)}-${formatTime(endDate)}`;
    } catch {
      return `${start}-${end}`;
    }
  };

  const groupWindowsByDay = () => {
    if (!data.optimalWindows || data.optimalWindows.length === 0) return null;

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const fiveDaysFromNow = new Date(today);
    fiveDaysFromNow.setDate(fiveDaysFromNow.getDate() + 5);

    type WindowWithHours = {
      timeRange: string;
      startTime: string;
      endTime: string;
      avgFrictionScore: number;
      rating: string;
      hourCount: number;
      hours: Array<{
        time: string;
        temp_c: number;
        humidity: number;
        wind_kph: number;
        precip_mm: number;
        frictionScore: number;
        rating: string;
        weatherCode?: number;
      }>;
    };

    type GroupedWindow = {
      windows: WindowWithHours[];
      isToday: boolean;
      isTomorrow: boolean;
    };

    const grouped: Record<string, GroupedWindow> = {};

    data.optimalWindows.forEach((window) => {
      const startDate = new Date(window.startTime);
      const endDate = new Date(window.endTime);

      // Skip windows that have already ended or are more than 5 days away
      if (endDate < now || startDate >= fiveDaysFromNow) return;

      // Skip windows with zero or very short duration (less than 30 minutes)
      const durationMs = endDate.getTime() - startDate.getTime();
      const durationMinutes = durationMs / (1000 * 60);
      if (durationMinutes < 30) return;

      const windowDay = new Date(
        startDate.getFullYear(),
        startDate.getMonth(),
        startDate.getDate()
      );

      let displayDay: string;
      let isToday = false;
      let isTomorrow = false;

      if (windowDay.getTime() === today.getTime()) {
        displayDay = t('dialog.today');
        isToday = true;
      } else if (windowDay.getTime() === tomorrow.getTime()) {
        displayDay = t('dialog.tomorrow');
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
      const windowHours = data.hourlyConditions
        ? data.hourlyConditions.filter((hour) => {
            const hourTime = new Date(hour.time);
            const windowStart = new Date(window.startTime);
            const windowEnd = new Date(window.endTime);
            return hourTime >= windowStart && hourTime < windowEnd;
          })
        : [];

      grouped[displayDay].windows.push({
        timeRange: formatTimeRange(window.startTime, window.endTime),
        startTime: window.startTime,
        endTime: window.endTime,
        avgFrictionScore: window.avgFrictionScore,
        rating: window.rating,
        hourCount: window.hourCount,
        hours: windowHours,
      });
    });

    return Object.keys(grouped).length > 0 ? grouped : null;
  };

  // Memoize expensive grouping functions to prevent recalculation on every render
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const windowsByDay = useMemo(() => groupWindowsByDay(), [data.optimalWindows, data.hourlyConditions]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const hourlyByDay = useMemo(() => groupHourlyByDay(), [data.hourlyConditions]);

  // Measure tab switch duration in debug mode
  useEffect(() => {
    if (!isDebugRenders) return;
    if (tabSwitchStartRef.current != null) {
      const elapsed = performance.now() - tabSwitchStartRef.current;
      logPhase('ConditionsDetailDialog', 'tab-switched', { tab: activeTab, ms: Number(elapsed.toFixed(1)) });
      tabSwitchStartRef.current = null;
    }
  }, [activeTab]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <ThermometerSun className="w-5 h-5" />
              {t('dialog.detailedConditions')}: {data.location}
            </div>
            {data.locationDetails && (
              <span className="text-sm font-normal text-muted-foreground">
                📍 {data.locationDetails}
              </span>
            )}
          </DialogTitle>
          <DialogDescription>
            {t('dialog.fullAnalysis')}
          </DialogDescription>
        </DialogHeader>

        <Tabs
          value={activeTab}
          onValueChange={(v) => {
            if (isDebugRenders) {
              tabSwitchStartRef.current = performance.now();
              logPhase('ConditionsDetailDialog', 'tab-change', { to: v });
            }
            setActiveTab(v);
          }}
          className="w-full flex flex-col"
        >
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="overview">{t('dialog.tabs.overview')}</TabsTrigger>
            <TabsTrigger value="hourly">{t('dialog.tabs.hourly')}</TabsTrigger>
            <TabsTrigger value="daily">{t('dialog.tabs.daily')}</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="mt-4 flex-1 overflow-hidden">
            <ScrollArea className="h-[calc(90vh-240px)] pr-4">
              <div className="space-y-6">
            {/* Current Conditions Summary */}
            <div className="space-y-3">
              <h3 className="font-semibold flex items-center gap-2">
                <Cloud className="w-4 h-4" />
                {t('dialog.currentRating')}
              </h3>
              <div className="flex items-center gap-3">
                <Badge className={`text-lg px-4 py-2 ${getRatingColor(data.rating)}`}>
                  {translateRating(data.rating)}
                </Badge>
                <span className="text-2xl font-bold">{data.frictionScore}/5</span>
                {data.isDry ? (
                  <Badge variant="outline" className="text-green-600 border-green-600">
                    {t('dialog.dry')}
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-orange-600 border-orange-600">
                    {t('dialog.wet')}
                  </Badge>
                )}
              </div>
              {data.reasons && data.reasons.length > 0 && (
                <ul className="text-sm space-y-1 text-muted-foreground">
                  {data.reasons.map((reason, i) => (
                    <li key={i}>• {reason}</li>
                  ))}
                </ul>
              )}
              {data.warnings && data.warnings.length > 0 && (
                <div className="space-y-1">
                  {data.warnings.map((warning, i) => (
                    <p key={i} className="text-sm text-destructive">
                      ⚠️ {warning}
                    </p>
                  ))}
                </div>
              )}
            </div>

            <Separator />

            {/* Current Conditions */}
            {data.current && (
              <>
                <div className="space-y-3">
                  <h3 className="font-semibold flex items-center gap-2">
                    <ThermometerSun className="w-4 h-4" />
                    {t('dialog.currentConditions')}
                  </h3>

                  {/* Weather emoji and description */}
                  <div className="flex items-center gap-4 bg-muted/30 rounded-lg p-4 border border-border">
                    <div className="text-6xl">{getWeatherEmoji(data.current.weatherCode, isNightTime(new Date()))}</div>
                    <div className="flex-1">
                      <p className="text-lg font-semibold">{translateWeather(getWeatherDescription(data.current.weatherCode))}</p>
                      <p className="text-sm text-muted-foreground">{t('dialog.currentWeather')}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div className="bg-muted/50 rounded-lg p-3">
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
                        <ThermometerSun className="h-3 w-3" />
                        <span>{t('dialog.temperature')}</span>
                      </div>
                      <p className="text-lg font-semibold">{Math.round(data.current.temperature_c)}°C</p>
                    </div>
                    <div className="bg-muted/50 rounded-lg p-3">
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
                        <Droplets className="h-3 w-3" />
                        <span>{t('dialog.humidity')}</span>
                      </div>
                      <p className="text-lg font-semibold">{data.current.humidity}%</p>
                    </div>
                    <div className="bg-muted/50 rounded-lg p-3">
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
                        <Wind className="h-3 w-3" />
                        <span>{t('dialog.windSpeed')}</span>
                      </div>
                      <p className="text-lg font-semibold">{data.current.windSpeed_kph}km/h</p>
                    </div>
                    <div className="bg-muted/50 rounded-lg p-3">
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
                        <Cloud className="h-3 w-3" />
                        <span>{t('dialog.precipitation')}</span>
                      </div>
                      <p className="text-lg font-semibold">{data.current.precipitation_mm}mm</p>
                    </div>
                    {data.astro && (
                      <>
                        <div className="bg-muted/50 rounded-lg p-3">
                          <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
                            <Sunrise className="h-3 w-3 text-orange-500" />
                            <span>{t('dialog.sunrise')}</span>
                          </div>
                          <p className="text-lg font-semibold">
                            {new Date(data.astro.sunrise).toLocaleTimeString(locale, {
                              hour: '2-digit',
                              minute: '2-digit',
                              hour12: false
                            })}
                          </p>
                        </div>
                        <div className="bg-muted/50 rounded-lg p-3">
                          <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
                            <Sunset className="h-3 w-3 text-orange-600" />
                            <span>{t('dialog.sunset')}</span>
                          </div>
                          <p className="text-lg font-semibold">
                            {new Date(data.astro.sunset).toLocaleTimeString(locale, {
                              hour: '2-digit',
                              minute: '2-digit',
                              hour12: false
                            })}
                          </p>
                        </div>
                      </>
                    )}
                  </div>
                </div>
                <Separator />
              </>
            )}

            {/* Precipitation Context */}
            {data.precipitationContext && (
              <>
                <div className="space-y-3">
                  <h3 className="font-semibold flex items-center gap-2">
                    <Droplets className="w-4 h-4" />
                    {t('dialog.precipitationContext')}
                  </h3>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="bg-muted/50 rounded-lg p-3">
                      <p className="text-xs text-muted-foreground">{t('dialog.last24h')}</p>
                      <p className="text-lg font-semibold">{data.precipitationContext.last24h}mm</p>
                    </div>
                    <div className="bg-muted/50 rounded-lg p-3">
                      <p className="text-xs text-muted-foreground">{t('dialog.last48h')}</p>
                      <p className="text-lg font-semibold">{data.precipitationContext.last48h}mm</p>
                    </div>
                    <div className="bg-muted/50 rounded-lg p-3">
                      <p className="text-xs text-muted-foreground">{t('dialog.next24h')}</p>
                      <p className="text-lg font-semibold">{data.precipitationContext.next24h}mm</p>
                    </div>
                  </div>
                  {data.dewPointSpread !== undefined && (
                    <div className="bg-muted/50 rounded-lg p-3">
                      <p className="text-xs text-muted-foreground">
                        {t('dialog.dewPointSpread')}
                      </p>
                      <p className="text-sm">
                        {data.dewPointSpread > 5
                          ? t('dialog.lowRisk')
                          : data.dewPointSpread > 2
                            ? t('dialog.moderateRisk')
                            : t('dialog.highRisk')}
                      </p>
                      <p className="text-lg font-semibold">{Math.round(data.dewPointSpread)}°C</p>
                    </div>
                  )}
                </div>
                <Separator />
              </>
            )}

            {/* Optimal Windows */}
            {windowsByDay && Object.keys(windowsByDay).length > 0 ? (
              <>
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-semibold flex items-center gap-2">
                      <TrendingUp className="w-4 h-4" />
                      {t('dialog.optimalWindows')}
                    </h3>
                    <span className="text-xs text-muted-foreground">{t('dialog.nextDays')}</span>
                  </div>
                  <Accordion type="multiple" className="space-y-2">
                    {Object.entries(windowsByDay).map(([day, dayData]) => {
                      const isHighlighted = dayData.isToday || dayData.isTomorrow;

                      return (
                        <AccordionItem
                          key={day}
                          value={day}
                          className={`rounded-lg border transition-colors ${
                            isHighlighted
                              ? "bg-green-50/70 dark:bg-green-900/20 border-green-200/70 dark:border-green-700/50"
                              : "bg-muted/50 border-border"
                          }`}
                        >
                          <AccordionTrigger className="px-3 py-2 hover:no-underline">
                            <div className="flex items-center gap-2">
                              <div
                                className={`w-2 h-2 rounded-full ${
                                  isHighlighted ? "bg-green-500" : "bg-green-400"
                                }`}
                              />
                              <span
                                className={`text-sm font-medium ${
                                  isHighlighted
                                    ? "text-green-800 dark:text-green-200"
                                    : "text-foreground"
                                }`}
                              >
                                {day}
                              </span>
                              {dayData.isToday && (
                                <span className="rounded-full border border-green-400/30 bg-green-500/10 text-green-700 dark:text-green-300 px-2 py-0.5 text-[10px] font-medium leading-none">
                                  {t('dialog.todayBadge')}
                                </span>
                              )}
                              <span className="text-xs text-muted-foreground ml-auto mr-2">
                                {dayData.windows.length} {dayData.windows.length > 1 ? t('dialog.windows') : t('dialog.window')}
                              </span>
                            </div>
                          </AccordionTrigger>
                          <AccordionContent className="px-3 pb-3">
                            <div className="space-y-3">
                              {dayData.windows.map((window, idx) => (
                                <div key={idx} className="space-y-2">
                                  {/* Window header */}
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                      {/* Weather summary for the window */}
                                      {window.hours.length > 0 && window.hours[0].weatherCode !== undefined && (
                                        <span className="text-lg" title={translateWeather(getWeatherDescription(window.hours[0].weatherCode))}>
                                          {getWeatherEmoji(window.hours[0].weatherCode, isNightTime(new Date(window.hours[0].time)))}
                                        </span>
                                      )}
                                      <Clock className="h-3 w-3 text-green-600 dark:text-green-400" />
                                      <span className="text-sm font-medium">{window.timeRange}</span>
                                      <Badge
                                        className={getRatingColor(window.rating)}
                                        variant="outline"
                                      >
                                        {translateRating(window.rating)}
                                      </Badge>
                                    </div>
                                    <span className="text-xs text-muted-foreground">
                                      {window.avgFrictionScore}/5
                                    </span>
                                  </div>

                                  {/* Hourly breakdown */}
                                  {window.hours.length > 0 && (
                                    <div className="space-y-1 pl-5">
                                      {window.hours.map((hour, hourIdx) => (
                                        <div
                                          key={hourIdx}
                                          className="flex items-center justify-between text-xs py-1"
                                        >
                                          <div className="flex items-center gap-2 text-muted-foreground">
                                            {hour.weatherCode !== undefined && (
                                              <span className="text-base" title={translateWeather(getWeatherDescription(hour.weatherCode))}>
                                                {getWeatherEmoji(hour.weatherCode, isNightTime(new Date(hour.time)))}
                                              </span>
                                            )}
                                            <span className="font-mono min-w-[45px]">
                                              {new Date(hour.time).toLocaleTimeString(locale, {
                                                hour: "2-digit",
                                                minute: "2-digit",
                                                hour12: false,
                                              })}
                                            </span>
                                            <div className="flex items-center gap-2">
                                              <div className="flex items-center gap-0.5">
                                                <ThermometerSun className="h-2.5 w-2.5" />
                                                <span>{Math.round(hour.temp_c)}°C</span>
                                              </div>
                                              <div className="flex items-center gap-0.5">
                                                <Droplets className="h-2.5 w-2.5" />
                                                <span>{hour.humidity}%</span>
                                              </div>
                                              <div className="flex items-center gap-0.5">
                                                <Wind className="h-2.5 w-2.5" />
                                                <span>{hour.wind_kph}km/h</span>
                                              </div>
                                            </div>
                                          </div>
                                          <span className="font-medium">{hour.frictionScore}/5</span>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          </AccordionContent>
                        </AccordionItem>
                      );
                    })}
                  </Accordion>
                  {data.optimalTime && (
                    <p className="text-sm text-muted-foreground">
                      {t('dialog.bestTime')}: <span className="font-semibold">{formatHourlyTime(data.optimalTime)}</span>
                    </p>
                  )}
                </div>
                <Separator />
              </>
            ) : data.optimalWindows && data.optimalWindows.length === 0 ? (
              <>
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-semibold flex items-center gap-2">
                      <TrendingUp className="w-4 h-4" />
                      {t('dialog.optimalWindows')}
                    </h3>
                    <span className="text-xs text-muted-foreground">{t('dialog.nextDays')}</span>
                  </div>
                  <div className="flex flex-col items-center justify-center py-8 text-center">
                    <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-3">
                      <Clock className="h-6 w-6 text-muted-foreground" />
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {t('dialog.noOptimalConditions')}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {t('dialog.checkHourlyForecast')}
                    </p>
                  </div>
                </div>
                <Separator />
              </>
            ) : null}

            {/* Weather Monitoring Disclaimer */}
            <div className="mt-6 p-3 bg-muted/30 rounded-lg border border-border">
              <p className="text-xs text-muted-foreground text-center">
                {t('dialog.weatherDisclaimer')}
              </p>
            </div>
              </div>
            </ScrollArea>
          </TabsContent>

          {/* Hourly Forecast Tab */}
          <TabsContent value="hourly" className="mt-4 flex-1 overflow-hidden">
            <ScrollArea className="h-[calc(90vh-240px)] pr-4">
              {hourlyByDay && Object.keys(hourlyByDay).length > 0 ? (
                <div className="space-y-6">
                  {Object.entries(hourlyByDay).map(([day, hours]) => {
                    // Group hours by rating
                    const goodHours = hours.filter((h) => h.rating === "Great" || h.rating === "Good");

                    return (
                      <div key={day} className="space-y-3">
                        <h3 className="font-semibold flex items-center gap-2 sticky top-0 bg-background z-10 py-2">
                          <Calendar className="w-4 h-4" />
                          {day}
                        </h3>

                        {/* Good hours - shown prominently */}
                        {goodHours.length > 0 && (
                          <div className="space-y-2">
                            {goodHours.map((hour, i) => (
                              <div
                                key={i}
                                className={`rounded-lg p-3 border ${
                                  hour.rating === "Great"
                                    ? "bg-green-500/10 border-green-500/30"
                                    : "bg-blue-500/5 border-blue-500/20"
                                }`}
                              >
                                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                                  <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
                                    <div className="flex items-center gap-2">
                                      {hour.weatherCode !== undefined && (
                                        <span className="text-2xl" title={translateWeather(getWeatherDescription(hour.weatherCode))}>
                                          {getWeatherEmoji(hour.weatherCode, isNightTime(new Date(hour.time)))}
                                        </span>
                                      )}
                                      <span className="font-mono text-sm font-semibold min-w-[60px]">
                                        {new Date(hour.time).toLocaleTimeString(locale, {
                                          hour: "2-digit",
                                          minute: "2-digit",
                                          hour12: false,
                                        })}
                                      </span>
                                    </div>
                                    <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                                      <div className="flex items-center gap-1">
                                        <ThermometerSun className="h-3 w-3" />
                                        <span>{Math.round(hour.temp_c)}°C</span>
                                      </div>
                                      <div className="flex items-center gap-1">
                                        <Droplets className="h-3 w-3" />
                                        <span>{hour.humidity}%</span>
                                      </div>
                                      <div className="flex items-center gap-1">
                                        <Wind className="h-3 w-3" />
                                        <span>{hour.wind_kph}km/h</span>
                                      </div>
                                      {hour.precip_mm > 0 && (
                                        <div className="flex items-center gap-1 text-blue-500">
                                          <Cloud className="h-3 w-3" />
                                          <span>{hour.precip_mm}mm</span>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <Badge className={getRatingColor(hour.rating)} variant="outline">
                                      {translateRating(hour.rating)}
                                    </Badge>
                                    <span className="text-sm font-semibold w-8 text-right">
                                      {hour.frictionScore}/5
                                    </span>
                                  </div>
                                </div>
                                {hour.warnings.length > 0 && (
                                  <p className="text-xs text-muted-foreground mt-1">
                                    {hour.warnings.join(", ")}
                                  </p>
                                )}
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Complete timeline - collapsible, shows ALL hours including good ones */}
                        {hours.length > 0 && (
                          <Accordion type="single" collapsible>
                            <AccordionItem value="all-hours" className="border rounded-lg">
                              <AccordionTrigger className="px-3 py-2 hover:no-underline">
                                <span className="text-sm text-muted-foreground">
                                  {t('dialog.showCompleteTimeline')} ({hours.length} {hours.length > 1 ? t('dialog.hours') : t('dialog.hour')})
                                </span>
                              </AccordionTrigger>
                              <AccordionContent className="px-3 pb-3">
                                <div className="space-y-2">
                                  {hours.map((hour, i) => (
                                    <div
                                      key={i}
                                      className={`rounded-lg p-3 border ${
                                        hour.rating === "Great"
                                          ? "bg-green-500/10 border-green-500/30"
                                          : hour.rating === "Good"
                                            ? "bg-blue-500/5 border-blue-500/20"
                                            : "bg-muted/30 border-border"
                                      }`}
                                    >
                                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                                        <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
                                          <div className="flex items-center gap-2">
                                            {hour.weatherCode !== undefined && (
                                              <span className="text-xl" title={translateWeather(getWeatherDescription(hour.weatherCode))}>
                                                {getWeatherEmoji(hour.weatherCode, isNightTime(new Date(hour.time)))}
                                              </span>
                                            )}
                                            <span className="font-mono text-sm font-semibold min-w-[60px]">
                                              {new Date(hour.time).toLocaleTimeString(locale, {
                                                hour: "2-digit",
                                                minute: "2-digit",
                                                hour12: false,
                                              })}
                                            </span>
                                          </div>
                                          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                                            <div className="flex items-center gap-1">
                                              <ThermometerSun className="h-3 w-3" />
                                              <span>{Math.round(hour.temp_c)}°C</span>
                                            </div>
                                            <div className="flex items-center gap-1">
                                              <Droplets className="h-3 w-3" />
                                              <span>{hour.humidity}%</span>
                                            </div>
                                            <div className="flex items-center gap-1">
                                              <Wind className="h-3 w-3" />
                                              <span>{hour.wind_kph}km/h</span>
                                            </div>
                                            {hour.precip_mm > 0 && (
                                              <div className="flex items-center gap-1 text-blue-500">
                                                <Cloud className="h-3 w-3" />
                                                <span>{hour.precip_mm}mm</span>
                                              </div>
                                            )}
                                          </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                          <Badge className={getRatingColor(hour.rating)} variant="outline">
                                            {translateRating(hour.rating)}
                                          </Badge>
                                          <span className="text-sm font-semibold w-8 text-right">
                                            {hour.frictionScore}/5
                                          </span>
                                        </div>
                                      </div>
                                      {hour.warnings.length > 0 && (
                                        <p className="text-xs text-muted-foreground mt-1">
                                          {hour.warnings.join(", ")}
                                        </p>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              </AccordionContent>
                            </AccordionItem>
                          </Accordion>
                        )}

                        {/* No good hours message */}
                        {goodHours.length === 0 && (
                          <p className="text-sm text-muted-foreground italic">
                            {t('dialog.noOptimalHours')} {day}
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <Wind className="w-12 h-12 text-muted-foreground mb-3" />
                  <p className="text-sm text-muted-foreground">No hourly forecast data available</p>
                </div>
              )}
            </ScrollArea>
          </TabsContent>

          {/* 14-Day Forecast Tab */}
          <TabsContent value="daily" className="mt-4 flex-1 overflow-hidden">
            <ScrollArea className="h-[calc(90vh-240px)] pr-4">
              {data.dailyForecast && data.dailyForecast.length > 0 ? (
                <div className="space-y-4">
                  {/* Legend */}
                  <div className="bg-muted/30 rounded-lg p-3 border border-border">
                    <p className="text-xs font-semibold mb-2">{t('dialog.forecastIndicators')}</p>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                      <div className="flex items-center gap-1.5">
                        <div className="w-3 h-3 rounded bg-green-200/50 dark:bg-green-700/30 border border-green-400/50"></div>
                        <span>{t('dialog.goodClimbingWindows')}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <div className="w-3 h-3 rounded bg-yellow-200/50 dark:bg-yellow-700/30 border border-yellow-400/50"></div>
                        <span>{t('dialog.fairConditions')}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <div className="w-3 h-3 rounded bg-muted/30 border border-border"></div>
                        <span>{t('dialog.poorConditions')}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-orange-600">•</span>
                        <span>{t('dialog.lessReliable')}</span>
                      </div>
                    </div>
                  </div>
                  {data.dailyForecast
                    .filter((day) => {
                      // Filter out any days in the past
                      const dayDate = new Date(day.date);
                      const now = new Date();
                      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
                      return dayDate >= today;
                    })
                    .map((day, idx) => {
                      const dayDate = new Date(day.date);
                      const now = new Date();
                      const isToday = dayDate.toDateString() === now.toDateString();
                      const tomorrow = new Date(now);
                      tomorrow.setDate(tomorrow.getDate() + 1);
                      const isTomorrow = dayDate.toDateString() === tomorrow.toDateString();

                    // Check if this is in the less reliable forecast period (days 8-14)
                    const isLongTerm = idx >= 7;

                    // Determine if this day has good climbing conditions
                    let hasGoodConditions = false;
                    let hasFairConditions = false;

                    if (data.hourlyConditions) {
                      // Get hours for this specific day
                      const dayStart = new Date(day.date);
                      const dayEnd = new Date(day.date);
                      dayEnd.setDate(dayEnd.getDate() + 1);

                      const hoursForDay = data.hourlyConditions.filter(hour => {
                        const hourTime = new Date(hour.time);
                        return hourTime >= dayStart && hourTime < dayEnd;
                      });

                      hasGoodConditions = hoursForDay.some(h => h.rating === "Great" || h.rating === "Good");
                      hasFairConditions = hoursForDay.some(h => h.rating === "Fair");
                    }

                    let dayLabel: string;
                    if (isToday) {
                      dayLabel = t('dialog.today');
                    } else if (isTomorrow) {
                      dayLabel = t('dialog.tomorrow');
                    } else {
                      dayLabel = dayDate.toLocaleDateString(locale, {
                        weekday: "short",
                        month: "short",
                        day: "numeric",
                      });
                    }

                    // Determine background color based on conditions
                    let bgClass = "bg-muted/30 border-border";
                    if (isToday) {
                      bgClass = "bg-green-50/70 dark:bg-green-900/20 border-green-200/70 dark:border-green-700/50";
                    } else if (isTomorrow) {
                      bgClass = "bg-blue-50/70 dark:bg-blue-900/20 border-blue-200/70 dark:border-blue-700/50";
                    } else if (hasGoodConditions) {
                      bgClass = "bg-green-50/50 dark:bg-green-900/15 border-green-200/50 dark:border-green-700/30";
                    } else if (hasFairConditions) {
                      bgClass = "bg-yellow-50/50 dark:bg-yellow-900/15 border-yellow-200/50 dark:border-yellow-700/30";
                    }

                    return (
                      <div
                        key={idx}
                        className={`rounded-lg p-4 border ${bgClass} ${isLongTerm ? "opacity-60" : ""}`}
                      >
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-3">
                            {/* Weather emoji */}
                            <div className="text-3xl" title={translateWeather(getWeatherDescription(day.weatherCode))}>
                              {getWeatherEmoji(day.weatherCode, isNightTime(12))}
                            </div>
                            <div className="flex items-center gap-2">
                              <Calendar className="w-4 h-4" />
                              <span className="font-semibold">{dayLabel}</span>
                            {isToday && (
                              <span className="rounded-full border border-green-400/30 bg-green-500/10 text-green-700 dark:text-green-300 px-2 py-0.5 text-[10px] font-medium leading-none">
                                {t('dialog.todayBadge')}
                              </span>
                            )}
                            {isLongTerm && (
                              <span className="rounded-full border border-orange-400/30 bg-orange-500/10 text-orange-700 dark:text-orange-300 px-2 py-0.5 text-[10px] font-medium leading-none">
                                {t('dialog.lessCertain')}
                              </span>
                            )}
                            </div>
                          </div>
                          <span className="text-xs text-muted-foreground">
                            {dayDate.toLocaleDateString(locale, { month: "short", day: "numeric" })}
                          </span>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                          <div className="bg-background/50 rounded-lg p-2">
                            <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1">
                              <ThermometerSun className="h-3 w-3" />
                              <span>{t('dialog.high')}</span>
                            </div>
                            <p className="text-lg font-semibold">{Math.round(day.tempMax)}°C</p>
                          </div>
                          <div className="bg-background/50 rounded-lg p-2">
                            <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1">
                              <ThermometerSun className="h-3 w-3" />
                              <span>{t('dialog.low')}</span>
                            </div>
                            <p className="text-lg font-semibold">{Math.round(day.tempMin)}°C</p>
                          </div>
                          <div className="bg-background/50 rounded-lg p-2">
                            <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1">
                              <Droplets className="h-3 w-3" />
                              <span>{t('dialog.rain')}</span>
                            </div>
                            <p className="text-lg font-semibold">{day.precipitation.toFixed(1)}mm</p>
                          </div>
                          <div className="bg-background/50 rounded-lg p-2">
                            <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1">
                              <Wind className="h-3 w-3" />
                              <span>{t('dialog.wind')}</span>
                            </div>
                            <p className="text-lg font-semibold">{Math.round(day.windSpeedMax)}km/h</p>
                          </div>
                        </div>

                        <div className="mt-3 flex items-center gap-3 text-xs text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <Sunrise className="h-3 w-3 text-orange-500" />
                            <span>
                              {new Date(day.sunrise).toLocaleTimeString(locale, {
                                hour: "2-digit",
                                minute: "2-digit",
                                hour12: false,
                              })}
                            </span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Sunset className="h-3 w-3 text-orange-600" />
                            <span>
                              {new Date(day.sunset).toLocaleTimeString(locale, {
                                hour: "2-digit",
                                minute: "2-digit",
                                hour12: false,
                              })}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <Calendar className="w-12 h-12 text-muted-foreground mb-3" />
                  <p className="text-sm text-muted-foreground">{t('dialog.noDailyData')}</p>
                </div>
              )}
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
});
