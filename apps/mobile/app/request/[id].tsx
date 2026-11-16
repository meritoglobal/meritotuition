/** Student/guardian: my posted request and the bids teachers sent. Pick one, or chat first. */
import { AREA_LABEL_BN, CLASS_LEVEL_LABEL_BN, bnDigits, formatTakaL, type ClassLevel } from "@mastermoshai/core";
import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { demoBids, subjectBn, teacherById, tuitionRequests } from "../../src/data";
import { openPage } from "../../src/site";
import { colors } from "../../src/theme";
import { Avatar, Button, Card, Ionicons, Tag } from "../../src/ui";

export default function RequestBids() {
  const { id = "q1", fresh } = useLocalSearchParams<{ id?: string; fresh?: string }>();
  const r = tuitionRequests.find((x) => x.id === id) ?? tuitionRequests[0]!;
  const [picked, setPicked] = useState<string | null>(null);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.chalk }} edges={["top", "bottom"]}>
      <View style={st.bar}>
        <Pressable onPress={() => (router.canGoBack() ? router.back() : router.replace("/"))} hitSlop={10} style={{ padding: 8 }}>
          <Ionicons name="arrow-back" size={22} color={colors.ink} />
        </Pressable>
        <Text style={st.barTitle}>আমার টিউটর চাওয়া</Text>
      </View>
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 30 }}>
        {fresh ? (
          <View style={st.ok}>
            <Ionicons name="checkmark-circle" size={20} color={colors.board} />
            <Text style={st.okText}>পোস্ট হয়ে গেছে। তোমার এলাকার মানানসই টিচারদের জানানো হয়েছে, প্রস্তাব এলেই নোটিফিকেশন পাবে।</Text>
          </View>
        ) : null}
        <Card>
          <Text style={st.h}>{r.subjects.map(subjectBn).join(", ")}</Text>
          <Text style={st.meta}>
            {CLASS_LEVEL_LABEL_BN[r.level as ClassLevel]} · {r.mode === "OFFLINE" ? `বাসায়, ${AREA_LABEL_BN[r.area] ?? r.area}` : "অনলাইনে"} · সপ্তাহে {bnDigits(r.daysPerWeek)} দিন
          </Text>
          <Text style={st.meta}>বাজেট মাসে {formatTakaL(r.budget, "bn")} · {r.time}</Text>
        </Card>

        <Text style={st.section}>{bnDigits(demoBids.length)} জন টিচার প্রস্তাব দিয়েছেন</Text>
        {demoBids.map((b, i) => {
          const t = teacherById(b.teacherId);
          if (!t) return null;
          const chosen = picked === b.id;
          return (
            <Card key={b.id} style={[{ marginBottom: 10 }, chosen && { borderColor: colors.board, borderWidth: 1.5 }]}>
              <Pressable style={{ flexDirection: "row", alignItems: "center" }} onPress={() => router.push(`/teacher/${t.id}`)}>
                <Avatar name={t.name} size={46} tone={i} />
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={st.name}>{t.nameBn ?? t.name}</Text>
                  <Text style={st.meta}>
                    {t.university} · <Ionicons name="star" size={12} color="#e0a800" /> {bnDigits(t.rating.toFixed(1))}
                  </Text>
                </View>
                <View style={{ alignItems: "flex-end" }}>
                  <Text style={[st.fee, b.fee > r.budget && { color: colors.redpen }]}>{formatTakaL(b.fee, "bn")}</Text>
                  <Text style={st.feeL}>/মাস</Text>
                </View>
              </Pressable>
              <Text style={st.msg}>“{b.message}”</Text>
              <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
                <Tag label={`সপ্তাহে ${bnDigits(b.days)} দিন`} tone="grey" />
                {b.trial ? <Tag label="প্রথম ক্লাস ফ্রি" tone="gold" /> : null}
                {b.fee <= r.budget ? <Tag label="বাজেটের মধ্যে" /> : <Tag label="বাজেটের বেশি" tone="red" />}
              </View>
              <View style={{ flexDirection: "row", gap: 8, marginTop: 12 }}>
                <Button
                  label={chosen ? "বাছাই করা হয়েছে" : "এনাকে বাছাই করি"}
                  kind={chosen ? "board" : "gold"}
                  style={{ flex: 1 }}
                  onPress={() => {
                    setPicked(b.id);
                    Alert.alert("দারুণ!", `${t.nameBn ?? t.name}-কে জানানো হলো। ${b.trial ? "প্রথম ক্লাস ফ্রি, " : ""}ক্লাসের সময় ঠিক করে নিতে মেসেজ করো।`);
                  }}
                />
                <Button label="মেসেজ" kind="ghost" icon="chatbubble-outline" onPress={() => openPage("/chat", "মেসেজ")} />
              </View>
            </Card>
          );
        })}
        <Text style={st.hint}>পছন্দ না হলে নিজেও টিচার খুঁজতে পারো।</Text>
        <Button label="নিজে টিচার খুঁজি" kind="ghost" icon="search" onPress={() => router.push("/tutors")} />
      </ScrollView>
    </SafeAreaView>
  );
}

const st = StyleSheet.create({
  bar: { flexDirection: "row", alignItems: "center", height: 52, paddingHorizontal: 6, borderBottomWidth: 1, borderBottomColor: colors.line, backgroundColor: colors.white },
  barTitle: { fontSize: 17, fontWeight: "700", color: colors.ink, marginLeft: 4 },
  ok: { flexDirection: "row", gap: 8, padding: 12, borderRadius: 10, backgroundColor: colors.boardSoft, marginBottom: 12 },
  okText: { flex: 1, fontSize: 13.5, color: colors.board, lineHeight: 20 },
  h: { fontSize: 18, fontWeight: "700", color: colors.ink },
  meta: { fontSize: 13, color: colors.muted, marginTop: 3 },
  section: { fontSize: 16, fontWeight: "700", color: colors.ink, marginTop: 20, marginBottom: 10 },
  name: { fontSize: 16, fontWeight: "700", color: colors.ink },
  fee: { fontSize: 17, fontWeight: "700", color: colors.ink },
  feeL: { fontSize: 11.5, color: colors.muted },
  msg: { fontSize: 14, color: colors.ink, lineHeight: 21, marginTop: 10, fontStyle: "italic" },
  hint: { fontSize: 13, color: colors.muted, textAlign: "center", marginTop: 10, marginBottom: 8 },
});
