/**
 * Reusable conditions label badge component
 * Matches the web app's 3-tier label display style
 */

import { View, Text, StyleSheet } from "react-native";
import { LABEL_COLORS } from "../constants/config";
import { FontSize, BorderRadius, Spacing } from "../constants/theme";
import type { ConditionsLabel } from "../types/api";

interface ConditionsBadgeProps {
  label: ConditionsLabel;
  size?: "small" | "medium" | "large";
}

export function ConditionsBadge({
  label,
  size = "medium",
}: ConditionsBadgeProps) {
  const colorInfo = LABEL_COLORS[label];

  if (!colorInfo) return null;

  const displayLabel = label.replace(/_/g, " ");

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: colorInfo.bg, borderColor: colorInfo.solid, borderWidth: 1 },
        size === "small" && styles.small,
        size === "large" && styles.large,
      ]}
    >
      <Text
        style={[
          styles.label,
          { color: colorInfo.text },
          size === "small" && styles.labelSmall,
          size === "large" && styles.labelLarge,
        ]}
      >
        {displayLabel}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: Spacing.sm + 2,
    paddingVertical: Spacing.xs + 2,
    borderRadius: BorderRadius.md,
    minWidth: 50,
  },
  small: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    minWidth: 40,
  },
  large: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    minWidth: 70,
    borderRadius: BorderRadius.lg,
  },
  label: {
    fontSize: FontSize.xs,
    fontWeight: "700",
    textTransform: "capitalize",
  },
  labelSmall: {
    fontSize: 10,
  },
  labelLarge: {
    fontSize: FontSize.sm,
  },
});
