import { useMemo, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { DEMO_TEACHERS, DHAKA_AREAS, SUBJECTS, searchTeachers, type Subject, type TeachingMode } from "@merito/core";
import { TeacherRow, s } from "../../src/ui";
import { colors } from "../../src/theme";

/**
 * Production: area comes from expo-location (with permission) or Barikoi
 * address search, results from GET /teachers, and a react-native-maps view
 * sits above the list.
 */
export default function Search() {
  const [mode, setMode] = useState<TeachingMode | undefined>();
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [area, setArea] = useState("Farmgate");
  const hits = useMemo(
    () => searchTeachers(DEMO_TEACHERS, { mode, subjects, near: DHAKA_AREAS[area], maxDistanceKm: 5 }),
    [mode, subjects, area],
  );
  const pill = (active: boolean) => ({
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: active ? colors.brand : colors.border,
    backgroundColor: active ? colors.brandLight : colors.white,
  });
  return (
    <ScrollView style={s.screen} contentContainerStyle={s.pad}>
      <View style={s.row}>
        {([[undefined, "Any"], ["ONLINE", "Online"], ["OFFLINE", "At home"]] as const).map(([v, l]) => (
          <Pressable key={l} onPress={() => setMode(v)} style={pill(mode === v)}><Text>{l}</Text></Pressable>
        ))}
      </View>
      <Text style={s.h2}>Area</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
        {Object.keys(DHAKA_AREAS).map((a) => (
          <Pressable key={a} onPress={() => setArea(a)} style={pill(area === a)}><Text>{a}</Text></Pressable>
        ))}
      </ScrollView>
      <Text style={s.h2}>Subjects</Text>
      <View style={s.row}>
        {SUBJECTS.map((sub) => {
          const on = subjects.includes(sub);
          return (
            <Pressable key={sub} onPress={() => setSubjects((c) => (on ? c.filter((x) => x !== sub) : [...c, sub]))} style={pill(on)}>
              <Text>{sub}</Text>
            </Pressable>
          );
        })}
      </View>
      <Text style={[s.muted, { marginTop: 12 }]}>{hits.length} tutors near {area}</Text>
      {hits.map((h) => <TeacherRow key={h.teacher.id} t={h.teacher} distanceKm={h.distanceKm} />)}
    </ScrollView>
  );
}
