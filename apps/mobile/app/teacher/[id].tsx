/** Tutor profile: who they are, weekly batches with seats left, book a free trial or a seat. */
import {
  AREA_LABEL_BN,
  CLASS_LEVEL_LABEL_BN,
  WEEKDAY_SHORT_BN,
  bnDigits,
  classesPerMonth,
  formatTakaL,
  hasTrialSeat,
  openSeats,
  timeLabelL,
} from "@mastermoshai/core";
import { router, useLocalSearchParams } from "expo-router";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { subjectBn, teacherById, videos } from "../../src/data";
import { openPage } from "../../src/site";
import { colors } from "../../src/theme";
import { Avatar, Button, Card, Ionicons, Tag } from "../../src/ui";

export default function TeacherProfile() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const t = teacherById(String(id));
  if (!t) {
    return (
      <SafeAreaView style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
        <Text>টিচার পাওয়া যায়নি</Text>
      </SafeAreaView>
    );
  }
  const name = t.nameBn ?? t.name;
  const myVideos = videos.filter((v) => v.teacherId === t.id);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.chalk }} edges={["top", "bottom"]}>
      <View style={st.bar}>
        <Pressable onPress={() => router.back()} hitSlop={10} style={st.back}>
          <Ionicons name="arrow-back" size={22} color={colors.ink} />
        </Pressable>
        <Text style={st.barTitle} numberOfLines={1}>
          {name}
        </Text>
      </View>
      <ScrollView contentContainerStyle={{ paddingBottom: 24 }}>
        <View style={st.head}>
          <Avatar name={t.name} size={84} />
          <View style={{ flexDirection: "row", alignItems: "center", marginTop: 12 }}>
            <Text style={st.name}>{name}</Text>
            {t.verified ? <Ionicons name="checkmark-circle" size={20} color={colors.board} style={{ marginLeft: 6 }} /> : null}
          </View>
          <Text style={st.uni}>
            {t.university} · {t.departmentBn ?? t.department}
          </Text>
          {t.verified ? <Tag label="আইডি ও ভার্সিটি কার্ড যাচাই করা" /> : null}
        </View>

        <View style={st.stats}>
          <Stat big={bnDigits(t.rating.toFixed(1))} small={`${bnDigits(t.reviewCount)} রিভিউ`} icon="star" />
          <Stat big={bnDigits(t.freeVideoCount)} small="ফ্রি ভিডিও" icon="play-circle" />
          <Stat big={t.area ? (AREA_LABEL_BN[t.area.name] ?? t.area.name) : "অনলাইন"} small={t.area ? `${bnDigits(t.area.radiusKm)} কিমি পর্যন্ত` : "সারা দেশে"} icon="location" />
        </View>

        <Card style={{ marginHorizontal: 16, marginTop: 16 }}>
          <Text style={st.h}>মাস্টারমশাই নিজের সম্পর্কে</Text>
          <Text style={st.p}>{t.bioBn ?? t.bio}</Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", marginTop: 4 }}>
            {t.subjects.map((x) => (
              <Tag key={x} label={subjectBn(x)} tone="grey" />
            ))}
            {t.levels.map((l) => (
              <Tag key={l} label={CLASS_LEVEL_LABEL_BN[l]} tone="grey" />
            ))}
          </View>
        </Card>

        <Text style={st.section}>সাপ্তাহিক রুটিন</Text>
        {t.routine.map((slot, i) => {
          const left = openSeats(slot);
          const trial = hasTrialSeat(slot);
          return (
            <Card key={`${slot.id}-${i}`} style={{ marginHorizontal: 16, marginBottom: 10 }}>
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                <Text style={st.slotSubject}>{slot.subjects.map(subjectBn).join(", ")}</Text>
                <View style={{ flex: 1 }} />
                <Tag label={slot.mode === "ONLINE" ? "অনলাইন" : "বাসায়"} tone={slot.mode === "ONLINE" ? "green" : "gold"} />
              </View>
              <Text style={st.slotMeta}>{CLASS_LEVEL_LABEL_BN[slot.level]}</Text>
              <View style={st.days}>
                {[6, 0, 1, 2, 3, 4, 5].map((d) => {
                  const on = slot.days.includes(d as 0);
                  return (
                    <View key={d} style={[st.day, on && st.dayOn]}>
                      <Text style={[st.dayText, on && st.dayTextOn]}>{WEEKDAY_SHORT_BN[d as 0]}</Text>
                    </View>
                  );
                })}
              </View>
              <Text style={st.slotMeta}>
                {timeLabelL(slot.startTime, "bn")} · {bnDigits(slot.durationMin)} মিনিট · মাসে {bnDigits(classesPerMonth(slot))}টা ক্লাস
              </Text>
              <Text style={[st.slotMeta, { color: left === 0 ? colors.redpen : colors.board, fontWeight: "600" }]}>
                {slot.batchSize === 1 ? "একা পড়বে (১:১)" : `${bnDigits(slot.batchSize)} জনের ব্যাচ`} · {left === 0 ? "হাউসফুল" : `${bnDigits(left)}টা সিট খালি`}
              </Text>
              <View style={st.slotFoot}>
                <Text style={st.slotPrice}>
                  {formatTakaL(slot.monthlyPrice, "bn")}
                  <Text style={{ fontSize: 13, fontWeight: "400", color: colors.muted }}> /মাস</Text>
                </Text>
                {trial ? (
                  <Button label="ফ্রি ট্রায়াল নিই" onPress={() => openPage(`/book/${t.id}/${slot.id}`, "ফ্রি ট্রায়াল")} />
                ) : left > 0 ? (
                  <Button label="সিট বুক করি" kind="board" onPress={() => openPage(`/book/${t.id}/${slot.id}`, "সিট বুক")} />
                ) : (
                  <Button label="সিট খালি হলে জানাও" kind="ghost" />
                )}
              </View>
            </Card>
          );
        })}

        {myVideos.length ? (
          <>
            <Text style={st.section}>এই টিচারের ফ্রি ভিডিও</Text>
            {myVideos.map((v) => (
              <Card key={v.id} onPress={() => openPage("/videos", "ফ্রি ভিডিও")} style={{ marginHorizontal: 16, marginBottom: 8, flexDirection: "row", alignItems: "center" }}>
                <View style={st.vThumb}>
                  <Ionicons name="play" size={18} color={colors.gold} />
                </View>
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={st.vTitle}>{v.titleBn}</Text>
                  <Text style={st.slotMeta}>
                    {bnDigits(v.durationMin)} মিনিট · {bnDigits(v.views.toLocaleString("en-IN"))} বার দেখা
                  </Text>
                </View>
              </Card>
            ))}
          </>
        ) : null}

        <View style={st.note}>
          <Ionicons name="shield-checkmark-outline" size={18} color={colors.redpen} />
          <Text style={st.noteText}>মাসের টাকা আমাদের কাছে জমা থাকে। প্রতিটা ক্লাস হলে তবেই টিচার পান। টিচার না এলে সেই ক্লাসের টাকা নিজে থেকেই ফেরত। ১৫ মিনিটের বেশি দেরি করলে নালিশ করলে ওই ক্লাসের অর্ধেক টাকা ফেরত।</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function Stat({ big, small, icon }: { big: string; small: string; icon: "star" | "play-circle" | "location" }) {
  return (
    <View style={st.stat}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
        <Ionicons name={icon} size={15} color={icon === "star" ? "#e0a800" : colors.board} />
        <Text style={st.statBig}>{big}</Text>
      </View>
      <Text style={st.statSmall}>{small}</Text>
    </View>
  );
}

