/**
 * API response types
 * These mirror the web app's API response shapes
 */

export type RockType =
  | "granite"
  | "sandstone"
  | "limestone"
  | "basalt"
  | "gneiss"
  | "quartzite"
  | "unknown";

export type FrictionRating = "Nope" | "Poor" | "Fair" | "Good" | "Great";

export interface HourlyCondition {
  time: string;
  temp_c: number;
  humidity: number;
  wind_kph: number;
  precip_mm: number;
  isOptimal: boolean;
  frictionScore: number;
  rating: FrictionRating;
  isDry: boolean;
  warnings: string[];
  weatherCode?: number;
}

export interface OptimalWindow {
  startTime: string;
  endTime: string;
  avgFrictionScore: number;
  rating: FrictionRating;
  hourCount: number;
}

export interface ConditionsResult {
  frictionScore: number;
  rating: FrictionRating;
  temperature: number;
  humidity: number;
  windSpeed: number;
  precipitation: number;
  dewPointSpread: number;
  rockType: RockType;
  hourlyConditions: HourlyCondition[];
  optimalWindows: OptimalWindow[];
  warnings: string[];
  weatherCode?: number;
}

export interface SearchResult {
  id: string;
  name: string;
  location: string;
  latitude: number;
  longitude: number;
  rockType?: RockType;
  type: "crag" | "sector";
  parentName?: string;
  slug?: string;
}

export interface CragDetail {
  id: string;
  name: string;
  slug: string;
  location: string;
  latitude: number;
  longitude: number;
  rockType?: RockType;
  description?: string;
  countryCode?: string;
  sectors?: {
    id: string;
    name: string;
    routeCount?: number;
  }[];
}

export interface Report {
  id: string;
  crag_id: string;
  user_profile_id: string;
  category: "conditions" | "safety" | "access" | "beta" | "facilities" | "other";
  text: string;
  dryness_rating?: number;
  wind_rating?: number;
  crowd_rating?: number;
  helpful_count: number;
  unhelpful_count: number;
  created_at: string;
  display_name?: string;
}

export interface UserProfile {
  syncKey: string;
  syncKeyHash?: string;
  displayName?: string;
  units?: UnitsConfig;
  createdAt: string;
  updatedAt: string;
}

export interface UnitsConfig {
  temperature: "celsius" | "fahrenheit";
  windSpeed: "kmh" | "mph" | "ms" | "knots";
  precipitation: "mm" | "inches";
  distance: "km" | "miles";
  elevation: "meters" | "feet";
}

export interface Favorite {
  id: string;
  userProfileId: string;
  areaId?: string;
  cragId?: string;
  areaName: string;
  areaSlug?: string;
  location: string;
  latitude: number;
  longitude: number;
  rockType?: RockType;
  lastRating?: string;
  lastFrictionScore?: number;
  lastCheckedAt?: string;
  displayOrder: number;
  addedAt: string;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt?: string;
}
