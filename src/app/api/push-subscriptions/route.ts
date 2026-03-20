import { NextRequest, NextResponse } from "next/server";
import {
  getSupabaseClient,
  isSupabaseConfigured,
} from "@/integrations/supabase/client";

export async function POST(request: NextRequest) {
  try {
    if (!isSupabaseConfigured) {
      return NextResponse.json(
        { error: "Supabase not configured" },
        { status: 500 }
      );
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const supabase = getSupabaseClient() as any;
    const { syncKeyHash, token, platform, deviceName, locale } = await request.json();

    if (!syncKeyHash || !token || !platform) {
      return NextResponse.json(
        { error: "syncKeyHash, token, and platform required" },
        { status: 400 }
      );
    }

    // Look up user profile
    const { data: profile, error: profileError } = await supabase
      .from("user_profiles")
      .select("id")
      .eq("sync_key_hash", syncKeyHash)
      .single();

    if (profileError || !profile) {
      return NextResponse.json(
        { error: "User profile not found" },
        { status: 404 }
      );
    }

    // Update locale on user profile if provided
    if (locale) {
      await supabase
        .from("user_profiles")
        .update({ locale })
        .eq("id", profile.id);
    }

    // Upsert the push subscription (update if token already exists)
    const { error } = await supabase
      .from("push_subscriptions")
      .upsert(
        {
          user_profile_id: profile.id,
          platform,
          token,
          device_name: deviceName || null,
          is_active: true,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_profile_id,token" }
      );

    if (error) {
      console.error("Push subscription upsert error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true }, { status: 201 });
  } catch (error) {
    console.error("Push subscriptions POST error:", error);
    return NextResponse.json(
      { error: "Failed to register push subscription" },
      { status: 500 }
    );
  }
}
