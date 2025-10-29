"use client";

import { useLinkStatus } from "next/link";
import { useEffect, useState } from "react";

/**
 * Global navigation progress bar.
 * Shows at the top during page navigation.
 */
export function NavigationProgress() {
  const { pending } = useLinkStatus();
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    console.log("[NavigationProgress] pending:", pending);

    if (pending) {
      // Start progress immediately
      setProgress(30);

      // Gradually increase
      const timer1 = setTimeout(() => setProgress(50), 200);
      const timer2 = setTimeout(() => setProgress(70), 500);
      const timer3 = setTimeout(() => setProgress(90), 1000);

      return () => {
        clearTimeout(timer1);
        clearTimeout(timer2);
        clearTimeout(timer3);
      };
    } else {
      // Complete and reset
      setProgress(100);
      const resetTimer = setTimeout(() => setProgress(0), 300);
      return () => clearTimeout(resetTimer);
    }
  }, [pending]);

  if (progress === 0) return null;

  return (
    <div
      className="fixed top-0 left-0 right-0 z-[9999] h-1 bg-orange-500 shadow-lg shadow-orange-500/50"
      style={{
        width: `${progress}%`,
        transition: "width 300ms ease-out, opacity 300ms",
        opacity: progress === 100 ? 0 : 1,
      }}
    />
  );
}
