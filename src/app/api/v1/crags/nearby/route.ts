import { NextRequest, NextResponse } from "next/server";
import { getSupabaseClient, isSupabaseConfigured } from "@/integrations/supabase/client";

/**
 * GET /api/v1/crags/nearby
 * Find crags near coordinates.
 *
 * Query params:
 * - lat (required) — latitude
 * - lon (required) — longitude
 * - radius (optional, default 5000, max 50000) — radius in meters
 * - limit (optional, default 10, max 10) — the underlying RPC caps at 10
 */
export async function GET(request: NextRequest) {
  try {
    if (!isSupabaseConfigured) {
      return NextResponse.json({ error: "Service unavailable" }, { status: 500 });
    }

    const searchParams = request.nextUrl.searchParams;
    const latStr = searchParams.get("lat");
    const lonStr = searchParams.get("lon");

    const rawRadius = searchParams.get("radius");
    let radius = 5000;
    if (rawRadius !== null) {
      const parsed = parseInt(rawRadius, 10);
      if (!isNaN(parsed)) {
        radius = Math.min(Math.max(parsed, 1), 50000);
      }
    }

    const rawLimit = searchParams.get("limit");
    let limit = 10;
    if (rawLimit !== null) {
      const parsed = parseInt(rawLimit, 10);
      if (!isNaN(parsed)) {
        limit = Math.min(Math.max(parsed, 1), 10);
      }
    }

    if (!latStr || !lonStr) {
      return NextResponse.json(
        { error: "Query parameters 'lat' and 'lon' are required" },
        { status: 400 }
      );
    }

    const lat = parseFloat(latStr);
    const lon = parseFloat(lonStr);

    if (isNaN(lat) || isNaN(lon)) {
      return NextResponse.json(
        { error: "Invalid lat/lon values" },
        { status: 400 }
      );
    }

    const supabase = getSupabaseClient();

    // Try PostGIS earth_distance RPC first
    const { data, error } = await supabase.rpc("find_nearby_crags", {
      search_lat: lat,
      search_lon: lon,
      radius_meters: radius,
    });

    if (!error && data) {
      // RPC doesn't filter is_secret, so post-filter
      const cragIds = data.map((r: any) => r.id);
      let secretIds = new Set<string>();
      if (cragIds.length > 0) {
        const { data: secretCrags } = await supabase
          .from("crags")
          .select("id")
          .in("id", cragIds)
          .eq("is_secret", true);
        secretIds = new Set((secretCrags || []).map((c) => c.id));
      }

      const results = data
        .filter((r: any) => !secretIds.has(r.id))
        .slice(0, limit)
        .map((r: any) => ({
          id: r.id,
          name: r.name,
          slug: r.slug,
          lat: Number(r.lat),
          lon: Number(r.lon),
          distance_meters: Math.round(r.distance_meters),
        }));

      return NextResponse.json({ data: results });
    }

    // Fallback to simple bounding box query if RPC fails
    console.warn("[v1/crags/nearby] RPC failed, using fallback:", error?.message);
    const latDiff = radius / 111320;
    const lonDiff = radius / (111320 * Math.cos((lat * Math.PI) / 180));

    const { data: fallbackData, error: fallbackError } = await supabase
      .from("crags")
      .select("id, name, lat, lon, slug")
      .eq("is_secret", false)
      .gte("lat", lat - latDiff)
      .lte("lat", lat + latDiff)
      .gte("lon", lon - lonDiff)
      .lte("lon", lon + lonDiff)
      .limit(limit);

    if (fallbackError) {
      console.error("[v1/crags/nearby] Fallback error:", fallbackError);
      return NextResponse.json({ error: "Failed to find nearby crags" }, { status: 500 });
    }

    const results = (fallbackData || []).map((r) => ({
      id: r.id,
      name: r.name,
      slug: r.slug,
      lat: Number(r.lat),
      lon: Number(r.lon),
      distance_meters: null,
    }));

    return NextResponse.json({ data: results });
  } catch (error) {
    console.error("[v1/crags/nearby] Unexpected error:", error);
    return NextResponse.json({ error: "Failed to find nearby crags" }, { status: 500 });
  }
}
