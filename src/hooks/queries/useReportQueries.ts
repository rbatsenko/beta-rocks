import { useQuery } from "@tanstack/react-query";
import { Tables } from "@/integrations/supabase/types";

// Extended Report type with joins
export type ReportWithDetails = Tables<"reports"> & {
  author?: {
    id: string;
    display_name: string | null;
  } | null;
  confirmations?: { count: number }[] | null;
  crag?: {
    id: string;
    name: string;
    country: string | null;
    state: string | null;
    municipality: string | null;
    village: string | null;
    lat: number;
    lon: number;
    slug: string | null;
  } | null;
  sector?: {
    id: string;
    name: string;
    slug: string | null;
  } | null;
};

/**
 * Fetch a single report with all joins (author, confirmations, crag, sector)
 */
export function useReport(reportId: string | null) {
  return useQuery<ReportWithDetails>({
    queryKey: ["report", reportId],
    queryFn: async () => {
      if (!reportId) throw new Error("Report ID is required");

      const response = await fetch(`/api/reports/${reportId}`);

      if (!response.ok) {
        throw new Error(`Failed to fetch report: ${response.statusText}`);
      }

      return response.json();
    },
    enabled: !!reportId,
    staleTime: 1000 * 60, // 1 minute
    retry: 2,
  });
}
