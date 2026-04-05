/**
 * Mobile badges display component for the settings/profile screen.
 * Shows earned and unearned badges with progress indicators.
 */

import { useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { useTranslation } from "react-i18next";
import { Colors, Spacing, FontSize, BorderRadius } from "@/constants/theme";
import { useTheme } from "@/contexts/ThemeContext";
import {
  computeBadges,
  getBadgesByCategory,
  type BadgeCategory,
  type BadgeStatus,
  type BadgeUserStats,
} from "@/lib/badges/badge-definitions";

interface BadgesDisplayProps {
  stats: BadgeUserStats;
}

const CATEGORY_ORDER: { key: BadgeCategory; labelKey: string }[] = [
  { key: "reports", labelKey: "badges.categoryReports" },
  { key: "confirmations_received", labelKey: "badges.categoryConfirmationsReceived" },
  { key: "confirmations_given", labelKey: "badges.categoryConfirmationsGiven" },
  { key: "favorites", labelKey: "badges.categoryFavorites" },
  { key: "specialist", labelKey: "badges.categorySpecialist" },
];

export function BadgesDisplay({ stats }: BadgesDisplayProps) {
  const { t } = useTranslation("common");
  const { colorScheme } = useTheme();
  const isDark = colorScheme === "dark";
  const colors = isDark ? Colors.dark : Colors.light;
  const allStatuses = computeBadges(stats);
  const [selectedBadge, setSelectedBadge] = useState<BadgeStatus | null>(null);

  const earnedCount = allStatuses.filter((s) => s.earned).length;
  const totalCount = allStatuses.length;

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>
          {t("badges.title")}
        </Text>
        <Text style={[styles.progress, { color: colors.textSecondary }]}>
          {t("badges.progress", { earned: earnedCount, total: totalCount })}
        </Text>
      </View>

      {/* Categories */}
      {CATEGORY_ORDER.map(({ key, labelKey }) => {
        const categoryBadges = getBadgesByCategory(key);
        const categoryStatuses = allStatuses.filter((s) =>
          categoryBadges.some((b) => b.id === s.badge.id)
        );
        if (categoryStatuses.length === 0) return null;

        return (
          <View key={key} style={styles.categorySection}>
            <Text style={[styles.categoryLabel, { color: colors.textSecondary }]}>
              {t(labelKey)}
            </Text>
            <View style={styles.badgesRow}>
              {categoryStatuses.map((status) => (
                <TouchableOpacity
                  key={status.badge.id}
                  style={[
                    styles.badgeChip,
                    {
                      backgroundColor: status.earned
                        ? `${colors.primary}20`
                        : `${colors.border}40`,
                      borderColor: status.earned
                        ? colors.primary
                        : colors.border,
                    },
                    selectedBadge?.badge.id === status.badge.id && {
                      borderWidth: 2,
                      borderColor: colors.primary,
                    },
                  ]}
                  onPress={() =>
                    setSelectedBadge(
                      selectedBadge?.badge.id === status.badge.id ? null : status
                    )
                  }
                  activeOpacity={0.7}
                >
                  <Text style={[styles.badgeIcon, !status.earned && styles.badgeIconLocked]}>
                    {status.badge.icon}
                  </Text>
                  <Text
                    style={[
                      styles.badgeName,
                      { color: status.earned ? colors.text : colors.textSecondary },
                    ]}
                    numberOfLines={1}
                  >
                    {t(status.badge.nameKey)}
                  </Text>
                  {!status.earned && (
                    <Text style={[styles.badgeProgress, { color: colors.textSecondary }]}>
                      {status.current}/{status.badge.threshold}
                    </Text>
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </View>
        );
      })}

      {/* Selected badge detail */}
      {selectedBadge && (
        <View
          style={[
            styles.detailCard,
            {
              backgroundColor: selectedBadge.earned
                ? `${colors.primary}10`
                : `${colors.card}`,
              borderColor: selectedBadge.earned ? colors.primary : colors.border,
            },
          ]}
        >
          <View style={styles.detailHeader}>
            <Text style={styles.detailIcon}>{selectedBadge.badge.icon}</Text>
            <Text style={[styles.detailName, { color: colors.text }]}>
              {t(selectedBadge.badge.nameKey)}
            </Text>
            {selectedBadge.earned && (
              <Text style={[styles.earnedLabel, { color: colors.primary }]}>
                {t("badges.earned")}
              </Text>
            )}
          </View>
          <Text style={[styles.detailDescription, { color: colors.textSecondary }]}>
            {t(selectedBadge.badge.descriptionKey)}
          </Text>
          {!selectedBadge.earned && (
            <View style={styles.progressBarContainer}>
              <View style={styles.progressLabels}>
                <Text style={[styles.progressText, { color: colors.textSecondary }]}>
                  {selectedBadge.current} / {selectedBadge.badge.threshold}
                </Text>
                <Text style={[styles.progressText, { color: colors.textSecondary }]}>
                  {Math.round(selectedBadge.progress * 100)}%
                </Text>
              </View>
              <View style={[styles.progressBar, { backgroundColor: colors.border }]}>
                <View
                  style={[
                    styles.progressFill,
                    {
                      backgroundColor: colors.primary,
                      width: `${selectedBadge.progress * 100}%`,
                    },
                  ]}
                />
              </View>
            </View>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: Spacing.md,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  title: {
    fontSize: FontSize.md,
    fontWeight: "600",
  },
  progress: {
    fontSize: FontSize.xs,
  },
  categorySection: {
    gap: Spacing.xs,
  },
  categoryLabel: {
    fontSize: FontSize.xs,
    fontWeight: "500",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  badgesRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.xs,
  },
  badgeChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 6,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
  },
  badgeIcon: {
    fontSize: 14,
  },
  badgeIconLocked: {
    opacity: 0.4,
  },
  badgeName: {
    fontSize: FontSize.xs,
    fontWeight: "500",
    maxWidth: 100,
  },
  badgeProgress: {
    fontSize: 10,
  },
  detailCard: {
    borderWidth: 1,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    gap: Spacing.xs,
  },
  detailHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
  },
  detailIcon: {
    fontSize: 22,
  },
  detailName: {
    fontSize: FontSize.md,
    fontWeight: "600",
    flex: 1,
  },
  earnedLabel: {
    fontSize: FontSize.xs,
    fontWeight: "600",
  },
  detailDescription: {
    fontSize: FontSize.sm,
    lineHeight: 18,
  },
  progressBarContainer: {
    marginTop: Spacing.xs,
    gap: 4,
  },
  progressLabels: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  progressText: {
    fontSize: 10,
  },
  progressBar: {
    height: 6,
    borderRadius: 3,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: 3,
  },
});
