import { useQuery } from "@tanstack/react-query";
import { initializeUserProfile } from "@/lib/auth/sync-key";

/**
 * React Query hook for user profile.
 * Loads once and caches globally - no more loading states on navigation!
 */
export function useUserProfile() {
  return useQuery({
    queryKey: ["userProfile"],
    queryFn: async () => {
      const profile = await initializeUserProfile();
      return profile;
    },
    staleTime: Infinity, // Never refetch automatically
    gcTime: Infinity, // Keep in cache forever
    retry: 1,
  });
}
