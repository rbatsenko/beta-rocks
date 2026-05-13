"use client";

import { useCallback, useEffect, useState } from "react";
import type { GeoStatus } from "@/components/home/home-map-types";

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

export function useHomeLocation() {
  const [location, setLocation] = useState<LocationState>({ position: null, status: "idle" });

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

  return { location, requestLocation };
}
