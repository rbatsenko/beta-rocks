import { NextRequest, NextResponse } from "next/server";
import { getSupabaseClient, isSupabaseConfigured } from "@/integrations/supabase/client";

/**
 * GET /api/v1/crags/:id/reports
 * Get community reports for a crag.
 *
 * Query params:
 * - limit (optional, default 20, max 100)
 * - offset (optional, default 0)
 * - category (optional) — filter by category
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    if (!isSupabaseConfigured) {
      return NextResponse.json({ error: "Service unavailable" }, { status: 500 });
    }

    const { id } = await params;
    const searchParams = request.nextUrl.searchParams;

    const rawLimit = searchParams.get("limit");
    const rawOffset = searchParams.get("offset");
    const parsedLimit = rawLimit === null ? 20 : Number(rawLimit);
    const parsedOffset = rawOffset === null ? 0 : Number(rawOffset);

    if (
      !Number.isFinite(parsedLimit) ||
      !Number.isInteger(parsedLimit) ||
      parsedLimit <= 0 ||
      !Number.isFinite(parsedOffset) ||
      !Number.isInteger(parsedOffset) ||
      parsedOffset < 0
    ) {
      return NextResponse.json({ error: "Invalid pagination parameters" }, { status: 400 });
    }

    const limit = Math.min(parsedLimit, 100);
    const offset = parsedOffset;
    const category = searchParams.get("category");
    const validCategories = ["conditions", "safety", "access", "climbing_info", "facilities", "lost_found", "other"];

    if (category && !validCategories.includes(category)) {
      return NextResponse.json(
        { error: `category must be one of: ${validCategories.join(", ")}` },
        { status: 400 }
      );
    }

    const supabase = getSupabaseClient();

    // Verify the crag exists and is not secret
    const { data: crag, error: cragError } = await supabase
      .from("crags")
      .select("id")
      .eq("id", id)
      .eq("is_secret", false)
      .single();

    if (cragError || !crag) {
      return NextResponse.json({ error: "Crag not found" }, { status: 404 });
    }

    // Build reports query
    let query = supabase
      .from("reports")
      .select("*, user_profiles(display_name), confirmations(count)", { count: "exact" })
      .eq("crag_id", id)
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (category) {
      query = query.eq("category", category);
    }

    const { data, error, count } = await query;

    if (error) {
      console.error("[v1/crags/:id/reports] Supabase error:", error);
      return NextResponse.json({ error: "Failed to fetch reports" }, { status: 500 });
    }

    const reports = (data || []).map((r: any) => {
      // confirmations(count) returns aggregate: [{count: n}]
      const rawCount = r.confirmations?.[0]?.count ?? 0;
      const confirmationsCount = typeof rawCount === "number" ? rawCount : Number(rawCount) || 0;

      return {
        id: r.id,
        category: r.category,
        message: r.text || null,
        rating: r.rating_dry || null,
        photo_url: r.photo_url || null,
        created_at: r.created_at,
        display_name: r.user_profiles?.display_name || "Anonymous",
        confirmations_count: confirmationsCount,
      };
    });

    return NextResponse.json({
      data: reports,
      total: count || 0,
    }, {
      headers: { "Cache-Control": "public, s-maxage=30, stale-while-revalidate=60" },
    });
  } catch (error) {
    console.error("[v1/crags/:id/reports] Unexpected error:", error);
    return NextResponse.json({ error: "Failed to fetch reports" }, { status: 500 });
  }
}
