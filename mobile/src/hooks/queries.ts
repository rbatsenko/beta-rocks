/**
 * React Query hooks for data fetching with caching
 */

import { useQuery, useInfiniteQuery } from "@tanstack/react-query";
import {
  getCragBySlug,
  getReportsByCrag,
  searchLocations,
  getConditions,
} from "@/api/client";
import { API_URL } from "@/constants/config";
import type {
  CragDetailResponse,
  SearchResult,
  ConditionsResponse,
  RockType,
  Report,
} from "@/types/api";

// --- Query keys ---

export const queryKeys = {
  cragDetail: (slug: string) => ["crag", slug] as const,
  cragReports: (cragId: string) => ["crag-reports", cragId] as const,
  search: (query: string) => ["search", query] as const,
  conditions: (lat: number, lon: number, rockType: string) =>
    ["conditions", lat, lon, rockType] as const,
  feed: ["feed"] as const,
};

// --- Crag detail ---

export function useCragDetail(slug: string | undefined) {
  return useQuery<CragDetailResponse>({
    queryKey: queryKeys.cragDetail(slug!),
    queryFn: () => getCragBySlug(slug!),
    enabled: !!slug,
  });
}

// --- Crag reports (separate query for refetching after submit) ---

export function useCragReports(cragId: string | undefined) {
  return useQuery<Report[]>({
    queryKey: queryKeys.cragReports(cragId!),
    queryFn: () => getReportsByCrag(cragId!),
    enabled: !!cragId,
    staleTime: 2 * 60_000,
  });
}

// --- Search ---

export function useSearchQuery(query: string) {
  return useQuery<SearchResult[]>({
    queryKey: queryKeys.search(query),
    queryFn: () => searchLocations(query),
    enabled: query.trim().length >= 2,
    staleTime: 10 * 60_000, // search results rarely change
    placeholderData: (prev) => prev, // keep previous results while fetching
  });
}

// --- Conditions ---

export function useConditionsQuery(
  lat: number | undefined,
  lon: number | undefined,
  rockType: RockType = "unknown"
) {
  return useQuery<ConditionsResponse>({
    queryKey: queryKeys.conditions(lat!, lon!, rockType),
    queryFn: () => getConditions(lat!, lon!, rockType),
    enabled: lat != null && lon != null,
  });
}

// --- Feed (infinite scroll) ---

interface FeedPage {
  reports: Record<string, unknown>[];
  nextCursor: string | null;
  totalCount?: number;
}

export function useFeedQuery() {
  return useInfiniteQuery<FeedPage>({
    queryKey: queryKeys.feed,
    queryFn: async ({ pageParam }) => {
      const url = pageParam
        ? `${API_URL}/api/reports/feed?cursor=${encodeURIComponent(pageParam)}`
        : `${API_URL}/api/reports/feed`;
      const res = await fetch(url, {
        headers: { "X-Client-Platform": "mobile" },
      });
      if (!res.ok) {
        throw new Error(`Feed fetch failed: ${res.status}`);
      }
      return res.json();
    },
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    staleTime: 2 * 60_000,
  });
}
