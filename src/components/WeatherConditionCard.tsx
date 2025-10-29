import { memo, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Info, Star, MessageSquare, ArrowRight } from "lucide-react";
import { getWeatherEmoji, getWeatherDescription } from "@/lib/utils/weather-emojis";
import { logRender } from "@/lib/debug/render-log";
import { MapPopover } from "@/components/MapPopover";
import { getCountryFlag } from "@/lib/utils/country-flag";
import {
  useFavorites,
  useIsFavorited,
  useAddFavorite,
  useRemoveFavorite,
} from "@/hooks/queries/useFavoritesQueries";
import { ReportDialog } from "@/components/ReportDialog";
import { generateUniqueSlug } from "@/lib/utils/slug";
import { useUnits } from "@/hooks/useUnits";
import { convertTemperature } from "@/lib/units/conversions";
import { useState } from "react";

interface ConditionsData {
  location: string;
  locationDetails?: string;
  timeframe?: string;
  rating: string;
  frictionScore: number;
  reasons?: string[];
  warnings?: string[];
  isDry: boolean;
  latitude?: number;
  longitude?: number;
  cragId?: string;
  country?: string;
  state?: string;
  municipality?: string;
  village?: string;
  rockType?: string;
  current?: {
    temperature_c: number;
    humidity: number;
    windSpeed_kph: number;
    precipitation_mm: number;
    weatherCode: number;
  };
  hourlyConditions?: unknown[];
  optimalWindows?: unknown[];
}

