import { memo, useMemo, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Info, Star, MessageSquare, ArrowRight } from "lucide-react";
import { getWeatherEmoji, getWeatherDescription } from "@/lib/utils/weather-emojis";
import { logRender } from "@/lib/debug/render-log";
import { MapPopover } from "@/components/crag/MapPopover";
import { getCountryFlag } from "@/lib/utils/country-flag";
import {
  useFavorites,
  useIsFavorited,
  useAddFavorite,
  useRemoveFavorite,
} from "@/hooks/queries/useFavoritesQueries";
import { ReportDialog } from "@/components/reports/ReportDialog";
import { ProfileCreationModal } from "@/components/profile/ProfileCreationModal";
import { ProfileCreatedDialog } from "@/components/profile/ProfileCreatedDialog";
import { generateUniqueSlug } from "@/lib/utils/slug";
import { useUnits } from "@/hooks/useUnits";
import { convertTemperature, convertWindSpeed } from "@/lib/units/conversions";
import { getUserProfile, type UserProfile } from "@/lib/auth/sync-key";
import { useClientTranslation } from "@/hooks/useClientTranslation";

interface ConditionsData {
  location: string;
  locationDetails?: string;
  timeframe?: string;
  label: string;
  summary: string;
  flags?: any;
  reasons?: string[];
  warnings?: string[];
  isDry: boolean;
  latitude?: number;
  longitude?: number;
  cragId?: string;
  cragSlug?: string;
  searchedFor?: string; // Original search term when showing nearby crag
  nearbyMatchDistance?: number; // Distance in meters to nearby crag
  country?: string;
  state?: string;
  municipality?: string;
  village?: string;
  rockType?: string;
  current?: {
    temperature_c: number;
    humidity: number;
    windSpeed_kph: number;
    windDirection?: number;
    precipitation_mm: number;
    weatherCode: number;
  };
  hourlyConditions?: unknown[];
  dry_windows?: unknown[];
}

interface PrefetchedFullData {
  location: { lat: number; lon: number };
  rockType: string;
  current: {
    temperature_c: number;
    humidity: number;
    windSpeed_kph: number;
    windDirection?: number;
    precipitation_mm: number;
    weatherCode: number;
  };
  conditions: {
    label: string;
    summary: string;
    flags: any;
    isDry: boolean;
    reasons?: string[];
    warnings?: string[];
    dry_windows?: any[];
    hourlyConditions?: Array<{
      time: string;
      temp_c: number;
      humidity: number;
      wind_kph: number;
      precip_mm: number;
      dew_point_spread: number;
      warnings: string[];
      weatherCode?: number;
      flags: {
        rain_now: boolean;
        condensation_risk: boolean;
        high_humidity: boolean;
        wet_rock_likely: boolean;
        high_wind: boolean;
        extreme_wind: boolean;
      };
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
      windDirectionDominant?: number;
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
  translateRating: _translateRating,
  translateWarning,
  translateReason,
  onDetailsClick,
  onSheetClick,
  onFullDataFetched,
  conditionsLabel: _conditionsLabel,
  detailsLabel,
  favoriteLabel,
  addReportLabel,
  viewCragPageLabel,
}: WeatherConditionCardProps) {
  const hasEmoji = data.current?.weatherCode !== undefined;
  const router = useRouter();
  const { t } = useClientTranslation("common");
  const [reportDialogOpen, setReportDialogOpen] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showProfileCreated, setShowProfileCreated] = useState(false);
  const [newSyncKey, setNewSyncKey] = useState<string>("");
  const [pendingAction, setPendingAction] = useState<"add" | "remove" | "report" | null>(null);
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

