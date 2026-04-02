"use client";

import { useState, useCallback, useMemo, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  MapPin,

  Heart,
  Plus,
  Sun,
  Map,
  CloudSun,
  AlertTriangle,
  Lock,
  Mountain,
  Home,
  MessageSquare,
  Loader2,
  ThermometerSun,
  Droplets,
  Wind,
  CloudRain,
  Sunrise,
  Sunset,
  Search,
  Pencil,
  Layers,
  EyeOff,
  Share2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { OpenInAppBanner } from "@/components/crag/OpenInAppBanner";
import { ConditionsDetailContent } from "@/components/conditions/ConditionsDetailContent";
import { ReportCard } from "@/components/reports/ReportCard";
import { ReportDialog } from "@/components/reports/ReportDialog";
import { ProfileCreationModal } from "@/components/profile/ProfileCreationModal";
import { ProfileCreatedDialog } from "@/components/profile/ProfileCreatedDialog";
import { ConfirmDialog } from "@/components/dialogs/ConfirmDialog";
import { EditCragDialog } from "@/components/dialogs/EditCragDialog";
import { AddSectorModal } from "@/components/dialogs/AddSectorModal";
import { WebcamsSection } from "@/components/crag/WebcamsSection";
import { useClientTranslation } from "@/hooks/useClientTranslation";
import { useConditionsTranslations } from "@/hooks/useConditionsTranslations";
import { useRouter } from "next/navigation";
import { toast } from "@/hooks/use-toast";
import {
  useFavorites,
  useIsFavorited,
  useAddFavorite,
  useRemoveFavorite,
} from "@/hooks/queries/useFavoritesQueries";
import { getSunCalcUrl, getGoogleMapsUrl, getOpenStreetMapEmbedUrl } from "@/lib/utils/urls";
import { getCountryFlag } from "@/lib/utils/country-flag";
import { fetchReportsByCrag } from "@/lib/db/queries";
import { getUserProfile, type UserProfile } from "@/lib/auth/sync-key";
import { getWeatherEmoji, getWeatherDescription } from "@/lib/utils/weather-emojis";
import { useUnits } from "@/hooks/useUnits";
import {
  convertTemperature,
  convertWindSpeed,
  convertPrecipitation,
  formatTemperature,
  formatWindSpeed,
  formatPrecipitation,
  getWindCardinal,
  getWindArrowRotation,
} from "@/lib/units/conversions";

type ReportCategory = "conditions" | "safety" | "access" | "climbing_info" | "facilities" | "other";

interface CragPageContentProps {
  crag: {
    id: string;
    name: string;
    slug: string | null;
    lat: number | null;
    lon: number | null;
    rock_type: string | null;
    country: string | null;
    state: string | null;
    municipality: string | null;
    village: string | null;
    description: string | null;
    parent_crag_id?: string | null;
    parent_crag?: {
      name: string;
    } | null;
    is_secret?: boolean;
  };
  sectors: any[];
  currentSector?: any | null;
}

interface ConditionsData {
  label: string;
  summary: string;
  flags?: any;
  reasons?: string[];
  warnings?: string[];
  isDry: boolean;
  dryingTimeHours?: number;
  current?: {
    temperature_c: number;
    humidity: number;
    windSpeed_kph: number;
    windDirection?: number;
    precipitation_mm: number;
    weatherCode: number;
  };
  hourlyConditions?: Array<{
    time: string;
    temp_c: number;
    humidity: number;
    wind_kph: number;
    wind_direction?: number;
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
  dry_windows?: Array<{
    startTime: string;
    endTime: string;
    hourCount: number;
    hours: number;
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
    windDirectionDominant?: number;
    sunrise: string;
    sunset: string;
    weatherCode: number;
  }>;
}

async function fetchConditionsByCragId(cragId: string): Promise<ConditionsData> {
  const res = await fetch(`/api/conditions/${cragId}`);
  if (!res.ok) {
    throw new Error("Failed to fetch conditions");
  }
  const data = await res.json();
  const c = data.conditions;

  // Map new weather response shape to what the UI expects
  if (c.weather?.now && !c.current) {
    c.current = {
      temperature_c: c.weather.now.temp_c,
      humidity: c.weather.now.humidity,
      windSpeed_kph: c.weather.now.wind_kph,
      windDirection: c.weather.now.wind_direction,
      precipitation_mm: c.weather.now.precip_mm,
      weatherCode: c.weather.now.weather_code ?? 0,
    };
  }
  if (c.weather?.hourly && !c.hourlyConditions) {
    c.hourlyConditions = c.weather.hourly;
  }
  if (c.weather?.daily && !c.dailyForecast) {
    c.dailyForecast = c.weather.daily.map((d: any) => ({
      date: d.date,
      tempMax: d.temp_max_c,
      tempMin: d.temp_min_c,
      precipitation: d.precipitation_mm,
      windSpeedMax: d.wind_speed_max_kph,
      sunrise: d.sunrise,
      sunset: d.sunset,
      weatherCode: d.weather_code,
    }));
  }
  if (c.precipitation && !c.precipitationContext) {
    c.precipitationContext = c.precipitation;
  }
  if (!c.isDry && c.flags) {
    c.isDry = !c.flags.rain_now && !c.flags.wet_rock_likely;
  }

  return c;
}

async function fetchReportsByCragId(cragId: string) {
  return fetchReportsByCrag(cragId, 20);
}

// Helper to detect if it's night time (7pm-7am)
function isNightTime(date: Date): boolean {
  const hour = date.getHours();
  return hour >= 19 || hour < 7;
}

// Helper to extract local time from ISO string without timezone conversion
function extractLocalTime(isoString: string): string {
  // Extract time portion from ISO string (format: "2024-11-03T06:45:00+01:00" or "2024-11-03T06:45:00")
  const match = isoString.match(/T(\d{2}):(\d{2})/);
  if (match) {
    return `${match[1]}:${match[2]}`;
  }
  return isoString;
}

export function CragPageContent({ crag, sectors, currentSector }: CragPageContentProps) {
  const { t } = useClientTranslation("common");
  const { translateWeather } = useConditionsTranslations(t);
  const router = useRouter();
  const { units } = useUnits();
  const [reportDialogOpen, setReportDialogOpen] = useState(false);
  const [editingReport, setEditingReport] = useState<any | null>(null);
  const [deletingReportId, setDeletingReportId] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<"all" | ReportCategory>("all");
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showProfileCreated, setShowProfileCreated] = useState(false);
  const [newSyncKey, setNewSyncKey] = useState<string>("");
  const [pendingAction, setPendingAction] = useState<"add" | "remove" | "report" | null>(null);
  const [currentUserProfileId, setCurrentUserProfileId] = useState<string | null>(null);
  const [sectorSearchQuery, setSectorSearchQuery] = useState<string>("");
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showAddSectorModal, setShowAddSectorModal] = useState(false);

  // Check if this is a secret crag (no location data shown)
  const isSecretCrag = crag.is_secret === true;

  // Check if this is a locationless crag (no coordinates at all)
  const isLocationless = crag.lat == null || crag.lon == null;

  // React Query for conditions (client-side)
  // Use sector ID if viewing a sector with valid coordinates, otherwise use crag ID
  // For secret crags, coords point to a reference city for weather
  // For locationless crags, skip conditions fetch entirely
  const locationId =
    currentSector && currentSector.lat !== null && currentSector.lon !== null
      ? currentSector.id
      : crag.id;
  const {
    data: conditions,
    isLoading: isLoadingConditions,
    error: conditionsError,
  } = useQuery({
    queryKey: ["conditions", locationId],
    queryFn: () => fetchConditionsByCragId(locationId),
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    enabled: !isLocationless, // Don't fetch conditions for locationless crags
  });

  // React Query for reports (client-side)
  const {
    data: reports = [],
    isLoading: isLoadingReports,
    refetch: refetchReports,
  } = useQuery({
    queryKey: ["reports", crag.id],
    queryFn: () => fetchReportsByCragId(crag.id),
    staleTime: 2 * 60 * 1000, // 2 minutes (reports change more frequently)
    gcTime: 5 * 60 * 1000, // 5 minutes
  });

  // React Query hooks for favorites
  const { data: favorites = [] } = useFavorites();
  const { isFavorited, favorite } = useIsFavorited(crag.id, undefined, crag.lat != null && crag.lon != null ? {
    lat: crag.lat,
    lon: crag.lon,
  } : undefined);
  const addFavorite = useAddFavorite();
  const removeFavorite = useRemoveFavorite();

  // Filter and sort reports by selected category (expired reports go to bottom)
  const filteredReports = useMemo(() => {
    const filtered =
      selectedCategory === "all"
        ? reports
        : reports.filter((report) => report.category === selectedCategory);

    // Sort: non-expired first, then expired, within each group maintain existing order
    return filtered.sort((a, b) => {
      const aExpired = a.expires_at && new Date(a.expires_at) < new Date();
      const bExpired = b.expires_at && new Date(b.expires_at) < new Date();

      if (aExpired === bExpired) return 0; // Maintain existing order within groups
      return aExpired ? 1 : -1; // Expired go to bottom
    });
  }, [reports, selectedCategory]);

  // Filter sectors by search query
  const filteredSectors = useMemo(() => {
    if (!sectorSearchQuery.trim()) {
      return sectors;
    }
    const query = sectorSearchQuery.toLowerCase();
    return sectors.filter(
      (sector) =>
        sector.name.toLowerCase().includes(query) ||
        (sector.description && sector.description.toLowerCase().includes(query))
    );
  }, [sectors, sectorSearchQuery]);

  // Format location details
  const locationParts = [crag.village, crag.municipality, crag.state, crag.country].filter(Boolean);
  const locationString = locationParts.join(", ");
  const countryFlag = getCountryFlag(crag.country);

  // Use sector coordinates if available and valid, otherwise use crag coordinates
  const displayLat = currentSector && currentSector.lat !== null ? currentSector.lat : crag.lat;
  const displayLon = currentSector && currentSector.lon !== null ? currentSector.lon : crag.lon;
  const hasCoordinates = displayLat != null && displayLon != null;

  // Format conditions data for ConditionsDetailContent
  const conditionsData = conditions
    ? {
        location: currentSector ? `${currentSector.name} • ${crag.name}` : crag.name,
        locationDetails: locationString,
        latitude: displayLat ?? undefined,
        longitude: displayLon ?? undefined,
        country: crag.country ?? undefined,
        state: crag.state ?? undefined,
        municipality: crag.municipality ?? undefined,
        village: crag.village ?? undefined,
        ...conditions,
      }
    : null;

  const handleProfileCreated = (profile: UserProfile) => {
    setNewSyncKey(profile.syncKey);
    setShowProfileModal(false);
    setShowProfileCreated(true);

    // Complete the pending action
    if (pendingAction === "add") {
      addFavorite.mutate({
        favorite: {
          areaName: crag.name,
          areaSlug: crag.slug || undefined,
          location: locationString,
          latitude: crag.lat ?? 0,
          longitude: crag.lon ?? 0,
          cragId: crag.id,
          rockType: crag.rock_type || undefined,
          lastLabel: isLocationless ? undefined : (conditions?.label || "unknown"),
          lastCheckedAt: isLocationless ? undefined : new Date().toISOString(),
          isLocationless: isLocationless || undefined,
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

  const handleToggleFavorite = () => {
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
    } else {
      addFavorite.mutate({
        favorite: {
          areaName: crag.name,
          areaSlug: crag.slug || undefined,
          location: locationString,
          latitude: crag.lat ?? 0,
          longitude: crag.lon ?? 0,
          cragId: crag.id,
          rockType: crag.rock_type || undefined,
          lastLabel: isLocationless ? undefined : (conditions?.label || "unknown"),
          lastCheckedAt: isLocationless ? undefined : new Date().toISOString(),
          isLocationless: isLocationless || undefined,
        },
        previousFavorites: favorites,
      });
    }
  };

  const handleReportCreated = useCallback(async () => {
    // Refetch reports using React Query
    await refetchReports();
    console.log(`[CragPageContent] Refetched reports after creation`);
  }, [refetchReports]);

  // Load current user profile ID for checking authorship
  useEffect(() => {
    const loadUserProfile = async () => {
      const profile = getUserProfile();
      if (profile) {
        const { hashSyncKeyAsync } = await import("@/lib/auth/sync-key");
        const { fetchOrCreateUserProfile } = await import("@/lib/db/queries");
        const syncKeyHash = await hashSyncKeyAsync(profile.syncKey);
        const dbProfile = await fetchOrCreateUserProfile(syncKeyHash);
        setCurrentUserProfileId(dbProfile.id);
      }
    };
    loadUserProfile();
  }, []);

  const handleEditReport = (report: any) => {
    setEditingReport(report);
    setReportDialogOpen(true);
  };

  const handleDeleteReport = (reportId: string) => {
    setDeletingReportId(reportId);
  };

  const confirmDeleteReport = async () => {
    if (!deletingReportId) return;

    try {
      const profile = getUserProfile();
      if (!profile) return;

      const { hashSyncKeyAsync } = await import("@/lib/auth/sync-key");
      const { fetchOrCreateUserProfile } = await import("@/lib/db/queries");
      const syncKeyHash = await hashSyncKeyAsync(profile.syncKey);
      const dbProfile = await fetchOrCreateUserProfile(syncKeyHash);

      const response = await fetch(
        `/api/reports/${deletingReportId}?userProfileId=${dbProfile.id}`,
        {
          method: "DELETE",
        }
      );

      if (!response.ok) {
        throw new Error("Failed to delete report");
      }

      // Refetch reports
      await refetchReports();

      // Show success toast
      toast({
        title: t("reports.deleteSuccess"),
        description: t("reports.deleteSuccessDescription"),
      });

      setDeletingReportId(null);
    } catch (error) {
      console.error("Failed to delete report:", error);
      toast({
        title: t("reports.deleteError"),
        description: t("reports.deleteErrorDescription"),
        variant: "destructive",
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

  const handleShare = async () => {
    const url = crag.slug
      ? `${window.location.origin}/location/${crag.slug}`
      : window.location.href;
    const shareData = { title: crag.name, url };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
        return;
      } catch (error: unknown) {
        const isAbort =
          typeof error === "object" &&
          error !== null &&
          "name" in error &&
          (error as { name: string }).name === "AbortError";
        if (isAbort) return;
        // Fall through to clipboard fallback for non-cancel errors
      }
    }

    try {
      await navigator.clipboard.writeText(url);
      toast({ description: t("cragPage.linkCopied") });
    } catch {
      // Clipboard API unavailable — prompt-based fallback
      window.prompt(t("cragPage.linkCopied"), url);
    }
  };

  // Helper to get category icon
  const getCategoryIcon = (category: ReportCategory) => {
    const iconClass = "h-4 w-4";
    switch (category) {
      case "conditions":
        return <CloudSun className={iconClass} />;
      case "safety":
        return <AlertTriangle className={iconClass} />;
      case "access":
        return <Lock className={iconClass} />;
      case "climbing_info":
        return <Mountain className={iconClass} />;
      case "facilities":
        return <Home className={iconClass} />;
      default:
        return <MessageSquare className={iconClass} />;
    }
  };

  // Helper to linkify URLs in text
  const linkifyText = (text: string) => {
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const parts = text.split(urlRegex);

    return parts.map((part, index) => {
      if (part.match(urlRegex)) {
        return (
          <a
            key={index}
            href={part}
            target="_blank"
            rel="noopener noreferrer"
            className="text-orange-500 hover:text-orange-600 underline"
            onClick={(e) => e.stopPropagation()}
          >
            {part}
          </a>
        );
      }
      return part;
    });
  };

  return (
    <div className="min-h-screen bg-background">
      <OpenInAppBanner slug={crag.slug} />
      <main className="container mx-auto px-4 py-6 max-w-5xl">
        {/* Hero Section */}
        <div className="mb-8">
          <div className="flex flex-col gap-3">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <h1 className="text-3xl sm:text-4xl font-bold text-foreground mb-2">
                  {currentSector ? (
                    <>
                      {currentSector.name}
                      <span className="text-muted-foreground font-normal">
                        {" "}
                        •{" "}
                        <button
                          onClick={() => {
                            if (crag.slug) {
                              router.push(`/location/${crag.slug}`);
                            }
                          }}
                          className="hover:text-orange-500 transition-colors cursor-pointer"
                        >
                          {crag.name}
                        </button>
                      </span>
                    </>
                  ) : (
                    crag.name
                  )}
                </h1>
                {locationString && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <MapPin className="h-4 w-4 shrink-0" />
                    <p className="text-sm sm:text-base">
                      {locationString}
                      {countryFlag && ` ${countryFlag}`}
                    </p>
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowEditDialog(true)}
                  title={t("cragPage.editCrag")}
                >
                  <Pencil className="h-4 w-4" />
                  <span className="hidden sm:inline">{t("cragPage.edit")}</span>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleShare}
                  title={t("cragPage.shareCrag")}
                  aria-label={t("cragPage.shareCrag")}
                >
                  <Share2 className="h-4 w-4" />
                  <span className="hidden sm:inline">{t("cragPage.share")}</span>
                </Button>
                <Button
                  variant={isFavorited ? "default" : "outline"}
                  size="sm"
                  onClick={handleToggleFavorite}
                  disabled={addFavorite.isPending || removeFavorite.isPending}
                  title={
                    isFavorited ? t("cragPage.removeFromFavorites") : t("cragPage.addToFavorites")
                  }
                  className={isFavorited ? "bg-orange-500 hover:bg-orange-600" : ""}
                >
                  <Heart className={`h-4 w-4 ${isFavorited ? "fill-current" : ""}`} />
                </Button>
              </div>
            </div>

            {/* Description with clickable links */}
            {(currentSector?.description || crag.description) && (
              <p className="text-sm text-muted-foreground max-w-2xl">
                {linkifyText(currentSector?.description || crag.description || "")}
              </p>
            )}

            {/* Secret Crag Badge */}
            {isSecretCrag && (
              <div className="flex items-center gap-2 p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg">
                <EyeOff className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0" />
                <p className="text-sm text-amber-800 dark:text-amber-200">
                  {t("cragPage.secretCrag.notice")}
                </p>
              </div>
            )}

            {/* Locationless Crag Badge */}
            {isLocationless && (
              <div className="flex items-center gap-2 p-3 bg-purple-50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800 rounded-lg">
                <EyeOff className="h-4 w-4 text-purple-600 dark:text-purple-400 shrink-0" />
                <p className="text-sm text-purple-800 dark:text-purple-200">
                  {t("cragPage.locationless.notice", "This crag has no published location. Weather and conditions data are not available — check community reports below.")}
                </p>
              </div>
            )}

            {/* Rock Type & Coordinates (hidden for secret/locationless crags) */}
            <div className="flex flex-wrap items-center gap-2">
              {crag.rock_type && (
                <Badge variant="outline" className="capitalize">
                  {t(`rockTypes.${crag.rock_type}`) || crag.rock_type}
                </Badge>
              )}
              {!isSecretCrag && hasCoordinates && (
                <>
                  <Badge variant="secondary" className="font-mono text-xs">
                    {displayLat!.toFixed(4)}, {displayLon!.toFixed(4)}
                  </Badge>
                  {getSunCalcUrl(displayLat!, displayLon!) && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const url = getSunCalcUrl(displayLat!, displayLon!);
                        if (url) window.open(url, "_blank", "noopener,noreferrer");
                      }}
                      title={t("cragPage.viewSunAngles")}
                    >
                      <Sun className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">SunCalc</span>
                    </Button>
                  )}
                  {getGoogleMapsUrl(displayLat!, displayLon!) && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const url = getGoogleMapsUrl(displayLat!, displayLon!);
                        if (url) window.open(url, "_blank", "noopener,noreferrer");
                      }}
                      title={t("cragPage.viewOnGoogleMaps")}
                    >
                      <Map className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">{t("cragPage.viewOnMap")}</span>
                    </Button>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Small inline map (hidden for secret/locationless crags) */}
          {!isSecretCrag && hasCoordinates && getOpenStreetMapEmbedUrl(displayLat!, displayLon!) && (
            <div className="mt-4">
              <iframe
                width="100%"
                height="200"
                frameBorder="0"
                scrolling="no"
                marginHeight={0}
                marginWidth={0}
                src={getOpenStreetMapEmbedUrl(displayLat!, displayLon!)!}
                className="rounded-lg border"
              />
            </div>
          )}
        </div>

        {/* Current Conditions Summary Card (hidden for locationless crags) */}
        {!isLocationless && (
        <Card className="mb-6">
          <CardContent className="p-6">
            {isLoadingConditions ? (
              <div className="flex items-center justify-center py-8">
                <div className="flex flex-col items-center gap-3">
                  <Loader2 className="h-8 w-8 text-orange-500 animate-spin" />
                  <p className="text-sm text-muted-foreground">{t("loading.weatherData")}</p>
                </div>
              </div>
            ) : conditionsError ? (
              <div className="text-center py-8">
                <p className="text-destructive">{t("errors.failedToLoadConditions")}</p>
              </div>
            ) : conditions ? (
              <>
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h2 className="text-xl font-semibold">{t("cragPage.currentConditions")}</h2>
                    {isSecretCrag && (
                      <p className="text-xs text-muted-foreground mt-1">
                        {t("cragPage.secretCrag.weatherNote")}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge
                      variant="outline"
                      className={`text-lg px-4 py-2 ${
                        conditions.label === "looks_good"
                          ? "bg-green-500/10 text-green-700 dark:text-green-300 border-green-500/30"
                          : conditions.label === "watch_out"
                            ? "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30"
                            : "bg-red-500/10 text-red-700 dark:text-red-300 border-red-500/30"
                      }`}
                    >
                      {conditions.label === "looks_good" ? t("labels.looksGood", "Looks good") : conditions.label === "watch_out" ? t("labels.watchOut", "Watch out") : t("labels.stayHome", "Stay home")}
                    </Badge>
                    <span className="text-xs text-muted-foreground italic">{t("cragPage.estimateBased", "based on weather")}</span>
                  </div>
                </div>

                {/* Summary */}
                {conditions.summary && (
                  <p className="text-sm text-muted-foreground mb-4">{conditions.summary}</p>
                )}

                {/* Active flags */}
                {conditions.flags && (
                  <div className="flex flex-wrap gap-1.5 mb-4">
                    {conditions.flags.rain_now && <span className="text-xs px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400">🌧 {t("flags.rain", "Rain")}</span>}
                    {conditions.flags.rain_expected && <span className="text-xs px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400">🌧 {t("flags.rainExpected", "Rain in {{hours}}h", { hours: conditions.flags.rain_expected.in_hours })}</span>}
                    {conditions.flags.condensation_risk && <span className="text-xs px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-600 dark:text-cyan-400">💧 {t("flags.condensation", "Condensation")}</span>}
                    {conditions.flags.high_humidity && <span className="text-xs px-2 py-0.5 rounded-full bg-slate-500/10 text-slate-600 dark:text-slate-400">💧 {t("flags.highHumidity", "High humidity")}</span>}
                    {conditions.flags.wet_rock_likely && <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400">⚠ {t("flags.wetRock", "Wet rock likely")}</span>}
                    {conditions.flags.high_wind && <span className="text-xs px-2 py-0.5 rounded-full bg-orange-500/10 text-orange-600 dark:text-orange-400">💨 {t("flags.windy", "Windy")}</span>}
                    {conditions.flags.extreme_wind && <span className="text-xs px-2 py-0.5 rounded-full bg-red-500/10 text-red-600 dark:text-red-400">💨 {t("flags.extremeWind", "Extreme wind")}</span>}
                    {conditions.flags.sandstone_wet_warning && <span className="text-xs px-2 py-0.5 rounded-full bg-red-500/10 text-red-600 dark:text-red-400">⚠ {t("flags.sandstoneWet", "Sandstone wet")}</span>}
                  </div>
                )}

                {/* Weather emoji and description */}
                {conditions.current && (
                  <div className="flex items-center gap-4 bg-muted/30 rounded-lg p-4 border border-border mb-4">
                    <div className="text-6xl">
                      {getWeatherEmoji(conditions.current.weatherCode, isNightTime(new Date()))}
                    </div>
                    <div className="flex-1">
                      <p className="text-lg font-semibold">
                        {translateWeather(getWeatherDescription(conditions.current.weatherCode))}
                      </p>
                      <p className="text-sm text-muted-foreground">{t("dialog.currentWeather")}</p>
                    </div>
                  </div>
                )}

                {/* Weather metrics grid */}
                {conditions.current && (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                    <div className="bg-muted/50 rounded-lg p-3">
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
                        <ThermometerSun className="h-3 w-3" />
                        <span>{t("dialog.temperature")}</span>
                      </div>
                      <p className="text-lg font-semibold">
                        {formatTemperature(
                          convertTemperature(
                            conditions.current.temperature_c,
                            "celsius",
                            units.temperature
                          ),
                          units.temperature,
                          0
                        )}
                      </p>
                    </div>
                    <div className="bg-muted/50 rounded-lg p-3">
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
                        <Droplets className="h-3 w-3" />
                        <span>{t("dialog.humidity")}</span>
                      </div>
                      <p className="text-lg font-semibold">{conditions.current.humidity}%</p>
                    </div>
                    <div className="bg-muted/50 rounded-lg p-3">
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
                        <Wind className="h-3 w-3" />
                        <span>{t("dialog.windSpeed")}</span>
                      </div>
                      <p className="text-lg font-semibold">
                        {formatWindSpeed(
                          convertWindSpeed(
                            conditions.current.windSpeed_kph,
                            "kmh",
                            units.windSpeed
                          ),
                          units.windSpeed,
                          0
                        )}
                        {conditions.current.windDirection != null && (
                          <span className="text-sm font-normal text-muted-foreground ml-1">
                            <span
                              className="inline-block"
                              style={{ transform: `rotate(${getWindArrowRotation(conditions.current.windDirection)}deg)` }}
                            >
                              ↑
                            </span>
                            {" "}{getWindCardinal(conditions.current.windDirection)}
                          </span>
                        )}
                      </p>
                    </div>
                    <div className="bg-muted/50 rounded-lg p-3">
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
                        <CloudRain className="h-3 w-3" />
                        <span>{t("dialog.precipitation")}</span>
                      </div>
                      <p className="text-lg font-semibold">
                        {formatPrecipitation(
                          convertPrecipitation(
                            conditions.current.precipitation_mm,
                            "mm",
                            units.precipitation
                          ),
                          units.precipitation,
                          1
                        )}
                      </p>
                    </div>
                    {(conditions.timeContext || conditions.astro) && (
                      <>
                        <div className="bg-muted/50 rounded-lg p-3">
                          <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
                            <Sunrise className="h-3 w-3 text-orange-500" />
                            <span>{t("timeContext.sunrise")}</span>
                          </div>
                          <p className="text-lg font-semibold">
                            {conditions.astro?.sunrise
                              ? extractLocalTime(conditions.astro.sunrise)
                              : conditions.timeContext?.sunriseISO &&
                                extractLocalTime(conditions.timeContext.sunriseISO)}
                          </p>
                        </div>
                        <div className="bg-muted/50 rounded-lg p-3">
                          <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
                            <Sunset className="h-3 w-3 text-orange-600" />
                            <span>{t("timeContext.sunset")}</span>
                          </div>
                          <p className="text-lg font-semibold">
                            {conditions.astro?.sunset
                              ? extractLocalTime(conditions.astro.sunset)
                              : conditions.timeContext?.sunsetISO &&
                                extractLocalTime(conditions.timeContext.sunsetISO)}
                          </p>
                        </div>
                      </>
                    )}
                  </div>
                )}

              </>
            ) : null}
          </CardContent>
        </Card>
        )}

        {/* Community Reports Section */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-semibold">{t("reports.communityReports")}</h2>
            <Button onClick={handleAddReport} className="bg-orange-500 hover:bg-orange-600">
              <Plus className="h-4 w-4" />
              {t("reports.addReport")}
            </Button>
          </div>

          {isLoadingReports ? (
            <Card>
              <CardContent className="p-12">
                <div className="flex flex-col items-center gap-3">
                  <Loader2 className="h-8 w-8 text-orange-500 animate-spin" />
                  <p className="text-sm text-muted-foreground">{t("loading.reports")}</p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <>
              {/* Category Filter Tabs */}
              {reports.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-4">
                  <Button
                    variant={selectedCategory === "all" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setSelectedCategory("all")}
                    className={
                      selectedCategory === "all" ? "bg-orange-500 hover:bg-orange-600" : ""
                    }
                  >
                    {t("reports.filters.all")} ({reports.length})
                  </Button>
                  {(
                    [
                      "conditions",
                      "safety",
                      "access",
                      "climbing_info",
                      "facilities",
                      "other",
                    ] as ReportCategory[]
                  ).map((category) => {
                    const count = reports.filter((r) => r.category === category).length;
                    if (count === 0) return null;
                    return (
                      <Button
                        key={category}
                        variant={selectedCategory === category ? "default" : "outline"}
                        size="sm"
                        onClick={() => setSelectedCategory(category)}
                        className={`gap-1.5 ${selectedCategory === category ? "bg-orange-500 hover:bg-orange-600" : ""}`}
                      >
                        {getCategoryIcon(category)}
                        {t(`reports.categories.${category}`)} ({count})
                      </Button>
                    );
                  })}
                </div>
              )}

              {reports.length === 0 ? (
                <Card>
                  <CardContent className="p-12 text-center">
                    <p className="text-muted-foreground mb-4">{t("reports.noReports")}</p>
                    <Button
                      onClick={handleAddReport}
                      variant="outline"
                      className="border-orange-500 text-orange-500 hover:bg-orange-50 dark:hover:bg-orange-950/20"
                    >
                      {t("reports.beTheFirst")}
                    </Button>
                  </CardContent>
                </Card>
              ) : filteredReports.length === 0 ? (
                <Card>
                  <CardContent className="p-12 text-center">
                    <p className="text-muted-foreground">{t("reports.noReportsInCategory")}</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-4">
                  {filteredReports.map((report) => (
                    <ReportCard
                      key={report.id}
                      report={report}
                      onConfirmationChange={handleReportCreated}
                      onEdit={handleEditReport}
                      onDelete={handleDeleteReport}
                      currentUserProfileId={currentUserProfileId}
                    />
                  ))}
                </div>
              )}
            </>
          )}
        </div>

        {/* Webcams Section (hidden for locationless crags) */}
        {hasCoordinates && (
          <div className="mb-6">
            <WebcamsSection latitude={crag.lat!} longitude={crag.lon!} />
          </div>
        )}

        {/* Detailed Conditions (Tabs) - hidden for locationless crags */}
        {!isLocationless && conditionsData && (
          <Card className="mb-6">
            <CardContent className="p-6">
              <ConditionsDetailContent variant="sheet" data={conditionsData} />
            </CardContent>
          </Card>
        )}

        {/* Sectors Section - Always show if not viewing a sector */}
        {!currentSector && (
          <>
            <Separator className="my-8" />
            <div>
              <div className="flex items-center justify-between gap-4 mb-4">
                <h2 className="text-2xl font-semibold">
                  {t("cragPage.sectors")}
                  {sectors.length > 0 && filteredSectors.length !== sectors.length && (
                    <span className="text-base text-muted-foreground font-normal ml-2">
                      ({filteredSectors.length}/{sectors.length})
                    </span>
                  )}
                </h2>
                <div className="flex items-center gap-2">
                  {sectors.length > 0 && (
                    <div className="relative w-full max-w-xs">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        type="text"
                        placeholder={t("cragPage.searchSectors")}
                        value={sectorSearchQuery}
                        onChange={(e) => setSectorSearchQuery(e.target.value)}
                        className="pl-9"
                      />
                    </div>
                  )}
                  <Button
                    onClick={() => setShowAddSectorModal(true)}
                    className="bg-orange-500 hover:bg-orange-600 whitespace-nowrap"
                  >
                    <Plus className="h-4 w-4" />
                    {t("cragPage.addSector")}
                  </Button>
                </div>
              </div>
              {sectors.length === 0 ? (
                <Card>
                  <CardContent className="p-8 text-center">
                    <Layers className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
                    <p className="text-muted-foreground mb-4">
                      {t("cragPage.noSectors") || "No sectors have been added to this crag yet."}
                    </p>
                    <Button
                      onClick={() => setShowAddSectorModal(true)}
                      variant="outline"
                      className="border-orange-500 text-orange-500 hover:bg-orange-50 dark:hover:bg-orange-950/20"
                    >
                      {t("cragPage.beFirstToAddSector") || "Be the first to add a sector"}
                    </Button>
                  </CardContent>
                </Card>
              ) : filteredSectors.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredSectors.map((sector) => (
                    <Card
                      key={sector.id}
                      className="cursor-pointer transition-all hover:shadow-md hover:border-orange-500/50"
                      onClick={() => {
                        if (sector.slug) {
                          router.push(`/location/${sector.slug}`);
                        }
                      }}
                    >
                      <CardContent className="p-4">
                        <h3 className="font-semibold mb-1">{sector.name}</h3>
                        {sector.description && (
                          <p className="text-sm text-muted-foreground line-clamp-2">
                            {sector.description}
                          </p>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  {t("cragPage.noSectorsFound")}
                </div>
              )}
            </div>
          </>
        )}

        {/* Footer */}
        <div className="mt-12 pt-8 border-t text-center text-sm text-muted-foreground">
          <p>{t("cragPage.disclaimer")}</p>
        </div>
      </main>

      {/* Report Dialog */}
      <ReportDialog
        open={reportDialogOpen}
        onOpenChange={(open) => {
          setReportDialogOpen(open);
          if (!open) {
            setEditingReport(null); // Clear editing state when dialog closes
          }
        }}
        cragId={crag.id}
        cragName={crag.name}
        onReportCreated={handleReportCreated}
        editReport={editingReport}
      />

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
        completedAction={t("favorites.added")}
      />

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        open={!!deletingReportId}
        onOpenChange={(open) => {
          if (!open) setDeletingReportId(null);
        }}
        title={t("reports.deleteConfirmTitle")}
        description={t("reports.deleteConfirm")}
        confirmText={t("reports.delete")}
        cancelText={t("dialog.cancel")}
        onConfirm={confirmDeleteReport}
        variant="destructive"
      />

      {/* Edit Crag Dialog */}
      <EditCragDialog
        open={showEditDialog}
        onOpenChange={setShowEditDialog}
        crag={{
          id: crag.id,
          name: crag.name,
          slug: crag.slug,
          parent_crag_id: crag.parent_crag_id,
          parent_crag_name: crag.parent_crag?.name,
        }}
        currentlyIsSector={!!crag.parent_crag_id}
      />

      {/* Add Sector Modal */}
      <AddSectorModal
        open={showAddSectorModal}
        onOpenChange={setShowAddSectorModal}
        parentCrag={{
          id: crag.id,
          name: crag.name,
          lat: crag.lat ?? 0,
          lon: crag.lon ?? 0,
          country: crag.country,
          state: crag.state,
          municipality: crag.municipality,
          village: crag.village,
          rock_type: crag.rock_type,
        }}
      />
    </div>
  );
}
