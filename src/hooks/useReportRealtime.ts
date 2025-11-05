/**
 * useReportRealtime Hook
 *
 * Subscribes to realtime report updates from Supabase.
 * Shows toast notifications for new reports on favorited crags.
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { userProfile } = useUserProfile();
 *   const [favorites, setFavorites] = useState<Favorite[]>([]);
 *
 *   // Get favorite crag IDs
 *   const favoriteCragIds = favorites
 *     .map((f) => f.crag_id)
 *     .filter((id): id is string => id !== null);
 *
 *   // Subscribe to realtime reports
 *   const { isConnected } = useReportRealtime({
 *     onNewReport: (report) => {
 *       console.log("New report:", report);
 *       // Optionally refresh reports list
 *     },
 *     favoriteCragIds,
 *     enabled: !!userProfile,
 *   });
 *
 *   return (
 *     <div>
 *       {isConnected ? "Live updates active" : "Offline"}
 *     </div>
 *   );
 * }
 * ```
 */

import { useEffect, useState, useRef, useCallback } from "react";
import { getSupabaseClient } from "@/integrations/supabase/client";
import { Tables } from "@/integrations/supabase/types";
import { toast } from "@/hooks/use-toast";
import type { RealtimeChannel, RealtimePostgresInsertPayload } from "@supabase/supabase-js";

export type Report = Tables<"reports">;

interface UseReportRealtimeOptions {
  /**
   * Callback function called when a new report is received
   */
  onNewReport: (report: Report) => void;

  /**
   * List of favorite crag IDs to show toast notifications for
   */
  favoriteCragIds: string[];

  /**
   * Optional: Enable/disable the subscription
   * @default true
   */
  enabled?: boolean;
}

interface UseReportRealtimeReturn {
  /**
   * Whether the realtime connection is established
   */
  isConnected: boolean;
}

export function useReportRealtime({
  onNewReport,
  favoriteCragIds,
  enabled = true,
}: UseReportRealtimeOptions): UseReportRealtimeReturn {
  const [isConnected, setIsConnected] = useState(false);

  // Use refs to always have the latest values without recreating the subscription
  const onNewReportRef = useRef(onNewReport);
  const favoriteCragIdsRef = useRef(favoriteCragIds);

  // Keep refs up to date
  useEffect(() => {
    onNewReportRef.current = onNewReport;
  }, [onNewReport]);

  useEffect(() => {
    favoriteCragIdsRef.current = favoriteCragIds;
  }, [favoriteCragIds]);

  const handleNewReport = useCallback(
    async (payload: RealtimePostgresInsertPayload<Report>) => {
      const report = payload.new as Report;

      // Call the callback using ref to get latest version
      onNewReportRef.current(report);

      // Show toast notification if report is for a favorited crag
      if (report.crag_id && favoriteCragIdsRef.current.includes(report.crag_id)) {
        // Fetch crag name for the toast
        const supabase = getSupabaseClient();
        const { data: crag } = await supabase
          .from("crags")
          .select("name")
          .eq("id", report.crag_id)
          .single();

        const cragName = crag?.name || "Unknown crag";
        const preview = report.text
          ? report.text.length > 60
            ? `${report.text.slice(0, 60)}...`
            : report.text
          : "New report posted";

        toast({
          title: `New report from ${cragName}`,
          description: preview,
          duration: 5000,
        });
      }
    },
    [] // No dependencies - uses refs to access latest values
  );

  useEffect(() => {
    if (!enabled) {
      setIsConnected(false);
      return;
    }

    const supabase = getSupabaseClient();
    let channel: RealtimeChannel;

    // Subscribe to INSERT events on reports table
    channel = supabase
      .channel("reports-feed")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "reports",
        },
        handleNewReport
      )
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          setIsConnected(true);
          console.log("[useReportRealtime] Connected to realtime reports feed");
        } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
          setIsConnected(false);
          console.error("[useReportRealtime] Connection error:", status);
        } else if (status === "CLOSED") {
          setIsConnected(false);
          console.log("[useReportRealtime] Connection closed");
        }
      });

    // Cleanup subscription on unmount
    return () => {
      console.log("[useReportRealtime] Unsubscribing from realtime reports feed");
      setIsConnected(false);
      supabase.removeChannel(channel);
    };
  }, [enabled, handleNewReport]);

  return {
    isConnected,
  };
}
