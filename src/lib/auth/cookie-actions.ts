/**
 * Server Actions for Cookie Management
 *
 * These actions allow client components to set cookies via server-side operations.
 * Cookies enable SSR and eliminate loading states by making data available on initial render.
 */

"use server";

import { cookies } from "next/headers";

const COOKIE_OPTIONS = {
  path: "/",
  maxAge: 60 * 60 * 24 * 365, // 1 year
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
};

/**
 * Set user profile cookies (sync key + display name)
 */
export async function setUserProfileCookies(syncKey: string, displayName?: string) {
  const cookieStore = await cookies();

  cookieStore.set("temps_sync_key", syncKey, COOKIE_OPTIONS);

  if (displayName) {
    cookieStore.set("temps_display_name", displayName, COOKIE_OPTIONS);
  } else {
    // Delete display name if not provided
    cookieStore.delete("temps_display_name");
  }
}

/**
 * Set current session ID cookie
 */
export async function setSessionCookie(sessionId: string) {
  const cookieStore = await cookies();
  cookieStore.set("temps_current_session_id", sessionId, COOKIE_OPTIONS);
}

/**
 * Clear all user-related cookies
 */
export async function clearUserCookies() {
  const cookieStore = await cookies();

  cookieStore.delete("temps_sync_key");
  cookieStore.delete("temps_display_name");
  cookieStore.delete("temps_current_session_id");
}

/**
 * Update display name cookie
 */
export async function updateDisplayNameCookie(displayName: string) {
  const cookieStore = await cookies();
  cookieStore.set("temps_display_name", displayName, COOKIE_OPTIONS);
}
