import { Pressable, StyleSheet, Text, View, type ViewStyle } from "react-native";
import { Link } from "expo-router";
import { CLASS_LEVEL_LABEL, formatTaka, hasTrialSeat, type TeacherSummary } from "@merito/core";
import { colors } from "./theme";

export function Button({ title, onPress, variant = "solid", disabled }: { title: string; onPress?: () => void; variant?: "solid" | "outline" | "danger" | "sun"; disabled?: boolean }) {
  const bg = disabled ? "#f4f4f8" : variant === "solid" ? colors.brand : variant === "danger" ? colors.coral : variant === "sun" ? colors.sun : colors.white;
  const fg = disabled ? "#8a8999" : variant === "solid" ? colors.white : colors.text;
  return (
    <Pressable onPress={onPress} disabled={disabled} style={[s.btn, { backgroundColor: bg, borderColor: variant === "outline" ? colors.border : colors.text }]}>
      <Text style={[s.btnText, { color: fg }]}>{title}</Text>
    </Pressable>
  );
}

export function Card({ children, style }: { children: React.ReactNode; style?: ViewStyle }) {
  return <View style={[s.card, style]}>{children}</View>;
}

export function Chip({ label, tone = "grey" }: { label: string; tone?: "grey" | "green" | "amber" }) {
  const map = { grey: ["#f4f4f8", colors.text], green: [colors.mint, colors.text], amber: [colors.sun, colors.text] } as const;
  const [bg, fg] = map[tone];
  return <Text style={[s.chip, { backgroundColor: bg, color: fg }]}>{label}</Text>;
}

export function TeacherRow({ t, distanceKm }: { t: TeacherSummary; distanceKm?: number }) {
  return (
    <Link href={`/teacher/${t.id}`} asChild>
      <Pressable>
        <Card style={{ flexDirection: "row", gap: 12 }}>
          <View style={s.avatar}>
            <Text style={s.avatarText}>{t.name.split(" ").map((p) => p[0]).join("").slice(0, 2)}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.name}>{t.name}{t.verified ? "  ✓" : ""}</Text>
            <Text style={s.muted}>{t.university}</Text>
            <Text style={s.muted} numberOfLines={1}>{t.subjects.join(", ")} · {t.levels.map((l) => CLASS_LEVEL_LABEL[l]).join(", ")}</Text>
            <View style={s.row}>
              <Chip label={`★ ${t.rating.toFixed(1)}`} tone="amber" />
              {distanceKm !== undefined && <Chip label={`${distanceKm.toFixed(1)} km`} />}
              {t.routine.some(hasTrialSeat) && <Chip label="Free trial" tone="green" />}
            </View>
          </View>
          <View style={{ alignItems: "flex-end" }}>
            <Text style={s.muted}>from</Text>
            <Text style={s.name}>{formatTaka(t.fromPrice)}</Text>
          </View>
        </Card>
      </Pressable>
    </Link>
  );
}

export const s = StyleSheet.create({
  btn: { borderRadius: 8, borderWidth: 2, paddingVertical: 12, paddingHorizontal: 18, alignItems: "center" },
  btnText: { fontWeight: "600", fontSize: 15 },
  card: { backgroundColor: colors.white, borderRadius: 12, borderWidth: 2, borderColor: colors.border, padding: 14 },
  chip: { fontSize: 12, fontWeight: "700", paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, overflow: "hidden" },
  avatar: { width: 64, height: 64, borderRadius: 8, backgroundColor: colors.sun, alignItems: "center", justifyContent: "center" },
  avatarText: { color: colors.text, fontWeight: "800", fontSize: 22 },
  name: { fontWeight: "700", fontSize: 15, color: colors.text },
  muted: { color: colors.muted, fontSize: 13 },
  row: { flexDirection: "row", gap: 6, marginTop: 6, flexWrap: "wrap" },
  h1: { fontSize: 34, fontWeight: "800", letterSpacing: -1, color: colors.text },
  h2: { fontSize: 22, fontWeight: "800", letterSpacing: -0.5, color: colors.text, marginTop: 20, marginBottom: 10 },
  screen: { flex: 1, backgroundColor: colors.bg },
  pad: { padding: 16, gap: 10 },
});
