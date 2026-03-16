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
  },
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
      authorId: syncKeyHash,
    },
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
 * Chat API (streaming)
 * Returns a ReadableStream for streaming responses
 */
export async function sendChatMessage(
  messages: { role: "user" | "assistant"; content: string }[],
  syncKeyHash?: string
): Promise<Response> {
  const url = `${API_URL}/api/chat`;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "X-Client-Platform": "mobile",
  };

  if (syncKeyHash) {
    headers["X-Sync-Key-Hash"] = syncKeyHash;
  }

  const response = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify({ messages }),
  });

  if (!response.ok) {
    throw new ApiError(
      response.status,
      await response.text().catch(() => "Chat request failed")
    );
  }

  return response;
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
