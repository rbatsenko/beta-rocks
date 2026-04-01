import { NextRequest, NextResponse } from "next/server";
import { getSupabaseClient, isSupabaseConfigured } from "@/integrations/supabase/client";

/**
 * GET /api/v1/crags/search
 * Search crags by name for autocomplete.
 *
 * Query params:
 * - q (required, min 2 chars) — search term
 * - limit (optional, default 10, max 10) — the underlying RPC caps at 10
 */
export async function GET(request: NextRequest) {
  try {
    if (!isSupabaseConfigured) {
      return NextResponse.json({ error: "Service unavailable" }, { status: 500 });
    }

    const searchParams = request.nextUrl.searchParams;
    const q = searchParams.get("q");

    const rawLimit = searchParams.get("limit");
    let limit = 10;
    if (rawLimit !== null) {
      const parsed = parseInt(rawLimit, 10);
      if (!isNaN(parsed)) {
        limit = Math.min(Math.max(parsed, 1), 10);
      }
    }

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

    // RPC doesn't filter is_secret, so we need to post-filter by checking each crag
    const cragIds = (data || []).map((r: any) => r.id);

    let secretIds = new Set<string>();
    if (cragIds.length > 0) {
      const { data: secretCrags } = await supabase
        .from("crags")
        .select("id")
        .in("id", cragIds)
        .eq("is_secret", true);
      secretIds = new Set((secretCrags || []).map((c) => c.id));
    }

    const results = (data || [])
      .filter((r: any) => !secretIds.has(r.id))
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

    return NextResponse.json({ data: results }, {
      headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=120" },
    });
  } catch (error) {
    console.error("[v1/crags/search] Unexpected error:", error);
    return NextResponse.json({ error: "Failed to search crags" }, { status: 500 });
  }
}
