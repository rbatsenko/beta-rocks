"use client";

/**
 * React hook for managing user units preferences
 * Provides access to current units and ability to update them
 */

import { useState, useEffect, useCallback } from "react";
import { useClientTranslation } from "@/hooks/useClientTranslation";
import type { UnitsConfig } from "@/lib/units/types";
import { updateUserUnits, initializeUnitsForLocale } from "@/lib/units/storage";
import { getDefaultUnitsForLocale } from "@/lib/units/types";

export function useUnits() {
  const { language } = useClientTranslation("common");
  const [units, setUnits] = useState<UnitsConfig>(() => {
    // Initialize with locale defaults on first render
    return getDefaultUnitsForLocale(language);
  });
  const [isLoading, setIsLoading] = useState(true);

  // Load units on mount and when language changes
  useEffect(() => {
    const loadUnits = async () => {
      setIsLoading(true);
      try {
        const userUnits = await initializeUnitsForLocale(language);
        setUnits(userUnits);
      } catch (error) {
        console.error("Failed to load units:", error);
        // Fall back to locale defaults
        setUnits(getDefaultUnitsForLocale(language));
      } finally {
        setIsLoading(false);
      }
    };

    loadUnits();
  }, [language]);

  // Update units
  const updateUnits = useCallback(async (newUnits: UnitsConfig) => {
    try {
      await updateUserUnits(newUnits);
      setUnits(newUnits);
    } catch (error) {
      console.error("Failed to update units:", error);
      throw error;
    }
  }, []);

  return {
    units,
    updateUnits,
    isLoading,
  };
}
