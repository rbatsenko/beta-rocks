/**
 * Crag detail screen - shows conditions, weather, and reports
 * Matches the web app's CragPageContent layout
 */

import { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
} from "react-native";
import { useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { getCragBySlug } from "@/api/client";
import type {
  CragDetailResponse,
  CragData,
  SectorData,
  ConditionsData,
  CurrentWeather,
  Report,
} from "@/types/api";
import { FRICTION_RATINGS } from "@/constants/config";
import { Colors, Spacing, FontSize, BorderRadius } from "@/constants/theme";
import { useTheme } from "@/contexts/ThemeContext";

export default function CragDetailScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const { colorScheme } = useTheme();
  const isDark = colorScheme === "dark";
  const colors = isDark ? Colors.dark : Colors.light;

  const [crag, setCrag] = useState<CragData | null>(null);
  const [conditions, setConditions] = useState<
    (ConditionsData & { current: CurrentWeather }) | null
  >(null);
  const [reports, setReports] = useState<Report[]>([]);
  const [sectors, setSectors] = useState<SectorData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (slug) loadCragData();
  }, [slug]);

  async function loadCragData() {
    setIsLoading(true);
    setError(null);
    try {
      const data: CragDetailResponse = await getCragBySlug(slug!);
      setCrag(data.crag);
      setConditions(data.conditions);
      setReports(data.reports);
      setSectors(data.sectors);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load crag");
    } finally {
      setIsLoading(false);
    }
  }

  if (isLoading) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (error || !crag) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background }]}>
        <Ionicons name="alert-circle-outline" size={48} color={colors.destructive} />
        <Text style={[styles.errorText, { color: colors.text }]}>
          {error || "Crag not found"}
        </Text>
      </View>
    );
  }

  const frictionScore = conditions?.frictionScore ?? null;
  const ratingKey = frictionScore
    ? (Math.round(frictionScore) as keyof typeof FRICTION_RATINGS)
    : null;
  const ratingInfo = ratingKey ? FRICTION_RATINGS[ratingKey] : null;

  const location = [crag.village, crag.municipality, crag.state, crag.country]
    .filter(Boolean)
    .join(", ");

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.content}
    >
      {/* Header with crag name and rating */}
      <View style={styles.header}>
        <View style={styles.headerText}>
          <Text style={[styles.cragName, { color: colors.text }]}>
            {crag.name}
          </Text>
          <Text style={[styles.location, { color: colors.textSecondary }]}>
            {location}
          </Text>
          {crag.rock_type && crag.rock_type !== "unknown" && (
            <View style={[styles.rockTypeBadge, { backgroundColor: colors.accent }]}>
              <Text style={[styles.rockTypeText, { color: colors.textSecondary }]}>
                {crag.rock_type.charAt(0).toUpperCase() + crag.rock_type.slice(1)}
              </Text>
            </View>
          )}
        </View>
        {ratingInfo && frictionScore && (
          <View style={[styles.ratingCard, { backgroundColor: ratingInfo.color }]}>
            <Text style={styles.ratingLabel}>{ratingInfo.label}</Text>
            <Text style={styles.ratingScore}>
              {frictionScore.toFixed(1)}
            </Text>
            <Text style={styles.ratingSubtext}>/ 5</Text>
          </View>
        )}
      </View>

      {/* Current conditions */}
      {conditions?.current && (
        <View
          style={[
            styles.conditionsCard,
            { backgroundColor: colors.card, borderColor: colors.cardBorder },
          ]}
        >
          <Text style={[styles.cardTitle, { color: colors.text }]}>
            Current Conditions
          </Text>
          <View style={styles.conditionsGrid}>
            <ConditionItem
              icon="thermometer-outline"
              label="Temperature"
              value={`${conditions.current.temperature_c.toFixed(1)}°C`}
              colors={colors}
            />
            <ConditionItem
              icon="water-outline"
              label="Humidity"
              value={`${conditions.current.humidity}%`}
              colors={colors}
            />
            <ConditionItem
              icon="flag-outline"
              label="Wind"
              value={`${conditions.current.windSpeed_kph.toFixed(1)} km/h`}
              colors={colors}
            />
            <ConditionItem
              icon="rainy-outline"
              label="Precipitation"
              value={`${conditions.current.precipitation_mm.toFixed(1)} mm`}
              colors={colors}
            />
          </View>
        </View>
      )}

      {/* Optimal windows */}
      {conditions?.optimalWindows && conditions.optimalWindows.length > 0 && (
        <View
          style={[
            styles.windowsCard,
            { backgroundColor: colors.card, borderColor: colors.cardBorder },
          ]}
        >
          <Text style={[styles.cardTitle, { color: colors.text }]}>
            Best Times to Climb
          </Text>
          {conditions.optimalWindows.slice(0, 3).map((window, i) => {
            const windowRatingKey = Math.round(
              window.avgFriction
            ) as keyof typeof FRICTION_RATINGS;
            const windowRating = FRICTION_RATINGS[windowRatingKey];
            return (
              <View key={i} style={styles.windowRow}>
                <View
                  style={[
                    styles.windowDot,
                    { backgroundColor: windowRating?.color || colors.muted },
                  ]}
                />
                <Text style={[styles.windowTime, { color: colors.text }]}>
                  {formatTimeRange(window.startTime, window.endTime)}
                </Text>
                <Text style={[styles.windowRating, { color: colors.textSecondary }]}>
                  {window.avgFriction.toFixed(1)}
                </Text>
              </View>
            );
          })}
        </View>
      )}

      {/* Sectors */}
      {sectors.length > 0 && (
        <View
          style={[
            styles.sectorsCard,
            { backgroundColor: colors.card, borderColor: colors.cardBorder },
          ]}
        >
          <Text style={[styles.cardTitle, { color: colors.text }]}>
            Sectors ({sectors.length})
          </Text>
          {sectors.map((sector) => (
            <View key={sector.id} style={styles.sectorRow}>
              <Ionicons name="layers-outline" size={16} color={colors.primary} />
              <Text style={[styles.sectorName, { color: colors.text }]}>
                {sector.name}
              </Text>
            </View>
          ))}
        </View>
      )}

      {/* Reports */}
      {reports.length > 0 && (
        <View
          style={[
            styles.reportsCard,
            { backgroundColor: colors.card, borderColor: colors.cardBorder },
          ]}
        >
          <Text style={[styles.cardTitle, { color: colors.text }]}>
            Community Reports ({reports.length})
          </Text>
          {reports.slice(0, 5).map((report) => (
            <View
              key={report.id}
              style={[styles.reportItem, { borderTopColor: colors.border }]}
            >
              <View style={styles.reportHeader}>
                <View
                  style={[
                    styles.categoryBadge,
                    { backgroundColor: colors.accent },
                  ]}
                >
                  <Text style={[styles.categoryText, { color: colors.textSecondary }]}>
                    {report.category}
                  </Text>
                </View>
                <Text style={[styles.reportDate, { color: colors.muted }]}>
                  {formatDate(report.created_at)}
                </Text>
              </View>
              {report.text && (
                <Text style={[styles.reportText, { color: colors.text }]}>
                  {report.text}
                </Text>
              )}
              <View style={styles.reportVotes}>
                <TouchableOpacity style={styles.voteButton}>
                  <Ionicons name="thumbs-up-outline" size={14} color={colors.muted} />
                  <Text style={[styles.voteCount, { color: colors.muted }]}>
                    {report.confirmations?.[0]?.count ?? 0}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </View>
      )}
    </ScrollView>
  );
}

function ConditionItem({
  icon,
  label,
  value,
  colors,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  colors: (typeof Colors)["light"];
}) {
  return (
    <View style={styles.conditionItem}>
      <Ionicons name={icon} size={20} color={colors.primary} />
      <Text style={[styles.conditionLabel, { color: colors.textSecondary }]}>
        {label}
      </Text>
      <Text style={[styles.conditionValue, { color: colors.text }]}>
        {value}
      </Text>
    </View>
  );
}

function formatTimeRange(start: string, end: string): string {
  const startDate = new Date(start);
  const endDate = new Date(end);
  const opts: Intl.DateTimeFormatOptions = { hour: "numeric", minute: "2-digit" };
  return `${startDate.toLocaleTimeString(undefined, opts)} – ${endDate.toLocaleTimeString(undefined, opts)}`;
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: Spacing.md,
    gap: Spacing.md,
    paddingBottom: Spacing.xxl,
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: Spacing.md,
  },
  errorText: {
    fontSize: FontSize.md,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: Spacing.md,
  },
  headerText: {
    flex: 1,
    gap: Spacing.xs,
  },
  cragName: {
    fontSize: FontSize.xl,
    fontWeight: "700",
  },
  location: {
    fontSize: FontSize.sm,
  },
  rockTypeBadge: {
    alignSelf: "flex-start",
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.sm,
    marginTop: Spacing.xs,
  },
  rockTypeText: {
    fontSize: FontSize.xs,
    fontWeight: "500",
  },
  ratingCard: {
    alignItems: "center",
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.lg,
    minWidth: 70,
  },
  ratingLabel: {
    color: "#ffffff",
    fontSize: FontSize.sm,
    fontWeight: "700",
  },
  ratingScore: {
    color: "#ffffff",
    fontSize: FontSize.xl,
    fontWeight: "800",
  },
  ratingSubtext: {
    color: "rgba(255,255,255,0.8)",
    fontSize: FontSize.xs,
  },
  conditionsCard: {
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    padding: Spacing.md,
    gap: Spacing.md,
  },
  cardTitle: {
    fontSize: FontSize.lg,
    fontWeight: "600",
  },
  conditionsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.md,
  },
  conditionItem: {
    width: "45%",
    gap: 2,
  },
  conditionLabel: {
    fontSize: FontSize.xs,
  },
  conditionValue: {
    fontSize: FontSize.md,
    fontWeight: "600",
  },
  windowsCard: {
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  windowRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    paddingVertical: Spacing.xs,
  },
  windowDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  windowTime: {
    fontSize: FontSize.sm,
    fontWeight: "500",
    flex: 1,
  },
  windowRating: {
    fontSize: FontSize.sm,
  },
  sectorsCard: {
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  sectorRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    paddingVertical: Spacing.xs,
  },
  sectorName: {
    flex: 1,
    fontSize: FontSize.sm,
    fontWeight: "500",
  },
  reportsCard: {
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  reportItem: {
    borderTopWidth: 1,
    paddingTop: Spacing.sm,
    gap: Spacing.xs,
  },
  reportHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  categoryBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.sm,
  },
  categoryText: {
    fontSize: FontSize.xs,
    fontWeight: "500",
    textTransform: "capitalize",
  },
  reportDate: {
    fontSize: FontSize.xs,
  },
  reportText: {
    fontSize: FontSize.sm,
    lineHeight: 20,
  },
  reportVotes: {
    flexDirection: "row",
    gap: Spacing.md,
  },
  voteButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  voteCount: {
    fontSize: FontSize.xs,
  },
});
