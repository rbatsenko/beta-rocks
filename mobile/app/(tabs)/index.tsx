/**
 * Chat screen - placeholder until streaming is implemented
 * Shows the beta.rocks branding and directs users to web for chat
 */

import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Colors, Spacing, FontSize, BorderRadius } from "@/constants/theme";
import { useTheme } from "@/contexts/ThemeContext";

export default function ChatScreen() {
  const { colorScheme } = useTheme();
  const isDark = colorScheme === "dark";
  const colors = isDark ? Colors.dark : Colors.light;
  const router = useRouter();

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.content}>
        <Text style={[styles.title, { color: colors.text }]}>beta.rocks</Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          Climbing conditions for any crag worldwide
        </Text>

        <View style={styles.actions}>
          <TouchableOpacity
            style={[styles.actionCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}
            onPress={() => router.push("/(tabs)/search")}
            activeOpacity={0.7}
          >
            <Ionicons name="search-outline" size={24} color={colors.primary} />
            <Text style={[styles.actionTitle, { color: colors.text }]}>
              Search Crags
            </Text>
            <Text style={[styles.actionDesc, { color: colors.textSecondary }]}>
              Find conditions at any climbing area
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}
            onPress={() => router.push("/(tabs)/favorites")}
            activeOpacity={0.7}
          >
            <Ionicons name="heart-outline" size={24} color={colors.primary} />
            <Text style={[styles.actionTitle, { color: colors.text }]}>
              Favorites
            </Text>
            <Text style={[styles.actionDesc, { color: colors.textSecondary }]}>
              Quick access to your saved crags
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: Spacing.xl,
    gap: Spacing.lg,
  },
  title: {
    fontSize: FontSize.xxl,
    fontWeight: "700",
    textAlign: "center",
  },
  subtitle: {
    fontSize: FontSize.md,
    textAlign: "center",
    lineHeight: 22,
  },
  actions: {
    gap: Spacing.sm,
    marginTop: Spacing.md,
  },
  actionCard: {
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    gap: Spacing.xs,
  },
  actionTitle: {
    fontSize: FontSize.md,
    fontWeight: "600",
  },
  actionDesc: {
    fontSize: FontSize.sm,
  },
});
