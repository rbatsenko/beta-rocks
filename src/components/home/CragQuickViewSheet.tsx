"use client";

import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { ArrowRight, Loader2, MapPin, MessageSquare } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { ReportCard } from "@/components/reports/ReportCard";
import { useClientTranslation } from "@/hooks/useClientTranslation";
import { getCountryFlag } from "@/lib/utils/country-flag";
import { fetchReportsByCrag } from "@/lib/db/queries";
import {
  CurrentConditionsMiniCard,
  type ConditionsFlags,
  type CurrentWeather,
} from "./CurrentConditionsMiniCard";
import type { MapCrag } from "./home-map-types";

interface CragQuickViewSheetProps {
  crag: MapCrag;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface CragConditionsResponse {
  conditions: {
    label: string;
    summary?: string | null;
    summary_template?: { key: string; params?: Record<string, unknown> } | null;
    flags?: ConditionsFlags | null;
    /** Flattened current weather (from the mobile-compat shim on /api/conditions/[cragId]). */
    current?: CurrentWeather;
  };
}

function formatDistanceKm(distanceM: number): string {
  const km = distanceM / 1000;
  return km < 10 ? km.toFixed(1) : String(Math.round(km));
}

export function CragQuickViewSheet({ crag, open, onOpenChange }: CragQuickViewSheetProps) {
  const { t } = useClientTranslation("common");
  const router = useRouter();

  const {
    data: conditionsData,
    isLoading: isLoadingConditions,
    isError: isConditionsError,
  } = useQuery<CragConditionsResponse>({
    queryKey: ["crag-quickview-conditions", crag.id],
    queryFn: async () => {
      const res = await fetch(`/api/conditions/${crag.id}`);
      if (!res.ok) throw new Error("Failed to load conditions");
      return res.json();
    },
    enabled: open,
    staleTime: 30 * 60_000,
  });

  const {
    data: reports = [],
    isLoading: isLoadingReports,
    refetch,
  } = useQuery({
    queryKey: ["crag-quickview-reports", crag.id],
    queryFn: () => fetchReportsByCrag(crag.id, 10),
    enabled: open,
    staleTime: 2 * 60_000,
  });

  const flag = getCountryFlag(crag.country);
  const current = conditionsData?.conditions?.current;

  const handleViewCragPage = () => {
    router.push(`/location/${crag.slug}`);
    onOpenChange(false);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto p-0 flex flex-col">
        <SheetHeader className="px-4 sm:px-6 pt-4 pb-3 pr-12 border-b shrink-0 space-y-2">
          <SheetTitle className="text-lg font-semibold flex items-center gap-2">
            {flag && <span aria-hidden>{flag}</span>}
            <span className="truncate">{crag.name}</span>
          </SheetTitle>
          <SheetDescription className="flex items-center gap-1.5 text-xs">
            <MapPin className="h-3.5 w-3.5 shrink-0" />
            <span>
              {t("welcome.map.distanceAway", { km: formatDistanceKm(crag.distance_m) })}
              {crag.country ? ` · ${crag.country}` : ""}
            </span>
          </SheetDescription>
          <div className="pt-1">
            <Button
              size="sm"
              onClick={handleViewCragPage}
              className="h-8 bg-orange-500 hover:bg-orange-600"
            >
              <ArrowRight className="h-3.5 w-3.5" />
              <span>{t("conditions.viewCragPage")}</span>
            </Button>
          </div>
        </SheetHeader>

        <div className="flex-1 px-4 sm:px-6 py-4 space-y-4">
          {/* Current conditions */}
          {isLoadingConditions ? (
            <div className="rounded-xl border bg-card p-4 flex items-center justify-center gap-2 text-sm text-muted-foreground py-8">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>{t("loading.weatherData", "Loading weather data…")}</span>
            </div>
          ) : isConditionsError || !current || !conditionsData ? (
            <div className="rounded-xl border bg-card p-4 text-center text-sm text-muted-foreground py-6">
              {t("errors.failedToLoadConditions")}
            </div>
          ) : (
            <CurrentConditionsMiniCard
              label={conditionsData.conditions.label}
              summary={conditionsData.conditions.summary}
              summaryTemplate={conditionsData.conditions.summary_template}
              current={current}
              flags={conditionsData.conditions.flags}
            />
          )}

          {/* Recent reports */}
          <div>
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground mb-3">
              <MessageSquare className="h-4 w-4" />
              <span>{t("welcome.map.recentReports")}</span>
            </div>

            {isLoadingReports ? (
              <div className="flex items-center justify-center gap-2 py-8 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>{t("welcome.map.loadingReports")}</span>
              </div>
            ) : reports.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                {t("welcome.map.noReports")}
              </p>
            ) : (
              <div className="space-y-3">
                {reports.map((report) => (
                  <ReportCard
                    key={report.id}
                    report={report}
                    currentUserProfileId={null}
                    onConfirmationChange={() => refetch()}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
