/**
 * Favorites screen - bookmarked crags with cached conditions
 */

import { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { getFavorites, saveFavorites } from "@/lib/storage";
import { getConditions } from "@/api/client";
import type { Favorite, RockType } from "@/types/api";
import { FRICTION_RATINGS } from "@/constants/config";
import { Colors, Spacing, FontSize, BorderRadius } from "@/constants/theme";
import { useTheme } from "@/contexts/ThemeContext";

export default function FavoritesScreen() {
  const { colorScheme } = useTheme();
  const isDark = colorScheme === "dark";
  const colors = isDark ? Colors.dark : Colors.light;
  const router = useRouter();
  const [favorites, setFavorites] = useState<Favorite[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadFavorites();
  }, []);

  function loadFavorites(): Favorite[] {
    const stored = getFavorites() as Favorite[];
    setFavorites(stored);
    return stored;
  }

  const onRefresh = useCallback(async () => {
    setRefreshing(true);

    // Load fresh favorites from storage and use the returned value
    // to avoid stale closure over `favorites` state
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

    return (
      <TouchableOpacity
        style={[styles.card, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}
        onPress={() => handleFavoritePress(item)}
        activeOpacity={0.7}
      >
        <View style={styles.cardContent}>
          <Text style={[styles.cragName, { color: colors.text }]}>
            {item.areaName}
          </Text>
          <Text style={[styles.location, { color: colors.textSecondary }]}>
            {item.location}
          </Text>
          {item.rockType && item.rockType !== "unknown" && (
            <Text style={[styles.rockType, { color: colors.muted }]}>
              {item.rockType.charAt(0).toUpperCase() + item.rockType.slice(1)}
            </Text>
          )}
        </View>
        {ratingInfo && (
          <View
            style={[styles.ratingBadge, { backgroundColor: ratingInfo.color }]}
          >
            <Text style={styles.ratingText}>{ratingInfo.label}</Text>
            {item.lastFrictionScore && (
              <Text style={styles.ratingScore}>
                {item.lastFrictionScore.toFixed(1)}
              </Text>
            )}
          </View>
        )}
        <Ionicons name="chevron-forward" size={20} color={colors.muted} />
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
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        />
      ) : (
        <View style={styles.emptyState}>
          <Ionicons name="heart-outline" size={48} color={colors.muted} />
          <Text style={[styles.emptyTitle, { color: colors.text }]}>
            No favorites yet
          </Text>
          <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
            Search for a crag and tap the heart icon to add it here
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
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  card: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    marginBottom: Spacing.sm,
    gap: Spacing.sm,
  },
  cardContent: {
    flex: 1,
    gap: 2,
  },
  cragName: {
    fontSize: FontSize.md,
    fontWeight: "600",
  },
  location: {
    fontSize: FontSize.sm,
  },
  rockType: {
    fontSize: FontSize.xs,
    textTransform: "capitalize",
  },
  ratingBadge: {
    paddingHorizontal: Spacing.sm + 2,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.md,
    alignItems: "center",
    minWidth: 50,
  },
  ratingText: {
    color: "#ffffff",
    fontSize: FontSize.xs,
    fontWeight: "700",
  },
  ratingScore: {
    color: "#ffffff",
    fontSize: FontSize.xs,
    opacity: 0.9,
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
