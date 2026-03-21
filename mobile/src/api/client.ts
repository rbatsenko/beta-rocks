/**
 * API client for beta.rocks mobile app
 * Calls the Next.js API endpoints deployed on Vercel
 */

import { API_URL } from "../constants/config";
import type {
  ConditionsResponse,
  SearchResponse,
  SearchResult,
  CragDetailResponse,
  Report,
  ReportsResponse,
  Confirmation,
  SyncResponse,
  RockType,
} from "../types/api";

class ApiError extends Error {
  constructor(
    public status: number,
    message: string
  ) {
    super(message);
    this.name = "ApiError";
  }
}

interface RequestOptions {
  method?: "GET" | "POST" | "PUT" | "DELETE";
  body?: unknown;
  headers?: Record<string, string>;
  syncKeyHash?: string;
}

/**
 * Base fetch wrapper with error handling and CORS headers
 */
async function apiFetch<T>(
  path: string,
  options: RequestOptions = {}
): Promise<T> {
  const { method = "GET", body, headers = {}, syncKeyHash } = options;

  const url = `${API_URL}${path}`;

  const requestHeaders: Record<string, string> = {
    "Content-Type": "application/json",
    "X-Client-Platform": "mobile",
    ...headers,
  };

  if (syncKeyHash) {
    requestHeaders["X-Sync-Key-Hash"] = syncKeyHash;
  }

  const response = await fetch(url, {
    method,
    headers: requestHeaders,
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => "Unknown error");
    throw new ApiError(response.status, errorText);
  }

  return response.json();
}

/**
 * Conditions API
 * Returns wrapped response: { location, rockType, current, conditions, astro, updatedAt }
 */
export async function getConditions(
  lat: number,
  lon: number,
  rockType: RockType = "unknown"
): Promise<ConditionsResponse> {
  const params = new URLSearchParams({
    lat: lat.toString(),
    lon: lon.toString(),
    rockType,
  });

  return apiFetch<ConditionsResponse>(`/api/conditions?${params}`);
}

/**
 * Search API
 * Returns { results: SearchResult[] } — we unwrap to return just the array
 */
export async function searchLocations(
  query: string,
  limit = 10
): Promise<SearchResult[]> {
  const params = new URLSearchParams({
    q: query,
    limit: limit.toString(),
  });

  const response = await apiFetch<SearchResponse>(`/api/search?${params}`);
  return response.results;
}

/**
 * Crag detail API
 * Returns { crag, conditions, reports, sectors }
 */
export async function getCragBySlug(
  slug: string
): Promise<CragDetailResponse> {
  return apiFetch<CragDetailResponse>(`/api/location/${slug}`);
}

/**
 * Reports API
 * Returns { reports, total, limit, offset } — we unwrap to return just the array
 */
export async function getReportsByCrag(
  cragId: string
): Promise<Report[]> {
  const params = new URLSearchParams({ cragId });
  const response = await apiFetch<ReportsResponse>(`/api/reports?${params}`);
  return response.reports;
}

export async function createReport(
  report: {
    cragId: string;
    category: Report["category"];
    text: string;
    rating_dry?: number;
    rating_wind?: number;
    rating_crowds?: number;
    lost_found_type?: "lost" | "found";
    observed_at?: string;
  },
  profileId: string,
  syncKeyHash: string
): Promise<Report> {
  return apiFetch<Report>("/api/reports", {
    method: "POST",
    body: {
      cragId: report.cragId,
      category: report.category,
      text: report.text,
      rating_dry: report.rating_dry,
      rating_wind: report.rating_wind,
      rating_crowds: report.rating_crowds,
      lost_found_type: report.lost_found_type,
      observed_at: report.observed_at,
      authorId: profileId,
    },
    syncKeyHash,
  });
}

/**
 * Delete a report (author only)
 * DELETE /api/reports/[id]?userProfileId=...
 */
export async function deleteReport(
  reportId: string,
  userProfileId: string,
  syncKeyHash: string
): Promise<void> {
  await apiFetch(`/api/reports/${reportId}?userProfileId=${userProfileId}`, {
    method: "DELETE",
    syncKeyHash,
  });
}

/**
 * Confirmations API (report voting)
 * POST /api/confirmations with { reportId, userKeyHash }
 */
export async function confirmReport(
  reportId: string,
  syncKeyHash: string
): Promise<Confirmation> {
  return apiFetch<Confirmation>("/api/confirmations", {
    method: "POST",
    body: { reportId, userKeyHash: syncKeyHash },
    syncKeyHash,
  });
}

/**
 * Remove confirmation (unvote)
 * DELETE /api/confirmations with { reportId, userKeyHash }
 */
export async function removeConfirmation(
  reportId: string,
  syncKeyHash: string
): Promise<void> {
  await apiFetch("/api/confirmations", {
    method: "DELETE",
    body: { reportId, userKeyHash: syncKeyHash },
    syncKeyHash,
  });
}

/**
 * Sync API
 * GET /api/sync/[key] returns { profile, crags, reports, confirmations }
 */
export async function restoreProfile(
  syncKey: string
): Promise<SyncResponse> {
  return apiFetch<SyncResponse>(`/api/sync/${syncKey}`);
}

/**
 * Submit a new crag via the API
 * POST /api/crags/submit
 */
export async function submitCrag(
  crag: {
    name: string;
    lat: number;
    lon: number;
    country: string;
    state?: string;
    municipality?: string;
    village?: string;
    rockType?: string;
    aspects?: number[];
    climbingTypes?: string[];
    description?: string;
    isSecret?: boolean;
  },
  syncKeyHash: string
): Promise<{ success: boolean; crag: { id: string; name: string; slug: string } }> {
  return apiFetch("/api/crags/submit", {
    method: "POST",
    body: crag,
    syncKeyHash,
  });
}

/**
 * Check for nearby crags at a given location
 * GET /api/crags/check-nearby?lat=X&lon=Y&radius=500
 */
export async function checkNearbyCrags(
  lat: number,
  lon: number,
  radius = 500
): Promise<{ nearbyCrags: Array<{ id: string; name: string; lat: number; lon: number; slug: string; distance?: number }> }> {
  const params = new URLSearchParams({
    lat: lat.toString(),
    lon: lon.toString(),
    radius: radius.toString(),
  });
  return apiFetch(`/api/crags/check-nearby?${params}`);
}

/**
 * Reverse geocode coordinates to get location details
 * GET /api/geocode/reverse?lat=X&lon=Y
 */
export async function reverseGeocode(
  lat: number,
  lon: number
): Promise<{
  success: boolean;
  data: {
    formatted: {
      suggestedName?: string;
      country: string;
      state: string;
      municipality: string;
      village: string;
    };
  };
}> {
  const params = new URLSearchParams({
    lat: lat.toString(),
    lon: lon.toString(),
  });
  return apiFetch(`/api/geocode/reverse?${params}`);
}
