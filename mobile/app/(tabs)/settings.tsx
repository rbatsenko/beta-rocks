/**
 * Settings screen - user profile, sync, and preferences
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
  useColorScheme,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useUserProfile } from "@/hooks/useUserProfile";
import { formatSyncKeyForDisplay } from "@/lib/sync-key";
import { APP_VERSION } from "@/constants/config";
import { Colors, Spacing, FontSize, BorderRadius } from "@/constants/theme";

export default function SettingsScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const colors = isDark ? Colors.dark : Colors.light;
  const router = useRouter();
  const { profile, isLoading, updateDisplayName } = useUserProfile();
  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput] = useState("");

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

  function handleCopySyncKey() {
    if (profile?.syncKey) {
      // In a real app, use Clipboard API
      Alert.alert("Sync Key", profile.syncKey, [{ text: "OK" }]);
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
                : "—"}
            </Text>
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
});
