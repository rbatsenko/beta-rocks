import { NextRequest, NextResponse } from "next/server";
import { getSupabaseClient, isSupabaseConfigured } from "@/integrations/supabase/client";
import { hashSyncKey } from "@/lib/auth/sync-key";

const VALID_CATEGORIES = ["conditions", "safety", "access", "climbing_info", "facilities", "lost_found", "other"];

/**
 * POST /api/v1/reports
 * Submit a new community report.
 */
export async function POST(request: NextRequest) {
  try {
    if (!isSupabaseConfigured) {
      return NextResponse.json({ error: "Service unavailable" }, { status: 500 });
    }

    const body = await request.json();
    const { crag_id, category, message, rating, sync_key, source } = body;

    // Validate required fields
    if (!crag_id) {
      return NextResponse.json({ error: "crag_id is required" }, { status: 400 });
    }

    if (!category || !VALID_CATEGORIES.includes(category)) {
      return NextResponse.json(
        { error: `category must be one of: ${VALID_CATEGORIES.join(", ")}` },
        { status: 400 }
      );
    }

    if (!message || typeof message !== "string" || message.trim().length === 0) {
      return NextResponse.json({ error: "message is required and cannot be empty" }, { status: 400 });
    }

    if (message.length > 2000) {
      return NextResponse.json({ error: "message must be 2000 characters or less" }, { status: 400 });
    }

    if (rating !== undefined && rating !== null) {
      if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
        return NextResponse.json({ error: "rating must be an integer between 1 and 5" }, { status: 400 });
      }
    }

    if (!sync_key || typeof sync_key !== "string") {
      return NextResponse.json({ error: "sync_key is required for attribution" }, { status: 400 });
    }

    const supabase = getSupabaseClient();

    // Verify the crag exists and is not secret
    const { data: crag, error: cragError } = await supabase
      .from("crags")
      .select("id")
      .eq("id", crag_id)
      .eq("is_secret", false)
      .single();

    if (cragError || !crag) {
      return NextResponse.json({ error: "Crag not found" }, { status: 404 });
    }

    // Resolve sync key to user profile
    const syncKeyHash = hashSyncKey(sync_key);
    const { data: profiles, error: profileError } = await supabase.rpc("get_user_profile_by_hash", {
      p_sync_key_hash: syncKeyHash,
    });

    if (profileError || !profiles || profiles.length === 0) {
      return NextResponse.json({ error: "Invalid sync_key" }, { status: 401 });
    }

    const userProfile = profiles[0];

    // Insert the report
    const { data: report, error: insertError } = await supabase
      .from("reports")
      .insert({
        crag_id,
        author_id: userProfile.id,
        category,
        text: message.trim(),
        rating_dry: rating || null,
        source: source || null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select("*, user_profiles(display_name)")
      .single();

    if (insertError) {
      console.error("[v1/reports] Insert error:", insertError);
      return NextResponse.json({ error: "Failed to create report" }, { status: 500 });
    }

    return NextResponse.json(
      {
        data: {
          id: report.id,
          category: report.category,
          message: report.text || null,
          rating: report.rating_dry || null,
          photo_url: report.photo_url || null,
          created_at: report.created_at,
          display_name: (report as any).user_profiles?.display_name || "Anonymous",
          confirmations_count: 0,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("[v1/reports] Unexpected error:", error);
    return NextResponse.json({ error: "Failed to create report" }, { status: 500 });
  }
}
