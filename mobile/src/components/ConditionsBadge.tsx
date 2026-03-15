/**
 * Reusable friction rating badge component
 * Matches the web app's rating display style
 */

import { View, Text, StyleSheet } from "react-native";
import { FRICTION_RATINGS } from "../constants/config";
import { FontSize, BorderRadius, Spacing } from "../constants/theme";
import type { FrictionRating } from "../types/api";

interface ConditionsBadgeProps {
  score: number;
  rating?: FrictionRating;
  size?: "small" | "medium" | "large";
  showScore?: boolean;
}

export function ConditionsBadge({
  score,
  rating,
  size = "medium",
  showScore = true,
}: ConditionsBadgeProps) {
  const rounded = Math.round(score) as keyof typeof FRICTION_RATINGS;
  const ratingInfo = FRICTION_RATINGS[rounded];

  if (!ratingInfo) return null;

  const label = rating || ratingInfo.label;

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: ratingInfo.color },
        size === "small" && styles.small,
        size === "large" && styles.large,
      ]}
    >
      <Text
        style={[
          styles.label,
          size === "small" && styles.labelSmall,
          size === "large" && styles.labelLarge,
        ]}
      >
        {label}
      </Text>
      {showScore && (
        <Text
          style={[
            styles.score,
            size === "small" && styles.scoreSmall,
            size === "large" && styles.scoreLarge,
          ]}
        >
          {score.toFixed(1)}
        </Text>
      )}
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
    color: "#ffffff",
    fontSize: FontSize.xs,
    fontWeight: "700",
  },
  labelSmall: {
    fontSize: 10,
  },
  labelLarge: {
    fontSize: FontSize.sm,
  },
  score: {
    color: "#ffffff",
    fontSize: FontSize.xs,
    opacity: 0.9,
  },
  scoreSmall: {
    fontSize: 10,
  },
  scoreLarge: {
    fontSize: FontSize.md,
    fontWeight: "800",
  },
});
