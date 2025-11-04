import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// With cacheComponents enabled, route segment configs are not compatible
// Search should remain dynamic as it's user-specific

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

    // Call enhanced search function (includes both crags and sectors)
    const { data, error } = await supabase.rpc("search_locations_enhanced", {
      search_query: query.trim(),
    });

    if (error) {
      console.error("[search] Error:", error);
      throw error;
    }

    // Transform results for frontend
    const results = (data || []).map((result: any) => ({
      id: result.id,
      name: result.name,
      // Both crags and sectors use their own slug for navigation
      slug: result.slug,
      location: [result.village, result.municipality, result.state, result.country]
        .filter(Boolean)
        .join(", "),
      country: result.country,
      rockType: result.rock_type,
      climbingTypes: result.climbing_types,
      latitude: Number(result.lat),
      longitude: Number(result.lon),
      reportCount: Number(result.report_count || 0),
      matchScore: result.match_score,
      matchType: result.match_type,
      resultType: result.result_type,
      parentCragName: result.parent_crag_name,
      parentCragId: result.parent_crag_id,
      parentCragSlug: result.parent_crag_slug,
    }));

    return NextResponse.json({ results });
  } catch (error) {
    console.error("[search] Unexpected error:", error);
    return NextResponse.json({ error: "Failed to search crags" }, { status: 500 });
  }
}
