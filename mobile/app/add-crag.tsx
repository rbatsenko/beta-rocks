/**
 * Add Crag screen - create a new crag via the API
 * Presented as a modal, matching the web AddCragModal features:
 * - Interactive map picker with location search
 * - Secret crag toggle
 * - Reverse geocoding auto-fill
 * - Country selector, state, municipality, village
 * - Rock type, aspects, climbing types selection
 * - Description field
 * - Nearby crags detection/warning
 * - Submits via /api/crags/submit (same as web)
 */

import { useState, useEffect, useRef } from "react";
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
import { submitCrag, checkNearbyCrags, reverseGeocode } from "@/api/client";
import { useUserProfile } from "@/hooks/useUserProfile";
import { CragLocationPicker } from "@/components/CragLocationPicker";
import { ROCK_TYPES, CLIMBING_TYPES, ASPECTS } from "@/constants/config";
import { Colors, Spacing, FontSize, BorderRadius } from "@/constants/theme";
import { useTheme } from "@/contexts/ThemeContext";
import { useTranslation } from "react-i18next";

export default function AddCragScreen() {
  const { colorScheme } = useTheme();
  const isDark = colorScheme === "dark";
  const colors = isDark ? Colors.dark : Colors.light;
  const router = useRouter();
  const { t } = useTranslation("common");
  const { hasProfile, syncKeyHash } = useUserProfile();

  // Form state
  const [position, setPosition] = useState<{ latitude: number; longitude: number } | null>(null);
  const [name, setName] = useState("");
  const [country, setCountry] = useState("");
  const [state, setState] = useState("");
  const [municipality, setMunicipality] = useState("");
  const [village, setVillage] = useState("");
  const [rockType, setRockType] = useState("");
  const [selectedAspects, setSelectedAspects] = useState<number[]>([]);
  const [selectedClimbingTypes, setSelectedClimbingTypes] = useState<string[]>([]);
  const [description, setDescription] = useState("");
  const [isSecret, setIsSecret] = useState(false);
  const [isLocationless, setIsLocationless] = useState(false);

  // Loading states
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGeocoding, setIsGeocoding] = useState(false);

  // Nearby crags
  const [nearbyCrags, setNearbyCrags] = useState<
    Array<{ id: string; name: string; lat: number; lon: number; slug: string; distance?: number }>
  >([]);

  // Track previous position to avoid duplicate geocoding
  const prevPositionRef = useRef<string>("");

  // Reverse geocode and check nearby crags when position changes (from map)
  useEffect(() => {
    if (!position) {
      setNearbyCrags([]);
      return;
    }

    const posKey = `${position.latitude.toFixed(6)},${position.longitude.toFixed(6)}`;
    if (posKey === prevPositionRef.current) return;
    prevPositionRef.current = posKey;

    const { latitude: lat, longitude: lon } = position;

    // Check nearby crags
    checkNearbyCrags(lat, lon, 500)
      .then((result) => setNearbyCrags(result.nearbyCrags || []))
      .catch((err) => console.warn("checkNearbyCrags failed:", err));

    // Reverse geocode to auto-fill location fields
    setIsGeocoding(true);
    reverseGeocode(lat, lon)
      .then((result) => {
        if (result.success && result.data.formatted) {
          const { formatted } = result.data;
          setName((prev) => prev || formatted.suggestedName || "");
          setCountry((prev) => prev || formatted.country || "");
          setState((prev) => prev || formatted.state || "");
          setMunicipality((prev) => prev || formatted.municipality || "");
          setVillage((prev) => prev || formatted.village || "");
        }
      })
      .catch((err) => console.warn("reverseGeocode failed:", err))
      .finally(() => setIsGeocoding(false));
  }, [position?.latitude, position?.longitude]);

  const toggleAspect = (aspect: number) => {
    setSelectedAspects((prev) =>
      prev.includes(aspect) ? prev.filter((a) => a !== aspect) : [...prev, aspect]
    );
  };

  const toggleClimbingType = (type: string) => {
    setSelectedClimbingTypes((prev) =>
      prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]
    );
  };

  async function handleSubmit() {
    if (!name.trim()) {
      Alert.alert(t("addCragModal.errors.nameRequired", "Name is required"));
      return;
    }
    if (!isLocationless && !position) {
      Alert.alert(
        t("addCragModal.errors.locationRequired", "Location is required"),
        isSecret
          ? t("addCragModal.secretCrag.locationRequiredDesc", "Please select a nearby reference city on the map.")
          : t("addCragModal.errors.locationRequiredDesc", "Please tap the map to set the crag location.")
      );
      return;
    }
    if (!isLocationless && (!country.trim() || country.trim().length < 2)) {
      Alert.alert(
        t("addCragModal.errors.countryRequired", "Country is required"),
        t("addCragModal.errors.countryRequiredDesc", "Please enter a 2-letter country code (e.g., CH, US, FR).")
      );
      return;
    }
    if (!hasProfile || !syncKeyHash) {
      Alert.alert(t("mobile.profileRequired", "Profile Required"), t("mobile.setupProfileInSettings", "Please set up your profile in Settings to continue"));
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await submitCrag(
        {
          name: name.trim(),
          lat: isLocationless ? undefined : position!.latitude,
          lon: isLocationless ? undefined : position!.longitude,
          country: isLocationless ? (country.trim() ? (() => {
            const code = country.trim().substring(0, 2).toUpperCase();
            if (/^[A-Z]{2}$/.test(code)) return code;
            return undefined;
          })() : undefined) : (() => {
            const code = country.trim().substring(0, 2).toUpperCase();
            if (/^[A-Z]{2}$/.test(code)) return code;
            return "";
          })(),
          state: state.trim() || undefined,
          municipality: municipality.trim() || undefined,
          village: village.trim() || undefined,
          rockType: rockType || undefined,
          aspects: selectedAspects.length > 0 ? selectedAspects : undefined,
          climbingTypes: selectedClimbingTypes.length > 0 ? selectedClimbingTypes : undefined,
          description: description.trim() || undefined,
          isSecret: isSecret || undefined,
          isLocationless: isLocationless || undefined,
        },
        syncKeyHash
      );

      Alert.alert(
        t("addCragModal.success", "Crag created"),
        t("addCragModal.successDesc", "{{name}} has been added successfully", {
          name: result.crag.name,
        }),
        [
          {
            text: t("mobile.viewCrag", "View Crag"),
            onPress: () => {
              router.back();
              if (result.crag?.slug) {
                setTimeout(() => router.push(`/crag/${result.crag.slug}`), 300);
              }
            },
          },
          { text: "OK", onPress: () => router.back() },
        ]
      );
    } catch (err) {
      Alert.alert(
        t("addCragModal.errors.failed", "Failed to create crag"),
        err instanceof Error ? err.message : t("addCragModal.errors.failedDesc", "Please try again.")
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  const canSubmit = name.trim() && (isLocationless || (position && country.trim().length >= 2)) && !isSubmitting && !isGeocoding;

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={90}
    >
      <ScrollView contentContainerStyle={styles.content}>
        {/* Secret Crag Toggle */}
        <TouchableOpacity
          style={[
            styles.secretToggle,
            {
              backgroundColor: isSecret
                ? isDark ? "rgba(217,119,6,0.15)" : "#fffbeb"
                : colors.surface,
              borderColor: isSecret
                ? isDark ? "rgba(217,119,6,0.4)" : "#fcd34d"
                : "transparent",
            },
          ]}
          onPress={() => setIsSecret(!isSecret)}
          activeOpacity={0.7}
        >
          <View
            style={[
              styles.secretIconCircle,
              {
                backgroundColor: isSecret
                  ? isDark ? "rgba(217,119,6,0.3)" : "#fde68a"
                  : colors.border,
              },
            ]}
          >
            <Ionicons
              name="eye-off-outline"
              size={20}
              color={isSecret ? (isDark ? "#fbbf24" : "#92400e") : colors.muted}
            />
          </View>
          <View style={styles.secretTextContainer}>
            <View style={styles.secretLabelRow}>
              <Text style={[styles.secretLabel, { color: isSecret ? (isDark ? "#fef3c7" : "#78350f") : colors.text }]}>
                {t("addCragModal.secretCrag.label", "Secret Crag")}
              </Text>
              {isSecret && (
                <View style={[styles.secretBadge, { backgroundColor: isDark ? "rgba(217,119,6,0.3)" : "#fde68a" }]}>
                  <Text style={[styles.secretBadgeText, { color: isDark ? "#fde68a" : "#92400e" }]}>ON</Text>
                </View>
              )}
            </View>
            <Text style={[styles.secretHint, { color: colors.muted }]}>
              {t("addCragModal.secretCrag.hint", "Hide exact location. Use a nearby reference city for weather data.")}
            </Text>
          </View>
        </TouchableOpacity>

        {/* Locationless Crag Toggle */}
        <TouchableOpacity
          style={[
            styles.secretToggle,
            {
              backgroundColor: isLocationless
                ? isDark ? "rgba(147,51,234,0.15)" : "#faf5ff"
                : colors.surface,
              borderColor: isLocationless
                ? isDark ? "rgba(147,51,234,0.4)" : "#d8b4fe"
                : "transparent",
            },
          ]}
          onPress={() => {
            setIsLocationless(!isLocationless);
            if (!isLocationless) {
              // Switching to locationless: clear position data
              setIsSecret(false);
            }
          }}
          activeOpacity={0.7}
        >
          <View
            style={[
              styles.secretIconCircle,
              {
                backgroundColor: isLocationless
                  ? isDark ? "rgba(147,51,234,0.3)" : "#e9d5ff"
                  : colors.border,
              },
            ]}
          >
            <Ionicons
              name="location-outline"
              size={20}
              color={isLocationless ? (isDark ? "#d8b4fe" : "#6b21a8") : colors.muted}
            />
          </View>
          <View style={styles.secretTextContainer}>
            <View style={styles.secretLabelRow}>
              <Text style={[styles.secretLabel, { color: isLocationless ? (isDark ? "#f3e8ff" : "#581c87") : colors.text }]}>
                {t("addCragModal.locationless.label", "No Location")}
              </Text>
              {isLocationless && (
                <View style={[styles.secretBadge, { backgroundColor: isDark ? "rgba(147,51,234,0.3)" : "#e9d5ff" }]}>
                  <Text style={[styles.secretBadgeText, { color: isDark ? "#d8b4fe" : "#6b21a8" }]}>ON</Text>
                </View>
              )}
            </View>
            <Text style={[styles.secretHint, { color: colors.muted }]}>
              {t("addCragModal.locationless.hint", "For crags with sensitive access. No weather data — only community reports.")}
            </Text>
          </View>
        </TouchableOpacity>

        {/* Map Location Picker (hidden for locationless crags) */}
        {!isLocationless && (
        <View style={styles.fieldGroup}>
          <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>
            {isSecret
              ? t("addCragModal.secretCrag.mapLabel", "Reference City Location")
              : t("addCragModal.mapLabel", "Crag Location")}{" "}
            *
          </Text>
          <CragLocationPicker
            position={position}
            onPositionChange={setPosition}
            loading={isGeocoding}
            nearbyCrags={nearbyCrags}
            isSecret={isSecret}
          />
        </View>
        )}

        {/* Nearby Crags Warning (hidden for locationless crags) */}
        {!isLocationless && nearbyCrags.length > 0 && (
          <View
            style={[
              styles.warningBox,
              {
                backgroundColor: isDark ? "rgba(234,179,8,0.08)" : "#fefce8",
                borderColor: isDark ? "rgba(234,179,8,0.3)" : "#fde68a",
              },
            ]}
          >
            <View style={styles.warningHeader}>
              <Ionicons
                name="warning-outline"
                size={20}
                color={isDark ? "#facc15" : "#ca8a04"}
              />
              <View style={styles.warningTextContainer}>
                <Text style={[styles.warningTitle, { color: isDark ? "#fef9c3" : "#713f12" }]}>
                  {t("addCragModal.nearbyCragsWarning.title", "Nearby crags found")}
                </Text>
                <Text style={[styles.warningMessage, { color: isDark ? "#fef08a" : "#854d0e" }]}>
                  {t("addCragModal.nearbyCragsWarning.message", "Found {{count}} crag(s) within 500m of this location.", {
                    count: nearbyCrags.length,
                  })}
                </Text>
              </View>
            </View>
            {nearbyCrags.map((crag) => (
              <View
                key={crag.id}
                style={[
                  styles.nearbyCragItem,
                  {
                    backgroundColor: isDark ? colors.surface : "#ffffff",
                    borderColor: isDark ? "rgba(234,179,8,0.3)" : "#fde68a",
                  },
                ]}
              >
                <View style={styles.nearbyCragInfo}>
                  <Text style={[styles.nearbyCragName, { color: colors.text }]} numberOfLines={1}>
                    {crag.name}
                  </Text>
                  {crag.distance !== undefined && (
                    <Text style={[styles.nearbyCragDistance, { color: colors.muted }]}>
                      {crag.distance}m {t("addCragModal.nearbyCragsWarning.away", "away")}
                    </Text>
                  )}
                </View>
                <TouchableOpacity
                  onPress={() => {
                    router.back();
                    setTimeout(() => router.push(`/crag/${crag.slug}`), 300);
                  }}
                >
                  <Text style={[styles.viewLink, { color: colors.primary }]}>
                    {t("addCragModal.nearbyCragsWarning.view", "View")}
                  </Text>
                </TouchableOpacity>
              </View>
            ))}
            <Text style={[styles.warningProceed, { color: isDark ? "#fde68a" : "#a16207" }]}>
              {t("addCragModal.nearbyCragsWarning.proceed", "If this is a different crag, you can proceed.")}
            </Text>
          </View>
        )}

        {/* Name */}
        <View style={styles.fieldGroup}>
          <Text style={[styles.label, { color: colors.textSecondary }]}>
            {t("addCragModal.form.name", "Crag Name")} *
          </Text>
          <TextInput
            style={[styles.input, { color: colors.text, backgroundColor: colors.surface, borderColor: colors.border }]}
            value={name}
            onChangeText={setName}
            placeholder={t("addCragModal.form.namePlaceholder", "e.g., Magic Wood")}
            placeholderTextColor={colors.muted}
          />
        </View>

        {/* Country & State */}
        <View style={styles.rowFields}>
          <View style={[styles.fieldGroup, { flex: 1 }]}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>
              {t("addCragModal.form.country", "Country")}{isLocationless ? "" : " *"}
            </Text>
            <TextInput
              style={[styles.input, { color: colors.text, backgroundColor: colors.surface, borderColor: colors.border }]}
              value={country}
              onChangeText={setCountry}
              placeholder={t("addCragModal.form.countryPlaceholder", "e.g., CH")}
              placeholderTextColor={colors.muted}
              autoCapitalize="characters"
              maxLength={2}
            />
          </View>
          <View style={[styles.fieldGroup, { flex: 1 }]}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>
              {t("addCragModal.form.state", "State / Region")}
            </Text>
            <TextInput
              style={[styles.input, { color: colors.text, backgroundColor: colors.surface, borderColor: colors.border }]}
              value={state}
              onChangeText={setState}
              placeholder={t("addCragModal.form.statePlaceholder", "e.g., Graubünden")}
              placeholderTextColor={colors.muted}
            />
          </View>
        </View>

        {/* Municipality & Village */}
        <View style={styles.rowFields}>
          <View style={[styles.fieldGroup, { flex: 1 }]}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>
              {t("addCragModal.form.municipality", "Municipality")}
            </Text>
            <TextInput
              style={[styles.input, { color: colors.text, backgroundColor: colors.surface, borderColor: colors.border }]}
              value={municipality}
              onChangeText={setMunicipality}
              placeholder={t("addCragModal.form.municipalityPlaceholder", "")}
              placeholderTextColor={colors.muted}
            />
          </View>
          <View style={[styles.fieldGroup, { flex: 1 }]}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>
              {t("addCragModal.form.village", "Village")}
            </Text>
            <TextInput
              style={[styles.input, { color: colors.text, backgroundColor: colors.surface, borderColor: colors.border }]}
              value={village}
              onChangeText={setVillage}
              placeholder={t("addCragModal.form.villagePlaceholder", "")}
              placeholderTextColor={colors.muted}
            />
          </View>
        </View>

        {/* Rock Type */}
        <View style={styles.fieldGroup}>
          <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>
            {t("addCragModal.form.rockType", "Rock Type")}
          </Text>
          <View style={styles.chipGrid}>
            {ROCK_TYPES.map((rt) => {
              const isActive = rockType === rt;
              return (
                <TouchableOpacity
                  key={rt}
                  style={[
                    styles.chip,
                    {
                      backgroundColor: isActive ? colors.primary : colors.surface,
                      borderColor: isActive ? colors.primary : colors.border,
                    },
                  ]}
                  onPress={() => setRockType(isActive ? "" : rt)}
                  activeOpacity={0.7}
                >
                  {isActive && (
                    <Ionicons name="checkmark" size={14} color={colors.primaryForeground} style={{ marginRight: 2 }} />
                  )}
                  <Text
                    style={[
                      styles.chipText,
                      { color: isActive ? colors.primaryForeground : colors.text },
                    ]}
                  >
                    {t(`addCragModal.rockTypes.${rt}`, rt.charAt(0).toUpperCase() + rt.slice(1))}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Aspects */}
        <View style={styles.fieldGroup}>
          <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>
            {t("addCragModal.form.aspects", "Wall Aspects")}
          </Text>
          <Text style={[styles.hint, { color: colors.muted }]}>
            {t("addCragModal.form.aspectsHelp", "Select the direction(s) the wall faces")}
          </Text>
          <View style={styles.chipGrid}>
            {ASPECTS.map((aspect) => {
              const isActive = selectedAspects.includes(aspect.value);
              return (
                <TouchableOpacity
                  key={aspect.value}
                  style={[
                    styles.chip,
                    {
                      backgroundColor: isActive ? colors.primary : colors.surface,
                      borderColor: isActive ? colors.primary : colors.border,
                    },
                  ]}
                  onPress={() => toggleAspect(aspect.value)}
                  activeOpacity={0.7}
                >
                  {isActive && (
                    <Ionicons name="checkmark" size={14} color={colors.primaryForeground} style={{ marginRight: 2 }} />
                  )}
                  <Text
                    style={[
                      styles.chipText,
                      { color: isActive ? colors.primaryForeground : colors.text },
                    ]}
                  >
                    {aspect.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Climbing Types */}
        <View style={styles.fieldGroup}>
          <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>
            {t("addCragModal.form.climbingTypes", "Climbing Types")}
          </Text>
          <Text style={[styles.hint, { color: colors.muted }]}>
            {t("addCragModal.form.climbingTypesHelp", "Select all climbing types available")}
          </Text>
          <View style={styles.chipGrid}>
            {CLIMBING_TYPES.map((type) => {
              const isActive = selectedClimbingTypes.includes(type);
              return (
                <TouchableOpacity
                  key={type}
                  style={[
                    styles.chip,
                    {
                      backgroundColor: isActive ? colors.primary : colors.surface,
                      borderColor: isActive ? colors.primary : colors.border,
                    },
                  ]}
                  onPress={() => toggleClimbingType(type)}
                  activeOpacity={0.7}
                >
                  {isActive && (
                    <Ionicons name="checkmark" size={14} color={colors.primaryForeground} style={{ marginRight: 2 }} />
                  )}
                  <Text
                    style={[
                      styles.chipText,
                      { color: isActive ? colors.primaryForeground : colors.text },
                    ]}
                  >
                    {t(`addCragModal.climbingTypes.${type}`, type.charAt(0).toUpperCase() + type.slice(1))}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Description */}
        <View style={styles.fieldGroup}>
          <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>
            {t("addCragModal.form.description", "Description")}
          </Text>
          <TextInput
            style={[styles.textArea, { color: colors.text, backgroundColor: colors.surface, borderColor: colors.border }]}
            value={description}
            onChangeText={(text) => setDescription(text.substring(0, 5000))}
            placeholder={t("addCragModal.form.descriptionPlaceholder", "Describe the crag, approach, parking, etc.")}
            placeholderTextColor={colors.muted}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />
          <Text style={[styles.charCount, { color: colors.muted }]}>
            {description.length} / 5000
          </Text>
        </View>

        {/* Submit */}
        <TouchableOpacity
          style={[styles.submitButton, { backgroundColor: canSubmit ? colors.primary : colors.muted }]}
          onPress={handleSubmit}
          disabled={!canSubmit}
          activeOpacity={0.7}
        >
          {isSubmitting ? (
            <ActivityIndicator color={colors.primaryForeground} />
          ) : (
            <>
              <Ionicons name="add-circle-outline" size={18} color={colors.primaryForeground} />
              <Text style={[styles.submitText, { color: colors.primaryForeground }]}>
                {t("addCragModal.submit", "Add Crag")}
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
  sectionLabel: { fontSize: FontSize.xs, fontWeight: "600", letterSpacing: 1, textTransform: "uppercase" },
  input: {
    borderWidth: 1,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    fontSize: FontSize.md,
    height: 48,
  },
  textArea: {
    minHeight: 100,
    borderWidth: 1,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    fontSize: FontSize.md,
    lineHeight: 22,
  },

  rowFields: { flexDirection: "row", gap: Spacing.md },

  hint: { fontSize: FontSize.xs, lineHeight: 18 },
  charCount: { fontSize: FontSize.xs, textAlign: "right" },

  chipGrid: { flexDirection: "row", flexWrap: "wrap", gap: Spacing.sm },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
  },
  chipText: { fontSize: FontSize.sm, fontWeight: "500" },

  // Secret crag toggle
  secretToggle: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: Spacing.md,
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: 2,
  },
  secretIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  secretTextContainer: { flex: 1 },
  secretLabelRow: { flexDirection: "row", alignItems: "center", gap: Spacing.sm },
  secretLabel: { fontSize: FontSize.md, fontWeight: "500" },
  secretBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.full,
  },
  secretBadgeText: { fontSize: FontSize.xs, fontWeight: "600" },
  secretHint: { fontSize: FontSize.xs, marginTop: 4, lineHeight: 18 },

  // Nearby crags warning
  warningBox: {
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    gap: Spacing.sm,
  },
  warningHeader: { flexDirection: "row", alignItems: "flex-start", gap: Spacing.sm },
  warningTextContainer: { flex: 1 },
  warningTitle: { fontSize: FontSize.sm, fontWeight: "600", marginBottom: 2 },
  warningMessage: { fontSize: FontSize.sm },
  nearbyCragItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: Spacing.sm,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
  },
  nearbyCragInfo: { flex: 1 },
  nearbyCragName: { fontSize: FontSize.sm, fontWeight: "500" },
  nearbyCragDistance: { fontSize: FontSize.xs },
  viewLink: { fontSize: FontSize.sm, fontWeight: "600" },
  warningProceed: { fontSize: FontSize.xs, marginTop: Spacing.xs },

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
