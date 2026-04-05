"use client";

import { useState } from "react";
import { useClientTranslation } from "@/hooks/useClientTranslation";
import {
  computeBadges,
  getBadgesByCategory,
  type BadgeCategory,
  type BadgeStatus,
  type BadgeUserStats,
} from "@/lib/badges";
import { cn } from "@/lib/utils";

interface BadgesDisplayProps {
  stats: BadgeUserStats;
}

const CATEGORY_ORDER: { key: BadgeCategory; labelKey: string }[] = [
  { key: "reports", labelKey: "badges.categoryReports" },
  { key: "confirmations_received", labelKey: "badges.categoryConfirmationsReceived" },
  { key: "confirmations_given", labelKey: "badges.categoryConfirmationsGiven" },
  { key: "favorites", labelKey: "badges.categoryFavorites" },
  { key: "specialist", labelKey: "badges.categorySpecialist" },
];

export function BadgesDisplay({ stats }: BadgesDisplayProps) {
  const { t } = useClientTranslation("common");
  const allStatuses = computeBadges(stats);
  const [selectedBadge, setSelectedBadge] = useState<BadgeStatus | null>(null);

  const earnedCount = allStatuses.filter((s) => s.earned).length;
  const totalCount = allStatuses.length;

  return (
    <div className="space-y-5">
      {/* Summary */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">
          {t("badges.title")}
        </h3>
        <span className="text-xs text-muted-foreground">
          {t("badges.progress", { earned: earnedCount, total: totalCount })}
        </span>
      </div>

      {/* Categories */}
      {CATEGORY_ORDER.map(({ key, labelKey }) => {
        const categoryBadges = getBadgesByCategory(key);
        const categoryStatuses = allStatuses.filter((s) =>
          categoryBadges.some((b) => b.id === s.badge.id)
        );
        if (categoryStatuses.length === 0) return null;

        return (
          <div key={key} className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              {t(labelKey)}
            </p>
            <div className="flex flex-wrap gap-2">
              {categoryStatuses.map((status) => (
                <button
                  key={status.badge.id}
                  onClick={() =>
                    setSelectedBadge(
                      selectedBadge?.badge.id === status.badge.id ? null : status
                    )
                  }
                  className={cn(
                    "relative group flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm border transition-all duration-200",
                    status.earned
                      ? "bg-orange-500/10 border-orange-300 dark:border-orange-700 hover:bg-orange-500/20 hover:scale-105"
                      : "bg-muted/30 border-border opacity-50 hover:opacity-70",
                    selectedBadge?.badge.id === status.badge.id &&
                      "ring-2 ring-orange-500 ring-offset-1 ring-offset-background"
                  )}
                >
                  <span className={cn("text-base", !status.earned && "grayscale")}>
                    {status.badge.icon}
                  </span>
                  <span
                    className={cn(
                      "text-xs font-medium",
                      status.earned ? "text-foreground" : "text-muted-foreground"
                    )}
                  >
                    {t(status.badge.nameKey)}
                  </span>
                  {/* Progress indicator for unearned */}
                  {!status.earned && (
                    <span className="text-[10px] text-muted-foreground">
                      {status.current}/{status.badge.threshold}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>
        );
      })}

      {/* Selected badge detail */}
      {selectedBadge && (
        <div
          className={cn(
            "rounded-lg border p-3 animate-in fade-in slide-in-from-bottom-2 duration-200",
            selectedBadge.earned
              ? "bg-orange-500/5 border-orange-200 dark:border-orange-800"
              : "bg-muted/20 border-border"
          )}
        >
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xl">{selectedBadge.badge.icon}</span>
            <span className="font-semibold text-sm">
              {t(selectedBadge.badge.nameKey)}
            </span>
            {selectedBadge.earned && (
              <span className="text-xs text-orange-600 dark:text-orange-400 font-medium">
                {t("badges.earned")}
              </span>
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            {t(selectedBadge.badge.descriptionKey)}
          </p>
          {!selectedBadge.earned && (
            <div className="mt-2">
              <div className="flex justify-between text-[10px] text-muted-foreground mb-1">
                <span>
                  {selectedBadge.current} / {selectedBadge.badge.threshold}
                </span>
                <span>{Math.round(selectedBadge.progress * 100)}%</span>
              </div>
              <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-orange-500 rounded-full transition-all duration-500"
                  style={{ width: `${selectedBadge.progress * 100}%` }}
                />
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
