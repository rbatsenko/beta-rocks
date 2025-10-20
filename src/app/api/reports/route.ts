import { NextRequest, NextResponse } from "next/server";
import { getSupabaseClient, isSupabaseConfigured } from "@/integrations/supabase/client";

/**
 * GET /api/reports
 * Fetch reports for a crag, sector, or route
 *
 * Query params:
 * - cragId: string (required if no sectorId/routeId)
 * - sectorId: string (optional)
 * - routeId: string (optional)
 * - limit: number (default 50)
 * - offset: number (default 0)
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
    const limit = parseInt(request.nextUrl.searchParams.get("limit") || "50");
    const offset = parseInt(request.nextUrl.searchParams.get("offset") || "0");

    if (!cragId && !sectorId && !routeId) {
      return NextResponse.json(
        { error: "Must provide at least cragId, sectorId, or routeId" },
        { status: 400 }
      );
    }

    let query = supabase
      .from("reports")
      .select("*, confirmations(count)", { count: "exact" })
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (routeId) {
      query = query.eq("route_id", routeId);
    } else if (sectorId) {
      query = query.eq("sector_id", sectorId);
    } else {
      query = query.eq("crag_id", cragId as string);
    }

    const { data, error, count } = await query;

    if (error) {
      console.error("Supabase error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      reports: data || [],
      total: count,
      limit,
      offset,
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

    // Insert report into Supabase
    const { data, error } = await supabase
      .from("reports")
      .insert({
        crag_id: cragId,
        sector_id: sectorId,
        route_id: routeId,
        author_id: authorId,
        text,
        rating_dry,
        rating_wind,
        rating_crowds,
        photo_url,
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
