/**
 * Database query helpers for temps.rocks
 * All queries use the Supabase client with proper types
 */

import { supabase } from "@/integrations/supabase/client";
import { TablesInsert } from "@/integrations/supabase/types";
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
    .select("*")
    .eq("crag_id", cragId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data;
}

export async function fetchReportsBySector(sectorId: string, limit = 20) {
  const { data, error } = await supabase
    .from("reports")
    .select("*")
    .eq("sector_id", sectorId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data;
}

export async function fetchReportsByRoute(routeId: string, limit = 20) {
  const { data, error } = await supabase
    .from("reports")
    .select("*")
    .eq("route_id", routeId)
    .order("created_at", { ascending: false })
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

export async function fetchOrCreateUserProfile(syncKeyHash: string) {
  // Try to fetch existing
  const { data: existing } = await supabase
    .from("user_profiles")
    .select("*")
    .eq("sync_key_hash", syncKeyHash)
    .single();

  if (existing) return existing;

  // Create new profile
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
  return data;
}

export async function fetchUserProfile(id: string) {
  const { data, error } = await supabase.from("user_profiles").select("*").eq("id", id).single();

  if (error) throw error;
  return data;
}

export async function updateUserProfile(id: string, updates: { display_name?: string }) {
  const { data, error } = await supabase
    .from("user_profiles")
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
// NOTE: Types for user_favorites and user_stats tables will be available after
// running the migration and regenerating Supabase types. Until then, using 'any' for these queries.

export async function createFavorite(favorite: any) {
  const { data, error } = await supabase
    // @ts-expect-error - user_favorites table not yet in generated types
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
    // @ts-expect-error - user_favorites table not yet in generated types
    .from("user_favorites")
    .select("*")
    .eq("user_profile_id", userProfileId)
    .order("display_order", { ascending: true })
    .order("added_at", { ascending: false });

  if (error) throw error;
  return data;
}

export async function fetchFavoriteById(id: string) {
  const { data, error } = await supabase
    // @ts-expect-error - user_favorites table not yet in generated types
    .from("user_favorites")
    .select("*")
    .eq("id", id)
    .single();

  if (error) throw error;
  return data;
}

export async function updateFavorite(id: string, updates: Record<string, unknown>) {
  const { data, error } = await supabase
    // @ts-expect-error - user_favorites table not yet in generated types
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
  // @ts-expect-error - user_favorites table not yet in generated types
  const { error } = await supabase.from("user_favorites").delete().eq("id", id);

  if (error) throw error;
}

export async function checkIsFavorite(
  userProfileId: string,
  areaId?: string,
  cragId?: string
): Promise<boolean> {
  // @ts-expect-error - user_favorites table not yet in generated types
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
    // @ts-expect-error - user_favorites table not yet in generated types
    .from("user_favorites")
    .delete()
    .eq("user_profile_id", userProfileId)
    .eq("area_id", areaId);

  if (error) throw error;
}

export async function removeFavoriteByCrag(userProfileId: string, cragId: string) {
  const { error } = await supabase
    // @ts-expect-error - user_favorites table not yet in generated types
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
    // @ts-expect-error - user_stats table not yet in generated types
    .from("user_stats")
    .select("*")
    .eq("user_profile_id", userProfileId)
    .single();

  if (existing) return existing;

  // Create new stats
  const { data, error } = await supabase
    // @ts-expect-error - user_stats table not yet in generated types
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
    // @ts-expect-error - user_stats table not yet in generated types
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
