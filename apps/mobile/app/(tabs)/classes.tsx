import { ScrollView, Text } from "react-native";
import { router } from "expo-router";
import { DEMO_TEACHERS, timeLabel } from "@mastermoshai/core";
import { Button, Card, s } from "../../src/ui";

export default function Classes() {
  const t = DEMO_TEACHERS[0]!;
  const slot = t.routine[0]!;
  return (
    <ScrollView style={s.screen} contentContainerStyle={s.pad}>
      <Card style={{ gap: 6 }}>
        <Text style={s.muted}>Next class · today {timeLabel(slot.startTime)}</Text>
        <Text style={s.name}>{slot.subjects.join(", ")} with {t.name}</Text>
        <Button title="Open class room" onPress={() => router.push("/class/demo")} />
      </Card>
      <Text style={s.h2}>This month</Text>
      <Card><Text>Paid ৳3,000 · 4 of 12 classes done · ৳250 refunded (teacher absent on one day)</Text></Card>
      <Button title="Flag a class" variant="danger" />
    </ScrollView>
  );
}
