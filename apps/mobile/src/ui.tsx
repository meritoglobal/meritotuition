/** Small shared building blocks for the native screens. */
import { Ionicons } from "@expo/vector-icons";
import type { ComponentProps, ReactNode } from "react";
import { Image, Pressable, ScrollView, StyleSheet, Text, View, type StyleProp, type ViewStyle } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { colors, radius } from "./theme";

export type IconName = ComponentProps<typeof Ionicons>["name"];
export { Ionicons };

export function Screen({ children, scroll = true }: { children: ReactNode; scroll?: boolean }) {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.chalk }} edges={["top"]}>
      {scroll ? (
        <ScrollView contentContainerStyle={{ paddingBottom: 28 }} showsVerticalScrollIndicator={false}>
          {children}
        </ScrollView>
      ) : (
        children
      )}
    </SafeAreaView>
  );
}

/** Page title row used at the top of each tab. */
export function TabHeader({ title, sub, right }: { title: string; sub?: string; right?: ReactNode }) {
  return (
    <View style={s.tabHeader}>
      <View style={{ flex: 1 }}>
        <Text style={s.tabTitle}>{title}</Text>
        {sub ? <Text style={s.tabSub}>{sub}</Text> : null}
      </View>
      {right}
    </View>
  );
}

export function Section({ title, action, onAction, children, style }: { title: string; action?: string; onAction?: () => void; children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return (
    <View style={[{ marginTop: 26 }, style]}>
      <View style={s.sectionHead}>
        <Text style={s.sectionTitle}>{title}</Text>
        {action ? (
          <Pressable onPress={onAction} hitSlop={10}>
            <Text style={s.sectionAction}>{action}</Text>
          </Pressable>
        ) : null}
      </View>
      {children}
    </View>
  );
}

export function Card({ children, style, onPress }: { children: ReactNode; style?: StyleProp<ViewStyle>; onPress?: () => void }) {
  if (!onPress) return <View style={[s.card, style]}>{children}</View>;
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [s.card, style, pressed && { opacity: 0.85 }]}>
      {children}
    </Pressable>
  );
}

/** Segmented control: one row of mutually exclusive choices. */
export function Segmented<T extends string>({ value, options, onChange }: { value: T; options: { value: T; label: string }[]; onChange: (v: T) => void }) {
  return (
    <View style={s.seg}>
      {options.map((o) => {
        const on = o.value === value;
        return (
          <Pressable key={o.value} onPress={() => onChange(o.value)} style={[s.segItem, on && s.segOn]}>
            <Text style={[s.segText, on && s.segTextOn]}>{o.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function Chip({ label, on, onPress }: { label: string; on?: boolean; onPress?: () => void }) {
  return (
    <Pressable onPress={onPress} style={[s.chip, on && s.chipOn]}>
      <Text style={[s.chipText, on && s.chipTextOn]}>{label}</Text>
    </Pressable>
  );
}

export function Tag({ label, tone = "green" }: { label: string; tone?: "green" | "gold" | "red" | "grey" }) {
  const bg = { green: colors.boardSoft, gold: colors.goldSoft, red: colors.redSoft, grey: "#efece4" }[tone];
  const fg = { green: colors.board, gold: "#6b5300", red: colors.redpen, grey: colors.muted }[tone];
  return (
    <View style={[s.tag, { backgroundColor: bg }]}>
      <Text style={[s.tagText, { color: fg }]}>{label}</Text>
    </View>
  );
}

export function Button({ label, onPress, kind = "gold", icon, style }: { label: string; onPress?: () => void; kind?: "gold" | "board" | "ghost"; icon?: IconName; style?: StyleProp<ViewStyle> }) {
  const bg = kind === "gold" ? colors.gold : kind === "board" ? colors.board : "transparent";
  const fg = kind === "board" ? colors.white : colors.ink;
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [s.btn, { backgroundColor: bg }, kind === "ghost" && s.btnGhost, style, pressed && { opacity: 0.85 }]}>
      {icon ? <Ionicons name={icon} size={17} color={fg} style={{ marginRight: 6 }} /> : null}
      <Text style={[s.btnText, { color: fg }]}>{label}</Text>
    </Pressable>
  );
}

/** Round avatar with the teacher's initials (real photos come with the API). */
export function Avatar({ name, size = 44, tone = 0 }: { name: string; size?: number; tone?: number }) {
  const bgs = [colors.board, "#7a4b2a", "#2d4a7a", "#5b3b6e", "#2f6b5a"];
  const initials = name.split(" ").map((p) => p[0]).slice(0, 2).join("");
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: bgs[tone % bgs.length], alignItems: "center", justifyContent: "center" }}>
      <Text style={{ color: colors.white, fontWeight: "700", fontSize: size * 0.36 }}>{initials}</Text>
    </View>
  );
}

export function Mark({ size = 36 }: { size?: number }) {
  return <Image source={require("../assets/mark.png")} style={{ width: size, height: size }} resizeMode="contain" />;
}

export function Bar({ value, color = colors.board }: { value: number; color?: string }) {
  return (
    <View style={s.barBg}>
      <View style={[s.barFill, { width: `${Math.round(value * 100)}%`, backgroundColor: color }]} />
    </View>
  );
}

export const s = StyleSheet.create({
  tabHeader: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingTop: 12, paddingBottom: 4 },
  tabTitle: { fontSize: 24, fontWeight: "700", color: colors.ink, letterSpacing: -0.3 },
  tabSub: { fontSize: 14, color: colors.muted, marginTop: 2 },
  sectionHead: { flexDirection: "row", alignItems: "baseline", justifyContent: "space-between", paddingHorizontal: 16, marginBottom: 10 },
  sectionTitle: { fontSize: 17, fontWeight: "700", color: colors.ink },
  sectionAction: { fontSize: 14, fontWeight: "600", color: colors.board },
  card: { backgroundColor: colors.white, borderRadius: radius.card, borderWidth: StyleSheet.hairlineWidth * 2, borderColor: colors.line, padding: 14 },
  seg: { flexDirection: "row", backgroundColor: "#ebe7dd", borderRadius: 10, padding: 3, marginHorizontal: 16 },
  segItem: { flex: 1, paddingVertical: 9, borderRadius: 8, alignItems: "center" },
  segOn: { backgroundColor: colors.white, shadowColor: "#000", shadowOpacity: 0.06, shadowRadius: 3, shadowOffset: { width: 0, height: 1 }, elevation: 1 },
  segText: { fontSize: 14, fontWeight: "600", color: colors.muted },
  segTextOn: { color: colors.ink },
  chip: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 8, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.white, marginRight: 8 },
  chipOn: { backgroundColor: colors.board, borderColor: colors.board },
  chipText: { fontSize: 14, color: colors.ink },
  chipTextOn: { color: colors.white, fontWeight: "600" },
  tag: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, marginRight: 6, marginTop: 6 },
  tagText: { fontSize: 12, fontWeight: "600" },
  btn: { flexDirection: "row", alignItems: "center", justifyContent: "center", borderRadius: radius.button, paddingHorizontal: 16, paddingVertical: 12 },
  btnGhost: { borderWidth: 1, borderColor: colors.line, backgroundColor: colors.white },
  btnText: { fontSize: 15, fontWeight: "700" },
  barBg: { height: 6, borderRadius: 3, backgroundColor: "#ebe7dd", overflow: "hidden" },
  barFill: { height: 6, borderRadius: 3 },
});
