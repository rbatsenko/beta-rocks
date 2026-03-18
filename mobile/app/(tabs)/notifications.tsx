/**
 * Notifications tab screen
 * Displays user notifications with pull-to-refresh and mark-as-read functionality
 */

import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  RefreshControl,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@/contexts/ThemeContext";
import { Colors, Spacing, FontSize, BorderRadius } from "@/constants/theme";
import { CATEGORY_COLORS } from "@/constants/config";
import { useNotificationsContext } from "@/contexts/NotificationsContext";
import { useUserProfile } from "@/hooks/useUserProfile";
import { useTranslation } from "react-i18next";
import type { AppNotification } from "@/types/api";

function formatRelativeTime(dateString: string): string {
  const now = Date.now();
  const date = new Date(dateString).getTime();
  const diffMs = now - date;
  const diffMin = Math.floor(diffMs / 60000);
  const diffHr = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHr / 24);

  if (diffMin < 1) return "now";
  if (diffMin < 60) return `${diffMin}m`;
  if (diffHr < 24) return `${diffHr}h`;
  if (diffDay < 30) return `${diffDay}d`;
  return `${Math.floor(diffDay / 30)}mo`;
}

export default function NotificationsScreen() {
  const { colorScheme } = useTheme();
  const isDark = colorScheme === "dark";
  const colors = isDark ? Colors.dark : Colors.light;
  const { t } = useTranslation("common");
  const router = useRouter();
  const { hasProfile } = useUserProfile();
  const {
    notifications,
    unreadCount,
    isLoading,
    markAsRead,
    markAllRead,
    refetch,
  } = useNotificationsContext();

  const handleNotificationPress = (notification: AppNotification) => {
    if (!notification.read) {
      markAsRead([notification.id]);
    }
    if (notification.data?.cragSlug) {
      router.push(`/crag/${notification.data.cragSlug}`);
    }
  };

  const renderNotification = ({ item }: { item: AppNotification }) => {
    const categoryColor =
      CATEGORY_COLORS[item.data?.category]?.text || colors.muted;

    return (
      <TouchableOpacity
        style={[
          styles.card,
          {
            backgroundColor: item.read ? "transparent" : colors.surface,
            borderBottomColor: colors.border,
          },
        ]}
        onPress={() => handleNotificationPress(item)}
        activeOpacity={0.7}
      >
        <View
          style={[styles.dot, { backgroundColor: categoryColor }]}
        />
        <View style={styles.content}>
          <Text
            style={[styles.title, { color: colors.text }]}
            numberOfLines={1}
          >
            {item.title}
          </Text>
          <Text
            style={[styles.body, { color: colors.textSecondary }]}
            numberOfLines={2}
          >
            {item.body}
          </Text>
        </View>
        <Text style={[styles.time, { color: colors.muted }]}>
          {formatRelativeTime(item.created_at)}
        </Text>
      </TouchableOpacity>
    );
  };

  // Profile required state
  if (!hasProfile) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <Ionicons
          name="person-outline"
          size={48}
          color={colors.muted}
        />
        <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
          {t("mobile.profileRequired", "Create a profile to receive notifications")}
        </Text>
      </View>
    );
  }

  // Loading state
  if (isLoading && notifications.length === 0) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {unreadCount > 0 && (
        <TouchableOpacity
          style={[styles.markAllButton, { borderBottomColor: colors.border }]}
          onPress={markAllRead}
        >
          <Ionicons
            name="checkmark-done-outline"
            size={18}
            color={colors.primary}
          />
          <Text style={[styles.markAllText, { color: colors.primary }]}>
            {t("mobile.markAllRead", "Mark all as read")}
          </Text>
        </TouchableOpacity>
      )}
      <FlatList
        data={notifications}
        keyExtractor={(item) => item.id}
        renderItem={renderNotification}
        refreshControl={
          <RefreshControl
            refreshing={isLoading}
            onRefresh={refetch}
            tintColor={colors.primary}
          />
        }
        ListEmptyComponent={
          <View style={styles.center}>
            <Ionicons
              name="notifications-off-outline"
              size={48}
              color={colors.muted}
            />
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              {t("mobile.noNotifications", "No notifications yet")}
            </Text>
          </View>
        }
        contentContainerStyle={
          notifications.length === 0 ? styles.emptyContainer : undefined
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: Spacing.lg,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyText: {
    fontSize: FontSize.md,
    marginTop: Spacing.md,
    textAlign: "center",
  },
  markAllButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: Spacing.xs,
  },
  markAllText: {
    fontSize: FontSize.sm,
    fontWeight: "600",
  },
  card: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: Spacing.sm,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: BorderRadius.full,
  },
  content: {
    flex: 1,
  },
  title: {
    fontSize: FontSize.sm,
    fontWeight: "600",
    marginBottom: 2,
  },
  body: {
    fontSize: FontSize.xs,
    lineHeight: FontSize.xs * 1.4,
  },
  time: {
    fontSize: FontSize.xs,
    marginLeft: Spacing.xs,
  },
});
