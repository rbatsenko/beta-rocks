/**
 * Add Sector screen - create a new sector for an existing crag
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
import { supabase, isSupabaseConfigured } from "@/api/supabase";
import { useUserProfile } from "@/hooks/useUserProfile";
import { ROCK_TYPES } from "@/constants/config";
import { Colors, Spacing, FontSize, BorderRadius } from "@/constants/theme";
import { useTheme } from "@/contexts/ThemeContext";
import { useTranslation } from "react-i18next";

function generateSlug(name: string, parentName?: string): string {
  const base = parentName ? `${parentName}-${name}` : name;
  return base
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .substring(0, 80);
}

export default function AddSectorScreen() {
  const { cragId, cragName, parentRockType } = useLocalSearchParams<{
    cragId: string;
    cragName: string;
    parentRockType?: string;
  }>();
  const { colorScheme } = useTheme();
  const isDark = colorScheme === "dark";
  const colors = isDark ? Colors.dark : Colors.light;
  const router = useRouter();
  const { t } = useTranslation("common");
  const { hasProfile, syncKeyHash } = useUserProfile();

  const [name, setName] = useState("");
  const [rockType, setRockType] = useState(parentRockType || "unknown");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit() {
    if (!name.trim()) {
      Alert.alert(t("mobile.nameRequired", "Name is required"));
      return;
    }
    if (!cragId) {
      Alert.alert(t("errors.failedToLoadConditions", "Missing crag ID"));
      return;
    }
    if (!hasProfile || !syncKeyHash) {
      Alert.alert(t("mobile.profileRequired", "Profile Required"), t("mobile.setupProfileInSettings", "Please set up your profile in Settings to continue"));
      return;
    }
    if (!isSupabaseConfigured || !supabase) {
      Alert.alert(t("errors.failedToLoadConditions", "Service unavailable"));
      return;
    }

    setIsSubmitting(true);
    try {
      // Get parent crag coordinates to inherit
      const { data: parentCrag } = await supabase
        .from("crags")
        .select("lat, lon, country, state, municipality, village")
        .eq("id", cragId)
        .single();

      if (!parentCrag) {
        throw new Error("Parent crag not found");
      }

      const slug = generateSlug(name.trim(), cragName);
      const now = new Date().toISOString();

      const { error } = await supabase
        .from("crags")
        .insert({
          name: name.trim(),
          slug,
          lat: parentCrag.lat,
          lon: parentCrag.lon,
          country: parentCrag.country,
          state: parentCrag.state,
          municipality: parentCrag.municipality,
          village: parentCrag.village,
          rock_type: rockType !== "unknown" ? rockType : null,
          parent_crag_id: cragId,
          created_at: now,
          updated_at: now,
        })
        .select()
        .single();

      if (error) {
        if (error.code === "23505") {
          Alert.alert(t("mobile.sectorExists", "A sector with this name already exists in this crag."));
        } else {
          throw new Error(error.message);
        }
        return;
      }

      Alert.alert(
        t("mobile.sectorCreated", "Sector created"),
        t("mobile.sectorCreatedDescription", "{{name}} has been added to {{cragName}}", {
          name: name.trim(),
          cragName: cragName || "",
        }),
        [{ text: "OK", onPress: () => router.back() }]
      );
    } catch (err) {
      Alert.alert(
        t("mobile.createFailed", "Failed to create"),
        err instanceof Error ? err.message : t("mobile.createFailed", "Failed to create")
      );
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
          <Text style={[styles.parentLabel, { color: colors.textSecondary }]}>
            {t("mobile.addingSectorTo", "Adding sector to")}{" "}
            <Text style={{ color: colors.text, fontWeight: "600" }}>{cragName}</Text>
          </Text>
        )}

        {/* Name */}
        <View style={styles.fieldGroup}>
          <Text style={[styles.label, { color: colors.textSecondary }]}>{t("mobile.sectorName", "Sector Name")} *</Text>
          <TextInput
            style={[styles.input, { color: colors.text, backgroundColor: colors.surface, borderColor: colors.border }]}
            value={name}
            onChangeText={setName}
            placeholder={t("mobile.sectorNamePlaceholder", "e.g., Main Wall, Boulder Garden")}
            placeholderTextColor={colors.muted}
            autoFocus
          />
        </View>

        {/* Rock Type (optional override) */}
        <View style={styles.fieldGroup}>
          <Text style={[styles.label, { color: colors.textSecondary }]}>
            {t("mobile.rockType", "Rock Type")}
            {parentRockType && parentRockType !== "unknown" && (
              <Text style={{ fontWeight: "400", textTransform: "none" }}>
                {" "}({t("mobile.inheritedFrom", "inherited from parent")}: {parentRockType})
              </Text>
            )}
          </Text>
          <View style={styles.rockTypeGrid}>
            {ROCK_TYPES.map((rt) => {
              const isActive = rockType === rt;
              return (
                <TouchableOpacity
                  key={rt}
                  style={[
                    styles.rockTypeChip,
                    {
                      backgroundColor: isActive ? colors.primary : colors.surface,
                      borderColor: isActive ? colors.primary : colors.border,
                    },
                  ]}
                  onPress={() => setRockType(rt)}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.rockTypeText,
                      { color: isActive ? colors.primaryForeground : colors.text },
                    ]}
                  >
                    {rt.charAt(0).toUpperCase() + rt.slice(1)}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

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
              <Ionicons name="layers-outline" size={18} color={colors.primaryForeground} />
              <Text style={[styles.submitText, { color: colors.primaryForeground }]}>
                {t("mobile.createSector", "Create Sector")}
              </Text>
            </>
          )}
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: Spacing.md, gap: Spacing.lg, paddingBottom: Spacing.xxl },

  parentLabel: { fontSize: FontSize.md },

  fieldGroup: { gap: Spacing.xs },
  label: { fontSize: FontSize.xs, fontWeight: "600", letterSpacing: 0.5, textTransform: "uppercase" },
  input: {
    borderWidth: 1,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    fontSize: FontSize.md,
    height: 48,
  },

  rockTypeGrid: { flexDirection: "row", flexWrap: "wrap", gap: Spacing.sm },
  rockTypeChip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
  },
  rockTypeText: { fontSize: FontSize.sm, fontWeight: "500" },

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
