/**
 * Badge unlock celebration modal for mobile.
 * Shows fireworks-like animation with haptic feedback when a badge is earned.
 */

import { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  Dimensions,
} from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withSequence,
  withDelay,
  withTiming,
  runOnJS,
  Easing,
} from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import { useTranslation } from "react-i18next";
import { Colors, Spacing, FontSize, BorderRadius } from "@/constants/theme";
import { useTheme } from "@/contexts/ThemeContext";
import type { BadgeDefinition } from "@/lib/badges/badge-definitions";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

// Particle component for the celebration effect
function Particle({ delay, color }: { delay: number; color: string }) {
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const opacity = useSharedValue(0);
  const scale = useSharedValue(0);

  useEffect(() => {
    const angle = Math.random() * Math.PI * 2;
    const distance = 80 + Math.random() * 120;

    opacity.value = withDelay(delay, withSequence(
      withTiming(1, { duration: 200 }),
      withDelay(600, withTiming(0, { duration: 400 }))
    ));
    scale.value = withDelay(delay, withSequence(
      withSpring(1, { damping: 6 }),
      withDelay(400, withTiming(0, { duration: 300 }))
    ));
    translateX.value = withDelay(delay, withTiming(
      Math.cos(angle) * distance,
      { duration: 800, easing: Easing.out(Easing.quad) }
    ));
    translateY.value = withDelay(delay, withTiming(
      Math.sin(angle) * distance,
      { duration: 800, easing: Easing.out(Easing.quad) }
    ));
  }, [delay]);

  const style = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { scale: scale.value },
    ],
    opacity: opacity.value,
  }));

  return (
    <Animated.View style={[styles.particle, { backgroundColor: color }, style]} />
  );
}

interface BadgeUnlockModalProps {
  badges: BadgeDefinition[];
  onComplete: () => void;
  onViewProfile?: () => void;
}

