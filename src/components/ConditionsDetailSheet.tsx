"use client";

import { memo, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { ThermometerSun, Sun, ArrowRight } from "lucide-react";
import { useClientTranslation } from "@/hooks/useClientTranslation";
import { ConditionsDetailContent } from "./ConditionsDetailContent";
import { MapPopover } from "./MapPopover";
import { getCountryFlag } from "@/lib/utils/country-flag";
import { getSunCalcUrl } from "@/lib/utils/urls";
import { generateUniqueSlug } from "@/lib/utils/slug";
import { useLoadingState } from "@/components/NavigationProgress";

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
  const router = useRouter();
  const { startLoading } = useLoadingState();

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

  // Generate SunCalc.org URL for sun position/shadow analysis
  const sunCalcUrl = getSunCalcUrl(data.latitude, data.longitude);

  // Handler for navigating to full crag page
  const handleViewCragPage = () => {
    if (data.latitude && data.longitude) {
      const slug = generateUniqueSlug(data.location, data.latitude, data.longitude);
      startLoading();
      router.push(`/location/${slug}`);
      onOpenChange(false); // Close the sheet
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-3xl overflow-hidden p-0 flex flex-col">
        <SheetHeader className="px-4 sm:px-6 pt-3 sm:pt-4 pb-2 sm:pb-3 pr-12 border-b shrink-0 space-y-2">
          <SheetTitle className="text-lg sm:text-xl font-semibold">
            <div className="flex items-center gap-1.5 sm:gap-2">
              <ThermometerSun className="w-4 h-4 sm:w-5 sm:h-5 shrink-0" />
              <span className="truncate">
                {t("dialog.detailedConditions")}: {data.location}
              </span>
            </div>
          </SheetTitle>
          <SheetDescription className="flex flex-col gap-1">
            <span className="hidden sm:inline text-xs">{t("dialog.fullAnalysis")}</span>
            {(locationText || countryFlag) && (
              <span className="text-xs text-muted-foreground">
                📍 {locationText}
                {locationText && countryFlag && ", "}
                {countryFlag} {data.country}
              </span>
            )}
          </SheetDescription>
          <div className="flex flex-wrap gap-2 pt-1">
            {data.latitude && data.longitude && (
              <div>
                <MapPopover
                  latitude={data.latitude}
                  longitude={data.longitude}
                  locationName={data.location}
                />
              </div>
            )}
            {data.latitude && data.longitude && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  if (sunCalcUrl) window.open(sunCalcUrl, "_blank", "noopener,noreferrer");
                }}
                title="View sun position and shadow angles on SunCalc.org"
                className="h-8"
              >
                <Sun className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                <span className="hidden sm:inline">SunCalc</span>
              </Button>
            )}
            {data.latitude && data.longitude && (
              <Button
                variant="default"
                size="sm"
                onClick={handleViewCragPage}
                title={t("conditions.viewCragPage")}
                className="h-8 bg-orange-500 hover:bg-orange-600"
              >
                <ArrowRight className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                <span className="hidden sm:inline">{t("conditions.viewCragPage")}</span>
              </Button>
            )}
          </div>
        </SheetHeader>
        <div className="flex-1 overflow-hidden px-4 sm:px-6 py-3 sm:py-4">
          <ConditionsDetailContent variant="sheet" data={data} />
        </div>
      </SheetContent>
    </Sheet>
  );
});
