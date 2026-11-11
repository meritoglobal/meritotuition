import { DEMO_TEACHERS } from "@mastermoshai/core";
import { copy } from "@/lib/copy";
import { L } from "@/lib/l10n";
import { getLang } from "@/lib/lang";
import { LK_LIVE } from "@/lib/livekit";
import ClassRoom from "./ClassRoom";

export default async function ClassPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ as?: string }> }) {
  const { id } = await params;
  const { as } = await searchParams;
  const lang = await getLang();
  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <ClassRoom classId={id} live={LK_LIVE} title={copy(lang).room.title} teacher={L.name(DEMO_TEACHERS[0]!, lang)} role={as === "teacher" ? "teacher" : "student"} />
    </div>
  );
}
