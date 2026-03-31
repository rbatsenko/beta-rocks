import { NextRequest, NextResponse } from "next/server";
import { getSupabaseClient, isSupabaseConfigured } from "@/integrations/supabase/client";

/**
 * GET /api/v1/crags/search
 * Search crags by name for autocomplete.
 *
 * Query params:
 * - q (required, min 2 chars) — search term
 * - limit (optional, default 10, max 50)
 */
export async function GET(request: NextRequest) {
  try {
    if (!isSupabaseConfigured) {
      return NextResponse.json({ error: "Service unavailable" }, { status: 500 });
    }

    const searchParams = request.nextUrl.searchParams;
    const q = searchParams.get("q");
    const limit = Math.min(parseInt(searchParams.get("limit") || "10"), 50);

    if (!q || q.trim().length < 2) {
      return NextResponse.json(
        { error: "Query parameter 'q' is required and must be at least 2 characters" },
        { status: 400 }
      );
    }

    const supabase = getSupabaseClient();

    const { data, error } = await supabase.rpc("search_crags_enhanced", {
      search_query: q.trim(),
    });

    if (error) {
      console.error("[v1/crags/search] Supabase error:", error);
      return NextResponse.json({ error: "Failed to search crags" }, { status: 500 });
    }

    const results = (data || [])
      .filter((r: any) => !r.is_secret)
      .slice(0, limit)
      .map((r: any) => ({
        id: r.id,
        name: r.name,
        slug: r.slug,
        country: r.country || null,
        state: r.state || null,
        municipality: r.municipality || null,
        village: r.village || null,
        lat: r.lat,
        lon: r.lon,
        rock_type: r.rock_type || null,
        climbing_types: r.climbing_types || [],
        match_score: r.match_score,
      }));

    return NextResponse.json({ data: results });
  } catch (error) {
    console.error("[v1/crags/search] Unexpected error:", error);
    return NextResponse.json({ error: "Failed to search crags" }, { status: 500 });
  }
}
