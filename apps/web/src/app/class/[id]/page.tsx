import Link from "next/link";
import { DEMO_TEACHERS, type ClassLevel } from "@mastermoshai/core";
import ClassTools from "@/components/class/ClassTools";
import { getUser } from "@/lib/auth/session";
import { batchByClass } from "@/lib/batches";
import { roleIn } from "@/lib/class-access";
import { copy } from "@/lib/copy";
import { toolsCopy } from "@/lib/copy-tools";
import { DATA_LIVE, safeClassId } from "@/lib/data";
import { L } from "@/lib/l10n";
import { getLang } from "@/lib/lang";
import { LK_LIVE } from "@/lib/livekit";
import ClassRoom from "./ClassRoom";

export default async function ClassPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ as?: string; tab?: string }> }) {
  const id = safeClassId((await params).id);
  const { as, tab } = await searchParams;
  const lang = await getLang();
  const user = (await getUser())!; // /class is login-protected by the proxy
  const role = await roleIn(id, user, as ?? null);
  const batch = DATA_LIVE ? await batchByClass(id) : null;

  if (!role) {
    return (
      <div className="mx-auto max-w-xl px-4 py-16 text-center">
        <p className="card p-8 text-sm text-ink-2">{toolsCopy(lang).teach.notAllowed}</p>
        <Link href="/dashboard/student" className="btn-board mt-6 inline-block">{copy(lang).nav.mine}</Link>
      </div>
    );
  }

  const title = batch ? `${batch.title} · ${L.subject(batch.subject, lang)} · ${L.level(batch.level as ClassLevel, lang)}` : copy(lang).room.title;
  const teacher = batch ? (batch.teacher_name ?? "") : L.name(DEMO_TEACHERS[0]!, lang);
  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <ClassRoom classId={id} live={LK_LIVE} title={title} teacher={teacher} role={role} />
      <ClassTools classId={id} role={role} initial={tab === "exams" || tab === "recordings" ? tab : "files"} />
    </div>
  );
}
