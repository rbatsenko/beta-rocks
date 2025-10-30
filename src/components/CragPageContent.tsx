"use client";

import { useState, useCallback, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  MapPin,
  MessageCircle,
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
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { ConditionsDetailContent } from "@/components/ConditionsDetailContent";
import { ReportCard } from "@/components/ReportCard";
import { ReportDialog } from "@/components/ReportDialog";
import { useClientTranslation } from "@/hooks/useClientTranslation";
import { useConditionsTranslations } from "@/hooks/useConditionsTranslations";
import { useRouter } from "next/navigation";
import {
  useFavorites,
  useIsFavorited,
  useAddFavorite,
  useRemoveFavorite,
} from "@/hooks/queries/useFavoritesQueries";
import { getSunCalcUrl, getGoogleMapsUrl, getOpenStreetMapEmbedUrl } from "@/lib/utils/urls";
import { getCountryFlag } from "@/lib/utils/country-flag";
import { fetchReportsByCrag } from "@/lib/db/queries";

type ReportCategory = "conditions" | "safety" | "access" | "climbing_info" | "facilities" | "other";

interface CragPageContentProps {
  crag: {
    id: string;
    name: string;
    lat: number;
    lon: number;
    rock_type: string | null;
    country: string | null;
    state: string | null;
    municipality: string | null;
    village: string | null;
  };
  sectors: any[];
}

interface ConditionsData {
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
}

async function fetchConditionsByCragId(cragId: string): Promise<ConditionsData> {
  const res = await fetch(`/api/conditions/${cragId}`);
  if (!res.ok) {
    throw new Error("Failed to fetch conditions");
  }
  const data = await res.json();
  return data.conditions;
}

async function fetchReportsByCragId(cragId: string) {
  return fetchReportsByCrag(cragId, 20);
}

export function CragPageContent({ crag, sectors }: CragPageContentProps) {
  const { t } = useClientTranslation("common");
  const { translateReason, translateWarning } = useConditionsTranslations(t);
  const router = useRouter();
  const [reportDialogOpen, setReportDialogOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<"all" | ReportCategory>("all");

  // React Query for conditions (client-side)
  const {
    data: conditions,
    isLoading: isLoadingConditions,
    error: conditionsError,
  } = useQuery({
    queryKey: ["conditions", crag.id],
    queryFn: () => fetchConditionsByCragId(crag.id),
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
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
  const { isFavorited, favorite } = useIsFavorited(crag.id, undefined, {
    lat: crag.lat,
    lon: crag.lon,
  });
  const addFavorite = useAddFavorite();
  const removeFavorite = useRemoveFavorite();

  // Filter reports by selected category
  const filteredReports = useMemo(() => {
    if (selectedCategory === "all") return reports;
    return reports.filter((report) => report.category === selectedCategory);
  }, [reports, selectedCategory]);

  // Format location details
  const locationParts = [crag.village, crag.municipality, crag.state, crag.country].filter(Boolean);
  const locationString = locationParts.join(", ");
  const countryFlag = getCountryFlag(crag.country);

  // Format conditions data for ConditionsDetailContent
  const conditionsData = conditions
    ? {
        location: crag.name,
        locationDetails: locationString,
        latitude: crag.lat,
        longitude: crag.lon,
        country: crag.country ?? undefined,
        state: crag.state ?? undefined,
        municipality: crag.municipality ?? undefined,
        village: crag.village ?? undefined,
        ...conditions,
      }
    : null;

  const handleToggleFavorite = () => {
    if (isFavorited && favorite) {
      removeFavorite.mutate(favorite.id);
    } else {
      addFavorite.mutate({
        favorite: {
          areaName: crag.name,
          location: locationString,
          latitude: crag.lat,
          longitude: crag.lon,
          cragId: crag.id,
          rockType: crag.rock_type || undefined,
          lastRating: conditions?.rating || "unknown",
          lastFrictionScore: conditions?.frictionScore || 0,
          lastCheckedAt: new Date().toISOString(),
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

  const handleAskAI = () => {
    // Navigate to home page with crag pre-filled in chat
    router.push(`/?crag=${encodeURIComponent(crag.name)}`);
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

  return (
    <div className="min-h-screen bg-background">
      <main className="container mx-auto px-4 py-6 max-w-5xl">
        {/* Hero Section */}
        <div className="mb-8">
          <div className="flex flex-col gap-3">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <h1 className="text-3xl sm:text-4xl font-bold text-foreground mb-2">{crag.name}</h1>
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
                  onClick={handleAskAI}
                  title={t("cragPage.askAI")}
                >
                  <MessageCircle className="h-4 w-4" />
                  <span className="hidden sm:inline">{t("cragPage.askAI")}</span>
                </Button>
                <Button
                  variant={isFavorited ? "default" : "outline"}
                  size="sm"
                  onClick={handleToggleFavorite}
                  title={isFavorited ? "Remove from favorites" : "Add to favorites"}
                  className={isFavorited ? "bg-orange-500 hover:bg-orange-600" : ""}
                >
                  <Heart className={`h-4 w-4 ${isFavorited ? "fill-current" : ""}`} />
                </Button>
              </div>
            </div>

            {/* Rock Type & Coordinates */}
            <div className="flex flex-wrap items-center gap-2">
              {crag.rock_type && (
                <Badge variant="outline" className="capitalize">
                  {t(`rockTypes.${crag.rock_type}`) || crag.rock_type}
                </Badge>
              )}
              <Badge variant="secondary" className="font-mono text-xs">
                {crag.lat.toFixed(4)}, {crag.lon.toFixed(4)}
              </Badge>
              {getSunCalcUrl(crag.lat, crag.lon) && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const url = getSunCalcUrl(crag.lat, crag.lon);
                    if (url) window.open(url, "_blank", "noopener,noreferrer");
                  }}
                  title="View sun position and shadow angles"
                >
                  <Sun className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">SunCalc</span>
                </Button>
              )}
              {getGoogleMapsUrl(crag.lat, crag.lon) && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const url = getGoogleMapsUrl(crag.lat, crag.lon);
                    if (url) window.open(url, "_blank", "noopener,noreferrer");
                  }}
                  title="View on Google Maps"
                >
                  <Map className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">{t("cragPage.viewOnMap")}</span>
                </Button>
              )}
            </div>
          </div>

          {/* Small inline map */}
          {getOpenStreetMapEmbedUrl(crag.lat, crag.lon) && (
            <div className="mt-4">
              <iframe
                width="100%"
                height="200"
                frameBorder="0"
                scrolling="no"
                marginHeight={0}
                marginWidth={0}
                src={getOpenStreetMapEmbedUrl(crag.lat, crag.lon)!}
                className="rounded-lg border"
              />
            </div>
          )}
        </div>

        {/* Current Conditions Summary Card */}
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
                  <h2 className="text-xl font-semibold">{t("cragPage.currentConditions")}</h2>
                  <div className="flex items-center gap-2">
                    <Badge
                      variant="outline"
                      className={`text-lg px-4 py-2 ${
                        conditions.rating === "Great"
                          ? "bg-green-500/10 text-green-700 dark:text-green-300 border-green-500/30"
                          : conditions.rating === "Good"
                            ? "bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/30"
                            : conditions.rating === "Fair"
                              ? "bg-yellow-500/10 text-yellow-700 dark:text-yellow-300 border-yellow-500/30"
                              : "bg-gray-500/10 text-gray-700 dark:text-gray-300 border-gray-500/30"
                      }`}
                    >
                      {t(`ratings.${conditions.rating.toLowerCase()}`) || conditions.rating}
                    </Badge>
                    <span className="text-2xl font-bold">{conditions.frictionScore}/5</span>
                  </div>
                </div>
                {conditions.reasons && conditions.reasons.length > 0 && (
                  <ul className="text-sm space-y-1 text-muted-foreground">
                    {conditions.reasons.map((reason, i) => (
                      <li key={i}>• {translateReason(reason)}</li>
                    ))}
                  </ul>
                )}
                {conditions.warnings && conditions.warnings.length > 0 && (
                  <div className="space-y-1 mt-3">
                    {conditions.warnings.map((warning, i) => (
                      <p key={i} className="text-sm text-destructive">
                        ⚠️ {translateWarning(warning)}
                      </p>
                    ))}
                  </div>
                )}
              </>
            ) : null}
          </CardContent>
        </Card>

        {/* Community Reports Section */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-semibold">{t("reports.communityReports")}</h2>
            <Button
              onClick={() => setReportDialogOpen(true)}
              className="bg-orange-500 hover:bg-orange-600"
            >
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
                      onClick={() => setReportDialogOpen(true)}
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
                    />
                  ))}
                </div>
              )}
            </>
          )}
        </div>

        {/* Detailed Conditions (Tabs) */}
        {conditionsData && (
          <Card className="mb-6">
            <CardContent className="p-6">
              <ConditionsDetailContent variant="sheet" data={conditionsData} />
            </CardContent>
          </Card>
        )}

        {/* Sectors Section */}
        {sectors && sectors.length > 0 && (
          <>
            <Separator className="my-8" />
            <div>
              <h2 className="text-2xl font-semibold mb-4">{t("cragPage.sectors")}</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {sectors.map((sector) => (
                  <Card key={sector.id} className="hover:shadow-md transition-shadow">
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
            </div>
          </>
        )}

        {/* Footer */}
        <div className="mt-12 pt-8 border-t text-center text-sm text-muted-foreground">
          <p>{t("cragPage.disclaimer")}</p>
          <Button variant="link" onClick={handleAskAI} className="text-orange-500">
            {t("cragPage.askAIAboutCrag")}
          </Button>
        </div>
      </main>

      {/* Report Dialog */}
      <ReportDialog
        open={reportDialogOpen}
        onOpenChange={setReportDialogOpen}
        cragId={crag.id}
        cragName={crag.name}
        onReportCreated={handleReportCreated}
      />
    </div>
  );
}
