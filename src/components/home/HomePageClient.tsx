"use client";

import { useCallback, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { WelcomeScreen } from "@/components/home/WelcomeScreen";
import { HomeMap } from "@/components/home/HomeMap";
import { MAP_LABEL_KEYS, type NearbyState } from "@/components/home/home-map-types";
import { FeaturesDialog } from "@/components/dialogs/FeaturesDialog";
import { PrivacyDialog } from "@/components/dialogs/PrivacyDialog";
import { useHomeLocation } from "@/hooks/useHomeLocation";

export function HomePageClient() {
  const router = useRouter();
  const [featuresDialogOpen, setFeaturesDialogOpen] = useState(false);
  const [privacyDialogOpen, setPrivacyDialogOpen] = useState(false);

  const { location, requestLocation } = useHomeLocation();
  const [nearbyState, setNearbyState] = useState<NearbyState>({
    isLoading: false,
    isError: false,
    count: null,
  });
  // Which conditions labels are shown on the map (filter chips in the welcome card).
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

  // Trigger ⌘K search dialog from the global RootLayoutClient
  const handleSearchClick = () => {
    window.dispatchEvent(
      new KeyboardEvent("keydown", { key: "k", metaKey: true, bubbles: true })
    );
  };

  const handleOpenMap = useCallback(() => {
    router.push("/map");
  }, [router]);

  return (
    <>
      <div className="relative h-[calc(100dvh-4rem)] overflow-hidden">
        {/* Map is hidden on mobile — there's a dedicated /map screen instead. */}
        <div className="absolute inset-0 z-0 hidden sm:block">
          <HomeMap
            position={location.position}
            visibleLabels={visibleLabels}
            onNearbyStateChange={setNearbyState}
            className="absolute inset-0"
          />
        </div>
        <div className="pointer-events-none absolute inset-0 z-10 flex flex-col">
          <WelcomeScreen
            onSearchClick={handleSearchClick}
            onAboutClick={() => setFeaturesDialogOpen(true)}
            onPrivacyClick={() => setPrivacyDialogOpen(true)}
            onLocateClick={requestLocation}
            onOpenMap={handleOpenMap}
            geoStatus={location.status}
            nearbyState={nearbyState}
            hiddenLabels={hiddenLabels}
            onToggleLabel={toggleLabel}
          />
        </div>
      </div>
      <FeaturesDialog open={featuresDialogOpen} onOpenChange={setFeaturesDialogOpen} />
      <PrivacyDialog open={privacyDialogOpen} onOpenChange={setPrivacyDialogOpen} />
    </>
  );
}
