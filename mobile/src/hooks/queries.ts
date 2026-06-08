/**
 * React Query hooks for data fetching with caching
 */

import { useQuery, useInfiniteQuery } from "@tanstack/react-query";
import {
  getCragBySlug,
  getReportsByCrag,
  searchLocations,
  getConditions,
  getNearbyConditions,
} from "@/api/client";
import { API_URL } from "@/constants/config";
import type {
  CragDetailResponse,
  SearchResult,
  ConditionsResponse,
  NearbyConditionsResponse,
  RockType,
  Report,
  FeedPage,
} from "@/types/api";

// --- Query keys ---

export const queryKeys = {
  cragDetail: (slug: string) => ["crag", slug] as const,
  cragReports: (cragId: string) => ["crag-reports", cragId] as const,
  search: (query: string) => ["search", query] as const,
  conditions: (lat: number, lon: number, rockType: string) =>
    ["conditions", lat, lon, rockType] as const,
  nearbyConditions: (lat: number, lon: number, radius: number) =>
    ["nearby-conditions", lat, lon, radius] as const,
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

// --- Nearby crags for the map (browse screen) ---

export function useNearbyConditions(
  lat: number | undefined,
  lon: number | undefined,
  radius = 50000
) {
  return useQuery<NearbyConditionsResponse>({
    queryKey: queryKeys.nearbyConditions(lat!, lon!, radius),
    queryFn: () => getNearbyConditions(lat!, lon!, radius),
    enabled: lat != null && lon != null,
    staleTime: 30 * 60_000, // conditions change slowly; match web
    gcTime: 60 * 60_000,
    placeholderData: (prev) => prev, // keep markers visible while panning
  });
}

// --- Feed (infinite scroll) ---

export function useFeedQuery() {
  return useInfiniteQuery<FeedPage>({
    queryKey: queryKeys.feed,
    queryFn: async ({ pageParam }) => {
      const url = pageParam
        ? `${API_URL}/api/reports/feed?cursor=${encodeURIComponent(String(pageParam))}`
        : `${API_URL}/api/reports/feed`;
      const res = await fetch(url, {
        headers: { "X-Client-Platform": "mobile" },
      });
      if (!res.ok) {
        const body = await res.text().catch(() => "");
        throw new Error(
          `Feed fetch failed: ${res.status} ${res.statusText}${body ? ` – ${body}` : ""}`
        );
      }
      return res.json();
    },
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    staleTime: 2 * 60_000,
  });
}
