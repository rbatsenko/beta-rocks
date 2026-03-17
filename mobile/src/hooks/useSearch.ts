/**
 * Hook for searching climbing locations
 */

import { useState, useCallback, useRef, useEffect } from "react";
import { searchLocations } from "../api/client";
import type { SearchResult } from "../types/api";

interface UseSearchReturn {
  results: SearchResult[];
  isSearching: boolean;
  error: string | null;
  search: (query: string) => void;
  clearResults: () => void;
}

export function useSearch(): UseSearchReturn {
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const mountedRef = useRef(true);

  useEffect(() => {
    return () => {
      mountedRef.current = false;
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, []);

  const search = useCallback((query: string) => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    if (!query.trim() || query.length < 2) {
      setResults([]);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      if (!mountedRef.current) return;
      setIsSearching(true);
      setError(null);
      try {
        const data = await searchLocations(query);
        if (mountedRef.current) {
          setResults(data);
        }
      } catch (err) {
        if (mountedRef.current) {
          setError(
            err instanceof Error ? err.message : "Search failed"
          );
        }
      } finally {
        if (mountedRef.current) {
          setIsSearching(false);
        }
      }
    }, 300);
  }, []);

  const clearResults = useCallback(() => {
    setResults([]);
    setError(null);
  }, []);

  return { results, isSearching, error, search, clearResults };
}
