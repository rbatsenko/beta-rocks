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
import type { Favorite, RockType, ConditionsLabel } from "@/types/api";
import { LABEL_COLORS } from "@/constants/config";
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
        // Skip conditions fetch for locationless crags
        if (fav.isLocationless) return fav;
        try {
          const response = await getConditions(
            fav.latitude,
            fav.longitude,
            (fav.rockType || "unknown") as RockType
          );
          return {
            ...fav,
            lastLabel: response.conditions.label,
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

  function getLabelColors(label?: ConditionsLabel) {
    if (!label) return null;
    return LABEL_COLORS[label] || null;
  }

  function renderFavorite({ item }: { item: Favorite }) {
    const labelKey = item.lastLabel;
    const lColors = getLabelColors(labelKey);

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
        {item.isLocationless ? (
          <View style={[styles.ratingBadge, { backgroundColor: isDark ? "rgba(147,51,234,0.12)" : "#faf5ff" }]}>
            <Text style={[styles.ratingText, { color: isDark ? "#d8b4fe" : "#7c3aed" }]}>
              {t("favorites.reportsOnly", "Reports only")}
            </Text>
          </View>
        ) : lColors && labelKey ? (
          <View style={[styles.ratingBadge, { backgroundColor: lColors.bg }]}>
            <Text style={[styles.ratingText, { color: lColors.text }]}>
              {t(`conditions.labels.${labelKey}`, labelKey.replace(/_/g, " "))}
            </Text>
          </View>
        ) : null}
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
    maxWidth: "50%",
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