const st = StyleSheet.create({
  bar: { flexDirection: "row", alignItems: "center", height: 52, paddingHorizontal: 8, borderBottomWidth: 1, borderBottomColor: colors.line, backgroundColor: colors.white },
  back: { padding: 8 },
  barTitle: { fontSize: 17, fontWeight: "700", color: colors.ink, marginLeft: 4, flex: 1 },
  head: { alignItems: "center", paddingTop: 22, paddingHorizontal: 16 },
  name: { fontSize: 22, fontWeight: "700", color: colors.ink },
  uni: { fontSize: 14, color: colors.muted, marginTop: 3, textAlign: "center" },
  stats: { flexDirection: "row", marginHorizontal: 16, marginTop: 18, backgroundColor: colors.white, borderRadius: 12, borderWidth: 1, borderColor: colors.line },
  stat: { flex: 1, alignItems: "center", paddingVertical: 12 },
  statBig: { fontSize: 16, fontWeight: "700", color: colors.ink },
  statSmall: { fontSize: 12, color: colors.muted, marginTop: 2 },
  h: { fontSize: 15, fontWeight: "700", color: colors.ink },
  p: { fontSize: 14.5, color: colors.ink, lineHeight: 23, marginTop: 6 },
  section: { fontSize: 17, fontWeight: "700", color: colors.ink, marginHorizontal: 16, marginTop: 24, marginBottom: 10 },
  slotSubject: { fontSize: 16, fontWeight: "700", color: colors.ink },
  slotMeta: { fontSize: 13.5, color: colors.muted, marginTop: 4 },
  days: { flexDirection: "row", gap: 5, marginTop: 10, marginBottom: 4 },
  day: { flex: 1, alignItems: "center", paddingVertical: 6, borderRadius: 6, backgroundColor: "#f1eee6" },
  dayOn: { backgroundColor: colors.board },
  dayText: { fontSize: 11.5, color: colors.faint },
  dayTextOn: { color: colors.white, fontWeight: "700" },
  slotFoot: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: colors.line },
  slotPrice: { fontSize: 20, fontWeight: "700", color: colors.ink },
  vThumb: { width: 54, height: 40, borderRadius: 8, backgroundColor: colors.board, alignItems: "center", justifyContent: "center" },
  vTitle: { fontSize: 14.5, fontWeight: "600", color: colors.ink },
  note: { flexDirection: "row", gap: 10, margin: 16, marginTop: 20, padding: 14, borderRadius: 12, borderWidth: 1, borderColor: "#ecc8c3", backgroundColor: "#fcf3f1" },
  noteText: { flex: 1, fontSize: 13, color: "#6e2a24", lineHeight: 20 },
});
