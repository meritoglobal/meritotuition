/** Me: login, payments, teacher panel, settings. */
import Constants from "expo-constants";
import * as Linking from "expo-linking";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { SITE, openPage } from "../../src/site";
import { colors } from "../../src/theme";
import { Button, Ionicons, Mark, Screen, TabHeader, type IconName } from "../../src/ui";

type Row = { icon: IconName; label: string; sub?: string; go: () => void };

export default function Me() {
  const groups: { title: string; rows: Row[] }[] = [
    {
      title: "আমার পড়াশোনা",
      rows: [
        { icon: "wallet-outline", label: "পেমেন্ট ও রিফান্ড", sub: "কত টাকা জমা, কত ফেরত", go: () => openPage("/dashboard/student", "পেমেন্ট ও রিফান্ড") },
        { icon: "flag-outline", label: "নালিশ করি", sub: "টিচার আসেননি বা দেরি করেছেন", go: () => openPage("/dashboard/student", "নালিশ") },
        { icon: "download-outline", label: "সেভ করা রেকর্ডিং", sub: "ফোনের Files / Downloads এ থাকে", go: () => openPage("/dashboard/student", "আমার ক্লাস") },
      ],
    },
    {
      title: "টিচারদের জন্য",
      rows: [
        { icon: "easel-outline", label: "টিচার প্যানেল", sub: "ব্যাচ, স্টুডেন্ট, আয়", go: () => openPage("/teach", "টিচার প্যানেল") },
        { icon: "school-outline", label: "মাস্টারমশাই হতে চাই", sub: "BUET, ঢাবি, মেডিকেলের ছাত্রছাত্রীরা", go: () => openPage("/teach/profile", "টিচার প্রোফাইল") },
      ],
    },
    {
      title: "অন্যান্য",
      rows: [
        { icon: "language-outline", label: "ভাষা", sub: "বাংলা", go: () => {} },
        { icon: "shield-outline", label: "প্রাইভেসি পলিসি", go: () => openPage("/privacy", "প্রাইভেসি") },
        { icon: "globe-outline", label: "ওয়েবসাইট খুলি", go: () => void Linking.openURL(SITE) },
      ],
    },
  ];

  return (
    <Screen>
      <TabHeader title="আমি" />
      <View style={st.profile}>
        <Mark size={56} />
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text style={st.pName}>এখনো লগইন করোনি</Text>
          <Text style={st.pSub}>ইমেইলে একটা কোড যাবে, পাসওয়ার্ড লাগবে না।</Text>
        </View>
      </View>
      <View style={{ paddingHorizontal: 16, marginTop: 10 }}>
        <Button label="লগইন / অ্যাকাউন্ট খুলি" icon="log-in-outline" onPress={() => openPage("/login", "লগইন")} />
      </View>

      {groups.map((g) => (
        <View key={g.title} style={{ marginTop: 24 }}>
          <Text style={st.gTitle}>{g.title}</Text>
          <View style={st.group}>
            {g.rows.map((r, i) => (
              <Pressable key={r.label} onPress={r.go} style={({ pressed }) => [st.row, i > 0 && st.rowLine, pressed && { backgroundColor: "#f6f4ee" }]}>
                <View style={st.icon}>
                  <Ionicons name={r.icon} size={19} color={colors.board} />
                </View>
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={st.label}>{r.label}</Text>
                  {r.sub ? <Text style={st.sub}>{r.sub}</Text> : null}
                </View>
                <Ionicons name="chevron-forward" size={18} color={colors.faint} />
              </Pressable>
            ))}
          </View>
        </View>
      ))}
      <Text style={st.ver}>মাস্টারমশাই · ভার্সন {Constants.expoConfig?.version ?? "1.0.0"}</Text>
    </Screen>
  );
}

const st = StyleSheet.create({
  profile: { flexDirection: "row", alignItems: "center", marginHorizontal: 16, marginTop: 14, padding: 14, backgroundColor: colors.white, borderRadius: 12, borderWidth: 1, borderColor: colors.line },
  pName: { fontSize: 17, fontWeight: "700", color: colors.ink },
  pSub: { fontSize: 13, color: colors.muted, marginTop: 3, lineHeight: 19 },
  gTitle: { fontSize: 13, fontWeight: "600", color: colors.muted, marginHorizontal: 16, marginBottom: 8 },
  group: { marginHorizontal: 16, backgroundColor: colors.white, borderRadius: 12, borderWidth: 1, borderColor: colors.line, overflow: "hidden" },
  row: { flexDirection: "row", alignItems: "center", paddingHorizontal: 14, paddingVertical: 12 },
  rowLine: { borderTopWidth: 1, borderTopColor: colors.line },
  icon: { width: 36, height: 36, borderRadius: 9, backgroundColor: colors.boardSoft, alignItems: "center", justifyContent: "center" },
  label: { fontSize: 15, fontWeight: "600", color: colors.ink },
  sub: { fontSize: 12.5, color: colors.muted, marginTop: 2 },
  ver: { textAlign: "center", fontSize: 12, color: colors.faint, marginTop: 26 },
});
