import { router, Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import { Platform } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { colors } from "../src/theme";

SplashScreen.preventAutoHideAsync().catch(() => {});

export default function RootLayout() {
  useEffect(() => {
    const t = setTimeout(() => SplashScreen.hideAsync().catch(() => {}), 150);
    // Tapping a "class started" notification opens that class.
    let off = () => {};
    if (Platform.OS !== "web") {
      const { onNotificationOpen } = require("../src/notifications") as typeof import("../src/notifications");
      off = onNotificationOpen((path) => router.push({ pathname: "/web", params: { path, title: "লাইভ ক্লাস" } }));
    }
    return () => { clearTimeout(t); off(); };
  }, []);

  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.chalk }, animation: "slide_from_right" }} />
    </SafeAreaProvider>
  );
}
