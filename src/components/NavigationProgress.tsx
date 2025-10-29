"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { Loader2 } from "lucide-react";
import { getNavigationEmitter } from "../../instrumentation-client";

/**
 * Global navigation progress indicator using Next.js instrumentation API.
 * Tracks ALL navigation including router.push() and Link clicks - works in production!
 */
export function NavigationProgress() {
  const pathname = usePathname();
  const [isNavigating, setIsNavigating] = useState(false);
  const [showBar, setShowBar] = useState(false);
  const [showOverlay, setShowOverlay] = useState(false);

  // Subscribe to global navigation events
  useEffect(() => {
    const emitter = getNavigationEmitter();

    const handleStart = () => {
      setIsNavigating(true);
    };

    const handleEnd = () => {
      setIsNavigating(false);
    };

    emitter.addEventListener("navigationStart", handleStart);
    emitter.addEventListener("navigationEnd", handleEnd);

    return () => {
      emitter.removeEventListener("navigationStart", handleStart);
      emitter.removeEventListener("navigationEnd", handleEnd);
    };
  }, []);

  // End navigation when pathname changes (page loaded)
  useEffect(() => {
    const emitter = getNavigationEmitter();
    emitter.endNavigation();
  }, [pathname]);

  // Show loading UI after delays
  useEffect(() => {
    if (isNavigating) {
      // Show loading bar after 100ms
      const barTimer = setTimeout(() => setShowBar(true), 100);

      // Show full overlay after 1.5s (for very slow loads)
      const overlayTimer = setTimeout(() => setShowOverlay(true), 1500);

      return () => {
        clearTimeout(barTimer);
        clearTimeout(overlayTimer);
      };
    } else {
      setShowBar(false);
      setShowOverlay(false);
    }
  }, [isNavigating]);

  if (!showBar) return null;

  return (
    <>
      {/* Top loading bar - thin and animated */}
      <div
        className="fixed top-0 left-0 right-0 z-50"
        style={{
          height: "3px",
          backgroundColor: "#f97316",
          animation: "progress 2s ease-in-out infinite",
        }}
      />

      {/* Full-screen loading overlay for very slow loads */}
      {showOverlay && (
        <div className="fixed inset-0 z-40 bg-background/80 backdrop-blur-sm flex items-center justify-center animate-in fade-in duration-300">
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="h-12 w-12 text-orange-500 animate-spin" />
            <p className="text-sm text-muted-foreground">Loading conditions...</p>
            <p className="text-xs text-muted-foreground/70">Fetching weather data...</p>
          </div>
        </div>
      )}

      <style jsx>{`
        @keyframes progress {
          0% {
            width: 10%;
          }
          50% {
            width: 70%;
          }
          100% {
            width: 95%;
          }
        }
      `}</style>
    </>
  );
}
