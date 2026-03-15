/**
 * Hook for fetching climbing conditions
 */

import { useState, useCallback } from "react";
import { getConditions } from "../api/client";
import type { ConditionsResult, RockType } from "../types/api";

interface UseConditionsReturn {
  conditions: ConditionsResult | null;
  isLoading: boolean;
  error: string | null;
  fetchConditions: (
    lat: number,
    lon: number,
    rockType?: RockType
  ) => Promise<void>;
}

export function useConditions(): UseConditionsReturn {
  const [conditions, setConditions] = useState<ConditionsResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchConditions = useCallback(
    async (lat: number, lon: number, rockType: RockType = "unknown") => {
      setIsLoading(true);
      setError(null);
      try {
        const result = await getConditions(lat, lon, rockType);
        setConditions(result);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to fetch conditions"
        );
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  return { conditions, isLoading, error, fetchConditions };
}
