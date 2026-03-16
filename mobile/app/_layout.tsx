import { useEffect } from "react";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import * as SplashScreen from "expo-splash-screen";
import "@/i18n"; // Initialize i18n
import { ThemeProvider, useTheme } from "@/contexts/ThemeContext";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { UserProfileProvider } from "@/contexts/UserProfileContext";
import { Colors } from "@/constants/theme";
import { useTranslation } from "react-i18next";

SplashScreen.preventAutoHideAsync();

function RootNavigator() {
  const { colorScheme } = useTheme();
  const isDark = colorScheme === "dark";
  const colors = isDark ? Colors.dark : Colors.light;
  const { t } = useTranslation("common");

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
          options={{ headerShown: false, title: "" }}
        />
        <Stack.Screen
          name="crag/[slug]"
          options={{
            title: t("mobile.cragDetails", "Crag Details"),
            presentation: "card",
            headerBackTitle: " ",
          }}
        />
        <Stack.Screen
          name="report"
          options={{
            title: t("fab.addReport", "Add Report"),
            presentation: "modal",
            headerBackTitle: " ",
          }}
        />
        <Stack.Screen
          name="add-crag"
          options={{
            title: t("mobile.addCrag", "Add Crag"),
            presentation: "modal",
            headerBackTitle: " ",
          }}
        />
        <Stack.Screen
          name="add-sector"
          options={{
            title: t("mobile.addSector", "Add Sector"),
            presentation: "modal",
            headerBackTitle: " ",
          }}
        />
        <Stack.Screen
          name="sync"
          options={{
            title: t("mobile.syncProfile", "Sync Profile"),
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
