#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

const BASE_URL = process.env.BETA_ROCKS_API_URL || "https://beta.rocks";
const SYNC_KEY = process.env.BETA_ROCKS_SYNC_KEY || "";

async function apiGet(path: string): Promise<any> {
  const res = await fetch(`${BASE_URL}${path}`);
  return { status: res.status, data: await res.json() };
}

async function apiPost(path: string, body: Record<string, any>): Promise<any> {
  const res = await fetch(`${BASE_URL}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return { status: res.status, data: await res.json() };
}

const CATEGORIES = z.enum(["conditions", "safety", "access", "climbing_info", "facilities", "lost_found", "other"]);

const server = new McpServer({
  name: "beta-rocks",
  version: "1.0.0",
});

// Search crags
server.registerTool(
  "search_crags",
  {
    title: "Search Crags",
    description: "Search climbing crags by name. Returns matching crags with location, rock type, and climbing types.",
    inputSchema: z.object({
      query: z.string().min(2).describe("Search term (min 2 characters)"),
      limit: z.number().min(1).max(10).optional().describe("Max results (default 10)"),
    }),
  },
  async ({ query, limit }) => {
    const params = new URLSearchParams({ q: query });
    if (limit) params.set("limit", String(limit));
    const { data } = await apiGet(`/api/v1/crags/search?${params}`);
    return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
  }
);

// Get crag detail
server.registerTool(
  "get_crag",
  {
    title: "Get Crag",
    description: "Get detailed information about a specific crag by ID, including sectors, rock type, and location.",
    inputSchema: z.object({
      id: z.string().describe("Crag ID (e.g., osm_relation_17696060)"),
    }),
  },
  async ({ id }) => {
    const { data } = await apiGet(`/api/v1/crags/${encodeURIComponent(id)}`);
    return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
  }
);

// Find nearby crags
server.registerTool(
  "find_nearby_crags",
  {
    title: "Find Nearby Crags",
    description: "Find climbing crags near given coordinates. Useful for discovering crags in an area.",
    inputSchema: z.object({
      lat: z.number().describe("Latitude"),
      lon: z.number().describe("Longitude"),
      radius: z.number().min(1).max(50000).optional().describe("Radius in meters (default 5000, max 50000)"),
      limit: z.number().min(1).max(10).optional().describe("Max results (default 10)"),
    }),
  },
  async ({ lat, lon, radius, limit }) => {
    const params = new URLSearchParams({ lat: String(lat), lon: String(lon) });
    if (radius) params.set("radius", String(radius));
    if (limit) params.set("limit", String(limit));
    const { data } = await apiGet(`/api/v1/crags/nearby?${params}`);
    return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
  }
);

// Get crag reports
server.registerTool(
  "get_crag_reports",
  {
    title: "Get Crag Reports",
    description: "Get community reports for a crag - conditions, safety, access info submitted by climbers.",
    inputSchema: z.object({
      id: z.string().describe("Crag ID"),
      limit: z.number().min(1).max(100).optional().describe("Max results (default 20)"),
      offset: z.number().min(0).optional().describe("Pagination offset (default 0)"),
      category: CATEGORIES.optional().describe("Filter by report category"),
    }),
  },
  async ({ id, limit, offset, category }) => {
    const params = new URLSearchParams();
    if (limit) params.set("limit", String(limit));
    if (offset) params.set("offset", String(offset));
    if (category) params.set("category", category);
    const { data } = await apiGet(`/api/v1/crags/${encodeURIComponent(id)}/reports?${params}`);
    return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
  }
);

// Submit report
server.registerTool(
  "submit_report",
  {
    title: "Submit Report",
    description: "Submit a community report for a crag. Uses the sync key from BETA_ROCKS_SYNC_KEY env var, or pass one explicitly.",
    inputSchema: z.object({
      crag_id: z.string().describe("Crag ID to report on"),
      category: CATEGORIES.describe("Report category"),
      message: z.string().min(1).max(2000).describe("Report text"),
      rating_dry: z.number().min(1).max(5).optional().describe("Dryness rating 1-5 (conditions category)"),
      rating_wind: z.number().min(1).max(5).optional().describe("Wind rating 1-5 (conditions category)"),
      rating_crowds: z.number().min(1).max(5).optional().describe("Crowds rating 1-5 (conditions category)"),
      lost_found_type: z.enum(["lost", "found"]).optional().describe("Required when category is 'lost_found'"),
      sync_key: z.string().optional().describe("beta.rocks sync key (uses BETA_ROCKS_SYNC_KEY env var if not provided)"),
      source: z.string().optional().describe("Source app identifier"),
    }),
  },
  async ({ crag_id, category, message, rating_dry, rating_wind, rating_crowds, lost_found_type, sync_key, source }) => {
    const resolvedSyncKey = sync_key || SYNC_KEY;
    if (!resolvedSyncKey) {
      return { content: [{ type: "text", text: "Error: No sync key provided. Either pass sync_key or set the BETA_ROCKS_SYNC_KEY environment variable." }] };
    }
    const body: Record<string, any> = { crag_id, category, message, sync_key: resolvedSyncKey };
    if (rating_dry) body.rating_dry = rating_dry;
    if (rating_wind) body.rating_wind = rating_wind;
    if (rating_crowds) body.rating_crowds = rating_crowds;
    if (lost_found_type) body.lost_found_type = lost_found_type;
    if (source) body.source = source;
    const { status, data } = await apiPost("/api/v1/reports", body);
    const text = status === 201
      ? `Report submitted successfully:\n${JSON.stringify(data, null, 2)}`
      : `Failed (${status}):\n${JSON.stringify(data, null, 2)}`;
    return { content: [{ type: "text", text }] };
  }
);

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch(console.error);
