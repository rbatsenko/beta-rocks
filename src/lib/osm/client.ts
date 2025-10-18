/**
 * OpenStreetMap Overpass API Client
 * Queries OSM for climbing areas with precise coordinates and rock types
 */

import type { OSMResponse, OSMElement, ClimbingArea } from "./types";

const OVERPASS_ENDPOINT = "https://overpass-api.de/api/interpreter";

/**
 * Search for climbing areas in OSM by name
 * This searches for sport=climbing nodes/ways/relations
 */
export async function searchClimbingAreas(searchText: string): Promise<ClimbingArea[]> {
  console.log("[OSM] searchClimbingAreas called with:", searchText);

  // Overpass QL query to find climbing areas
  // Searches nodes, ways, and relations with sport=climbing or climbing:* tags
  const query = `
    [out:json][timeout:25];
    (
      node["sport"="climbing"]["name"~"${escapeRegex(searchText)}",i];
      way["sport"="climbing"]["name"~"${escapeRegex(searchText)}",i];
      relation["sport"="climbing"]["name"~"${escapeRegex(searchText)}",i];
      node["climbing:sport"="yes"]["name"~"${escapeRegex(searchText)}",i];
      way["climbing:sport"="yes"]["name"~"${escapeRegex(searchText)}",i];
      relation["climbing:sport"="yes"]["name"~"${escapeRegex(searchText)}",i];
    );
    out center tags;
  `;

  console.log("[OSM] Executing query:", query.substring(0, 150) + "...");

  try {
    const response = await fetch(OVERPASS_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: `data=${encodeURIComponent(query)}`,
    });

    if (!response.ok) {
      throw new Error(`OSM API error: ${response.status} ${response.statusText}`);
    }

    const data: OSMResponse = await response.json();

    console.log("[OSM] Response:", {
      count: data.elements.length,
      elements: data.elements.slice(0, 3).map(e => ({
        type: e.type,
        name: e.tags?.name,
        coords: getCoordinates(e),
        rock: e.tags?.rock,
      })),
    });

    // Convert OSM elements to climbing areas
    const areas = data.elements
      .map(elementToClimbingArea)
      .filter((area): area is ClimbingArea => area !== null);

    console.log("[OSM] Converted to climbing areas:", areas.length);

    return areas;
  } catch (error) {
    console.error("[OSM] Search error:", {
      searchText,
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}

/**
 * Get coordinates from an OSM element
 * Nodes have lat/lon directly, ways/relations have a center
 */
function getCoordinates(element: OSMElement): { lat: number; lon: number } | null {
  if (element.lat !== undefined && element.lon !== undefined) {
    return { lat: element.lat, lon: element.lon };
  }
  if (element.center) {
    return { lat: element.center.lat, lon: element.center.lon };
  }
  return null;
}

/**
 * Convert OSM element to ClimbingArea
 */
function elementToClimbingArea(element: OSMElement): ClimbingArea | null {
  const coords = getCoordinates(element);
  if (!coords || !element.tags?.name) {
    return null;
  }

  // Extract rock type from tags
  const rockType = element.tags.rock;

  // Try to get country from various tags
  const country = element.tags["addr:country"] || element.tags["is_in:country"];

  return {
    id: element.id,
    name: element.tags.name,
    latitude: coords.lat,
    longitude: coords.lon,
    rockType,
    country,
    description: element.tags.description,
    osmType: element.type,
    tags: element.tags as Record<string, string>,
  };
}

/**
 * Escape special regex characters in search text
 */
function escapeRegex(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Normalize rock type from OSM tags
 * OSM uses various formats: "limestone", "Limestone", "lime stone", etc.
 */
export function normalizeRockType(rockType?: string): string | undefined {
  if (!rockType) return undefined;

  const normalized = rockType.toLowerCase().trim();

  // Map common variations to standard types
  const rockTypeMap: Record<string, string> = {
    limestone: "limestone",
    "lime stone": "limestone",
    granite: "granite",
    sandstone: "sandstone",
    "sand stone": "sandstone",
    basalt: "basalt",
    gneiss: "gneiss",
    quartzite: "quartzite",
    conglomerate: "conglomerate",
    volcanic: "volcanic",
    tuff: "tuff",
  };

  return rockTypeMap[normalized] || normalized;
}

/**
 * Check if an OSM climbing area has valid coordinates
 */
export function hasValidCoordinates(area: ClimbingArea): boolean {
  return (
    area.latitude !== undefined &&
    area.longitude !== undefined &&
    !isNaN(area.latitude) &&
    !isNaN(area.longitude) &&
    area.latitude >= -90 &&
    area.latitude <= 90 &&
    area.longitude >= -180 &&
    area.longitude <= 180
  );
}
