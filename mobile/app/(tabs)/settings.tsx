/**
 * Settings screen - user profile, theme, language, sync, and preferences
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

const THEME_OPTIONS: { value: ThemeMode; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { value: "system", label: "System", icon: "phone-portrait-outline" },
  { value: "light", label: "Light", icon: "sunny-outline" },
  { value: "dark", label: "Dark", icon: "moon-outline" },
];

export default function SettingsScreen() {
  const { colorScheme, themeMode, setThemeMode } = useTheme();
  const { language, setLanguage } = useLanguage();
  const isDark = colorScheme === "dark";
  const colors = isDark ? Colors.dark : Colors.light;
  const router = useRouter();
  const { profile, isLoading, updateDisplayName } = useUserProfile();
  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput] = useState("");
  const [showLanguagePicker, setShowLanguagePicker] = useState(false);

  const currentLanguageLabel =
    SUPPORTED_LANGUAGES.find((l) => l.code === language)?.label || "English";

  function handleEditName() {
    setNameInput(profile?.displayName || "");
    setEditingName(true);
  }

  async function handleSaveName() {
    await updateDisplayName(nameInput.trim());
    setEditingName(false);
  }

  function handleSyncPress() {
    router.push("/sync");
  }

  async function handleCopySyncKey() {
    if (profile?.syncKey) {
      await Clipboard.setStringAsync(profile.syncKey);
      Alert.alert("Copied", "Sync key copied to clipboard.");
    }
  }

  if (isLoading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <Text style={{ color: colors.textSecondary }}>Loading...</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.content}
    >
      {/* Profile Section */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
          PROFILE
        </Text>
        <View
          style={[
            styles.card,
            { backgroundColor: colors.card, borderColor: colors.cardBorder },
          ]}
        >
          <View style={styles.row}>
            <Ionicons name="person-outline" size={20} color={colors.primary} />
            <Text style={[styles.label, { color: colors.text }]}>
              Display Name
            </Text>
            {editingName ? (
              <View style={styles.editNameContainer}>
                <TextInput
                  style={[
                    styles.nameInput,
                    {
                      color: colors.text,
                      borderColor: colors.border,
                      backgroundColor: colors.surface,
                    },
                  ]}
                  value={nameInput}
                  onChangeText={setNameInput}
                  autoFocus
                  maxLength={30}
                  returnKeyType="done"
                  onSubmitEditing={handleSaveName}
                />
                <TouchableOpacity onPress={handleSaveName}>
                  <Ionicons
                    name="checkmark-circle"
                    size={24}
                    color={colors.success}
                  />
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity
                style={styles.valueContainer}
                onPress={handleEditName}
              >
                <Text style={[styles.value, { color: colors.textSecondary }]}>
                  {profile?.displayName || "Anonymous Climber"}
                </Text>
                <Ionicons
                  name="pencil-outline"
                  size={16}
                  color={colors.muted}
                />
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>

      {/* Appearance Section */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
          APPEARANCE
        </Text>
        <View
          style={[
            styles.card,
            { backgroundColor: colors.card, borderColor: colors.cardBorder },
          ]}
        >
          {/* Theme selector */}
          <View style={[styles.row, { paddingBottom: Spacing.sm }]}>
            <Ionicons name="color-palette-outline" size={20} color={colors.primary} />
            <Text style={[styles.label, { color: colors.text }]}>Theme</Text>
          </View>
          <View style={styles.segmentedControl}>
            {THEME_OPTIONS.map((option) => {
              const isActive = themeMode === option.value;
              return (
                <TouchableOpacity
                  key={option.value}
                  style={[
                    styles.segment,
                    {
                      backgroundColor: isActive ? colors.primary : "transparent",
                      borderColor: colors.border,
                    },
                  ]}
                  onPress={() => setThemeMode(option.value)}
                  activeOpacity={0.7}
                >
                  <Ionicons
                    name={option.icon}
                    size={16}
                    color={isActive ? colors.primaryForeground : colors.textSecondary}
                  />
                  <Text
                    style={[
                      styles.segmentText,
                      {
                        color: isActive ? colors.primaryForeground : colors.textSecondary,
                      },
                    ]}
                  >
                    {option.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <View style={[styles.divider, { backgroundColor: colors.border, marginLeft: 0 }]} />

          {/* Language selector */}
          <TouchableOpacity
            style={styles.row}
            onPress={() => setShowLanguagePicker(!showLanguagePicker)}
          >
            <Ionicons name="language-outline" size={20} color={colors.primary} />
            <Text style={[styles.label, { color: colors.text }]}>Language</Text>
            <Text style={[styles.value, { color: colors.textSecondary }]}>
              {currentLanguageLabel}
            </Text>
            <Ionicons
              name={showLanguagePicker ? "chevron-up" : "chevron-down"}
              size={16}
              color={colors.muted}
            />
          </TouchableOpacity>

          {showLanguagePicker && (
            <View style={[styles.languageList, { borderTopColor: colors.border }]}>
              {SUPPORTED_LANGUAGES.map((lang) => {
                const isActive = language === lang.code;
                return (
                  <TouchableOpacity
                    key={lang.code}
                    style={[
                      styles.languageItem,
                      isActive && { backgroundColor: colors.surface },
                    ]}
                    onPress={() => {
                      setLanguage(lang.code as LanguageCode);
                      setShowLanguagePicker(false);
                    }}
                    activeOpacity={0.7}
                  >
                    <Text
                      style={[
                        styles.languageText,
                        { color: isActive ? colors.primary : colors.text },
                        isActive && { fontWeight: "600" },
                      ]}
                    >
                      {lang.label}
                    </Text>
                    {isActive && (
                      <Ionicons name="checkmark" size={18} color={colors.primary} />
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
        </View>
      </View>

      {/* Sync Section */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
          SYNC
        </Text>
        <View
          style={[
            styles.card,
            { backgroundColor: colors.card, borderColor: colors.cardBorder },
          ]}
        >
          <TouchableOpacity style={styles.row} onPress={handleCopySyncKey}>
            <Ionicons name="key-outline" size={20} color={colors.primary} />
            <Text style={[styles.label, { color: colors.text }]}>
              Sync Key
            </Text>
            <Text style={[styles.value, { color: colors.textSecondary }]}>
              {profile?.syncKey
                ? formatSyncKeyForDisplay(profile.syncKey)
                : "\u2014"}
            </Text>
            <Ionicons name="copy-outline" size={16} color={colors.muted} />
          </TouchableOpacity>

          <View style={[styles.divider, { backgroundColor: colors.border }]} />

          <TouchableOpacity style={styles.row} onPress={handleSyncPress}>
            <Ionicons
              name="sync-outline"
              size={20}
              color={colors.primary}
            />
            <Text style={[styles.label, { color: colors.text }]}>
              Restore from Sync Key
            </Text>
            <Ionicons
              name="chevron-forward"
              size={20}
              color={colors.muted}
            />
          </TouchableOpacity>
        </View>

        <Text style={[styles.hint, { color: colors.muted }]}>
          Use your sync key to restore your profile, favorites, and chat history
          on this device. Find your key on beta.rocks web app under Settings.
        </Text>
      </View>

      {/* About Section */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
          ABOUT
        </Text>
        <View
          style={[
            styles.card,
            { backgroundColor: colors.card, borderColor: colors.cardBorder },
          ]}
        >
          <View style={styles.row}>
            <Ionicons
              name="information-circle-outline"
              size={20}
              color={colors.primary}
            />
            <Text style={[styles.label, { color: colors.text }]}>Version</Text>
            <Text style={[styles.value, { color: colors.textSecondary }]}>
              {APP_VERSION}
            </Text>
          </View>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: Spacing.md,
    gap: Spacing.lg,
    paddingBottom: Spacing.xxl,
  },
  section: {
    gap: Spacing.sm,
  },
  sectionTitle: {
    fontSize: FontSize.xs,
    fontWeight: "600",
    letterSpacing: 1,
    marginLeft: Spacing.xs,
  },
  card: {
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    overflow: "hidden",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  label: {
    flex: 1,
    fontSize: FontSize.md,
  },
  value: {
    fontSize: FontSize.sm,
  },
  valueContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
  },
  editNameContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  nameInput: {
    fontSize: FontSize.md,
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    minWidth: 150,
  },
  divider: {
    height: 1,
    marginLeft: Spacing.xl + Spacing.md,
  },
  hint: {
    fontSize: FontSize.xs,
    marginHorizontal: Spacing.xs,
    lineHeight: 18,
  },
  segmentedControl: {
    flexDirection: "row",
    marginHorizontal: Spacing.md,
    marginBottom: Spacing.md,
    gap: Spacing.sm,
  },
  segment: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.xs,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
  },
  segmentText: {
    fontSize: FontSize.sm,
    fontWeight: "500",
  },
  languageList: {
    borderTopWidth: 1,
    maxHeight: 300,
  },
  languageItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm + 2,
  },
  languageText: {
    fontSize: FontSize.md,
  },
});
