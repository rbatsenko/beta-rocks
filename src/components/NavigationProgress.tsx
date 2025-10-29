"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter as useNextRouter, usePathname } from "next/navigation";
import { Loader2 } from "lucide-react";
import { createContext, useContext } from "react";

/**
 * Context to track navigation loading state globally
 */
const LoadingContext = createContext({
  isLoading: false,
  startLoading: () => {},
  stopLoading: () => {},
});

export function LoadingProvider({ children }: { children: React.ReactNode }) {
  const [isLoading, setIsLoading] = useState(false);
  const pathname = usePathname();

  // Stop loading when pathname changes (navigation complete)
  useEffect(() => {
    setIsLoading(false);
  }, [pathname]);

  const startLoading = useCallback(() => setIsLoading(true), []);
  const stopLoading = useCallback(() => setIsLoading(false), []);

  return (
    <LoadingContext.Provider value={{ isLoading, startLoading, stopLoading }}>
      {children}
    </LoadingContext.Provider>
  );
}

/**
 * Hook to manually control loading state (for router.push calls)
 */
export function useLoadingState() {
  return useContext(LoadingContext);
}

/**
 * Global navigation progress indicator.
 * Shows when isLoading is true in LoadingContext.
 */
export function NavigationProgress() {
  const { isLoading } = useContext(LoadingContext);
  const [showBar, setShowBar] = useState(false);
  const [showOverlay, setShowOverlay] = useState(false);

  useEffect(() => {
    if (isLoading) {
      // Show loading bar after 300ms (avoid flash for fast navigations)
      const barTimer = setTimeout(() => setShowBar(true), 300);

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
  }, [isLoading]);

  if (!showBar) return null;

  return (
    <>
      {/* Top loading bar */}
      <div className="fixed top-0 left-0 right-0 z-50">
        <div className="h-1 bg-gradient-to-r from-orange-400 via-orange-600 to-orange-400 animate-pulse" />
      </div>

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
    </>
  );
}
