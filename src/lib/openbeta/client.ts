/**
 * OpenBeta GraphQL Client
 * Provides type-safe access to the OpenBeta climbing database
 */

import type {
  Area,
  AreasResponse,
  AreaResponse,
} from "./types";

const OPENBETA_ENDPOINT = "https://api.openbeta.io/graphql";

/**
 * Execute a GraphQL query against the OpenBeta API
 */
async function executeQuery<T>(query: string, variables?: Record<string, unknown>): Promise<T> {
  console.log("[OpenBeta] Request:", {
    endpoint: OPENBETA_ENDPOINT,
    query: query.substring(0, 100) + "...",
    variables,
  });

  const response = await fetch(OPENBETA_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      query,
      variables,
    }),
  });

  const result = await response.json();
  console.log("[OpenBeta] Raw response:", {
    status: response.status,
    ok: response.ok,
    result,
  });

  if (!response.ok) {
    throw new Error(`OpenBeta API error: ${response.status} ${response.statusText} - ${JSON.stringify(result)}`);
  }

  if (result.errors) {
    throw new Error(`GraphQL errors: ${JSON.stringify(result.errors)}`);
  }

  return result.data as T;
}

/**
 * Search for climbing areas by name
 * Returns multiple results for disambiguation
 */
export async function searchAreas(searchText: string): Promise<Area[]> {
  console.log("[OpenBeta] searchAreas called with:", searchText);

  const query = `
    query SearchAreas($searchText: String!) {
      areas(filter: { area_name: { match: $searchText } }) {
        uuid
        area_name
        metadata {
          lat
          lng
        }
        pathTokens
        ancestors
        content {
          description
        }
        children {
          uuid
          area_name
          metadata {
            lat
            lng
          }
        }
      }
    }
  `;

  const variables = {
    searchText,
  };

  console.log("[OpenBeta] Executing query with variables:", JSON.stringify(variables));

  const data = await executeQuery<AreasResponse>(query, variables);

  console.log("[OpenBeta] Response:", {
    count: data.areas?.length || 0,
    areas: data.areas?.slice(0, 3).map(a => ({
      name: a.area_name,
      path: a.pathTokens?.join(" > "),
      coords: `${a.metadata?.lat}, ${a.metadata?.lng}`,
    })),
  });

  return data.areas;
}

/**
 * Get detailed information about a single area by UUID
 */
export async function getAreaByUuid(uuid: string): Promise<Area> {
  const query = `
    query GetArea($uuid: ID!) {
      area(uuid: $uuid) {
        uuid
        area_name
        metadata {
          lat
          lng
        }
        pathTokens
        ancestors
        content {
          description
        }
        children {
          uuid
          area_name
          metadata {
            lat
            lng
          }
        }
        climbs {
          id
          name
          grades {
            yds
            french
          }
          fa
        }
      }
    }
  `;

  const data = await executeQuery<AreaResponse>(query, { uuid });
  return data.area;
}

/**
 * Format area as human-readable string with breadcrumb path
 */
export function formatAreaPath(area: Area): string {
  return area.pathTokens.join(" > ");
}

/**
 * Extract country from pathTokens (usually first element)
 */
export function getCountry(area: Area): string {
  return area.pathTokens[0] || "";
}

/**
 * Get rock type from area or its parent areas
 * Note: Rock type is not directly in OpenBeta schema, but sometimes in description
 */
export function extractRockType(area: Area): string | undefined {
  const description = area.content?.description?.toLowerCase() || "";

  // Try to detect rock type from description
  const rockTypes = ["granite", "sandstone", "limestone", "basalt", "gneiss", "quartzite"];

  for (const rockType of rockTypes) {
    if (description.includes(rockType)) {
      return rockType;
    }
  }

  return undefined;
}

/**
 * Check if an area is likely a crag (climbing area with routes)
 * vs a region/country container
 */
export function isCrag(area: Area): boolean {
  // Crags typically have:
  // - More than 3 levels in path (Country > Region > Crag)
  // - Or have climbs
  // - Or have description
  return (
    area.pathTokens.length >= 3 ||
    (area.climbs && area.climbs.length > 0) ||
    !!area.content?.description
  );
}

/**
 * Check if coordinates look precise (not generic region coordinates)
 * Generic coordinates are often whole numbers like (46, 2) for France
 */
export function hasPreciseCoordinates(area: Area): boolean {
  if (!area.metadata?.lat || !area.metadata?.lng) {
    return false;
  }

  const lat = area.metadata.lat;
  const lng = area.metadata.lng;

  // Check if coordinates have decimal precision (not whole numbers)
  // Whole numbers like (46, 2) are usually generic region coordinates
  const latIsWhole = Math.abs(lat - Math.round(lat)) < 0.01;
  const lngIsWhole = Math.abs(lng - Math.round(lng)) < 0.01;

  return !(latIsWhole && lngIsWhole);
}
