import Link from "next/link";
import { getUser } from "@/lib/auth/session";
import { getProfile } from "@/lib/batches";
import { myVerification } from "@/lib/biz/verify";
import { bizCopy } from "@/lib/copy-biz";
import { toolsCopy } from "@/lib/copy-tools";
import { DATA_LIVE } from "@/lib/data";
import { getLang } from "@/lib/lang";
import { sendId } from "./actions";
import IdForm from "./IdForm";

export const dynamic = "force-dynamic";

export default async function Verify() {
  if (!DATA_LIVE) return null; // the layout shows the setup note
  const lang = await getLang();
  const c = bizCopy(lang).verify;
  const u = (await getUser())!;
  const [p, v] = await Promise.all([getProfile(u.id), myVerification(u.id)]);
  const status = v?.status ?? "NONE";
  return (
    <div className="max-w-2xl">
      <h1 className="font-display text-3xl">{c.h1}</h1>
      <p className="mt-1 text-sm text-ink-2">{c.sub}</p>
      {!p ? (
        <div className="mt-6 rounded-lg bg-mist p-5 text-sm">{c.needProfile} <Link href="/teach/profile" className="font-semibold underline">{toolsCopy(lang).teach.setupBtn}</Link></div>
      ) : (
        <>
          <p className={`mt-6 rounded-lg p-4 text-sm font-semibold ${status === "APPROVED" ? "bg-home text-home-ink" : status === "REJECTED" ? "bg-redpen-tint text-redpen" : "bg-mist"}`}>
            {status === "APPROVED" ? c.approved : c.status[status]}
            {status === "REJECTED" && v?.note && <span className="mt-1 block font-normal">{v.note}</span>}
          </p>
          {status !== "APPROVED" && status !== "REVIEW" && <div className="mt-4"><IdForm action={sendId} /></div>}
        </>
      )}
    </div>
  );
}
