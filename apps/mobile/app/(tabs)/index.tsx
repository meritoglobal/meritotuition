import { ScrollView, Text, View } from "react-native";
import { Link } from "expo-router";
import { DEMO_TEACHERS, DEMO_VIDEOS, rankScore } from "@merito/core";
import { Card, TeacherRow, s } from "../../src/ui";
import { colors } from "../../src/theme";

export default function Home() {
  const top = [...DEMO_TEACHERS].sort((a, b) => rankScore(b) - rankScore(a)).slice(0, 3);
  return (
    <ScrollView style={s.screen} contentContainerStyle={s.pad}>
      <View style={{ backgroundColor: colors.sun, borderWidth: 2, borderColor: colors.text, borderRadius: 12, padding: 18, gap: 6 }}>
        <Text style={s.h1}>আজ কী পড়বে?</Text>
        <Text style={{ color: colors.text, fontSize: 15 }}>A tutor who actually shows up. First class free, missed classes refunded.</Text>
      </View>
      <Text style={s.h2}>Free classes</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10, paddingVertical: 8 }}>
        {DEMO_VIDEOS.map((v) => (
          <Card key={v.id} style={{ width: 220, padding: 0, overflow: "hidden" }}>
            <View style={{ height: 110, backgroundColor: [colors.sun, colors.lilac, colors.mint, colors.coral][Number(v.id.slice(1)) % 4], alignItems: "center", justifyContent: "center" }}>
              <Text style={{ color: colors.text, fontSize: 32 }}>▶</Text>
            </View>
            <View style={{ padding: 10 }}>
              <Text style={s.name} numberOfLines={2}>{v.title}</Text>
              <Text style={s.muted}>{v.subject} · {v.level}</Text>
            </View>
          </Card>
        ))}
      </ScrollView>
      <Text style={s.h2}>Top tutors</Text>
      {top.map((t) => <TeacherRow key={t.id} t={t} />)}
      <Link href="/search" style={{ color: colors.text, fontWeight: "700", textDecorationLine: "underline", marginTop: 8 }}>See all tutors →</Link>
    </ScrollView>
  );
}
