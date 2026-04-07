import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSupabaseClient, isSupabaseConfigured } from "@/integrations/supabase/client";

const ConvertSchema = z.object({
  action: z.enum(["make-sector", "make-crag", "change-parent", "rename"]),
  parentCragId: z.string().optional().nullable(),
  name: z.string().min(1).max(200).optional(),
});

/**
 * POST /api/crags/[id]/convert
 * Convert a crag to a sector or vice versa
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    if (!isSupabaseConfigured) {
      console.error("Supabase environment variables are not configured.");
      return NextResponse.json({ error: "Supabase client is not configured" }, { status: 500 });
    }

    const body = await request.json();
    const validationResult = ConvertSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: "Validation failed",
          details: validationResult.error.issues,
        },
        { status: 400 }
      );
    }

    const { action, parentCragId, name } = validationResult.data;
    const { id: cragId } = await params;
    const supabase = getSupabaseClient();

    // Validate parentCragId if action requires it
    if ((action === "make-sector" || action === "change-parent") && !parentCragId) {
      return NextResponse.json(
        { error: "Parent crag ID is required for this action" },
        { status: 400 }
      );
    }

    // Build the update payload
    const updatePayload: Record<string, unknown> = {};

    // Name change (can accompany any action)
    if (name) {
      updatePayload.name = name;
    }

    // Structural changes
    if (action === "make-crag") {
      updatePayload.parent_crag_id = null;
    } else if (action === "make-sector" || action === "change-parent") {
      updatePayload.parent_crag_id = parentCragId;
    }
    // action === "rename" only changes name, already handled above

    if (Object.keys(updatePayload).length === 0) {
      return NextResponse.json({ error: "No changes to apply" }, { status: 400 });
    }

    const { error } = await supabase
      .from("crags")
      .update(updatePayload)
      .eq("id", cragId);

    if (error) {
      console.error("Error updating crag:", error);
      return NextResponse.json({ error: "Failed to update crag" }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: "Crag updated successfully",
    });
  } catch (error) {
    console.error("Crag conversion error:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "An unexpected error occurred",
      },
      { status: 500 }
    );
  }
}
