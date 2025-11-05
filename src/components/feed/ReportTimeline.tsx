"use client";

import { useState, useMemo, useEffect } from "react";
import { Tables } from "@/integrations/supabase/types";
import { ReportCard } from "@/components/reports/ReportCard";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { LiveIndicator } from "@/components/ui/live-indicator";
import { useClientTranslation } from "@/hooks/useClientTranslation";
import { differenceInMinutes, startOfDay, format } from "date-fns";
import { getDateFnsLocale } from "@/lib/i18n/date-locales";
import { Mountain } from "lucide-react";
import Link from "next/link";
import { getCountryFlagWithFallback } from "@/lib/utils/country-flags";

// Extended Report type to match the structure returned by database queries
type ReportWithDetails = Tables<"reports"> & {
  author?: {
    id: string;
    display_name: string | null;
  } | null;
  confirmations?: { count: number }[] | null;
  crag?: {
    id: string;
    name: string;
    country: string | null;
    state: string | null;
    municipality: string | null;
    village: string | null;
    lat: number;
    lon: number;
    slug: string | null;
  } | null;
  sector?: {
    id: string;
    name: string;
    slug: string | null;
  } | null;
};

interface ReportTimelineProps {
  initialReports: ReportWithDetails[];
  favoriteCragIds?: string[];
  onNewReport?: (report: ReportWithDetails) => void;
  currentUserProfileId?: string | null;
}

type FilterMode = "all" | "favorites";

interface TimeGroup {
  key: string;
  label: string;
  reports: ReportWithDetails[];
}

/**
 * ReportTimeline displays a live feed of climbing reports with filtering and time grouping
 *
 * Features:
 * - Filter by "All" or "Favorites" (crags you've bookmarked)
 * - Time-based grouping: "Just now", "Today", "Yesterday", specific dates
 * - CSS animations for new reports sliding in from top
 * - Live indicator when connected to realtime updates
 * - Maximum 100 reports kept in memory
 * - Mobile responsive layout
 */
