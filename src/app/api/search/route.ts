import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "edge";
export const dynamic = "force-dynamic";

/**
 * Autocomplete search API endpoint
 * Searches crags with enhanced fuzzy matching, abbreviation handling, and accent-insensitive search
 *
 * Query params:
 * - q: search query (required)
 *
 * Returns up to 10 results sorted by relevance score
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const query = searchParams.get("q");

    if (!query || query.trim().length === 0) {
      return NextResponse.json({ results: [] });
    }

    // Minimum 2 characters for search
    if (query.trim().length < 2) {
      return NextResponse.json({ results: [] });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

    if (!supabaseUrl || !supabaseKey) {
      throw new Error("Missing Supabase configuration");
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Call enhanced search function
    const { data, error } = await supabase.rpc("search_crags_enhanced", {
      search_query: query.trim(),
    });

    if (error) {
      console.error("[search] Error:", error);
      throw error;
    }

    // Transform results for frontend
    const results = (data || []).map((crag: any) => ({
      id: crag.id,
      name: crag.name,
      slug: crag.slug,
      location: [crag.village, crag.municipality, crag.state, crag.country]
        .filter(Boolean)
        .join(", "),
      country: crag.country,
      rockType: crag.rock_type,
      climbingTypes: crag.climbing_types,
      latitude: Number(crag.lat),
      longitude: Number(crag.lon),
      reportCount: Number(crag.report_count || 0),
      matchScore: crag.match_score,
      matchType: crag.match_type,
    }));

    return NextResponse.json({ results });
  } catch (error) {
    console.error("[search] Unexpected error:", error);
    return NextResponse.json({ error: "Failed to search crags" }, { status: 500 });
  }
}
