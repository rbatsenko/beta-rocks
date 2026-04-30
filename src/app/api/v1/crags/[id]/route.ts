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

    // If the sector's own rock_type / climbing_types are missing, fall back to
    // the parent area (e.g. Cuvier sectors → Fontainebleau). The backfill
    // should have copied these forward already, but newly-imported sectors
    // may still arrive with nulls before the next backfill cycle.
    const needsParentFallback =
      !!crag.parent_crag_id &&
      (!crag.rock_type ||
        !crag.climbing_types ||
        (Array.isArray(crag.climbing_types) && crag.climbing_types.length === 0));

    let parentRockType: string | null = null;
    let parentClimbingTypes: string[] | null = null;
    if (needsParentFallback) {
      const { data: parent } = await supabase
        .from("crags")
        .select("rock_type, climbing_types")
        .eq("id", crag.parent_crag_id)
        .single();
      parentRockType = parent?.rock_type ?? null;
      parentClimbingTypes = parent?.climbing_types ?? null;
    }

    const rockType = crag.rock_type || parentRockType;
    const climbingTypes =
      crag.climbing_types && crag.climbing_types.length > 0
        ? crag.climbing_types
        : (parentClimbingTypes ?? []);

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
        rock_type: rockType || null,
        climbing_types: climbingTypes,
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
