"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Cloud, Droplets, Wind, ThermometerSun, Clock, TrendingUp } from "lucide-react";

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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ThermometerSun className="w-5 h-5" />
            Detailed Conditions: {data.location}
          </DialogTitle>
          <DialogDescription>
            Full weather analysis and climbing conditions forecast
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[calc(85vh-120px)] pr-4">
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
            {data.optimalWindows && data.optimalWindows.length > 0 && (
              <>
                <div className="space-y-3">
                  <h3 className="font-semibold flex items-center gap-2">
                    <TrendingUp className="w-4 h-4" />
                    Optimal Climbing Windows
                  </h3>
                  <div className="space-y-2">
                    {data.optimalWindows.map((window, i) => (
                      <div
                        key={i}
                        className="bg-muted/50 rounded-lg p-3 flex items-center justify-between"
                      >
                        <div className="flex items-center gap-3">
                          <Clock className="w-4 h-4 text-muted-foreground" />
                          <div>
                            <p className="font-medium">
                              {window.startTime} - {window.endTime}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {window.hourCount} hours
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge className={getRatingColor(window.rating)}>{window.rating}</Badge>
                          <span className="text-sm font-semibold">{window.avgFrictionScore}/5</span>
                        </div>
                      </div>
                    ))}
                  </div>
                  {data.optimalTime && (
                    <p className="text-sm text-muted-foreground">
                      🌟 Best time: <span className="font-semibold">{data.optimalTime}</span>
                    </p>
                  )}
                </div>
                <Separator />
              </>
            )}

            {/* Hourly Forecast */}
            {data.hourlyConditions && data.hourlyConditions.length > 0 && (
              <div className="space-y-3">
                <h3 className="font-semibold flex items-center gap-2">
                  <Wind className="w-4 h-4" />
                  Hourly Forecast (Next 48h)
                </h3>
                <div className="space-y-2">
                  {data.hourlyConditions.slice(0, 24).map((hour, i) => (
                    <div
                      key={i}
                      className={`rounded-lg p-3 border ${
                        hour.frictionScore >= 4
                          ? "bg-green-500/5 border-green-500/20"
                          : "bg-muted/30 border-border"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <span className="font-mono text-sm font-semibold w-16">{hour.time}</span>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <span>{hour.temp_c}°C</span>
                            <span>•</span>
                            <span>{hour.humidity}%</span>
                            <span>•</span>
                            <span>{hour.wind_kph}km/h</span>
                            {hour.precip_mm > 0 && (
                              <>
                                <span>•</span>
                                <span className="text-blue-500">{hour.precip_mm}mm</span>
                              </>
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
                        <p className="text-xs text-muted-foreground mt-1 ml-20">
                          {hour.warnings.join(", ")}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
