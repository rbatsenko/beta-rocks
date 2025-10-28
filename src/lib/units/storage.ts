/**
 * Units storage and management
 * Handles localStorage and database sync for user units preferences
 */

import { getUserProfile, saveUserProfile, type UserProfile } from "@/lib/auth/sync-key";
import { getDefaultUnitsForLocale, type UnitsConfig } from "./types";
import type { Tables } from "@/integrations/supabase/types";

const UNITS_STORAGE_KEY = "temps_rocks_units";

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
 * Save units to localStorage
 */
export function saveStoredUnits(units: UnitsConfig): void {
  if (typeof window === "undefined") {
    return;
  }

  localStorage.setItem(UNITS_STORAGE_KEY, JSON.stringify(units));
}

/**
 * Get units for the current user
 * Priority: user profile > localStorage > locale default > metric
 */
export function getUserUnits(locale: string): UnitsConfig {
  // Check user profile first
  const profile = getUserProfile();
  if (profile?.units) {
    return profile.units;
  }

  // Check localStorage
  const stored = getStoredUnits();
  if (stored) {
    return stored;
  }

  // Default based on locale
  return getDefaultUnitsForLocale(locale);
}

/**
 * Update units for the current user
 * Saves to both localStorage and user profile
 */
export async function updateUserUnits(units: UnitsConfig): Promise<void> {
  // Save to localStorage
  saveStoredUnits(units);

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
 */
export async function initializeUnitsForLocale(locale: string): Promise<UnitsConfig> {
  const current = getUserUnits(locale);

  // If no units set yet, initialize with locale defaults
  if (!getStoredUnits() && !getUserProfile()?.units) {
    const defaultUnits = getDefaultUnitsForLocale(locale);
    await updateUserUnits(defaultUnits);
    return defaultUnits;
  }

  return current;
}
