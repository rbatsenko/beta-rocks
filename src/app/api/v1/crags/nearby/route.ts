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
 * - limit (optional, default 20, max 100)
 */
export async function GET(request: NextRequest) {
  try {
    if (!isSupabaseConfigured) {
      return NextResponse.json({ error: "Service unavailable" }, { status: 500 });
    }

    const searchParams = request.nextUrl.searchParams;
    const latStr = searchParams.get("lat");
    const lonStr = searchParams.get("lon");
    const radius = Math.min(parseInt(searchParams.get("radius") || "5000"), 50000);
    const limit = Math.min(parseInt(searchParams.get("limit") || "20"), 100);

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
      const results = data.slice(0, limit).map((r: any) => ({
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
