"use client";

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { ReportTimeline } from "@/components/feed/ReportTimeline";
import { useReportRealtime } from "@/hooks/useReportRealtime";
import { Tables } from "@/integrations/supabase/types";
import { Loader2 } from "lucide-react";
import { ReportWithDetails } from "@/hooks/queries/useReportQueries";

interface FeedPageClientProps {
  initialReports: ReportWithDetails[];
  favoriteCragIds: string[];
  currentUserProfileId: string | null;
  initialDisplayName?: string; // Reserved for future use
  syncKeyHash?: string; // Reserved for future use
}

/**
 * FeedPageClient
 *
 * Client component that wraps ReportTimeline and integrates realtime subscriptions.
 * Handles live updates via useReportRealtime hook and manages connection state.
 */
export default function FeedPageClient({
  initialReports,
  favoriteCragIds,
  currentUserProfileId,
}: FeedPageClientProps) {
  const [reports, setReports] = useState<ReportWithDetails[]>(initialReports);
  const [isInitializing, setIsInitializing] = useState(true);
  const queryClient = useQueryClient();

  // Handle new report from realtime subscription
  const handleNewReport = async (newReport: Tables<"reports">) => {
    // Check for duplicates first
    const isDuplicate = reports.some((r) => r.id === newReport.id);
    if (isDuplicate) {
      return;
    }

    try {
      // Fetch complete report with all joins using React Query
      // This provides automatic retries, caching, and error handling
      const data = await queryClient.fetchQuery<ReportWithDetails>({
        queryKey: ["report", newReport.id],
        queryFn: async () => {
          const response = await fetch(`/api/reports/${newReport.id}`);

          if (!response.ok) {
            throw new Error(`Failed to fetch report: ${response.statusText}`);
          }

          return response.json();
        },
        staleTime: 1000 * 60, // 1 minute
        retry: 2,
      });

      // Add fully-populated report to timeline
      setReports((prev) => {
        // Double-check for duplicates
        if (prev.some((r) => r.id === data.id)) {
          return prev;
        }
        // Add to top, maintain max 100 reports
        return [data, ...prev].slice(0, 100);
      });
    } catch (err) {
      console.error("[FeedPageClient] Failed to fetch complete report:", err);
      // React Query will handle retries automatically
    }
  };

  // Subscribe to realtime reports
  const { isConnected } = useReportRealtime({
    onNewReport: handleNewReport,
    favoriteCragIds,
    enabled: true, // Always enabled for feed page
  });

  // Mark as initialized after first render
  useState(() => {
    // Use setTimeout to avoid hydration mismatch
    const timer = setTimeout(() => setIsInitializing(false), 100);
    return () => clearTimeout(timer);
  });

  // Show loading state during initial connection (first 2 seconds)
  if (isInitializing) {
    return (
      <main className="min-h-screen bg-background">
        <div className="container max-w-4xl mx-auto py-8 px-4">
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            <span className="ml-3 text-muted-foreground">Loading feed...</span>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-background">
      <div className="container max-w-4xl mx-auto py-8 px-4">
        <ReportTimeline
          initialReports={reports}
          favoriteCragIds={favoriteCragIds}
          onNewReport={handleNewReport}
          currentUserProfileId={currentUserProfileId}
        />

        {/* Connection Status Indicator (subtle, bottom-right) */}
        {!isConnected && (
          <div className="fixed bottom-4 right-4 bg-yellow-500/10 text-yellow-700 dark:text-yellow-300 border border-yellow-200 dark:border-yellow-800 rounded-lg px-4 py-2 text-sm">
            Reconnecting to live updates...
          </div>
        )}
      </div>
    </main>
  );
}
