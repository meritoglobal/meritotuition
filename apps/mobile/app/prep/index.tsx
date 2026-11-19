/** Teacher: class prep. Pick class and subject, then a chapter; topics and materials come up on their own. */
import { CLASS_LEVEL_LABEL_BN, CLASS_LEVELS, bnDigits, type ClassLevel } from "@mastermoshai/core";
import { router } from "expo-router";
import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { subjectBn } from "../../src/data";
import { BOOKS, bookFor } from "../../src/syllabus";
import { colors } from "../../src/theme";
import { Chip, Ionicons } from "../../src/ui";

export default function Prep() {
  const [level, setLevel] = useState<ClassLevel>("CLASS_9_10");
  const subjects = [...new Set(BOOKS.filter((b) => b.level === level).map((b) => b.subject))];
  const [subject, setSubject] = useState(subjects[0] ?? "Physics");
  const book = bookFor(subject, level);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.chalk }} edges={["top", "bottom"]}>
      <View style={st.bar}>
        <Pressable onPress={() => router.back()} hitSlop={10} style={{ padding: 8 }}>
          <Ionicons name="arrow-back" size={22} color={colors.ink} />
        </Pressable>
        <Text style={st.barTitle}>ক্লাসের প্রস্তুতি</Text>
      </View>
      <ScrollView contentContainerStyle={{ paddingBottom: 30 }}>
        <Text style={st.label}>কোন ক্লাস?</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16 }}>
          {CLASS_LEVELS.map((l) => (
            <Chip key={l} label={CLASS_LEVEL_LABEL_BN[l]} on={l === level} onPress={() => setLevel(l)} />
          ))}
        </ScrollView>
        <Text style={st.label}>কোন বিষয়?</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16 }}>
          {(subjects.length ? subjects : ["Physics", "Chemistry", "Biology", "Math", "Higher Math", "English", "ICT"]).map((x) => (
            <Chip key={x} label={subjectBn(x)} on={x === subject} onPress={() => setSubject(x)} />
          ))}
        </ScrollView>

        {book ? (
          <View style={st.list}>
            <Text style={st.count}>
              {bnDigits(book.chapters.length)}টা অধ্যায় · {bnDigits(book.chapters.reduce((a, c) => a + c.topics.length, 0))}টা টপিক
            </Text>
            {book.chapters.map((c, i) => (
              <Pressable
                key={c.no}
                onPress={() => router.push({ pathname: "/prep/[subject]/[chapter]", params: { subject, chapter: String(c.no), level } })}
                style={({ pressed }) => [st.row, i > 0 && st.line, pressed && { backgroundColor: "#f6f4ee" }]}
              >
                <View style={[st.num, c.sheet && { backgroundColor: colors.board }]}>
                  <Text style={[st.numText, c.sheet && { color: colors.white }]}>{bnDigits(c.no)}</Text>
                </View>
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={st.title}>{c.title}</Text>
                  <Text style={st.meta}>
                    {bnDigits(c.topics.length)}টা টপিক · {c.sheet ? "লেকচার শিট তৈরি" : "শিট লেখা চলছে"}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={colors.faint} />
              </Pressable>
            ))}
          </View>
        ) : (
          <View style={st.empty}>
            <Text style={st.emptyH}>এই বইয়ের টপিক সাজানো চলছে</Text>
            <Text style={st.emptyP}>আপাতত ৯ম-১০ম শ্রেণির পদার্থবিজ্ঞান, রসায়ন আর জীববিজ্ঞান তৈরি। বাকি ক্লাস আর বই একে একে আসছে।</Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const st = StyleSheet.create({
  bar: { flexDirection: "row", alignItems: "center", height: 52, paddingHorizontal: 6, borderBottomWidth: 1, borderBottomColor: colors.line, backgroundColor: colors.white },
  barTitle: { fontSize: 17, fontWeight: "700", color: colors.ink, marginLeft: 4 },
  label: { fontSize: 14, fontWeight: "700", color: colors.muted, marginHorizontal: 16, marginTop: 18, marginBottom: 8 },
  list: { marginHorizontal: 16, marginTop: 18, backgroundColor: colors.white, borderRadius: 12, borderWidth: 1, borderColor: colors.line, paddingHorizontal: 14, paddingBottom: 4 },
  count: { fontSize: 13, color: colors.muted, paddingTop: 12, paddingBottom: 4 },
  row: { flexDirection: "row", alignItems: "center", paddingVertical: 12 },
  line: { borderTopWidth: 1, borderTopColor: colors.line },
  num: { width: 38, height: 38, borderRadius: 10, backgroundColor: colors.boardSoft, alignItems: "center", justifyContent: "center" },
  numText: { fontSize: 15, fontWeight: "700", color: colors.board },
  title: { fontSize: 15, fontWeight: "600", color: colors.ink },
  meta: { fontSize: 12.5, color: colors.muted, marginTop: 2 },
  empty: { margin: 16, marginTop: 24, padding: 18, borderRadius: 12, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.line },
  emptyH: { fontSize: 16, fontWeight: "700", color: colors.ink },
  emptyP: { fontSize: 14, color: colors.muted, marginTop: 6, lineHeight: 21 },
});
