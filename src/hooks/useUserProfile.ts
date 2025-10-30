import { useQuery } from "@tanstack/react-query";
import { getUserProfile, type UserProfile } from "@/lib/auth/sync-key";

/**
 * React Query hook for user profile.
 * Returns existing profile only - does not auto-create.
 * Loads once and caches globally - no more loading states on navigation!
 */
export function useUserProfile() {
  // Check if profile exists (don't create)
  const hasProfile = typeof window !== 'undefined' ? !!getUserProfile() : false;

  return useQuery({
    queryKey: ["userProfile"],
    queryFn: async (): Promise<UserProfile | null> => {
      // Get existing profile (don't initialize)
      const profile = getUserProfile();
      return profile;
    },
    staleTime: Infinity, // Never refetch automatically
    gcTime: Infinity, // Keep in cache forever
    retry: 1,
    enabled: hasProfile, // Only fetch if profile exists
  });
}
