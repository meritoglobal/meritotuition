/** Teacher: new tuition requests near me that match my filters. Message the family or send a bid. */
import { AREA_LABEL_BN, CLASS_LEVEL_LABEL_BN, bnDigits, formatTakaL, type ClassLevel } from "@mastermoshai/core";
import { router } from "expo-router";
import { useState } from "react";
import { Alert, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { me, subjectBn, tuitionRequests, type TuitionRequest } from "../src/data";
import { openPage } from "../src/site";
import { colors } from "../src/theme";
import { Button, Card, Chip, Ionicons, Tag } from "../src/ui";

const ago = (m: number) => (m < 60 ? `${bnDigits(m)} মিনিট আগে` : `${bnDigits(Math.floor(m / 60))} ঘণ্টা আগে`);

export default function Tuitions() {
  const [bidFor, setBidFor] = useState<TuitionRequest | null>(null);
  const [sent, setSent] = useState<Set<string>>(new Set());
  const myArea = AREA_LABEL_BN[me.area?.name ?? ""] ?? me.area?.name;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.chalk }} edges={["top", "bottom"]}>
      <View style={st.bar}>
        <Pressable onPress={() => router.back()} hitSlop={10} style={{ padding: 8 }}>
          <Ionicons name="arrow-back" size={22} color={colors.ink} />
        </Pressable>
        <Text style={st.barTitle}>নতুন টিউশন</Text>
      </View>
      <ScrollView contentContainerStyle={{ paddingBottom: 30 }}>
        <View style={st.filters}>
          <Text style={st.fl}>আমার ফিল্টার</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <Chip label={`${myArea} থেকে ${bnDigits(me.area?.radiusKm ?? 4)} কিমি`} on />
            <Chip label={me.subjects.map(subjectBn).join(", ")} on />
            <Chip label="বাজেট ৳৩,০০০+" on />
            <Chip label="বদলাই" onPress={() => openPage("/teach/profile", "আমার ফিল্টার")} />
          </ScrollView>
          <Text style={st.fhint}>এই ফিল্টারে নতুন স্টুডেন্ট এলেই নোটিফিকেশন আসবে।</Text>
        </View>

        <View style={{ paddingHorizontal: 16, gap: 10 }}>
          {tuitionRequests.map((r) => {
            const done = sent.has(r.id);
            return (
              <Card key={r.id}>
                <View style={{ flexDirection: "row", alignItems: "center" }}>
                  <Tag label={r.mode === "OFFLINE" ? "বাসায়" : "অনলাইন"} tone={r.mode === "OFFLINE" ? "gold" : "green"} />
                  {r.distanceKm ? <Tag label={`${bnDigits(r.distanceKm)} কিমি দূরে`} tone="grey" /> : null}
                  <View style={{ flex: 1 }} />
                  <Text style={st.ago}>{ago(r.postedMinAgo)}</Text>
                </View>
                <Text style={st.h}>{r.subjects.map(subjectBn).join(", ")} · {CLASS_LEVEL_LABEL_BN[r.level as ClassLevel]}</Text>
                <Text style={st.meta}>
                  {r.mode === "OFFLINE" ? `${AREA_LABEL_BN[r.area] ?? r.area} · ` : ""}সপ্তাহে {bnDigits(r.daysPerWeek)} দিন · {r.time}
                </Text>
                <Text style={st.note}>{r.note}</Text>
                <View style={st.foot}>
                  <View>
                    <Text style={st.budget}>{formatTakaL(r.budget, "bn")}<Text style={st.budgetL}> /মাস বাজেট</Text></Text>
                    <Text style={st.bids}>{bnDigits(r.bids)} জন বিড দিয়েছেন</Text>
                  </View>
                </View>
                <View style={{ flexDirection: "row", gap: 8, marginTop: 10 }}>
                  <Button
                    label={done ? "বিড পাঠানো হয়েছে" : "বিড দিই"}
                    kind={done ? "board" : "gold"}
                    icon={done ? "checkmark" : "hand-right-outline"}
                    style={{ flex: 1 }}
                    onPress={() => !done && setBidFor(r)}
                  />
                  <Button label="মেসেজ" kind="ghost" icon="chatbubble-outline" onPress={() => openPage("/chat", "মেসেজ")} />
                </View>
              </Card>
            );
          })}
        </View>
      </ScrollView>
      <BidSheet r={bidFor} onClose={() => setBidFor(null)} onSent={(id) => { setSent((s) => new Set(s).add(id)); setBidFor(null); Alert.alert("বিড পাঠানো হয়েছে", "স্টুডেন্ট বাছাই করলে নোটিফিকেশন পাবেন।"); }} />
    </SafeAreaView>
  );
}

