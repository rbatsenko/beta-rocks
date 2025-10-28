/**
 * Sync key utilities for user authentication and multi-device sync
 * Handles sync key generation, hashing, and storage
 * Uses both localStorage (client-side) and cookies (SSR-compatible)
 */

import { createHash } from "crypto";
import { setUserProfileCookies, clearUserCookies } from "./cookie-actions";
import type { UnitsConfig } from "@/lib/units/types";

const SYNC_KEY_STORAGE_KEY = "temps_rocks_sync_key";
const USER_PROFILE_STORAGE_KEY = "temps_rocks_user_profile";

/**
 * Generate a new sync key (UUID v4)
 */
export function generateSyncKey(): string {
  // Use crypto.randomUUID() for secure random UUID generation
  if (typeof window !== "undefined" && window.crypto?.randomUUID) {
    return window.crypto.randomUUID();
  }
  // Fallback for environments without crypto.randomUUID
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Hash a sync key using SHA-256
 * This is what gets stored in the database for privacy
 */
export function hashSyncKey(key: string): string {
  if (typeof window !== "undefined") {
    // Browser environment - use SubtleCrypto (async)
    throw new Error("Use hashSyncKeyAsync in browser environment");
  }
  // Node.js environment (for server-side operations)
  return createHash("sha256").update(key).digest("hex");
}

/**
 * Hash a sync key using SHA-256 (async version for browser)
 */
export async function hashSyncKeyAsync(key: string): Promise<string> {
  if (typeof window !== "undefined" && window.crypto?.subtle) {
    const encoder = new TextEncoder();
    const data = encoder.encode(key);
    const hashBuffer = await window.crypto.subtle.digest("SHA-256", data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
  }
  // Fallback to Node.js crypto (shouldn't happen in browser)
  return hashSyncKey(key);
}

/**
 * Get or create a sync key for the current user
 * Stores in localStorage and returns the key
 */
export function getOrCreateSyncKey(): string {
  if (typeof window === "undefined") {
    throw new Error("getOrCreateSyncKey can only be called in browser environment");
  }

  const existingKey = localStorage.getItem(SYNC_KEY_STORAGE_KEY);
  if (existingKey) {
    return existingKey;
  }

  const newKey = generateSyncKey();
  localStorage.setItem(SYNC_KEY_STORAGE_KEY, newKey);
  return newKey;
}

/**
 * Get the current sync key (if exists)
 */
export function getSyncKey(): string | null {
  if (typeof window === "undefined") {
    return null;
  }
  return localStorage.getItem(SYNC_KEY_STORAGE_KEY);
}

/**
 * Set a sync key (used when syncing from another device)
 */
export function setSyncKey(key: string): void {
  if (typeof window === "undefined") {
    throw new Error("setSyncKey can only be called in browser environment");
  }
  localStorage.setItem(SYNC_KEY_STORAGE_KEY, key);
}

/**
 * Clear the sync key (logout / reset)
 */
export async function clearSyncKey(): Promise<void> {
  if (typeof window === "undefined") {
    throw new Error("clearSyncKey can only be called in browser environment");
  }
  localStorage.removeItem(SYNC_KEY_STORAGE_KEY);
  localStorage.removeItem(USER_PROFILE_STORAGE_KEY);

  // Also clear cookies
  await clearUserCookies();
}

/**
 * Format sync key for display (show first 8 and last 8 chars)
 */
export function formatSyncKeyForDisplay(key: string): string {
  if (key.length <= 16) {
    return key;
  }
  return `${key.slice(0, 8)}...${key.slice(-8)}`;
}

/**
 * Validate sync key format (should be UUID v4)
 */
export function isValidSyncKey(key: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(key);
}

/**
 * User profile stored locally
 */
export interface UserProfile {
  syncKey: string;
  syncKeyHash?: string;
  displayName?: string;
  units?: UnitsConfig;
  createdAt: string;
  updatedAt: string;
}

/**
 * Get user profile from localStorage
 */
export function getUserProfile(): UserProfile | null {
  if (typeof window === "undefined") {
    return null;
  }
  const stored = localStorage.getItem(USER_PROFILE_STORAGE_KEY);
  if (!stored) {
    return null;
  }
  try {
    return JSON.parse(stored) as UserProfile;
  } catch {
    return null;
  }
}

/**
 * Save user profile to localStorage and cookies
 */
export async function saveUserProfile(profile: UserProfile): Promise<void> {
  if (typeof window === "undefined") {
    throw new Error("saveUserProfile can only be called in browser environment");
  }
  localStorage.setItem(USER_PROFILE_STORAGE_KEY, JSON.stringify(profile));

  // Also set cookies for SSR (use hash, never raw sync key)
  const syncKeyHash = profile.syncKeyHash || (await hashSyncKeyAsync(profile.syncKey));
  await setUserProfileCookies(syncKeyHash, profile.displayName);
}

/**
 * Initialize user profile (create if doesn't exist)
 * If a local profile exists, returns it (for existing users)
 * If only a sync key exists (e.g., after restore), fetches from database
 * Otherwise creates a new profile
 */
export async function initializeUserProfile(): Promise<UserProfile> {
  const existingProfile = getUserProfile();
  if (existingProfile) {
    // Also ensure cookies are set for existing profiles (use hash, never raw sync key)
    const syncKeyHash =
      existingProfile.syncKeyHash || (await hashSyncKeyAsync(existingProfile.syncKey));
    await setUserProfileCookies(syncKeyHash, existingProfile.displayName);

    // Check if favorites need restoration (might be missing after sync key restore)
    try {
      const { getFavoritesFromStorage } = await import("@/lib/storage/favorites");
      const localFavorites = getFavoritesFromStorage();

      // If no local favorites, try to restore from database
      if (localFavorites.length === 0) {
        const { fetchOrCreateUserProfile, fetchFavoritesByUserProfile } = await import(
          "@/lib/db/queries"
        );
        const dbProfile = await fetchOrCreateUserProfile(syncKeyHash);

        if (dbProfile) {
          const dbFavorites = await fetchFavoritesByUserProfile(dbProfile.id);
          if (dbFavorites && dbFavorites.length > 0) {
            const { saveFavoritesToStorage } = await import("@/lib/storage/favorites");
            const favoritesForStorage = dbFavorites.map((dbFav) => ({
              id: dbFav.id,
              userProfileId: dbFav.user_profile_id,
              areaId: dbFav.area_id || undefined,
              cragId: dbFav.crag_id || undefined,
              areaName: dbFav.area_name,
              areaSlug: dbFav.area_slug || undefined,
              location: dbFav.location || "",
              latitude: dbFav.latitude,
              longitude: dbFav.longitude,
              rockType: dbFav.rock_type || undefined,
              lastRating: dbFav.last_rating || undefined,
              lastFrictionScore: dbFav.last_friction_score || undefined,
              lastCheckedAt: dbFav.last_checked_at || undefined,
              displayOrder: dbFav.display_order ?? 0,
              addedAt: dbFav.added_at || new Date().toISOString(),
            }));
            saveFavoritesToStorage(favoritesForStorage);
            console.log(
              `[initializeUserProfile] Lazy-restored ${favoritesForStorage.length} favorites`
            );
          }
        }
      }
    } catch (error) {
      console.warn("[initializeUserProfile] Failed to lazy-restore favorites:", error);
      // Non-critical, continue
    }

    return existingProfile;
  }

  const syncKey = getOrCreateSyncKey();
  const syncKeyHash = await hashSyncKeyAsync(syncKey);

  // Check if this sync key has a profile in the database
  // This happens after sync key restoration
  try {
    const { fetchOrCreateUserProfile, fetchFavoritesByUserProfile } = await import(
      "@/lib/db/queries"
    );
    const dbProfile = await fetchOrCreateUserProfile(syncKeyHash);

    // If database profile exists with data, use it
    if (dbProfile) {
      const now = new Date().toISOString();
      const profileWithDbData: UserProfile = {
        syncKey,
        syncKeyHash,
        displayName: dbProfile.display_name || undefined,
        units: dbProfile.units_temperature
          ? {
              temperature: dbProfile.units_temperature as any,
              windSpeed: dbProfile.units_wind_speed as any,
              precipitation: dbProfile.units_precipitation as any,
              distance: dbProfile.units_distance as any,
              elevation: dbProfile.units_elevation as any,
            }
          : undefined,
        createdAt: dbProfile.created_at || now,
        updatedAt: dbProfile.updated_at || now,
      };

      await saveUserProfile(profileWithDbData);

      // Also restore favorites from database
      try {
        const dbFavorites = await fetchFavoritesByUserProfile(dbProfile.id);
        if (dbFavorites && dbFavorites.length > 0) {
          const { saveFavoritesToStorage } = await import("@/lib/storage/favorites");
          const favoritesForStorage = dbFavorites.map((dbFav) => ({
            id: dbFav.id,
            userProfileId: dbFav.user_profile_id,
            areaId: dbFav.area_id || undefined,
            cragId: dbFav.crag_id || undefined,
            areaName: dbFav.area_name,
            areaSlug: dbFav.area_slug || undefined,
            location: dbFav.location || "",
            latitude: dbFav.latitude,
            longitude: dbFav.longitude,
            rockType: dbFav.rock_type || undefined,
            lastRating: dbFav.last_rating || undefined,
            lastFrictionScore: dbFav.last_friction_score || undefined,
            lastCheckedAt: dbFav.last_checked_at || undefined,
            displayOrder: dbFav.display_order ?? 0,
            addedAt: dbFav.added_at || new Date().toISOString(),
          }));
          saveFavoritesToStorage(favoritesForStorage);
          console.log(`[initializeUserProfile] Restored ${favoritesForStorage.length} favorites`);
        }
      } catch (favError) {
        console.warn("[initializeUserProfile] Failed to restore favorites:", favError);
        // Non-critical, continue
      }

      // Also restore most recent chat session from database
      try {
        const { supabase } = await import("@/integrations/supabase/client");

        // Fetch most recent session for this user
        const { data: sessions } = await supabase
          .from("chat_sessions")
          .select("*")
          .eq("user_profile_id", dbProfile.id)
          .order("updated_at", { ascending: false })
          .limit(1);

        if (sessions && sessions.length > 0) {
          const mostRecentSession = sessions[0];

          // Fetch messages for this session
          const { data: messages } = await supabase
            .from("chat_messages")
            .select("*")
            .eq("session_id", mostRecentSession.id)
            .order("created_at", { ascending: true });

          if (messages && messages.length > 0) {
            // Store session ID and messages in localStorage
            localStorage.setItem("temps_current_session_id", mostRecentSession.id);
            localStorage.setItem("temps_chat_messages", JSON.stringify(messages));
            console.log(
              `[initializeUserProfile] Restored chat session ${mostRecentSession.id} with ${messages.length} messages`
            );
          } else {
            // Session exists but no messages, just set the session ID
            localStorage.setItem("temps_current_session_id", mostRecentSession.id);
            console.log(
              `[initializeUserProfile] Restored empty chat session ${mostRecentSession.id}`
            );
          }
        }
      } catch (chatError) {
        console.warn("[initializeUserProfile] Failed to restore chat history:", chatError);
        // Non-critical, continue
      }

      return profileWithDbData;
    }
  } catch (error) {
    console.warn("[initializeUserProfile] Failed to fetch from database:", error);
    // Continue to create new profile
  }

  // No database profile, create new local profile
  const now = new Date().toISOString();
  const newProfile: UserProfile = {
    syncKey,
    syncKeyHash,
    createdAt: now,
    updatedAt: now,
  };

  await saveUserProfile(newProfile);
  return newProfile;
}

/**
 * Update user profile (e.g., display name)
 */
export async function updateUserProfile(updates: Partial<UserProfile>): Promise<UserProfile> {
  const current = getUserProfile();
  if (!current) {
    throw new Error("No user profile found");
  }

  const updated: UserProfile = {
    ...current,
    ...updates,
    updatedAt: new Date().toISOString(),
  };

  await saveUserProfile(updated);
  return updated;
}
