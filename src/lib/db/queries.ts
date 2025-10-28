/**
 * Database query helpers for temps.rocks
 * All queries use the Supabase client with proper types
 */

import { supabase } from "@/integrations/supabase/client";
import { Tables, TablesInsert } from "@/integrations/supabase/types";
import { v4 as uuidv4 } from "uuid";

// ==================== CRAGS ====================

export async function fetchCrags(limit = 50, offset = 0) {
  const { data, error } = await supabase
    .from("crags")
    .select("*")
    .limit(limit)
    .range(offset, offset + limit - 1)
    .order("name");

  if (error) throw error;
  return data;
}

export async function fetchCragById(id: string) {
  const { data, error } = await supabase.from("crags").select("*").eq("id", id).single();

  if (error) throw error;
  return data;
}

export async function searchCrags(query: string) {
  // Use RPC call with accent-insensitive search that includes both crags AND sectors
  // This handles cases like:
  // - "Apremont Desert" matching "Apremont Désert" (sector in Fontainebleau)
  // - "Fontainebleau" matching the parent crag AND all its sectors
  const { data, error } = await supabase.rpc("search_locations_unaccent", {
    search_query: query,
  });

  if (error) {
    // Fallback to old crag-only search if RPC fails
    console.warn("[searchCrags] RPC failed, falling back to ILIKE:", error);
    const fallback = await supabase
      .from("crags")
      .select("*")
      .or(`name.ilike.%${query}%,country.ilike.%${query}%`)
      .limit(10);
    return fallback.data;
  }

  return data;
}

