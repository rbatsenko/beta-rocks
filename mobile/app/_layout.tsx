import { useEffect } from "react";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useColorScheme } from "react-native";
import * as SplashScreen from "expo-splash-screen";

// Prevent the splash screen from auto-hiding
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";

  useEffect(() => {
    // Hide splash screen after app is ready
    SplashScreen.hideAsync();
  }, []);

  return (
    <>
      <StatusBar style={isDark ? "light" : "dark"} />
      <Stack
        screenOptions={{
          headerStyle: {
            backgroundColor: isDark ? "#0f172a" : "#ffffff",
          },
          headerTintColor: isDark ? "#f8fafc" : "#0f172a",
          headerTitleStyle: {
            fontWeight: "600",
          },
          contentStyle: {
            backgroundColor: isDark ? "#0f172a" : "#f8fafc",
          },
        }}
      >
        <Stack.Screen
          name="(tabs)"
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="crag/[slug]"
          options={{
            title: "Crag Details",
            presentation: "card",
          }}
        />
        <Stack.Screen
          name="sync"
          options={{
            title: "Sync Profile",
            presentation: "modal",
          }}
        />
      </Stack>
    </>
  );
}
