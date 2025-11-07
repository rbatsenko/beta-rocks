import { NextRequest, NextResponse } from "next/server";
import { getSupabaseClient, isSupabaseConfigured } from "@/integrations/supabase/client";

/**
 * GET /api/reports/recent
 * Fetch the last 50 reports ordered by created_at DESC
 *
 * Query params:
 * - favorites_only: "true" | "false" (default: false)
 * - cragIds: comma-separated list of crag IDs to filter by (required if favorites_only=true)
 *
 * Returns:
 * - reports: Array of report objects with crag information
 */
export async function GET(request: NextRequest) {
  try {
    if (!isSupabaseConfigured) {
      console.error("Supabase environment variables are not configured.");
      return NextResponse.json({ error: "Supabase client is not configured" }, { status: 500 });
    }

    const supabase = getSupabaseClient();
    const favoritesOnly = request.nextUrl.searchParams.get("favorites_only") === "true";
    const cragIdsParam = request.nextUrl.searchParams.get("cragIds");

    // Validate favorites_only requires cragIds
    if (favoritesOnly && !cragIdsParam) {
      return NextResponse.json(
        { error: "cragIds parameter is required when favorites_only=true" },
        { status: 400 }
      );
    }

    // Parse cragIds if provided
    const cragIds = cragIdsParam ? cragIdsParam.split(",").map((id) => id.trim()) : null;

    // Build query with join to crags table
    let query = supabase
      .from("reports")
      .select(
        `
        id,
        crag_id,
        sector_id,
        route_id,
        author_id,
        category,
        text,
        rating_dry,
        rating_wind,
        rating_crowds,
        photos,
        observed_at,
        expires_at,
        lost_found_type,
        created_at,
        updated_at,
        crags!inner (
          id,
          name,
          country,
          slug
        )
      `
      )
      .order("created_at", { ascending: false })
      .limit(50);

    // Filter by cragIds if favorites_only is enabled
    if (favoritesOnly && cragIds && cragIds.length > 0) {
      query = query.in("crag_id", cragIds);
    }

    const { data, error } = await query;

    if (error) {
      console.error("Supabase error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Transform the data to flatten crag information
    const reports = (data || []).map((report) => ({
      id: report.id,
      crag_id: report.crag_id,
      sector_id: report.sector_id,
      route_id: report.route_id,
      author_id: report.author_id,
      category: report.category,
      text: report.text,
      rating_dry: report.rating_dry,
      rating_wind: report.rating_wind,
      rating_crowds: report.rating_crowds,
      photos: report.photos,
      observed_at: report.observed_at,
      expires_at: report.expires_at,
      lost_found_type: report.lost_found_type,
      created_at: report.created_at,
      updated_at: report.updated_at,
      crag_name: Array.isArray(report.crags) ? report.crags[0]?.name : report.crags?.name,
      crag_country: Array.isArray(report.crags) ? report.crags[0]?.country : report.crags?.country,
      crag_slug: Array.isArray(report.crags) ? report.crags[0]?.slug : report.crags?.slug,
    }));

    return NextResponse.json({
      reports,
      total: reports.length,
    });
  } catch (error) {
    console.error("Reports recent GET error:", error);
    return NextResponse.json({ error: "Failed to fetch recent reports" }, { status: 500 });
  }
}