export async function createCrag(crag: TablesInsert<"crags">) {
  const { data, error } = await supabase
    .from("crags")
    .insert({
      id: uuidv4(),
      ...crag,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Calculate distance between two points using Haversine formula
 * Returns distance in meters for accurate geographic distance calculation
 */
function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000; // Earth's radius in meters
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c; // Distance in meters
}

/**
 * Find a crag by coordinates within a tolerance (default ~100m = 0.001 degrees)
 * Returns the closest crag if multiple exist within tolerance
 */
export async function findCragByCoordinates(lat: number, lon: number, tolerance: number = 0.001) {
  console.log(
    `[findCragByCoordinates] Searching for crag at lat=${lat}, lon=${lon}, tolerance=${tolerance}`
  );

  // Query crags within bounding box
  const { data, error } = await supabase
    .from("crags")
    .select("*")
    .gte("lat", lat - tolerance)
    .lte("lat", lat + tolerance)
    .gte("lon", lon - tolerance)
    .lte("lon", lon + tolerance);

  if (error) {
    console.error(`[findCragByCoordinates] Query error:`, error);
    throw error;
  }

  console.log(`[findCragByCoordinates] Found ${data?.length || 0} crags in bounding box`);
  if (data && data.length > 0) {
    console.log(
      `[findCragByCoordinates] Crags:`,
      data.map((c) => ({ id: c.id, name: c.name, lat: c.lat, lon: c.lon }))
    );
  }

  if (!data || data.length === 0) return null;

  // Find closest crag using Haversine formula for accurate geographic distance
  let closest = data[0];
  let minDistance = haversineDistance(lat, lon, Number(closest.lat), Number(closest.lon));

  console.log(
    `[findCragByCoordinates] Initial closest: ${closest.name} at distance ${minDistance}m`
  );

  for (const crag of data.slice(1)) {
    const distance = haversineDistance(lat, lon, Number(crag.lat), Number(crag.lon));
    console.log(
      `[findCragByCoordinates] ${crag.name}: ${distance}m (current min: ${minDistance}m)`
    );
    if (distance < minDistance) {
      minDistance = distance;
      closest = crag;
      console.log(`[findCragByCoordinates] → New closest: ${crag.name}`);
    }
  }

  console.log(`[findCragByCoordinates] Final result: ${closest.name} at ${minDistance}m`);
  return closest;
}

/**
 * Find or create a crag at given coordinates
 * Useful for ensuring all users see the same reports for a location
 */
export async function findOrCreateCrag(params: {
  name: string;
  lat: number;
  lon: number;
  country?: string;
  state?: string;
  municipality?: string;
  village?: string;
  rockType?: string;
  source?: string;
}) {
  // First, try to find existing crag
  const existing = await findCragByCoordinates(params.lat, params.lon);
  if (existing) {
    return existing;
  }

  // Create new crag
  const newCrag = await createCrag({
    name: params.name,
    lat: params.lat,
    lon: params.lon,
    country: params.country || null,
    state: params.state || null,
    municipality: params.municipality || null,
    village: params.village || null,
    rock_type: params.rockType || null,
    source: params.source || "user_report",
  });

  return newCrag;
}

// ==================== SECTORS ====================

export async function fetchSectorsByCrag(cragId: string) {
  const { data, error } = await supabase
    .from("sectors")
    .select("*")
    .eq("crag_id", cragId)
    .order("name");

  if (error) throw error;
  return data;
}

export async function fetchSectorById(id: string) {
  const { data, error } = await supabase.from("sectors").select("*").eq("id", id).single();

  if (error) throw error;
  return data;
}

export async function createSector(sector: TablesInsert<"sectors">) {
  const { data, error } = await supabase
    .from("sectors")
    .insert({
      id: uuidv4(),
      ...sector,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

// ==================== ROUTES ====================

export async function fetchRoutesBySector(sectorId: string) {
  const { data, error } = await supabase
    .from("routes")
    .select("*")
    .eq("sector_id", sectorId)
    .order("name");

  if (error) throw error;
  return data;
}

export async function fetchRouteById(id: string) {
  const { data, error } = await supabase.from("routes").select("*").eq("id", id).single();

  if (error) throw error;
  return data;
}

export async function createRoute(route: TablesInsert<"routes">) {
  const { data, error } = await supabase
    .from("routes")
    .insert({
      id: uuidv4(),
      ...route,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

// ==================== REPORTS ====================

export async function createReport(report: TablesInsert<"reports">) {
  const { data, error } = await supabase
    .from("reports")
    .insert({
      id: uuidv4(),
      ...report,
      // observed_at should be provided by caller, defaults to now() in DB
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function fetchReportsByCrag(cragId: string, limit = 20) {
  const { data, error } = await supabase
    .from("reports")
    .select(
      `
      *,
      author:user_profiles(id, display_name),
      confirmations(id)
    `
    )
    .eq("crag_id", cragId)
    .order("observed_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("[fetchReportsByCrag] Error fetching reports:", error);
    throw error;
  }

  // Transform the data to include confirmation count
  const reportsWithCount =
    data?.map((report) => ({
      ...report,
      confirmationCount: report.confirmations?.length || 0,
    })) || [];

  return reportsWithCount;
}

export async function fetchReportsBySector(sectorId: string, limit = 20) {
  const { data, error } = await supabase
    .from("reports")
    .select("*")
    .eq("sector_id", sectorId)
    .order("observed_at", { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data;
}

export async function fetchReportsByRoute(routeId: string, limit = 20) {
  const { data, error } = await supabase
    .from("reports")
    .select("*")
    .eq("route_id", routeId)
    .order("observed_at", { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data;
}

export async function fetchReportById(id: string) {
  const { data, error } = await supabase.from("reports").select("*").eq("id", id).single();

  if (error) throw error;
  return data;
}

export async function updateReport(id: string, updates: Record<string, unknown>) {
  const { data, error } = await supabase
    .from("reports")
    .update({
      ...updates,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteReport(id: string) {
  const { error } = await supabase.from("reports").delete().eq("id", id);

  if (error) throw error;
}

// ==================== USER PROFILES ====================

export async function fetchOrCreateUserProfile(
  syncKeyHash: string
): Promise<Tables<"user_profiles">> {
  // Try to fetch existing using secure RPC function
  const { data: existing, error: fetchError } = await supabase.rpc("get_user_profile_by_hash", {
    p_sync_key_hash: syncKeyHash,
  });

  // RPC returns array, check if we got a result
  if (existing && Array.isArray(existing) && existing.length > 0) {
    return existing[0] as Tables<"user_profiles">;
  }

  // Don't throw on RPC errors, just create new profile
  if (fetchError) {
    console.warn("[fetchOrCreateUserProfile] RPC error:", fetchError);
  }

  // Create new profile (INSERT policy still allows this)
  const { data, error } = await supabase
    .from("user_profiles")
    .insert({
      id: uuidv4(),
      sync_key_hash: syncKeyHash,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) throw error;
  if (!data) throw new Error("Failed to create user profile");

  return data;
}

export async function fetchUserProfile(id: string) {
  // NOTE: This function won't work with current RLS policies as direct SELECT is blocked
  // Use fetchOrCreateUserProfile(syncKeyHash) instead
  const { data, error } = await supabase.from("user_profiles").select("*").eq("id", id).single();

  if (error) throw error;
  return data;
}

export async function updateUserProfile(
  syncKeyHash: string,
  updates: {
    display_name?: string;
    units_temperature?: string;
    units_wind_speed?: string;
    units_precipitation?: string;
    units_distance?: string;
    units_elevation?: string;
  }
) {
  // Use secure RPC function that verifies ownership via sync_key_hash
  const { data, error } = await supabase.rpc("update_user_profile_by_hash", {
    p_sync_key_hash: syncKeyHash,
    p_display_name: updates.display_name || undefined,
    p_units_temperature: updates.units_temperature || undefined,
    p_units_wind_speed: updates.units_wind_speed || undefined,
    p_units_precipitation: updates.units_precipitation || undefined,
    p_units_distance: updates.units_distance || undefined,
    p_units_elevation: updates.units_elevation || undefined,
  });

  if (error) throw error;

  // RPC returns array, get first element
  if (!data || data.length === 0) {
    throw new Error("Failed to update user profile");
  }

  return data[0];
}

// ==================== CONFIRMATIONS ====================

export async function createConfirmation(reportId: string, userKeyHash: string) {
  const { data, error } = await supabase
    .from("confirmations")
    .insert({
      id: uuidv4(),
      report_id: reportId,
      user_key_hash: userKeyHash,
      created_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function fetchConfirmationsForReport(reportId: string) {
  const { data, error } = await supabase
    .from("confirmations")
    .select("*")
    .eq("report_id", reportId);

  if (error) throw error;
  return data;
}

export async function countConfirmationsForReport(reportId: string) {
  const { error, count } = await supabase
    .from("confirmations")
    .select("*", { count: "exact", head: true })
    .eq("report_id", reportId);

  if (error) throw error;
  return count || 0;
}

export async function hasUserConfirmedReport(reportId: string, userKeyHash: string) {
  const { data, error } = await supabase
    .from("confirmations")
    .select("*")
    .eq("report_id", reportId)
    .eq("user_key_hash", userKeyHash)
    .maybeSingle();

  if (error) throw error;
  return !!data;
}

export async function removeConfirmation(reportId: string, userKeyHash: string) {
  const { error } = await supabase
    .from("confirmations")
    .delete()
    .eq("report_id", reportId)
    .eq("user_key_hash", userKeyHash);

  if (error) throw error;
}

// ==================== BULK OPERATIONS ====================

export async function fetchCragWithDetails(cragId: string) {
  const crag = await fetchCragById(cragId);
  const sectors = await fetchSectorsByCrag(cragId);
  const reports = await fetchReportsByCrag(cragId);

  return {
    ...crag,
    sectors,
    reports,
  };
}

export async function fetchSectorWithDetails(sectorId: string) {
  const sector = await fetchSectorById(sectorId);
  const routes = await fetchRoutesBySector(sectorId);
  const reports = await fetchReportsBySector(sectorId);

  return {
    ...sector,
    routes,
    reports,
  };
}

export async function fetchRouteWithDetails(routeId: string) {
  const route = await fetchRouteById(routeId);
  const reports = await fetchReportsByRoute(routeId);

  return {
    ...route,
    reports,
  };
}

// ==================== USER FAVORITES ====================

export async function createFavorite(favorite: any) {
  const { data, error } = await supabase
    .from("user_favorites")
    .insert({
      id: uuidv4(),
      ...favorite,
      added_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function fetchFavoritesByUserProfile(userProfileId: string) {
  const { data, error } = await supabase
    .from("user_favorites")
    .select("*")
    .eq("user_profile_id", userProfileId)
    .order("display_order", { ascending: true })
    .order("added_at", { ascending: false });

  if (error) throw error;
  return data;
}

export async function fetchFavoriteById(id: string) {
  const { data, error } = await supabase.from("user_favorites").select("*").eq("id", id).single();

  if (error) throw error;
  return data;
}

export async function updateFavorite(id: string, updates: Record<string, unknown>) {
  const { data, error } = await supabase
    .from("user_favorites")
    .update({
      ...updates,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteFavorite(id: string) {
  const { error } = await supabase.from("user_favorites").delete().eq("id", id);

  if (error) throw error;
}

export async function checkIsFavorite(
  userProfileId: string,
  areaId?: string,
  cragId?: string
): Promise<boolean> {
  const query = supabase.from("user_favorites");

  let selectQuery = query
    .select("id", { count: "exact", head: true })
    .eq("user_profile_id", userProfileId);

  if (cragId) {
    selectQuery = selectQuery.eq("crag_id", cragId);
  } else if (areaId) {
    selectQuery = selectQuery.eq("area_id", areaId);
  } else {
    return false;
  }

  const { count, error } = await selectQuery;

  if (error) throw error;
  return (count ?? 0) > 0;
}

export async function removeFavoriteByArea(userProfileId: string, areaId: string) {
  const { error } = await supabase
    .from("user_favorites")
    .delete()
    .eq("user_profile_id", userProfileId)
    .eq("area_id", areaId);

  if (error) throw error;
}

export async function removeFavoriteByCrag(userProfileId: string, cragId: string) {
  const { error } = await supabase
    .from("user_favorites")
    .delete()
    .eq("user_profile_id", userProfileId)
    .eq("crag_id", cragId);

  if (error) throw error;
}

// ==================== USER STATS ====================

export async function fetchOrCreateUserStats(userProfileId: string) {
  // Try to fetch existing
  const { data: existing } = await supabase
    .from("user_stats")
    .select("*")
    .eq("user_profile_id", userProfileId)
    .single();

  if (existing) return existing;

  // Create new stats
  const { data, error } = await supabase
    .from("user_stats")
    .insert({
      user_profile_id: userProfileId,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateUserStats(
  userProfileId: string,
  updates: {
    reports_posted?: number;
    confirmations_given?: number;
    favorites_count?: number;
  }
) {
  const { data, error } = await supabase
    .from("user_stats")
    .update({
      ...updates,
      last_active: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("user_profile_id", userProfileId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function incrementUserStat(
  userProfileId: string,
  statName: "reports_posted" | "confirmations_given" | "favorites_count"
) {
  // Fetch current stats
  const stats = await fetchOrCreateUserStats(userProfileId);

  // Increment the specified stat
  const updates = {
    [statName]: ((stats as any)[statName] || 0) + 1,
  };

  return await updateUserStats(userProfileId, updates);
}
