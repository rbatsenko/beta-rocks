/**
 * Feed screen - live community reports across all crags
 * Matches web's /feed page with All/Favorites filter toggle
 */

import { useState, useMemo } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  Image,
  ScrollView,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useFeedQuery } from "@/hooks/queries";
import { getFavorites } from "@/lib/storage";
import { SUPABASE_URL, CATEGORY_COLORS } from "@/constants/config";
import { Colors, Spacing, FontSize, BorderRadius } from "@/constants/theme";
import { useTheme } from "@/contexts/ThemeContext";
import { useTranslation } from "react-i18next";

const PHOTO_BASE_URL = SUPABASE_URL ? `${SUPABASE_URL}/storage/v1/object/public/report-photos/` : "";

function getCountryFlag(code: string | null | undefined): string {
  if (!code || code.length !== 2) return "";
  const upper = code.toUpperCase();
  const OFFSET = 0x1f1e6 - 0x41;
  return String.fromCodePoint(upper.charCodeAt(0) + OFFSET, upper.charCodeAt(1) + OFFSET);
}

interface FeedReport {
  id: string;
  crag_id?: string;
  category: string;
  text: string | null;
  photos?: string[];
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

type FilterMode = "all" | "favorites";

export default function FeedScreen() {
  const { colorScheme } = useTheme();
  const isDark = colorScheme === "dark";
  const colors = isDark ? Colors.dark : Colors.light;
  const router = useRouter();
  const { t } = useTranslation("common");
  const [filterMode, setFilterMode] = useState<FilterMode>("all");

  const {
    data,
    isLoading,
    isFetchingNextPage,
    isRefetching,
    hasNextPage,
    fetchNextPage,
    refetch,
  } = useFeedQuery();

  const allReports = useMemo(
    () => (data?.pages.flatMap((p) => p.reports) as unknown as FeedReport[]) ?? [],
    [data]
  );

  const totalCount = data?.pages[0]?.totalCount;

  // Get favorite crag IDs for filtering
  const favoriteCragIds = useMemo(() => {
    const favs = getFavorites() as Array<{ cragId?: string; areaId?: string }>;
    return favs.map(f => f.cragId || f.areaId).filter(Boolean) as string[];
  }, []);

  const reports = useMemo(() => {
    if (filterMode === "favorites") {
      return allReports.filter(r => {
        const cragId = r.crag_id || r.crag?.id;
        return cragId && favoriteCragIds.includes(cragId);
      });
    }
    return allReports;
  }, [allReports, filterMode, favoriteCragIds]);

  const favoritesCount = useMemo(() => {
    return allReports.filter(r => {
      const cragId = r.crag_id || r.crag?.id;
      return cragId && favoriteCragIds.includes(cragId);
    }).length;
  }, [allReports, favoriteCragIds]);

  function onRefresh() {
    refetch();
  }

  function onEndReached() {
    if (hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
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
    const flag = getCountryFlag(item.crag?.country);
    const cragName = item.crag?.parent_crag
      ? `${flag ? flag + " " : ""}${item.crag.name} \u00B7 ${item.crag.parent_crag.name}`
      : `${flag ? flag + " " : ""}${item.crag?.name || "Unknown crag"}`;
    const location = [
      item.crag?.village,
      item.crag?.municipality,
      item.crag?.country,
    ]
      .filter(Boolean)
      .join(", ");
    const authorName = item.author?.display_name || t("profile.anonymous");
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
              {t(`reports.categories.${item.category}`, item.category)}
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

        {/* Photos */}
        {item.photos && item.photos.length > 0 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {item.photos.map((p, i) => (
              <Image key={i} source={{ uri: `${PHOTO_BASE_URL}${p}` }} style={styles.feedPhoto} resizeMode="cover" />
            ))}
          </ScrollView>
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
      {/* Filter toggle */}
      <View style={[styles.filterRow, { borderBottomColor: colors.border }]}>
        {(["all", "favorites"] as const).map(mode => {
          const isActive = filterMode === mode;
          const count = mode === "all" ? allReports.length : favoritesCount;
          return (
            <TouchableOpacity
              key={mode}
              style={[
                styles.filterTab,
                isActive && { borderBottomColor: colors.primary, borderBottomWidth: 2 },
              ]}
              onPress={() => setFilterMode(mode)}
              activeOpacity={0.7}
            >
              <Text style={[styles.filterText, { color: isActive ? colors.primary : colors.muted }]}>
                {t(`feed.filters.${mode}`, mode === "all" ? "All" : "Favorites")}
              </Text>
              <View style={[styles.countBadge, { backgroundColor: isActive ? `${colors.primary}20` : colors.surface }]}>
                <Text style={[styles.countText, { color: isActive ? colors.primary : colors.muted }]}>
                  {count}
                </Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </View>

      <FlatList
        data={reports}
        renderItem={renderReport}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={onRefresh} />
        }
        onEndReached={onEndReached}
        onEndReachedThreshold={0.3}
        ListFooterComponent={
          <>
            {isFetchingNextPage && (
              <ActivityIndicator
                style={styles.loadingMore}
                size="small"
                color={colors.primary}
              />
            )}
            {totalCount != null && reports.length > 0 && (
              <View style={styles.footerInfo}>
                <Text style={[styles.footerText, { color: colors.muted }]}>
                  {t("feed.showingOf", { showing: reports.length, total: totalCount })}
                </Text>
                {totalCount > reports.length && !hasNextPage && (
                  <Text style={[styles.footerHint, { color: colors.muted }]}>
                    {t("feed.olderHidden", "Older reports are still visible on individual crag pages")}
                  </Text>
                )}
              </View>
            )}
          </>
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="chatbubbles-outline" size={48} color={colors.muted} />
            <Text style={[styles.emptyTitle, { color: colors.text }]}>
              {filterMode === "favorites"
                ? t("feed.emptyState.noFavoritesTitle", "No reports from favorite crags")
                : t("feed.emptyState.noReportsTitle", "No reports yet")}
            </Text>
            <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
              {filterMode === "favorites"
                ? t("feed.emptyState.noFavoritesDescription", "Bookmark crags to see their reports here")
                : t("feed.emptyState.noReportsDescription", "Community reports will appear here")}
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
  filterRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    paddingHorizontal: Spacing.md,
  },
  filterTab: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
    paddingVertical: Spacing.sm + 2,
    paddingHorizontal: Spacing.sm,
    marginRight: Spacing.md,
    borderBottomWidth: 2,
    borderBottomColor: "transparent",
  },
  filterText: {
    fontSize: FontSize.sm,
    fontWeight: "600",
  },
  countBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
    minWidth: 22,
    alignItems: "center",
  },
  countText: {
    fontSize: 11,
    fontWeight: "600",
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
  footerInfo: {
    alignItems: "center",
    paddingVertical: Spacing.md,
    gap: 4,
  },
  footerText: {
    fontSize: FontSize.xs,
  },
  footerHint: {
    fontSize: FontSize.xs,
    opacity: 0.6,
    textAlign: "center",
    paddingHorizontal: Spacing.lg,
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
    textAlign: "center",
    paddingHorizontal: Spacing.lg,
  },
  feedPhoto: {
    width: 200,
    height: 150,
    borderRadius: BorderRadius.md,
    marginRight: Spacing.sm,
  },
});