function BidSheet({ r, onClose, onSent }: { r: TuitionRequest | null; onClose: () => void; onSent: (id: string) => void }) {
  const [fee, setFee] = useState("");
  const [trial, setTrial] = useState(true);
  const [msg, setMsg] = useState("");
  if (!r) return null;
  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.35)" }} onPress={onClose} />
      <View style={st.sheet}>
        <Text style={st.sheetH}>বিড দিন</Text>
        <Text style={st.meta}>স্টুডেন্টের বাজেট মাসে {formatTakaL(r.budget, "bn")}</Text>
        <Text style={st.label}>আপনার মাসিক ফি (৳)</Text>
        <TextInput value={fee} onChangeText={setFee} keyboardType="number-pad" placeholder={String(r.budget)} placeholderTextColor={colors.faint} style={st.input} />
        <View style={{ flexDirection: "row", marginTop: 12 }}>
          <Chip label="প্রথম ক্লাস ফ্রি" on={trial} onPress={() => setTrial(!trial)} />
        </View>
        <Text style={st.label}>ছোট্ট পরিচয় (নম্বর দেবেন না)</Text>
        <TextInput value={msg} onChangeText={setMsg} multiline placeholder="কেন আপনি এই স্টুডেন্টের জন্য ঠিক মানুষ?" placeholderTextColor={colors.faint} style={[st.input, { minHeight: 80, textAlignVertical: "top" }]} />
        <Button label="বিড পাঠাই" icon="send" style={{ marginTop: 16 }} onPress={() => onSent(r.id)} />
      </View>
    </Modal>
  );
}

const st = StyleSheet.create({
  bar: { flexDirection: "row", alignItems: "center", height: 52, paddingHorizontal: 6, borderBottomWidth: 1, borderBottomColor: colors.line, backgroundColor: colors.white },
  barTitle: { fontSize: 17, fontWeight: "700", color: colors.ink, marginLeft: 4 },
  filters: { padding: 16, paddingBottom: 12 },
  fl: { fontSize: 13, fontWeight: "700", color: colors.muted, marginBottom: 8 },
  fhint: { fontSize: 12.5, color: colors.muted, marginTop: 8 },
  ago: { fontSize: 12, color: colors.faint, marginTop: 6 },
  h: { fontSize: 17, fontWeight: "700", color: colors.ink, marginTop: 8 },
  meta: { fontSize: 13, color: colors.muted, marginTop: 3 },
  note: { fontSize: 14, color: colors.ink, lineHeight: 21, marginTop: 8 },
  foot: { flexDirection: "row", alignItems: "center", marginTop: 12, paddingTop: 10, borderTopWidth: 1, borderTopColor: colors.line },
  budget: { fontSize: 18, fontWeight: "700", color: colors.board },
  budgetL: { fontSize: 12.5, fontWeight: "400", color: colors.muted },
  bids: { fontSize: 12.5, color: colors.muted, marginTop: 2 },
  sheet: { backgroundColor: colors.white, borderTopLeftRadius: 18, borderTopRightRadius: 18, padding: 18, paddingBottom: 34 },
  sheetH: { fontSize: 19, fontWeight: "700", color: colors.ink },
  label: { fontSize: 14, fontWeight: "700", color: colors.ink, marginTop: 14, marginBottom: 6 },
  input: { borderWidth: 1, borderColor: colors.line, borderRadius: 10, padding: 12, fontSize: 15, color: colors.ink },
});
