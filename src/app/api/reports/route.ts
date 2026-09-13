import { NextRequest, NextResponse } from "next/server";
import { getSupabaseClient, isSupabaseConfigured } from "@/integrations/supabase/client";
import { fetchReportsByCragPage } from "@/lib/db/queries";

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

/**
 * GET /api/reports
 * Fetch reports for a crag, sector, or route
 *
 * Query params:
 * - cragId: string (required if no sectorId/routeId)
 * - sectorId: string (optional)
 * - routeId: string (optional)
 * - limit: number (default 20, max 100)
 * - offset: number (default 0)
 *
 * For cragId this goes through fetch_reports_by_crag_sorted so the response matches
 * what the crag page renders server-side: author profiles joined, child-sector reports
 * included, day-grouped ordering, and expired reports pushed to the end.
 */
export async function GET(request: NextRequest) {
  try {
    if (!isSupabaseConfigured) {
      console.error("Supabase environment variables are not configured.");
      return NextResponse.json({ error: "Supabase client is not configured" }, { status: 500 });
    }

    const supabase = getSupabaseClient();
    const cragId = request.nextUrl.searchParams.get("cragId");
    const sectorId = request.nextUrl.searchParams.get("sectorId");
    const routeId = request.nextUrl.searchParams.get("routeId");

    const parsedLimit = parseInt(request.nextUrl.searchParams.get("limit") || "", 10);
    const limit = Number.isFinite(parsedLimit)
      ? Math.min(Math.max(parsedLimit, 1), MAX_LIMIT)
      : DEFAULT_LIMIT;
    const parsedOffset = parseInt(request.nextUrl.searchParams.get("offset") || "", 10);
    const offset = Number.isFinite(parsedOffset) ? Math.max(parsedOffset, 0) : 0;

    if (!cragId && !sectorId && !routeId) {
      return NextResponse.json(
        { error: "Must provide at least cragId, sectorId, or routeId" },
        { status: 400 }
      );
    }

    if (cragId && !sectorId && !routeId) {
      const { reports, total } = await fetchReportsByCragPage(cragId, limit, offset);
      return NextResponse.json({
        reports,
        total,
        limit,
        offset,
        hasMore: offset + reports.length < total,
      });
    }

    let query = supabase
      .from("reports")
      .select(
        "*, author:user_profiles!reports_author_id_fkey(id, display_name), confirmations(count)",
        {
          count: "exact",
        }
      )
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (routeId) {
      query = query.eq("route_id", routeId);
    } else if (sectorId) {
      query = query.eq("sector_id", sectorId);
    }

    const { data, error, count } = await query;

    if (error) {
      console.error("Supabase error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const reports = data || [];

    return NextResponse.json({
      reports,
      total: count,
      limit,
      offset,
      hasMore: count != null ? offset + reports.length < count : reports.length === limit,
    });
  } catch (error) {
    console.error("Reports GET error:", error);
    return NextResponse.json({ error: "Failed to fetch reports" }, { status: 500 });
  }
}

/**
 * POST /api/reports
 * Create a new report
 *
 * Body:
 * - cragId: string (required)
 * - sectorId?: string
 * - routeId?: string
 * - authorId?: string (sync user profile id)
 * - text?: string
 * - rating_dry: 1-5
 * - rating_wind: 1-5
 * - rating_crowds: 1-5
 * - photo_url?: string
 */
export async function POST(request: NextRequest) {
  try {
    if (!isSupabaseConfigured) {
      console.error("Supabase environment variables are not configured.");
      return NextResponse.json({ error: "Supabase client is not configured" }, { status: 500 });
    }

    const supabase = getSupabaseClient();
    const body = await request.json();
    const {
      cragId,
      sectorId,
      routeId,
      authorId,
      text,
      rating_dry,
      rating_wind,
      rating_crowds,
      photo_url,
      category,
      lost_found_type,
      observed_at,
      expires_at,
    } = body;

    // Validate required fields
    if (!cragId) {
      return NextResponse.json({ error: "cragId is required" }, { status: 400 });
    }

    // Validate ratings are 1-5
    if (
      (rating_dry && (rating_dry < 1 || rating_dry > 5)) ||
      (rating_wind && (rating_wind < 1 || rating_wind > 5)) ||
      (rating_crowds && (rating_crowds < 1 || rating_crowds > 5))
    ) {
      return NextResponse.json({ error: "Ratings must be between 1-5" }, { status: 400 });
    }

    // Validate lost_found_type
    if (category === "lost_found") {
      if (!lost_found_type || !["lost", "found"].includes(lost_found_type)) {
        return NextResponse.json(
          { error: "lost_found_type must be 'lost' or 'found' when category is 'lost_found'" },
          { status: 400 }
        );
      }
    } else if (lost_found_type) {
      return NextResponse.json(
        { error: "lost_found_type can only be set when category is 'lost_found'" },
        { status: 400 }
      );
    }

    // Insert report into Supabase
    const { data, error } = await supabase
      .from("reports")
      .insert({
        crag_id: cragId,
        sector_id: sectorId,
        route_id: routeId,
        author_id: authorId,
        category,
        text,
        rating_dry,
        rating_wind,
        rating_crowds,
        photo_url,
        lost_found_type,
        ...(observed_at !== undefined && { observed_at }),
        ...(expires_at !== undefined && { expires_at }),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      console.error("Supabase insert error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    console.error("Reports POST error:", error);
    return NextResponse.json({ error: "Failed to create report" }, { status: 500 });
  }
}
