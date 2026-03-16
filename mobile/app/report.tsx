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

const CATEGORIES = [
  { key: "conditions", label: "Conditions", icon: "partly-sunny-outline" as const },
  { key: "safety", label: "Safety", icon: "warning-outline" as const },
  { key: "access", label: "Access", icon: "lock-closed-outline" as const },
  { key: "beta", label: "Beta", icon: "bulb-outline" as const },
  { key: "facilities", label: "Facilities", icon: "home-outline" as const },
  { key: "other", label: "Other", icon: "chatbubble-outline" as const },
];

export default function ReportScreen() {
  const { cragId, cragName } = useLocalSearchParams<{ cragId: string; cragName: string }>();
  const { colorScheme } = useTheme();
  const isDark = colorScheme === "dark";
  const colors = isDark ? Colors.dark : Colors.light;
  const router = useRouter();
  const { syncKeyHash } = useUserProfile();

  const [category, setCategory] = useState("conditions");
  const [text, setText] = useState("");
  const [ratingDry, setRatingDry] = useState(0);
  const [ratingWind, setRatingWind] = useState(0);
  const [ratingCrowds, setRatingCrowds] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isConditions = category === "conditions";

  async function handleSubmit() {
    if (!text.trim() && !isConditions) {
      Alert.alert("Required", "Please enter some text for your report.");
      return;
    }
    if (!cragId || !syncKeyHash) {
      Alert.alert("Error", "Missing crag or profile information.");
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
        },
        syncKeyHash
      );
      Alert.alert("Success", "Report submitted!", [
        { text: "OK", onPress: () => router.back() },
      ]);
    } catch (err) {
      Alert.alert("Error", err instanceof Error ? err.message : "Failed to submit report.");
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
            Report for <Text style={{ color: colors.text, fontWeight: "600" }}>{cragName}</Text>
          </Text>
        )}

        {/* Category picker */}
        <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>Category</Text>
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
                  {cat.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Condition ratings */}
        {isConditions && (
          <View style={styles.ratingsSection}>
            <RatingRow label="Dryness" value={ratingDry} onChange={setRatingDry} colors={colors} />
            <RatingRow label="Wind" value={ratingWind} onChange={setRatingWind} colors={colors} />
            <RatingRow label="Crowds" value={ratingCrowds} onChange={setRatingCrowds} colors={colors} />
          </View>
        )}

        {/* Text input */}
        <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>
          {isConditions ? "Details (optional)" : "Report"}
        </Text>
        <TextInput
          style={[styles.textInput, { color: colors.text, backgroundColor: colors.surface, borderColor: colors.border }]}
          value={text}
          onChangeText={setText}
          placeholder="Describe the conditions, situation, or beta..."
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
              <Text style={[styles.submitText, { color: colors.primaryForeground }]}>Submit Report</Text>
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
