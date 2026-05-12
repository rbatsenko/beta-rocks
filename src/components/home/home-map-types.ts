/**
 * Shared types for the home-page crags map.
 */

export type ConditionsLabel = "good" | "fair" | "poor";

/** Marker filter keys: the three conditions labels plus "unrated" (grey, conditions not computed). */
export const MAP_LABEL_KEYS = ["good", "fair", "poor", "unrated"] as const;
export type MapLabelKey = (typeof MAP_LABEL_KEYS)[number];

export interface MapCrag {
  id: string;
  name: string;
  slug: string;
  lat: number;
  lon: number;
  rock_type: string | null;
  country: string | null;
  /** Great-circle distance from the user's location, in metres. */
  distance_m: number;
  /**
   * Friction label for current conditions, used to colour the marker. `null` when conditions
   * weren't computed for this crag (too far down the list) or the computation failed — the
   * drawer fetches full conditions on demand when the crag is opened.
   */
  label: ConditionsLabel | null;
}

export interface NearbyConditionsResponse {
  data: MapCrag[];
  query: {
    lat: number;
    lon: number;
    radius_m: number;
    /** Total crags returned. */
    count: number;
    /** How many of them had conditions computed (the rest have label: null). */
    with_conditions: number;
  };
}

/** State of the geolocation request that powers the home-page map. */
export type GeoStatus = "idle" | "locating" | "ready" | "error" | "unsupported";

/** Loading/result state for the nearby-crags query, surfaced in the welcome card. */
export interface NearbyState {
  isLoading: boolean;
  isError: boolean;
  /** Number of crags returned, or null while loading / before a location is known. */
  count: number | null;
}
