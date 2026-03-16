/**
 * User profile hook for mobile
 * Manages sync key, profile data, and sync status
 */

import { useState, useEffect, useCallback } from "react";
import type { UserProfile, UnitsConfig } from "../types/api";
import {
  getOrCreateSyncKey,
  hashSyncKeyAsync,
} from "../lib/sync-key";
import {
  getUserProfile as getStoredProfile,
  saveUserProfile as storeProfile,
} from "../lib/storage";
import { setSyncKey } from "../lib/storage";
import { restoreProfile } from "../api/client";

interface UseUserProfileReturn {
  profile: UserProfile | null;
  syncKeyHash: string | null;
  isLoading: boolean;
  updateDisplayName: (name: string) => Promise<void>;
  updateUnits: (units: UnitsConfig) => Promise<void>;
  restoreFromSyncKey: (key: string) => Promise<boolean>;
}

export function useUserProfile(): UseUserProfileReturn {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [syncKeyHash, setSyncKeyHash] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    initProfile();
  }, []);

  async function initProfile() {
    try {
      const syncKey = await getOrCreateSyncKey();
      const hash = await hashSyncKeyAsync(syncKey);
      setSyncKeyHash(hash);

      const stored = getStoredProfile();
      if (stored) {
        setProfile(stored as unknown as UserProfile);
      } else {
        const now = new Date().toISOString();
        const newProfile: UserProfile = {
          syncKey,
          syncKeyHash: hash,
          createdAt: now,
          updatedAt: now,
        };
        storeProfile(newProfile as unknown as Record<string, unknown>);
        setProfile(newProfile);
      }
    } catch (error) {
      console.warn("Failed to initialize profile:", error);
    } finally {
      setIsLoading(false);
    }
  }

  const updateDisplayName = useCallback(
    async (name: string) => {
      if (!profile) return;
      const updated = {
        ...profile,
        displayName: name,
        updatedAt: new Date().toISOString(),
      };
      storeProfile(updated as unknown as Record<string, unknown>);
      setProfile(updated);
    },
    [profile]
  );

  const updateUnits = useCallback(
    async (units: UnitsConfig) => {
      if (!profile) return;
      const updated = {
        ...profile,
        units,
        updatedAt: new Date().toISOString(),
      };
      storeProfile(updated as unknown as Record<string, unknown>);
      setProfile(updated);
    },
    [profile]
  );

  const restoreFromSyncKey = useCallback(async (key: string) => {
    try {
      const result = await restoreProfile(key);
      // The sync API returns { profile, crags, reports, confirmations }
      // A non-null profile means the key was found
      if (result.profile) {
        // Store the restored sync key locally
        await setSyncKey(key);
        const hash = await hashSyncKeyAsync(key);
        setSyncKeyHash(hash);

        const now = new Date().toISOString();
        const restoredProfile: UserProfile = {
          syncKey: key,
          syncKeyHash: hash,
          displayName:
            (result.profile as Record<string, unknown>)?.display_name as
              | string
              | undefined,
          createdAt: now,
          updatedAt: now,
        };
        storeProfile(
          restoredProfile as unknown as Record<string, unknown>
        );
        setProfile(restoredProfile);
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }, []);

  return {
    profile,
    syncKeyHash,
    isLoading,
    updateDisplayName,
    updateUnits,
    restoreFromSyncKey,
  };
}
