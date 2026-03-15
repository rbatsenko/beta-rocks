/**
 * API client for beta.rocks mobile app
 * Calls the Next.js API endpoints deployed on Vercel
 */

import { API_URL } from "../constants/config";
import type {
  ConditionsResult,
  SearchResult,
  CragDetail,
  Report,
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
 */
export async function getConditions(
  lat: number,
  lon: number,
  rockType: RockType = "unknown"
): Promise<ConditionsResult> {
  const params = new URLSearchParams({
    lat: lat.toString(),
    lon: lon.toString(),
    rockType,
  });

  return apiFetch<ConditionsResult>(`/api/conditions?${params}`);
}

/**
 * Search API
 */
export async function searchLocations(
  query: string,
  limit = 10
): Promise<SearchResult[]> {
  const params = new URLSearchParams({
    q: query,
    limit: limit.toString(),
  });

  return apiFetch<SearchResult[]>(`/api/search?${params}`);
}

/**
 * Crag detail API
 */
export async function getCragBySlug(
  slug: string
): Promise<CragDetail> {
  return apiFetch<CragDetail>(`/api/location/${slug}`);
}

/**
 * Reports API
 */
export async function getReportsByCrag(
  cragId: string
): Promise<Report[]> {
  const params = new URLSearchParams({ cragId });
  return apiFetch<Report[]>(`/api/reports?${params}`);
}

export async function createReport(
  report: {
    cragId: string;
    category: Report["category"];
    text: string;
    drynessRating?: number;
    windRating?: number;
    crowdRating?: number;
  },
  syncKeyHash: string
): Promise<Report> {
  return apiFetch<Report>("/api/reports", {
    method: "POST",
    body: report,
    syncKeyHash,
  });
}

/**
 * Confirmations API (report voting)
 */
export async function confirmReport(
  reportId: string,
  isHelpful: boolean,
  syncKeyHash: string
): Promise<void> {
  await apiFetch(`/api/reports/${reportId}/confirm`, {
    method: "POST",
    body: { isHelpful },
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
 */
export async function restoreProfile(
  syncKey: string
): Promise<{ success: boolean; displayName?: string }> {
  return apiFetch(`/api/sync/${syncKey}`);
}

/**
 * Recent reports feed
 */
export async function getReportsFeed(
  limit = 20
): Promise<Report[]> {
  const params = new URLSearchParams({ limit: limit.toString() });
  return apiFetch<Report[]>(`/api/reports/feed?${params}`);
}
