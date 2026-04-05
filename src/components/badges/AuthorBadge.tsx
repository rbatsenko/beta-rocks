"use client";

import { useState, useEffect } from "react";
import { fetchBadgeStats } from "@/lib/db/queries";
import { getHighestBadges } from "@/lib/badges";
import { useClientTranslation } from "@/hooks/useClientTranslation";

interface AuthorBadgeProps {
  authorId: string | null | undefined;
}

/**
 * Shows the highest-tier report badge next to an author's name on ReportCard.
 * Only fetches if authorId is provided, caches results in memory.
 */

// Simple in-memory cache to avoid refetching per card
const badgeCache = new Map<string, { icon: string; nameKey: string } | null>();

export function AuthorBadge({ authorId }: AuthorBadgeProps) {
  const { t } = useClientTranslation("common");
  const [badge, setBadge] = useState<{ icon: string; nameKey: string } | null>(
    authorId ? (badgeCache.get(authorId) ?? null) : null
  );
  const [loaded, setLoaded] = useState(authorId ? badgeCache.has(authorId) : true);

  useEffect(() => {
    if (!authorId) return;
    if (badgeCache.has(authorId)) {
      setBadge(badgeCache.get(authorId) ?? null);
      setLoaded(true);
      return;
    }

    let cancelled = false;

    fetchBadgeStats(authorId)
      .then((stats) => {
        if (cancelled) return;
        const highest = getHighestBadges(stats);
        // Pick the reports-category badge (most relevant for report cards)
        const reportBadge = highest.find((b) => b.category === "reports");
        const result = reportBadge
          ? { icon: reportBadge.icon, nameKey: reportBadge.nameKey }
          : null;
        badgeCache.set(authorId, result);
        setBadge(result);
        setLoaded(true);
      })
      .catch(() => {
        if (!cancelled) {
          badgeCache.set(authorId, null);
          setLoaded(true);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [authorId]);

  if (!loaded || !badge) return null;

  return (
    <span className="text-sm cursor-default" title={t(badge.nameKey)}>
      {badge.icon}
    </span>
  );
}
