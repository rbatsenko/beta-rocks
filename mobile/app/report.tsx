/**
 * Report creation screen - submit a report for a crag
 * Presented as a modal from the crag detail screen
 */

import { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { createReport } from "@/api/client";
import { useUserProfile } from "@/hooks/useUserProfile";
import { CATEGORY_COLORS } from "@/constants/config";
import { Colors, Spacing, FontSize, BorderRadius } from "@/constants/theme";
import { useTheme } from "@/contexts/ThemeContext";
import { useTranslation } from "react-i18next";

const CATEGORIES = [
  { key: "conditions", labelKey: "reports.categories.conditions", icon: "partly-sunny-outline" as const },
  { key: "safety", labelKey: "reports.categories.safety", icon: "warning-outline" as const },
  { key: "access", labelKey: "reports.categories.access", icon: "lock-closed-outline" as const },
  { key: "beta", labelKey: "reports.categories.climbing_info", icon: "bulb-outline" as const },
  { key: "facilities", labelKey: "reports.categories.facilities", icon: "home-outline" as const },
  { key: "climbing_info", labelKey: "reports.categories.climbing_info", icon: "trail-sign-outline" as const },
  { key: "lost_found", labelKey: "reports.categories.lost_found", icon: "search-outline" as const },
  { key: "other", labelKey: "reports.categories.other", icon: "chatbubble-outline" as const },
];

export default function ReportScreen() {
  const { cragId, cragName } = useLocalSearchParams<{ cragId: string; cragName: string }>();
  const { colorScheme } = useTheme();
  const isDark = colorScheme === "dark";
  const colors = isDark ? Colors.dark : Colors.light;
  const router = useRouter();
  const { t } = useTranslation("common");
  const { syncKeyHash } = useUserProfile();

  const [category, setCategory] = useState("conditions");
  const [text, setText] = useState("");
  const [ratingDry, setRatingDry] = useState(0);
  const [ratingWind, setRatingWind] = useState(0);
  const [ratingCrowds, setRatingCrowds] = useState(0);
  const [lostFoundType, setLostFoundType] = useState<"lost" | "found">("lost");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isConditions = category === "conditions";
  const isLostFound = category === "lost_found";

  async function handleSubmit() {
    if (!text.trim() && !isConditions) {
      Alert.alert(t("reports.detailsRequired", "Please provide details about this report"));
      return;
    }
    if (!cragId || !syncKeyHash) {
      Alert.alert(t("errors.failedToLoadConditions", "Failed to load conditions. Please try again."));
      return;
    }

    setIsSubmitting(true);
    try {
      await createReport(
        {
          cragId,
          category: category as any,
          text: text.trim(),
          ...(isConditions && ratingDry > 0 && { rating_dry: ratingDry }),
          ...(isConditions && ratingWind > 0 && { rating_wind: ratingWind }),
          ...(isConditions && ratingCrowds > 0 && { rating_crowds: ratingCrowds }),
          ...(isLostFound && { lost_found_type: lostFoundType }),
        },
        syncKeyHash
      );
      Alert.alert(t("reports.reportCreated", "Report created"), t("reports.reportCreatedDescription", "Your report has been posted successfully"), [
        { text: "OK", onPress: () => router.back() },
      ]);
    } catch (err) {
      Alert.alert(t("reports.submitFailed", "Submit failed"), err instanceof Error ? err.message : t("reports.submitFailed", "Submit failed"));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={90}
    >
      <ScrollView contentContainerStyle={styles.content}>
        {cragName && (
          <Text style={[styles.cragLabel, { color: colors.textSecondary }]}>
            {t("reports.addReportDescription", "Share information about {{cragName}}", { cragName: "" })} <Text style={{ color: colors.text, fontWeight: "600" }}>{cragName}</Text>
          </Text>
        )}

        {/* Category picker */}
        <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>{t("reports.category", "What would you like to report?")}</Text>
        <View style={styles.categoryGrid}>
          {CATEGORIES.map((cat) => {
            const isActive = category === cat.key;
            const catColor = CATEGORY_COLORS[cat.key] || CATEGORY_COLORS.other;
            return (
              <TouchableOpacity
                key={cat.key}
                style={[
                  styles.categoryChip,
                  {
                    backgroundColor: isActive ? catColor.bg : colors.surface,
                    borderColor: isActive ? catColor.text : colors.border,
                  },
                ]}
                onPress={() => setCategory(cat.key)}
                activeOpacity={0.7}
              >
                <Ionicons name={cat.icon} size={16} color={isActive ? catColor.text : colors.muted} />
                <Text style={[styles.categoryChipText, { color: isActive ? catColor.text : colors.text }]}>
                  {t(cat.labelKey)}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Category hint */}
        <Text style={[styles.categoryHint, { color: colors.muted }]}>
          {t(`reports.categoryHelp.${category}`, t(`reports.categoryDescriptions.${category}`, ""))}
        </Text>

        {/* Condition ratings */}
        {isConditions && (
          <View style={styles.ratingsSection}>
            <RatingRow label={t("reports.dryness", "Dryness")} value={ratingDry} onChange={setRatingDry} colors={colors} />
            <RatingRow label={t("reports.wind", "Wind")} value={ratingWind} onChange={setRatingWind} colors={colors} />
            <RatingRow label={t("reports.crowds", "Crowds")} value={ratingCrowds} onChange={setRatingCrowds} colors={colors} />
          </View>
        )}

        {/* Lost / Found toggle */}
        {isLostFound && (
          <View style={styles.lostFoundSection}>
            <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>{t("reports.lostFoundType", "Type")}</Text>
            <View style={styles.lostFoundToggle}>
              {(["lost", "found"] as const).map((type) => {
                const isActive = lostFoundType === type;
                return (
                  <TouchableOpacity
                    key={type}
                    style={[
                      styles.lostFoundButton,
                      {
                        backgroundColor: isActive ? colors.primary : colors.surface,
                        borderColor: isActive ? colors.primary : colors.border,
                      },
                    ]}
                    onPress={() => setLostFoundType(type)}
                    activeOpacity={0.7}
                  >
                    <Ionicons
                      name={type === "lost" ? "help-circle-outline" : "checkmark-circle-outline"}
                      size={18}
                      color={isActive ? colors.primaryForeground : colors.text}
                    />
                    <Text
                      style={[
                        styles.lostFoundButtonText,
                        { color: isActive ? colors.primaryForeground : colors.text },
                      ]}
                    >
                      {type === "lost" ? t("reports.lostFoundTypes.lost", "Lost Item") : t("reports.lostFoundTypes.found", "Found Item")}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        )}

        {/* Text input */}
        <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>
          {isConditions ? t("reports.additionalComments", "Additional comments (optional)") : isLostFound ? t("reports.details", "Details") : t("reports.details", "Details")}
        </Text>
        <TextInput
          style={[styles.textInput, { color: colors.text, backgroundColor: colors.surface, borderColor: colors.border }]}
          value={text}
          onChangeText={setText}
          placeholder={
            isLostFound
              ? t("reports.placeholders.lost_found", "E.g., Found blue chalk bag at base of main wall, lost Black Diamond cam #2 near parking...")
              : t(`reports.placeholders.${category}`, "Describe the conditions, situation, or beta...")
          }
          placeholderTextColor={colors.muted}
          multiline
          numberOfLines={5}
          textAlignVertical="top"
        />

        {/* Submit */}
        <TouchableOpacity
          style={[styles.submitButton, { backgroundColor: isSubmitting ? colors.muted : colors.primary }]}
          onPress={handleSubmit}
          disabled={isSubmitting}
          activeOpacity={0.7}
        >
          {isSubmitting ? (
            <ActivityIndicator color={colors.primaryForeground} />
          ) : (
            <>
              <Ionicons name="send" size={18} color={colors.primaryForeground} />
              <Text style={[styles.submitText, { color: colors.primaryForeground }]}>{t("reports.submitReport", "Submit Report")}</Text>
            </>
          )}
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function RatingRow({
  label,
  value,
  onChange,
  colors,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  colors: (typeof Colors)["light"];
}) {
  return (
    <View style={styles.ratingRow}>
      <Text style={[styles.ratingLabel, { color: colors.text }]}>{label}</Text>
      <View style={styles.ratingButtons}>
        {[1, 2, 3, 4, 5].map((n) => (
          <TouchableOpacity
            key={n}
            style={[
              styles.ratingButton,
              {
                backgroundColor: value === n ? colors.primary : colors.surface,
                borderColor: value === n ? colors.primary : colors.border,
              },
            ]}
            onPress={() => onChange(value === n ? 0 : n)}
          >
            <Text style={[styles.ratingButtonText, { color: value === n ? colors.primaryForeground : colors.text }]}>
              {n}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: Spacing.md, gap: Spacing.lg, paddingBottom: Spacing.xxl },
  cragLabel: { fontSize: FontSize.md },
  sectionLabel: { fontSize: FontSize.xs, fontWeight: "600", letterSpacing: 1, textTransform: "uppercase" },

  categoryGrid: { flexDirection: "row", flexWrap: "wrap", gap: Spacing.sm },
  categoryChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
  },
  categoryChipText: { fontSize: FontSize.sm, fontWeight: "500" },
  categoryHint: { fontSize: FontSize.xs, lineHeight: 18, marginTop: -Spacing.xs },

  lostFoundSection: { gap: Spacing.sm },
  lostFoundToggle: { flexDirection: "row", gap: Spacing.sm },
  lostFoundButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.xs,
    paddingVertical: Spacing.sm + 2,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
  },
  lostFoundButtonText: { fontSize: FontSize.md, fontWeight: "500" },

  ratingsSection: { gap: Spacing.md },
  ratingRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  ratingLabel: { fontSize: FontSize.md, fontWeight: "500" },
  ratingButtons: { flexDirection: "row", gap: Spacing.xs },
  ratingButton: {
    width: 36,
    height: 36,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  ratingButtonText: { fontSize: FontSize.sm, fontWeight: "600" },

  textInput: {
    minHeight: 120,
    borderWidth: 1,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    fontSize: FontSize.md,
    lineHeight: 22,
  },

  submitButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.sm,
    paddingVertical: Spacing.sm + 4,
    borderRadius: BorderRadius.lg,
    height: 50,
  },
  submitText: { fontSize: FontSize.md, fontWeight: "600" },
});
