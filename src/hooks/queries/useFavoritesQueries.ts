/**
 * React Query hooks for managing user favorites
 * Replaces localStorage-based system with server-first caching
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getUserProfile, hashSyncKeyAsync } from "@/lib/auth/sync-key";
import {
  fetchOrCreateUserProfile,
  fetchFavoritesByUserProfile,
  createFavorite as dbCreateFavorite,
  deleteFavorite as dbDeleteFavorite,
  updateFavorite as dbUpdateFavorite,
} from "@/lib/db/queries";
import type { Tables } from "@/integrations/supabase/types";

// Type aliases for better readability
export type Favorite = {
  id: string;
  userProfileId: string;
  areaId?: string;
  cragId?: string;
  areaName: string;
  areaSlug?: string;
  location?: string;
  latitude: number;
  longitude: number;
  rockType?: string;
  lastRating?: string;
  lastFrictionScore?: number;
  lastCheckedAt?: string;
  displayOrder: number;
  addedAt: string;
};

type DbFavorite = Tables<"user_favorites">;

/**
 * Convert database favorite to client-side format
 */
function dbFavoriteToClient(dbFav: DbFavorite): Favorite {
  return {
    id: dbFav.id,
    userProfileId: dbFav.user_profile_id,
    areaId: dbFav.area_id || undefined,
    cragId: dbFav.crag_id || undefined,
    areaName: dbFav.area_name,
    areaSlug: dbFav.area_slug || undefined,
    location: dbFav.location || undefined,
    latitude: dbFav.latitude,
    longitude: dbFav.longitude,
    rockType: dbFav.rock_type || undefined,
    lastRating: dbFav.last_rating || undefined,
    lastFrictionScore: dbFav.last_friction_score || undefined,
    lastCheckedAt: dbFav.last_checked_at || undefined,
    displayOrder: dbFav.display_order ?? 0,
    addedAt: dbFav.added_at || new Date().toISOString(),
  };
}

/**
 * Convert client-side favorite to database format
 */
function clientFavoriteToDb(
  fav: Omit<Favorite, "id" | "addedAt">
): Omit<DbFavorite, "id" | "created_at" | "updated_at" | "added_at"> {
  return {
    user_profile_id: fav.userProfileId,
    area_id: fav.areaId || null,
    crag_id: fav.cragId || null,
    area_name: fav.areaName,
    area_slug: fav.areaSlug || null,
    location: fav.location || null,
    latitude: fav.latitude,
    longitude: fav.longitude,
    rock_type: fav.rockType || null,
    last_rating: fav.lastRating || null,
    last_friction_score: fav.lastFrictionScore || null,
    last_checked_at: fav.lastCheckedAt || null,
    display_order: fav.displayOrder,
  };
}

/**
 * Query key factory for favorites
 */
const favoritesKeys = {
  all: ["favorites"] as const,
  byUser: (userId: string) => ["favorites", userId] as const,
};

/**
 * Get user profile ID from sync key
 */
async function getUserProfileId(): Promise<string | null> {
  try {
    const profile = getUserProfile();
    if (!profile) return null;

    const syncKeyHash = await hashSyncKeyAsync(profile.syncKey);
    const dbProfile = await fetchOrCreateUserProfile(syncKeyHash);
    return dbProfile.id;
  } catch (error) {
    console.error("[getUserProfileId] Error:", error);
    return null;
  }
}

/**
 * Fetch all favorites for the current user
 * Automatically refetches on window focus
 */
export function useFavorites() {
  return useQuery({
    queryKey: favoritesKeys.all,
    queryFn: async (): Promise<Favorite[]> => {
      const userId = await getUserProfileId();
      if (!userId) {
        console.warn("[useFavorites] No user profile found");
        return [];
      }

      const dbFavorites = await fetchFavoritesByUserProfile(userId);
      return dbFavorites.map(dbFavoriteToClient);
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: true,
    refetchOnMount: false,
  });
}

/**
 * Add a favorite with optimistic update
 */
export function useAddFavorite() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      favorite: Omit<Favorite, "id" | "userProfileId" | "addedAt" | "displayOrder">;
      previousFavorites: Favorite[];
    }): Promise<Favorite> => {
      const { favorite, previousFavorites } = data;

      const userId = await getUserProfileId();
      if (!userId) {
        throw new Error("No user profile found");
      }

      // Use previousFavorites (before optimistic update) to check for duplicates
      const maxOrder = previousFavorites.reduce((max, fav) => Math.max(max, fav.displayOrder), -1);

      const favoriteWithMetadata: Omit<Favorite, "id" | "addedAt"> = {
        ...favorite,
        userProfileId: userId,
        displayOrder: maxOrder + 1,
      };

      // Check if already exists in the ORIGINAL favorites (before optimistic update)
      const exists = previousFavorites.some(
        (f) =>
          (f.areaId && f.areaId === favorite.areaId) ||
          (f.cragId && f.cragId === favorite.cragId) ||
          (f.latitude === favorite.latitude && f.longitude === favorite.longitude)
      );

      if (exists) {
        throw new Error("Location already in favorites");
      }

      const newId = crypto.randomUUID();
      const now = new Date().toISOString();

      // Insert into database
      const dbFavorite = await dbCreateFavorite({
        id: newId,
        ...clientFavoriteToDb(favoriteWithMetadata),
        added_at: now,
      });

      return dbFavoriteToClient(dbFavorite);
    },
    onMutate: async (data) => {
      const newFavorite = data.favorite;

      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: favoritesKeys.all });

      // Snapshot the previous value
      const previousFavorites = queryClient.getQueryData<Favorite[]>(favoritesKeys.all);

      // Get user ID for optimistic update
      const userId = await getUserProfileId();
      if (!userId) return { previousFavorites };

      // Optimistically update to the new value
      const optimisticFavorite: Favorite = {
        id: crypto.randomUUID(),
        userProfileId: userId,
        displayOrder: (previousFavorites || []).length,
        addedAt: new Date().toISOString(),
        ...newFavorite,
      };

      queryClient.setQueryData<Favorite[]>(favoritesKeys.all, (old = []) => [
        ...old,
        optimisticFavorite,
      ]);

      return { previousFavorites };
    },
    onError: (error, _newFavorite, context) => {
      // Rollback to previous state
      if (context?.previousFavorites) {
        queryClient.setQueryData(favoritesKeys.all, context.previousFavorites);
      }
      console.error("[useAddFavorite] Error:", error);
    },
    onSettled: () => {
      // Refetch to ensure consistency
      queryClient.invalidateQueries({ queryKey: favoritesKeys.all });
    },
  });
}

