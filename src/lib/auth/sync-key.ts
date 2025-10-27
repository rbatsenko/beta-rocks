/**
 * Sync key utilities for user authentication and multi-device sync
 * Handles sync key generation, hashing, and storage
 */

import { createHash } from "crypto";

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
export function clearSyncKey(): void {
  if (typeof window === "undefined") {
    throw new Error("clearSyncKey can only be called in browser environment");
  }
  localStorage.removeItem(SYNC_KEY_STORAGE_KEY);
  localStorage.removeItem(USER_PROFILE_STORAGE_KEY);
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
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(key);
}

/**
 * User profile stored locally
 */
export interface UserProfile {
  syncKey: string;
  syncKeyHash?: string;
  displayName?: string;
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
 * Save user profile to localStorage
 */
export function saveUserProfile(profile: UserProfile): void {
  if (typeof window === "undefined") {
    throw new Error("saveUserProfile can only be called in browser environment");
  }
  localStorage.setItem(USER_PROFILE_STORAGE_KEY, JSON.stringify(profile));
}

/**
 * Initialize user profile (create if doesn't exist)
 */
export async function initializeUserProfile(): Promise<UserProfile> {
  const existingProfile = getUserProfile();
  if (existingProfile) {
    return existingProfile;
  }

  const syncKey = getOrCreateSyncKey();
  const syncKeyHash = await hashSyncKeyAsync(syncKey);
  const now = new Date().toISOString();

  const newProfile: UserProfile = {
    syncKey,
    syncKeyHash,
    createdAt: now,
    updatedAt: now,
  };

  saveUserProfile(newProfile);
  return newProfile;
}

/**
 * Update user profile (e.g., display name)
 */
export function updateUserProfile(updates: Partial<UserProfile>): UserProfile {
  const current = getUserProfile();
  if (!current) {
    throw new Error("No user profile found");
  }

  const updated: UserProfile = {
    ...current,
    ...updates,
    updatedAt: new Date().toISOString(),
  };

  saveUserProfile(updated);
  return updated;
}
