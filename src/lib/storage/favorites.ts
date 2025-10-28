/**
 * Local storage utilities for managing favorite crags
 * Provides offline-first storage with sync capabilities
 */

const FAVORITES_STORAGE_KEY = "temps_rocks_favorites";
const RECENT_SEARCHES_STORAGE_KEY = "temps_rocks_recent_searches";

export interface Favorite {
  id: string;
  userProfileId?: string;
  areaId?: string;
  cragId?: string;
  areaName: string;
  areaSlug?: string;
  location: string;
  latitude: number;
  longitude: number;
  rockType?: string;

  // Cached conditions
  lastRating?: string;
  lastFrictionScore?: number;
  lastCheckedAt?: string;

  // Metadata
  displayOrder: number;
  addedAt: string;
}

export interface RecentSearch {
  id: string;
  areaId?: string;
  areaName: string;
  location: string;
  latitude: number;
  longitude: number;
  searchedAt: string;
}

/**
 * Get all favorites from localStorage
 */
export function getFavoritesFromStorage(): Favorite[] {
  if (typeof window === "undefined") {
    return [];
  }

  const stored = localStorage.getItem(FAVORITES_STORAGE_KEY);
  if (!stored) {
    return [];
  }

  try {
    return JSON.parse(stored) as Favorite[];
  } catch {
    return [];
  }
}

/**
 * Save favorites to localStorage
 */
export function saveFavoritesToStorage(favorites: Favorite[]): void {
  if (typeof window === "undefined") {
    throw new Error("saveFavoritesToStorage can only be called in browser environment");
  }
  localStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(favorites));
}

/**
 * Add a favorite to localStorage AND sync to database
 */
export async function addFavoriteToStorage(
  favorite: Omit<Favorite, "id" | "addedAt">
): Promise<Favorite> {
  const favorites = getFavoritesFromStorage();

  // Check if already exists
  const exists = favorites.some(
    (f) =>
      (f.areaId && f.areaId === favorite.areaId) ||
      (f.cragId && f.cragId === favorite.cragId) ||
      (f.latitude === favorite.latitude && f.longitude === favorite.longitude)
  );

  if (exists) {
    throw new Error("Location already in favorites");
  }

  const newFavorite: Favorite = {
    ...favorite,
    id: crypto.randomUUID(),
    addedAt: new Date().toISOString(),
  };

  favorites.push(newFavorite);
  saveFavoritesToStorage(favorites);

  // Also sync to database
  try {
    const { getUserProfile, hashSyncKeyAsync } = await import("@/lib/auth/sync-key");
    const { fetchOrCreateUserProfile, createFavorite } = await import("@/lib/db/queries");

    const profile = getUserProfile();
    if (profile) {
      const syncKeyHash = await hashSyncKeyAsync(profile.syncKey);
      const dbProfile = await fetchOrCreateUserProfile(syncKeyHash);

      await createFavorite({
        id: newFavorite.id,
        user_profile_id: dbProfile.id,
        area_id: newFavorite.areaId,
        crag_id: newFavorite.cragId,
        area_name: newFavorite.areaName,
        area_slug: newFavorite.areaSlug,
        location: newFavorite.location,
        latitude: newFavorite.latitude,
        longitude: newFavorite.longitude,
        rock_type: newFavorite.rockType,
        last_rating: newFavorite.lastRating,
        last_friction_score: newFavorite.lastFrictionScore,
        last_checked_at: newFavorite.lastCheckedAt,
        display_order: newFavorite.displayOrder,
        added_at: newFavorite.addedAt,
      });

      console.log(`[addFavoriteToStorage] Synced favorite to database: ${newFavorite.areaName}`);
    }
  } catch (error) {
    console.warn("[addFavoriteToStorage] Failed to sync to database:", error);
    // Non-critical, favorite is still saved locally
  }

  return newFavorite;
}

/**
 * Remove a favorite from localStorage
 */
