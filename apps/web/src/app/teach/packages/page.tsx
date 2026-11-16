import { DATA_LIVE } from "@/lib/data";
import { getUser } from "@/lib/auth/session";
import { teacherBatches } from "@/lib/batches";
import { growthCopy } from "@/lib/copy-growth";
import { getLang } from "@/lib/lang";
import { teacherPackages } from "@/lib/growth/packages";
import { PackageCard } from "@/app/packages/PackageCard";
import { createPackage, togglePackage } from "./actions";
import NewPackage from "./NewPackage";

export const dynamic = "force-dynamic";

export default async function TeachPackages() {
  if (!DATA_LIVE) return null; // the layout shows the setup note
  const u = (await getUser())!;
  const lang = await getLang();
  const c = growthCopy(lang).pkg;
  const [list, batches] = await Promise.all([teacherPackages(u.id), teacherBatches(u.id)]);
  return (
    <div>
      <h1 className="font-display text-3xl">{c.teachH}</h1>
      <p className="mt-1 max-w-2xl text-sm text-ink-2">{c.teachSub}</p>
      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_1.2fr]">
        <NewPackage action={createPackage} batches={batches.filter((b) => b.active).map((b) => ({ id: b.id, title: b.title }))} />
        <div className="grid content-start gap-3">
          {list.map((p) => (
            <div key={p.id} className={p.active ? "" : "opacity-60"}>
              <PackageCard p={p} lang={lang} cta={false} />
              <div className="mt-1 flex justify-between px-1 text-sm">
                <span className="text-ink-2">{c.subs(p.active_subs)}{p.active ? "" : ` · ${c.hidden}`}</span>
                <form action={togglePackage.bind(null, p.id, !p.active)}><button className="underline">{p.active ? c.hide : c.show}</button></form>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
