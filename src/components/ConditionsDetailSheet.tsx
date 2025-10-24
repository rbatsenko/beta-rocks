"use client";

import { memo, useMemo } from "react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { ThermometerSun } from "lucide-react";
import { useClientTranslation } from "@/hooks/useClientTranslation";
import { ConditionsDetailContent } from "./ConditionsDetailContent";
import { MapPopover } from "./MapPopover";
import { getCountryFlag } from "@/lib/utils/country-flag";

interface ConditionsDetailSheetProps {
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

export const ConditionsDetailSheet = memo(function ConditionsDetailSheet({
  open,
  onOpenChange,
  data,
}: ConditionsDetailSheetProps) {
  const { t } = useClientTranslation("common");

  // Build detailed location string with flag (same logic as Dialog)
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
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-3xl overflow-hidden p-0 flex flex-col">
        <SheetHeader className="px-4 sm:px-6 pt-3 sm:pt-6 pb-2 sm:pb-4 pr-12 border-b shrink-0">
          <SheetTitle className="text-lg sm:text-xl font-semibold">
            <div className="flex items-center gap-1.5 sm:gap-2">
              <ThermometerSun className="w-4 h-4 sm:w-5 sm:h-5 shrink-0" />
              <span className="truncate">{t("dialog.detailedConditions")}: {data.location}</span>
            </div>
          </SheetTitle>
          <SheetDescription className="flex flex-col gap-1 sm:gap-2">
            <span className="hidden sm:inline">{t("dialog.fullAnalysis")}</span>
            <span className="flex items-center gap-1.5 sm:gap-2">
              {(locationText || countryFlag) && (
                <span className="text-xs sm:text-sm text-muted-foreground flex-1 truncate">
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
          </SheetDescription>
        </SheetHeader>
        <div className="flex-1 overflow-hidden px-4 sm:px-6 py-3 sm:py-4">
          <ConditionsDetailContent variant="sheet" data={data} />
        </div>
      </SheetContent>
    </Sheet>
  );
});
