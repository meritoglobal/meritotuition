import { Off } from "@/components/growth/Off";
import { growthCopy } from "@/lib/copy-growth";
import { marketCopy } from "@/lib/copy-market";
import { DATA_LIVE } from "@/lib/data";
import { getLang } from "@/lib/lang";
import { browse } from "@/lib/growth/packages";
import { publicTutor } from "@/lib/growth/tutors";
import TutorView from "./TutorView";

export const dynamic = "force-dynamic";

/** Public profile of a tutor who signed up (the /teachers pages still show demo tutors). */
export default async function TutorPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const lang = await getLang();
  const c = marketCopy(lang);
  if (!DATA_LIVE) return <div className="mx-auto max-w-4xl px-5 py-10"><Off text={growthCopy(lang).off} /></div>;
  const t = await publicTutor(decodeURIComponent(id));
  if (!t) return <div className="mx-auto max-w-4xl px-5 py-10"><Off text={c.tutor.notFound} /></div>;
  const pkgs = await browse({ teacher: t.id });
  return <TutorView t={t} pkgs={pkgs} lang={lang} />;
}
