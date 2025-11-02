import { useState, useEffect } from "react";

/**
 * Detect user's platform for keyboard shortcuts
 * @returns "mac" | "windows" | "linux" | "other"
 */
export function usePlatform() {
  const [platform, setPlatform] = useState<"mac" | "windows" | "linux" | "other">("other");

  useEffect(() => {
    // Client-side only
    if (typeof window === "undefined") return;

    const userAgent = window.navigator.userAgent.toLowerCase();
    const platform = window.navigator.platform?.toLowerCase() || "";

    if (platform.includes("mac") || userAgent.includes("mac")) {
      setPlatform("mac");
    } else if (platform.includes("win") || userAgent.includes("win")) {
      setPlatform("windows");
    } else if (platform.includes("linux") || userAgent.includes("linux")) {
      setPlatform("linux");
    } else {
      setPlatform("other");
    }
  }, []);

  return platform;
}

/**
 * Get the modifier key for keyboard shortcuts based on platform
 * @returns "Cmd" for Mac, "Ctrl" for others
 */
export function useModifierKey() {
  const platform = usePlatform();
  return platform === "mac" ? "Cmd" : "Ctrl";
}
