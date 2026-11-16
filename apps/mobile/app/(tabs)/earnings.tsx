/** Teacher mode: money. What can be withdrawn, what is on hold, each class's settlement. */
import { bnDigits, formatTakaL } from "@mastermoshai/core";
import { useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";
import { myEarnings, subjectBn } from "../../src/data";
import { openPage } from "../../src/site";
import { colors } from "../../src/theme";
import { Button, Card, Ionicons, Screen, TabHeader } from "../../src/ui";

const OUTCOME: Record<string, { label: string; color: string }> = {
  COMPLETED: { label: "ক্লাস হয়েছে", color: colors.board },
  TEACHER_LATE_OR_SHORT: { label: "দেরিতে ঢুকেছেন, কিছু টাকা ফেরত গেছে", color: colors.redpen },
  STUDENT_NO_SHOW: { label: "স্টুডেন্ট আসেনি, পুরো টাকা আপনার", color: colors.board },
  TEACHER_NO_SHOW: { label: "আপনি আসেননি, টাকা ফেরত গেছে", color: colors.redpen },
};

export default function Earnings() {
  const m = useMemo(() => myEarnings(), []);
  return (
    <Screen>
      <TabHeader title="আমার আয়" sub="প্রতিটা ক্লাস হওয়ার পর টাকা আপনার খাতায় জমা হয়" />
      <View style={st.hero}>
        <Text style={st.heroL}>এখন তুলতে পারবেন</Text>
        <Text style={st.heroV}>{formatTakaL(m.available, "bn")}</Text>
        <Button label="bKash-এ তুলি" icon="arrow-up-circle-outline" style={{ marginTop: 14 }} onPress={() => openPage("/dashboard/teacher", "টাকা তোলা")} />
      </View>
      <View style={st.stats}>
        <Mini label="হোল্ডে (৪৮ ঘণ্টা)" value={formatTakaL(m.pending, "bn")} />
        <Mini label="আগে তুলেছেন" value={formatTakaL(m.paidOut, "bn")} />
        <Mini label="কমিশন" value={`${bnDigits(Math.round(m.rate * 100))}%`} />
      </View>
      {m.lost > 0 ? (
        <View style={st.lost}>
          <Ionicons name="alert-circle-outline" size={18} color={colors.redpen} />
          <Text style={st.lostText}>দেরি বা অনুপস্থিতির জন্য এ মাসে {formatTakaL(m.lost, "bn")} স্টুডেন্টদের ফেরত গেছে।</Text>
        </View>
      ) : null}
      <Text style={st.section}>ক্লাস ধরে হিসাব</Text>
      <Card style={{ marginHorizontal: 16, paddingVertical: 2 }}>
        {m.rows.map((r, i) => {
          const o = OUTCOME[r.outcome] ?? OUTCOME.COMPLETED!;
          const d = new Date(r.date.getTime() + 6 * 3_600_000);
          return (
            <View key={r.id} style={[st.row, i > 0 && { borderTopWidth: 1, borderTopColor: colors.line }]}>
              <View style={{ flex: 1 }}>
                <Text style={st.rowT}>
                  {subjectBn(r.subject)} · {bnDigits(d.getUTCDate())}/{bnDigits(d.getUTCMonth() + 1)}
                </Text>
                <Text style={[st.rowM, { color: r.pending ? colors.muted : o.color }]}>{r.pending ? "ক্লাস শেষ, ৪৮ ঘণ্টা পর জমা হবে" : o.label}</Text>
              </View>
              <Text style={[st.amt, r.pending && { color: colors.faint }]}>{formatTakaL(r.teacherNet, "bn")}</Text>
            </View>
          );
        })}
      </Card>
    </Screen>
  );
}

function Mini({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ flex: 1, alignItems: "center" }}>
      <Text style={st.miniV}>{value}</Text>
      <Text style={st.miniL}>{label}</Text>
    </View>
  );
}

const st = StyleSheet.create({
  hero: { marginHorizontal: 16, marginTop: 14, backgroundColor: colors.board, borderRadius: 14, padding: 18 },
  heroL: { color: "#cfe0d8", fontSize: 13 },
  heroV: { color: colors.white, fontSize: 34, fontWeight: "700", marginTop: 4 },
  stats: { flexDirection: "row", marginHorizontal: 16, marginTop: 12, backgroundColor: colors.white, borderRadius: 12, borderWidth: 1, borderColor: colors.line, paddingVertical: 12 },
  miniV: { fontSize: 15, fontWeight: "700", color: colors.ink },
  miniL: { fontSize: 11.5, color: colors.muted, marginTop: 2 },
  lost: { flexDirection: "row", gap: 8, marginHorizontal: 16, marginTop: 12, padding: 12, borderRadius: 10, backgroundColor: "#fcf3f1", borderWidth: 1, borderColor: "#ecc8c3" },
  lostText: { flex: 1, fontSize: 13, color: "#6e2a24", lineHeight: 19 },
  section: { fontSize: 17, fontWeight: "700", color: colors.ink, marginHorizontal: 16, marginTop: 22, marginBottom: 10 },
  row: { flexDirection: "row", alignItems: "center", paddingVertical: 12 },
  rowT: { fontSize: 14.5, fontWeight: "600", color: colors.ink },
  rowM: { fontSize: 12.5, marginTop: 2 },
  amt: { fontSize: 15, fontWeight: "700", color: colors.ink },
});
