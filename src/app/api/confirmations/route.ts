import { NextRequest, NextResponse } from "next/server";
import { createConfirmation, removeConfirmation, hasUserConfirmedReport } from "@/lib/db/queries";

/**
 * POST /api/confirmations
 * Add a thumbs up confirmation to a report
 *
 * Request body:
 * {
 *   reportId: string;
 *   userKeyHash: string;
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const { reportId, userKeyHash } = await request.json();

    if (!reportId || !userKeyHash) {
      return NextResponse.json({ error: "reportId and userKeyHash required" }, { status: 400 });
    }

    // Check if user already confirmed
    const alreadyConfirmed = await hasUserConfirmedReport(reportId, userKeyHash);
    if (alreadyConfirmed) {
      return NextResponse.json({ error: "User already confirmed this report" }, { status: 409 });
    }

    const confirmation = await createConfirmation(reportId, userKeyHash);

    return NextResponse.json(confirmation, { status: 201 });
  } catch (error) {
    console.error("Confirmations POST error:", error);
    return NextResponse.json({ error: "Failed to create confirmation" }, { status: 500 });
  }
}

/**
 * DELETE /api/confirmations?reportId=...&userKeyHash=...
 * Remove a confirmation (undo thumbs up)
 */
export async function DELETE(request: NextRequest) {
  try {
    const reportId = request.nextUrl.searchParams.get("reportId");
    const userKeyHash = request.nextUrl.searchParams.get("userKeyHash");

    if (!reportId || !userKeyHash) {
      return NextResponse.json({ error: "reportId and userKeyHash required" }, { status: 400 });
    }

    const confirmed = await hasUserConfirmedReport(reportId, userKeyHash);
    if (!confirmed) {
      return NextResponse.json({ error: "Confirmation not found" }, { status: 404 });
    }

    await removeConfirmation(reportId, userKeyHash);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Confirmations DELETE error:", error);
    return NextResponse.json({ error: "Failed to remove confirmation" }, { status: 500 });
  }
}
