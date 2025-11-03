/**
 * React Query hooks for managing user reports
 * Provides caching and optimistic updates for report operations
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getUserProfile, hashSyncKeyAsync } from "@/lib/auth/sync-key";
import { fetchOrCreateUserProfile, fetchReportsByAuthor, deleteReport } from "@/lib/db/queries";

export interface UserReport {
  id: string;
  category: string;
  text: string | null;
  rating_dry: number | null;
  rating_wind: number | null;
  rating_crowds: number | null;
  observed_at: string;
  expires_at: string | null;
  lost_found_type: string | null;
  author_id: string | null;
  created_at: string;
  crag: {
    id: string;
    name: string;
    lat: number;
    lon: number;
    country: string;
  } | null;
}

/**
 * Query key factory for reports
 */
const reportsKeys = {
  all: ["reports"] as const,
  byAuthor: (authorId: string) => ["reports", "author", authorId] as const,
};

/**
 * Get user profile ID from sync key
 */
async function getUserProfileId(): Promise<string | null> {
  try {
    const profile = getUserProfile();
    if (!profile) return null;

    const syncKeyHash = await hashSyncKeyAsync(profile.syncKey);
    const dbProfile = await fetchOrCreateUserProfile(syncKeyHash);
    return dbProfile.id;
  } catch (error) {
    console.error("[getUserProfileId] Error:", error);
    return null;
  }
}

/**
 * Fetch all reports for the current user
 * Automatically refetches on window focus
 */
export function useUserReports() {
  return useQuery({
    queryKey: reportsKeys.all,
    queryFn: async (): Promise<UserReport[]> => {
      const userId = await getUserProfileId();
      if (!userId) {
        console.warn("[useUserReports] No user profile found");
        return [];
      }

      const reports = await fetchReportsByAuthor(userId);
      return reports as UserReport[];
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: true,
    refetchOnMount: false,
  });
}

/**
 * Delete a report with optimistic update
 */
export function useDeleteReport() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (reportId: string): Promise<boolean> => {
      const userId = await getUserProfileId();
      if (!userId) {
        throw new Error("User profile required");
      }

      const deleted = await deleteReport(reportId, userId);
      if (!deleted) {
        throw new Error("Failed to delete report");
      }
      return deleted;
    },
    onMutate: async (reportId) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: reportsKeys.all });

      // Snapshot the previous value
      const previousReports = queryClient.getQueryData<UserReport[]>(reportsKeys.all);

      // Optimistically remove the report
      queryClient.setQueryData<UserReport[]>(reportsKeys.all, (old = []) =>
        old.filter((report) => report.id !== reportId)
      );

      return { previousReports };
    },
    onError: (error, _reportId, context) => {
      // Rollback to previous state
      if (context?.previousReports) {
        queryClient.setQueryData(reportsKeys.all, context.previousReports);
      }
      console.error("[useDeleteReport] Error:", error);
    },
    onSettled: () => {
      // Refetch to ensure consistency
      queryClient.invalidateQueries({ queryKey: reportsKeys.all });
    },
  });
}

/**
 * Invalidate reports cache after creating or updating a report
 * Call this after successful report submission/edit
 */
export function useInvalidateReports() {
  const queryClient = useQueryClient();

  return () => {
    queryClient.invalidateQueries({ queryKey: reportsKeys.all });
  };
}
