import { notFound } from "next/navigation";
import { growthCopy } from "@/lib/copy-growth";
import { DATA_LIVE, db } from "@/lib/data";
import { getLang } from "@/lib/lang";
import { L } from "@/lib/l10n";
import { mustMe } from "@/lib/growth/page";
import { PAY_DEMO } from "@/lib/growth/pay";
import { finishDemo } from "./actions";

export const dynamic = "force-dynamic";

export default async function DemoPay({ searchParams }: { searchParams: Promise<{ pid?: string }> }) {
  const { pid = "" } = await searchParams;
  const m = await mustMe(`/pay/demo?pid=${pid}`);
  if (!DATA_LIVE || !PAY_DEMO || !/^[0-9a-f-]{36}$/i.test(pid)) notFound();
  const { data: p } = await db().from("payments").select("amount,payer_email,status").eq("id", pid).maybeSingle();
  if (!p || p.payer_email !== m.email) notFound();
  const lang = await getLang();
  const c = growthCopy(lang).pay;
  return (
    <div className="mx-auto max-w-md px-5 py-16">
      <div className="card overflow-hidden">
        <div className="bg-[#e2136e] px-5 py-4 text-lg font-bold text-white">bKash · {c.demoH}</div>
        <div className="p-5">
          <p className="text-sm text-ink-2">{c.demoBody}</p>
          <div className="mt-4 text-sm text-ink-3">{c.amount}</div>
          <div className="text-3xl font-bold">{L.taka(p.amount, lang)}</div>
          <div className="mt-6 flex gap-2">
            <form action={finishDemo.bind(null, pid, true)} className="flex-1"><button className="btn w-full border-[#e2136e] bg-[#e2136e] text-white">{c.success}</button></form>
            <form action={finishDemo.bind(null, pid, false)}><button className="btn-ghost">{c.fail}</button></form>
          </div>
        </div>
      </div>
    </div>
  );
}
