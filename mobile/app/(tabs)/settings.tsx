/**
 * Settings screen - profile, theme, language, units, sync
 */

import { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  ScrollView,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as Clipboard from "expo-clipboard";
import { useUserProfile } from "@/hooks/useUserProfile";
import { useTheme, type ThemeMode } from "@/contexts/ThemeContext";
import {
  useLanguage,
  SUPPORTED_LANGUAGES,
  type LanguageCode,
} from "@/contexts/LanguageContext";
import { formatSyncKeyForDisplay } from "@/lib/sync-key";
import { APP_VERSION } from "@/constants/config";
import { Colors, Spacing, FontSize, BorderRadius } from "@/constants/theme";
import { useTranslation } from "react-i18next";
import type { UnitsConfig } from "@/types/api";

const THEME_OPTIONS: { value: ThemeMode; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { value: "system", label: "System", icon: "phone-portrait-outline" },
  { value: "light", label: "Light", icon: "sunny-outline" },
  { value: "dark", label: "Dark", icon: "moon-outline" },
];

const UNIT_SYSTEMS = [
  { key: "metric", label: "Metric (°C, km/h, mm)" },
  { key: "imperial", label: "Imperial (°F, mph, in)" },
] as const;

export default function SettingsScreen() {
  const { colorScheme, themeMode, setThemeMode } = useTheme();
  const { language, setLanguage } = useLanguage();
  const isDark = colorScheme === "dark";
  const colors = isDark ? Colors.dark : Colors.light;
  const router = useRouter();
  const { t } = useTranslation("common");
  const {
    profile,
    isLoading,
    hasProfile,
    stats,
    createProfile,
    updateDisplayName,
    updateUnits,
    signOut,
  } = useUserProfile();

  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput] = useState("");
  const [showLanguagePicker, setShowLanguagePicker] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [createNameInput, setCreateNameInput] = useState("");

  const currentLanguageLabel =
    SUPPORTED_LANGUAGES.find((l) => l.code === language)?.label || "English";

  const currentUnits = profile?.units?.temperature === "fahrenheit" ? "imperial" : "metric";

  async function handleCreateProfile() {
    setIsCreating(true);
    const success = await createProfile(createNameInput.trim() || undefined);
    setIsCreating(false);
    if (success) {
      Alert.alert(
        t("profileCreated.title"),
        t("profileCreated.description"),
      );
    } else {
      Alert.alert("Error", "Failed to create profile. Please try again.");
    }
  }

  function handleEditName() {
    setNameInput(profile?.displayName || "");
    setEditingName(true);
  }

  async function handleSaveName() {
    await updateDisplayName(nameInput.trim());
    setEditingName(false);
  }

  async function handleCopySyncKey() {
    if (profile?.syncKey) {
      await Clipboard.setStringAsync(profile.syncKey);
      Alert.alert(t("settings.syncKey.copy"), t("settings.syncKey.description"));
    }
  }

  function handleUnitToggle() {
    const newUnits: UnitsConfig =
      currentUnits === "metric"
        ? { temperature: "fahrenheit", windSpeed: "mph", precipitation: "inches", distance: "miles", elevation: "feet" }
        : { temperature: "celsius", windSpeed: "kmh", precipitation: "mm", distance: "km", elevation: "meters" };
    updateUnits(newUnits);
  }

  async function handleSignOut() {
    Alert.alert("Sign Out", "This will remove your profile from this device. You can restore it later with your sync key.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign Out",
        style: "destructive",
        onPress: async () => {
          await signOut();
        },
      },
    ]);
  }

  if (isLoading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <ActivityIndicator style={{ marginTop: Spacing.xxl }} color={colors.primary} />
      </View>
    );
  }

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.content}
    >
      {/* No profile — show create / restore */}
      {!hasProfile && (
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>{t("profileCreation.title").toUpperCase()}</Text>
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
            <Text style={[styles.createTitle, { color: colors.text }]}>
              {t("profileCreation.subtitle")}
            </Text>
            <TextInput
              style={[styles.nameInput, { color: colors.text, borderColor: colors.border, backgroundColor: colors.surface }]}
              value={createNameInput}
              onChangeText={setCreateNameInput}
              placeholder={t("settings.displayName.placeholder")}
              placeholderTextColor={colors.muted}
              maxLength={30}
            />
            <TouchableOpacity
              style={[styles.primaryButton, { backgroundColor: colors.primary }]}
              onPress={handleCreateProfile}
              disabled={isCreating}
            >
              {isCreating ? (
                <ActivityIndicator color={colors.primaryForeground} />
              ) : (
                <Text style={[styles.primaryButtonText, { color: colors.primaryForeground }]}>{t("profileCreation.title")}</Text>
              )}
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.secondaryButton, { borderColor: colors.border }]}
              onPress={() => router.push("/sync")}
            >
              <Ionicons name="sync-outline" size={18} color={colors.primary} />
              <Text style={[styles.secondaryButtonText, { color: colors.primary }]}>{t("settings.syncKey.restoreTitle")}</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Profile info (when signed in) */}
      {hasProfile && (
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>{t("profile.title", "PROFILE").toUpperCase()}</Text>
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
            <View style={styles.row}>
              <Ionicons name="person-outline" size={20} color={colors.primary} />
              <Text style={[styles.label, { color: colors.text }]}>{t("settings.displayName.label")}</Text>
              {editingName ? (
                <View style={styles.editRow}>
                  <TextInput
                    style={[styles.inlineInput, { color: colors.text, borderColor: colors.border, backgroundColor: colors.surface }]}
                    value={nameInput}
                    onChangeText={setNameInput}
                    autoFocus
                    maxLength={30}
                    returnKeyType="done"
                    onSubmitEditing={handleSaveName}
                  />
                  <TouchableOpacity onPress={handleSaveName}>
                    <Ionicons name="checkmark-circle" size={24} color={colors.success} />
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity style={styles.valueRow} onPress={handleEditName}>
                  <Text style={[styles.value, { color: colors.textSecondary }]}>
                    {profile?.displayName || t("profile.anonymous", "Anonymous")}
                  </Text>
                  <Ionicons name="pencil-outline" size={16} color={colors.muted} />
                </TouchableOpacity>
              )}
            </View>

            <View style={[styles.divider, { backgroundColor: colors.border }]} />

            <TouchableOpacity style={styles.row} onPress={handleCopySyncKey}>
              <Ionicons name="key-outline" size={20} color={colors.primary} />
              <Text style={[styles.label, { color: colors.text }]}>{t("settings.syncKey.title")}</Text>
              <Text style={[styles.value, { color: colors.textSecondary }]}>
                {profile?.syncKey ? formatSyncKeyForDisplay(profile.syncKey) : "\u2014"}
              </Text>
              <Ionicons name="copy-outline" size={16} color={colors.muted} />
            </TouchableOpacity>

            <View style={[styles.divider, { backgroundColor: colors.border }]} />

            <TouchableOpacity style={styles.row} onPress={handleSignOut}>
              <Ionicons name="log-out-outline" size={20} color={colors.destructive} />
              <Text style={[styles.label, { color: colors.destructive }]}>{t("settings.dangerZone.deleteProfile", "Sign Out")}</Text>
            </TouchableOpacity>
          </View>
          <Text style={[styles.hint, { color: colors.muted }]}>
            {t("settings.syncKey.description")}
          </Text>
        </View>
      )}

      {/* Stats */}
      {hasProfile && stats && (
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>{t("profile.stats", "STATS").toUpperCase()}</Text>
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
            <View style={styles.statsGrid}>
              <View style={styles.statItem}>
                <Ionicons name="document-text-outline" size={20} color={colors.primary} />
                <Text style={[styles.statValue, { color: colors.text }]}>{stats.reportsPosted}</Text>
                <Text style={[styles.statLabel, { color: colors.textSecondary }]}>{t("feed.reports", "Reports")}</Text>
              </View>
              <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
              <View style={styles.statItem}>
                <Ionicons name="thumbs-up-outline" size={20} color={colors.primary} />
                <Text style={[styles.statValue, { color: colors.text }]}>{stats.confirmationsGiven}</Text>
                <Text style={[styles.statLabel, { color: colors.textSecondary }]}>{t("feed.votes", "Votes")}</Text>
              </View>
              <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
              <View style={styles.statItem}>
                <Ionicons name="heart-outline" size={20} color={colors.primary} />
                <Text style={[styles.statValue, { color: colors.text }]}>{stats.favoritesCount}</Text>
                <Text style={[styles.statLabel, { color: colors.textSecondary }]}>{t("profile.favorites")}</Text>
              </View>
            </View>
          </View>
        </View>
      )}

      {/* Units */}
      {hasProfile && (
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>{t("settings.units.title").toUpperCase()}</Text>
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
            <View style={styles.segmentedControl}>
              {UNIT_SYSTEMS.map((sys) => {
                const isActive = currentUnits === sys.key;
                return (
                  <TouchableOpacity
                    key={sys.key}
                    style={[styles.segment, {
                      backgroundColor: isActive ? colors.primary : "transparent",
                      borderColor: colors.border,
                    }]}
                    onPress={handleUnitToggle}
                  >
                    <Text style={[styles.segmentText, { color: isActive ? colors.primaryForeground : colors.textSecondary }]}>
                      {sys.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        </View>
      )}

      {/* Appearance */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>{t("settings.appearance", "APPEARANCE").toUpperCase()}</Text>
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
          <View style={[styles.row, { paddingBottom: Spacing.sm }]}>
            <Ionicons name="color-palette-outline" size={20} color={colors.primary} />
            <Text style={[styles.label, { color: colors.text }]}>{t("settings.theme", "Theme")}</Text>
          </View>
          <View style={styles.segmentedControl}>
            {THEME_OPTIONS.map((option) => {
              const isActive = themeMode === option.value;
              return (
                <TouchableOpacity
                  key={option.value}
                  style={[styles.segment, {
                    backgroundColor: isActive ? colors.primary : "transparent",
                    borderColor: colors.border,
                  }]}
                  onPress={() => setThemeMode(option.value)}
                >
                  <Ionicons name={option.icon} size={16} color={isActive ? colors.primaryForeground : colors.textSecondary} />
                  <Text style={[styles.segmentText, { color: isActive ? colors.primaryForeground : colors.textSecondary }]}>
                    {option.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <View style={[styles.divider, { backgroundColor: colors.border, marginLeft: 0 }]} />

          <TouchableOpacity style={styles.row} onPress={() => setShowLanguagePicker(!showLanguagePicker)}>
            <Ionicons name="language-outline" size={20} color={colors.primary} />
            <Text style={[styles.label, { color: colors.text }]}>{t("settings.language", "Language")}</Text>
            <Text style={[styles.value, { color: colors.textSecondary }]}>{currentLanguageLabel}</Text>
            <Ionicons name={showLanguagePicker ? "chevron-up" : "chevron-down"} size={16} color={colors.muted} />
          </TouchableOpacity>

          {showLanguagePicker && (
            <ScrollView style={[styles.languageList, { borderTopColor: colors.border }]} nestedScrollEnabled>
              {SUPPORTED_LANGUAGES.map((lang) => {
                const isActive = language === lang.code;
                return (
                  <TouchableOpacity
                    key={lang.code}
                    style={[styles.languageItem, isActive && { backgroundColor: colors.surface }]}
                    onPress={() => { setLanguage(lang.code as LanguageCode); setShowLanguagePicker(false); }}
                  >
                    <Text style={[styles.languageText, { color: isActive ? colors.primary : colors.text }, isActive && { fontWeight: "600" }]}>
                      {lang.label}
                    </Text>
                    {isActive && <Ionicons name="checkmark" size={18} color={colors.primary} />}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          )}
        </View>
      </View>

      {/* About */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>{t("settings.about", "ABOUT").toUpperCase()}</Text>
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
          <View style={styles.row}>
            <Ionicons name="information-circle-outline" size={20} color={colors.primary} />
            <Text style={[styles.label, { color: colors.text }]}>{t("settings.version", "Version")}</Text>
            <Text style={[styles.value, { color: colors.textSecondary }]}>{APP_VERSION}</Text>
          </View>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: Spacing.md, gap: Spacing.lg, paddingBottom: Spacing.xxl },

  section: { gap: Spacing.sm },
  sectionTitle: { fontSize: FontSize.xs, fontWeight: "600", letterSpacing: 1, marginLeft: Spacing.xs },
  card: { borderRadius: BorderRadius.lg, borderWidth: 1, overflow: "hidden" },

  createTitle: { fontSize: FontSize.md, fontWeight: "500", padding: Spacing.md, paddingBottom: Spacing.sm },
  nameInput: { marginHorizontal: Spacing.md, borderWidth: 1, borderRadius: BorderRadius.md, paddingHorizontal: Spacing.sm, paddingVertical: Spacing.sm, fontSize: FontSize.md },
  primaryButton: { margin: Spacing.md, marginTop: Spacing.sm, alignItems: "center", paddingVertical: Spacing.sm + 4, borderRadius: BorderRadius.lg, height: 48, justifyContent: "center" },
  primaryButtonText: { fontSize: FontSize.md, fontWeight: "600" },
  secondaryButton: { marginHorizontal: Spacing.md, marginBottom: Spacing.md, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: Spacing.sm, paddingVertical: Spacing.sm + 2, borderRadius: BorderRadius.lg, borderWidth: 1 },
  secondaryButtonText: { fontSize: FontSize.sm, fontWeight: "500" },

  row: { flexDirection: "row", alignItems: "center", padding: Spacing.md, gap: Spacing.sm },
  label: { flex: 1, fontSize: FontSize.md },
  value: { fontSize: FontSize.sm },
  valueRow: { flexDirection: "row", alignItems: "center", gap: Spacing.xs },
  editRow: { flexDirection: "row", alignItems: "center", gap: Spacing.sm },
  inlineInput: { fontSize: FontSize.md, borderWidth: 1, borderRadius: BorderRadius.md, paddingHorizontal: Spacing.sm, paddingVertical: Spacing.xs, minWidth: 150 },
  divider: { height: 1, marginLeft: Spacing.xl + Spacing.md },
  hint: { fontSize: FontSize.xs, marginHorizontal: Spacing.xs, lineHeight: 18 },

  segmentedControl: { flexDirection: "row", marginHorizontal: Spacing.md, marginTop: Spacing.sm, marginBottom: Spacing.md, gap: Spacing.sm },
  segment: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: Spacing.xs, paddingVertical: Spacing.sm, borderRadius: BorderRadius.md, borderWidth: 1 },
  segmentText: { fontSize: FontSize.xs, fontWeight: "500" },

  statsGrid: { flexDirection: "row", alignItems: "center", padding: Spacing.md },
  statItem: { flex: 1, alignItems: "center", gap: Spacing.xs },
  statValue: { fontSize: FontSize.xl, fontWeight: "700" },
  statLabel: { fontSize: FontSize.xs, fontWeight: "500" },
  statDivider: { width: 1, height: 48 },

  languageList: { borderTopWidth: 1, maxHeight: 300 },
  languageItem: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm + 2 },
  languageText: { fontSize: FontSize.md },
});
