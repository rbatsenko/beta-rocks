import { cookies } from "next/headers";
import { Metadata } from "next";
import { getSupabaseClient } from "@/integrations/supabase/client";
import { fetchOrCreateUserProfile, fetchFavoritesByUserProfile } from "@/lib/db/queries";
import FeedPageClient from "./FeedPageClient";

export const metadata: Metadata = {
  title: "Live Activity Feed - beta.rocks",
  description:
    "See realtime climbing reports from the community. Get live updates on conditions, safety alerts, access changes, and beta from climbers around the world.",
  openGraph: {
    title: "Live Activity Feed - beta.rocks",
    description:
      "See realtime climbing reports from the community. Get live updates on conditions, safety alerts, access changes, and beta from climbers around the world.",
  },
};

// Revalidate every 60 seconds for semi-static with fresh data
export const revalidate = 60;

export default async function FeedPage() {
  // Get user sync key from cookies
  const cookieStore = await cookies();
  const syncKeyHash = cookieStore.get("temps_sync_key_hash")?.value;
  const displayName = cookieStore.get("temps_display_name")?.value;

  // Fetch initial reports (last 50) with crag info
  let initialReports: any[] = [];
  try {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from("reports")
      .select(
        `
        *,
        author:user_profiles!reports_author_id_fkey(id, display_name),
        confirmations(count),
        crag:crags!reports_crag_id_fkey(id, name, country, state, municipality, village, lat, lon, slug, parent_crag_id, parent_crag:crags!parent_crag_id(id, name, slug))
      `
      )
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) {
      console.error("[FeedPage] Error fetching reports:", error);
    } else {
      initialReports = data || [];
    }
  } catch (error) {
    console.error("[FeedPage] Failed to fetch reports:", error);
  }

  // Fetch user's favorite crag IDs if logged in
  let favoriteCragIds: string[] = [];
  let currentUserProfileId: string | null = null;

  if (syncKeyHash) {
    try {
      const userProfile = await fetchOrCreateUserProfile(syncKeyHash);
      currentUserProfileId = userProfile.id;

      const favorites = await fetchFavoritesByUserProfile(userProfile.id);
      favoriteCragIds = favorites.map((f) => f.crag_id).filter((id): id is string => id !== null);
    } catch (error) {
      console.error("[FeedPage] Failed to fetch favorites:", error);
    }
  }

  return (
    <FeedPageClient
      initialReports={initialReports}
      favoriteCragIds={favoriteCragIds}
      currentUserProfileId={currentUserProfileId}
      initialDisplayName={displayName}
      syncKeyHash={syncKeyHash}
    />
  );
}
