import { Alert, ScrollView, Text, View } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { CLASS_LEVEL_LABEL, DEMO_TEACHERS, WEEKDAY_LABEL, formatTaka, openSeats, timeLabel } from "@mastermoshai/core";
import { Button, Card, Chip, s } from "../../src/ui";

export default function TeacherScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const t = DEMO_TEACHERS.find((x) => x.id === id);
  if (!t) return <Text style={s.pad}>Tutor not found</Text>;
  return (
    <ScrollView style={s.screen} contentContainerStyle={s.pad}>
      <Text style={s.h1}>{t.name}</Text>
      <Text style={s.muted}>{t.university} · {t.department}</Text>
      <View style={s.row}>
        {t.verified && <Chip label="✓ Verified" tone="green" />}
        <Chip label={`★ ${t.rating} (${t.reviewCount})`} tone="amber" />
        {t.area && <Chip label={`Home tutor · ${t.area.name}`} />}
      </View>
      <Text style={{ marginTop: 8 }}>{t.bio}</Text>
      <Text style={s.h2}>Weekly routine</Text>
      {t.routine.map((r) => {
        const seats = openSeats(r);
        return (
          <Card key={r.id} style={{ gap: 6 }}>
            <Text style={s.name}>{r.days.map((d) => WEEKDAY_LABEL[d]).join(" · ")} · {timeLabel(r.startTime)}</Text>
            <Text style={s.muted}>{r.subjects.join(", ")} · {CLASS_LEVEL_LABEL[r.level]} · 1:{r.batchSize} · {r.mode === "ONLINE" ? "Online" : "At home"}</Text>
            <Text>{formatTaka(r.monthlyPrice)}/month · {seats > 0 ? `${seats} seat(s) open` : "Full"}</Text>
            <View style={{ flexDirection: "row", gap: 8 }}>
              {r.trialSeats > 0 && seats > 0 && <View style={{ flex: 1 }}><Button title="Free trial" variant="sun" onPress={() => Alert.alert("Free trial booked", "We will remind you before the class.")} /></View>}
              {seats > 0 && <View style={{ flex: 1 }}><Button title={`Pay ${formatTaka(r.monthlyPrice)}`} onPress={() => Alert.alert("Payment", "Opens bKash / Nagad / card checkout.")} /></View>}
            </View>
          </Card>
        );
      })}
      <Text style={[s.muted, { marginTop: 8 }]}>Your payment is held by Mastermoshai and released to the tutor class by class. Missed classes are refunded.</Text>
    </ScrollView>
  );
}
