/**
 * Badge definitions for the gamification system.
 * Pure functions — no DB dependency. Badges are computed from user stats.
 */

export type BadgeCategory =
  | "reports"
  | "confirmations_given"
  | "confirmations_received"
  | "favorites"
  | "specialist";

export type SpecialistType =
  | "conditions"
  | "safety"
  | "access"
  | "climbing_info";

export interface BadgeDefinition {
  id: string;
  category: BadgeCategory;
  /** i18n key for badge name, e.g. "badges.firstAscent" */
  nameKey: string;
  /** i18n key for badge description */
  descriptionKey: string;
  /** Threshold value to unlock */
  threshold: number;
  /** Emoji icon for the badge */
  icon: string;
  /** Tier level (1 = lowest) */
  tier: number;
  /** For specialist badges, the report category */
  specialistType?: SpecialistType;
}

// ── Report milestones ──────────────────────────────────────────────

const REPORT_BADGES: BadgeDefinition[] = [
  {
    id: "first_ascent",
    category: "reports",
    nameKey: "badges.firstAscent",
    descriptionKey: "badges.firstAscentDesc",
    threshold: 1,
    icon: "🧗",
    tier: 1,
  },
  {
    id: "regular",
    category: "reports",
    nameKey: "badges.regular",
    descriptionKey: "badges.regularDesc",
    threshold: 5,
    icon: "🎒",
    tier: 2,
  },
  {
    id: "local_expert",
    category: "reports",
    nameKey: "badges.localExpert",
    descriptionKey: "badges.localExpertDesc",
    threshold: 15,
    icon: "🗺️",
    tier: 3,
  },
  {
    id: "crag_guardian",
    category: "reports",
    nameKey: "badges.cragGuardian",
    descriptionKey: "badges.cragGuardianDesc",
    threshold: 30,
    icon: "🛡️",
    tier: 4,
  },
  {
    id: "beta_machine",
    category: "reports",
    nameKey: "badges.betaMachine",
    descriptionKey: "badges.betaMachineDesc",
    threshold: 50,
    icon: "⚡",
    tier: 5,
  },
  {
    id: "community_legend",
    category: "reports",
    nameKey: "badges.communityLegend",
    descriptionKey: "badges.communityLegendDesc",
    threshold: 100,
    icon: "👑",
    tier: 6,
  },
];

// ── Confirmations given milestones ─────────────────────────────────

const CONFIRMATIONS_GIVEN_BADGES: BadgeDefinition[] = [
  {
    id: "first_thumbs_up",
    category: "confirmations_given",
    nameKey: "badges.firstThumbsUp",
    descriptionKey: "badges.firstThumbsUpDesc",
    threshold: 1,
    icon: "👍",
    tier: 1,
  },
  {
    id: "supporter",
    category: "confirmations_given",
    nameKey: "badges.supporter",
    descriptionKey: "badges.supporterDesc",
    threshold: 10,
    icon: "🤝",
    tier: 2,
  },
  {
    id: "trusted_spotter",
    category: "confirmations_given",
    nameKey: "badges.trustedSpotter",
    descriptionKey: "badges.trustedSpotterDesc",
    threshold: 25,
    icon: "🔭",
    tier: 3,
  },
  {
    id: "community_pillar",
    category: "confirmations_given",
    nameKey: "badges.communityPillar",
    descriptionKey: "badges.communityPillarDesc",
    threshold: 50,
    icon: "🏛️",
    tier: 4,
  },
];

// ── Confirmations received milestones ──────────────────────────────

const CONFIRMATIONS_RECEIVED_BADGES: BadgeDefinition[] = [
  {
    id: "helpful",
    category: "confirmations_received",
    nameKey: "badges.helpful",
    descriptionKey: "badges.helpfulDesc",
    threshold: 1,
    icon: "✨",
    tier: 1,
  },
  {
    id: "trusted_voice",
    category: "confirmations_received",
    nameKey: "badges.trustedVoice",
    descriptionKey: "badges.trustedVoiceDesc",
    threshold: 10,
    icon: "📣",
    tier: 2,
  },
  {
    id: "community_favorite",
    category: "confirmations_received",
    nameKey: "badges.communityFavorite",
    descriptionKey: "badges.communityFavoriteDesc",
    threshold: 25,
    icon: "🔥",
    tier: 3,
  },
  {
    id: "oracle",
    category: "confirmations_received",
    nameKey: "badges.oracle",
    descriptionKey: "badges.oracleDesc",
    threshold: 50,
    icon: "🔮",
    tier: 4,
  },
  {
    id: "living_guidebook",
    category: "confirmations_received",
    nameKey: "badges.livingGuidebook",
    descriptionKey: "badges.livingGuidebookDesc",
    threshold: 100,
    icon: "📖",
    tier: 5,
  },
];

// ── Favorites milestones ───────────────────────────────────────────

