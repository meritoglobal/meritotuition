import { ScrollView, Text, View } from "react-native";
import { Link } from "expo-router";
import { DEMO_TEACHERS, DEMO_VIDEOS, rankScore } from "@merito/core";
import { Card, TeacherRow, s } from "../../src/ui";
import { colors } from "../../src/theme";

export default function Home() {
  const top = [...DEMO_TEACHERS].sort((a, b) => rankScore(b) - rankScore(a)).slice(0, 3);
  return (
    <ScrollView style={s.screen} contentContainerStyle={s.pad}>
      <Text style={s.h1}>আজ কী পড়বে?</Text>
      <Text style={s.muted}>Free classes from tutors near you. Like one? Book a free trial.</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10, paddingVertical: 8 }}>
        {DEMO_VIDEOS.map((v) => (
          <Card key={v.id} style={{ width: 220, padding: 0, overflow: "hidden" }}>
            <View style={{ height: 110, backgroundColor: colors.brandDark, alignItems: "center", justifyContent: "center" }}>
              <Text style={{ color: "white", fontSize: 32 }}>▶</Text>
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
      <Link href="/search" style={{ color: colors.brand, fontWeight: "600", marginTop: 8 }}>See all tutors →</Link>
    </ScrollView>
  );
}
