/**
 * Sync key utilities for mobile
 * Adapted from web app's sync-key.ts for React Native
 */

import * as Crypto from "expo-crypto";
import { v4 as uuidv4 } from "uuid";
import { getSyncKey, setSyncKey } from "./storage";

/**
 * Generate a new sync key (UUID v4)
 */
export function generateSyncKey(): string {
  return uuidv4();
}

/**
 * Hash a sync key using SHA-256
 * Uses expo-crypto for native hashing
 */
export async function hashSyncKeyAsync(key: string): Promise<string> {
  return Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    key
  );
}

/**
 * Get or create a sync key
 */
export async function getOrCreateSyncKey(): Promise<string> {
  const existing = await getSyncKey();
  if (existing) return existing;

  const newKey = generateSyncKey();
  await setSyncKey(newKey);
  return newKey;
}

/**
 * Validate sync key format (UUID v4)
 */
export function isValidSyncKey(key: string): boolean {
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(key);
}

/**
 * Format sync key for display
 */
export function formatSyncKeyForDisplay(key: string): string {
  if (key.length <= 16) return key;
  return `${key.slice(0, 8)}...${key.slice(-8)}`;
}