export function BadgeUnlockModal({
  badges,
  onComplete,
  onViewProfile,
}: BadgeUnlockModalProps) {
  const { t } = useTranslation("common");
  const { colorScheme } = useTheme();
  const isDark = colorScheme === "dark";
  const colors = isDark ? Colors.dark : Colors.light;
  const [currentIndex, setCurrentIndex] = useState(0);
  const currentBadge = badges[currentIndex];

  // Animations
  const backdropOpacity = useSharedValue(0);
  const cardScale = useSharedValue(0.3);
  const cardTranslateY = useSharedValue(100);
  const badgeScale = useSharedValue(0);
  const glowOpacity = useSharedValue(0);

  const triggerHaptics = useCallback(() => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }, []);

  useEffect(() => {
    // Entrance animation
    backdropOpacity.value = withTiming(1, { duration: 300 });
    cardScale.value = withSpring(1, { damping: 12, stiffness: 150 });
    cardTranslateY.value = withSpring(0, { damping: 14, stiffness: 120 });
    badgeScale.value = withDelay(200, withSequence(
      withSpring(1.3, { damping: 4, stiffness: 200 }),
      withSpring(1, { damping: 8 })
    ));
    glowOpacity.value = withDelay(300, withSequence(
      withTiming(0.6, { duration: 400 }),
      withTiming(0.2, { duration: 600 })
    ));

    // Haptic feedback
    runOnJS(triggerHaptics)();
  }, [currentIndex]);

  const handleNext = useCallback(() => {
    if (currentIndex < badges.length - 1) {
      // Reset animations for next badge
      cardScale.value = 0.3;
      cardTranslateY.value = 100;
      badgeScale.value = 0;
      glowOpacity.value = 0;
      setCurrentIndex((i) => i + 1);
    } else {
      onComplete();
    }
  }, [currentIndex, badges.length, onComplete]);

  const handleViewProfile = useCallback(() => {
    onComplete();
    onViewProfile?.();
  }, [onComplete, onViewProfile]);

  const backdropStyle = useAnimatedStyle(() => ({
    opacity: backdropOpacity.value,
  }));

  const cardStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: cardScale.value },
      { translateY: cardTranslateY.value },
    ],
  }));

  const badgeStyle = useAnimatedStyle(() => ({
    transform: [{ scale: badgeScale.value }],
  }));

  const glowStyle = useAnimatedStyle(() => ({
    opacity: glowOpacity.value,
  }));

  if (!currentBadge) return null;

  const particleColors = [
    colors.primary,
    "#fb923c",
    "#fdba74",
    "#fbbf24",
    "#f59e0b",
    "#ef4444",
    "#8b5cf6",
  ];

  return (
    <Modal transparent animationType="none" visible>
      <Animated.View style={[styles.backdrop, backdropStyle]}>
        <Animated.View
          style={[
            styles.card,
            { backgroundColor: colors.card, borderColor: `${colors.primary}60` },
            cardStyle,
          ]}
        >
          {/* Particles */}
          <View style={styles.particlesContainer}>
            {Array.from({ length: 20 }).map((_, i) => (
              <Particle
                key={`${currentIndex}-${i}`}
                delay={i * 50}
                color={particleColors[i % particleColors.length]}
              />
            ))}
          </View>

          {/* Glow */}
          <Animated.View
            style={[
              styles.glow,
              { backgroundColor: colors.primary },
              glowStyle,
            ]}
          />

          {/* Badge icon */}
          <Animated.View style={[styles.badgeContainer, badgeStyle]}>
            <Text style={styles.badgeEmoji}>{currentBadge.icon}</Text>
          </Animated.View>

          {/* Unlocked label */}
          <View style={styles.unlockedRow}>
            <View style={[styles.dividerLine, { backgroundColor: colors.primary }]} />
            <Text style={[styles.unlockedLabel, { color: colors.primary }]}>
              {t("badges.unlocked")}
            </Text>
            <View style={[styles.dividerLine, { backgroundColor: colors.primary }]} />
          </View>

          {/* Badge name */}
          <Text style={[styles.badgeName, { color: colors.text }]}>
            {t(currentBadge.nameKey)}
          </Text>

          {/* Description */}
          <Text style={[styles.description, { color: colors.textSecondary }]}>
            {t(currentBadge.descriptionKey)}
          </Text>

          {/* Actions */}
          <View style={styles.actions}>
            {onViewProfile && (
              <TouchableOpacity
                style={[styles.primaryButton, { backgroundColor: colors.primary }]}
                onPress={handleViewProfile}
                activeOpacity={0.8}
              >
                <Text style={[styles.primaryButtonText, { color: colors.primaryForeground }]}>
                  {t("badges.viewInProfile")}
                </Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={[styles.secondaryButton, { borderColor: colors.border }]}
              onPress={handleNext}
              activeOpacity={0.8}
            >
              <Text style={[styles.secondaryButtonText, { color: colors.textSecondary }]}>
                {currentIndex < badges.length - 1
                  ? t("badges.next")
                  : t("badges.awesome")}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Dot indicators for multiple badges */}
          {badges.length > 1 && (
            <View style={styles.dots}>
              {badges.map((_, i) => (
                <View
                  key={i}
                  style={[
                    styles.dot,
                    {
                      backgroundColor:
                        i === currentIndex
                          ? colors.primary
                          : i < currentIndex
                            ? `${colors.primary}60`
                            : `${colors.textSecondary}30`,
                      width: i === currentIndex ? 20 : 6,
                    },
                  ]}
                />
              ))}
            </View>
          )}
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    justifyContent: "center",
    alignItems: "center",
    padding: Spacing.lg,
  },
  card: {
    width: Math.min(SCREEN_WIDTH - 48, 340),
    borderRadius: BorderRadius.xl,
    borderWidth: 2,
    padding: Spacing.xl,
    alignItems: "center",
    overflow: "hidden",
  },
  particlesContainer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "center",
  },
  particle: {
    position: "absolute",
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  glow: {
    position: "absolute",
    top: -40,
    width: 200,
    height: 200,
    borderRadius: 100,
    alignSelf: "center",
  },
  badgeContainer: {
    marginBottom: Spacing.md,
    zIndex: 1,
  },
  badgeEmoji: {
    fontSize: 64,
  },
  unlockedRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    marginBottom: Spacing.xs,
  },
  dividerLine: {
    height: 1,
    width: 32,
  },
  unlockedLabel: {
    fontSize: FontSize.xs,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 2,
  },
  badgeName: {
    fontSize: FontSize.xl,
    fontWeight: "700",
    marginBottom: 4,
    textAlign: "center",
  },
  description: {
    fontSize: FontSize.sm,
    textAlign: "center",
    marginBottom: Spacing.lg,
    lineHeight: 20,
  },
  actions: {
    width: "100%",
    gap: Spacing.sm,
  },
  primaryButton: {
    borderRadius: BorderRadius.lg,
    paddingVertical: 12,
    alignItems: "center",
  },
  primaryButtonText: {
    fontSize: FontSize.md,
    fontWeight: "600",
  },
  secondaryButton: {
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    paddingVertical: 12,
    alignItems: "center",
  },
  secondaryButtonText: {
    fontSize: FontSize.md,
    fontWeight: "500",
  },
  dots: {
    flexDirection: "row",
    gap: 6,
    marginTop: Spacing.md,
  },
  dot: {
    height: 6,
    borderRadius: 3,
  },
});
