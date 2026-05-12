"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { useClientTranslation } from "@/hooks/useClientTranslation";
import "leaflet/dist/leaflet.css";
import type { MapCrag, NearbyConditionsResponse, NearbyState } from "./home-map-types";

const HomeCragsMapCanvas = dynamic(() => import("./HomeCragsMapCanvas"), {
  ssr: false,
  loading: () => (
    <div className="h-full w-full bg-linear-to-b from-muted/30 via-muted/40 to-muted/60" />
  ),
});

const CragQuickViewSheet = dynamic(
  () => import("./CragQuickViewSheet").then((mod) => mod.CragQuickViewSheet),
  { ssr: false }
);

const RADIUS_M = 50_000;
// Snap query coordinates to a ~4 km grid so small pans don't trigger refetches.
const COORD_GRID_DEG = 0.04;

function snap(value: number): number {
  return Math.round(value / COORD_GRID_DEG) * COORD_GRID_DEG;
}

interface HomeMapProps {
  /** User location, or null when not yet known. */
  position: { lat: number; lon: number } | null;
  /** Conditions labels (incl. "unrated") to show on the map. */
  visibleLabels: ReadonlySet<string>;
  /** Reports nearby-crags loading state up to the page so the welcome card can show status. */
  onNearbyStateChange?: (state: NearbyState) => void;
  className?: string;
}

export function HomeMap({ position, visibleLabels, onNearbyStateChange, className }: HomeMapProps) {
  const { t } = useClientTranslation("common");
  const [selectedCrag, setSelectedCrag] = useState<MapCrag | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  // The area we're currently fetching crags for: starts at the user's location, follows map panning.
  const [queryCenter, setQueryCenter] = useState<{ lat: number; lon: number } | null>(null);

  useEffect(() => {
    if (!position) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- sync the query area to a new geolocation result
    setQueryCenter({ lat: position.lat, lon: position.lon });
  }, [position]);

  const handleMapMove = useCallback((lat: number, lon: number) => {
    setQueryCenter({ lat, lon });
  }, []);

  const gridLat = queryCenter ? snap(queryCenter.lat) : null;
  const gridLon = queryCenter ? snap(queryCenter.lon) : null;

  const { data, isError, isFetching } = useQuery<NearbyConditionsResponse>({
    queryKey: ["home-nearby-conditions", gridLat, gridLon],
    queryFn: async () => {
      const res = await fetch(
        `/api/conditions/nearby?lat=${queryCenter!.lat}&lon=${queryCenter!.lon}&radius=${RADIUS_M}`
      );
      if (!res.ok) throw new Error("Failed to load nearby crags");
      return res.json();
    },
    enabled: !!queryCenter,
    staleTime: 30 * 60_000,
    gcTime: 60 * 60_000,
    placeholderData: keepPreviousData,
  });

  const crags = useMemo(() => data?.data ?? [], [data]);

  useEffect(() => {
    if (!position) {
      onNearbyStateChange?.({ isLoading: false, isError: false, count: null });
      return;
    }
    onNearbyStateChange?.({
      isLoading: isFetching,
      isError,
      count: data ? crags.length : null,
    });
  }, [position, isFetching, isError, data, crags, onNearbyStateChange]);

  const handleSelectCrag = useCallback((crag: MapCrag) => {
    setSelectedCrag(crag);
    setSheetOpen(true);
  }, []);

  const userPosition: [number, number] | null = position ? [position.lat, position.lon] : null;
  // Show a small "searching this area" hint only while *re*fetching after a move (not the first load).
  const showAreaSpinner = Boolean(position && isFetching && data);

  return (
    <div className={className}>
      <HomeCragsMapCanvas
        userPosition={userPosition}
        crags={crags}
        visibleLabels={visibleLabels}
        onSelectCrag={handleSelectCrag}
        onMapMove={handleMapMove}
      />

      {showAreaSpinner && (
        <div className="pointer-events-none absolute left-1/2 top-3 z-[1100] -translate-x-1/2">
          <div className="inline-flex items-center gap-2 rounded-full border bg-background/90 px-3 py-1.5 text-xs text-muted-foreground shadow-md backdrop-blur">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            <span>{t("welcome.map.searchingArea")}</span>
          </div>
        </div>
      )}

      {selectedCrag && (
        <CragQuickViewSheet crag={selectedCrag} open={sheetOpen} onOpenChange={setSheetOpen} />
      )}
    </div>
  );
}
