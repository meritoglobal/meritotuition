/** My classes: upcoming routine with a join button, and past classes with refunds shown in red ink. */
import { bnDigits, dhakaTime, formatTakaL, timeLabelL } from "@mastermoshai/core";
import { useMemo, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { myClasses, subjectBn, teachingSchedule, type MyClass } from "../../src/data";
import { useRole } from "../../src/prefs";
import { openPage } from "../../src/site";
import { colors } from "../../src/theme";
import { Button, Card, Ionicons, Screen, Segmented, TabHeader } from "../../src/ui";

const BN_MONTH = ["জানু", "ফেব্রু", "মার্চ", "এপ্রিল", "মে", "জুন", "জুলাই", "আগস্ট", "সেপ্টে", "অক্টো", "নভে", "ডিসে"];
const BN_WD = ["রবি", "সোম", "মঙ্গল", "বুধ", "বৃহস্পতি", "শুক্র", "শনি"];
const local = (d: Date) => new Date(d.getTime() + 6 * 3_600_000);

export default function ClassesTab() {
  const role = useRole();
  return role === "teacher" ? <TeacherClasses /> : <Classes />;
}

function TeacherClasses() {
  const list = useMemo(() => teachingSchedule(), []);
  return (
    <Screen>
      <TabHeader title="ক্লাস রুটিন" sub="সব ব্যাচের ক্লাস এক জায়গায়" />
      <View style={{ paddingHorizontal: 16, paddingTop: 14, gap: 10 }}>
        {list.map((x, i) => {
          const d = local(x.start);
          return (
            <Card key={`${x.batch.id}-${x.start.getTime()}`} style={i === 0 ? { borderColor: colors.board, borderWidth: 1.5 } : undefined}>
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                <View style={st.date}>
                  <Text style={st.dateDay}>{bnDigits(d.getUTCDate())}</Text>
                  <Text style={st.dateMon}>{BN_MONTH[d.getUTCMonth()]}</Text>
                </View>
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={st.subject}>{x.batch.slot.subjects.map(subjectBn).join(", ")}</Text>
                  <Text style={st.meta}>
                    {BN_WD[d.getUTCDay()]}বার · {timeLabelL(dhakaTime(x.start), "bn")} · {bnDigits(x.batch.students.length)} জন · {x.batch.slot.mode === "ONLINE" ? "অনলাইন" : "বাসায়"}
                  </Text>
                </View>
              </View>
              {i === 0 ? (
                <View style={{ flexDirection: "row", marginTop: 12, gap: 8 }}>
                  <Button label="ক্লাস শুরু করি" icon="videocam" style={{ flex: 1 }} onPress={() => openPage("/class/demo?as=teacher", "লাইভ ক্লাস")} />
                  <Button label="ফাইল দিই" kind="ghost" icon="cloud-upload-outline" onPress={() => openPage("/class/demo?as=teacher", "লাইভ ক্লাস")} />
                </View>
              ) : null}
            </Card>
          );
        })}
      </View>
    </Screen>
  );
}

function Classes() {
  const [tab, setTab] = useState<"next" | "past">("next");
  const { upcoming, past, refundTk } = useMemo(() => myClasses(), []);
  const list = tab === "next" ? upcoming : past;

  return (
    <Screen>
      <TabHeader title="আমার ক্লাস" sub="এক ট্যাপে লাইভ ক্লাসে, কোনো লিংক খুঁজতে হবে না" />
      <View style={{ height: 12 }} />
      <Segmented
        value={tab}
        onChange={setTab}
        options={[
          { value: "next", label: `সামনের ক্লাস (${bnDigits(upcoming.length)})` },
          { value: "past", label: "হয়ে গেছে" },
        ]}
      />
      <View style={{ paddingHorizontal: 16, paddingTop: 14, gap: 10 }}>
        {list.map((c, i) => (
          <ClassRow key={c.id} c={c} first={tab === "next" && i === 0} refundTk={refundTk} />
        ))}
      </View>
      <View style={st.how}>
        <Text style={st.howH}>ক্লাসের নিয়ম, এক নজরে</Text>
        <Rule icon="notifications-outline" text="ক্লাস শুরুর ১০ মিনিট আগে নোটিফিকেশন আসবে, ট্যাপ করলেই ক্লাসে।" />
        <Rule icon="cloud-download-outline" text="ক্লাস শেষে রেকর্ডিং ফোনে সেভ হয়। মিস করলে পরে দেখে নিও।" />
        <Rule icon="flag-outline" text="টিচার না এলে টাকা নিজে থেকেই ফেরত। ১৫ মিনিটের বেশি দেরি করলে ৪৮ ঘণ্টার মধ্যে নালিশ করো, ওই ক্লাসের অর্ধেক টাকা ফেরত।" />
      </View>
    </Screen>
  );
}

function ClassRow({ c, first, refundTk }: { c: MyClass; first: boolean; refundTk: number }) {
  const d = local(c.start);
  return (
    <Card style={first ? { borderColor: colors.board, borderWidth: 1.5 } : undefined}>
      <View style={{ flexDirection: "row", alignItems: "center" }}>
        <View style={st.date}>
          <Text style={st.dateDay}>{bnDigits(d.getUTCDate())}</Text>
          <Text style={st.dateMon}>{BN_MONTH[d.getUTCMonth()]}</Text>
        </View>
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text style={st.subject}>{subjectBn(c.subject)}</Text>
          <Text style={st.meta}>
            {BN_WD[d.getUTCDay()]}বার · {timeLabelL(dhakaTime(c.start), "bn")} · {c.teacher.nameBn}
          </Text>
          {c.outcome === "TEACHER_ABSENT" ? (
            <Text style={[st.meta, { color: colors.redpen, fontWeight: "600" }]}>টিচার আসেননি · {formatTakaL(refundTk, "bn")} ফেরত দেওয়া হয়েছে</Text>
          ) : c.outcome === "DONE" ? (
            <Text style={[st.meta, { color: colors.board }]}>ক্লাস হয়েছে · হাজিরা দেওয়া আছে</Text>
          ) : null}
        </View>
        {c.outcome ? <Ionicons name={c.outcome === "DONE" ? "checkmark-circle" : "alert-circle"} size={22} color={c.outcome === "DONE" ? colors.board : colors.redpen} /> : null}
      </View>
      {first ? (
        <View style={{ flexDirection: "row", marginTop: 12, gap: 8 }}>
          <Button label="ক্লাসে ঢুকি" icon="videocam" style={{ flex: 1 }} onPress={() => openPage("/class/demo", "লাইভ ক্লাস")} />
          <Button label="ক্লাস ফাইল" kind="ghost" icon="folder-open-outline" onPress={() => openPage("/class/demo", "লাইভ ক্লাস")} />
        </View>
      ) : null}
    </Card>
  );
}

function Rule({ icon, text }: { icon: "notifications-outline" | "cloud-download-outline" | "flag-outline"; text: string }) {
  return (
    <View style={{ flexDirection: "row", gap: 10, marginTop: 10 }}>
      <Ionicons name={icon} size={18} color={colors.board} />
      <Text style={{ flex: 1, fontSize: 13.5, color: colors.ink, lineHeight: 20 }}>{text}</Text>
    </View>
  );
}

const st = StyleSheet.create({
  date: { width: 52, height: 56, borderRadius: 10, backgroundColor: colors.boardSoft, alignItems: "center", justifyContent: "center" },
  dateDay: { fontSize: 20, fontWeight: "700", color: colors.board },
  dateMon: { fontSize: 11.5, color: colors.board },
  subject: { fontSize: 16, fontWeight: "700", color: colors.ink },
  meta: { fontSize: 13, color: colors.muted, marginTop: 3 },
  how: { margin: 16, marginTop: 22, padding: 14, borderRadius: 12, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.white },
  howH: { fontSize: 15, fontWeight: "700", color: colors.ink },
});
