"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { WelcomeScreen } from "@/components/home/WelcomeScreen";
import { HomeMap } from "@/components/home/HomeMap";
import { MAP_LABEL_KEYS, type GeoStatus, type NearbyState } from "@/components/home/home-map-types";
import { FeaturesDialog } from "@/components/dialogs/FeaturesDialog";
import { PrivacyDialog } from "@/components/dialogs/PrivacyDialog";

interface UserLocation {
  lat: number;
  lon: number;
}

interface LocationState {
  position: UserLocation | null;
  status: GeoStatus;
}

const LOCATION_STORAGE_KEY = "betarocks:home-map-location";

function readStoredLocation(): UserLocation | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(LOCATION_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (typeof parsed?.lat === "number" && typeof parsed?.lon === "number") {
      return { lat: parsed.lat, lon: parsed.lon };
    }
  } catch {
    // ignore malformed cache
  }
  return null;
}

export function HomePageClient() {
  const [featuresDialogOpen, setFeaturesDialogOpen] = useState(false);
  const [privacyDialogOpen, setPrivacyDialogOpen] = useState(false);

  const [location, setLocation] = useState<LocationState>({ position: null, status: "idle" });
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

  // After hydration, restore a previously granted location (or flag unsupported browsers).
  useEffect(() => {
    const stored = readStoredLocation();
    const geoUnavailable = typeof navigator === "undefined" || !("geolocation" in navigator);
    if (!stored && !geoUnavailable) return; // nothing to sync — stays "idle"
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time hydration from client-only storage / APIs
    setLocation(
      stored ? { position: stored, status: "ready" } : { position: null, status: "unsupported" }
    );
  }, []);

  const requestLocation = useCallback(() => {
    if (typeof navigator === "undefined" || !("geolocation" in navigator)) {
      setLocation({ position: null, status: "unsupported" });
      return;
    }
    setLocation((prev) => ({ ...prev, status: "locating" }));
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const next: UserLocation = { lat: pos.coords.latitude, lon: pos.coords.longitude };
        setLocation({ position: next, status: "ready" });
        try {
          window.localStorage.setItem(LOCATION_STORAGE_KEY, JSON.stringify(next));
        } catch {
          // ignore storage failures (private mode, quota, etc.)
        }
      },
      () => setLocation((prev) => ({ ...prev, status: "error" })),
      { enableHighAccuracy: false, timeout: 10_000, maximumAge: 5 * 60_000 }
    );
  }, []);

  // Trigger ⌘K search dialog from the global RootLayoutClient
  const handleSearchClick = () => {
    window.dispatchEvent(
      new KeyboardEvent("keydown", { key: "k", metaKey: true, bubbles: true })
    );
  };

  return (
    <>
      <div className="relative h-[calc(100dvh-4rem)] overflow-hidden">
        <HomeMap
          position={location.position}
          visibleLabels={visibleLabels}
          onNearbyStateChange={setNearbyState}
          className="absolute inset-0 z-0"
        />
        <div className="pointer-events-none absolute inset-0 z-10 flex flex-col">
          <WelcomeScreen
            onSearchClick={handleSearchClick}
            onAboutClick={() => setFeaturesDialogOpen(true)}
            onPrivacyClick={() => setPrivacyDialogOpen(true)}
            onLocateClick={requestLocation}
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
