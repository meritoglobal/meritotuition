import "server-only";
import type { TeacherProfile } from "@/lib/batches";
import { db } from "@/lib/data";

/** A real tutor's public profile: no phone, no email. */
export interface PublicTutor {
  id: string; name: string; headline: string | null; bio: string | null; university: string | null; department: string | null;
  subjects: string[]; levels: string[]; teachesOnline: boolean; teachesHome: boolean; homeArea: string | null; homeRadiusKm: number | null;
  priceOnline: number | null; priceHome: number | null;
}

export async function publicTutor(id: string): Promise<PublicTutor | null> {
  if (!/^[\w:-]{1,80}$/.test(id)) return null;
  const { data } = await db().from("teacher_profiles").select("*").eq("user_id", id).maybeSingle();
  if (!data) return null;
  const t = data as TeacherProfile;
  return {
    id: t.user_id, name: t.name, headline: t.headline, bio: t.bio, university: t.university, department: t.department,
    subjects: t.subjects, levels: t.levels, teachesOnline: t.teaches_online, teachesHome: t.teaches_home,
    homeArea: t.home_area, homeRadiusKm: t.home_radius_km, priceOnline: t.price_online, priceHome: t.price_home,
  };
}
