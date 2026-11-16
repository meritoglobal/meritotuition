/** Find a tutor: online / at home switch, subject chips, tutor cards (Preply-style list). */
import { AREA_LABEL_BN, bnDigits, formatTakaL, hasTrialSeat, SUBJECTS, type Subject, type TeacherSummary } from "@mastermoshai/core";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { FlatList, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { subjectBn, teachers } from "../../src/data";
import { useLevel } from "../../src/prefs";
import { colors } from "../../src/theme";
import { Avatar, Card, Chip, Ionicons, Screen, Segmented, Tag, TabHeader } from "../../src/ui";

type Mode = "ALL" | "ONLINE" | "OFFLINE";

export default function Tutors() {
  const params = useLocalSearchParams<{ mode?: string; trial?: string }>();
  const level = useLevel();
  const [mode, setMode] = useState<Mode>("ALL");
  const [subject, setSubject] = useState<Subject | null>(null);
  const [trial, setTrial] = useState(false);
  const [q, setQ] = useState("");
  const [myLevel, setMyLevel] = useState(true);

  // Home screen buttons open this tab already filtered.
  useEffect(() => {
    if (params.mode === "ONLINE" || params.mode === "OFFLINE") setMode(params.mode);
    if (params.trial === "1") setTrial(true);
  }, [params.mode, params.trial]);

  const list = useMemo(() => {
    const text = q.trim().toLowerCase();
    return teachers.filter(
      (t) =>
        (mode === "ALL" || t.modes.includes(mode)) &&
        (!subject || t.subjects.includes(subject)) &&
        (!trial || t.routine.some(hasTrialSeat)) &&
        (!myLevel || t.levels.includes(level)) &&
        (!text || `${t.name} ${t.nameBn ?? ""} ${t.university} ${t.subjects.map(subjectBn).join(" ")}`.toLowerCase().includes(text)),
    );
  }, [mode, subject, trial, q, level, myLevel]);

  return (
    <Screen scroll={false}>
      <TabHeader title="টিউটর খুঁজি" sub="BUET, ঢাবি, মেডিকেলের যাচাই করা টিচার" />
      <View style={st.search}>
        <Ionicons name="search" size={18} color={colors.faint} />
        <TextInput value={q} onChangeText={setQ} placeholder="নাম, বিষয় বা ভার্সিটি লিখে খোঁজো" placeholderTextColor={colors.faint} style={st.input} />
      </View>
      <Segmented<Mode>
        value={mode}
        onChange={setMode}
        options={[
          { value: "ALL", label: "সব" },
          { value: "ONLINE", label: "অনলাইনে" },
          { value: "OFFLINE", label: "বাসায় এসে" },
        ]}
      />
      <View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 12 }}>
          <Chip label="ফ্রি ট্রায়াল" on={trial} onPress={() => setTrial(!trial)} />
          <Chip label="আমার ক্লাসের" on={myLevel} onPress={() => setMyLevel(!myLevel)} />
          {SUBJECTS.map((x) => (
            <Chip key={x} label={subjectBn(x)} on={subject === x} onPress={() => setSubject(subject === x ? null : x)} />
          ))}
        </ScrollView>
      </View>
      <FlatList
        data={list}
        keyExtractor={(t) => t.id}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 24 }}
        ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
        ListHeaderComponent={
          <>
            <Pressable style={st.post} onPress={() => router.push("/request/new")}>
              <Ionicons name="megaphone-outline" size={20} color={colors.board} />
              <Text style={st.postText}>খুঁজতে ইচ্ছে করছে না? চাহিদা পোস্ট করো, টিচাররাই প্রস্তাব পাঠাবেন।</Text>
              <Ionicons name="chevron-forward" size={18} color={colors.board} />
            </Pressable>
            <Text style={st.count}>{bnDigits(list.length)} জন টিচার পাওয়া গেছে</Text>
          </>
        }
        ListEmptyComponent={
          <View style={st.empty}>
            <Text style={st.emptyH}>এই ফিল্টারে কাউকে পেলাম না</Text>
            <Text style={st.emptyP}>একটা-দুটো ফিল্টার সরিয়ে দেখো, মাস্টারমশাই ঠিকই মিলবে।</Text>
          </View>
        }
        renderItem={({ item, index }) => <TutorCard t={item} tone={index} />}
      />
    </Screen>
  );
}

