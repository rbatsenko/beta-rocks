/**
 * Hook for fetching climbing conditions
 */

import { useState, useCallback } from "react";
import { getConditions } from "../api/client";
import type { ConditionsResponse, RockType } from "../types/api";

interface UseConditionsReturn {
  data: ConditionsResponse | null;
  isLoading: boolean;
  error: string | null;
  fetchConditions: (
    lat: number,
    lon: number,
    rockType?: RockType
  ) => Promise<void>;
}

export function useConditions(): UseConditionsReturn {
  const [data, setData] = useState<ConditionsResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchConditions = useCallback(
    async (lat: number, lon: number, rockType: RockType = "unknown") => {
      setIsLoading(true);
      setError(null);
      try {
        const result = await getConditions(lat, lon, rockType);
        setData(result);
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

  return { data, isLoading, error, fetchConditions };
}
