/** Teacher mode: my batches with students, seats and next classes. */
import { CLASS_LEVEL_LABEL_BN, WEEKDAY_SHORT_BN, bnDigits, formatTakaL, openSeats, timeLabelL } from "@mastermoshai/core";
import { useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";
import { myBatches, subjectBn } from "../../src/data";
import { openPage } from "../../src/site";
import { colors } from "../../src/theme";
import { Avatar, Button, Card, Screen, TabHeader, Tag } from "../../src/ui";

export default function Batches() {
  const batches = useMemo(() => myBatches(), []);
  return (
    <Screen>
      <TabHeader title="আমার ব্যাচ" sub={`${bnDigits(batches.length)}টা ব্যাচ · ${bnDigits(batches.reduce((a, b) => a + b.students.length, 0))} জন স্টুডেন্ট`} />
      <View style={{ padding: 16, gap: 12 }}>
        {batches.map((b) => {
          const left = openSeats(b.slot);
          return (
            <Card key={b.id}>
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                <Text style={st.h}>{b.slot.subjects.map(subjectBn).join(", ")}</Text>
                <View style={{ flex: 1 }} />
                <Tag label={b.slot.mode === "ONLINE" ? "অনলাইন" : "বাসায়"} tone={b.slot.mode === "ONLINE" ? "green" : "gold"} />
              </View>
              <Text style={st.meta}>
                {CLASS_LEVEL_LABEL_BN[b.slot.level]} · {b.slot.days.map((d) => WEEKDAY_SHORT_BN[d]).join(", ")} · {timeLabelL(b.slot.startTime, "bn")}
              </Text>
              <Text style={st.meta}>
                প্রতি স্টুডেন্ট মাসে {formatTakaL(b.slot.monthlyPrice, "bn")} · {left === 0 ? "হাউসফুল" : `${bnDigits(left)}টা সিট খালি`}
                {b.slot.trialSeats > 0 ? ` · ${bnDigits(b.slot.trialSeats)}টা ট্রায়াল সিট` : ""}
              </Text>
              <View style={st.students}>
                {b.students.length ? (
                  b.students.map((n, i) => (
                    <View key={n} style={st.student}>
                      <Avatar name={n} size={34} tone={i + 1} />
                      <Text style={st.sName}>{n}</Text>
                    </View>
                  ))
                ) : (
                  <Text style={st.meta}>এখনো কেউ ভর্তি হয়নি। ট্রায়াল সিট খোলা রাখলে দ্রুত স্টুডেন্ট আসে।</Text>
                )}
              </View>
              <View style={{ flexDirection: "row", gap: 8, marginTop: 12 }}>
                <Button label="ক্লাস শুরু" icon="videocam" style={{ flex: 1 }} onPress={() => openPage("/class/demo?as=teacher", "লাইভ ক্লাস")} />
                <Button label="পরীক্ষা দিই" kind="ghost" icon="create-outline" onPress={() => openPage("/class/demo/exams/new?as=teacher", "পরীক্ষা বানাই")} />
                <Button label="সেটিং" kind="ghost" onPress={() => openPage("/teach", "ব্যাচ সেটিং")} />
              </View>
            </Card>
          );
        })}
        <Button label="নতুন ব্যাচ খুলি" kind="board" icon="add" onPress={() => openPage("/teach/batches/new", "নতুন ব্যাচ")} />
      </View>
    </Screen>
  );
}

const st = StyleSheet.create({
  h: { fontSize: 17, fontWeight: "700", color: colors.ink },
  meta: { fontSize: 13, color: colors.muted, marginTop: 4, lineHeight: 19 },
  students: { flexDirection: "row", flexWrap: "wrap", gap: 12, marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: colors.line },
  student: { alignItems: "center", width: 56 },
  sName: { fontSize: 12, color: colors.ink, marginTop: 4 },
});