/**
 * Remove a favorite with optimistic update
 */
export function useRemoveFavorite() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (favoriteId: string): Promise<void> => {
      await dbDeleteFavorite(favoriteId);
    },
    onMutate: async (favoriteId) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: favoritesKeys.all });

      // Snapshot the previous value
      const previousFavorites = queryClient.getQueryData<Favorite[]>(favoritesKeys.all);

      // Optimistically remove the favorite
      queryClient.setQueryData<Favorite[]>(favoritesKeys.all, (old = []) =>
        old.filter((fav) => fav.id !== favoriteId)
      );

      return { previousFavorites };
    },
    onError: (error, _favoriteId, context) => {
      // Rollback to previous state
      if (context?.previousFavorites) {
        queryClient.setQueryData(favoritesKeys.all, context.previousFavorites);
      }
      console.error("[useRemoveFavorite] Error:", error);
    },
    onSettled: () => {
      // Refetch to ensure consistency
      queryClient.invalidateQueries({ queryKey: favoritesKeys.all });
    },
  });
}

/**
 * Update favorite metadata (cached conditions) with optimistic update
 */
export function useUpdateFavorite() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      updates,
    }: {
      id: string;
      updates: Partial<
        Pick<Favorite, "lastRating" | "lastFrictionScore" | "lastCheckedAt" | "displayOrder">
      >;
    }): Promise<void> => {
      const dbUpdates: Record<string, unknown> = {};
      if (updates.lastRating !== undefined) dbUpdates.last_rating = updates.lastRating;
      if (updates.lastFrictionScore !== undefined)
        dbUpdates.last_friction_score = updates.lastFrictionScore;
      if (updates.lastCheckedAt !== undefined) dbUpdates.last_checked_at = updates.lastCheckedAt;
      if (updates.displayOrder !== undefined) dbUpdates.display_order = updates.displayOrder;

      await dbUpdateFavorite(id, dbUpdates);
    },
    onMutate: async ({ id, updates }) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: favoritesKeys.all });

      // Snapshot the previous value
      const previousFavorites = queryClient.getQueryData<Favorite[]>(favoritesKeys.all);

      // Optimistically update the favorite
      queryClient.setQueryData<Favorite[]>(favoritesKeys.all, (old = []) =>
        old.map((fav) =>
          fav.id === id
            ? {
                ...fav,
                ...updates,
              }
            : fav
        )
      );

      return { previousFavorites };
    },
    onError: (error, _variables, context) => {
      // Rollback to previous state
      if (context?.previousFavorites) {
        queryClient.setQueryData(favoritesKeys.all, context.previousFavorites);
      }
      console.error("[useUpdateFavorite] Error:", error);
    },
    onSettled: () => {
      // Refetch to ensure consistency
      queryClient.invalidateQueries({ queryKey: favoritesKeys.all });
    },
  });
}

/**
 * Derived query to check if a location is favorited
 * This is a lightweight hook that reads from the cache
 */
export function useIsFavorited(
  cragId?: string,
  areaId?: string,
  coords?: { lat: number; lon: number }
) {
  const { data: favorites = [] } = useFavorites();

  const isFavorited = favorites.some(
    (f) =>
      (cragId && f.cragId === cragId) ||
      (areaId && f.areaId === areaId) ||
      (coords && f.latitude === coords.lat && f.longitude === coords.lon)
  );

  const favorite =
    favorites.find(
      (f) =>
        (cragId && f.cragId === cragId) ||
        (areaId && f.areaId === areaId) ||
        (coords && f.latitude === coords.lat && f.longitude === coords.lon)
    ) || null;

  return {
    isFavorited,
    favorite,
  };
}
