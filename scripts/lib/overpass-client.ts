/**
 * Overpass API Client
 * Fetches climbing crag data from OpenStreetMap
 */

export type OsmElement = {
  type: "node" | "way" | "relation";
  id: number;
  lat?: number;
  lon?: number;
  tags?: Record<string, string>;
  bounds?: {
    minlat: number;
    minlon: number;
    maxlat: number;
    maxlon: number;
  };
  geometry?: {
    lon: number;
    lat: number;
  }[];
  members?: Array<{
    type: string;
    ref: number;
    role: string;
    lat?: number;
    lon?: number;
  }>;
};

export type OverpassResponse = {
  version: number;
  generator: string;
  osm3s: {
    timestamp_osm_base: string;
  };
  elements: OsmElement[];
};

const OVERPASS_ENDPOINT = "https://overpass-api.de/api/interpreter";

/**
 * Build Overpass query for climbing crags
 */
export function buildClimbingQuery(
  options: {
    countryCode?: string;
    bbox?: [number, number, number, number]; // [minLat, minLon, maxLat, maxLon]
    timeout?: number;
  } = {}
): string {
  const { countryCode, bbox, timeout = 300 } = options;

  let areaFilter = "";
  let bboxFilter = "";

  if (countryCode) {
    areaFilter = `area["ISO3166-1"="${countryCode}"][admin_level=2];`;
  }

  if (bbox) {
    const [minLat, minLon, maxLat, maxLon] = bbox;
    bboxFilter = `[bbox:${minLat},${minLon},${maxLat},${maxLon}]`;
  }

  // Query for all climbing features (matches OpenClimbing.org approach)
  // This catches: climbing=crag, climbing=area, sport=climbing, leisure=climbing, etc.
  return `
    [out:json][timeout:${timeout}]${bboxFilter};
    ${areaFilter}
    (
      nwr["climbing"]${areaFilter ? "(area)" : ""};
      nwr["sport"="climbing"]${areaFilter ? "(area)" : ""};
    );
    out body geom;
  `.trim();
}

/**
 * Fetch climbing crags from Overpass API
 */
export async function fetchClimbingCrags(
  options: {
    countryCode?: string;
    bbox?: [number, number, number, number];
    timeout?: number;
  } = {}
): Promise<OsmElement[]> {
  const query = buildClimbingQuery(options);

  console.log("[Overpass] Executing query:", query.substring(0, 200) + "...");

  const url = `${OVERPASS_ENDPOINT}?data=${encodeURIComponent(query)}`;

  try {
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`Overpass API error: ${response.status} ${response.statusText}`);
    }

    const data: OverpassResponse = await response.json();

    console.log("[Overpass] Received", data.elements.length, "elements");
    console.log("[Overpass] OSM data timestamp:", data.osm3s.timestamp_osm_base);

    return data.elements;
  } catch (error) {
    console.error("[Overpass] Query failed:", error);
    throw error;
  }
}

/**
 * Get center coordinates from OSM element
 */
export function getCenterCoords(element: OsmElement): { lat: number; lon: number } | null {
  // Node: direct coordinates
  if (element.type === "node" && element.lat && element.lon) {
    return { lat: element.lat, lon: element.lon };
  }

  // Way: use first point from geometry
  if (element.type === "way" && element.geometry && element.geometry.length > 0) {
    return { lat: element.geometry[0].lat, lon: element.geometry[0].lon };
  }

  // Relation: calculate center from bounds
  if (element.type === "relation" && element.bounds) {
    const { minlat, minlon, maxlat, maxlon } = element.bounds;
    return {
      lat: (minlat + maxlat) / 2,
      lon: (minlon + maxlon) / 2,
    };
  }

  // Fallback: try to find coordinates in members
  if (element.members && element.members.length > 0) {
    const memberWithCoords = element.members.find((m) => m.lat && m.lon);
    if (memberWithCoords) {
      return { lat: memberWithCoords.lat!, lon: memberWithCoords.lon! };
    }
  }

  return null;
}

/**
 * Extract climbing types from OSM tags
 */
export function extractClimbingTypes(tags: Record<string, string>): string[] {
  const types: string[] = [];

  if (tags["climbing:sport"] === "yes") types.push("sport");
  if (tags["climbing:trad"] === "yes") types.push("trad");
  if (tags["climbing:boulder"] === "yes") types.push("boulder");
  if (tags["climbing:ice"] === "yes") types.push("ice");
  if (tags["climbing:mixed"] === "yes") types.push("mixed");
  if (tags["climbing:aid"] === "yes") types.push("aid");

  return types;
}

/**
 * Normalize rock type from OSM tags
 */
export function normalizeRockType(rockType: string | undefined): string | null {
  if (!rockType) return null;

  const normalized = rockType.toLowerCase().trim();

  // Map common variations to standard names
  const mapping: Record<string, string> = {
    limestone: "limestone",
    granite: "granite",
    sandstone: "sandstone",
    basalt: "basalt",
    gneiss: "gneiss",
    quartzite: "quartzite",
    conglomerate: "conglomerate",
    rhyolite: "rhyolite",
    porphyry: "porphyry",
    andesite: "andesite",
    slate: "slate",
    schist: "schist",
    dolomite: "dolomite",
    volcanic: "volcanic",
  };

  return mapping[normalized] || normalized;
}
