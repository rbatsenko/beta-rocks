/**
 * Server-only Supabase client using the service_role secret.
 *
 * This client BYPASSES Row Level Security, so every caller must enforce
 * authorization itself — typically by resolving the caller's profile from
 * their sync key hash and scoping the query to that profile id.
 *
 * It exists because this app authenticates with sync keys rather than Supabase
 * Auth: there is no JWT, so no `auth.uid()` for RLS policies to scope against.
 * Routes that previously used the anon client needed wide-open `qual: true`
 * policies to function, which left those tables readable and writable by anyone
 * holding the publishable key.
 *
 * Never import this from client components — it must not reach the browser.
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./types";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || "";
const SUPABASE_SECRET_KEY = process.env.SUPABASE_SECRET_KEY || "";

export const isSupabaseAdminConfigured = Boolean(SUPABASE_URL && SUPABASE_SECRET_KEY);

let cachedAdminClient: SupabaseClient<Database> | null = null;

export const getSupabaseAdminClient = (): SupabaseClient<Database> => {
  if (typeof window !== "undefined") {
    throw new Error("getSupabaseAdminClient() must never be called in the browser.");
  }

  if (!isSupabaseAdminConfigured) {
    throw new Error(
      "Supabase admin client is not configured. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY."
    );
  }

  if (!cachedAdminClient) {
    cachedAdminClient = createClient<Database>(SUPABASE_URL, SUPABASE_SECRET_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }

  return cachedAdminClient;
};
