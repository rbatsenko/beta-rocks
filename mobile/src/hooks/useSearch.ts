/**
 * Hook for searching climbing locations
 * Uses React Query for caching + manual debounce for input
 */

import { useState, useCallback, useRef, useEffect } from "react";
import { useSearchQuery } from "./queries";
import type { SearchResult } from "../types/api";

interface UseSearchReturn {
  results: SearchResult[];
  isSearching: boolean;
  error: string | null;
  search: (query: string) => void;
  clearResults: () => void;
}

export function useSearch(): UseSearchReturn {
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const { data, isFetching, error } = useSearchQuery(debouncedQuery);

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  const search = useCallback((query: string) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (!query.trim() || query.length < 2) {
      setDebouncedQuery("");
      return;
    }

    debounceRef.current = setTimeout(() => {
      setDebouncedQuery(query);
    }, 300);
  }, []);

  const clearResults = useCallback(() => {
    setDebouncedQuery("");
  }, []);

  return {
    results: data ?? [],
    isSearching: isFetching,
    error: error ? (error instanceof Error ? error.message : "Search failed") : null,
    search,
    clearResults,
  };
}
