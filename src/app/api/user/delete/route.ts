import { NextRequest, NextResponse } from "next/server";
import { getSupabaseClient, isSupabaseConfigured } from "@/integrations/supabase/client";

/**
 * DELETE /api/user/delete
 * Permanently deletes a user profile and all associated data.
 *
 * Requires X-Sync-Key-Hash header for authentication.
 *
 * Deletes: user_profiles, user_stats (cascade), user_favorites,
 *          notifications (cascade), push_subscriptions (cascade)
 * Preserves: reports (community contributions, author_id set to NULL)
 */
export async function DELETE(request: NextRequest) {
  try {
    if (!isSupabaseConfigured) {
      return NextResponse.json(
        { error: "Database not configured" },
        { status: 500 }
      );
    }

    const syncKeyHash = request.headers.get("X-Sync-Key-Hash");
    if (!syncKeyHash) {
      return NextResponse.json(
        { error: "Missing X-Sync-Key-Hash header" },
        { status: 401 }
      );
    }

    const supabase = getSupabaseClient();

    // Find user profile
    const { data: dbProfile, error: fetchError } = await supabase
      .from("user_profiles")
      .select("id")
      .eq("sync_key_hash", syncKeyHash)
      .maybeSingle();

    if (fetchError) {
      console.error("[DELETE /api/user/delete] Fetch error:", fetchError);
      return NextResponse.json(
        { error: "Failed to find user profile" },
        { status: 500 }
      );
    }

    if (!dbProfile) {
      return NextResponse.json(
        { error: "User profile not found" },
        { status: 404 }
      );
    }

    // Delete favorites (explicit delete before profile for clean ordering)
    await supabase
      .from("user_favorites")
      .delete()
      .eq("user_profile_id", dbProfile.id);

    // Delete user profile — remaining related data (user_stats, notifications,
    // push_subscriptions) is removed via ON DELETE CASCADE in the database
    const { error: deleteError } = await supabase
      .from("user_profiles")
      .delete()
      .eq("id", dbProfile.id);

    if (deleteError) {
      console.error("[DELETE /api/user/delete] Delete error:", deleteError);
      return NextResponse.json(
        { error: "Failed to delete user profile" },
        { status: 500 }
      );
    }

    console.log(`[DELETE /api/user/delete] Profile ${dbProfile.id} deleted successfully`);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[DELETE /api/user/delete] Unexpected error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
