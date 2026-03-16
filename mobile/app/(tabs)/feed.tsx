/**
 * Feed screen - live community reports across all crags
 * Matches web's /feed page
 */

import { useState, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { useRouter } from "expo-router";
import { useFocusEffect } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { API_URL } from "@/constants/config";
import { CATEGORY_COLORS } from "@/constants/config";
import { Colors, Spacing, FontSize, BorderRadius } from "@/constants/theme";
import { useTheme } from "@/contexts/ThemeContext";

interface FeedReport {
  id: string;
  category: string;
  text: string | null;
  created_at: string;
  author?: { display_name: string | null } | null;
  confirmations?: { count: number }[];
  crag?: {
    id: string;
    name: string;
    slug: string | null;
    country: string | null;
    state: string | null;
    municipality: string | null;
    village: string | null;
    parent_crag?: { name: string; slug: string } | null;
  } | null;
}

export default function FeedScreen() {
  const { colorScheme } = useTheme();
  const isDark = colorScheme === "dark";
  const colors = isDark ? Colors.dark : Colors.light;
  const router = useRouter();

  const [reports, setReports] = useState<FeedReport[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  useFocusEffect(
    useCallback(() => {
      loadReports();
    }, [])
  );

  async function loadReports(cursor?: string) {
    try {
      const url = cursor
        ? `${API_URL}/api/reports/feed?cursor=${cursor}`
        : `${API_URL}/api/reports/feed`;
      const res = await fetch(url, {
        headers: { "X-Client-Platform": "mobile" },
      });
      const data = await res.json();

      if (cursor) {
        setReports((prev) => [...prev, ...(data.reports || [])]);
      } else {
        setReports(data.reports || []);
      }
      setNextCursor(data.nextCursor || null);
    } catch (err) {
      console.warn("[Feed] Failed to load:", err);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
      setIsLoadingMore(false);
    }
  }

  function onRefresh() {
    setRefreshing(true);
    loadReports();
  }

  function onEndReached() {
    if (nextCursor && !isLoadingMore) {
      setIsLoadingMore(true);
      loadReports(nextCursor);
    }
  }

  function handleCragPress(report: FeedReport) {
    const slug = report.crag?.slug;
    if (slug) {
      router.push(`/crag/${slug}`);
    }
  }

  function renderReport({ item }: { item: FeedReport }) {
    const catColors = CATEGORY_COLORS[item.category] || CATEGORY_COLORS.other;
    const cragName = item.crag?.parent_crag
      ? `${item.crag.name} \u00B7 ${item.crag.parent_crag.name}`
      : item.crag?.name || "Unknown crag";
    const location = [
      item.crag?.village,
      item.crag?.municipality,
      item.crag?.country,
    ]
      .filter(Boolean)
      .join(", ");
    const authorName = item.author?.display_name || "Anonymous";
    const confirmCount = item.confirmations?.[0]?.count ?? 0;

    return (
      <TouchableOpacity
        style={[styles.reportCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}
        onPress={() => handleCragPress(item)}
        activeOpacity={0.7}
      >
        {/* Header: category + time */}
        <View style={styles.reportHeader}>
          <View style={[styles.categoryBadge, { backgroundColor: catColors.bg }]}>
            <Text style={[styles.categoryText, { color: catColors.text }]}>
              {item.category}
            </Text>
          </View>
          <Text style={[styles.timeText, { color: colors.muted }]}>
            {formatRelativeTime(item.created_at)}
          </Text>
        </View>

        {/* Crag info */}
        <View style={styles.cragInfo}>
          <Ionicons name="location-outline" size={14} color={colors.primary} />
          <Text style={[styles.cragName, { color: colors.text }]} numberOfLines={1}>
            {cragName}
          </Text>
        </View>
        {location ? (
          <Text style={[styles.locationText, { color: colors.textSecondary }]} numberOfLines={1}>
            {location}
          </Text>
        ) : null}

        {/* Report text */}
        {item.text && (
          <Text style={[styles.reportText, { color: colors.text }]} numberOfLines={4}>
            {item.text}
          </Text>
        )}

        {/* Footer: author + confirmations */}
        <View style={styles.reportFooter}>
          <Text style={[styles.authorText, { color: colors.muted }]}>
            {authorName}
          </Text>
          {confirmCount > 0 && (
            <View style={styles.confirmRow}>
              <Ionicons name="thumbs-up" size={12} color={colors.muted} />
              <Text style={[styles.confirmText, { color: colors.muted }]}>
                {confirmCount}
              </Text>
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  }

  if (isLoading) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <FlatList
        data={reports}
        renderItem={renderReport}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        onEndReached={onEndReached}
        onEndReachedThreshold={0.3}
        ListFooterComponent={
          isLoadingMore ? (
            <ActivityIndicator
              style={styles.loadingMore}
              size="small"
              color={colors.primary}
            />
          ) : null
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="chatbubbles-outline" size={48} color={colors.muted} />
            <Text style={[styles.emptyTitle, { color: colors.text }]}>
              No reports yet
            </Text>
            <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
              Community reports will appear here
            </Text>
          </View>
        }
      />
    </View>
  );
}

function formatRelativeTime(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diffMs = now - then;
  const diffMin = Math.floor(diffMs / 60000);
  const diffHr = Math.floor(diffMs / 3600000);
  const diffDay = Math.floor(diffMs / 86400000);

  if (diffMin < 1) return "just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHr < 24) return `${diffHr}h ago`;
  if (diffDay < 7) return `${diffDay}d ago`;
  return new Date(dateStr).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  list: {
    padding: Spacing.sm,
    gap: Spacing.sm,
  },
  reportCard: {
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    gap: Spacing.xs + 2,
    marginBottom: Spacing.sm,
  },
  reportHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  categoryBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
    borderRadius: BorderRadius.sm,
  },
  categoryText: {
    fontSize: FontSize.xs,
    fontWeight: "600",
    textTransform: "capitalize",
  },
  timeText: {
    fontSize: FontSize.xs,
  },
  cragInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
  },
  cragName: {
    fontSize: FontSize.md,
    fontWeight: "600",
    flex: 1,
  },
  locationText: {
    fontSize: FontSize.xs,
    marginLeft: 18,
  },
  reportText: {
    fontSize: FontSize.sm,
    lineHeight: 20,
    marginTop: 2,
  },
  reportFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 2,
  },
  authorText: {
    fontSize: FontSize.xs,
  },
  confirmRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  confirmText: {
    fontSize: FontSize.xs,
  },
  loadingMore: {
    paddingVertical: Spacing.md,
  },
  emptyState: {
    paddingTop: Spacing.xxl * 2,
    alignItems: "center",
    gap: Spacing.md,
  },
  emptyTitle: {
    fontSize: FontSize.lg,
    fontWeight: "600",
  },
  emptySubtitle: {
    fontSize: FontSize.md,
  },
});
