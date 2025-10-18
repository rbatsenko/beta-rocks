"use client";

import { useState } from "react";
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
import { Cloud, Droplets, Wind, ThermometerSun, Clock, TrendingUp, Calendar } from "lucide-react";

interface ConditionsDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  data: {
    location: string;
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
  };
}

export function ConditionsDetailDialog({ open, onOpenChange, data }: ConditionsDetailDialogProps) {
  const [activeTab, setActiveTab] = useState("overview");

  const getRatingColor = (rating: string) => {
    switch (rating) {
      case "Great":
        return "bg-green-500/10 text-green-500 border-green-500/20";
      case "OK":
        return "bg-blue-500/10 text-blue-500 border-blue-500/20";
      case "Meh":
        return "bg-yellow-500/10 text-yellow-500 border-yellow-500/20";
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

    const timeStr = date.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });

    if (isToday) return `Today ${timeStr}`;
    if (isTomorrow) return `Tomorrow ${timeStr}`;

    return date.toLocaleDateString("en-US", {
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

    data.hourlyConditions.forEach((hour) => {
      const date = new Date(hour.time);
      const isToday = date.toDateString() === now.toDateString();

      const tomorrow = new Date(now);
      tomorrow.setDate(tomorrow.getDate() + 1);
      const isTomorrow = date.toDateString() === tomorrow.toDateString();

      let dayKey: string;
      if (isToday) {
        dayKey = "Today";
      } else if (isTomorrow) {
        dayKey = "Tomorrow";
      } else {
        dayKey = date.toLocaleDateString("en-US", {
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
      const startTime = startDate.toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      });
      const endTime = endDate.toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      });
      return `${startTime}-${endTime}`;
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

      // Skip windows outside the next 5 days
      if (startDate < today || startDate >= fiveDaysFromNow) return;

      const windowDay = new Date(
        startDate.getFullYear(),
        startDate.getMonth(),
        startDate.getDate()
      );

      let displayDay: string;
      let isToday = false;
      let isTomorrow = false;

      if (windowDay.getTime() === today.getTime()) {
        displayDay = "Today";
        isToday = true;
      } else if (windowDay.getTime() === tomorrow.getTime()) {
        displayDay = "Tomorrow";
        isTomorrow = true;
      } else {
        displayDay = startDate.toLocaleDateString("en-US", {
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

  const windowsByDay = groupWindowsByDay();
  const hourlyByDay = groupHourlyByDay();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ThermometerSun className="w-5 h-5" />
            Detailed Conditions: {data.location}
          </DialogTitle>
          <DialogDescription>
            Full weather analysis and climbing conditions forecast
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full flex flex-col">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="hourly">Hourly Forecast</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="mt-4 flex-1 overflow-hidden">
            <ScrollArea className="h-[calc(90vh-240px)] pr-4">
              <div className="space-y-6">
            {/* Current Conditions Summary */}
            <div className="space-y-3">
              <h3 className="font-semibold flex items-center gap-2">
                <Cloud className="w-4 h-4" />
                Current Rating
              </h3>
              <div className="flex items-center gap-3">
                <Badge className={`text-lg px-4 py-2 ${getRatingColor(data.rating)}`}>
                  {data.rating}
                </Badge>
                <span className="text-2xl font-bold">{data.frictionScore}/5</span>
                {data.isDry ? (
                  <Badge variant="outline" className="text-green-600 border-green-600">
                    Dry
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-orange-600 border-orange-600">
                    Wet
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
                    Current Conditions
                  </h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div className="bg-muted/50 rounded-lg p-3">
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
                        <ThermometerSun className="h-3 w-3" />
                        <span>Temperature</span>
                      </div>
                      <p className="text-lg font-semibold">{data.current.temperature_c}°C</p>
                    </div>
                    <div className="bg-muted/50 rounded-lg p-3">
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
                        <Droplets className="h-3 w-3" />
                        <span>Humidity</span>
                      </div>
                      <p className="text-lg font-semibold">{data.current.humidity}%</p>
                    </div>
                    <div className="bg-muted/50 rounded-lg p-3">
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
                        <Wind className="h-3 w-3" />
                        <span>Wind Speed</span>
                      </div>
                      <p className="text-lg font-semibold">{data.current.windSpeed_kph}km/h</p>
                    </div>
                    <div className="bg-muted/50 rounded-lg p-3">
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
                        <Cloud className="h-3 w-3" />
                        <span>Precipitation</span>
                      </div>
                      <p className="text-lg font-semibold">{data.current.precipitation_mm}mm</p>
                    </div>
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
                    Precipitation Context
                  </h3>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="bg-muted/50 rounded-lg p-3">
                      <p className="text-xs text-muted-foreground">Last 24h</p>
                      <p className="text-lg font-semibold">{data.precipitationContext.last24h}mm</p>
                    </div>
                    <div className="bg-muted/50 rounded-lg p-3">
                      <p className="text-xs text-muted-foreground">Last 48h</p>
                      <p className="text-lg font-semibold">{data.precipitationContext.last48h}mm</p>
                    </div>
                    <div className="bg-muted/50 rounded-lg p-3">
                      <p className="text-xs text-muted-foreground">Next 24h</p>
                      <p className="text-lg font-semibold">{data.precipitationContext.next24h}mm</p>
                    </div>
                  </div>
                  {data.dewPointSpread !== undefined && (
                    <div className="bg-muted/50 rounded-lg p-3">
                      <p className="text-xs text-muted-foreground">
                        Dew Point Spread (condensation risk)
                      </p>
                      <p className="text-sm">
                        {data.dewPointSpread > 5
                          ? "✅ Low risk - rock should stay dry"
                          : data.dewPointSpread > 2
                            ? "⚠️ Moderate risk - watch for moisture"
                            : "❌ High risk - condensation likely"}
                      </p>
                      <p className="text-lg font-semibold">{data.dewPointSpread}°C</p>
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
                      Optimal Climbing Windows
                    </h3>
                    <span className="text-xs text-muted-foreground">Next 5 days</span>
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
                                  TODAY
                                </span>
                              )}
                              <span className="text-xs text-muted-foreground ml-auto mr-2">
                                {dayData.windows.length} window{dayData.windows.length > 1 ? "s" : ""}
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
                                      <Clock className="h-3 w-3 text-green-600 dark:text-green-400" />
                                      <span className="text-sm font-medium">{window.timeRange}</span>
                                      <Badge
                                        className={getRatingColor(window.rating)}
                                        variant="outline"
                                      >
                                        {window.rating}
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
                                            <span className="font-mono min-w-[45px]">
                                              {new Date(hour.time).toLocaleTimeString("en-US", {
                                                hour: "2-digit",
                                                minute: "2-digit",
                                                hour12: false,
                                              })}
                                            </span>
                                            <div className="flex items-center gap-2">
                                              <div className="flex items-center gap-0.5">
                                                <ThermometerSun className="h-2.5 w-2.5" />
                                                <span>{hour.temp_c}°C</span>
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
                      🌟 Best time: <span className="font-semibold">{formatHourlyTime(data.optimalTime)}</span>
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
                      Optimal Climbing Windows
                    </h3>
                    <span className="text-xs text-muted-foreground">Next 5 days</span>
                  </div>
                  <div className="flex flex-col items-center justify-center py-8 text-center">
                    <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-3">
                      <Clock className="h-6 w-6 text-muted-foreground" />
                    </div>
                    <p className="text-sm text-muted-foreground">
                      No optimal conditions in the next 5 days
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Check hourly forecast for more details
                    </p>
                  </div>
                </div>
                <Separator />
              </>
            ) : null}

            {/* Weather Monitoring Disclaimer */}
            <div className="mt-6 p-3 bg-muted/30 rounded-lg border border-border">
              <p className="text-xs text-muted-foreground text-center">
                ⚠️ Weather conditions can change rapidly. Always monitor forecasts before heading out and check conditions on arrival.
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
                  {Object.entries(hourlyByDay).map(([day, hours]) => (
                    <div key={day} className="space-y-3">
                      <h3 className="font-semibold flex items-center gap-2 sticky top-0 bg-background z-10 py-2">
                        <Calendar className="w-4 h-4" />
                        {day}
                      </h3>
                      <div className="space-y-2">
                        {hours.map((hour, i) => (
                          <div
                            key={i}
                            className={`rounded-lg p-3 border ${
                              hour.frictionScore >= 4
                                ? "bg-green-500/5 border-green-500/20"
                                : "bg-muted/30 border-border"
                            }`}
                          >
                            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                              <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
                                <span className="font-mono text-sm font-semibold min-w-[60px]">
                                  {new Date(hour.time).toLocaleTimeString("en-US", {
                                    hour: "2-digit",
                                    minute: "2-digit",
                                    hour12: false,
                                  })}
                                </span>
                                <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                                  <div className="flex items-center gap-1">
                                    <ThermometerSun className="h-3 w-3" />
                                    <span>{hour.temp_c}°C</span>
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
                                  {hour.rating}
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
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <Wind className="w-12 h-12 text-muted-foreground mb-3" />
                  <p className="text-sm text-muted-foreground">No hourly forecast data available</p>
                </div>
              )}
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
