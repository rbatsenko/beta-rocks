/**
 * Add Crag screen - create a new crag via Supabase
 * Presented as a modal
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
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { supabase, isSupabaseConfigured } from "@/api/supabase";
import { useUserProfile } from "@/hooks/useUserProfile";
import { ROCK_TYPES } from "@/constants/config";
import { Colors, Spacing, FontSize, BorderRadius } from "@/constants/theme";
import { useTheme } from "@/contexts/ThemeContext";
import { useTranslation } from "react-i18next";

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .substring(0, 80);
}

export default function AddCragScreen() {
  const { colorScheme } = useTheme();
  const isDark = colorScheme === "dark";
  const colors = isDark ? Colors.dark : Colors.light;
  const router = useRouter();
  const { t } = useTranslation("common");
  const { hasProfile, syncKeyHash } = useUserProfile();

  const [name, setName] = useState("");
  const [country, setCountry] = useState("");
  const [state, setState] = useState("");
  const [municipality, setMunicipality] = useState("");
  const [village, setVillage] = useState("");
  const [rockType, setRockType] = useState("unknown");
  const [latitude, setLatitude] = useState("");
  const [longitude, setLongitude] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit() {
    if (!name.trim()) {
      Alert.alert(t("mobile.nameRequired", "Name is required"));
      return;
    }
    if (!latitude.trim() || !longitude.trim()) {
      Alert.alert(t("mobile.coordinatesRequired", "Latitude and longitude are required"));
      return;
    }
    const lat = parseFloat(latitude);
    const lon = parseFloat(longitude);
    if (isNaN(lat) || isNaN(lon) || lat < -90 || lat > 90 || lon < -180 || lon > 180) {
      Alert.alert(t("mobile.invalidCoordinates", "Please enter valid coordinates"));
      return;
    }
    if (!hasProfile || !syncKeyHash) {
      Alert.alert(t("mobile.profileRequired", "Profile Required"));
      return;
    }
    if (!isSupabaseConfigured || !supabase) {
      Alert.alert(t("errors.failedToLoadConditions", "Service unavailable"));
      return;
    }

    setIsSubmitting(true);
    try {
      const slug = generateSlug(name.trim());
      const now = new Date().toISOString();

      const { data, error } = await supabase
        .from("crags")
        .insert({
          name: name.trim(),
          slug,
          lat,
          lon,
          country: country.trim() || null,
          state: state.trim() || null,
          municipality: municipality.trim() || null,
          village: village.trim() || null,
          rock_type: rockType !== "unknown" ? rockType : null,
          created_at: now,
          updated_at: now,
        })
        .select()
        .single();

      if (error) {
        if (error.code === "23505") {
          Alert.alert(t("mobile.cragExists", "A crag with this name already exists. Try a different name."));
        } else {
          throw new Error(error.message);
        }
        return;
      }

      Alert.alert(
        t("mobile.cragCreated", "Crag created"),
        t("mobile.cragCreatedDescription", "{{name}} has been added successfully", { name: name.trim() }),
        [
          {
            text: t("mobile.viewCrag", "View Crag"),
            onPress: () => {
              router.back();
              if (data?.slug) {
                setTimeout(() => router.push(`/crag/${data.slug}`), 300);
              }
            },
          },
          { text: "OK", onPress: () => router.back() },
        ]
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
        {/* Name */}
        <View style={styles.fieldGroup}>
          <Text style={[styles.label, { color: colors.textSecondary }]}>{t("mobile.cragName", "Crag Name")} *</Text>
          <TextInput
            style={[styles.input, { color: colors.text, backgroundColor: colors.surface, borderColor: colors.border }]}
            value={name}
            onChangeText={setName}
            placeholder={t("mobile.cragNamePlaceholder", "e.g., Magic Wood")}
            placeholderTextColor={colors.muted}
            autoFocus
          />
        </View>

        {/* Country */}
        <View style={styles.fieldGroup}>
          <Text style={[styles.label, { color: colors.textSecondary }]}>{t("mobile.country", "Country")}</Text>
          <TextInput
            style={[styles.input, { color: colors.text, backgroundColor: colors.surface, borderColor: colors.border }]}
            value={country}
            onChangeText={setCountry}
            placeholder={t("mobile.countryPlaceholder", "e.g., CH or Switzerland")}
            placeholderTextColor={colors.muted}
            autoCapitalize="characters"
            maxLength={50}
          />
        </View>

        {/* State / Municipality / Village in a row */}
        <View style={styles.rowFields}>
          <View style={[styles.fieldGroup, { flex: 1 }]}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>{t("mobile.state", "State")}</Text>
            <TextInput
              style={[styles.input, { color: colors.text, backgroundColor: colors.surface, borderColor: colors.border }]}
              value={state}
              onChangeText={setState}
              placeholderTextColor={colors.muted}
            />
          </View>
          <View style={[styles.fieldGroup, { flex: 1 }]}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>{t("mobile.municipality", "Municipality")}</Text>
            <TextInput
              style={[styles.input, { color: colors.text, backgroundColor: colors.surface, borderColor: colors.border }]}
              value={municipality}
              onChangeText={setMunicipality}
              placeholderTextColor={colors.muted}
            />
          </View>
        </View>

        <View style={styles.fieldGroup}>
          <Text style={[styles.label, { color: colors.textSecondary }]}>{t("mobile.village", "Village")}</Text>
          <TextInput
            style={[styles.input, { color: colors.text, backgroundColor: colors.surface, borderColor: colors.border }]}
            value={village}
            onChangeText={setVillage}
            placeholderTextColor={colors.muted}
          />
        </View>

        {/* Rock Type */}
        <View style={styles.fieldGroup}>
          <Text style={[styles.label, { color: colors.textSecondary }]}>{t("mobile.rockType", "Rock Type")}</Text>
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

        {/* Coordinates */}
        <View style={styles.rowFields}>
          <View style={[styles.fieldGroup, { flex: 1 }]}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>{t("mobile.latitude", "Latitude")} *</Text>
            <TextInput
              style={[styles.input, { color: colors.text, backgroundColor: colors.surface, borderColor: colors.border }]}
              value={latitude}
              onChangeText={setLatitude}
              placeholder="46.3522"
              placeholderTextColor={colors.muted}
              keyboardType="decimal-pad"
            />
          </View>
          <View style={[styles.fieldGroup, { flex: 1 }]}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>{t("mobile.longitude", "Longitude")} *</Text>
            <TextInput
              style={[styles.input, { color: colors.text, backgroundColor: colors.surface, borderColor: colors.border }]}
              value={longitude}
              onChangeText={setLongitude}
              placeholder="9.2649"
              placeholderTextColor={colors.muted}
              keyboardType="decimal-pad"
            />
          </View>
        </View>

        <Text style={[styles.hint, { color: colors.muted }]}>
          {t("mobile.coordinatesHint", "Tip: You can find coordinates from Google Maps by long-pressing a location.")}
        </Text>

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
              <Ionicons name="add-circle-outline" size={18} color={colors.primaryForeground} />
              <Text style={[styles.submitText, { color: colors.primaryForeground }]}>
                {t("mobile.createCrag", "Create Crag")}
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

  fieldGroup: { gap: Spacing.xs },
  label: { fontSize: FontSize.xs, fontWeight: "600", letterSpacing: 0.5, textTransform: "uppercase" },
  input: {
    borderWidth: 1,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    fontSize: FontSize.md,
    height: 48,
  },

  rowFields: { flexDirection: "row", gap: Spacing.md },

  rockTypeGrid: { flexDirection: "row", flexWrap: "wrap", gap: Spacing.sm },
  rockTypeChip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
  },
  rockTypeText: { fontSize: FontSize.sm, fontWeight: "500" },

  hint: { fontSize: FontSize.xs, lineHeight: 18 },

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
