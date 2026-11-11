import { ScrollView, Text, View } from "react-native";
import { router } from "expo-router";
import { formatTaka, settleClass } from "@porao/core";
import { Button, Card, s } from "../../src/ui";

export default function Earnings() {
  const one = settleClass({ classShare: 250, outcome: "COMPLETED", commissionRate: 0.2 });
  const classes = 18;
  const stat = (k: string, v: string) => (
    <Card style={{ flex: 1 }}>
      <Text style={s.muted}>{k}</Text>
      <Text style={[s.name, { fontSize: 20 }]}>{v}</Text>
    </Card>
  );
  return (
    <ScrollView style={s.screen} contentContainerStyle={s.pad}>
      <Button title="Start class now" onPress={() => router.push("/class/demo?as=teacher")} />
      <View style={{ flexDirection: "row", gap: 10 }}>
        {stat("Earned", formatTaka(one.teacherNet * classes))}
        {stat("Commission (20%)", formatTaka(one.platform * classes))}
      </View>
      <View style={{ flexDirection: "row", gap: 10 }}>
        {stat("On hold (48 h)", formatTaka(one.teacherNet * 2))}
        {stat("Available", formatTaka(one.teacherNet * 6))}
      </View>
      <Button title="Withdraw to bKash" variant="outline" />
    </ScrollView>
  );
}
