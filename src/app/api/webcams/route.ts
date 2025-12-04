import { NextRequest, NextResponse } from "next/server";
import { getNearbyWebcams, calculateDistance } from "@/lib/external-apis/windy-webcams";

/**
 * GET /api/webcams
 * Returns nearby webcams for a given location
 *
 * Query params:
 * - lat: number (latitude)
 * - lon: number (longitude)
 * - radius: number (optional, search radius in km, default 50, max 250)
 * - limit: number (optional, max results, default 6, max 50)
 */
export async function GET(request: NextRequest) {
  try {
    const lat = request.nextUrl.searchParams.get("lat");
    const lon = request.nextUrl.searchParams.get("lon");
    const radius = parseInt(request.nextUrl.searchParams.get("radius") || "50", 10);
    const limit = parseInt(request.nextUrl.searchParams.get("limit") || "6", 10);

    console.log("[Webcams API] Received request:", {
      lat,
      lon,
      radius,
      limit,
      url: request.nextUrl.toString(),
    });

    // Validate required parameters
    if (!lat || !lon) {
      console.error("[Webcams API] Missing parameters:", { lat, lon });
      return NextResponse.json({ error: "Missing required parameters: lat, lon" }, { status: 400 });
    }

    const latitude = parseFloat(lat);
    const longitude = parseFloat(lon);

    if (isNaN(latitude) || isNaN(longitude)) {
      console.error("[Webcams API] Invalid coordinates:", { lat, lon, latitude, longitude });
      return NextResponse.json({ error: "Invalid coordinates" }, { status: 400 });
    }

    // Fetch webcams from Windy API
    const { total, webcams } = await getNearbyWebcams(latitude, longitude, radius, limit);

    // Add distance from crag to each webcam and sort by distance
    const webcamsWithDistance = webcams
      .filter((webcam) => webcam.status === "active")
      .map((webcam) => ({
        ...webcam,
        distanceKm: calculateDistance(
          latitude,
          longitude,
          webcam.location.latitude,
          webcam.location.longitude
        ),
      }))
      .sort((a, b) => a.distanceKm - b.distanceKm);

    console.log("[Webcams API] Successfully fetched webcams:", {
      latitude,
      longitude,
      total,
      active: webcamsWithDistance.length,
    });

    return NextResponse.json({
      location: { lat: latitude, lon: longitude },
      total,
      webcams: webcamsWithDistance,
      updatedAt: new Date().toISOString(),
    });
  } catch (error) {
    const errorDetails = {
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      timestamp: new Date().toISOString(),
    };

    console.error("Webcams API error:", errorDetails);

    return NextResponse.json(
      {
        error: "Failed to fetch webcams",
        details: error instanceof Error ? error.message : "Unknown error",
        debug: process.env.NODE_ENV === "development" ? errorDetails : undefined,
      },
      { status: 500 }
    );
  }
}
