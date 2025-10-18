/**
 * OpenStreetMap Overpass API Types
 * For querying climbing areas from OSM
 */

export interface OSMElement {
  type: "node" | "way" | "relation";
  id: number;
  lat?: number;
  lon?: number;
  center?: {
    lat: number;
    lon: number;
  };
  tags?: {
    name?: string;
    sport?: string;
    "climbing:sport"?: string;
    "climbing:boulder"?: string;
    "climbing:trad"?: string;
    rock?: string; // Rock type: limestone, granite, sandstone, etc.
    description?: string;
    "addr:country"?: string;
    "is_in:country"?: string;
    [key: string]: string | undefined;
  };
}

export interface OSMResponse {
  version: number;
  generator: string;
  elements: OSMElement[];
}

export interface ClimbingArea {
  id: number;
  name: string;
  latitude: number;
  longitude: number;
  rockType?: string;
  country?: string;
  description?: string;
  osmType: "node" | "way" | "relation";
  tags: Record<string, string>;
}
