import { DEMO_TEACHERS } from "@mastermoshai/core";
import { copy } from "@/lib/copy";
import { L } from "@/lib/l10n";
import { getLang } from "@/lib/lang";
import ClassRoom from "./ClassRoom";

export default async function ClassPage({ searchParams }: { searchParams: Promise<{ as?: string }> }) {
  const { as } = await searchParams;
  const lang = await getLang();
  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <ClassRoom title={copy(lang).room.title} teacher={L.name(DEMO_TEACHERS[0]!, lang)} role={as === "teacher" ? "teacher" : "student"} />
    </div>
  );
}
