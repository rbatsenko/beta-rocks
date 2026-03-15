/**
 * Secure storage utilities for mobile
 * Uses expo-secure-store for sensitive data (sync key)
 * Uses AsyncStorage-like patterns for general data
 */

import * as SecureStore from "expo-secure-store";

const SYNC_KEY = "beta_rocks_sync_key";
const USER_PROFILE_KEY = "beta_rocks_user_profile";
const FAVORITES_KEY = "beta_rocks_favorites";
const UNITS_KEY = "beta_rocks_units";

/**
 * Sync key storage (secure)
 */
export async function getSyncKey(): Promise<string | null> {
  return SecureStore.getItemAsync(SYNC_KEY);
}

export async function setSyncKey(key: string): Promise<void> {
  await SecureStore.setItemAsync(SYNC_KEY, key);
}

export async function clearSyncKey(): Promise<void> {
  await SecureStore.deleteItemAsync(SYNC_KEY);
}

/**
 * User profile storage
 */
export async function getUserProfile(): Promise<Record<string, unknown> | null> {
  const data = await SecureStore.getItemAsync(USER_PROFILE_KEY);
  return data ? JSON.parse(data) : null;
}

export async function saveUserProfile(
  profile: Record<string, unknown>
): Promise<void> {
  await SecureStore.setItemAsync(
    USER_PROFILE_KEY,
    JSON.stringify(profile)
  );
}

/**
 * Favorites storage
 */
export async function getFavorites(): Promise<unknown[]> {
  const data = await SecureStore.getItemAsync(FAVORITES_KEY);
  return data ? JSON.parse(data) : [];
}

export async function saveFavorites(favorites: unknown[]): Promise<void> {
  await SecureStore.setItemAsync(
    FAVORITES_KEY,
    JSON.stringify(favorites)
  );
}

/**
 * Units preferences storage
 */
export async function getUnitsPreference(): Promise<Record<string, string> | null> {
  const data = await SecureStore.getItemAsync(UNITS_KEY);
  return data ? JSON.parse(data) : null;
}

export async function saveUnitsPreference(
  units: Record<string, string>
): Promise<void> {
  await SecureStore.setItemAsync(UNITS_KEY, JSON.stringify(units));
}
