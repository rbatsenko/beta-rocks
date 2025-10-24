"use client";

import { memo, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ThermometerSun } from "lucide-react";
import { useClientTranslation } from "@/hooks/useClientTranslation";
import { logRender } from "@/lib/debug/render-log";
import { ConditionsDetailContent } from "./ConditionsDetailContent";
import { MapPopover } from "./MapPopover";
import { getCountryFlag } from "@/lib/utils/country-flag";

interface ConditionsDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
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

export const ConditionsDetailDialog = memo(function ConditionsDetailDialog({
  open,
  onOpenChange,
  data,
}: ConditionsDetailDialogProps) {
  const { t } = useClientTranslation("common");

  logRender("ConditionsDetailDialog", {
    open,
    hasHourly: !!data.hourlyConditions?.length,
    hasDaily: !!data.dailyForecast?.length,
    hasWindows: !!data.optimalWindows?.length,
  });

  // Build detailed location string with flag
  const { locationText, countryFlag } = useMemo(() => {
    const parts = [
      data.village,
      data.municipality && data.municipality !== data.village ? data.municipality : null,
      data.state,
    ].filter(Boolean);

    return {
      locationText: parts.join(", "),
      countryFlag: getCountryFlag(data.country),
    };
  }, [data.village, data.municipality, data.state, data.country]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>
            <div className="flex items-center gap-2">
              <ThermometerSun className="w-5 h-5" />
              {t("dialog.detailedConditions")}: {data.location}
            </div>
          </DialogTitle>
          <DialogDescription className="flex flex-col gap-2">
            <span>{t("dialog.fullAnalysis")}</span>
            <span className="flex items-center gap-2">
              {(locationText || countryFlag) && (
                <span className="text-sm text-muted-foreground flex-1">
                  📍 {locationText}
                  {locationText && countryFlag && ", "}
                  {countryFlag} {data.country}
                </span>
              )}
              {data.latitude && data.longitude && (
                <MapPopover
                  latitude={data.latitude}
                  longitude={data.longitude}
                  locationName={data.location}
                />
              )}
            </span>
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 min-h-0">
          <ConditionsDetailContent data={data} />
        </div>
      </DialogContent>
    </Dialog>
  );
});
