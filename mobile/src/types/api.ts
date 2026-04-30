/**
 * API response types
 * These match the actual web app API response shapes
 */

export type RockType =
  | "granite"
  | "sandstone"
  | "limestone"
  | "basalt"
  | "gneiss"
  | "quartzite"
  | "unknown";

export type ConditionsLabel = "good" | "fair" | "poor";

// --- /api/conditions response ---

export interface CurrentWeather {
  temperature_c: number;
  humidity: number;
  windSpeed_kph: number;
  windDirection?: number;
  precipitation_mm: number;
  weatherCode: number;
}

export interface HourlyFlags {
  rain_now: boolean;
  condensation_risk: boolean;
  high_humidity: boolean;
  wet_rock_likely: boolean;
  high_wind: boolean;
  extreme_wind: boolean;
}

export interface HourlyCondition {
  time: string;
  temperature_c: number;
  temp_c: number;
  humidity: number;
  dew_point_spread: number;
  windSpeed_kph: number;
  wind_kph: number;
  wind_direction?: number;
  precipitation_mm: number;
  precip_mm: number;
  weatherCode: number;
  isDry: boolean;
  warnings: string[];
  flags: HourlyFlags;
}

export interface PrecipitationContext {
  last24h: number;
  last48h: number;
  next24h: number;
}

export interface DryWindow {
  start: string;
  end: string;
  hours: number;
}

export interface DailyForecast {
  date: string;
  tempMax: number;
  tempMin: number;
  precipitation: number;
  windSpeedMax: number;
  windDirectionDominant?: number;
  sunrise: string;
  sunset: string;
  weatherCode: number;
}

export interface WeatherFlags {
  rain_now: boolean;
  rain_expected: { in_hours: number; mm: number } | null;
  recent_rain: { last_24h_mm: number; last_48h_mm: number };
  condensation_risk: boolean;
  high_humidity: boolean;
  wet_rock_likely: boolean;
  estimated_dry_by: string | null;
  sandstone_wet_warning: boolean;
  extreme_wind: boolean;
  high_wind: boolean;
}

export interface ConditionsData {
  label: ConditionsLabel;
  summary: string;
  flags: WeatherFlags;
  dry_windows: DryWindow[];
  hourlyConditions: HourlyCondition[];
  dailyForecast: DailyForecast[];
}

export interface ConditionsResponse {
  location: { lat: number; lon: number };
  rockType: string;
  current: CurrentWeather;
  conditions: ConditionsData;
  astro: { sunrise: string; sunset: string };
  updatedAt: string;
}

// --- /api/search response ---

export interface SearchResult {
  id: string;
  name: string;
  slug: string;
  location: string;
  country: string;
  rockType: RockType | null;
  climbingTypes: string | null;
  latitude: number;
  longitude: number;
  reportCount: number;
  matchScore: number;
  matchType: string;
  resultType: "crag" | "sector";
  parentCragName: string | null;
  parentCragId: string | null;
  parentCragSlug: string | null;
}

export interface SearchResponse {
  results: SearchResult[];
}

// --- /api/location/[slug] response ---

export interface CragData {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  lat: number;
  lon: number;
  rock_type: string | null;
  village: string | null;
  municipality: string | null;
  state: string | null;
  country: string | null;
  parent_crag_id: string | null;
}

export interface SectorData {
  id: string;
  name: string;
  slug: string;
  lat: number;
  lon: number;
  rock_type: string | null;
  parent_crag_id: string;
}

export interface CragDetailResponse {
  crag: CragData;
  conditions: ConditionsData & {
    current: CurrentWeather;
    astro: { sunrise: string; sunset: string };
    precipitationContext?: PrecipitationContext;
    dewPointSpread?: number;
    label: ConditionsLabel;
    summary: string;
    flags: WeatherFlags;
    reasons: string[];
    warnings: string[];
    isDry: boolean;
    dryingTimeHours?: number;
  };
  reports: Report[];
  sectors: SectorData[];
}

// --- /api/reports response ---

export interface Report {
  id: string;
  crag_id: string;
  sector_id: string | null;
  route_id: string | null;
  author_id: string | null;
  author?: { id: string; display_name: string | null } | null;
  category:
    | "conditions"
    | "safety"
    | "access"
    | "beta"
    | "facilities"
    | "climbing_info"
    | "lost_found"
    | "other";
  text: string | null;
  rating_dry: number | null;
  rating_wind: number | null;
  rating_crowds: number | null;
  photo_url: string | null;
  photos: string[];
  lost_found_type: "lost" | "found" | null;
  created_at: string;
  updated_at: string;
  confirmationCount?: number;
  confirmations?: { count: number }[];
}

export interface ReportsResponse {
  reports: Report[];
  total: number | null;
  limit: number;
  offset: number;
}

// --- /api/reports/feed response ---
// Shape differs from /api/reports because of the embedded crag/parent_crag join
// used by the live feed screen.

export interface FeedReportCrag {
  id: string;
  name: string;
  slug: string | null;
  country: string | null;
  state: string | null;
  municipality: string | null;
  village: string | null;
  parent_crag?: { name: string; slug: string } | null;
}

export interface FeedReport {
  id: string;
  crag_id?: string;
  category: string;
  text: string | null;
  photos?: string[];
  created_at: string;
  author?: { display_name: string | null } | null;
  confirmations?: { count: number }[];
  crag?: FeedReportCrag | null;
}

export interface FeedPage {
  reports: FeedReport[];
  nextCursor: string | null;
  totalCount?: number;
}

// --- /api/confirmations ---

export interface Confirmation {
  id: string;
  report_id: string;
  user_key_hash: string;
  created_at: string;
}

// --- /api/sync/[key] response ---

export interface SyncResponse {
  profile: unknown | null;
  crags: unknown[];
  reports: unknown[];
  confirmations: unknown[];
}

// --- App-level types ---

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
  timeFormat?: "12h" | "24h";
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
  lastLabel?: ConditionsLabel;
  lastCheckedAt?: string;
  isLocationless?: boolean;
  displayOrder: number;
  addedAt: string;
}

export interface AppNotification {
  id: string;
  user_profile_id: string;
  type: "new_report" | "conditions_alert" | "report_helpful";
  title: string;
  body: string;
  data: {
    cragId: string;
    cragSlug: string;
    cragName: string;
    reportId: string;
    category: string;
  };
  read: boolean;
  created_at: string;
}