const FAVORITES_BADGES: BadgeDefinition[] = [
  {
    id: "first_favorite",
    category: "favorites",
    nameKey: "badges.firstFavorite",
    descriptionKey: "badges.firstFavoriteDesc",
    threshold: 1,
    icon: "❤️",
    tier: 1,
  },
  {
    id: "crag_collector",
    category: "favorites",
    nameKey: "badges.cragCollector",
    descriptionKey: "badges.cragCollectorDesc",
    threshold: 5,
    icon: "📌",
    tier: 2,
  },
  {
    id: "globetrotter",
    category: "favorites",
    nameKey: "badges.globetrotter",
    descriptionKey: "badges.globetrotterDesc",
    threshold: 15,
    icon: "🌍",
    tier: 3,
  },
];

// ── Category specialist milestones ─────────────────────────────────

const SPECIALIST_BADGES: BadgeDefinition[] = [
  {
    id: "weather_watcher",
    category: "specialist",
    nameKey: "badges.weatherWatcher",
    descriptionKey: "badges.weatherWatcherDesc",
    threshold: 5,
    icon: "🌤️",
    tier: 1,
    specialistType: "conditions",
  },
  {
    id: "safety_scout",
    category: "specialist",
    nameKey: "badges.safetyScout",
    descriptionKey: "badges.safetyScoutDesc",
    threshold: 5,
    icon: "🦺",
    tier: 1,
    specialistType: "safety",
  },
  {
    id: "access_advocate",
    category: "specialist",
    nameKey: "badges.accessAdvocate",
    descriptionKey: "badges.accessAdvocateDesc",
    threshold: 5,
    icon: "🚪",
    tier: 1,
    specialistType: "access",
  },
  {
    id: "beta_guru",
    category: "specialist",
    nameKey: "badges.betaGuru",
    descriptionKey: "badges.betaGuruDesc",
    threshold: 5,
    icon: "🧠",
    tier: 1,
    specialistType: "climbing_info",
  },
];

// ── All badges ─────────────────────────────────────────────────────

export const ALL_BADGES: BadgeDefinition[] = [
  ...REPORT_BADGES,
  ...CONFIRMATIONS_GIVEN_BADGES,
  ...CONFIRMATIONS_RECEIVED_BADGES,
  ...FAVORITES_BADGES,
  ...SPECIALIST_BADGES,
];

export function getBadgesByCategory(category: BadgeCategory): BadgeDefinition[] {
  return ALL_BADGES.filter((b) => b.category === category);
}

// ── Badge computation ──────────────────────────────────────────────

export interface BadgeUserStats {
  reports_posted: number;
  confirmations_given: number;
  confirmations_received: number;
  favorites_count: number;
  /** Report count per category, e.g. { conditions: 8, safety: 3 } */
  reports_by_category?: Record<string, number>;
}

export interface EarnedBadge {
  badge: BadgeDefinition;
  earned: true;
}

export interface UnearnedBadge {
  badge: BadgeDefinition;
  earned: false;
  progress: number; // 0-1
  current: number;
}

export type BadgeStatus = EarnedBadge | UnearnedBadge;

/**
 * Compute all badge statuses for a user.
 */
export function computeBadges(stats: BadgeUserStats): BadgeStatus[] {
  const results: BadgeStatus[] = [];

  for (const badge of ALL_BADGES) {
    const current = getStatValueForBadge(badge, stats);
    if (current >= badge.threshold) {
      results.push({ badge, earned: true });
    } else {
      results.push({
        badge,
        earned: false,
        progress: current / badge.threshold,
        current,
      });
    }
  }

  return results;
}

/**
 * Get only earned badges for display.
 */
export function getEarnedBadges(stats: BadgeUserStats): BadgeDefinition[] {
  return ALL_BADGES.filter((badge) => {
    const current = getStatValueForBadge(badge, stats);
    return current >= badge.threshold;
  });
}

/**
 * Get the highest-tier earned badge per category (for compact display).
 */
export function getHighestBadges(stats: BadgeUserStats): BadgeDefinition[] {
  const categoryMap = new Map<string, BadgeDefinition>();

  for (const badge of ALL_BADGES) {
    const current = getStatValueForBadge(badge, stats);
    if (current < badge.threshold) continue;

    // For specialist badges, key by specialist type
    const key = badge.specialistType
      ? `specialist_${badge.specialistType}`
      : badge.category;

    const existing = categoryMap.get(key);
    if (!existing || badge.tier > existing.tier) {
      categoryMap.set(key, badge);
    }
  }

  return Array.from(categoryMap.values());
}

/**
 * Find newly earned badges by comparing old vs new stats.
 */
export function findNewlyEarnedBadges(
  oldStats: BadgeUserStats,
  newStats: BadgeUserStats
): BadgeDefinition[] {
  const oldEarned = new Set(getEarnedBadges(oldStats).map((b) => b.id));
  return getEarnedBadges(newStats).filter((b) => !oldEarned.has(b.id));
}

// ── Helpers ────────────────────────────────────────────────────────

function getStatValueForBadge(badge: BadgeDefinition, stats: BadgeUserStats): number {
  switch (badge.category) {
    case "reports":
      return stats.reports_posted;
    case "confirmations_given":
      return stats.confirmations_given;
    case "confirmations_received":
      return stats.confirmations_received;
    case "favorites":
      return stats.favorites_count;
    case "specialist":
      return stats.reports_by_category?.[badge.specialistType!] ?? 0;
  }
}
