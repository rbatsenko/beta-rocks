import { NextRequest, NextResponse } from "next/server";
import { getSupabaseClient, isSupabaseConfigured } from "@/integrations/supabase/client";

const PAGE_SIZE = 20;

/**
 * GET /api/reports/feed
 * Cursor-based paginated feed of reports for the live feed page.
 *
 * Query params:
 * - cursor: ISO date string (created_at of last report seen). Omit for first page.
 *
 * Returns:
 * - reports: Array of reports with author, confirmations, crag, and parent_crag joins
 * - nextCursor: ISO date string for next page, or null if no more
 */
export async function GET(request: NextRequest) {
  try {
    if (!isSupabaseConfigured) {
      return NextResponse.json({ error: "Supabase client is not configured" }, { status: 500 });
    }

    const supabase = getSupabaseClient();
    const cursor = request.nextUrl.searchParams.get("cursor");

    let query = supabase
      .from("reports")
      .select(
        `
        *,
        author:user_profiles!reports_author_id_fkey(id, display_name),
        confirmations(count),
        crag:crags!reports_crag_id_fkey(id, name, country, state, municipality, village, lat, lon, slug, parent_crag_id)
      `
      )
      .or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`)
      .gte("observed_at", new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
      .order("created_at", { ascending: false })
      .limit(PAGE_SIZE);

    if (cursor) {
      query = query.lt("created_at", cursor);
    }

    const { data, error } = await query;

    if (error) {
      console.error("[FeedAPI] Error fetching reports:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const reports = data || [];

    // Fetch parent crags for sectors
    if (reports.length > 0) {
      const parentCragIds = [
        ...new Set(reports.map((r) => r.crag?.parent_crag_id).filter((id): id is string => !!id)),
      ];

      if (parentCragIds.length > 0) {
        const { data: parentCrags } = await supabase
          .from("crags")
          .select("id, name, slug")
          .in("id", parentCragIds);

        if (parentCrags) {
          reports.forEach((report) => {
            const crag = report.crag;
            if (crag?.parent_crag_id) {
              const parentCrag = parentCrags.find((pc) => pc.id === crag.parent_crag_id);
              if (parentCrag) {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                (crag as any).parent_crag = parentCrag;
              }
            }
          });
        }
      }
    }

    const nextCursor = reports.length === PAGE_SIZE ? reports[reports.length - 1].created_at : null;

    // Total count (only on first page to avoid extra queries on scroll)
    let totalCount: number | undefined;
    if (!cursor) {
      const { count } = await supabase
        .from("reports")
        .select("id", { count: "exact", head: true })
        .or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`)
        .gte("observed_at", new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());
      totalCount = count ?? undefined;
    }

    return NextResponse.json({ reports, nextCursor, ...(totalCount != null && { totalCount }) });
  } catch (error) {
    console.error("[FeedAPI] Failed to fetch feed:", error);
    return NextResponse.json({ error: "Failed to fetch feed" }, { status: 500 });
  }
}
