import { NextRequest, NextResponse } from "next/server";
import { getSupabaseClient, isSupabaseConfigured } from "@/integrations/supabase/client";

/**
 * DELETE /api/user/delete
 * Permanently deletes a user profile and all associated data.
 *
 * Requires X-Sync-Key-Hash header for authentication.
 *
 * Deletes: user_profiles, user_stats (cascade), user_favorites,
 *          chat_sessions, chat_messages (cascade), notifications (cascade),
 *          push_subscriptions (cascade)
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

    // Delete favorites
    await supabase
      .from("user_favorites")
      .delete()
      .eq("user_profile_id", dbProfile.id);

    // Delete notifications
    await supabase
      .from("notifications")
      .delete()
      .eq("user_profile_id", dbProfile.id);

    // Delete push subscriptions
    await supabase
      .from("push_subscriptions")
      .delete()
      .eq("user_profile_id", dbProfile.id);

    // Delete chat sessions (messages cascade via foreign key)
    await supabase
      .from("chat_sessions")
      .delete()
      .eq("user_profile_id", dbProfile.id);

    // Delete user profile (user_stats cascades via foreign key)
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
