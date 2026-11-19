/** Study: lecture sheets chapter by chapter, exams, free videos (Chorcha-style lists with progress). */
import { bnDigits } from "@mastermoshai/core";
import { useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { exams, progress, sheets, subjectBn, teacherById, videos } from "../../src/data";
import { openPage } from "../../src/site";
import { colors } from "../../src/theme";
import { Bar, Card, Ionicons, Screen, Segmented, TabHeader, Tag } from "../../src/ui";

type Tab = "sheets" | "exams" | "videos";

export default function Learn() {
  const params = useLocalSearchParams<{ tab?: string }>();
  const [tab, setTab] = useState<Tab>("sheets");
  useEffect(() => {
    if (params.tab === "sheets" || params.tab === "exams" || params.tab === "videos") setTab(params.tab);
  }, [params.tab]);

  return (
    <Screen>
      <TabHeader title="পড়াশোনা" sub="NCTB বই ধরে ধরে, অধ্যায় অনুযায়ী" />
      <View style={{ height: 12 }} />
      <Segmented<Tab>
        value={tab}
        onChange={setTab}
        options={[
          { value: "sheets", label: "লেকচার শিট" },
          { value: "exams", label: "পরীক্ষা" },
          { value: "videos", label: "ভিডিও" },
        ]}
      />
      <View style={{ padding: 16, gap: 10 }}>
        {tab === "sheets" ? <Sheets /> : tab === "exams" ? <Exams /> : <Videos />}
      </View>
    </Screen>
  );
}

function Sheets() {
  const groups = [...new Set(sheets.map((x) => x.subject))];
  return (
    <>
      {groups.map((g) => {
        const p = progress.find((x) => x.subject === g);
        return (
          <Card key={g} style={{ paddingVertical: 6 }}>
            <View style={st.groupHead}>
              <Text style={st.groupTitle}>{subjectBn(g)}</Text>
              {p ? <Text style={st.groupPct}>{bnDigits(Math.round(p.done * 100))}% শেষ</Text> : null}
            </View>
            {p ? (
              <View style={{ marginBottom: 6 }}>
                <Bar value={p.done} />
              </View>
            ) : null}
            {sheets
              .filter((x) => x.subject === g)
              .map((x) => (
                <Pressable key={x.id} disabled={!x.href} onPress={() => x.href && openPage(x.href, `অধ্যায় ${bnDigits(x.chapter)}: ${x.title}`)} style={st.row}>
                  <View style={[st.chap, !x.href && { backgroundColor: "#f1eee6" }]}>
                    <Text style={[st.chapNum, !x.href && { color: colors.faint }]}>{bnDigits(x.chapter)}</Text>
                  </View>
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text style={[st.rowTitle, !x.href && { color: colors.muted }]}>{x.title}</Text>
                    <Text style={st.rowMeta}>{x.href ? "লেকচার শিট · MCQ · সৃজনশীল" : "লেখা চলছে, শিগগির আসছে"}</Text>
                  </View>
                  {x.href ? <Ionicons name="chevron-forward" size={18} color={colors.faint} /> : <Ionicons name="lock-closed-outline" size={16} color={colors.faint} />}
                </Pressable>
              ))}
          </Card>
        );
      })}
    </>
  );
}

function Exams() {
  return (
    <>
      <Card onPress={() => openPage("/leaderboard", "মডেল টেস্ট")} style={{ flexDirection: "row", alignItems: "center", backgroundColor: colors.board, borderColor: colors.board }}>
        <Ionicons name="trophy" size={26} color={colors.gold} />
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text style={[st.rowTitle, { color: colors.white }]}>এসএসসি মডেল টেস্ট</Text>
          <Text style={[st.rowMeta, { color: "#cfe0d8" }]}>সারা দেশের সাথে র‍্যাংকিং, প্রতি সপ্তাহে নতুন সেট</Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color={colors.gold} />
      </Card>
      {exams.map((e) => (
        <Card key={e.id} onPress={() => openPage("/class/demo", e.title)}>
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <View style={[st.chap, { backgroundColor: e.kind === "MCQ" ? colors.boardSoft : colors.goldSoft }]}>
              <Ionicons name={e.kind === "MCQ" ? "list-outline" : "camera-outline"} size={20} color={e.kind === "MCQ" ? colors.board : "#7a5d00"} />
            </View>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={st.rowTitle}>{e.title}</Text>
              <Text style={st.rowMeta}>
                {subjectBn(e.subject)} · {bnDigits(e.qs)}টা প্রশ্ন · {bnDigits(e.min)} মিনিট · {e.by}
              </Text>
            </View>
          </View>
          <View style={{ flexDirection: "row", alignItems: "center", marginTop: 4 }}>
            <Tag label={e.kind} tone={e.kind === "MCQ" ? "green" : "gold"} />
            <Tag label={`জমা: ${e.due}`} tone="red" />
            <View style={{ flex: 1 }} />
            <Text style={st.start}>শুরু করি</Text>
            <Ionicons name="chevron-forward" size={15} color={colors.board} />
          </View>
        </Card>
      ))}
    </>
  );
}

function Videos() {
  return (
    <>
      {videos.map((v) => (
        <Card key={v.id} onPress={() => openPage("/videos", "ফ্রি ভিডিও")} style={{ flexDirection: "row", alignItems: "center" }}>
          <View style={st.thumb}>
            <Ionicons name="play" size={22} color={colors.gold} />
            <Text style={st.dur}>{bnDigits(v.durationMin)} মি.</Text>
          </View>
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={st.rowTitle} numberOfLines={2}>
              {v.titleBn}
            </Text>
            <Text style={st.rowMeta}>
              {subjectBn(v.subject)} · {teacherById(v.teacherId)?.nameBn ?? ""}
            </Text>
            <Text style={st.rowMeta}>{bnDigits(v.views.toLocaleString("en-IN"))} বার দেখা</Text>
          </View>
        </Card>
      ))}
    </>
  );
}

const st = StyleSheet.create({
  groupHead: { flexDirection: "row", justifyContent: "space-between", alignItems: "baseline", paddingVertical: 8 },
  groupTitle: { fontSize: 17, fontWeight: "700", color: colors.ink },
  groupPct: { fontSize: 13, color: colors.board, fontWeight: "600" },
  row: { flexDirection: "row", alignItems: "center", paddingVertical: 11, borderTopWidth: 1, borderTopColor: colors.line },
  chap: { width: 40, height: 40, borderRadius: 10, backgroundColor: colors.boardSoft, alignItems: "center", justifyContent: "center" },
  chapNum: { fontSize: 16, fontWeight: "700", color: colors.board },
  rowTitle: { fontSize: 15, fontWeight: "600", color: colors.ink },
  rowMeta: { fontSize: 12.5, color: colors.muted, marginTop: 3 },
  start: { fontSize: 14, fontWeight: "700", color: colors.board, marginTop: 6 },
  thumb: { width: 96, height: 64, borderRadius: 8, backgroundColor: colors.board, alignItems: "center", justifyContent: "center" },
  dur: { position: "absolute", bottom: 4, right: 5, color: colors.white, fontSize: 10.5 },
});
