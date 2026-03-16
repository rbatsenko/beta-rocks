import { useEffect } from "react";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import * as SplashScreen from "expo-splash-screen";
import { ThemeProvider, useTheme } from "@/contexts/ThemeContext";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { UserProfileProvider } from "@/contexts/UserProfileContext";
import { Colors } from "@/constants/theme";

SplashScreen.preventAutoHideAsync();

function RootNavigator() {
  const { colorScheme } = useTheme();
  const isDark = colorScheme === "dark";
  const colors = isDark ? Colors.dark : Colors.light;

  useEffect(() => {
    SplashScreen.hideAsync();
  }, []);

  return (
    <>
      <StatusBar style={isDark ? "light" : "dark"} />
      <Stack
        screenOptions={{
          headerStyle: {
            backgroundColor: isDark ? colors.background : colors.surfaceElevated,
          },
          headerTintColor: colors.text,
          headerTitleStyle: {
            fontWeight: "600",
          },
          contentStyle: {
            backgroundColor: colors.background,
          },
        }}
      >
        <Stack.Screen
          name="(tabs)"
          options={{ headerShown: false, headerBackTitle: "Back" }}
        />
        <Stack.Screen
          name="crag/[slug]"
          options={{
            title: "Crag Details",
            presentation: "card",
            headerBackTitle: "Back",
          }}
        />
        <Stack.Screen
          name="report"
          options={{
            title: "Add Report",
            presentation: "modal",
            headerBackTitle: "Cancel",
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

export default function RootLayout() {
  return (
    <ThemeProvider>
      <LanguageProvider>
        <UserProfileProvider>
          <RootNavigator />
        </UserProfileProvider>
      </LanguageProvider>
    </ThemeProvider>
  );
}
