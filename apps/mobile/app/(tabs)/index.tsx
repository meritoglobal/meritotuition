/**
 * Home: today's class on top, then one button per feature (the way Shikho,
 * 10 Minute School and Chorcha lay out their apps), then "where you stopped",
 * top tutors and free videos.
 */
import { CLASS_LEVEL_LABEL_BN, CLASS_LEVELS, bnDigits, formatTakaL, timeLabelL, dhakaTime, type ClassLevel } from "@mastermoshai/core";
import { router } from "expo-router";
import { useMemo, useState } from "react";
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { myClasses, progress, subjectBn, teachers, videos } from "../../src/data";
import { setLevel, useLevel } from "../../src/prefs";
import { openPage } from "../../src/site";
import { colors } from "../../src/theme";
import { Avatar, Bar, Button, Card, Ionicons, Mark, Screen, Section, type IconName } from "../../src/ui";

type Feature = { label: string; icon: IconName; tint: string; fg: string; go: () => void; badge?: string };

const FEATURES: Feature[] = [
  { label: "অনলাইন\nটিউটর", icon: "laptop-outline", tint: colors.boardSoft, fg: colors.board, go: () => router.push({ pathname: "/tutors", params: { mode: "ONLINE" } }) },
  { label: "বাসায়\nটিউটর", icon: "home-outline", tint: colors.boardSoft, fg: colors.board, go: () => router.push({ pathname: "/tutors", params: { mode: "OFFLINE" } }) },
  { label: "লাইভ\nক্লাস", icon: "videocam-outline", tint: colors.redSoft, fg: colors.redpen, go: () => router.push("/classes"), badge: "LIVE" },
  { label: "ফ্রি\nট্রায়াল", icon: "gift-outline", tint: colors.goldSoft, fg: "#7a5d00", go: () => router.push({ pathname: "/tutors", params: { trial: "1" } }) },
  { label: "লেকচার\nশিট", icon: "document-text-outline", tint: colors.goldSoft, fg: "#7a5d00", go: () => router.push({ pathname: "/learn", params: { tab: "sheets" } }) },
  { label: "পরীক্ষা", icon: "create-outline", tint: colors.boardSoft, fg: colors.board, go: () => router.push({ pathname: "/learn", params: { tab: "exams" } }) },
  { label: "ফ্রি\nভিডিও", icon: "play-circle-outline", tint: colors.redSoft, fg: colors.redpen, go: () => router.push({ pathname: "/learn", params: { tab: "videos" } }) },
  { label: "পেমেন্ট ও\nরিফান্ড", icon: "wallet-outline", tint: colors.boardSoft, fg: colors.board, go: () => openPage("/dashboard/student", "পেমেন্ট ও রিফান্ড") },
];

function greeting(now = new Date()) {
  const h = Number(dhakaTime(now).slice(0, 2));
  if (h < 5) return "এত রাতে পড়ছো!";
  if (h < 12) return "শুভ সকাল";
  if (h < 17) return "শুভ দুপুর";
  if (h < 20) return "শুভ সন্ধ্যা";
  return "শুভ রাত্রি";
}

function whenLabel(d: Date, now = new Date()) {
  const day = (x: Date) => Math.floor((x.getTime() + 6 * 3_600_000) / 86_400_000);
  const diff = day(d) - day(now);
  const time = timeLabelL(dhakaTime(d), "bn");
  if (diff === 0) return `আজ ${time}`;
  if (diff === 1) return `কাল ${time}`;
  const wd = ["রবি", "সোম", "মঙ্গল", "বুধ", "বৃহস্পতি", "শুক্র", "শনি"][new Date(d.getTime() + 6 * 3_600_000).getUTCDay()];
  return `${wd}বার ${time}`;
}