  const handleProfileCreated = (profile: UserProfile) => {
    setNewSyncKey(profile.syncKey);
    setShowProfileModal(false);
    setShowProfileCreated(true);

    // Complete the pending action
    if (pendingAction === "add" && data.latitude && data.longitude) {
      addFavorite.mutate({
        favorite: {
          areaName: data.location,
          location: `${data.country || ""}${data.state ? ", " + data.state : ""}`,
          latitude: data.latitude,
          longitude: data.longitude,
          cragId: data.cragId,
          areaSlug: data.cragSlug,
          rockType: data.rockType,
          lastLabel: data.label,
          lastCheckedAt: new Date().toISOString(),
        },
        previousFavorites: favorites,
      });
    } else if (pendingAction === "remove" && favorite) {
      removeFavorite.mutate(favorite.id);
    } else if (pendingAction === "report") {
      // Open report dialog after profile creation
      setReportDialogOpen(true);
    }

    setPendingAction(null);
  };

  const handleFavoriteToggle = () => {
    const profile = getUserProfile();

    if (!profile) {
      // No profile - show creation modal
      setPendingAction(isFavorited ? "remove" : "add");
      setShowProfileModal(true);
      return;
    }

    // Has profile - proceed with favorite action
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
          areaSlug: data.cragSlug,
          rockType: data.rockType,
          lastLabel: data.label,
          lastCheckedAt: new Date().toISOString(),
        },
        previousFavorites: favorites,
      });
    }
  };

  const handleAddReport = () => {
    const profile = getUserProfile();

    if (!profile) {
      // No profile - show creation modal
      setPendingAction("report");
      setShowProfileModal(true);
      return;
    }

    // Has profile - open report dialog
    setReportDialogOpen(true);
  };

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
            "[WeatherConditionCard] Prefetch complete, label:",
            fullData.conditions?.label || "unknown"
          );
          onFullDataFetched(fullData);
        } catch (error) {
          console.error("[WeatherConditionCard] Prefetch error:", error);
        }
      };

      fetchFullData();
    }
  }, [data.latitude, data.longitude, data.rockType, data.location, onFullDataFetched]);

  // Build location details with flag and nearby match distance
  const { locationText, countryFlag, nearbyText } = useMemo(() => {
    const parts = [
      data.village,
      data.municipality && data.municipality !== data.village ? data.municipality : null,
      data.state,
    ].filter(Boolean);

    // Format nearby match distance
    let nearbyFormatted = null;
    if (data.searchedFor && data.nearbyMatchDistance !== undefined) {
      const distanceKm = data.nearbyMatchDistance / 1000;
      const distanceStr =
        distanceKm >= 1 ? `${distanceKm.toFixed(1)}km` : `${data.nearbyMatchDistance}m`;
      nearbyFormatted = t("nearbyMatch.distance", {
        distance: distanceStr,
        location: data.searchedFor,
      });
    }

    return {
      locationText: parts.join(", "),
      countryFlag: getCountryFlag(data.country),
      nearbyText: nearbyFormatted,
    };
  }, [
    data.village,
    data.municipality,
    data.state,
    data.country,
    data.searchedFor,
    data.nearbyMatchDistance,
  ]);

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
              {(data.cragId && data.cragId !== "") || (data.cragSlug && data.cragSlug !== "") ? (
                <button
                  onClick={() => {
                    const slug =
                      data.cragSlug ||
                      generateUniqueSlug(data.location, data.latitude!, data.longitude!);
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
            {(locationText || countryFlag || nearbyText) && (
              <div className="text-xs text-muted-foreground">
                📍 {locationText}
                {locationText && countryFlag && ", "}
                {countryFlag} {data.country}
                {nearbyText && (locationText || countryFlag) && " • "}
                {nearbyText}
              </div>
            )}
            {hasEmoji && (
              <div className="text-xs text-muted-foreground">
                {translateWeather(getWeatherDescription(data.current!.weatherCode))}
              </div>
            )}
          </div>

          {/* Action buttons row */}
          {(data.hourlyConditions || data.dry_windows) && (
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
                onClick={handleFavoriteToggle}
                disabled={addFavorite.isPending || removeFavorite.isPending}
                title={isFavorited ? "Remove from favorites" : "Add to favorites"}
                className={isFavorited ? "bg-orange-500 hover:bg-orange-600 text-white" : ""}
              >
                <Star className={`w-4 h-4 ${isFavorited ? "fill-current" : ""}`} />
                {favoriteLabel}
              </Button>
              {data.cragId && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleAddReport}
                  title="Add condition report"
                >
                  <MessageSquare className="w-4 h-4" />
                  {addReportLabel}
                </Button>
              )}
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

          {/* Summary */}
          <div className="font-medium text-sm">
            {data.summary}
          </div>

          {/* Current weather stats */}
          {data.current && (
            <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
              <span>🌡 {Math.round(convertTemperature(data.current.temperature_c, "celsius", units.temperature))}{units.temperature === "celsius" ? "°C" : "°F"}</span>
              <span>💧 {Math.round(data.current.humidity)}%</span>
              <span>💨 {Math.round(convertWindSpeed(data.current.windSpeed_kph, "kmh", units.windSpeed))} {units.windSpeed === "kmh" ? "km/h" : units.windSpeed === "mph" ? "mph" : units.windSpeed === "ms" ? "m/s" : "kn"}</span>
              {data.current.precipitation_mm > 0 && <span>🌧 {data.current.precipitation_mm}mm</span>}
            </div>
          )}

          {/* Active flags as pills */}
          {data.flags && (
            <div className="flex flex-wrap gap-1.5">
              {data.flags.rain_now && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400">🌧 {t("flags.rain", "Rain")}</span>}
              {data.flags.rain_expected && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400">🌧 {t("flags.rainExpected", "Rain in {{hours}}h", { hours: data.flags.rain_expected.in_hours })}</span>}
              {data.flags.condensation_risk && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-cyan-500/10 text-cyan-600 dark:text-cyan-400">💧 {t("flags.condensation", "Condensation")}</span>}
              {data.flags.high_humidity && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-slate-500/10 text-slate-600 dark:text-slate-400">💧 {t("flags.highHumidity", "High humidity")}</span>}
              {data.flags.wet_rock_likely && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400">⚠ {t("flags.wetRock", "Wet rock likely")}</span>}
              {data.flags.high_wind && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-orange-500/10 text-orange-600 dark:text-orange-400">💨 {t("flags.windy", "Windy")}</span>}
              {data.flags.extreme_wind && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-red-500/10 text-red-600 dark:text-red-400">💨 {t("flags.extremeWind", "Extreme wind")}</span>}
              {data.flags.sandstone_wet_warning && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-red-500/10 text-red-600 dark:text-red-400">⚠ {t("flags.sandstoneWet", "Sandstone wet")}</span>}
            </div>
          )}

          {/* Warnings */}
          {data.warnings && data.warnings.length > 0 && (
            <div className="text-destructive font-semibold text-sm animate-in fade-in-0 slide-in-from-bottom-2 duration-500">
              ⚠️ {data.warnings.map(translateWarning).join(", ")}
            </div>
          )}

          {/* Sandstone Safety Warning */}
          {data.rockType?.toLowerCase().includes("sandstone") && (
            <div className="bg-destructive/10 border-l-4 border-destructive rounded-r-lg p-3 space-y-1.5 animate-in fade-in-0 slide-in-from-bottom-2 duration-500">
              <div className="text-destructive font-semibold text-sm flex items-start gap-2">
                <span className="shrink-0">⚠️</span>
                <span>{t("sandstoneWarning.general")}</span>
              </div>
              {data.current && data.current.precipitation_mm > 0 && (
                <div className="text-destructive text-xs font-medium pl-6">
                  {t("sandstoneWarning.recentRain")}
                </div>
              )}
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

      {/* Profile Creation Modal */}
      <ProfileCreationModal
        open={showProfileModal}
        onOpenChange={setShowProfileModal}
        trigger={
          pendingAction === "report"
            ? "report"
            : pendingAction === "add" || pendingAction === "remove"
              ? "favorite"
              : "manual"
        }
        onCreated={handleProfileCreated}
      />

      {/* Profile Created Dialog */}
      <ProfileCreatedDialog
        open={showProfileCreated}
        onOpenChange={setShowProfileCreated}
        syncKey={newSyncKey}
        completedAction={favoriteLabel}
      />
    </div>
  );
});
