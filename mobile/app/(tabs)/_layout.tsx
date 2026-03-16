import { Tabs } from "expo-router";
import { View, Animated, StyleSheet } from "react-native";
import { useRef, useEffect } from "react";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@/contexts/ThemeContext";
import { Colors } from "@/constants/theme";
import { useTranslation } from "react-i18next";

function LiveDot() {
  const pulse = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 0.3, duration: 1000, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1, duration: 1000, useNativeDriver: true }),
      ])
    ).start();
  }, [pulse]);

  return (
    <View style={liveDotStyles.container}>
      <Animated.View style={[liveDotStyles.ping, { opacity: pulse }]} />
      <View style={liveDotStyles.dot} />
    </View>
  );
}

const liveDotStyles = StyleSheet.create({
  container: { position: "absolute", top: -2, right: -4, width: 8, height: 8 },
  ping: { position: "absolute", width: 8, height: 8, borderRadius: 4, backgroundColor: "#22c55e" },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: "#22c55e", marginLeft: 1, marginTop: 1 },
});

export default function TabLayout() {
  const { colorScheme } = useTheme();
  const isDark = colorScheme === "dark";
  const colors = isDark ? Colors.dark : Colors.light;
  const { t } = useTranslation("common");

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.muted,
        tabBarStyle: {
          backgroundColor: isDark ? colors.background : colors.surfaceElevated,
          borderTopColor: colors.border,
        },
        headerStyle: {
          backgroundColor: isDark ? colors.background : colors.surfaceElevated,
        },
        headerTintColor: colors.text,
        headerTitleStyle: {
          fontWeight: "600",
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: t("header.title", "Home"),
          headerShown: false,
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="home-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="search"
        options={{
          title: t("search.title", "Search"),
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="search-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="feed"
        options={{
          title: t("feed.live", "Feed"),
          tabBarIcon: ({ color, size }) => (
            <View>
              <Ionicons name="flash-outline" size={size} color={color} />
              <LiveDot />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="favorites"
        options={{
          title: t("profile.favorites", "Favorites"),
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="heart-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: t("settings.title", "Settings"),
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="settings-outline" size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
