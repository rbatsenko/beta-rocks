/**
 * UserProfile context provider
 * Shares profile state across all screens so changes reflect everywhere
 */

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";
import type { UserProfile, UnitsConfig } from "../types/api";
import { getOrCreateSyncKey, hashSyncKeyAsync } from "../lib/sync-key";
import {
  getUserProfile as getStoredProfile,
  saveUserProfile as storeProfile,
  setSyncKey,
} from "../lib/storage";
import { supabase, isSupabaseConfigured } from "../api/supabase";

interface UserProfileContextValue {
  profile: UserProfile | null;
  syncKeyHash: string | null;
  isLoading: boolean;
  updateDisplayName: (name: string) => Promise<void>;
  updateUnits: (units: UnitsConfig) => Promise<void>;
  restoreFromSyncKey: (key: string) => Promise<boolean>;
}

const UserProfileContext = createContext<UserProfileContextValue | null>(null);

export function UserProfileProvider({ children }: { children: ReactNode }) {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [syncKeyHash, setSyncKeyHashState] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    initProfile();
  }, []);

  async function initProfile() {
    try {
      const syncKey = await getOrCreateSyncKey();
      const hash = await hashSyncKeyAsync(syncKey);
      setSyncKeyHashState(hash);

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
      // Hash the provided sync key and look up the profile in Supabase directly
      const hash = await hashSyncKeyAsync(key);

      if (!isSupabaseConfigured || !supabase) {
        console.warn("Supabase not configured, cannot restore profile");
        return false;
      }

      const { data, error } = await supabase
        .from("user_profiles")
        .select("*")
        .eq("sync_key_hash", hash)
        .single();

      if (error || !data) {
        return false;
      }

      // Profile found — store the sync key and hydrate local state
      await setSyncKey(key);
      setSyncKeyHashState(hash);

      const now = new Date().toISOString();
      const restoredProfile: UserProfile = {
        syncKey: key,
        syncKeyHash: hash,
        displayName: data.display_name || undefined,
        createdAt: data.created_at || now,
        updatedAt: now,
      };
      storeProfile(restoredProfile as unknown as Record<string, unknown>);
      setProfile(restoredProfile);
      return true;
    } catch {
      return false;
    }
  }, []);

  return (
    <UserProfileContext.Provider
      value={{
        profile,
        syncKeyHash,
        isLoading,
        updateDisplayName,
        updateUnits,
        restoreFromSyncKey,
      }}
    >
      {children}
    </UserProfileContext.Provider>
  );
}

export function useUserProfileContext(): UserProfileContextValue {
  const context = useContext(UserProfileContext);
  if (!context) {
    throw new Error(
      "useUserProfileContext must be used within a UserProfileProvider"
    );
  }
  return context;
}
