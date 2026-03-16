/**
 * Search screen - find crags and sectors
 */

import { useState, useRef, useCallback } from "react";
import {
  View,
  Text,
  TextInput,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Keyboard,
  TouchableWithoutFeedback,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useFocusEffect } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { useSearch } from "@/hooks/useSearch";
import type { SearchResult } from "@/types/api";
import { Colors, Spacing, FontSize, BorderRadius } from "@/constants/theme";
import { useTheme } from "@/contexts/ThemeContext";
import { useTranslation } from "react-i18next";

export default function SearchScreen() {
  const { colorScheme } = useTheme();
  const isDark = colorScheme === "dark";
  const colors = isDark ? Colors.dark : Colors.light;
  const router = useRouter();
  const { t } = useTranslation("common");
  const { results, isSearching, error, search, clearResults } = useSearch();
  const [query, setQuery] = useState("");
  const inputRef = useRef<TextInput>(null);
  const params = useLocalSearchParams<{ focus?: string }>();

  useFocusEffect(
    useCallback(() => {
      if (params.focus === "1") {
        setTimeout(() => inputRef.current?.focus(), 100);
        // Clear the param so it doesn't re-trigger on tab switches
        router.setParams({ focus: undefined });
      }
    }, [params.focus])
  );

  function handleQueryChange(text: string) {
    setQuery(text);
    search(text);
  }

  function handleResultPress(result: SearchResult) {
    if (result.slug) {
      router.push(`/crag/${result.slug}`);
    }
  }

  function renderResult({ item }: { item: SearchResult }) {
    return (
      <TouchableOpacity
        style={[styles.resultCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}
        onPress={() => handleResultPress(item)}
        activeOpacity={0.7}
      >
        <View style={styles.resultContent}>
          <View style={styles.resultHeader}>
            <Ionicons
              name={item.resultType === "sector" ? "layers-outline" : "location-outline"}
              size={18}
              color={colors.primary}
            />
            <Text style={[styles.resultName, { color: colors.text }]}>
              {item.name}
            </Text>
          </View>
          <Text style={[styles.resultLocation, { color: colors.textSecondary }]}>
            {item.resultType === "sector" && item.parentCragName
              ? `${item.parentCragName} · `
              : ""}
            {item.location}
          </Text>
          {item.rockType && item.rockType !== "unknown" && (
            <Text style={[styles.rockType, { color: colors.muted }]}>
              {item.rockType.charAt(0).toUpperCase() + item.rockType.slice(1)}
            </Text>
          )}
        </View>
        <Ionicons name="chevron-forward" size={20} color={colors.muted} />
      </TouchableOpacity>
    );
  }

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View
        style={[
          styles.searchBar,
          { backgroundColor: colors.surface, borderColor: colors.border },
        ]}
      >
        <Ionicons name="search" size={20} color={colors.muted} />
        <TextInput
          ref={inputRef}
          style={[styles.searchInput, { color: colors.text }]}
          value={query}
          onChangeText={handleQueryChange}
          placeholder={t("search.placeholder", "Search crags, sectors...")}
          placeholderTextColor={colors.muted}
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="search"
        />
        {query.length > 0 && (
          <TouchableOpacity
            onPress={() => {
              setQuery("");
              clearResults();
            }}
          >
            <Ionicons name="close-circle" size={20} color={colors.muted} />
          </TouchableOpacity>
        )}
      </View>

      {isSearching && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color={colors.primary} />
        </View>
      )}

      {error && (
        <Text style={[styles.errorText, { color: colors.destructive }]}>
          {error}
        </Text>
      )}

      {results.length > 0 ? (
        <FlatList
          data={results}
          renderItem={renderResult}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.resultsList}
        />
      ) : (
        !isSearching &&
        query.length === 0 && (
          <View style={styles.emptyState}>
            <Ionicons name="search" size={48} color={colors.muted} />
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              {t("search.description", "Search for climbing areas by name or location")}
            </Text>
          </View>
        )
      )}
    </View>
    </TouchableWithoutFeedback>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: Spacing.md,
    marginTop: Spacing.md,
    marginBottom: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    height: 44,
    gap: Spacing.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: FontSize.md,
    height: "100%",
  },
  loadingContainer: {
    padding: Spacing.md,
    alignItems: "center",
  },
  errorText: {
    padding: Spacing.md,
    textAlign: "center",
  },
  resultsList: {
    paddingHorizontal: Spacing.md,
    gap: Spacing.sm,
  },
  resultCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    marginBottom: Spacing.sm,
  },
  resultContent: {
    flex: 1,
    gap: 2,
  },
  resultHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  resultName: {
    fontSize: FontSize.md,
    fontWeight: "600",
  },
  resultLocation: {
    fontSize: FontSize.sm,
    marginLeft: 26,
  },
  rockType: {
    fontSize: FontSize.xs,
    marginLeft: 26,
    textTransform: "capitalize",
  },
  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: Spacing.md,
  },
  emptyText: {
    fontSize: FontSize.md,
    textAlign: "center",
    paddingHorizontal: Spacing.xl,
  },
});
