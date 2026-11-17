import { revalidatePath } from "next/cache";
import { notFound } from "next/navigation";
import { decide, idImageUrls, type Verification } from "@/lib/biz/verify";
import { bizCopy } from "@/lib/copy-biz";
import { DATA_LIVE, db } from "@/lib/data";
import { mustMe } from "@/lib/growth/page";
import { me } from "@/lib/growth/people";
import { getLang } from "@/lib/lang";

export const dynamic = "force-dynamic";

async function rule(userId: string, ok: boolean, f: FormData) {
  "use server";
  const m = await me();
  if (!m?.admin || !DATA_LIVE) return;
  await decide(userId, ok ? "APPROVED" : "REJECTED", null, String(f.get("note") ?? "").trim().slice(0, 300) || null);
  revalidatePath("/admin/tutors");
}

export default async function AdminTutors() {
  const m = await mustMe("/admin/tutors");
  if (!m.admin || !DATA_LIVE) notFound();
  const c = bizCopy(await getLang()).verify;
  const { data } = await db().from("tutor_verifications").select("*").in("status", ["REVIEW", "PENDING"]).order("submitted_at").limit(50);
  const list = (data ?? []) as Verification[];
  const imgs = await Promise.all(list.map(idImageUrls));
  return (
    <div className="mx-auto max-w-4xl px-5 py-10">
      <h1 className="font-display text-3xl">{c.adminH}</h1>
      {list.length === 0 && <p className="mt-4 text-sm text-ink-3">{c.none}</p>}
      <div className="mt-4 grid gap-4">
        {list.map((v, i) => (
          <div key={v.user_id} className="card p-4 text-sm">
            <b>{v.profile_name}</b> · {v.email}
            <div className="mt-2 flex flex-wrap gap-2">{imgs[i]!.map((u) => <img key={u} src={u} alt="" className="max-h-56 rounded border border-line" />)}</div>
            {v.ai && <p className="mt-2 text-ink-2">{c.aiSays}: {v.ai.doc_type ?? "?"}{v.ai.school_class ? ` (class ${v.ai.school_class})` : ""} · {v.ai.institution ?? "?"} · {v.ai.name_on_card ?? "?"} · {v.ai.id_number ?? "?"} · {Math.round(v.ai.confidence * 100)}% · {v.ai.reason}</p>}
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <form action={rule.bind(null, v.user_id, true)}><button className="btn-board px-3! py-1!">{c.approve}</button></form>
              <form action={rule.bind(null, v.user_id, false)} className="flex gap-2">
                <input name="note" placeholder={c.reason} className="rounded border border-line px-2 py-1" />
                <button className="text-redpen underline">{c.reject}</button>
              </form>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
