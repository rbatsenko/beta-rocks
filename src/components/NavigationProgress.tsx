"use client";

import { useEffect, useState } from "react";
import { useLinkStatus } from "next/link";
import { Loader2 } from "lucide-react";

/**
 * Global navigation progress indicator using Next.js built-in useLinkStatus.
 * Automatically detects navigation and shows loading state - works in production!
 */
export function NavigationProgress() {
  const { pending } = useLinkStatus();
  const [showBar, setShowBar] = useState(false);
  const [showOverlay, setShowOverlay] = useState(false);

  useEffect(() => {
    if (pending) {
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
  }, [pending]);

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
