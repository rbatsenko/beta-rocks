"use client";

import { useState } from "react";
import { ReportTimeline } from "@/components/feed/ReportTimeline";
import { useReportRealtime } from "@/hooks/useReportRealtime";
import { Tables } from "@/integrations/supabase/types";
import { Loader2 } from "lucide-react";

// Extended Report type to match ReportTimeline expectations
type ReportWithDetails = Tables<"reports"> & {
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

  // Handle new report from realtime subscription
  const handleNewReport = (newReport: Tables<"reports">) => {
    // Transform the raw report to match ReportWithDetails structure
    // Note: The realtime subscription only gives us the raw report data
    // We'll need to fetch additional details (author, confirmations, crag, sector) in a follow-up
    const reportWithDetails: ReportWithDetails = {
      ...newReport,
      author: null, // Will be populated by ReportCard's internal fetch if needed
      confirmations: null,
      crag: null,
      sector: null,
    };

    setReports((prev) => {
      // Avoid duplicates
      if (prev.some((r) => r.id === newReport.id)) {
        return prev;
      }
      // Add to top, maintain max 100 reports
      return [reportWithDetails, ...prev].slice(0, 100);
    });
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