export function ReportTimeline({
  initialReports,
  favoriteCragIds = [],
  onNewReport,
  currentUserProfileId,
}: ReportTimelineProps) {
  const { t, i18n } = useClientTranslation("common");
  const dateLocale = getDateFnsLocale(i18n.language);

  // State management - use prop directly, parent manages the reports state
  const reports = initialReports;
  const [filterMode, setFilterMode] = useState<FilterMode>("all");
  const [isLive, setIsLive] = useState(false);

  // Setup live indicator when onNewReport callback is provided
  useEffect(() => {
    if (onNewReport) {
      setIsLive(true);
    }
  }, [onNewReport]);

  // Filter reports based on selected mode
  const filteredReports = useMemo(() => {
    if (filterMode === "favorites") {
      return reports.filter((report) => report.crag_id && favoriteCragIds.includes(report.crag_id));
    }
    return reports;
  }, [reports, filterMode, favoriteCragIds]);

  // Group reports by time periods
  const timeGroups = useMemo((): TimeGroup[] => {
    const now = new Date();
    const groups: Record<string, ReportWithDetails[]> = {
      justNow: [],
      today: [],
      yesterday: [],
    };
    const olderGroups: Record<string, ReportWithDetails[]> = {};

    filteredReports.forEach((report) => {
      const reportDate = new Date(report.observed_at);
      const minutesAgo = differenceInMinutes(now, reportDate);

      // Just now: less than 1 minute
      if (minutesAgo < 1) {
        groups.justNow.push(report);
      }
      // Today
      else if (startOfDay(reportDate).getTime() === startOfDay(now).getTime()) {
        groups.today.push(report);
      }
      // Yesterday
      else if (
        startOfDay(reportDate).getTime() ===
        startOfDay(new Date(now.getTime() - 24 * 60 * 60 * 1000)).getTime()
      ) {
        groups.yesterday.push(report);
      }
      // Older dates
      else {
        const dateKey = format(startOfDay(reportDate), "yyyy-MM-dd");
        if (!olderGroups[dateKey]) {
          olderGroups[dateKey] = [];
        }
        olderGroups[dateKey].push(report);
      }
    });

    // Build time groups array
    const result: TimeGroup[] = [];

    if (groups.justNow.length > 0) {
      result.push({
        key: "justNow",
        label: t("feed.justNow"),
        reports: groups.justNow,
      });
    }

    if (groups.today.length > 0) {
      result.push({
        key: "today",
        label: t("time.today"),
        reports: groups.today,
      });
    }

    if (groups.yesterday.length > 0) {
      result.push({
        key: "yesterday",
        label: t("time.yesterday"),
        reports: groups.yesterday,
      });
    }

    // Add older date groups in descending order
    Object.keys(olderGroups)
      .sort()
      .reverse()
      .forEach((dateKey) => {
        const date = new Date(dateKey);
        result.push({
          key: dateKey,
          label: format(date, "PPP", { locale: dateLocale }),
          reports: olderGroups[dateKey],
        });
      });

    return result;
  }, [filteredReports, t, dateLocale]);

  // Count favorites for badge display
  const favoritesCount = useMemo(() => {
    return reports.filter((report) => report.crag_id && favoriteCragIds.includes(report.crag_id))
      .length;
  }, [reports, favoriteCragIds]);

  return (
    <div className="w-full space-y-4">
      {/* Header with Live Indicator and Filters */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-2">
          <h2 className="text-2xl font-bold">{t("feed.title")}</h2>
          <LiveIndicator isLive={isLive} label={t("feed.live")} />
        </div>

        {/* Filter Tabs */}
        <Tabs
          value={filterMode}
          onValueChange={(value) => setFilterMode(value as FilterMode)}
          className="w-full sm:w-auto"
        >
          <TabsList className="grid w-full grid-cols-2 sm:w-auto">
            <TabsTrigger value="all" className="gap-2">
              {t("feed.filters.all")}
              <Badge variant="secondary" className="text-xs">
                {reports.length}
              </Badge>
            </TabsTrigger>
            <TabsTrigger value="favorites" className="gap-2">
              {t("feed.filters.favorites")}
              <Badge variant="secondary" className="text-xs">
                {favoritesCount}
              </Badge>
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Timeline Content */}
      <div className="space-y-6">
        {timeGroups.length === 0 ? (
          // Empty State
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Mountain className="h-16 w-16 text-muted-foreground/20 mb-4" />
            <h3 className="text-lg font-semibold text-muted-foreground mb-2">
              {filterMode === "favorites"
                ? t("feed.emptyState.noFavoritesTitle")
                : t("feed.emptyState.noReportsTitle")}
            </h3>
            <p className="text-sm text-muted-foreground max-w-md">
              {filterMode === "favorites"
                ? t("feed.emptyState.noFavoritesDescription")
                : t("feed.emptyState.noReportsDescription")}
            </p>
          </div>
        ) : (
          // Time-Grouped Reports
          timeGroups.map((group) => (
            <div key={group.key} className="space-y-3">
              {/* Time Group Header */}
              <div className="sticky top-0 z-10 bg-background/80 backdrop-blur-sm py-2 border-b">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                  {group.label}
                </h3>
              </div>

              {/* Reports in Group */}
              <div className="space-y-4">
                {group.reports.map((report) => (
                  <div key={report.id}>
                    {/* Crag/Sector Header - More Prominent */}
                    {report.crag && report.crag.slug && (
                      <div className="mb-2">
                        <Link
                          href={`/location/${report.sector?.slug || report.crag.slug}`}
                          className="group inline-flex items-center gap-2"
                        >
                          <Mountain className="h-4 w-4 text-primary group-hover:scale-110 transition-transform" />
                          <span className="font-semibold text-base text-foreground group-hover:text-primary transition-colors">
                            {report.sector && report.sector.name
                              ? `${report.sector.name}, ${report.crag.name}`
                              : report.crag.name}
                          </span>
                          {report.crag.country && (
                            <span className="text-lg group-hover:text-muted-foreground/80 transition-colors">
                              {getCountryFlagWithFallback(report.crag.country)}
                            </span>
                          )}
                        </Link>
                        {/* Location context */}
                        {(report.crag.village ||
                          report.crag.municipality ||
                          report.crag.state ||
                          report.crag.country) && (
                          <div className="text-xs text-muted-foreground ml-6 mt-0.5">
                            {[
                              report.crag.village,
                              report.crag.municipality,
                              report.crag.state,
                              report.crag.country,
                            ]
                              .filter(Boolean)
                              .join(", ")}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Report Card */}
                    <ReportCard
                      report={report as any}
                      currentUserProfileId={currentUserProfileId}
                    />
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
      </div>

      {/* CSS Animation Styles */}
      <style jsx>{`
        @keyframes slide-in-top {
          0% {
            transform: translateY(-20px);
            opacity: 0;
          }
          100% {
            transform: translateY(0);
            opacity: 1;
          }
        }

        .animate-slide-in-top {
          animation: slide-in-top 0.5s ease-out;
        }
      `}</style>
    </div>
  );
}
