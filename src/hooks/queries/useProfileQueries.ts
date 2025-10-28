/**
 * React Query hooks for user profile operations
 *
 * Provides mutations for deleting user profiles and associated data
 * Works with React Query cache for proper cleanup
 */

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { getUserProfile, hashSyncKeyAsync } from "@/lib/auth/sync-key";
import { supabase } from "@/integrations/supabase/client";

/**
 * Delete user profile and all associated data
 * Removes: user_profile, chat_sessions, chat_messages, user_favorites
 * Keeps: reports (community contributions)
 */
export function useDeleteProfile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      // Get user profile
      const localProfile = getUserProfile();
      if (!localProfile) {
        throw new Error("No user profile found");
      }

      const syncKeyHash = await hashSyncKeyAsync(localProfile.syncKey);

      // Get user from database
      const { data: dbProfile, error: fetchError } = await supabase
        .from("user_profiles")
        .select("id")
        .eq("sync_key_hash", syncKeyHash)
        .maybeSingle();

      if (fetchError && fetchError.code !== "PGRST116") {
        throw fetchError;
      }

      if (dbProfile) {
        // Delete all favorites
        const { error: favError } = await supabase
          .from("user_favorites")
          .delete()
          .eq("user_profile_id", dbProfile.id);

        if (favError) {
          console.error("Failed to delete favorites:", favError);
        }

        // Delete all sessions (messages cascade delete via foreign key)
        const { error: sessionsError } = await supabase
          .from("chat_sessions")
          .delete()
          .eq("user_profile_id", dbProfile.id);

        if (sessionsError) {
          console.error("Failed to delete sessions:", sessionsError);
        }

        // Delete user profile
        const { error: profileError } = await supabase
          .from("user_profiles")
          .delete()
          .eq("id", dbProfile.id);

        if (profileError) {
          throw profileError;
        }

        console.log("User profile and associated data deleted successfully");
      }

      // Clear all localStorage
      localStorage.clear();

      // Clear all React Query cache
      queryClient.clear();
    },
    onSuccess: () => {
      console.log("[useDeleteProfile] Profile deleted successfully");
    },
    onError: (error) => {
      console.error("[useDeleteProfile] Failed to delete profile:", error);
    },
  });
}
