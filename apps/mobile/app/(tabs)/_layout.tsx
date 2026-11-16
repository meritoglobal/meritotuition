import { Ionicons } from "@expo/vector-icons";
import { Tabs } from "expo-router";
import type { ComponentProps } from "react";
import { colors } from "../../src/theme";

type Icon = ComponentProps<typeof Ionicons>["name"];
const tab = (title: string, on: Icon, off: Icon) => ({
  title,
  tabBarIcon: ({ focused, color }: { focused: boolean; color: string }) => <Ionicons name={focused ? on : off} size={23} color={color} />,
});

/** Five sections at the bottom, like every learning app students already use. */
export default function TabsLayout() {
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
      <Tabs.Screen name="tutors" options={tab("টিউটর", "people", "people-outline")} />
      <Tabs.Screen name="classes" options={tab("ক্লাস", "videocam", "videocam-outline")} />
      <Tabs.Screen name="learn" options={tab("পড়া", "book", "book-outline")} />
      <Tabs.Screen name="me" options={tab("আমি", "person-circle", "person-circle-outline")} />
    </Tabs>
  );
}
