/**
 * Supabase client for direct database access from mobile
 * Used for real-time features and sync that benefit from direct connection
 */

import { createClient } from "@supabase/supabase-js";
import { MMKV } from "react-native-mmkv";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "../constants/config";

const mmkv = new MMKV({ id: "supabase-storage" });

/**
 * MMKV-backed storage adapter for Supabase auth
 */
const mmkvStorageAdapter = {
  getItem: (key: string): string | null => {
    return mmkv.getString(key) ?? null;
  },
  setItem: (key: string, value: string): void => {
    mmkv.set(key, value);
  },
  removeItem: (key: string): void => {
    mmkv.delete(key);
  },
};

export const isSupabaseConfigured = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);

export const supabase = isSupabaseConfigured
  ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        storage: mmkvStorageAdapter,
      },
    })
  : null;
