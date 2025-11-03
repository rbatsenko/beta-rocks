/**
 * Crag Management API
 * Handles creating new crags from user submissions (OSM-based or manual)
 */

import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { v4 as uuidv4 } from "uuid";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error("Missing Supabase environment variables");
}

const supabase = createClient(supabaseUrl, supabaseKey);

/**
 * Calculate distance between two coordinates using Haversine formula
 */
function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000; // Earth's radius in meters
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c; // Distance in meters
}

/**
 * Check for duplicate crags near the given coordinates
 */
async function findNearbyDuplicates(
  lat: number,
  lon: number,
  radiusMeters: number = 100
): Promise<Array<{ id: string; name: string; distance: number }>> {
  const radiusDegrees = radiusMeters / 111000; // Approximate conversion

  const { data, error } = await supabase
    .from("crags")
    .select("id, name, lat, lon")
    .gte("lat", lat - radiusDegrees)
    .lte("lat", lat + radiusDegrees)
    .gte("lon", lon - radiusDegrees)
    .lte("lon", lon + radiusDegrees);

  if (error) {
    console.error("[findNearbyDuplicates] Query error:", error);
    throw error;
  }

  if (!data || data.length === 0) {
    return [];
  }

  // Calculate actual distances and filter
  const duplicates = data
    .map((crag) => ({
      id: crag.id,
      name: crag.name,
      distance: haversineDistance(lat, lon, Number(crag.lat), Number(crag.lon)),
    }))
    .filter((crag) => crag.distance <= radiusMeters)
    .sort((a, b) => a.distance - b.distance);

  return duplicates;
}

/**
 * POST /api/crags
 * Create a new crag with duplicate checking
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();

    // Validate required fields
    const { name, lat, lon, country, state, municipality, village, rockType, climbingTypes, osmId, osmType } = body;

    if (!name || !lat || !lon) {
      return NextResponse.json(
        { error: "Missing required fields: name, lat, lon" },
        { status: 400 }
      );
    }

    console.log("[POST /api/crags] Creating crag:", { name, lat, lon, country });

    // Check for duplicates within 100m
    const duplicates = await findNearbyDuplicates(lat, lon, 100);

    if (duplicates.length > 0) {
      console.log("[POST /api/crags] Found nearby duplicates:", duplicates);
      return NextResponse.json(
        {
          error: "duplicate",
          message: `A crag already exists near this location: ${duplicates[0].name} (${duplicates[0].distance.toFixed(0)}m away)`,
          duplicates: duplicates.map((d) => ({
            id: d.id,
            name: d.name,
            distance: Math.round(d.distance),
          })),
        },
        { status: 409 }
      );
    }

    // Generate unique ID
    const id = osmId && osmType ? `osm_${osmType}_${osmId}` : uuidv4();

    // Create crag
    const { data, error } = await supabase
      .from("crags")
      .insert({
        id,
        name,
        lat,
        lon,
        country: country || null,
        state: state || null,
        municipality: municipality || null,
        village: village || null,
        rock_type: rockType || null,
        climbing_types: climbingTypes && climbingTypes.length > 0 ? climbingTypes : null,
        osm_id: osmId || null,
        osm_type: osmType || null,
        source: osmId ? "osm" : "user_created",
        slug: "", // Empty string triggers auto-generation by database trigger
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        last_synced_at: osmId ? new Date().toISOString() : null,
      })
      .select()
      .single();

    if (error) {
      console.error("[POST /api/crags] Database error:", error);
      return NextResponse.json({ error: "Failed to create crag", details: error.message }, { status: 500 });
    }

    console.log("[POST /api/crags] Successfully created crag:", data.id);

    return NextResponse.json({
      success: true,
      crag: {
        id: data.id,
        name: data.name,
        slug: data.slug,
        lat: data.lat,
        lon: data.lon,
        rockType: data.rock_type,
        country: data.country,
      },
    });
  } catch (error) {
    console.error("[POST /api/crags] Unexpected error:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
