import { Pressable, StyleSheet, Text, View, type ViewStyle } from "react-native";
import { Link } from "expo-router";
import { CLASS_LEVEL_LABEL, formatTaka, hasTrialSeat, type TeacherSummary } from "@porao/core";
import { colors } from "./theme";

export function Button({ title, onPress, variant = "solid", disabled }: { title: string; onPress?: () => void; variant?: "solid" | "outline" | "danger"; disabled?: boolean }) {
  const bg = disabled ? "#cbd5e1" : variant === "solid" ? colors.brand : variant === "danger" ? colors.red : "transparent";
  return (
    <Pressable onPress={onPress} disabled={disabled} style={[s.btn, { backgroundColor: bg, borderWidth: variant === "outline" ? 1 : 0, borderColor: colors.brand }]}>
      <Text style={[s.btnText, { color: variant === "outline" ? colors.brand : colors.white }]}>{title}</Text>
    </Pressable>
  );
}

export function Card({ children, style }: { children: React.ReactNode; style?: ViewStyle }) {
  return <View style={[s.card, style]}>{children}</View>;
}

export function Chip({ label, tone = "grey" }: { label: string; tone?: "grey" | "green" | "amber" }) {
  const map = { grey: ["#f1f5f9", colors.muted], green: [colors.brandLight, colors.brand], amber: [colors.amberLight, colors.amber] } as const;
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
  btn: { borderRadius: 999, paddingVertical: 12, paddingHorizontal: 18, alignItems: "center" },
  btnText: { fontWeight: "600", fontSize: 15 },
  card: { backgroundColor: colors.white, borderRadius: 16, borderWidth: 1, borderColor: colors.border, padding: 14 },
  chip: { fontSize: 12, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999, overflow: "hidden" },
  avatar: { width: 52, height: 52, borderRadius: 26, backgroundColor: "#d1fae5", alignItems: "center", justifyContent: "center" },
  avatarText: { color: colors.brand, fontWeight: "700", fontSize: 16 },
  name: { fontWeight: "700", fontSize: 15, color: colors.text },
  muted: { color: colors.muted, fontSize: 13 },
  row: { flexDirection: "row", gap: 6, marginTop: 6, flexWrap: "wrap" },
  h1: { fontSize: 24, fontWeight: "800", color: colors.text },
  h2: { fontSize: 18, fontWeight: "700", color: colors.text, marginTop: 20, marginBottom: 10 },
  screen: { flex: 1, backgroundColor: colors.bg },
  pad: { padding: 16, gap: 10 },
});
