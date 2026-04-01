import { NextRequest, NextResponse } from "next/server";
import { getSupabaseClient, isSupabaseConfigured } from "@/integrations/supabase/client";

/**
 * GET /api/v1/crags/:id
 * Get crag detail by ID.
 */
export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    if (!isSupabaseConfigured) {
      return NextResponse.json({ error: "Service unavailable" }, { status: 500 });
    }

    const { id } = await params;
    const supabase = getSupabaseClient();

    // Fetch the crag
    const { data: crag, error } = await supabase
      .from("crags")
      .select("*")
      .eq("id", id)
      .eq("is_secret", false)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return NextResponse.json({ error: "Crag not found" }, { status: 404 });
      }
      console.error("[v1/crags/:id] Supabase error:", error);
      return NextResponse.json({ error: "Failed to fetch crag" }, { status: 500 });
    }

    if (!crag) {
      return NextResponse.json({ error: "Crag not found" }, { status: 404 });
    }

    // Fetch child crags (sectors)
    const { data: sectors } = await supabase
      .from("crags")
      .select("id, name, slug")
      .eq("parent_crag_id", id)
      .eq("is_secret", false)
      .order("name");

    return NextResponse.json({
      data: {
        id: crag.id,
        name: crag.name,
        slug: crag.slug,
        country: crag.country || null,
        state: crag.state || null,
        municipality: crag.municipality || null,
        village: crag.village || null,
        lat: crag.lat,
        lon: crag.lon,
        rock_type: crag.rock_type || null,
        climbing_types: crag.climbing_types || [],
        aspects: crag.aspects || [],
        description: crag.description || null,
        sectors: (sectors || []).map((s) => ({
          id: s.id,
          name: s.name,
          slug: s.slug,
        })),
      },
    }, {
      headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600" },
    });
  } catch (error) {
    console.error("[v1/crags/:id] Unexpected error:", error);
    return NextResponse.json({ error: "Failed to fetch crag" }, { status: 500 });
  }
}
