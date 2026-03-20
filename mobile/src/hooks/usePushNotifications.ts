import { useState, useEffect, useRef } from "react";
import { Platform } from "react-native";
import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { API_URL } from "@/constants/config";
import type { EventSubscription } from "expo-modules-core";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export function usePushNotifications(syncKeyHash: string | null) {
  const [expoPushToken, setExpoPushToken] = useState<string | null>(null);
  const notificationListener = useRef<EventSubscription | null>(null);
  const responseListener = useRef<EventSubscription | null>(null);
  const router = useRouter();
  const { i18n } = useTranslation();

  useEffect(() => {
    if (!syncKeyHash) return;

    registerForPushNotifications().then((token) => {
      if (token) {
        setExpoPushToken(token);
        registerTokenWithBackend(token, syncKeyHash, i18n.language);
      }
    });

    notificationListener.current =
      Notifications.addNotificationReceivedListener(() => {
        // Notification received in foreground — handled by notification handler above
      });

    responseListener.current =
      Notifications.addNotificationResponseReceivedListener((response) => {
        const data = response.notification.request.content.data;
        if (data?.cragSlug) {
          router.push(`/crag/${data.cragSlug}` as any);
        }
      });

    return () => {
      notificationListener.current?.remove();
      responseListener.current?.remove();
    };
  }, [syncKeyHash]);

  return { expoPushToken };
}

async function registerForPushNotifications(): Promise<string | null> {
  if (!Device.isDevice) {
    console.log("Push notifications require a physical device");
    return null;
  }

  const { status: existingStatus } =
    await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== "granted") {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== "granted") {
    console.log("Push notification permission not granted");
    return null;
  }

  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("default", {
      name: "default",
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
    });
  }

  const tokenData = await Notifications.getExpoPushTokenAsync({
    projectId: "5ebf1d1a-337b-460d-aeae-ff3395852783",
  });

  return tokenData.data;
}

async function registerTokenWithBackend(
  token: string,
  syncKeyHash: string,
  locale?: string
) {
  try {
    await fetch(`${API_URL}/api/push-subscriptions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        syncKeyHash,
        token,
        platform: Platform.OS,
        deviceName: Device.modelName || undefined,
        locale: locale || "en",
      }),
    });
  } catch (error) {
    console.warn("Failed to register push token:", error);
  }
}
