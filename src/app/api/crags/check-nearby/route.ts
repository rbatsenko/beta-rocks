import { NextRequest, NextResponse } from "next/server";
import { getSupabaseClient, isSupabaseConfigured } from "@/integrations/supabase/client";

/**
 * Check if crags exist nearby a given coordinate
 * GET /api/crags/check-nearby?lat=X&lon=Y&radius=500
 */
export async function GET(request: NextRequest) {
  try {
    if (!isSupabaseConfigured) {
      console.error("Supabase environment variables are not configured.");
      return NextResponse.json({ error: "Supabase client is not configured" }, { status: 500 });
    }

    const { searchParams } = new URL(request.url);
    const lat = parseFloat(searchParams.get("lat") || "");
    const lon = parseFloat(searchParams.get("lon") || "");
    const radius = parseInt(searchParams.get("radius") || "500");

    if (isNaN(lat) || isNaN(lon)) {
      return NextResponse.json({ error: "Invalid lat/lon parameters" }, { status: 400 });
    }

    const supabase = getSupabaseClient();

    // Use PostGIS earth_distance for accurate distance calculation
    const { data, error } = await supabase.rpc("find_nearby_crags", {
      search_lat: lat,
      search_lon: lon,
      radius_meters: radius,
    });

    if (error) {
      // If the function doesn't exist, fall back to simple query
      const latDiff = radius / 111320; // ~111km per degree latitude
      const lonDiff = radius / (111320 * Math.cos((lat * Math.PI) / 180));

      const { data: fallbackData, error: fallbackError } = await supabase
        .from("crags")
        .select("id, name, lat, lon, slug")
        .gte("lat", lat - latDiff)
        .lte("lat", lat + latDiff)
        .gte("lon", lon - lonDiff)
        .lte("lon", lon + lonDiff)
        .limit(10);

      if (fallbackError) {
        console.error("Error checking nearby crags:", fallbackError);
        return NextResponse.json({ nearbyCrags: [] }, { status: 200 });
      }

      return NextResponse.json({
        nearbyCrags: (fallbackData || []).map((crag) => ({
          id: crag.id,
          name: crag.name,
          slug: crag.slug,
          lat: crag.lat,
          lon: crag.lon,
        })),
      });
    }

    return NextResponse.json({
      nearbyCrags: (data || []).map((crag: any) => ({
        id: crag.id,
        name: crag.name,
        slug: crag.slug,
        lat: crag.lat,
        lon: crag.lon,
        distance: crag.distance_meters ? Math.round(crag.distance_meters) : null,
      })),
    });
  } catch (error) {
    console.error("Check nearby crags error:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "An unexpected error occurred",
      },
      { status: 500 }
    );
  }
}
