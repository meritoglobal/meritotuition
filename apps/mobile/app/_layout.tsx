import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import { listenForClassStart } from "../src/notifications";
import { colors } from "../src/theme";

export default function RootLayout() {
  useEffect(() => listenForClassStart(), []);
  return (
    <>
      <StatusBar style="dark" />
      <Stack screenOptions={{ headerTintColor: colors.brand, contentStyle: { backgroundColor: colors.bg } }}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="teacher/[id]" options={{ title: "Tutor" }} />
        <Stack.Screen name="class/[id]" options={{ title: "Class room" }} />
      </Stack>
    </>
  );
}
