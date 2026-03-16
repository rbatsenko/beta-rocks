/**
 * Sync screen - restore profile from sync key
 */

import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useUserProfile } from "@/hooks/useUserProfile";
import { isValidSyncKey } from "@/lib/sync-key";
import { Colors, Spacing, FontSize, BorderRadius } from "@/constants/theme";
import { useTheme } from "@/contexts/ThemeContext";
import { useTranslation } from "react-i18next";

export default function SyncScreen() {
  const { colorScheme } = useTheme();
  const isDark = colorScheme === "dark";
  const colors = isDark ? Colors.dark : Colors.light;
  const router = useRouter();
  const { t } = useTranslation("common");
  const { restoreFromSyncKey } = useUserProfile();
  const [syncKey, setSyncKey] = useState("");
  const [isRestoring, setIsRestoring] = useState(false);

  async function handleRestore() {
    const key = syncKey.trim();
    if (!isValidSyncKey(key)) {
      Alert.alert(t("sync.page.invalidTitle", "Invalid Sync Key"), t("profileCreation.signIn.invalidKey", "Invalid sync key format. Please check and try again."));
      return;
    }

    setIsRestoring(true);
    try {
      const success = await restoreFromSyncKey(key);
      if (success) {
        Alert.alert(t("sync.page.restoreSuccess", "Sync key restored! Redirecting..."), "", [
          { text: "OK", onPress: () => router.back() },
        ]);
      } else {
        Alert.alert(t("sync.page.invalidTitle", "Invalid Sync Key"), t("sync.page.noKeyError", "No sync key found in URL"));
      }
    } catch {
      Alert.alert(t("sync.page.restoreError", "Failed to restore sync key. Please try again."));
    } finally {
      setIsRestoring(false);
    }
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.content}>
        <View style={styles.iconContainer}>
          <Ionicons name="sync-outline" size={48} color={colors.primary} />
        </View>

        <Text style={[styles.title, { color: colors.text }]}>
          {t("sync.page.restoreTitle", "Restore Your Data")}
        </Text>
        <Text style={[styles.description, { color: colors.textSecondary }]}>
          {t("sync.page.restoreDescription", "This will restore your favorites, chat history, and settings from another device")}
        </Text>

        <TextInput
          style={[
            styles.input,
            {
              color: colors.text,
              backgroundColor: colors.surface,
              borderColor: colors.border,
            },
          ]}
          value={syncKey}
          onChangeText={setSyncKey}
          placeholder="xxxxxxxx-xxxx-4xxx-xxxx-xxxxxxxxxxxx"
          placeholderTextColor={colors.muted}
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="off"
        />

        <TouchableOpacity
          style={[
            styles.restoreButton,
            {
              backgroundColor:
                syncKey.trim() && !isRestoring ? colors.primary : colors.muted,
            },
          ]}
          onPress={handleRestore}
          disabled={!syncKey.trim() || isRestoring}
        >
          {isRestoring ? (
            <ActivityIndicator color={colors.primaryForeground} />
          ) : (
            <Text style={[styles.restoreButtonText, { color: colors.primaryForeground }]}>
              {t("sync.page.restore", "Restore")}
            </Text>
          )}
        </TouchableOpacity>

        <Text style={[styles.hint, { color: colors.muted }]}>
          {t("sync.page.hint", "Find your sync key in the web app: Settings → Sync Key")}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: Spacing.xl,
    gap: Spacing.md,
    alignItems: "center",
  },
  iconContainer: {
    marginBottom: Spacing.md,
    marginTop: Spacing.xl,
  },
  title: {
    fontSize: FontSize.xl,
    fontWeight: "700",
    textAlign: "center",
  },
  description: {
    fontSize: FontSize.md,
    textAlign: "center",
    lineHeight: 22,
  },
  input: {
    width: "100%",
    borderWidth: 1,
    borderRadius: BorderRadius.lg,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm + 4,
    fontSize: FontSize.md,
    fontFamily: "monospace",
    marginTop: Spacing.md,
  },
  restoreButton: {
    width: "100%",
    paddingVertical: Spacing.sm + 4,
    borderRadius: BorderRadius.lg,
    alignItems: "center",
    justifyContent: "center",
    height: 48,
  },
  restoreButtonText: {
    fontSize: FontSize.md,
    fontWeight: "600",
  },
  hint: {
    fontSize: FontSize.xs,
    textAlign: "center",
    marginTop: Spacing.sm,
  },
});
