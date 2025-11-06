import { NextRequest, NextResponse } from "next/server";
import { reverseGeocode, formatAddressForCrag } from "@/lib/external-apis/nominatim";

/**
 * GET /api/geocode/reverse
 * Reverse geocode coordinates to address information
 *
 * Query params:
 * - lat: Latitude (required)
 * - lon: Longitude (required)
 * - zoom: Zoom level 0-18 (optional, default 18)
 * - lang: Language code (optional, default "en")
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const lat = searchParams.get("lat");
    const lon = searchParams.get("lon");
    const zoom = searchParams.get("zoom");
    const lang = searchParams.get("lang");

    // Validate required parameters
    if (!lat || !lon) {
      return NextResponse.json({ error: "Missing required parameters: lat, lon" }, { status: 400 });
    }

    const latNum = parseFloat(lat);
    const lonNum = parseFloat(lon);

    // Validate coordinate ranges
    if (
      isNaN(latNum) ||
      isNaN(lonNum) ||
      latNum < -90 ||
      latNum > 90 ||
      lonNum < -180 ||
      lonNum > 180
    ) {
      return NextResponse.json(
        { error: "Invalid coordinates. Lat must be -90 to 90, lon -180 to 180" },
        { status: 400 }
      );
    }

    // Parse optional zoom parameter
    let zoomNum = 18; // Default to building level
    if (zoom) {
      zoomNum = parseInt(zoom, 10);
      if (isNaN(zoomNum) || zoomNum < 0 || zoomNum > 18) {
        return NextResponse.json({ error: "Zoom must be between 0 and 18" }, { status: 400 });
      }
    }

    // Call Nominatim API
    const result = await reverseGeocode({
      lat: latNum,
      lon: lonNum,
      zoom: zoomNum,
      acceptLanguage: lang || "en",
    });

    // Format for crag form auto-fill
    const formatted = formatAddressForCrag(result);

    return NextResponse.json({
      success: true,
      data: {
        raw: result,
        formatted,
      },
    });
  } catch (error) {
    console.error("Reverse geocoding API error:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to reverse geocode coordinates",
      },
      { status: 500 }
    );
  }
}
