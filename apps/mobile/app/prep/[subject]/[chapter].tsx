/** Teacher: one chapter, topic by topic, with everything needed to teach it. */
import { bnDigits } from "@mastermoshai/core";
import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { subjectBn } from "../../../src/data";
import { bookFor } from "../../../src/syllabus";
import { openPage } from "../../../src/site";
import { colors } from "../../../src/theme";
import { Button, Ionicons, Tag, type IconName } from "../../../src/ui";

export default function ChapterPrep() {
  const { subject = "Physics", chapter = "1", level = "CLASS_9_10" } = useLocalSearchParams<{ subject?: string; chapter?: string; level?: string }>();
  const c = bookFor(subject, level)?.chapters.find((x) => String(x.no) === chapter);
  const [done, setDone] = useState<Set<number>>(new Set());
  if (!c) return null;
  const ready = !!c.sheet;
  const open = (title: string) => (c.sheet ? openPage(c.sheet, title) : undefined);

  const materials: { icon: IconName; label: string; sub: string; on: boolean; go?: () => void }[] = [
    { icon: "document-text-outline", label: "লেকচার শিট", sub: "সব টপিক, উদাহরণ আর ছবি", on: ready, go: () => open(`অধ্যায় ${bnDigits(c.no)}: ${c.title}`) },
    { icon: "list-outline", label: "MCQ সেট", sub: "টপিক ধরে, এক ট্যাপে ক্লাসে পাঠান", on: ready, go: () => open("MCQ") },
    { icon: "create-outline", label: "সৃজনশীল প্রশ্ন", sub: "মডেল উত্তরসহ", on: ready, go: () => open("সৃজনশীল") },
    { icon: "time-outline", label: "বোর্ডের আগের প্রশ্ন", sub: "টপিক ধরে সাজানো, কোনটা কতবার এসেছে", on: false },
    { icon: "easel-outline", label: "স্লাইড ও বোর্ডে আঁকার ছবি", sub: "লাইভ ক্লাসের PDF বোর্ডে খুলবে", on: false },
  ];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.chalk }} edges={["top", "bottom"]}>
      <View style={st.bar}>
        <Pressable onPress={() => router.back()} hitSlop={10} style={{ padding: 8 }}>
          <Ionicons name="arrow-back" size={22} color={colors.ink} />
        </Pressable>
        <Text style={st.barTitle} numberOfLines={1}>
          {subjectBn(subject)} · অধ্যায় {bnDigits(c.no)}
        </Text>
      </View>
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 30 }}>
        <Text style={st.h}>{c.title}</Text>
        <Text style={st.sub}>৯ম-১০ম শ্রেণি · NCTB ২০২৬ বই অনুযায়ী · {bnDigits(c.topics.length)}টা টপিক</Text>

        <Text style={st.section}>পড়ানোর জিনিসপত্র</Text>
        <View style={st.card}>
          {materials.map((m, i) => (
            <Pressable key={m.label} disabled={!m.on} onPress={m.go} style={[st.row, i > 0 && st.line]}>
              <View style={[st.icon, !m.on && { backgroundColor: "#f1eee6" }]}>
                <Ionicons name={m.icon} size={19} color={m.on ? colors.board : colors.faint} />
              </View>
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={[st.rowT, !m.on && { color: colors.muted }]}>{m.label}</Text>
                <Text style={st.rowM}>{m.on ? m.sub : "তৈরি হচ্ছে, শিগগির আসছে"}</Text>
              </View>
              {m.on ? <Ionicons name="chevron-forward" size={18} color={colors.faint} /> : <Ionicons name="lock-closed-outline" size={15} color={colors.faint} />}
            </Pressable>
          ))}
        </View>

        <Text style={st.section}>টপিক ধরে প্রস্তুতি</Text>
        <View style={st.card}>
          {c.topics.map((t, i) => {
            const on = done.has(i);
            return (
              <Pressable
                key={t}
                onPress={() => setDone((d) => { const n = new Set(d); if (n.has(i)) n.delete(i); else n.add(i); return n; })}
                style={[st.row, i > 0 && st.line]}
              >
                <Ionicons name={on ? "checkbox" : "square-outline"} size={22} color={on ? colors.board : colors.faint} />
                <Text style={[st.topic, on && { color: colors.muted, textDecorationLine: "line-through" }]}>
                  {bnDigits(c.no)}.{bnDigits(i + 1)} {t}
                </Text>
                {ready ? (
                  <Pressable hitSlop={8} onPress={() => open(t)}>
                    <Tag label="শিট" />
                  </Pressable>
                ) : null}
              </Pressable>
            );
          })}
        </View>
        <Text style={st.hint}>যে টপিক পড়ানো শেষ, টিক দিন। স্টুডেন্টদের "পড়া কতদূর" হিসাবে এটা যোগ হবে।</Text>

        <Button label="এই অধ্যায় দিয়ে ক্লাস শুরু করি" icon="videocam" style={{ marginTop: 18 }} onPress={() => openPage("/class/demo?as=teacher", "লাইভ ক্লাস")} />
        <Button label="এই অধ্যায়ের পরীক্ষা পাঠাই" kind="ghost" icon="send-outline" style={{ marginTop: 10 }} onPress={() => openPage("/class/demo/exams/new?as=teacher", "পরীক্ষা বানাই")} />
      </ScrollView>
    </SafeAreaView>
  );
}

const st = StyleSheet.create({
  bar: { flexDirection: "row", alignItems: "center", height: 52, paddingHorizontal: 6, borderBottomWidth: 1, borderBottomColor: colors.line, backgroundColor: colors.white },
  barTitle: { fontSize: 17, fontWeight: "700", color: colors.ink, marginLeft: 4, flex: 1 },
  h: { fontSize: 24, fontWeight: "700", color: colors.ink },
  sub: { fontSize: 13.5, color: colors.muted, marginTop: 4 },
  section: { fontSize: 16, fontWeight: "700", color: colors.ink, marginTop: 22, marginBottom: 10 },
  card: { backgroundColor: colors.white, borderRadius: 12, borderWidth: 1, borderColor: colors.line, paddingHorizontal: 14 },
  row: { flexDirection: "row", alignItems: "center", paddingVertical: 12 },
  line: { borderTopWidth: 1, borderTopColor: colors.line },
  icon: { width: 36, height: 36, borderRadius: 9, backgroundColor: colors.boardSoft, alignItems: "center", justifyContent: "center" },
  rowT: { fontSize: 15, fontWeight: "600", color: colors.ink },
  rowM: { fontSize: 12.5, color: colors.muted, marginTop: 2 },
  topic: { flex: 1, fontSize: 14.5, color: colors.ink, marginLeft: 10 },
  hint: { fontSize: 12.5, color: colors.muted, marginTop: 8, lineHeight: 18 },
});
