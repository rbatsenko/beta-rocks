import { NextRequest, NextResponse } from "next/server";
import { getSupabaseClient, isSupabaseConfigured } from "@/integrations/supabase/client";

/**
 * GET /api/notifications
 * Fetch notifications for a user
 *
 * Query params:
 * - syncKeyHash: string (required)
 * - limit: number (default 50)
 * - offset: number (default 0)
 * - unreadOnly: boolean (default false)
 */
export async function GET(request: NextRequest) {
  try {
    if (!isSupabaseConfigured) {
      console.error("Supabase environment variables are not configured.");
      return NextResponse.json({ error: "Supabase client is not configured" }, { status: 500 });
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const supabase = getSupabaseClient() as any;
    const syncKeyHash = request.nextUrl.searchParams.get("syncKeyHash");
    const limit = parseInt(request.nextUrl.searchParams.get("limit") || "50");
    const offset = parseInt(request.nextUrl.searchParams.get("offset") || "0");
    const unreadOnly = request.nextUrl.searchParams.get("unreadOnly") === "true";

    if (!syncKeyHash) {
      return NextResponse.json({ error: "syncKeyHash is required" }, { status: 400 });
    }

    // Look up user profile by sync_key_hash
    const { data: profile, error: profileError } = await supabase
      .from("user_profiles")
      .select("id")
      .eq("sync_key_hash", syncKeyHash)
      .single();

    if (profileError || !profile) {
      return NextResponse.json({ error: "User profile not found" }, { status: 404 });
    }

    // Fetch notifications
    let query = supabase
      .from("notifications")
      .select("*", { count: "exact" })
      .eq("user_profile_id", profile.id)
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (unreadOnly) {
      query = query.eq("read", false);
    }

    const { data, error } = await query;

    if (error) {
      console.error("Supabase error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Get unread count
    const { count: unreadCount, error: countError } = await supabase
      .from("notifications")
      .select("*", { count: "exact", head: true })
      .eq("user_profile_id", profile.id)
      .eq("read", false);

    if (countError) {
      console.error("Supabase count error:", countError);
      return NextResponse.json({ error: countError.message }, { status: 500 });
    }

    return NextResponse.json({
      notifications: data || [],
      unreadCount: unreadCount || 0,
    });
  } catch (error) {
    console.error("Notifications GET error:", error);
    return NextResponse.json({ error: "Failed to fetch notifications" }, { status: 500 });
  }
}

/**
 * PATCH /api/notifications
 * Mark notifications as read
 *
 * Body:
 * - syncKeyHash: string (required)
 * - ids?: string[] (specific notification IDs to mark as read)
 * - markAllRead?: boolean (mark all notifications as read)
 */
export async function PATCH(request: NextRequest) {
  try {
    if (!isSupabaseConfigured) {
      console.error("Supabase environment variables are not configured.");
      return NextResponse.json({ error: "Supabase client is not configured" }, { status: 500 });
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const supabase = getSupabaseClient() as any;
    const body = await request.json();
    const { syncKeyHash, ids, markAllRead } = body;

    if (!syncKeyHash) {
      return NextResponse.json({ error: "syncKeyHash is required" }, { status: 400 });
    }

    // Look up user profile by sync_key_hash
    const { data: profile, error: profileError } = await supabase
      .from("user_profiles")
      .select("id")
      .eq("sync_key_hash", syncKeyHash)
      .single();

    if (profileError || !profile) {
      return NextResponse.json({ error: "User profile not found" }, { status: 404 });
    }

    let query = supabase
      .from("notifications")
      .update({ read: true })
      .eq("user_profile_id", profile.id);

    if (!markAllRead && ids && ids.length > 0) {
      query = query.in("id", ids);
    }

    const { error } = await query;

    if (error) {
      console.error("Supabase update error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Notifications PATCH error:", error);
    return NextResponse.json({ error: "Failed to update notifications" }, { status: 500 });
  }
}

/**
 * DELETE /api/notifications
 * Delete all notifications for a user
 *
 * Body:
 * - syncKeyHash: string (required)
 */
export async function DELETE(request: NextRequest) {
  try {
    if (!isSupabaseConfigured) {
      console.error("Supabase environment variables are not configured.");
      return NextResponse.json({ error: "Supabase client is not configured" }, { status: 500 });
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const supabase = getSupabaseClient() as any;
    const body = await request.json();
    const { syncKeyHash } = body;

    if (!syncKeyHash) {
      return NextResponse.json({ error: "syncKeyHash is required" }, { status: 400 });
    }

    // Look up user profile by sync_key_hash
    const { data: profile, error: profileError } = await supabase
      .from("user_profiles")
      .select("id")
      .eq("sync_key_hash", syncKeyHash)
      .single();

    if (profileError || !profile) {
      return NextResponse.json({ error: "User profile not found" }, { status: 404 });
    }

    const { error } = await supabase
      .from("notifications")
      .delete()
      .eq("user_profile_id", profile.id);

    if (error) {
      console.error("Supabase delete error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Notifications DELETE error:", error);
    return NextResponse.json({ error: "Failed to delete notifications" }, { status: 500 });
  }
}
