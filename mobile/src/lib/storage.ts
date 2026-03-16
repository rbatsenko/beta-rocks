/**
 * Storage utilities for mobile
 * Uses expo-secure-store for sensitive data (sync key only)
 * Uses MMKV for general app data (profile, favorites, units)
 */

import * as SecureStore from "expo-secure-store";
import { MMKV } from "react-native-mmkv";

const mmkv = new MMKV();

const SYNC_KEY = "beta_rocks_sync_key";
const USER_PROFILE_KEY = "beta_rocks_user_profile";
const FAVORITES_KEY = "beta_rocks_favorites";
const UNITS_KEY = "beta_rocks_units";

/**
 * Sync key storage (SecureStore — Keychain/Keystore)
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
 * User profile storage (MMKV — fast, no size limits)
 */
export function getUserProfile(): Record<string, unknown> | null {
  try {
    const data = mmkv.getString(USER_PROFILE_KEY);
    return data ? JSON.parse(data) : null;
  } catch {
    mmkv.delete(USER_PROFILE_KEY);
    return null;
  }
}

export function saveUserProfile(
  profile: Record<string, unknown>
): void {
  mmkv.set(USER_PROFILE_KEY, JSON.stringify(profile));
}

/**
 * Favorites storage (MMKV — can handle large lists)
 */
export function getFavorites(): unknown[] {
  try {
    const data = mmkv.getString(FAVORITES_KEY);
    const parsed = data ? JSON.parse(data) : [];
    console.log("[Storage] getFavorites: raw length", data?.length || 0, "parsed count", parsed.length);
    return parsed;
  } catch (e) {
    console.warn("[Storage] getFavorites parse error:", e);
    mmkv.delete(FAVORITES_KEY);
    return [];
  }
}

export function saveFavorites(favorites: unknown[]): void {
  const json = JSON.stringify(favorites);
  console.log("[Storage] saveFavorites: saving", favorites.length, "items, bytes:", json.length);
  mmkv.set(FAVORITES_KEY, json);
}

/**
 * Units preferences storage (MMKV)
 */
export function getUnitsPreference(): Record<string, string> | null {
  try {
    const data = mmkv.getString(UNITS_KEY);
    return data ? JSON.parse(data) : null;
  } catch {
    mmkv.delete(UNITS_KEY);
    return null;
  }
}

export function saveUnitsPreference(
  units: Record<string, string>
): void {
  mmkv.set(UNITS_KEY, JSON.stringify(units));
}
