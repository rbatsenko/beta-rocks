/**
 * UserProfile context provider
 * Users can browse freely. To add reports, vote, or manage favorites
 * they need to create a profile or restore via sync key.
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
import { generateSyncKey, hashSyncKeyAsync } from "../lib/sync-key";
import { UNIT_PRESETS } from "../lib/units";
import {
  getUserProfile as getStoredProfile,
  saveUserProfile as storeProfile,
  getSyncKey,
  setSyncKey,
  clearSyncKey,
  saveFavorites,
  saveUnitsPreference,
  getUnitsPreference,
} from "../lib/storage";
import { supabase, isSupabaseConfigured } from "../api/supabase";

export interface UserStats {
  reportsPosted: number;
  confirmationsGiven: number;
  favoritesCount: number;
}

interface UserProfileContextValue {
  profile: UserProfile | null;
  profileId: string | null;
  syncKeyHash: string | null;
  isLoading: boolean;
  hasProfile: boolean;
  stats: UserStats | null;
  units: UnitsConfig;
  createProfile: (displayName?: string) => Promise<boolean>;
  restoreFromSyncKey: (key: string) => Promise<boolean>;
  updateDisplayName: (name: string) => Promise<void>;
  updateUnits: (units: UnitsConfig) => Promise<void>;
  signOut: () => Promise<void>;
  deleteAccount: () => Promise<boolean>;
}

const UserProfileContext = createContext<UserProfileContextValue | null>(null);

export function UserProfileProvider({ children }: { children: ReactNode }) {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [profileId, setProfileId] = useState<string | null>(null);
  const [syncKeyHash, setSyncKeyHashState] = useState<string | null>(null);
  const [stats, setStats] = useState<UserStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [units, setUnits] = useState<UnitsConfig>(UNIT_PRESETS.metric);

  const hasProfile = profile !== null && profile.syncKey !== undefined;

  useEffect(() => {
    loadStoredProfile();
  }, []);

  async function loadStoredProfile() {
    try {
      // Load saved units regardless of profile
      const savedUnits = getUnitsPreference();
      if (savedUnits) {
        setUnits({ ...UNIT_PRESETS.metric, ...savedUnits } as unknown as UnitsConfig);
      }

      const existingKey = await getSyncKey();
      if (existingKey) {
        const hash = await hashSyncKeyAsync(existingKey);
        setSyncKeyHashState(hash);

        const stored = getStoredProfile();
        if (stored) {
          const storedProfile = stored as unknown as UserProfile;
          setProfile(storedProfile);
          // Profile units take precedence over standalone units
          if (storedProfile.units) {
            setUnits({ ...UNIT_PRESETS.metric, ...storedProfile.units });
          }
          // Sync data from Supabase in background
          syncFromSupabase(hash);
        }
      }
    } catch (error) {
      console.warn("Failed to load profile:", error);
    } finally {
      setIsLoading(false);
    }
  }

  async function syncFromSupabase(hash: string) {
    if (!isSupabaseConfigured || !supabase) return;

    try {
      const { data: dbProfile } = await supabase
        .from("user_profiles")
        .select("*")
        .eq("sync_key_hash", hash)
        .single();

      if (!dbProfile) return;
      setProfileId(dbProfile.id);

      // Sync favorites
      const { data: favorites } = await supabase
        .from("user_favorites")
        .select("*")
        .eq("user_profile_id", dbProfile.id)
        .order("display_order", { ascending: true })
        .order("added_at", { ascending: false });

      if (favorites) {
        const mapped = favorites.map((f: Record<string, unknown>) => ({
          id: f.id,
          userProfileId: f.user_profile_id,
          areaId: f.area_id,
          cragId: f.crag_id,
          areaName: f.area_name,
          areaSlug: f.area_slug,
          location: f.location || "",
          latitude: f.latitude,
          longitude: f.longitude,
          rockType: f.rock_type,
          lastRating: f.last_rating,
          lastFrictionScore: f.last_friction_score,
          lastCheckedAt: f.last_checked_at,
          displayOrder: f.display_order || 0,
          addedAt: f.added_at,
        }));
        saveFavorites(mapped);
      }

      // Sync user stats
      const { data: statsData } = await supabase
        .from("user_stats")
        .select("reports_posted, confirmations_given, favorites_count")
        .eq("user_profile_id", dbProfile.id)
        .single();

      if (statsData) {
        setStats({
          reportsPosted: statsData.reports_posted ?? 0,
          confirmationsGiven: statsData.confirmations_given ?? 0,
          favoritesCount: statsData.favorites_count ?? 0,
        });
      }

      // Sync display name and units from DB if available
      if (dbProfile.display_name || dbProfile.units) {
        const stored = getStoredProfile() as Record<string, unknown> | null;
        const updated = {
          ...(stored || {}),
          displayName: dbProfile.display_name || stored?.displayName,
          units: dbProfile.units || stored?.units,
          updatedAt: new Date().toISOString(),
        };
        storeProfile(updated);
        setProfile(updated as unknown as UserProfile);
        if (dbProfile.units) {
          const normalized = { ...UNIT_PRESETS.metric, ...(dbProfile.units as unknown as UnitsConfig) };
          setUnits(normalized);
          saveUnitsPreference(normalized as unknown as Record<string, string>);
        }
      }
    } catch (error) {
      console.warn("[Sync] Background sync failed:", error);
    }
  }

  const createProfile = useCallback(async (displayName?: string): Promise<boolean> => {
    try {
      if (!isSupabaseConfigured || !supabase) {
        console.warn("Supabase not configured");
        return false;
      }

      const newKey = generateSyncKey();
      const hash = await hashSyncKeyAsync(newKey);

      // Create profile in Supabase
      const { data, error } = await supabase
        .from("user_profiles")
        .insert({
          sync_key_hash: hash,
          display_name: displayName || null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error || !data) {
        console.error("Failed to create profile:", error);
        return false;
      }

      // Store locally
      await setSyncKey(newKey);
      setSyncKeyHashState(hash);
      setProfileId(data.id);

      const newProfile: UserProfile = {
        syncKey: newKey,
        syncKeyHash: hash,
        displayName: displayName || undefined,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
      };
      storeProfile(newProfile as unknown as Record<string, unknown>);
      setProfile(newProfile);

      return true;
    } catch (error) {
      console.error("Profile creation failed:", error);
      return false;
    }
  }, []);

  const restoreFromSyncKey = useCallback(async (key: string): Promise<boolean> => {
    try {
      const hash = await hashSyncKeyAsync(key);

      if (!isSupabaseConfigured || !supabase) {
        console.warn("Supabase not configured");
        return false;
      }

      const { data, error } = await supabase
        .from("user_profiles")
        .select("*")
        .eq("sync_key_hash", hash)
        .single();

      if (error || !data) return false;

      // Store sync key and profile locally
      await setSyncKey(key);
      setSyncKeyHashState(hash);

      const restoredProfile: UserProfile = {
        syncKey: key,
        syncKeyHash: hash,
        displayName: data.display_name || undefined,
        units: data.units || undefined,
        createdAt: data.created_at,
        updatedAt: new Date().toISOString(),
      };
      storeProfile(restoredProfile as unknown as Record<string, unknown>);
      setProfile(restoredProfile);

      // Sync units if available
      if (data.units) {
        saveUnitsPreference(data.units);
      }

      // Sync favorites
      await syncFromSupabase(hash);

      return true;
    } catch {
      return false;
    }
  }, []);

  const updateDisplayName = useCallback(async (name: string) => {
    if (!profile) return;
    const updated = { ...profile, displayName: name, updatedAt: new Date().toISOString() };
    storeProfile(updated as unknown as Record<string, unknown>);
    setProfile(updated);

    // Also update in Supabase
    if (isSupabaseConfigured && supabase && syncKeyHash) {
      try {
        const { data: dbProfile } = await supabase
          .from("user_profiles")
          .select("id")
          .eq("sync_key_hash", syncKeyHash)
          .single();
        if (dbProfile) {
          await supabase.from("user_profiles").update({ display_name: name }).eq("id", dbProfile.id);
        }
      } catch {}
    }
  }, [profile, syncKeyHash]);

  const updateUnits = useCallback(async (newUnits: UnitsConfig) => {
    // Always save to local storage and update state
    saveUnitsPreference(newUnits as unknown as Record<string, string>);
    setUnits(newUnits);

    // If user has a profile, also update the profile
    if (profile) {
      const updated = { ...profile, units: newUnits, updatedAt: new Date().toISOString() };
      storeProfile(updated as unknown as Record<string, unknown>);
      setProfile(updated);

      // Also update in Supabase
      if (isSupabaseConfigured && supabase && syncKeyHash) {
        try {
          const { data: dbProfile } = await supabase
            .from("user_profiles")
            .select("id")
            .eq("sync_key_hash", syncKeyHash)
            .single();
          if (dbProfile) {
            await supabase.from("user_profiles").update({ units: newUnits }).eq("id", dbProfile.id);
          }
        } catch {}
      }
    }
  }, [profile, syncKeyHash]);

  const signOut = useCallback(async () => {
    await clearSyncKey();
    storeProfile({} as Record<string, unknown>);
    saveFavorites([]);
    setProfile(null);
    setSyncKeyHashState(null);
    setStats(null);
    setProfileId(null);
  }, []);

  const deleteAccount = useCallback(async (): Promise<boolean> => {
    try {
      if (!isSupabaseConfigured || !supabase || !syncKeyHash) {
        console.warn("[deleteAccount] Supabase not configured or no sync key");
        return false;
      }

      // Find user profile in database
      const { data: dbProfile } = await supabase
        .from("user_profiles")
        .select("id")
        .eq("sync_key_hash", syncKeyHash)
        .maybeSingle();

      if (dbProfile) {
        // Delete favorites (explicit delete before profile for clean ordering)
        await supabase
          .from("user_favorites")
          .delete()
          .eq("user_profile_id", dbProfile.id);

        // Delete chat sessions (messages cascade via foreign key)
        await supabase
          .from("chat_sessions")
          .delete()
          .eq("user_profile_id", dbProfile.id);

        // Delete user profile — remaining related data (user_stats, notifications,
        // push_subscriptions) is removed via ON DELETE CASCADE in the database
        const { error: profileError } = await supabase
          .from("user_profiles")
          .delete()
          .eq("id", dbProfile.id);

        if (profileError) {
          console.error("[deleteAccount] Failed to delete profile:", profileError);
          return false;
        }
      }

      // Clear all local data
      await clearSyncKey();
      storeProfile({} as Record<string, unknown>);
      saveFavorites([]);
      setProfile(null);
      setSyncKeyHashState(null);
      setStats(null);
      setProfileId(null);

      console.log("[deleteAccount] Account deleted successfully");
      return true;
    } catch (error) {
      console.error("[deleteAccount] Failed:", error);
      return false;
    }
  }, [syncKeyHash]);

  return (
    <UserProfileContext.Provider
      value={{
        profile,
        profileId,
        syncKeyHash,
        isLoading,
        hasProfile,
        stats,
        units,
        createProfile,
        restoreFromSyncKey,
        updateDisplayName,
        updateUnits,
        signOut,
        deleteAccount,
      }}
    >
      {children}
    </UserProfileContext.Provider>
  );
}

export function useUserProfileContext(): UserProfileContextValue {
  const context = useContext(UserProfileContext);
  if (!context) {
    throw new Error("useUserProfileContext must be used within a UserProfileProvider");
  }
  return context;
}
