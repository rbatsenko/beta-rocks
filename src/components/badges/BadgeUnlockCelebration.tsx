"use client";

import { useEffect, useState, useCallback } from "react";
import { createPortal } from "react-dom";
import confetti from "canvas-confetti";
import { useClientTranslation } from "@/hooks/useClientTranslation";
import type { BadgeDefinition } from "@/lib/badges";
import { cn } from "@/lib/utils";

interface BadgeUnlockCelebrationProps {
  /** Badges to celebrate. Shows one at a time in sequence. */
  badges: BadgeDefinition[];
  /** Called when celebration is dismissed or all badges shown. */
  onComplete: () => void;
  /** Called when user clicks "See in Profile" */
  onViewProfile?: () => void;
}

export function BadgeUnlockCelebration({
  badges,
  onComplete,
  onViewProfile,
}: BadgeUnlockCelebrationProps) {
  const { t } = useClientTranslation("common");
  const [currentIndex, setCurrentIndex] = useState(0);
  const [phase, setPhase] = useState<"enter" | "visible" | "exit">("enter");

  const currentBadge = badges[currentIndex];

  // Fire confetti when a new badge appears
  useEffect(() => {
    if (phase !== "enter") return;

    // Fireworks-style confetti burst
    const duration = 2000;
    const end = Date.now() + duration;

    const colors = ["#f97316", "#fb923c", "#fdba74", "#fbbf24", "#f59e0b"];

    const frame = () => {
      confetti({
        particleCount: 3,
        angle: 60,
        spread: 55,
        origin: { x: 0, y: 0.7 },
        colors,
        zIndex: 100001,
      });
      confetti({
        particleCount: 3,
        angle: 120,
        spread: 55,
        origin: { x: 1, y: 0.7 },
        colors,
        zIndex: 100001,
      });

      if (Date.now() < end) {
        requestAnimationFrame(frame);
      }
    };
    frame();

    // Center burst
    setTimeout(() => {
      confetti({
        particleCount: 80,
        spread: 100,
        origin: { x: 0.5, y: 0.4 },
        colors,
        zIndex: 100001,
        scalar: 1.2,
      });
    }, 300);

    // Transition to visible after animation
    const timer = setTimeout(() => setPhase("visible"), 800);
    return () => clearTimeout(timer);
  }, [currentIndex, phase]);

  const handleNext = useCallback(() => {
    if (currentIndex < badges.length - 1) {
      setPhase("exit");
      setTimeout(() => {
        setCurrentIndex((i) => i + 1);
        setPhase("enter");
      }, 300);
    } else {
      onComplete();
    }
  }, [currentIndex, badges.length, onComplete]);

  const handleViewProfile = useCallback(() => {
    onComplete();
    onViewProfile?.();
  }, [onComplete, onViewProfile]);

  if (!currentBadge) return null;

  return createPortal(
    <div
      className="fixed inset-0 flex items-center justify-center p-4"
      style={{ zIndex: 100000 }}
      onClick={handleNext}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 animate-in fade-in duration-300" />

      {/* Badge card */}
      <div
        onClick={(e) => e.stopPropagation()}
        className={cn(
          "relative z-10 flex flex-col items-center text-center max-w-sm w-full",
          "bg-background/95 backdrop-blur-xl rounded-2xl border-2 border-orange-400/50",
          "shadow-[0_0_60px_rgba(249,115,22,0.3)] p-8",
          // Enter animation: scale up + fly from bottom
          phase === "enter" &&
            "animate-in zoom-in-50 slide-in-from-bottom-8 duration-700 ease-out",
          phase === "exit" &&
            "animate-out zoom-out-50 fade-out slide-out-to-top-4 duration-300",
          phase === "visible" && "scale-100 opacity-100"
        )}
      >
        {/* Glow ring behind badge */}
        <div className="relative mb-4">
          <div className="absolute inset-0 -m-4 rounded-full bg-orange-500/20 blur-xl animate-pulse" />
          <div
            className={cn(
              "relative text-6xl leading-none",
              phase === "enter" && "animate-bounce"
            )}
          >
            {currentBadge.icon}
          </div>
        </div>

        {/* Unlocked label */}
        <div className="flex items-center gap-1.5 mb-2">
          <div className="h-px w-8 bg-gradient-to-r from-transparent to-orange-400" />
          <span className="text-xs font-bold uppercase tracking-widest text-orange-500">
            {t("badges.unlocked")}
          </span>
          <div className="h-px w-8 bg-gradient-to-l from-transparent to-orange-400" />
        </div>

        {/* Badge name */}
        <h2 className="text-xl font-bold text-foreground mb-1">
          {t(currentBadge.nameKey)}
        </h2>

        {/* Description */}
        <p className="text-sm text-muted-foreground mb-6">
          {t(currentBadge.descriptionKey)}
        </p>

        {/* Actions */}
        <div className="flex gap-3 w-full">
          {onViewProfile && (
            <button
              onClick={handleViewProfile}
              className="flex-1 rounded-lg bg-orange-500 hover:bg-orange-600 text-white font-medium py-2.5 px-4 text-sm transition-colors"
            >
              {t("badges.viewInProfile")}
            </button>
          )}
          <button
            onClick={handleNext}
            className={cn(
              "rounded-lg border border-border hover:bg-muted font-medium py-2.5 px-4 text-sm transition-colors text-muted-foreground",
              !onViewProfile && "flex-1"
            )}
          >
            {currentIndex < badges.length - 1
              ? t("badges.next")
              : t("badges.awesome")}
          </button>
        </div>

        {/* Badge counter if multiple */}
        {badges.length > 1 && (
          <div className="flex gap-1.5 mt-4">
            {badges.map((_, i) => (
              <div
                key={i}
                className={cn(
                  "h-1.5 rounded-full transition-all duration-300",
                  i === currentIndex
                    ? "w-6 bg-orange-500"
                    : i < currentIndex
                      ? "w-1.5 bg-orange-500/50"
                      : "w-1.5 bg-muted-foreground/30"
                )}
              />
            ))}
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}