interface PrefetchedFullData {
  location: { lat: number; lon: number };
  rockType: string;
  current: {
    temperature_c: number;
    humidity: number;
    windSpeed_kph: number;
    precipitation_mm: number;
    weatherCode: number;
  };
  conditions: {
    rating: string;
    frictionRating: number;
    isDry: boolean;
    reasons?: string[];
    warnings?: string[];
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
  astro?: {
    sunrise: string;
    sunset: string;
  };
  updatedAt: string;
}

interface WeatherConditionCardProps {
  data: ConditionsData;
  translateWeather: (description: string) => string;
  translateRating: (rating: string) => string;
  translateWarning: (warning: string) => string;
  translateReason: (reason: string) => string;
  onDetailsClick: () => void;
  onSheetClick?: () => void;
  onFullDataFetched?: (fullData: PrefetchedFullData) => void; // Callback when full 14-day data is prefetched
  conditionsLabel: string;
  detailsLabel: string;
  favoriteLabel: string;
  addReportLabel: string;
  viewCragPageLabel: string;
}

function isNightTime(date: Date): boolean {
  const hour = date.getHours();
  return hour >= 19 || hour < 7;
}

export const WeatherConditionCard = memo(function WeatherConditionCard({
  data,
  translateWeather,
  translateRating,
  translateWarning,
  translateReason,
  onDetailsClick,
  onSheetClick,
  onFullDataFetched,
  conditionsLabel,
  detailsLabel,
  favoriteLabel,
  addReportLabel,
  viewCragPageLabel,
}: WeatherConditionCardProps) {
  const hasEmoji = data.current?.weatherCode !== undefined;
  const router = useRouter();
  const [reportDialogOpen, setReportDialogOpen] = useState(false);
  const { units } = useUnits();

  // React Query hooks for favorites
  const { data: favorites = [] } = useFavorites();
  const { isFavorited, favorite } = useIsFavorited(
    data.cragId,
    undefined,
    data.latitude && data.longitude ? { lat: data.latitude, lon: data.longitude } : undefined
  );
  const addFavorite = useAddFavorite();
  const removeFavorite = useRemoveFavorite();

  logRender("WeatherConditionCard", {
    location: data.location,
    hasEmoji,
    warnings: data.warnings?.length ?? 0,
    reasons: data.reasons?.length ?? 0,
  });

  // Prefetch full 14-day data from /api/conditions when card is shown
  // This reduces AI token costs by 87% while maintaining UX
  useEffect(() => {
    if (data.latitude && data.longitude && data.rockType && onFullDataFetched) {
      console.log("[WeatherConditionCard] Prefetching full 14-day data for", data.location);

      const fetchFullData = async () => {
        try {
          const params = new URLSearchParams({
            lat: data.latitude!.toString(),
            lon: data.longitude!.toString(),
            rockType: data.rockType!,
          });

          const response = await fetch(`/api/conditions?${params}`);
          if (!response.ok) {
            console.error("[WeatherConditionCard] Failed to prefetch:", response.statusText);
            return;
          }

          const fullData = await response.json();
          console.log(
            "[WeatherConditionCard] Prefetch complete, hourly count:",
            fullData.conditions?.hourlyConditions?.length || 0
          );
          onFullDataFetched(fullData);
        } catch (error) {
          console.error("[WeatherConditionCard] Prefetch error:", error);
        }
      };

      fetchFullData();
    }
  }, [data.latitude, data.longitude, data.rockType, data.location, onFullDataFetched]);

  // Build location details with flag
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
    <div className="bg-muted/50 rounded-lg p-3 sm:p-4 border border-border w-full max-w-2xl transition-all duration-500 ease-out will-change-[max-width,transform]">
      <div className="flex gap-3 sm:gap-4">
        {/* Weather emoji */}
        {hasEmoji && (
          <div className="shrink-0 w-10 sm:w-12 text-center">
            <div
              className="text-3xl sm:text-4xl leading-none"
              title={translateWeather(getWeatherDescription(data.current!.weatherCode))}
            >
              {getWeatherEmoji(data.current!.weatherCode, isNightTime(new Date()))}
            </div>
            {typeof data.current?.temperature_c === "number" && (
              <div className="mt-1 text-[10px] sm:text-xs leading-tight text-muted-foreground">
                {Math.round(
                  convertTemperature(data.current.temperature_c, "celsius", units.temperature)
                )}
                {units.temperature === "celsius" ? "°C" : "°F"}
              </div>
            )}
          </div>
        )}

        {/* Main content */}
        <div className="flex-1 min-w-0 space-y-2 sm:space-y-2.5">
          {/* Header */}
          <div className="space-y-0.5">
            <div className="font-semibold text-base flex items-center gap-1.5">
              🧗
              {data.latitude && data.longitude ? (
                <button
                  onClick={() => {
                    const slug = generateUniqueSlug(data.location, data.latitude!, data.longitude!);

                    router.push(`/location/${slug}`);
                  }}
                  className="hover:text-orange-500 transition-colors cursor-pointer inline-flex items-center gap-1 group"
                  title={viewCragPageLabel}
                >
                  <span>{data.location}</span>
                  <ArrowRight className="w-4 h-4 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity" />
                </button>
              ) : (
                <span>{data.location}</span>
              )}
            </div>
            {(locationText || countryFlag) && (
              <div className="text-xs text-muted-foreground">
                📍 {locationText}
                {locationText && countryFlag && ", "}
                {countryFlag} {data.country}
              </div>
            )}
            {hasEmoji && (
              <div className="text-xs text-muted-foreground">
                {translateWeather(getWeatherDescription(data.current!.weatherCode))}
              </div>
            )}
          </div>

          {/* Action buttons row */}
          {(data.hourlyConditions || data.optimalWindows) && (
            <div className="flex flex-wrap gap-2">
              {data.latitude && data.longitude && (
                <MapPopover
                  latitude={data.latitude}
                  longitude={data.longitude}
                  locationName={data.location}
                />
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  if (isFavorited && favorite) {
                    removeFavorite.mutate(favorite.id);
                  } else if (data.latitude && data.longitude) {
                    addFavorite.mutate({
                      favorite: {
                        areaName: data.location,
                        location: `${data.country || ""}${data.state ? ", " + data.state : ""}`,
                        latitude: data.latitude,
                        longitude: data.longitude,
                        cragId: data.cragId,
                        rockType: data.rockType,
                        lastRating: data.rating,
                        lastFrictionScore: data.frictionScore,
                        lastCheckedAt: new Date().toISOString(),
                      },
                      previousFavorites: favorites,
                    });
                  }
                }}
                title={isFavorited ? "Remove from favorites" : "Add to favorites"}
                className={isFavorited ? "bg-orange-500 hover:bg-orange-600 text-white" : ""}
              >
                <Star className={`w-4 h-4 ${isFavorited ? "fill-current" : ""}`} />
                {favoriteLabel}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setReportDialogOpen(true)}
                disabled={!data.cragId}
                title="Add condition report"
              >
                <MessageSquare className="w-4 h-4" />
                {addReportLabel}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={onSheetClick || onDetailsClick}
                title="View details"
              >
                <Info className="w-4 h-4" />
                {detailsLabel}
              </Button>
            </div>
          )}

          {/* Conditions */}
          <div className="font-medium">
            {conditionsLabel}: {translateRating(data.rating)} ({data.frictionScore}/5)
          </div>

          {/* Warnings */}
          {data.warnings && data.warnings.length > 0 && (
            <div className="text-destructive font-semibold text-sm animate-in fade-in-0 slide-in-from-bottom-2 duration-500">
              ⚠️ {data.warnings.map(translateWarning).join(", ")}
            </div>
          )}

          {/* Reasons */}
          {data.reasons && data.reasons.length > 0 && (
            <div className="text-sm opacity-80 animate-in fade-in-0 slide-in-from-bottom-2 duration-500 delay-100">
              {data.reasons.map(translateReason).join(", ")}
            </div>
          )}
        </div>
      </div>

      {/* Report Dialog */}
      {data.cragId && (
        <ReportDialog
          open={reportDialogOpen}
          onOpenChange={setReportDialogOpen}
          cragId={data.cragId}
          cragName={data.location}
          onReportCreated={() => {
            console.log("Report created for", data.location);
            // TODO: Optionally reload reports in detail dialog
          }}
        />
      )}
    </div>
  );
});
