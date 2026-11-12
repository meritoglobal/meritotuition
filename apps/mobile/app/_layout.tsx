import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";

// Keep the splash up until the first page has loaded (index.tsx hides it).
SplashScreen.preventAutoHideAsync().catch(() => {});

export default function RootLayout() {
  return <Stack screenOptions={{ headerShown: false }} />;
}
