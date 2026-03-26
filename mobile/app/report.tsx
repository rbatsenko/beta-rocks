/**
 * Report creation/editing screen - submit or edit a report for a crag
 * Presented as a modal from the crag detail screen
 *
 * Features:
 * - Category selection with visual chips
 * - Condition ratings (dryness, wind, crowds)
 * - Lost & found type toggle
 * - Photo upload (up to 3 photos from gallery or camera)
 * - Edit mode when reportId is provided
 */

import { useState, useEffect } from "react";
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
  Image,
  ActionSheetIOS,
} from "react-native";
import { useLocalSearchParams, useRouter, useNavigation } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import DateTimePicker from "@react-native-community/datetimepicker";
import { createReport } from "@/api/client";
import { supabase, isSupabaseConfigured } from "@/api/supabase";
import { useUserProfile } from "@/hooks/useUserProfile";
import { SUPABASE_URL, CATEGORY_COLORS } from "@/constants/config";
import { Colors, Spacing, FontSize, BorderRadius } from "@/constants/theme";
import { useTheme } from "@/contexts/ThemeContext";
import { useTranslation } from "react-i18next";

const CATEGORIES = [
  { key: "conditions", labelKey: "reports.categories.conditions", icon: "partly-sunny-outline" as const },
  { key: "safety", labelKey: "reports.categories.safety", icon: "warning-outline" as const },
  { key: "access", labelKey: "reports.categories.access", icon: "lock-closed-outline" as const },
  { key: "climbing_info", labelKey: "reports.categories.climbing_info", icon: "trail-sign-outline" as const },
  { key: "facilities", labelKey: "reports.categories.facilities", icon: "home-outline" as const },
  { key: "lost_found", labelKey: "reports.categories.lost_found", icon: "search-outline" as const },
  { key: "other", labelKey: "reports.categories.other", icon: "chatbubble-outline" as const },
];

const MAX_PHOTOS = 3;
const PHOTO_BASE_URL = SUPABASE_URL ? `${SUPABASE_URL}/storage/v1/object/public/report-photos/` : "";

