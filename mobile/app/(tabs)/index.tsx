/**
 * Home screen - matches web's welcome state
 * Logo, search hint, example queries, and favorites quick access
 */

import { useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from "react-native";
import { useRouter } from "expo-router";
import { useFocusEffect } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { getFavorites } from "@/lib/storage";
import type { Favorite } from "@/types/api";
import { Colors, Spacing, FontSize, BorderRadius } from "@/constants/theme";
import { useTheme } from "@/contexts/ThemeContext";
import { useTranslation } from "react-i18next";

const EXAMPLE_QUERIES = [
  "Fontainebleau",
  "El Capitan",
  "Kalymnos",
  "Siurana",
  "Magic Wood",
  "Bishop",
];

export default function HomeScreen() {
  const { colorScheme } = useTheme();
  const isDark = colorScheme === "dark";
  const colors = isDark ? Colors.dark : Colors.light;
  const router = useRouter();
  const { t } = useTranslation("common");
  const [favorites, setFavorites] = useState<Favorite[]>([]);

  useFocusEffect(
    useCallback(() => {
      const stored = getFavorites() as Favorite[];
      setFavorites(stored);
    }, [])
  );

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.content}
    >
      {/* Logo */}
      <View style={[styles.logoCircle, { backgroundColor: "rgba(249,115,22,0.12)" }]}>
        <Ionicons name="partly-sunny" size={40} color="#f97316" />
      </View>

      {/* Heading */}
      <Text style={[styles.title, { color: colors.text }]}>beta.rocks</Text>
      <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
        {t("welcome.description")}
      </Text>

      {/* Search hint */}
      <TouchableOpacity
        style={[styles.searchHint, { backgroundColor: "rgba(249,115,22,0.08)", borderColor: "rgba(249,115,22,0.2)" }]}
        onPress={() => router.push({ pathname: "/(tabs)/search", params: { focus: "1" } })}
        activeOpacity={0.7}
      >
        <Ionicons name="search" size={16} color="#f97316" />
        <Text style={[styles.searchHintText, { color: colors.textSecondary }]}>
          {t("welcome.searchHint")}
        </Text>
      </TouchableOpacity>

      {/* Example queries */}
      <View style={styles.exampleQueries}>
        {EXAMPLE_QUERIES.map((query) => (
          <TouchableOpacity
            key={query}
            style={[styles.queryChip, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}
            onPress={() => router.push("/(tabs)/search")}
            activeOpacity={0.7}
          >
            <Text style={[styles.queryChipText, { color: colors.text }]}>
              {query}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Favorites quick access */}
      {favorites.length > 0 && (
        <View style={styles.favoritesSection}>
          <View style={styles.favoritesHeader}>
            <Ionicons name="star" size={16} color="#f97316" />
            <Text style={[styles.favoritesTitle, { color: colors.textSecondary }]}>
              {t("welcome.yourFavorites")}
            </Text>
          </View>
          <View style={styles.favoritesGrid}>
            {favorites.slice(0, 8).map((fav) => (
              <TouchableOpacity
                key={fav.id}
                style={[styles.favoriteChip, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}
                onPress={() => fav.areaSlug && router.push(`/crag/${fav.areaSlug}`)}
                activeOpacity={0.7}
              >
                <Ionicons name="star" size={12} color="#f97316" />
                <Text style={[styles.favoriteChipText, { color: colors.text }]} numberOfLines={1}>
                  {fav.areaName}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.xxl + Spacing.xl,
    paddingBottom: Spacing.xxl,
    alignItems: "center",
    gap: Spacing.md,
  },
  logoCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.sm,
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    textAlign: "center",
  },
  subtitle: {
    fontSize: FontSize.md,
    textAlign: "center",
    lineHeight: 22,
    maxWidth: 300,
    marginBottom: Spacing.sm,
  },
  searchHint: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm + 2,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    width: "100%",
    marginBottom: Spacing.sm,
  },
  searchHintText: {
    fontSize: FontSize.sm,
  },
  exampleQueries: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  queryChip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
  },
  queryChipText: {
    fontSize: FontSize.sm,
  },
  favoritesSection: {
    width: "100%",
    gap: Spacing.md,
    marginTop: Spacing.md,
  },
  favoritesHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.sm,
  },
  favoritesTitle: {
    fontSize: FontSize.sm,
    fontWeight: "500",
  },
  favoritesGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: Spacing.sm,
  },
  favoriteChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    maxWidth: "48%",
  },
  favoriteChipText: {
    fontSize: FontSize.sm,
    flexShrink: 1,
  },
});
