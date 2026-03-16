/**
 * Favorites screen - bookmarked crags in a 2-column grid
 */

import { useState, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
} from "react-native";
import { useRouter } from "expo-router";
import { useFocusEffect } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { getFavorites, saveFavorites } from "@/lib/storage";
import { getConditions } from "@/api/client";
import type { Favorite, RockType } from "@/types/api";
import { FRICTION_RATINGS, RATING_COLORS } from "@/constants/config";
import { Colors, Spacing, FontSize, BorderRadius } from "@/constants/theme";
import { useTheme } from "@/contexts/ThemeContext";
import { useTranslation } from "react-i18next";

export default function FavoritesScreen() {
  const { colorScheme } = useTheme();
  const isDark = colorScheme === "dark";
  const colors = isDark ? Colors.dark : Colors.light;
  const router = useRouter();
  const { t } = useTranslation("common");
  const [favorites, setFavorites] = useState<Favorite[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  useFocusEffect(
    useCallback(() => {
      loadFavorites();
    }, [])
  );

  function loadFavorites(): Favorite[] {
    const stored = getFavorites() as Favorite[];
    setFavorites(stored);
    return stored;
  }

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    const currentFavorites = loadFavorites();

    const updated = await Promise.all(
      currentFavorites.map(async (fav) => {
        try {
          const response = await getConditions(
            fav.latitude,
            fav.longitude,
            (fav.rockType || "unknown") as RockType
          );
          return {
            ...fav,
            lastFrictionScore: response.conditions.frictionScore,
            lastRating: String(response.conditions.rating),
            lastCheckedAt: new Date().toISOString(),
          };
        } catch {
          return fav;
        }
      })
    );

    setFavorites(updated);
    saveFavorites(updated);
    setRefreshing(false);
  }, []);

  function handleFavoritePress(fav: Favorite) {
    if (fav.areaSlug) {
      router.push(`/crag/${fav.areaSlug}`);
    }
  }

  function getRatingInfo(score?: number) {
    if (!score) return null;
    const rounded = Math.round(score) as keyof typeof FRICTION_RATINGS;
    return FRICTION_RATINGS[rounded] || null;
  }

  function renderFavorite({ item }: { item: Favorite }) {
    const ratingInfo = getRatingInfo(item.lastFrictionScore);
    const ratingColorKey = ratingInfo?.label as keyof typeof RATING_COLORS | undefined;
    const rColors = ratingColorKey ? RATING_COLORS[ratingColorKey] : null;

    return (
      <TouchableOpacity
        style={[styles.card, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}
        onPress={() => handleFavoritePress(item)}
        activeOpacity={0.7}
      >
        <Text style={[styles.cragName, { color: colors.text }]} numberOfLines={2}>
          {item.areaName}
        </Text>
        <Text style={[styles.location, { color: colors.textSecondary }]} numberOfLines={1}>
          {item.location}
        </Text>
        {rColors && ratingInfo && (
          <View style={[styles.ratingBadge, { backgroundColor: rColors.bg }]}>
            <Text style={[styles.ratingText, { color: rColors.text }]}>
              {t(`ratings.${ratingInfo.label.toLowerCase()}`, ratingInfo.label)}
            </Text>
          </View>
        )}
        {item.rockType && item.rockType !== "unknown" && (
          <Text style={[styles.rockType, { color: colors.muted }]}>
            {item.rockType.charAt(0).toUpperCase() + item.rockType.slice(1)}
          </Text>
        )}
      </TouchableOpacity>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {favorites.length > 0 ? (
        <FlatList
          data={favorites}
          renderItem={renderFavorite}
          keyExtractor={(item) => item.id}
          numColumns={2}
          columnWrapperStyle={styles.row}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        />
      ) : (
        <View style={styles.emptyState}>
          <Ionicons name="heart-outline" size={48} color={colors.muted} />
          <Text style={[styles.emptyTitle, { color: colors.text }]}>
            {t("favorites.empty", "No favorites yet")}
          </Text>
          <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
            {t("favorites.emptyHint", "Click the star button on any conditions card to add it to your favorites")}
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  list: {
    padding: Spacing.sm,
  },
  row: {
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  card: {
    flex: 1,
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    gap: Spacing.xs,
  },
  cragName: {
    fontSize: FontSize.md,
    fontWeight: "600",
  },
  location: {
    fontSize: FontSize.xs,
  },
  rockType: {
    fontSize: FontSize.xs,
    textTransform: "capitalize",
  },
  ratingBadge: {
    flexDirection: "row",
    alignSelf: "flex-start",
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
    borderRadius: BorderRadius.sm,
    alignItems: "center",
    marginTop: 2,
  },
  ratingText: {
    fontSize: FontSize.xs,
    fontWeight: "700",
  },
  ratingScore: {
    fontSize: FontSize.xs,
    fontWeight: "600",
  },
  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: Spacing.xl,
    gap: Spacing.md,
  },
  emptyTitle: {
    fontSize: FontSize.lg,
    fontWeight: "600",
  },
  emptySubtitle: {
    fontSize: FontSize.md,
    textAlign: "center",
  },
});
