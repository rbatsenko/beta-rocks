/**
 * LocalStorage helpers for user stats caching
 * Implements localStorage-first pattern for instant UI updates
 */

export interface CachedUserStats {
  user_profile_id: string;
  reports_posted: number;
  confirmations_given: number;
  favorites_count: number;
  last_active: string;
  created_at: string;
  updated_at: string;
  cached_at: string; // When this was cached
}

const STORAGE_KEY = "temps_user_stats";
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Get user stats from localStorage
 */
export function getUserStatsFromStorage(): CachedUserStats | null {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return null;

    const stats = JSON.parse(stored) as CachedUserStats;

    // Check if cache is still valid
    const cacheAge = Date.now() - new Date(stats.cached_at).getTime();
    if (cacheAge > CACHE_TTL) {
      // Cache expired, return null to trigger refresh
      console.log("[getUserStatsFromStorage] Cache expired, will fetch fresh data");
      return null;
    }

    return stats;
  } catch (error) {
    console.error("[getUserStatsFromStorage] Failed to parse stats from localStorage:", error);
    return null;
  }
}

/**
 * Save user stats to localStorage
 */
export function saveUserStatsToStorage(stats: Omit<CachedUserStats, "cached_at">): void {
  try {
    const cached: CachedUserStats = {
      ...stats,
      cached_at: new Date().toISOString(),
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cached));
    console.log("[saveUserStatsToStorage] Cached user stats to localStorage");
  } catch (error) {
    console.error("[saveUserStatsToStorage] Failed to save stats to localStorage:", error);
  }
}

/**
 * Clear user stats from localStorage
 */
export function clearUserStatsFromStorage(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
    console.log("[clearUserStatsFromStorage] Cleared user stats from localStorage");
  } catch (error) {
    console.error("[clearUserStatsFromStorage] Failed to clear stats from localStorage:", error);
  }
}
