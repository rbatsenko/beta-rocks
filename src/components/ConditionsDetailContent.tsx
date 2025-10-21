"use client";

import React, { useState, useMemo, memo, useEffect, useRef, useCallback } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Cloud,
  CloudRain,
  Droplets,
  Wind,
  ThermometerSun,
  Clock,
  TrendingUp,
  Calendar,
  Sunrise,
  Sunset,
} from "lucide-react";
import { getWeatherEmoji, getWeatherDescription } from "@/lib/utils/weather-emojis";
import { getLocaleFromLanguage } from "@/lib/utils/locale";
import { useClientTranslation } from "@/hooks/useClientTranslation";
import { useConditionsTranslations } from "@/hooks/useConditionsTranslations";
import { logRender, isDebugRenders, logPhase } from "@/lib/debug/render-log";
import {
  getRatingColor,
  formatHourlyTime,
  formatTimeRange,
  groupHourlyByDay,
  groupWindowsByDay,
} from "./ConditionsDetailDialog.utils";

// This is the same interface as ConditionsDetailDialog uses
interface ConditionsDetailContentProps {
  variant?: "dialog" | "sheet";
  data: {
    location: string;
    locationDetails?: string;
    latitude?: number;
    longitude?: number;
    country?: string;
    state?: string;
    municipality?: string;
    village?: string;
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
    timeContext?: {
      sunriseISO: string;
      sunsetISO: string;
      climbingStartHour: number;
      climbingEndHour: number;
      totalDaylightHours: number;
      contextNote?: string;
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

export const ConditionsDetailContent = memo(function ConditionsDetailContent({
  variant = "dialog",
  data,
}: ConditionsDetailContentProps) {
  const { t, language } = useClientTranslation("common");
  const locale = getLocaleFromLanguage(language);
  const [activeTab, setActiveTab] = useState("overview");
  const tabSwitchStartRef = useRef<number | null>(null);

  // Use h-full for sheet, calc height for dialog
  const scrollAreaHeight = variant === "sheet" ? "h-full" : "h-[calc(90vh-240px)]";
  const tabsHeight = variant === "sheet" ? "h-full" : "";

  logRender("ConditionsDetailContent", {
    activeTab,
    hasHourly: !!data.hourlyConditions?.length,
    hasDaily: !!data.dailyForecast?.length,
    hasWindows: !!data.optimalWindows?.length,
  });

  // Get memoized translation functions
  const { translateRating, translateWeather, translateReason, translateWarning } =
    useConditionsTranslations(t);

  // Helper to detect if it's night time (7pm-7am)
  const isNightTime = (dateOrHour: Date | number): boolean => {
    const hour = typeof dateOrHour === "number" ? dateOrHour : dateOrHour.getHours();
    return hour >= 19 || hour < 7;
  };

  // groupHourlyByDay wrapper to pass required parameters
  const groupedHourlyData = useCallback(() => {
    return groupHourlyByDay(data.hourlyConditions, t, locale);
  }, [data.hourlyConditions, t, locale]);

  // groupWindowsByDay wrapper to pass required parameters
  const groupWindowsByDayWithParams = useCallback(() => {
    // Need to transform windows to include formatted timeRange
    const windowsWithTimeRange = data.optimalWindows?.map((window) => ({
      ...window,
      timeRange: formatTimeRange(window.startTime, window.endTime, locale),
    }));
    return groupWindowsByDay(windowsWithTimeRange, data.hourlyConditions, t, locale);
  }, [data.optimalWindows, data.hourlyConditions, t, locale]);

  // Memoize expensive grouping functions to prevent recalculation on every render
  const windowsByDay = useMemo(() => groupWindowsByDayWithParams(), [groupWindowsByDayWithParams]);
  const hourlyByDay = useMemo(() => groupedHourlyData(), [groupedHourlyData]);

  // Measure tab switch duration in debug mode
  useEffect(() => {
    if (!isDebugRenders) return;
    if (tabSwitchStartRef.current != null) {
      const elapsed = performance.now() - tabSwitchStartRef.current;
      logPhase("ConditionsDetailContent", "tab-switched", {
        tab: activeTab,
        ms: Number(elapsed.toFixed(1)),
      });
      tabSwitchStartRef.current = null;
    }
  }, [activeTab]);

  return (
    <Tabs
      value={activeTab}
      onValueChange={(v) => {
        if (isDebugRenders) {
          tabSwitchStartRef.current = performance.now();
          logPhase("ConditionsDetailContent", "tab-change", { to: v });
        }
        setActiveTab(v);
      }}
      className={`w-full flex flex-col ${tabsHeight}`}
    >
      <TabsList className="grid w-full grid-cols-3">
        <TabsTrigger value="overview">{t("dialog.tabs.overview")}</TabsTrigger>
        <TabsTrigger value="hourly">{t("dialog.tabs.hourly")}</TabsTrigger>
        <TabsTrigger value="daily">{t("dialog.tabs.daily")}</TabsTrigger>
      </TabsList>

      {/* Overview Tab */}
      <TabsContent value="overview" className="mt-4 flex-1 overflow-hidden">
        <ScrollArea className={`${scrollAreaHeight} pr-4`}>
          <div className="space-y-6">
            {/* Current Conditions Summary */}
            <div className="space-y-3">
              <h3 className="font-semibold flex items-center gap-2">
                <Cloud className="w-4 h-4" />
                {t("dialog.currentRating")}
              </h3>
              <div className="flex items-center gap-3">
                <Badge className={`text-lg px-4 py-2 ${getRatingColor(data.rating)}`}>
                  {translateRating(data.rating)}
                </Badge>
                <span className="text-2xl font-bold">{data.frictionScore}/5</span>
                {data.isDry ? (
                  <Badge variant="outline" className="text-green-600 border-green-600">
                    {t("dialog.dry")}
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-orange-600 border-orange-600">
                    {t("dialog.wet")}
                  </Badge>
                )}
              </div>
              {data.reasons && data.reasons.length > 0 && (
                <ul className="text-sm space-y-1 text-muted-foreground">
                  {data.reasons.map((reason, i) => (
                    <li key={i}>• {translateReason(reason)}</li>
                  ))}
                </ul>
              )}
              {data.warnings && data.warnings.length > 0 && (
                <div className="space-y-1">
                  {data.warnings.map((warning, i) => (
                    <p key={i} className="text-sm text-destructive">
                      ⚠️ {translateWarning(warning)}
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
                    {t("dialog.currentConditions")}
                  </h3>

                  {/* Weather emoji and description */}
                  <div className="flex items-center gap-4 bg-muted/30 rounded-lg p-4 border border-border">
                    <div className="text-6xl">
                      {getWeatherEmoji(data.current.weatherCode, isNightTime(new Date()))}
                    </div>
                    <div className="flex-1">
                      <p className="text-lg font-semibold">
                        {translateWeather(getWeatherDescription(data.current.weatherCode))}
                      </p>
                      <p className="text-sm text-muted-foreground">{t("dialog.currentWeather")}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div className="bg-muted/50 rounded-lg p-3">
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
                        <ThermometerSun className="h-3 w-3" />
                        <span>{t("dialog.temperature")}</span>
                      </div>
                      <p className="text-lg font-semibold">
                        {Math.round(data.current.temperature_c)}°C
                      </p>
                    </div>
                    <div className="bg-muted/50 rounded-lg p-3">
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
                        <Droplets className="h-3 w-3" />
                        <span>{t("dialog.humidity")}</span>
                      </div>
                      <p className="text-lg font-semibold">{data.current.humidity}%</p>
                    </div>
                    <div className="bg-muted/50 rounded-lg p-3">
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
                        <Wind className="h-3 w-3" />
                        <span>{t("dialog.windSpeed")}</span>
                      </div>
                      <p className="text-lg font-semibold">{data.current.windSpeed_kph}km/h</p>
                    </div>
                    <div className="bg-muted/50 rounded-lg p-3">
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
                        <CloudRain className="h-3 w-3" />
                        <span>{t("dialog.precipitation")}</span>
                      </div>
                      <p className="text-lg font-semibold">{data.current.precipitation_mm}mm</p>
                    </div>
                    {(data.timeContext || data.astro) && (
                      <>
                        <div className="bg-muted/50 rounded-lg p-3">
                          <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
                            <Sunrise className="h-3 w-3 text-orange-500" />
                            <span>{t("timeContext.sunrise")}</span>
                          </div>
                          <p className="text-lg font-semibold">
                            {data.timeContext?.sunriseISO
                              ? new Date(data.timeContext.sunriseISO).toLocaleTimeString(locale, {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                  hour12: false,
                                })
                              : data.astro &&
                                new Date(data.astro.sunrise).toLocaleTimeString(locale, {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                  hour12: false,
                                })}
                          </p>
                        </div>
                        <div className="bg-muted/50 rounded-lg p-3">
                          <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
                            <Sunset className="h-3 w-3 text-orange-600" />
                            <span>{t("timeContext.sunset")}</span>
                          </div>
                          <p className="text-lg font-semibold">
                            {data.timeContext?.sunsetISO
                              ? new Date(data.timeContext.sunsetISO).toLocaleTimeString(locale, {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                  hour12: false,
                                })
                              : data.astro &&
                                new Date(data.astro.sunset).toLocaleTimeString(locale, {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                  hour12: false,
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
                    {t("dialog.precipitationContext")}
                  </h3>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="bg-muted/50 rounded-lg p-3">
                      <p className="text-xs text-muted-foreground">{t("dialog.last24h")}</p>
                      <p className="text-lg font-semibold">{data.precipitationContext.last24h}mm</p>
                    </div>
                    <div className="bg-muted/50 rounded-lg p-3">
                      <p className="text-xs text-muted-foreground">{t("dialog.last48h")}</p>
                      <p className="text-lg font-semibold">{data.precipitationContext.last48h}mm</p>
                    </div>
                    <div className="bg-muted/50 rounded-lg p-3">
                      <p className="text-xs text-muted-foreground">{t("dialog.next24h")}</p>
                      <p className="text-lg font-semibold">{data.precipitationContext.next24h}mm</p>
                    </div>
                  </div>
                  {data.dewPointSpread !== undefined && (
                    <div className="bg-muted/50 rounded-lg p-3">
                      <p className="text-xs text-muted-foreground">{t("dialog.dewPointSpread")}</p>
                      <p className="text-sm">
                        {data.dewPointSpread > 5
                          ? t("dialog.lowRisk")
                          : data.dewPointSpread > 2
                            ? t("dialog.moderateRisk")
                            : t("dialog.highRisk")}
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
                      {t("dialog.optimalWindows")}
                    </h3>
                    <span className="text-xs text-muted-foreground">{t("dialog.nextDays")}</span>
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
                                  {t("dialog.todayBadge")}
                                </span>
                              )}
                              <span className="text-xs text-muted-foreground ml-auto mr-2">
                                {dayData.windows.length}{" "}
                                {dayData.windows.length > 1
                                  ? t("dialog.windows")
                                  : t("dialog.window")}
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
                                      {window.hours &&
                                        window.hours.length > 0 &&
                                        window.hours[0].weatherCode !== undefined && (
                                          <span
                                            className="text-lg"
                                            title={translateWeather(
                                              getWeatherDescription(window.hours[0].weatherCode)
                                            )}
                                          >
                                            {getWeatherEmoji(
                                              window.hours[0].weatherCode,
                                              isNightTime(new Date(window.hours[0].time))
                                            )}
                                          </span>
                                        )}
                                      <Clock className="h-3 w-3 text-green-600 dark:text-green-400" />
                                      <span className="text-sm font-medium">
                                        {window.timeRange}
                                      </span>
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
                                  {window.hours && window.hours.length > 0 && (
                                    <div className="space-y-1 pl-5">
                                      {window.hours?.map((hour, hourIdx) => (
                                        <div
                                          key={hourIdx}
                                          className="flex items-center justify-between text-xs py-1"
                                        >
                                          <div className="flex items-center gap-2 text-muted-foreground">
                                            {hour.weatherCode !== undefined && (
                                              <span
                                                className="text-base"
                                                title={translateWeather(
                                                  getWeatherDescription(hour.weatherCode)
                                                )}
                                              >
                                                {getWeatherEmoji(
                                                  hour.weatherCode,
                                                  isNightTime(new Date(hour.time))
                                                )}
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
                                          <span className="font-medium">
                                            {hour.frictionScore}/5
                                          </span>
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
                      {t("dialog.bestTime")}:{" "}
                      <span className="font-semibold">
                        {formatHourlyTime(data.optimalTime, locale, t)}
                      </span>
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
                      {t("dialog.optimalWindows")}
                    </h3>
                    <span className="text-xs text-muted-foreground">{t("dialog.nextDays")}</span>
                  </div>
                  <div className="flex flex-col items-center justify-center py-8 text-center">
                    <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-3">
                      <Clock className="h-6 w-6 text-muted-foreground" />
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {t("dialog.noOptimalConditions")}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {t("dialog.checkHourlyForecast")}
                    </p>
                  </div>
                </div>
                <Separator />
              </>
            ) : null}

            {/* Weather Monitoring Disclaimer */}
            <div className="mt-6 p-3 bg-muted/30 rounded-lg border border-border">
              <p className="text-xs text-muted-foreground text-center">
                {t("dialog.weatherDisclaimer")}
              </p>
            </div>
          </div>
        </ScrollArea>
      </TabsContent>

      {/* Hourly Forecast Tab */}
      <TabsContent value="hourly" className="mt-4 flex-1 overflow-hidden">
        <ScrollArea className={`${scrollAreaHeight} pr-4`}>
          {hourlyByDay && Object.keys(hourlyByDay).length > 0 ? (
            <div className="space-y-6">
              {Object.entries(hourlyByDay).map(([day, hours]) => {
                // Filter to show only good/great hours for the main display
                const goodHours = hours.filter((h) => h.rating === "Great" || h.rating === "Good");

                // Check if hours are distant (>48h from now)
                const now = new Date();
                const isDistantHour = (hourTime: string) => {
                  const hourDate = new Date(hourTime);
                  const hoursFromNow = (hourDate.getTime() - now.getTime()) / (1000 * 60 * 60);
                  return hoursFromNow > 48;
                };

                return (
                  <div key={day} className="space-y-3">
                    <h3 className="font-semibold flex items-center gap-2 sticky top-0 bg-background z-10 py-2">
                      <Calendar className="w-4 h-4" />
                      {day}
                    </h3>

                    {/* Display only good hours prominently */}
                    {goodHours.length > 0 && (
                      <div className="space-y-2">
                        {goodHours.map((hour, i) => {
                          const isDistant = isDistantHour(hour.time);
                          const prevHour = i > 0 ? goodHours[i - 1] : null;
                          const showHint =
                            isDistant && (!prevHour || !isDistantHour(prevHour.time));

                          return (
                            <React.Fragment key={`hour-${i}`}>
                              {showHint && (
                                <div className="flex items-center gap-2 py-2 text-xs text-muted-foreground">
                                  <div className="flex-1 h-px bg-border"></div>
                                  <span className="flex items-center gap-1.5">
                                    <span className="text-orange-600">•</span>
                                    {t("dialog.lessReliableHourly")}
                                  </span>
                                  <div className="flex-1 h-px bg-border"></div>
                                </div>
                              )}
                              <div
                                className={`rounded-lg p-3 border ${
                                  hour.rating === "Great"
                                    ? "bg-green-500/10 border-green-500/30"
                                    : hour.rating === "Good"
                                      ? "bg-blue-500/5 border-blue-500/20"
                                      : "bg-muted/30 border-border"
                                } ${isDistant ? "opacity-60" : ""}`}
                              >
                                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                                  <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
                                    <div className="flex items-center gap-2">
                                      {hour.weatherCode !== undefined && (
                                        <span
                                          className="text-2xl"
                                          title={translateWeather(
                                            getWeatherDescription(hour.weatherCode)
                                          )}
                                        >
                                          {getWeatherEmoji(
                                            hour.weatherCode,
                                            isNightTime(new Date(hour.time))
                                          )}
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
                                      <div
                                        className={`flex items-center gap-1 ${hour.precip_mm > 0 ? "text-blue-500" : ""}`}
                                      >
                                        <CloudRain className="h-3 w-3" />
                                        <span>{hour.precip_mm}mm</span>
                                      </div>
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <Badge
                                      className={getRatingColor(hour.rating)}
                                      variant="outline"
                                    >
                                      {translateRating(hour.rating)}
                                    </Badge>
                                    <span className="text-sm font-semibold w-8 text-right">
                                      {hour.frictionScore}/5
                                    </span>
                                  </div>
                                </div>
                                {hour.warnings.length > 0 && (
                                  <p className="text-xs text-muted-foreground mt-1">
                                    {hour.warnings.map((w) => translateWarning(w)).join(", ")}
                                  </p>
                                )}
                              </div>
                            </React.Fragment>
                          );
                        })}
                      </div>
                    )}

                    {/* Complete timeline - collapsible accordion */}
                    <Accordion type="single" collapsible className="mt-2">
                      <AccordionItem value="all-hours" className="border rounded-lg">
                        <AccordionTrigger className="px-3 py-2 hover:no-underline">
                          <span className="text-sm text-muted-foreground">
                            {t("dialog.showCompleteTimeline")} ({hours.length}{" "}
                            {hours.length > 1 ? t("dialog.periods") : t("dialog.period")})
                          </span>
                        </AccordionTrigger>
                        <AccordionContent className="px-3 pb-3">
                          <div className="space-y-2">
                            {hours.map((hour, i) => {
                              const isDistant = isDistantHour(hour.time);
                              const prevHour = i > 0 ? hours[i - 1] : null;
                              const showHint =
                                isDistant && (!prevHour || !isDistantHour(prevHour.time));

                              return (
                                <React.Fragment key={`all-hour-${i}`}>
                                  {showHint && (
                                    <div className="flex items-center gap-2 py-2 text-xs text-muted-foreground">
                                      <div className="flex-1 h-px bg-border"></div>
                                      <span className="flex items-center gap-1.5">
                                        <span className="text-orange-600">•</span>
                                        {t("dialog.lessReliableHourly")}
                                      </span>
                                      <div className="flex-1 h-px bg-border"></div>
                                    </div>
                                  )}
                                  <div
                                    className={`rounded-lg p-2 border text-xs ${
                                      hour.rating === "Great"
                                        ? "bg-green-500/10 border-green-500/30"
                                        : hour.rating === "Good"
                                          ? "bg-blue-500/5 border-blue-500/20"
                                          : "bg-muted/30 border-border"
                                    } ${isDistant ? "opacity-60" : ""}`}
                                  >
                                    <div className="flex items-center justify-between">
                                      <div className="flex items-center gap-2">
                                        {hour.weatherCode !== undefined && (
                                          <span
                                            className="text-base"
                                            title={translateWeather(
                                              getWeatherDescription(hour.weatherCode)
                                            )}
                                          >
                                            {getWeatherEmoji(
                                              hour.weatherCode,
                                              isNightTime(new Date(hour.time))
                                            )}
                                          </span>
                                        )}
                                        <span className="font-mono">
                                          {new Date(hour.time).toLocaleTimeString(locale, {
                                            hour: "2-digit",
                                            minute: "2-digit",
                                            hour12: false,
                                          })}
                                        </span>
                                        <div className="flex items-center gap-2 text-muted-foreground">
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
                                          <div
                                            className={`flex items-center gap-0.5 ${hour.precip_mm > 0 ? "text-blue-500" : ""}`}
                                          >
                                            <CloudRain className="h-2.5 w-2.5" />
                                            <span>{hour.precip_mm}mm</span>
                                          </div>
                                        </div>
                                      </div>
                                      <div className="flex items-center gap-2">
                                        <Badge
                                          className={getRatingColor(hour.rating)}
                                          variant="outline"
                                        >
                                          {translateRating(hour.rating)}
                                        </Badge>
                                        <span className="font-semibold">
                                          {hour.frictionScore}/5
                                        </span>
                                      </div>
                                    </div>
                                    {hour.warnings.length > 0 && (
                                      <p className="text-xs text-muted-foreground mt-1">
                                        {hour.warnings.map((w) => translateWarning(w)).join(", ")}
                                      </p>
                                    )}
                                  </div>
                                </React.Fragment>
                              );
                            })}
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                    </Accordion>

                    {/* No good hours message */}
                    {goodHours.length === 0 && (
                      <p className="text-sm text-muted-foreground italic">
                        {t("dialog.noOptimalHours")} {day}
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
        <ScrollArea className={`${scrollAreaHeight} pr-4`}>
          {data.dailyForecast && data.dailyForecast.length > 0 ? (
            <div className="space-y-4">
              {/* Legend */}
              <div className="bg-muted/30 rounded-lg p-3 border border-border">
                <p className="text-xs font-semibold mb-2">{t("dialog.forecastIndicators")}</p>
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                  <div className="flex items-center gap-1.5">
                    <div className="w-3 h-3 rounded bg-green-200/50 dark:bg-green-700/30 border border-green-400/50"></div>
                    <span>{t("dialog.goodClimbingWindows")}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-3 h-3 rounded bg-yellow-200/50 dark:bg-yellow-700/30 border border-yellow-400/50"></div>
                    <span>{t("dialog.fairConditions")}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-3 h-3 rounded bg-muted/30 border border-border"></div>
                    <span>{t("dialog.poorConditions")}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-orange-600">•</span>
                    <span>{t("dialog.lessReliable")}</span>
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

                    const hoursForDay = data.hourlyConditions.filter((hour) => {
                      const hourTime = new Date(hour.time);
                      return hourTime >= dayStart && hourTime < dayEnd;
                    });

                    hasGoodConditions = hoursForDay.some(
                      (h) => h.rating === "Great" || h.rating === "Good"
                    );
                    hasFairConditions = hoursForDay.some((h) => h.rating === "Fair");
                  }

                  let dayLabel: string;
                  if (isToday) {
                    dayLabel = t("dialog.today");
                  } else if (isTomorrow) {
                    dayLabel = t("dialog.tomorrow");
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
                    bgClass =
                      "bg-green-50/70 dark:bg-green-900/20 border-green-200/70 dark:border-green-700/50";
                  } else if (isTomorrow) {
                    bgClass =
                      "bg-blue-50/70 dark:bg-blue-900/20 border-blue-200/70 dark:border-blue-700/50";
                  } else if (hasGoodConditions) {
                    bgClass =
                      "bg-green-50/50 dark:bg-green-900/15 border-green-200/50 dark:border-green-700/30";
                  } else if (hasFairConditions) {
                    bgClass =
                      "bg-yellow-50/50 dark:bg-yellow-900/15 border-yellow-200/50 dark:border-yellow-700/30";
                  }

                  return (
                    <div
                      key={idx}
                      className={`rounded-lg p-4 border ${bgClass} ${isLongTerm ? "opacity-60" : ""}`}
                    >
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3">
                          {/* Weather emoji */}
                          <div
                            className="text-3xl"
                            title={translateWeather(getWeatherDescription(day.weatherCode))}
                          >
                            {getWeatherEmoji(day.weatherCode, isNightTime(12))}
                          </div>
                          <div className="flex items-center gap-2">
                            <Calendar className="w-4 h-4" />
                            <span className="font-semibold">{dayLabel}</span>
                            {isToday && (
                              <span className="rounded-full border border-green-400/30 bg-green-500/10 text-green-700 dark:text-green-300 px-2 py-0.5 text-[10px] font-medium leading-none">
                                {t("dialog.todayBadge")}
                              </span>
                            )}
                            {isLongTerm && (
                              <span className="rounded-full border border-orange-400/30 bg-orange-500/10 text-orange-700 dark:text-orange-300 px-2 py-0.5 text-[10px] font-medium leading-none">
                                {t("dialog.lessCertain")}
                              </span>
                            )}
                          </div>
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {dayDate.toLocaleDateString(locale, {
                            month: "short",
                            day: "numeric",
                          })}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        <div className="bg-background/50 rounded-lg p-2">
                          <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1">
                            <ThermometerSun className="h-3 w-3" />
                            <span>{t("dialog.high")}</span>
                          </div>
                          <p className="text-lg font-semibold">{Math.round(day.tempMax)}°C</p>
                        </div>
                        <div className="bg-background/50 rounded-lg p-2">
                          <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1">
                            <ThermometerSun className="h-3 w-3" />
                            <span>{t("dialog.low")}</span>
                          </div>
                          <p className="text-lg font-semibold">{Math.round(day.tempMin)}°C</p>
                        </div>
                        <div className="bg-background/50 rounded-lg p-2">
                          <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1">
                            <Droplets className="h-3 w-3" />
                            <span>{t("dialog.rain")}</span>
                          </div>
                          <p className="text-lg font-semibold">{day.precipitation.toFixed(1)}mm</p>
                        </div>
                        <div className="bg-background/50 rounded-lg p-2">
                          <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1">
                            <Wind className="h-3 w-3" />
                            <span>{t("dialog.wind")}</span>
                          </div>
                          <p className="text-lg font-semibold">
                            {Math.round(day.windSpeedMax)}km/h
                          </p>
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
              <p className="text-sm text-muted-foreground">{t("dialog.noDailyData")}</p>
            </div>
          )}
        </ScrollArea>
      </TabsContent>
    </Tabs>
  );
});