export default function ReportScreen() {
  const {
    cragId,
    cragName,
    reportId,
    editCategory,
    editText,
    editRatingDry,
    editRatingWind,
    editRatingCrowds,
    editPhotos,
    editLostFoundType,
  } = useLocalSearchParams<{
    cragId: string;
    cragName: string;
    reportId?: string;
    editCategory?: string;
    editText?: string;
    editRatingDry?: string;
    editRatingWind?: string;
    editRatingCrowds?: string;
    editPhotos?: string;
    editLostFoundType?: string;
  }>();
  const { colorScheme } = useTheme();
  const isDark = colorScheme === "dark";
  const colors = isDark ? Colors.dark : Colors.light;
  const router = useRouter();
  const navigation = useNavigation();
  const { t } = useTranslation("common");
  const { syncKeyHash, profileId } = useUserProfile();

  const isEditMode = Boolean(reportId);

  // Update header title for edit mode
  useEffect(() => {
    if (isEditMode) {
      navigation.setOptions({ title: t("reports.editReport", "Edit Report") });
    }
  }, [isEditMode, navigation, t]);

  const [category, setCategory] = useState(editCategory || "conditions");
  const [text, setText] = useState(editText || "");
  const [ratingDry, setRatingDry] = useState(editRatingDry ? parseInt(editRatingDry) : 0);
  const [ratingWind, setRatingWind] = useState(editRatingWind ? parseInt(editRatingWind) : 0);
  const [ratingCrowds, setRatingCrowds] = useState(editRatingCrowds ? parseInt(editRatingCrowds) : 0);
  const [lostFoundType, setLostFoundType] = useState<"lost" | "found">(
    (editLostFoundType as "lost" | "found") || "lost"
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [observedAt, setObservedAt] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);

  // Photo state: existing paths (from edit) and new local URIs
  const [existingPhotoPaths, setExistingPhotoPaths] = useState<string[]>([]);
  const [newPhotoUris, setNewPhotoUris] = useState<string[]>([]);

  useEffect(() => {
    if (editPhotos) {
      try {
        const parsed = JSON.parse(editPhotos);
        if (Array.isArray(parsed)) setExistingPhotoPaths(parsed);
      } catch {}
    }
  }, [editPhotos]);

  const totalPhotos = existingPhotoPaths.length + newPhotoUris.length;
  const isConditions = category === "conditions";
  const isLostFound = category === "lost_found";

  async function pickPhoto(source: "camera" | "gallery") {
    if (totalPhotos >= MAX_PHOTOS) {
      Alert.alert(t("reports.maxPhotos", "Maximum photos"), t("reports.maxPhotosDescription", `You can add up to ${MAX_PHOTOS} photos per report.`));
      return;
    }

    const permResult = source === "camera"
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permResult.granted) {
      Alert.alert(
        t("reports.permissionRequired", "Permission required"),
        source === "camera"
          ? t("reports.cameraPermission", "Camera permission is needed to take photos.")
          : t("reports.galleryPermission", "Photo library access is needed to select photos.")
      );
      return;
    }

    const result = source === "camera"
      ? await ImagePicker.launchCameraAsync({
          mediaTypes: ["images"],
          quality: 0.7,
          allowsEditing: true,
          aspect: [4, 3],
        })
      : await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ["images"],
          quality: 0.7,
          allowsMultipleSelection: true,
          selectionLimit: MAX_PHOTOS - totalPhotos,
        });

    if (result.canceled) return;

    const uris = result.assets.map((a) => a.uri).slice(0, MAX_PHOTOS - totalPhotos);
    setNewPhotoUris((prev) => [...prev, ...uris]);
  }

  function showPhotoOptions() {
    if (Platform.OS === "ios") {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: [t("common.cancel", "Cancel"), t("reports.takePhoto", "Take Photo"), t("reports.chooseFromGallery", "Choose from Gallery")],
          cancelButtonIndex: 0,
        },
        (buttonIndex) => {
          if (buttonIndex === 1) pickPhoto("camera");
          if (buttonIndex === 2) pickPhoto("gallery");
        }
      );
    } else {
      Alert.alert(t("reports.addPhotos", "Add Photos"), undefined, [
        { text: t("reports.takePhoto", "Take Photo"), onPress: () => pickPhoto("camera") },
        { text: t("reports.chooseFromGallery", "Choose from Gallery"), onPress: () => pickPhoto("gallery") },
        { text: t("common.cancel", "Cancel"), style: "cancel" },
      ]);
    }
  }

  function removeExistingPhoto(index: number) {
    setExistingPhotoPaths((prev) => prev.filter((_, i) => i !== index));
  }

  function removeNewPhoto(index: number) {
    setNewPhotoUris((prev) => prev.filter((_, i) => i !== index));
  }

  async function uploadPhotos(): Promise<string[]> {
    if (!isSupabaseConfigured || !supabase || !profileId || newPhotoUris.length === 0) {
      return [];
    }

    const paths: string[] = [];
    for (const uri of newPhotoUris) {
      const random = Math.random().toString(36).substring(2, 8);
      const fileName = `${profileId}-${Date.now()}-${random}.jpg`;
      const storagePath = `reports/${fileName}`;

      // Use XMLHttpRequest blob approach — works reliably in all RN builds
      const blob = await new Promise<Blob>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.onload = () => resolve(xhr.response);
        xhr.onerror = () => reject(new Error("Failed to read photo"));
        xhr.responseType = "blob";
        xhr.open("GET", uri, true);
        xhr.send(null);
      });

      const { error } = await supabase.storage
        .from("report-photos")
        .upload(storagePath, blob, {
          contentType: "image/jpeg",
          upsert: false,
        });

      if (error) {
        console.warn("Photo upload failed:", error.message);
        throw new Error(t("reports.photoUploadFailed", "Failed to upload photo. Please try again."));
      }
      paths.push(storagePath);
    }
    return paths;
  }

  async function handleSubmit() {
    if (!text.trim() && !isConditions) {
      Alert.alert(t("reports.detailsRequired", "Please provide details about this report"));
      return;
    }
    if (!cragId || !syncKeyHash || !profileId) {
      Alert.alert(t("errors.failedToLoadConditions", "Failed to load conditions. Please try again."));
      return;
    }

    setIsSubmitting(true);
    try {
      // Upload new photos first
      const uploadedPaths = await uploadPhotos();
      const allPhotoPaths = [...existingPhotoPaths, ...uploadedPaths];

      if (isEditMode && reportId) {
        // Edit mode - update via Supabase directly
        if (!isSupabaseConfigured || !supabase) {
          throw new Error("Supabase not configured");
        }

        const updateData: Record<string, unknown> = {
          category,
          text: text.trim(),
          rating_dry: isConditions && ratingDry > 0 ? ratingDry : null,
          rating_wind: isConditions && ratingWind > 0 ? ratingWind : null,
          rating_crowds: isConditions && ratingCrowds > 0 ? ratingCrowds : null,
          lost_found_type: isLostFound ? lostFoundType : null,
          observed_at: observedAt.toISOString(),
          updated_at: new Date().toISOString(),
        };

        if (allPhotoPaths.length > 0) {
          updateData.photos = allPhotoPaths;
        } else {
          updateData.photos = [];
        }

        const { error } = await supabase
          .from("reports")
          .update(updateData)
          .eq("id", reportId);

        if (error) throw new Error(error.message);

        Alert.alert(
          t("reports.reportUpdated", "Report updated"),
          t("reports.reportUpdatedDescription", "Your report has been updated successfully"),
          [{ text: "OK", onPress: () => router.back() }]
        );
      } else {
        // Create mode
        const report = await createReport(
          {
            cragId,
            category: category as any,
            text: text.trim(),
            ...(isConditions && ratingDry > 0 && { rating_dry: ratingDry }),
            ...(isConditions && ratingWind > 0 && { rating_wind: ratingWind }),
            ...(isConditions && ratingCrowds > 0 && { rating_crowds: ratingCrowds }),
            ...(isLostFound && { lost_found_type: lostFoundType }),
            observed_at: observedAt.toISOString(),
          },
          profileId,
          syncKeyHash
        );

        // Update photos column via Supabase if we have photos
        if (allPhotoPaths.length > 0 && isSupabaseConfigured && supabase && report?.id) {
          await supabase
            .from("reports")
            .update({ photos: allPhotoPaths })
            .eq("id", report.id);
        }

        Alert.alert(
          t("reports.reportCreated", "Report created"),
          t("reports.reportCreatedDescription", "Your report has been posted successfully"),
          [{ text: "OK", onPress: () => router.back() }]
        );
      }
    } catch (err) {
      Alert.alert(
        t("reports.submitFailed", "Submit failed"),
        err instanceof Error ? err.message : t("reports.submitFailed", "Submit failed")
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
          <Text style={[styles.cragLabel, { color: colors.textSecondary }]}>
            {isEditMode
              ? t("reports.editReportDescription", "Edit your report for {{cragName}}", { cragName: "" })
              : t("reports.addReportDescription", "Share information about {{cragName}}", { cragName: "" })}
            {" "}
            <Text style={{ color: colors.text, fontWeight: "600" }}>{cragName}</Text>
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
            <RatingRow
              label={t("reports.dryness", "Dryness")}
              lowHint={t("reports.scales.veryWet", "Very wet")}
              highHint={t("reports.scales.veryDry", "Perfect")}
              value={ratingDry}
              onChange={setRatingDry}
              colors={colors}
              getColor={(n) => n >= 4 ? "#22c55e" : n <= 2 ? "#ef4444" : "#f97316"}
            />
            <RatingRow
              label={t("reports.wind", "Wind")}
              lowHint={t("reports.scales.veryWindy", "Calm")}
              highHint={t("reports.scales.calm", "Very windy")}
              value={ratingWind}
              onChange={setRatingWind}
              colors={colors}
            />
            <RatingRow
              label={t("reports.crowds", "Crowds")}
              lowHint={t("reports.scales.empty", "Empty")}
              highHint={t("reports.scales.veryCrowded", "Very crowded")}
              value={ratingCrowds}
              onChange={setRatingCrowds}
              colors={colors}
              getColor={(n) => n <= 2 ? "#22c55e" : n >= 4 ? "#ef4444" : "#f97316"}
            />
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
                      {t(`reports.lostFoundTypes.${type}`, type === "lost" ? "Lost" : "Found")}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        )}

        {/* Observation date */}
        <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>
          {t("reports.observedAt", "When did you observe this?")}
        </Text>
        <TouchableOpacity
          style={[styles.dateButton, { backgroundColor: colors.surface, borderColor: colors.border }]}
          onPress={() => setShowDatePicker(true)}
          activeOpacity={0.7}
        >
          <Ionicons name="calendar-outline" size={18} color={colors.primary} />
          <Text style={[styles.dateText, { color: colors.text }]}>
            {observedAt.toLocaleString(undefined, { weekday: "short", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit", hour12: false })}
          </Text>
          <Text style={[styles.dateHint, { color: colors.muted }]}>
            {observedAt.toDateString() === new Date().toDateString() ? t("dialog.today", "Today") : ""}
          </Text>
        </TouchableOpacity>
        {showDatePicker && (
          <>
            <DateTimePicker
              value={observedAt}
              mode="datetime"
              display={Platform.OS === "ios" ? "spinner" : "default"}
              maximumDate={new Date()}
              minimumDate={new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)}
              onChange={(_, date) => {
                if (Platform.OS !== "ios") setShowDatePicker(false);
                if (date) setObservedAt(date);
              }}
            />
            {Platform.OS === "ios" && (
              <TouchableOpacity
                style={[styles.datePickerDone, { backgroundColor: colors.primary }]}
                onPress={() => setShowDatePicker(false)}
              >
                <Text style={{ color: colors.primaryForeground, fontWeight: "600" }}>
                  {t("common.done", "Done")}
                </Text>
              </TouchableOpacity>
            )}
          </>
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

        {/* Photos section */}
        <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>
          {t("reports.photos", "Photos")} ({totalPhotos}/{MAX_PHOTOS})
        </Text>
        <View style={styles.photoRow}>
          {/* Existing photos (from edit mode) */}
          {existingPhotoPaths.map((path, i) => (
            <View key={`existing-${i}`} style={styles.photoThumb}>
              <Image
                source={{ uri: `${PHOTO_BASE_URL}${path}` }}
                style={styles.photoImage}
                resizeMode="cover"
              />
              <TouchableOpacity
                style={[styles.photoRemove, { backgroundColor: colors.destructive }]}
                onPress={() => removeExistingPhoto(i)}
              >
                <Ionicons name="close" size={14} color="#fff" />
              </TouchableOpacity>
            </View>
          ))}
          {/* New photos (local URIs) */}
          {newPhotoUris.map((uri, i) => (
            <View key={`new-${i}`} style={styles.photoThumb}>
              <Image
                source={{ uri }}
                style={styles.photoImage}
                resizeMode="cover"
              />
              <TouchableOpacity
                style={[styles.photoRemove, { backgroundColor: colors.destructive }]}
                onPress={() => removeNewPhoto(i)}
              >
                <Ionicons name="close" size={14} color="#fff" />
              </TouchableOpacity>
            </View>
          ))}
          {/* Add photo button */}
          {totalPhotos < MAX_PHOTOS && (
            <TouchableOpacity
              style={[styles.addPhotoButton, { backgroundColor: colors.surface, borderColor: colors.border }]}
              onPress={showPhotoOptions}
              activeOpacity={0.7}
            >
              <Ionicons name="camera-outline" size={24} color={colors.muted} />
              <Text style={[styles.addPhotoText, { color: colors.muted }]}>
                {t("reports.addPhotos", "Add Photos")}
              </Text>
            </TouchableOpacity>
          )}
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
              <Ionicons name={isEditMode ? "checkmark" : "send"} size={18} color={colors.primaryForeground} />
              <Text style={[styles.submitText, { color: colors.primaryForeground }]}>
                {isEditMode
                  ? t("reports.updateReport", "Update Report")
                  : t("reports.submitReport", "Submit Report")}
              </Text>
            </>
          )}
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function RatingRow({
  label,
  lowHint,
  highHint,
  value,
  onChange,
  colors,
  getColor,
}: {
  label: string;
  lowHint?: string;
  highHint?: string;
  value: number;
  onChange: (v: number) => void;
  colors: (typeof Colors)["light"];
  getColor?: (n: number) => string;
}) {
  return (
    <View style={styles.ratingSection}>
      <Text style={[styles.ratingLabel, { color: colors.text }]}>{label}</Text>
      {lowHint && highHint && (
        <View style={styles.ratingHints}>
          <Text style={[styles.ratingHint, { color: colors.muted }]}>{lowHint}</Text>
          <Text style={[styles.ratingHint, { color: colors.muted }]}>{highHint}</Text>
        </View>
      )}
      <View style={styles.ratingButtons}>
        {[1, 2, 3, 4, 5].map((n) => {
          const isActive = value === n;
          const activeColor = getColor ? getColor(n) : colors.primary;
          return (
            <TouchableOpacity
              key={n}
              style={[
                styles.ratingButton,
                {
                  backgroundColor: isActive ? activeColor : colors.surface,
                  borderColor: isActive ? activeColor : colors.border,
                },
              ]}
              onPress={() => onChange(value === n ? 0 : n)}
            >
              <Text style={[styles.ratingButtonText, { color: isActive ? "#fff" : colors.text }]}>
                {n}
              </Text>
            </TouchableOpacity>
          );
        })}
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
  categoryHint: { fontSize: FontSize.xs, lineHeight: 18, marginTop: -Spacing.md },
  dateButton: { flexDirection: "row", alignItems: "center", gap: Spacing.sm, paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm + 2, borderRadius: BorderRadius.lg, borderWidth: 1 },
  dateText: { fontSize: FontSize.md, flex: 1 },
  dateHint: { fontSize: FontSize.sm },
  datePickerDone: { alignSelf: "flex-end", paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, borderRadius: BorderRadius.md },

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

  ratingsSection: { gap: Spacing.lg },
  ratingSection: { gap: Spacing.xs },
  ratingLabel: { fontSize: FontSize.md, fontWeight: "500" },
  ratingHints: { flexDirection: "row", justifyContent: "space-between" },
  ratingHint: { fontSize: FontSize.xs },
  ratingButtons: { flexDirection: "row", gap: Spacing.sm },
  ratingButton: {
    flex: 1,
    height: 42,
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

  // Photos
  photoRow: { flexDirection: "row", flexWrap: "wrap", gap: Spacing.sm },
  photoThumb: { width: 100, height: 100, borderRadius: BorderRadius.md, overflow: "hidden" },
  photoImage: { width: "100%", height: "100%" },
  photoRemove: {
    position: "absolute",
    top: 4,
    right: 4,
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
  },
  addPhotoButton: {
    width: 100,
    height: 100,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderStyle: "dashed",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
  },
  addPhotoText: { fontSize: FontSize.xs, textAlign: "center" },

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
