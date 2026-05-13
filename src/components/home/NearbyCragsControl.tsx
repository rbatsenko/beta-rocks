"use client";

import { MapPin, Loader2, Crosshair, AlertCircle } from "lucide-react";
import { useClientTranslation } from "@/hooks/useClientTranslation";
import { cn } from "@/lib/utils";
import {
  MAP_LABEL_KEYS,
  type GeoStatus,
  type MapLabelKey,
  type NearbyState,
} from "@/components/home/home-map-types";

const LEGEND_DOT: Record<MapLabelKey, string> = {
  good: "bg-green-500",
  fair: "bg-amber-500",
  poor: "bg-red-500",
  unrated: "bg-slate-400",
};

interface NearbyCragsControlProps {
  geoStatus: GeoStatus;
  nearbyState: NearbyState;
  onLocateClick: () => void;
  hiddenLabels: ReadonlySet<string>;
  onToggleLabel: (key: string) => void;
}

export function NearbyCragsControl({
  geoStatus,
  nearbyState,
  onLocateClick,
  hiddenLabels,
  onToggleLabel,
}: NearbyCragsControlProps) {
  const { t } = useClientTranslation("common");
  const pillBase =
    "inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm border transition-colors";

  const labelText = (key: MapLabelKey) =>
    key === "unrated" ? t("welcome.map.unrated", "Unrated") : t(`labels.${key}`);

  if (geoStatus === "locating") {
    return (
      <div className={`${pillBase} bg-muted/60 text-muted-foreground border-border`}>
        <Loader2 className="h-4 w-4 animate-spin" />
        <span>{t("welcome.map.locating")}</span>
      </div>
    );
  }

  if (geoStatus === "ready") {
    const statusText = nearbyState.isLoading
      ? t("welcome.map.loadingCrags")
      : nearbyState.isError
        ? t("welcome.map.loadCragsError")
        : nearbyState.count === 0
          ? t("welcome.map.noCrags")
          : t("welcome.map.cragsNearby", { count: nearbyState.count ?? 0 });

    return (
      <div className="flex flex-col items-center gap-2">
        <div
          className={`${pillBase} bg-orange-50/70 dark:bg-orange-950/30 border-orange-200/60 dark:border-orange-800/40`}
        >
          {nearbyState.isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin text-orange-500" />
          ) : (
            <MapPin className="h-4 w-4 text-orange-500 shrink-0" />
          )}
          <span className="text-muted-foreground">{statusText}</span>
          <button
            onClick={onLocateClick}
            title={t("welcome.map.recenter")}
            className="ml-0.5 rounded-md p-1 text-muted-foreground hover:bg-orange-100/70 dark:hover:bg-orange-900/40 transition-colors"
          >
            <Crosshair className="h-3.5 w-3.5" />
          </button>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-1.5">
          {MAP_LABEL_KEYS.map((key) => {
            const active = !hiddenLabels.has(key);
            return (
              <button
                key={key}
                onClick={() => onToggleLabel(key)}
                aria-pressed={active}
                title={
                  active
                    ? t("welcome.map.hideLabel", "Hide {{label}}", { label: labelText(key) })
                    : t("welcome.map.showLabel", "Show {{label}}", { label: labelText(key) })
                }
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] transition-colors cursor-pointer",
                  active
                    ? "border-border bg-muted/50 text-foreground hover:bg-muted"
                    : "border-transparent text-muted-foreground/60 line-through hover:text-muted-foreground"
                )}
              >
                <span
                  className={cn("h-2 w-2 rounded-full", LEGEND_DOT[key], !active && "opacity-40")}
                  aria-hidden
                />
                {labelText(key)}
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  // idle | error | unsupported
  const isUnsupported = geoStatus === "unsupported";
  return (
    <button
      onClick={onLocateClick}
      disabled={isUnsupported}
      className={`${pillBase} bg-orange-50/70 dark:bg-orange-950/30 border-orange-200/60 dark:border-orange-800/40 hover:bg-orange-100/70 dark:hover:bg-orange-900/40 cursor-pointer disabled:cursor-not-allowed disabled:opacity-60`}
    >
      {geoStatus === "error" ? (
        <AlertCircle className="h-4 w-4 text-amber-500 shrink-0" />
      ) : (
        <MapPin className="h-4 w-4 text-orange-500 shrink-0" />
      )}
      <span>
        {isUnsupported
          ? t("welcome.map.geolocationUnsupported")
          : geoStatus === "error"
            ? t("welcome.map.locationError")
            : t("welcome.map.showNearby")}
      </span>
    </button>
  );
}
