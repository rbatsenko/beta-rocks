import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSupabaseClient, isSupabaseConfigured } from "@/integrations/supabase/client";

const ConvertSchema = z.object({
  action: z.enum(["make-sector", "make-crag", "change-parent"]),
  parentCragId: z.string().optional().nullable(),
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

    const { action, parentCragId } = validationResult.data;
    const { id: cragId } = await params;
    const supabase = getSupabaseClient();

    // Validate parentCragId if action requires it
    if ((action === "make-sector" || action === "change-parent") && !parentCragId) {
      return NextResponse.json(
        { error: "Parent crag ID is required for this action" },
        { status: 400 }
      );
    }

    // Perform the conversion
    if (action === "make-crag") {
      // Convert sector to crag by removing parent_crag_id
      const { error } = await supabase
        .from("crags")
        .update({ parent_crag_id: null })
        .eq("id", cragId);

      if (error) {
        console.error("Error converting to crag:", error);
        return NextResponse.json({ error: "Failed to convert to crag" }, { status: 500 });
      }
    } else {
      // Convert crag to sector or change parent
      const { error } = await supabase
        .from("crags")
        .update({ parent_crag_id: parentCragId })
        .eq("id", cragId);

      if (error) {
        console.error("Error converting to sector:", error);
        return NextResponse.json({ error: "Failed to convert to sector" }, { status: 500 });
      }
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
