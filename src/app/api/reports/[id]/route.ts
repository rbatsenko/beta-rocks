import { NextRequest, NextResponse } from "next/server";
import { updateReport, deleteReport } from "@/lib/db/queries";
import { fetchOrCreateUserProfile } from "@/lib/db/queries";

/**
 * PATCH /api/reports/[id]
 * Update an existing report (author only)
 *
 * Request body:
 * {
 *   userProfileId: string; // Required for ownership verification
 *   text?: string;
 *   category?: string;
 *   rating_dry?: number;
 *   rating_wind?: number;
 *   rating_crowds?: number;
 *   expires_at?: string | null;
 *   observed_at?: string;
 * }
 */
export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const reportId = params.id;
    const body = await request.json();
    const {
      userProfileId,
      text,
      category,
      rating_dry,
      rating_wind,
      rating_crowds,
      expires_at,
      observed_at,
      lost_found_type,
    } = body;

    // Verify user profile ID is provided
    if (!userProfileId) {
      return NextResponse.json({ error: "userProfileId is required" }, { status: 400 });
    }

    // Build updates object with only provided fields
    const updates: any = {};
    if (text !== undefined) updates.text = text;
    if (category !== undefined) updates.category = category;
    if (rating_dry !== undefined) updates.rating_dry = rating_dry;
    if (rating_wind !== undefined) updates.rating_wind = rating_wind;
    if (rating_crowds !== undefined) updates.rating_crowds = rating_crowds;
    if (expires_at !== undefined) updates.expires_at = expires_at;
    if (observed_at !== undefined) updates.observed_at = observed_at;
    if (lost_found_type !== undefined) updates.lost_found_type = lost_found_type;

    // Validate ratings if provided
    if (rating_dry && (rating_dry < 1 || rating_dry > 5)) {
      return NextResponse.json({ error: "rating_dry must be between 1-5" }, { status: 400 });
    }
    if (rating_wind && (rating_wind < 1 || rating_wind > 5)) {
      return NextResponse.json({ error: "rating_wind must be between 1-5" }, { status: 400 });
    }
    if (rating_crowds && (rating_crowds < 1 || rating_crowds > 5)) {
      return NextResponse.json({ error: "rating_crowds must be between 1-5" }, { status: 400 });
    }

    // Validate category if provided
    const validCategories = [
      "conditions",
      "safety",
      "access",
      "climbing_info",
      "facilities",
      "lost_found",
      "other",
    ];
    if (category && !validCategories.includes(category)) {
      return NextResponse.json(
        { error: `category must be one of: ${validCategories.join(", ")}` },
        { status: 400 }
      );
    }

    // Validate lost_found_type
    if (category === "lost_found") {
      if (lost_found_type !== undefined && !["lost", "found"].includes(lost_found_type)) {
        return NextResponse.json(
          { error: "lost_found_type must be 'lost' or 'found' when category is 'lost_found'" },
          { status: 400 }
        );
      }
    } else if (lost_found_type !== undefined) {
      return NextResponse.json(
        { error: "lost_found_type can only be set when category is 'lost_found'" },
        { status: 400 }
      );
    }

    // Validate expires_at is in the future if provided
    if (expires_at && new Date(expires_at) < new Date()) {
      return NextResponse.json({ error: "expires_at must be a future date" }, { status: 400 });
    }

    // Update the report (ownership verified inside the function)
    const updatedReport = await updateReport(reportId, userProfileId, updates);

    if (!updatedReport) {
      return NextResponse.json(
        { error: "Report not found or you are not the author" },
        { status: 404 }
      );
    }

    return NextResponse.json(updatedReport);
  } catch (error) {
    console.error("Reports PATCH error:", error);
    return NextResponse.json({ error: "Failed to update report" }, { status: 500 });
  }
}

/**
 * DELETE /api/reports/[id]?userProfileId=...
 * Delete a report (author only)
 * Confirmations are cascade-deleted automatically
 *
 * Query params:
 * - userProfileId: string (required for ownership verification)
 */
export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const reportId = params.id;
    const userProfileId = request.nextUrl.searchParams.get("userProfileId");

    // Verify user profile ID is provided
    if (!userProfileId) {
      return NextResponse.json(
        { error: "userProfileId query parameter is required" },
        { status: 400 }
      );
    }

    // Delete the report (ownership verified inside the function)
    const deleted = await deleteReport(reportId, userProfileId);

    if (!deleted) {
      return NextResponse.json(
        { error: "Report not found or you are not the author" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Reports DELETE error:", error);
    return NextResponse.json({ error: "Failed to delete report" }, { status: 500 });
  }
}
