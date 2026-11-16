/** Student/guardian: post what you need; matching teachers nearby get notified and send bids. */
import { AREA_LABEL_BN, CLASS_LEVEL_LABEL_BN, CLASS_LEVELS, DHAKA_AREAS, SUBJECTS, bnDigits, type ClassLevel } from "@mastermoshai/core";
import { router } from "expo-router";
import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { subjectBn } from "../../src/data";
import { useLevel } from "../../src/prefs";
import { colors } from "../../src/theme";
import { Button, Chip, Ionicons, Segmented } from "../../src/ui";

const BUDGETS = [2000, 3000, 4000, 5000, 6000, 8000, 10000];

export default function NewRequest() {
  const myLevel = useLevel();
  const [mode, setMode] = useState<"OFFLINE" | "ONLINE">("OFFLINE");
  const [level, setLevel] = useState<ClassLevel>(myLevel);
  const [subjects, setSubjects] = useState<string[]>([]);
  const [area, setArea] = useState("Farmgate");
  const [days, setDays] = useState(3);
  const [budget, setBudget] = useState(4000);
  const [note, setNote] = useState("");
  const ok = subjects.length > 0;

  const toggle = (x: string) => setSubjects((s) => (s.includes(x) ? s.filter((y) => y !== x) : [...s, x]));

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.chalk }} edges={["top", "bottom"]}>
      <View style={st.bar}>
        <Pressable onPress={() => router.back()} hitSlop={10} style={{ padding: 8 }}>
          <Ionicons name="close" size={22} color={colors.ink} />
        </Pressable>
        <Text style={st.barTitle}>টিউটর চাই</Text>
      </View>
      <ScrollView contentContainerStyle={{ paddingBottom: 30 }} keyboardShouldPersistTaps="handled">
        <Text style={st.lead}>কী লাগবে লিখে দাও। তোমার এলাকার মানানসই টিচাররা নোটিফিকেশন পাবেন আর নিজেরাই প্রস্তাব (বিড) পাঠাবেন। ফোন নম্বর কেউ দেখবে না।</Text>

        <Text style={st.label}>কীভাবে পড়বে?</Text>
        <Segmented value={mode} onChange={setMode} options={[{ value: "OFFLINE", label: "টিচার বাসায় আসবেন" }, { value: "ONLINE", label: "অনলাইনে" }]} />

        <Text style={st.label}>ক্লাস</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16 }}>
          {CLASS_LEVELS.map((l) => <Chip key={l} label={CLASS_LEVEL_LABEL_BN[l]} on={l === level} onPress={() => setLevel(l)} />)}
        </ScrollView>

        <Text style={st.label}>বিষয় (একাধিক বাছতে পারো)</Text>
        <View style={st.wrap}>
          {SUBJECTS.map((x) => <View key={x} style={{ marginBottom: 8 }}><Chip label={subjectBn(x)} on={subjects.includes(x)} onPress={() => toggle(x)} /></View>)}
        </View>

        {mode === "OFFLINE" ? (
          <>
            <Text style={st.label}>এলাকা</Text>
            <View style={st.wrap}>
              {Object.keys(DHAKA_AREAS).map((a) => <View key={a} style={{ marginBottom: 8 }}><Chip label={AREA_LABEL_BN[a] ?? a} on={a === area} onPress={() => setArea(a)} /></View>)}
            </View>
          </>
        ) : null}

        <Text style={st.label}>সপ্তাহে কয় দিন?</Text>
        <View style={st.wrap}>
          {[2, 3, 4, 5, 6].map((d) => <Chip key={d} label={`${bnDigits(d)} দিন`} on={d === days} onPress={() => setDays(d)} />)}
        </View>

        <Text style={st.label}>মাসিক বাজেট</Text>
        <View style={st.wrap}>
          {BUDGETS.map((b) => <View key={b} style={{ marginBottom: 8 }}><Chip label={`৳${bnDigits(b.toLocaleString("en-IN"))}`} on={b === budget} onPress={() => setBudget(b)} /></View>)}
        </View>

        <Text style={st.label}>আর কিছু বলার আছে?</Text>
        <TextInput value={note} onChangeText={setNote} multiline placeholder="যেমন: টেস্ট পরীক্ষার আগে রিভিশন চাই, শুধু মেয়ে টিচার, বিকালে সুবিধা..." placeholderTextColor={colors.faint} style={st.input} />

        <View style={{ paddingHorizontal: 16, marginTop: 20 }}>
          <Button
            label={ok ? "পোস্ট করি, টিচাররা প্রস্তাব দিক" : "অন্তত একটা বিষয় বাছো"}
            icon="megaphone-outline"
            kind={ok ? "gold" : "ghost"}
            onPress={() => ok && router.replace({ pathname: "/request/[id]", params: { id: "q1", fresh: "1" } })}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const st = StyleSheet.create({
  bar: { flexDirection: "row", alignItems: "center", height: 52, paddingHorizontal: 6, borderBottomWidth: 1, borderBottomColor: colors.line, backgroundColor: colors.white },
  barTitle: { fontSize: 17, fontWeight: "700", color: colors.ink, marginLeft: 4 },
  lead: { fontSize: 14, color: colors.muted, lineHeight: 21, margin: 16, marginBottom: 0 },
  label: { fontSize: 14, fontWeight: "700", color: colors.ink, marginHorizontal: 16, marginTop: 20, marginBottom: 8 },
  wrap: { flexDirection: "row", flexWrap: "wrap", paddingHorizontal: 16 },
  input: { marginHorizontal: 16, minHeight: 90, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.line, borderRadius: 10, padding: 12, fontSize: 15, color: colors.ink, textAlignVertical: "top" },
});
