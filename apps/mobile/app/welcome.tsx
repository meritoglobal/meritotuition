/** First launch: who is using the app? Decides which version of the app they see. */
import { router } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { setRole, type Role } from "../src/prefs";
import { colors } from "../src/theme";
import { Ionicons, Mark, type IconName } from "../src/ui";

const CHOICES: { role: Role; icon: IconName; title: string; sub: string }[] = [
  { role: "student", icon: "school-outline", title: "আমি স্টুডেন্ট / অভিভাবক", sub: "টিউটর খুঁজব, ক্লাস করব, পরীক্ষা দেব" },
  { role: "teacher", icon: "easel-outline", title: "আমি টিচার", sub: "ব্যাচ চালাব, ক্লাস নেব, আয় দেখব" },
];

export default function Welcome() {
  const pick = (r: Role) => { setRole(r); router.replace("/"); };
  return (
    <SafeAreaView style={st.wrap}>
      <View style={{ alignItems: "center", marginTop: 40 }}>
        <Mark size={96} />
        <Text style={st.brand}>মাস্টারমশাই</Text>
        <Text style={st.tag}>যে মাস্টারমশাই ফাঁকি দেন না।</Text>
      </View>
      <View style={{ marginTop: 44 }}>
        <Text style={st.q}>তুমি কে?</Text>
        {CHOICES.map((c) => (
          <Pressable key={c.role} onPress={() => pick(c.role)} style={({ pressed }) => [st.card, pressed && { borderColor: colors.board }]}>
            <View style={[st.icon, c.role === "teacher" && { backgroundColor: colors.goldSoft }]}>
              <Ionicons name={c.icon} size={26} color={c.role === "teacher" ? "#7a5d00" : colors.board} />
            </View>
            <View style={{ flex: 1, marginLeft: 14 }}>
              <Text style={st.title}>{c.title}</Text>
              <Text style={st.sub}>{c.sub}</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.faint} />
          </Pressable>
        ))}
        <Text style={st.note}>পরে "আমি" ট্যাব থেকে যেকোনো সময় বদলানো যাবে।</Text>
      </View>
    </SafeAreaView>
  );
}

const st = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: colors.chalk, paddingHorizontal: 20 },
  brand: { fontSize: 28, fontWeight: "700", color: colors.ink, marginTop: 12 },
  tag: { fontSize: 15, color: colors.muted, marginTop: 4 },
  q: { fontSize: 20, fontWeight: "700", color: colors.ink, marginBottom: 12 },
  card: { flexDirection: "row", alignItems: "center", backgroundColor: colors.white, borderRadius: 14, borderWidth: 1.5, borderColor: colors.line, padding: 16, marginBottom: 12 },
  icon: { width: 52, height: 52, borderRadius: 14, backgroundColor: colors.boardSoft, alignItems: "center", justifyContent: "center" },
  title: { fontSize: 17, fontWeight: "700", color: colors.ink },
  sub: { fontSize: 13.5, color: colors.muted, marginTop: 3 },
  note: { fontSize: 13, color: colors.faint, textAlign: "center", marginTop: 10 },
});
