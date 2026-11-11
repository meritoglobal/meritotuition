import { useEffect, useState } from "react";
import { Text, View } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { roomState } from "@mastermoshai/core";
import { Button, Card, s } from "../../src/ui";
import { colors } from "../../src/theme";

/**
 * Waiting room + live class. Production renders @livekit/react-native
 * <LiveKitRoom> with the token from POST /sessions/:id/join once state is LIVE.
 */
export default function ClassRoom() {
  const { as } = useLocalSearchParams<{ id: string; as?: string }>();
  const isTeacher = as === "teacher";
  const [start] = useState(() => new Date(Date.now() + 90_000));
  const [now, setNow] = useState(new Date());
  const [started, setStarted] = useState(false);
  const [inRoom, setInRoom] = useState(false);
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);
  const state = roomState({ now, start, durationMin: 60, teacherStarted: started, ended: false });
  const secs = Math.max(0, Math.round((start.getTime() - now.getTime()) / 1000));

  if (inRoom) {
    return (
      <View style={{ flex: 1, backgroundColor: "#0f172a", padding: 12, gap: 8 }}>
        <View style={{ flex: 2, backgroundColor: "#1e293b", borderRadius: 16, alignItems: "center", justifyContent: "center" }}>
          <Text style={{ color: "white" }}>Teacher video</Text>
        </View>
        <View style={{ flex: 1, backgroundColor: "#1e293b", borderRadius: 16, alignItems: "center", justifyContent: "center" }}>
          <Text style={{ color: "#94a3b8" }}>You</Text>
        </View>
        <Button title="Leave class" variant="danger" onPress={() => setInRoom(false)} />
      </View>
    );
  }
  return (
    <View style={[s.screen, s.pad, { justifyContent: "center" }]}>
      <Card style={{ alignItems: "center", gap: 12, paddingVertical: 32 }}>
        <Text style={s.muted}>Physics · Class 9-10</Text>
        <Text style={{ fontSize: 40, fontWeight: "800", color: colors.text }}>
          {state === "LIVE" ? "Live" : state === "WAITING_FOR_TEACHER" ? "Waiting…" : `${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, "0")}`}
        </Text>
        <Text style={[s.muted, { textAlign: "center" }]}>
          {isTeacher ? "Tap start; your students get a notification." : state === "LIVE" ? "Teacher started. Join now." : "You are in the waiting room."}
        </Text>
        {isTeacher ? (
          <Button title="Start class" onPress={() => { setStarted(true); setInRoom(true); }} />
        ) : (
          <Button title="Join class" disabled={state !== "LIVE"} onPress={() => setInRoom(true)} />
        )}
        {!isTeacher && !started && <Text onPress={() => setStarted(true)} style={[s.muted, { textDecorationLine: "underline" }]}>Demo: simulate teacher start</Text>}
      </Card>
    </View>
  );
}
