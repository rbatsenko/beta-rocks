/**
 * CragQuickViewSheet - bottom sheet shown when a map marker is tapped.
 * Shows the crag name, distance, a conditions label badge and a short weather
 * summary, plus a "View Crag" button into the full detail screen.
 *
 * Implemented as a bottom-anchored Modal to avoid pulling in a bottom-sheet
 * dependency (and the Expo SDK alignment that would require).
 */

import { View, Text, StyleSheet, Modal, TouchableOpacity, Pressable, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import { Colors, Spacing, FontSize, BorderRadius } from "@/constants/theme";
import { LABEL_COLORS } from "@/constants/config";
import { useTheme } from "@/contexts/ThemeContext";
import { useConditionsQuery } from "@/hooks/queries";
import type { MapCrag, MapLabelKey, RockType } from "@/types/api";

interface Props {
  crag: MapCrag | null;
  onClose: () => void;
}

const LABEL_DOT: Record<MapLabelKey, string> = {
  good: LABEL_COLORS.good.solid,
  fair: LABEL_COLORS.fair.solid,
  poor: LABEL_COLORS.poor.solid,
  unrated: "#94a3b8",
};

function getCountryFlag(code: string | null | undefined): string {
  if (!code || code.length !== 2) return "";
  const upper = code.toUpperCase();
  const OFFSET = 0x1f1e6 - 0x41;
  return String.fromCodePoint(upper.charCodeAt(0) + OFFSET, upper.charCodeAt(1) + OFFSET);
}

function formatDistance(meters: number): string {
  const km = meters / 1000;
  return km < 10 ? km.toFixed(1) : Math.round(km).toString();
}

export function CragQuickViewSheet({ crag, onClose }: Props) {
  const { colorScheme } = useTheme();
  const isDark = colorScheme === "dark";
  const colors = isDark ? Colors.dark : Colors.light;
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { t } = useTranslation("common");

  const rockType = (crag?.rock_type as RockType | undefined) ?? "unknown";
  const conditions = useConditionsQuery(crag?.lat, crag?.lon, rockType);

  const labelKey: MapLabelKey = crag?.label ?? "unrated";
  const labelText =
    labelKey === "unrated" ? t("welcome.map.unrated", "Unrated") : t(`labels.${labelKey}`);
  const flag = getCountryFlag(crag?.country);
  const current = conditions.data?.current;
  const summary = conditions.data?.conditions.summary;

  const handleViewCrag = () => {
    if (!crag) return;
    onClose();
    router.push(`/crag/${crag.slug}`);
  };

  return (
    <Modal
      visible={crag !== null}
      transparent
      animationType="slide"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <Pressable style={styles.backdrop} onPress={onClose}>
        {/* Inner press shouldn't close: stop propagation by handling it. */}
        <Pressable
          style={[
            styles.sheet,
            {
              backgroundColor: colors.surfaceElevated,
              borderColor: colors.cardBorder,
              paddingBottom: insets.bottom + Spacing.lg,
            },
          ]}
          onPress={() => {}}
        >
          <View style={styles.grabber} />

          {/* Header */}
          <View style={styles.header}>
            <View style={styles.titleRow}>
              <View style={[styles.dot, { backgroundColor: LABEL_DOT[labelKey] }]} />
              <Text style={[styles.title, { color: colors.text }]} numberOfLines={2}>
                {flag ? `${flag} ` : ""}
                {crag?.name}
              </Text>
            </View>
            <TouchableOpacity
              onPress={onClose}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            >
              <Ionicons name="close" size={24} color={colors.muted} />
            </TouchableOpacity>
          </View>

          {/* Meta row: label badge + distance */}
          <View style={styles.metaRow}>
            <View style={[styles.badge, { backgroundColor: `${LABEL_DOT[labelKey]}22` }]}>
              <Text style={[styles.badgeText, { color: LABEL_DOT[labelKey] }]}>{labelText}</Text>
            </View>
            {crag != null && (
              <Text style={[styles.distance, { color: colors.muted }]}>
                {t("welcome.map.distanceAway", "{{km}} km away", {
                  km: formatDistance(crag.distance_m),
                })}
              </Text>
            )}
          </View>

          {/* Conditions summary */}
          <View style={styles.conditions}>
            {conditions.isLoading ? (
              <View style={styles.conditionsLoading}>
                <ActivityIndicator size="small" color={colors.primary} />
                <Text style={[styles.summary, { color: colors.muted }]}>
                  {t("welcome.map.loadingConditions", "Loading conditions…")}
                </Text>
              </View>
            ) : conditions.isError ? (
              <Text style={[styles.summary, { color: colors.muted }]}>
                {t("welcome.map.loadCragsError", "Couldn't load conditions")}
              </Text>
            ) : current ? (
              <>
                {summary ? (
                  <Text style={[styles.summary, { color: colors.textSecondary }]}>{summary}</Text>
                ) : null}
                <View style={styles.stats}>
                  <Stat
                    icon="thermometer-outline"
                    value={`${Math.round(current.temperature_c)}°C`}
                    colors={colors}
                  />
                  <Stat icon="water-outline" value={`${current.humidity}%`} colors={colors} />
                  <Stat
                    icon="navigate-outline"
                    value={`${Math.round(current.windSpeed_kph)} km/h`}
                    colors={colors}
                  />
                </View>
              </>
            ) : null}
          </View>

          {/* View crag button */}
          <TouchableOpacity
            style={[styles.viewButton, { backgroundColor: colors.primary }]}
            onPress={handleViewCrag}
            activeOpacity={0.85}
          >
            <Text style={[styles.viewButtonText, { color: colors.primaryForeground }]}>
              {t("welcome.map.viewCrag", "View Crag")}
            </Text>
            <Ionicons name="arrow-forward" size={18} color={colors.primaryForeground} />
          </TouchableOpacity>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function Stat({
  icon,
  value,
  colors,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  value: string;
  colors: (typeof Colors)["light"];
}) {
  return (
    <View style={styles.stat}>
      <Ionicons name={icon} size={16} color={colors.muted} />
      <Text style={[styles.statValue, { color: colors.text }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "flex-end",
  },
  sheet: {
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    borderWidth: 1,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.sm,
    gap: Spacing.md,
  },
  grabber: {
    alignSelf: "center",
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: "rgba(128,128,128,0.4)",
    marginBottom: Spacing.sm,
  },
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: Spacing.sm,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    flex: 1,
  },
  dot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  title: {
    fontSize: FontSize.lg,
    fontWeight: "700",
    flexShrink: 1,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
  },
  badge: {
    paddingHorizontal: Spacing.sm + 2,
    paddingVertical: 3,
    borderRadius: BorderRadius.full,
  },
  badgeText: {
    fontSize: FontSize.xs,
    fontWeight: "700",
  },
  distance: {
    fontSize: FontSize.sm,
  },
  conditions: {
    gap: Spacing.sm,
    minHeight: 24,
  },
  conditionsLoading: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  summary: {
    fontSize: FontSize.sm,
    lineHeight: 20,
  },
  stats: {
    flexDirection: "row",
    gap: Spacing.lg,
  },
  stat: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
  },
  statValue: {
    fontSize: FontSize.sm,
    fontWeight: "600",
  },
  viewButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.sm,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.lg,
  },
  viewButtonText: {
    fontSize: FontSize.md,
    fontWeight: "700",
  },
});
