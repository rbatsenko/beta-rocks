"use client";

import { useCallback, useMemo, useState } from "react";
import { HomeMap } from "@/components/home/HomeMap";
import { NearbyCragsControl } from "@/components/home/NearbyCragsControl";
import { MAP_LABEL_KEYS, type NearbyState } from "@/components/home/home-map-types";
import { useHomeLocation } from "@/hooks/useHomeLocation";

export function MapPageClient() {
  const { location, requestLocation } = useHomeLocation();
  const [nearbyState, setNearbyState] = useState<NearbyState>({
    isLoading: false,
    isError: false,
    count: null,
  });
  const [hiddenLabels, setHiddenLabels] = useState<ReadonlySet<string>>(new Set());
  const visibleLabels = useMemo(
    () => new Set(MAP_LABEL_KEYS.filter((k) => !hiddenLabels.has(k))),
    [hiddenLabels]
  );
  const toggleLabel = useCallback((key: string) => {
    setHiddenLabels((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }, []);

  return (
    <div className="relative h-[calc(100dvh-4rem)] overflow-hidden">
      <HomeMap
        position={location.position}
        visibleLabels={visibleLabels}
        onNearbyStateChange={setNearbyState}
        className="absolute inset-0 z-0"
      />
      <div className="pointer-events-none absolute inset-x-0 top-3 z-[1100] flex justify-center px-3">
        <div className="pointer-events-auto rounded-2xl border bg-background/85 backdrop-blur-md shadow-lg px-3 py-2">
          <NearbyCragsControl
            geoStatus={location.status}
            nearbyState={nearbyState}
            onLocateClick={requestLocation}
            hiddenLabels={hiddenLabels}
            onToggleLabel={toggleLabel}
          />
        </div>
      </div>
    </div>
  );
}
