import { Tabs } from "expo-router";
import { Text } from "react-native";
import { colors } from "../../src/theme";

const icon = (glyph: string) => ({ color }: { color: string }) => <Text style={{ color, fontSize: 18 }}>{glyph}</Text>;

export default function TabsLayout() {
  return (
    <Tabs screenOptions={{ tabBarActiveTintColor: colors.brand, headerTitleStyle: { fontWeight: "700" } }}>
      <Tabs.Screen name="index" options={{ title: "Home", tabBarIcon: icon("⌂") }} />
      <Tabs.Screen name="search" options={{ title: "Find tutor", tabBarIcon: icon("⌕") }} />
      <Tabs.Screen name="classes" options={{ title: "My classes", tabBarIcon: icon("▣") }} />
      <Tabs.Screen name="earnings" options={{ title: "Teach", tabBarIcon: icon("৳") }} />
    </Tabs>
  );
}
