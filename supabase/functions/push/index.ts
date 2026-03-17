import { createClient } from "npm:@supabase/supabase-js@2";

interface NotificationRecord {
  id: string;
  user_profile_id: string;
  type: string;
  title: string;
  body: string;
  data: {
    cragId: string;
    cragSlug: string;
    cragName: string;
    reportId: string;
    category: string;
  };
}

interface WebhookPayload {
  type: "INSERT" | "UPDATE" | "DELETE";
  table: string;
  record: NotificationRecord;
  schema: "public";
  old_record: null | NotificationRecord;
}

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

Deno.serve(async (req) => {
  try {
    const payload: WebhookPayload = await req.json();

    if (payload.type !== "INSERT") {
      return new Response(
        JSON.stringify({ message: "Not an INSERT event" }),
        { headers: { "Content-Type": "application/json" } }
      );
    }

    // Get all active push tokens for this user
    const { data: subscriptions } = await supabase
      .from("push_subscriptions")
      .select("token, platform")
      .eq("user_profile_id", payload.record.user_profile_id)
      .eq("is_active", true);

    if (!subscriptions || subscriptions.length === 0) {
      return new Response(
        JSON.stringify({ message: "No push subscriptions found" }),
        { headers: { "Content-Type": "application/json" } }
      );
    }

    // Send to all Expo push tokens
    const expoPushTokens = subscriptions
      .filter((s) => s.platform === "ios" || s.platform === "android")
      .map((s) => s.token)
      .filter(Boolean);

    if (expoPushTokens.length === 0) {
      return new Response(
        JSON.stringify({ message: "No Expo push tokens" }),
        { headers: { "Content-Type": "application/json" } }
      );
    }

    // Batch send to Expo Push API
    const messages = expoPushTokens.map((token) => ({
      to: token,
      sound: "default",
      title: payload.record.title,
      body: payload.record.body,
      data: payload.record.data,
    }));

    const res = await fetch("https://exp.host/--/api/v2/push/send", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${Deno.env.get("EXPO_ACCESS_TOKEN")}`,
      },
      body: JSON.stringify(messages),
    });

    const result = await res.json();

    // Handle invalid tokens - mark as inactive
    if (Array.isArray(result.data)) {
      for (let i = 0; i < result.data.length; i++) {
        if (
          result.data[i].status === "error" &&
          result.data[i].details?.error === "DeviceNotRegistered"
        ) {
          await supabase
            .from("push_subscriptions")
            .update({ is_active: false })
            .eq("token", expoPushTokens[i]);
        }
      }
    }

    return new Response(JSON.stringify(result), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
});