function countdown(d: Date, now = new Date()) {
  const min = Math.max(0, Math.round((d.getTime() - now.getTime()) / 60_000));
  if (min < 60) return `${bnDigits(min)} মিনিট পরে`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${bnDigits(h)} ঘণ্টা ${bnDigits(min % 60)} মিনিট পরে`;
  return `${bnDigits(Math.floor(h / 24))} দিন পরে`;
}

export default function Home() {
  const level = useLevel();
  const [picker, setPicker] = useState(false);
  const { upcoming } = useMemo(() => myClasses(), []);
  const next = upcoming[0];
  const top = useMemo(() => [...teachers].sort((a, b) => b.rating - a.rating).slice(0, 6), []);

  return (
    <Screen>
      {/* Top bar */}
      <View style={st.top}>
        <Mark size={40} />
        <View style={{ flex: 1, marginLeft: 10 }}>
          <Text style={st.hello}>{greeting()}</Text>
          <Text style={st.helloSub}>আজ কী শিখবে?</Text>
        </View>
        <Pressable style={st.levelBtn} onPress={() => setPicker(true)}>
          <Text style={st.levelText}>{CLASS_LEVEL_LABEL_BN[level]}</Text>
          <Ionicons name="chevron-down" size={14} color={colors.ink} />
        </Pressable>
        <Pressable style={st.bell} hitSlop={8} onPress={() => router.push("/classes")}>
          <Ionicons name="notifications-outline" size={22} color={colors.ink} />
          <View style={st.bellDot} />
        </Pressable>
      </View>

      {/* Today's routine */}
      {next ? (
        <View style={st.next}>
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <Text style={st.nextKicker}>আজকের রুটিন</Text>
            <View style={{ flex: 1 }} />
            <Ionicons name="time-outline" size={14} color={colors.gold} />
            <Text style={st.nextCount}>{countdown(next.start)}</Text>
          </View>
          <Text style={st.nextSubject}>{subjectBn(next.subject)}</Text>
          <Text style={st.nextMeta}>
            {next.teacher.nameBn} · {whenLabel(next.start)} · {bnDigits(next.durationMin)} মিনিট
          </Text>
          <View style={{ flexDirection: "row", marginTop: 14 }}>
            <Button label="ক্লাসে ঢুকি" icon="enter-outline" onPress={() => openPage("/class/demo", "লাইভ ক্লাস")} style={{ flex: 1 }} />
            <Pressable style={st.nextGhost} onPress={() => router.push("/classes")}>
              <Text style={st.nextGhostText}>পুরো রুটিন</Text>
            </Pressable>
          </View>
          <Text style={st.nextNote}>দরজা খোলে ক্লাসের ১০ মিনিট আগে। টিচার না এলে সেই ক্লাসের টাকা ফেরত।</Text>
        </View>
      ) : null}

      {/* One button per feature */}
      <Section title="কী লাগবে আজ?">
        <View style={st.grid}>
          {FEATURES.map((f) => (
            <Pressable key={f.label} onPress={f.go} style={({ pressed }) => [st.tile, pressed && { backgroundColor: "#f1eee6" }]}>
              <View style={[st.tileIcon, { backgroundColor: f.tint }]}>
                <Ionicons name={f.icon} size={24} color={f.fg} />
                {f.badge ? (
                  <View style={st.badge}>
                    <Text style={st.badgeText}>{f.badge}</Text>
                  </View>
                ) : null}
              </View>
              <Text style={st.tileText} numberOfLines={2}>
                {f.label}
              </Text>
            </Pressable>
          ))}
        </View>
      </Section>

      {/* Where you stopped */}
      <Section title="পড়া কোথায় থামল" action="সব দেখি" onAction={() => router.push("/learn")}>
        <Card style={{ marginHorizontal: 16, paddingVertical: 4 }}>
          {progress.map((p, i) => (
            <Pressable
              key={p.chapter}
              onPress={() => (p.sheet ? openPage(p.sheet, p.chapter) : router.push({ pathname: "/learn", params: { tab: "sheets" } }))}
              style={[st.progRow, i > 0 && st.rowLine]}
            >
              <View style={{ flex: 1 }}>
                <Text style={st.progSubject}>{subjectBn(p.subject)}</Text>
                <Text style={st.progChapter}>{p.chapter}</Text>
                <View style={{ marginTop: 8 }}>
                  <Bar value={p.done} color={p.done >= 0.5 ? colors.board : colors.gold} />
                </View>
              </View>
              <Text style={st.progPct}>{bnDigits(Math.round(p.done * 100))}%</Text>
              <Ionicons name="chevron-forward" size={18} color={colors.faint} />
            </Pressable>
          ))}
        </Card>
      </Section>

      {/* Top tutors */}
      <Section title="সেরা মাস্টারমশাইরা" action="সবাই" onAction={() => router.push("/tutors")}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16 }}>
          {top.map((t, i) => (
            <Card key={t.id} onPress={() => router.push(`/teacher/${t.id}`)} style={st.tutor}>
              <Avatar name={t.name} size={52} tone={i} />
              <Text style={st.tutorName} numberOfLines={1}>
                {t.nameBn ?? t.name}
              </Text>
              <Text style={st.tutorUni} numberOfLines={1}>
                {t.university}
              </Text>
              <View style={st.tutorRating}>
                <Ionicons name="star" size={13} color="#e0a800" />
                <Text style={st.tutorRatingText}>
                  {bnDigits(t.rating.toFixed(1))} ({bnDigits(t.reviewCount)})
                </Text>
              </View>
              <Text style={st.tutorPrice}>মাসে {formatTakaL(t.fromPrice, "bn")} থেকে</Text>
            </Card>
          ))}
        </ScrollView>
      </Section>

      {/* Free videos */}
      <Section title="ফ্রি ভিডিও" action="সব ভিডিও" onAction={() => router.push({ pathname: "/learn", params: { tab: "videos" } })}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16 }}>
          {videos.map((v) => (
            <Pressable key={v.id} style={st.video} onPress={() => openPage("/videos", "ফ্রি ভিডিও")}>
              <View style={st.thumb}>
                <Text style={st.thumbSubject}>{subjectBn(v.subject)}</Text>
                <Ionicons name="play" size={26} color={colors.gold} />
                <Text style={st.thumbDur}>{bnDigits(v.durationMin)} মি.</Text>
              </View>
              <Text style={st.videoTitle} numberOfLines={2}>
                {v.titleBn}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      </Section>

      {/* Promise strip */}
      <View style={st.promise}>
        <Ionicons name="shield-checkmark-outline" size={20} color={colors.redpen} />
        <Text style={st.promiseText}>
          টাকা আগে জমা থাকে, ক্লাস হলে তবেই টিচার পান। ক্লাস না হলে টাকা ফেরত, কথায় চিঁড়ে ভেজে না।
        </Text>
      </View>

      <LevelPicker open={picker} value={level} onClose={() => setPicker(false)} />
    </Screen>
  );
}

function LevelPicker({ open, value, onClose }: { open: boolean; value: ClassLevel; onClose: () => void }) {
  return (
    <Modal visible={open} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={st.sheetBg} onPress={onClose} />
      <View style={st.sheet}>
        <View style={st.sheetHandle} />
        <Text style={st.sheetTitle}>তুমি কোন ক্লাসে পড়ো?</Text>
        <View style={{ flexDirection: "row", flexWrap: "wrap", marginTop: 8 }}>
          {CLASS_LEVELS.map((l) => (
            <Pressable
              key={l}
              onPress={() => { setLevel(l); onClose(); }}
              style={[st.levelOpt, l === value && { backgroundColor: colors.board, borderColor: colors.board }]}
            >
              <Text style={[st.levelOptText, l === value && { color: colors.white }]}>{CLASS_LEVEL_LABEL_BN[l]}</Text>
            </Pressable>
          ))}
        </View>
      </View>
    </Modal>
  );
}

const st = StyleSheet.create({
  top: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingTop: 10, paddingBottom: 6 },
  hello: { fontSize: 13, color: colors.muted },
  helloSub: { fontSize: 18, fontWeight: "700", color: colors.ink },
  levelBtn: { flexDirection: "row", alignItems: "center", gap: 4, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.white, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 7 },
  levelText: { fontSize: 13, fontWeight: "600", color: colors.ink },
  bell: { marginLeft: 12 },
  bellDot: { position: "absolute", top: 1, right: 2, width: 8, height: 8, borderRadius: 4, backgroundColor: colors.redpen, borderWidth: 1.5, borderColor: colors.chalk },

  next: { marginHorizontal: 16, marginTop: 14, backgroundColor: colors.board, borderRadius: 14, padding: 16 },
  nextKicker: { color: "#cfe0d8", fontSize: 13, fontWeight: "600" },
  nextCount: { color: colors.gold, fontSize: 13, fontWeight: "600", marginLeft: 4 },
  nextSubject: { color: colors.white, fontSize: 24, fontWeight: "700", marginTop: 6 },
  nextMeta: { color: "#d9e6e0", fontSize: 14, marginTop: 2 },
  nextGhost: { marginLeft: 10, borderWidth: 1, borderColor: "rgba(255,255,255,0.35)", borderRadius: 8, paddingHorizontal: 14, justifyContent: "center" },
  nextGhostText: { color: colors.white, fontWeight: "600", fontSize: 14 },
  nextNote: { color: "#a9c2b7", fontSize: 12, marginTop: 12, lineHeight: 18 },

  grid: { flexDirection: "row", flexWrap: "wrap", marginHorizontal: 10, backgroundColor: colors.white, borderRadius: 14, borderWidth: 1, borderColor: colors.line, paddingVertical: 8 },
  tile: { width: "25%", alignItems: "center", paddingVertical: 10, borderRadius: 10 },
  tileIcon: { width: 52, height: 52, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  tileText: { fontSize: 12.5, color: colors.ink, textAlign: "center", marginTop: 7, lineHeight: 17, fontWeight: "500" },
  badge: { position: "absolute", top: -5, right: -9, backgroundColor: colors.redpen, borderRadius: 4, paddingHorizontal: 4, paddingVertical: 1 },
  badgeText: { color: colors.white, fontSize: 9, fontWeight: "800" },

  progRow: { flexDirection: "row", alignItems: "center", paddingVertical: 12, gap: 10 },
  rowLine: { borderTopWidth: 1, borderTopColor: colors.line },
  progSubject: { fontSize: 12, color: colors.muted },
  progChapter: { fontSize: 15, fontWeight: "600", color: colors.ink, marginTop: 1 },
  progPct: { fontSize: 13, fontWeight: "700", color: colors.ink, width: 40, textAlign: "right" },

  tutor: { width: 150, marginRight: 10, alignItems: "flex-start" },
  tutorName: { fontSize: 15, fontWeight: "700", color: colors.ink, marginTop: 10 },
  tutorUni: { fontSize: 12, color: colors.muted, marginTop: 1 },
  tutorRating: { flexDirection: "row", alignItems: "center", marginTop: 6, gap: 3 },
  tutorRatingText: { fontSize: 12, color: colors.ink },
  tutorPrice: { fontSize: 12, color: colors.board, fontWeight: "600", marginTop: 6 },

  video: { width: 168, marginRight: 10 },
  thumb: { height: 96, borderRadius: 10, backgroundColor: colors.board, alignItems: "center", justifyContent: "center" },
  thumbSubject: { position: "absolute", top: 8, left: 10, color: "#cfe0d8", fontSize: 11, fontWeight: "600" },
  thumbDur: { position: "absolute", bottom: 7, right: 8, color: colors.white, fontSize: 11, backgroundColor: "rgba(0,0,0,0.35)", paddingHorizontal: 5, borderRadius: 4, overflow: "hidden" },
  videoTitle: { fontSize: 13.5, color: colors.ink, marginTop: 6, lineHeight: 19, fontWeight: "500" },

  promise: { flexDirection: "row", gap: 10, marginHorizontal: 16, marginTop: 26, padding: 14, borderRadius: 12, borderWidth: 1, borderColor: "#ecc8c3", backgroundColor: "#fcf3f1" },
  promiseText: { flex: 1, fontSize: 13, color: "#6e2a24", lineHeight: 20 },

  sheetBg: { flex: 1, backgroundColor: "rgba(0,0,0,0.35)" },
  sheet: { backgroundColor: colors.white, borderTopLeftRadius: 18, borderTopRightRadius: 18, padding: 18, paddingBottom: 34 },
  sheetHandle: { alignSelf: "center", width: 40, height: 4, borderRadius: 2, backgroundColor: colors.line, marginBottom: 12 },
  sheetTitle: { fontSize: 18, fontWeight: "700", color: colors.ink },
  levelOpt: { borderWidth: 1, borderColor: colors.line, borderRadius: 8, paddingHorizontal: 14, paddingVertical: 10, marginRight: 8, marginTop: 8 },
  levelOptText: { fontSize: 14, color: colors.ink, fontWeight: "500" },
});