export function TutorCard({ t, tone }: { t: TeacherSummary; tone: number }) {
  const trial = t.routine.some(hasTrialSeat);
  return (
    <Card onPress={() => router.push(`/teacher/${t.id}`)}>
      <View style={{ flexDirection: "row" }}>
        <Avatar name={t.name} size={56} tone={tone} />
        <View style={{ flex: 1, marginLeft: 12 }}>
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <Text style={st.name} numberOfLines={1}>
              {t.nameBn ?? t.name}
            </Text>
            {t.verified ? <Ionicons name="checkmark-circle" size={16} color={colors.board} style={{ marginLeft: 4 }} /> : null}
          </View>
          <Text style={st.uni} numberOfLines={1}>
            {t.university} · {t.departmentBn ?? t.department}
          </Text>
          <View style={st.rating}>
            <Ionicons name="star" size={13} color="#e0a800" />
            <Text style={st.ratingText}>
              {bnDigits(t.rating.toFixed(1))} · {bnDigits(t.reviewCount)} রিভিউ
            </Text>
            {t.area ? <Text style={st.area}> · {AREA_LABEL_BN[t.area.name] ?? t.area.name}</Text> : null}
          </View>
        </View>
      </View>
      <View style={{ flexDirection: "row", flexWrap: "wrap", marginTop: 6 }}>
        {t.subjects.slice(0, 3).map((x) => (
          <Tag key={x} label={subjectBn(x)} tone="grey" />
        ))}
        {t.modes.includes("ONLINE") ? <Tag label="অনলাইন" /> : null}
        {t.modes.includes("OFFLINE") ? <Tag label="বাসায়" /> : null}
        {trial ? <Tag label="ফ্রি ট্রায়াল" tone="gold" /> : null}
      </View>
      <View style={st.foot}>
        <Text style={st.price}>
          মাসে <Text style={{ fontWeight: "700", color: colors.ink }}>{formatTakaL(t.fromPrice, "bn")}</Text> থেকে
        </Text>
        <Pressable onPress={() => router.push(`/teacher/${t.id}`)} style={st.see}>
          <Text style={st.seeText}>রুটিন দেখি</Text>
          <Ionicons name="chevron-forward" size={15} color={colors.board} />
        </Pressable>
      </View>
    </Card>
  );
}

const st = StyleSheet.create({
  search: { flexDirection: "row", alignItems: "center", gap: 8, marginHorizontal: 16, marginVertical: 12, paddingHorizontal: 12, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.line, borderRadius: 10, height: 46 },
  input: { flex: 1, fontSize: 15, color: colors.ink },
  post: { flexDirection: "row", alignItems: "center", gap: 10, padding: 12, borderRadius: 10, backgroundColor: colors.boardSoft, marginBottom: 12 },
  postText: { flex: 1, fontSize: 13.5, color: colors.board, fontWeight: "600", lineHeight: 19 },
  count: { fontSize: 13, color: colors.muted, marginBottom: 10 },
  name: { fontSize: 16, fontWeight: "700", color: colors.ink, flexShrink: 1 },
  uni: { fontSize: 13, color: colors.muted, marginTop: 2 },
  rating: { flexDirection: "row", alignItems: "center", gap: 3, marginTop: 5 },
  ratingText: { fontSize: 13, color: colors.ink },
  area: { fontSize: 13, color: colors.muted },
  foot: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 12, paddingTop: 10, borderTopWidth: 1, borderTopColor: colors.line },
  price: { fontSize: 14, color: colors.muted },
  see: { flexDirection: "row", alignItems: "center" },
  seeText: { fontSize: 14, fontWeight: "700", color: colors.board },
  empty: { alignItems: "center", padding: 30 },
  emptyH: { fontSize: 16, fontWeight: "700", color: colors.ink },
  emptyP: { fontSize: 14, color: colors.muted, textAlign: "center", marginTop: 6 },
});