export function removeFavoriteFromStorage(id: string): void {
  const favorites = getFavoritesFromStorage();
  const updated = favorites.filter((f) => f.id !== id);
  saveFavoritesToStorage(updated);
}

/**
 * Update a favorite in localStorage
 */
export function updateFavoriteInStorage(id: string, updates: Partial<Favorite>): Favorite | null {
  const favorites = getFavoritesFromStorage();
  const index = favorites.findIndex((f) => f.id === id);

  if (index === -1) {
    return null;
  }

  favorites[index] = {
    ...favorites[index],
    ...updates,
  };

  saveFavoritesToStorage(favorites);
  return favorites[index];
}

/**
 * Check if a location is favorited
 */
export function isFavorited(
  areaId?: string,
  cragId?: string,
  coordinates?: { lat: number; lon: number }
): boolean {
  const favorites = getFavoritesFromStorage();

  return favorites.some(
    (f) =>
      (areaId && f.areaId === areaId) ||
      (cragId && f.cragId === cragId) ||
      (coordinates && f.latitude === coordinates.lat && f.longitude === coordinates.lon)
  );
}

/**
 * Get a favorite by its identifiers
 */
export function getFavorite(
  areaId?: string,
  cragId?: string,
  coordinates?: { lat: number; lon: number }
): Favorite | null {
  const favorites = getFavoritesFromStorage();

  return (
    favorites.find(
      (f) =>
        (areaId && f.areaId === areaId) ||
        (cragId && f.cragId === cragId) ||
        (coordinates && f.latitude === coordinates.lat && f.longitude === coordinates.lon)
    ) || null
  );
}

/**
 * Clear all favorites
 */
export function clearFavorites(): void {
  if (typeof window === "undefined") {
    throw new Error("clearFavorites can only be called in browser environment");
  }
  localStorage.removeItem(FAVORITES_STORAGE_KEY);
}

// ==================== RECENT SEARCHES ====================

/**
 * Get recent searches from localStorage
 */
export function getRecentSearchesFromStorage(): RecentSearch[] {
  if (typeof window === "undefined") {
    return [];
  }

  const stored = localStorage.getItem(RECENT_SEARCHES_STORAGE_KEY);
  if (!stored) {
    return [];
  }

  try {
    return JSON.parse(stored) as RecentSearch[];
  } catch {
    return [];
  }
}

/**
 * Save recent searches to localStorage
 */
export function saveRecentSearchesToStorage(searches: RecentSearch[]): void {
  if (typeof window === "undefined") {
    throw new Error("saveRecentSearchesToStorage can only be called in browser environment");
  }
  localStorage.setItem(RECENT_SEARCHES_STORAGE_KEY, JSON.stringify(searches));
}

/**
 * Add a search to recent searches (limit to 20)
 */
export function addRecentSearch(search: Omit<RecentSearch, "id" | "searchedAt">): void {
  const searches = getRecentSearchesFromStorage();

  // Check if already exists (by area ID or coordinates)
  const existingIndex = searches.findIndex(
    (s) =>
      (s.areaId && s.areaId === search.areaId) ||
      (s.latitude === search.latitude && s.longitude === search.longitude)
  );

  // If exists, move to top
  if (existingIndex !== -1) {
    const existing = searches[existingIndex];
    searches.splice(existingIndex, 1);
    searches.unshift({
      ...existing,
      searchedAt: new Date().toISOString(),
    });
  } else {
    // Add new search at top
    searches.unshift({
      ...search,
      id: crypto.randomUUID(),
      searchedAt: new Date().toISOString(),
    });
  }

  // Limit to 20 recent searches
  const limited = searches.slice(0, 20);
  saveRecentSearchesToStorage(limited);
}

/**
 * Clear recent searches
 */
export function clearRecentSearches(): void {
  if (typeof window === "undefined") {
    throw new Error("clearRecentSearches can only be called in browser environment");
  }
  localStorage.removeItem(RECENT_SEARCHES_STORAGE_KEY);
}
