/** Teacher mode home: next class to teach, money at a glance, one button per job. */
import { CLASS_LEVEL_LABEL_BN, bnDigits, dhakaTime, formatTakaL, openSeats, timeLabelL } from "@mastermoshai/core";
import { router } from "expo-router";
import { useMemo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { me, myEarnings, subjectBn, teachingSchedule, tuitionRequests } from "../data";
import { openPage, openLive } from "../site";
import { colors } from "../theme";
import { Bar, Button, Card, Ionicons, Mark, Screen, Section, type IconName } from "../ui";

type Job = { label: string; icon: IconName; tint: string; fg: string; go: () => void };

const JOBS: Job[] = [
  { label: "নতুন\nব্যাচ", icon: "add-circle-outline", tint: colors.boardSoft, fg: colors.board, go: () => openPage("/teach/batches/new", "নতুন ব্যাচ") },
  { label: "পরীক্ষা\nবানাই", icon: "create-outline", tint: colors.goldSoft, fg: "#7a5d00", go: () => openPage("/class/demo/exams/new?as=teacher", "পরীক্ষা বানাই") },
  { label: "ক্লাসের\nপ্রস্তুতি", icon: "library-outline", tint: colors.goldSoft, fg: "#7a5d00", go: () => router.push("/prep") },
  { label: "স্টুডেন্টের\nপ্রশ্ন", icon: "help-circle-outline", tint: colors.redSoft, fg: colors.redpen, go: () => openPage("/teach/questions", "স্টুডেন্টের প্রশ্ন") },
  { label: "মাসিক\nপ্যাকেজ", icon: "pricetags-outline", tint: colors.boardSoft, fg: colors.board, go: () => openPage("/teach/packages", "মাসিক প্যাকেজ") },
  { label: "মেসেজ", icon: "chatbubbles-outline", tint: colors.boardSoft, fg: colors.board, go: () => openPage("/chat", "মেসেজ") },
  { label: "আমার\nপ্রোফাইল", icon: "person-outline", tint: colors.goldSoft, fg: "#7a5d00", go: () => openPage("/teach/profile", "আমার প্রোফাইল") },
  { label: "টাকা\nতুলি", icon: "cash-outline", tint: colors.redSoft, fg: colors.redpen, go: () => router.push("/earnings") },
];

const local = (d: Date) => new Date(d.getTime() + 6 * 3_600_000);
const BN_WD = ["রবি", "সোম", "মঙ্গল", "বুধ", "বৃহস্পতি", "শুক্র", "শনি"];

export function whenBn(d: Date, now = new Date()) {
  const day = (x: Date) => Math.floor(local(x).getTime() / 86_400_000);
  const diff = day(d) - day(now);
  const t = timeLabelL(dhakaTime(d), "bn");
  return diff === 0 ? `আজ ${t}` : diff === 1 ? `কাল ${t}` : `${BN_WD[local(d).getUTCDay()]}বার ${t}`;
}

export default function TeacherHome() {
  const schedule = useMemo(() => teachingSchedule(), []);
  const money = useMemo(() => myEarnings(), []);
  const next = schedule[0];
  const name = (me.nameBn ?? me.name).split(" ")[0];

  return (
    <Screen>
      <View style={st.top}>
        <Mark size={40} />
        <View style={{ flex: 1, marginLeft: 10 }}>
          <Text style={st.hello}>টিচার মোড</Text>
          <Text style={st.helloSub}>স্বাগতম, {name}</Text>
        </View>
        <Pressable hitSlop={8} onPress={() => openPage("/chat", "মেসেজ")} style={{ marginLeft: 12 }}>
          <Ionicons name="chatbubbles-outline" size={22} color={colors.ink} />
        </Pressable>
        <Pressable hitSlop={8} onPress={() => router.push("/classes")} style={{ marginLeft: 12 }}>
          <Ionicons name="notifications-outline" size={22} color={colors.ink} />
        </Pressable>
      </View>

      {next ? (
        <View style={st.next}>
          <Text style={st.kicker}>পরের ক্লাস · {whenBn(next.start)}</Text>
          <Text style={st.subject}>{next.batch.slot.subjects.map(subjectBn).join(", ")}</Text>
          <Text style={st.meta}>
            {CLASS_LEVEL_LABEL_BN[next.batch.slot.level]} · {bnDigits(next.batch.students.length)} জন স্টুডেন্ট · {next.batch.slot.mode === "ONLINE" ? "অনলাইন" : "বাসায়"}
          </Text>
          <View style={{ flexDirection: "row", marginTop: 14, gap: 10 }}>
            <Button label="ক্লাস শুরু করি" icon="videocam" style={{ flex: 1 }} onPress={() => openPage("/class/demo?as=teacher", "লাইভ ক্লাস")} />
            <Pressable style={st.ghost} onPress={() => router.push("/batches")}>
              <Text style={st.ghostText}>ব্যাচ দেখি</Text>
            </Pressable>
          </View>
          <Text style={st.note}>ফোন থেকেই PDF বোর্ডে লিখে পড়াতে পারবেন। ক্লাস শেষে রেকর্ডিং স্টুডেন্টদের ফোনে সেভ হয়।</Text>
        </View>
      ) : null}

      <Pressable style={st.leads} onPress={() => openLive("/teach/requests", "এলাকার নতুন টিউশন", "/tuitions")}>
        <View style={st.leadsIcon}>
          <Ionicons name="location" size={20} color={colors.ink} />
          <View style={st.leadsBadge}><Text style={st.leadsBadgeText}>{bnDigits(tuitionRequests.length)}</Text></View>
        </View>
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text style={st.leadsH}>আপনার এলাকায় নতুন টিউশন</Text>
          <Text style={st.leadsP}>আপনার বিষয় আর বাজেটে মেলে এমন {bnDigits(tuitionRequests.length)}জন স্টুডেন্ট। বিড দিন বা মেসেজ করুন।</Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color={colors.faint} />
      </Pressable>

      <Pressable style={st.money} onPress={() => router.push("/earnings")}>
        <Stat label="তুলতে পারবেন" value={formatTakaL(money.available, "bn")} strong />
        <View style={st.vline} />
        <Stat label="হোল্ডে আছে" value={formatTakaL(money.pending, "bn")} />
        <View style={st.vline} />
        <Stat label="মোট ক্লাস" value={bnDigits(money.paidClasses)} />
      </Pressable>

      <Section title="কী করবেন আজ?">
        <View style={st.grid}>
          {JOBS.map((j) => (
            <Pressable key={j.label} onPress={j.go} style={({ pressed }) => [st.tile, pressed && { backgroundColor: "#f1eee6" }]}>
              <View style={[st.tileIcon, { backgroundColor: j.tint }]}>
                <Ionicons name={j.icon} size={24} color={j.fg} />
              </View>
              <Text style={st.tileText}>{j.label}</Text>
            </Pressable>
          ))}
        </View>
      </Section>

      {money.nextTier ? (
        <Card style={{ marginHorizontal: 16, marginTop: 16 }}>
          <Text style={st.tierH}>
            আর {bnDigits(money.nextTier - money.paidClasses)}টা ক্লাস নিলে কমিশন {bnDigits(Math.round(money.rate * 100) - 5)}%
          </Text>
          <Text style={st.tierP}>এখন কমিশন {bnDigits(Math.round(money.rate * 100))}%। যত বেশি ক্লাস, তত বেশি টাকা আপনার পকেটে।</Text>
          <View style={{ marginTop: 10 }}>
            <Bar value={money.paidClasses / money.nextTier} color={colors.gold} />
          </View>
        </Card>
      ) : null}

      <Section title="সামনের রুটিন" action="সব দেখি" onAction={() => router.push("/classes")}>
        <Card style={{ marginHorizontal: 16, paddingVertical: 2 }}>
          {schedule.slice(0, 4).map((x, i) => (
            <View key={`${x.batch.id}-${x.start.getTime()}`} style={[st.row, i > 0 && { borderTopWidth: 1, borderTopColor: colors.line }]}>
              <Ionicons name={x.batch.slot.mode === "ONLINE" ? "laptop-outline" : "home-outline"} size={18} color={colors.board} />
              <View style={{ flex: 1, marginLeft: 10 }}>
                <Text style={st.rowTitle}>{x.batch.slot.subjects.map(subjectBn).join(", ")}</Text>
                <Text style={st.rowMeta}>
                  {whenBn(x.start)} · {bnDigits(x.batch.students.length)}/{bnDigits(x.batch.slot.batchSize)} জন · {bnDigits(openSeats(x.batch.slot))}টা সিট খালি
                </Text>
              </View>
            </View>
          ))}
        </Card>
      </Section>

      <View style={st.rule}>
        <Ionicons name="alarm-outline" size={18} color={colors.redpen} />
        <Text style={st.ruleText}>সময়মতো ক্লাসে ঢুকুন। দেরি করলে বা না এলে সেই ক্লাসের টাকা স্টুডেন্ট ফেরত পায়, আর ৩০ দিনে ৩ বার হলে অ্যাকাউন্ট সাময়িক বন্ধ।</Text>
      </View>
    </Screen>
  );
}

function Stat({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <View style={{ flex: 1, alignItems: "center" }}>
      <Text style={[st.statV, strong && { color: colors.board }]}>{value}</Text>
      <Text style={st.statL}>{label}</Text>
    </View>
  );
}

const st = StyleSheet.create({
  top: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingTop: 10, paddingBottom: 6 },
  hello: { fontSize: 12, color: "#7a5d00", fontWeight: "700", backgroundColor: colors.goldSoft, alignSelf: "flex-start", paddingHorizontal: 6, borderRadius: 4, overflow: "hidden" },
  helloSub: { fontSize: 18, fontWeight: "700", color: colors.ink, marginTop: 2 },
  next: { marginHorizontal: 16, marginTop: 14, backgroundColor: colors.board, borderRadius: 14, padding: 16 },
  kicker: { color: colors.gold, fontSize: 13, fontWeight: "600" },
  subject: { color: colors.white, fontSize: 24, fontWeight: "700", marginTop: 6 },
  meta: { color: "#d9e6e0", fontSize: 14, marginTop: 2 },
  ghost: { borderWidth: 1, borderColor: "rgba(255,255,255,0.35)", borderRadius: 8, paddingHorizontal: 14, justifyContent: "center" },
  ghostText: { color: colors.white, fontWeight: "600", fontSize: 14 },
  note: { color: "#a9c2b7", fontSize: 12, marginTop: 12, lineHeight: 18 },
  leads: { flexDirection: "row", alignItems: "center", marginHorizontal: 16, marginTop: 14, padding: 14, borderRadius: 12, backgroundColor: colors.goldSoft, borderWidth: 1, borderColor: "#f0dc8a" },
  leadsIcon: { width: 44, height: 44, borderRadius: 10, backgroundColor: colors.gold, alignItems: "center", justifyContent: "center" },
  leadsBadge: { position: "absolute", top: -6, right: -6, minWidth: 20, height: 20, borderRadius: 10, backgroundColor: colors.redpen, alignItems: "center", justifyContent: "center", paddingHorizontal: 4 },
  leadsBadgeText: { color: colors.white, fontSize: 11, fontWeight: "800" },
  leadsH: { fontSize: 15.5, fontWeight: "700", color: colors.ink },
  leadsP: { fontSize: 13, color: "#5a4a10", marginTop: 2, lineHeight: 19 },
  money: { flexDirection: "row", marginHorizontal: 16, marginTop: 14, backgroundColor: colors.white, borderRadius: 12, borderWidth: 1, borderColor: colors.line, paddingVertical: 14 },
  vline: { width: 1, backgroundColor: colors.line },
  statV: { fontSize: 17, fontWeight: "700", color: colors.ink },
  statL: { fontSize: 12, color: colors.muted, marginTop: 2 },
  grid: { flexDirection: "row", flexWrap: "wrap", marginHorizontal: 10, backgroundColor: colors.white, borderRadius: 14, borderWidth: 1, borderColor: colors.line, paddingVertical: 8 },
  tile: { width: "25%", alignItems: "center", paddingVertical: 10, borderRadius: 10 },
  tileIcon: { width: 52, height: 52, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  tileText: { fontSize: 12.5, color: colors.ink, textAlign: "center", marginTop: 7, lineHeight: 17, fontWeight: "500" },
  tierH: { fontSize: 15, fontWeight: "700", color: colors.ink },
  tierP: { fontSize: 13, color: colors.muted, marginTop: 3, lineHeight: 19 },
  row: { flexDirection: "row", alignItems: "center", paddingVertical: 12 },
  rowTitle: { fontSize: 15, fontWeight: "600", color: colors.ink },
  rowMeta: { fontSize: 12.5, color: colors.muted, marginTop: 2 },
  rule: { flexDirection: "row", gap: 10, marginHorizontal: 16, marginTop: 22, padding: 14, borderRadius: 12, borderWidth: 1, borderColor: "#ecc8c3", backgroundColor: "#fcf3f1" },
  ruleText: { flex: 1, fontSize: 13, color: "#6e2a24", lineHeight: 20 },
});
