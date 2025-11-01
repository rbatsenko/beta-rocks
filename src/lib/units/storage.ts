/**
 * Units storage and management
 * Handles localStorage and database sync for user units preferences
 */

import { getUserProfile, saveUserProfile, type UserProfile } from "@/lib/auth/sync-key";
import { getDefaultUnitsForLocale, type UnitsConfig } from "./types";
import type { Tables } from "@/integrations/supabase/types";

const UNITS_STORAGE_KEY = "temps_rocks_units";
const UNITS_LOCALE_KEY = "temps_rocks_units_locale";

/**
 * Convert database user_profiles row to UnitsConfig
 */
export function dbUnitsToConfig(profile: Tables<"user_profiles">): UnitsConfig | null {
  // If any units field is missing, return null (use defaults)
  if (
    !profile.units_temperature ||
    !profile.units_wind_speed ||
    !profile.units_precipitation ||
    !profile.units_distance ||
    !profile.units_elevation
  ) {
    return null;
  }

  return {
    temperature: profile.units_temperature as UnitsConfig["temperature"],
    windSpeed: profile.units_wind_speed as UnitsConfig["windSpeed"],
    precipitation: profile.units_precipitation as UnitsConfig["precipitation"],
    distance: profile.units_distance as UnitsConfig["distance"],
    elevation: profile.units_elevation as UnitsConfig["elevation"],
  };
}

/**
 * Convert UnitsConfig to database column format
 */
export function configToDbUnits(config: UnitsConfig) {
  return {
    units_temperature: config.temperature,
    units_wind_speed: config.windSpeed,
    units_precipitation: config.precipitation,
    units_distance: config.distance,
    units_elevation: config.elevation,
  };
}

/**
 * Get units from localStorage
 */
export function getStoredUnits(): UnitsConfig | null {
  if (typeof window === "undefined") {
    return null;
  }

  const stored = localStorage.getItem(UNITS_STORAGE_KEY);
  if (!stored) {
    return null;
  }

  try {
    return JSON.parse(stored) as UnitsConfig;
  } catch {
    return null;
  }
}

/**
 * Save units to localStorage with the locale they were set for
 */
export function saveStoredUnits(units: UnitsConfig, locale?: string): void {
  if (typeof window === "undefined") {
    return;
  }

  localStorage.setItem(UNITS_STORAGE_KEY, JSON.stringify(units));
  if (locale) {
    localStorage.setItem(UNITS_LOCALE_KEY, locale);
  }
}

/**
 * Get units for the current user
 * Priority: user profile > localStorage (if locale matches) > locale default
 */
export function getUserUnits(locale: string): UnitsConfig {
  // Check user profile first
  const profile = getUserProfile();
  if (profile?.units) {
    return profile.units;
  }

  // Check localStorage, but only if locale hasn't changed
  const stored = getStoredUnits();
  if (stored && typeof window !== "undefined") {
    const storedLocale = localStorage.getItem(UNITS_LOCALE_KEY);
    // If locale changed since units were saved, reset to new locale defaults
    if (storedLocale && storedLocale !== locale) {
      return getDefaultUnitsForLocale(locale);
    }
    return stored;
  }

  // Default based on locale
  return getDefaultUnitsForLocale(locale);
}

/**
 * Update units for the current user
 * Saves to both localStorage and user profile
 */
export async function updateUserUnits(units: UnitsConfig, locale?: string): Promise<void> {
  // Save to localStorage with locale
  saveStoredUnits(units, locale);

  // Update user profile
  const profile = getUserProfile();
  if (profile) {
    const updated: UserProfile = {
      ...profile,
      units,
      updatedAt: new Date().toISOString(),
    };
    await saveUserProfile(updated);
  }
}

/**
 * Initialize units based on locale (called on first visit or locale change)
 * If locale changed, resets to new locale defaults (unless user has explicit profile settings)
 */
export async function initializeUnitsForLocale(locale: string): Promise<UnitsConfig> {
  const current = getUserUnits(locale);

  // Check if locale changed since last time
  const storedLocale =
    typeof window !== "undefined" ? localStorage.getItem(UNITS_LOCALE_KEY) : null;
  const localeChanged = storedLocale && storedLocale !== locale;

  // If no units set yet, or locale changed (and no user profile), initialize with locale defaults
  if (!getStoredUnits() && !getUserProfile()?.units) {
    const defaultUnits = getDefaultUnitsForLocale(locale);
    await updateUserUnits(defaultUnits, locale);
    return defaultUnits;
  }

  // If locale changed and user doesn't have explicit profile settings, reset to new defaults
  if (localeChanged && !getUserProfile()?.units) {
    const defaultUnits = getDefaultUnitsForLocale(locale);
    await updateUserUnits(defaultUnits, locale);
    return defaultUnits;
  }

  // Update stored locale to current locale (for next time)
  if (typeof window !== "undefined") {
    localStorage.setItem(UNITS_LOCALE_KEY, locale);
  }

  return current;
}
