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

  if (!response.ok) {
    throw new Error(`OpenBeta API error: ${response.status} ${response.statusText}`);
  }

  const result = await response.json();

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
  const query = `
    query SearchAreas($filter: AreaFilterInput!) {
      areas(filter: $filter) {
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
    filter: {
      area_name: {
        match: searchText,
      },
    },
  };

  const data = await executeQuery<AreasResponse>(query, variables);
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
