import { Ionicons } from "@expo/vector-icons";
import { Redirect, Tabs } from "expo-router";
import type { ComponentProps } from "react";
import { useRole } from "../../src/prefs";
import { colors } from "../../src/theme";

type Icon = ComponentProps<typeof Ionicons>["name"];
const tab = (title: string, on: Icon, off: Icon, show = true) => ({
  title,
  href: show ? undefined : null,
  tabBarIcon: ({ focused, color }: { focused: boolean; color: string }) => <Ionicons name={focused ? on : off} size={23} color={color} />,
});

/**
 * Five sections at the bottom. Students and teachers see different sets:
 * student: Home, Tutors, Classes, Study, Me; teacher: Home, Batches, Classes, Earnings, Me.
 */
export default function TabsLayout() {
  const role = useRole();
  if (!role) return <Redirect href="/welcome" />;
  const teacher = role === "teacher";

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.board,
        tabBarInactiveTintColor: colors.faint,
        tabBarStyle: { backgroundColor: colors.white, borderTopColor: colors.line, height: 68, paddingTop: 6, paddingBottom: 10 },
        tabBarLabelStyle: { fontSize: 12, fontWeight: "600", lineHeight: 18 },
      }}
    >
      <Tabs.Screen name="index" options={tab("হোম", "home", "home-outline")} />
      <Tabs.Screen name="tutors" options={tab("টিউটর", "people", "people-outline", !teacher)} />
      <Tabs.Screen name="batches" options={tab("ব্যাচ", "people", "people-outline", teacher)} />
      <Tabs.Screen name="classes" options={tab("ক্লাস", "videocam", "videocam-outline")} />
      <Tabs.Screen name="learn" options={tab("পড়া", "book", "book-outline", !teacher)} />
      <Tabs.Screen name="earnings" options={tab("আয়", "wallet", "wallet-outline", teacher)} />
      <Tabs.Screen name="me" options={tab("আমি", "person-circle", "person-circle-outline")} />
    </Tabs>
  );
}
