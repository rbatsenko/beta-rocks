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

      const stored = await getStoredProfile();
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
        await storeProfile(newProfile as unknown as Record<string, unknown>);
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
      await storeProfile(updated as unknown as Record<string, unknown>);
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
      await storeProfile(updated as unknown as Record<string, unknown>);
      setProfile(updated);
    },
    [profile]
  );

  const restoreFromSyncKey = useCallback(async (key: string) => {
    try {
      const result = await restoreProfile(key);
      if (result.success) {
        await initProfile();
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
