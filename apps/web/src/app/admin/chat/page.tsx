import Link from "next/link";
import { db } from "@/lib/data";
import { isUuid } from "@/lib/growth/people";
import { L } from "@/lib/l10n";
import { getLang } from "@/lib/lang";
import { deleteMessage } from "../actions";
import { Confirm } from "../Confirm";
import { PageHead, Pill, SearchBox, short, Tabs, tx } from "../ui";

export const dynamic = "force-dynamic";

interface Thread { id: string; a_email: string; b_email: string; a_name: string | null; b_name: string | null; last_text: string | null; last_at: string }

export default async function AdminChat({ searchParams }: { searchParams: Promise<{ q?: string; t?: string; tab?: string }> }) {
  const sp = await searchParams;
  const lang = await getLang();
  const t = tx(lang);
  const s = db();
  const q = (sp.q ?? "").trim().toLowerCase().replace(/[,()%"]/g, "").slice(0, 80);
  const tab = sp.tab === "flagged" ? "flagged" : "all";
  let threads: Thread[] = [];
  if (tab === "flagged") {
    const { data: flagged } = await s.from("chat_messages").select("thread_id").eq("masked", true).order("created_at", { ascending: false }).limit(300);
    const ids = [...new Set((flagged ?? []).map((m) => m.thread_id))].slice(0, 100);
    threads = ids.length ? (((await s.from("chat_threads").select("*").in("id", ids).order("last_at", { ascending: false })).data ?? []) as Thread[]) : [];
  } else {
    let query = s.from("chat_threads").select("*").order("last_at", { ascending: false }).limit(100);
    if (q) query = query.or(`a_email.ilike.%${q}%,b_email.ilike.%${q}%`);
    threads = ((await query).data ?? []) as Thread[];
  }
  const open = sp.t && isUuid(sp.t) ? sp.t : null;
  const [{ data: th }, { data: msgs }] = open
    ? await Promise.all([s.from("chat_threads").select("*").eq("id", open).maybeSingle(), s.from("chat_messages").select("*").eq("thread_id", open).order("created_at").limit(500)])
    : [{ data: null }, { data: null }];
  const who = (x: Thread, e: string) => (e === x.a_email ? x.a_name : x.b_name) ?? e;
  const link = (id: string) => `/admin/chat?tab=${tab}&q=${encodeURIComponent(q)}&t=${id}`;
  return (
    <div>
      <PageHead title={t("চ্যাট পাহারা", "Chat watch")} sub={t("ছাত্র-টিউটরের মেসেজ। ফোন নম্বর আদান-প্রদানের চেষ্টা হলে সিস্টেম লুকিয়ে দেয়, সেগুলো 'সন্দেহজনক' ট্যাবে।", "Student-tutor messages. Attempts to swap phone numbers are hidden automatically and listed under 'Suspicious'.")} />
      <Tabs base="/admin/chat" active={tab} tabs={[["all", t("সব কথোপকথন", "All chats")], ["flagged", t("সন্দেহজনক", "Suspicious")]]} />
      {tab === "all" && <SearchBox action="/admin/chat" q={q} placeholder={t("কারো ইমেইল…", "Someone's email…")} />}
      <div className="mt-4 grid gap-4 lg:grid-cols-[320px_1fr]">
        <ul className="card max-h-[70vh] divide-y divide-line overflow-y-auto">
          {threads.length === 0 && <li className="p-4 text-sm text-ink-3">{t("কিছু নেই", "Nothing")}</li>}
          {threads.map((x) => (
            <li key={x.id}>
              <Link href={link(x.id)} className={`block px-3 py-2 text-sm hover:bg-chalk ${x.id === open ? "bg-chalk" : ""}`}>
                <div className="font-medium">{who(x, x.a_email)} ↔ {who(x, x.b_email)}</div>
                <div className="truncate text-xs text-ink-3">{short(x.last_text, 60)} · {L.date(new Date(x.last_at), lang)}</div>
              </Link>
            </li>
          ))}
        </ul>
        <div className="card min-h-64 p-4">
          {!th ? <p className="text-sm text-ink-3">{t("বাঁ দিক থেকে একটা কথোপকথন বাছুন।", "Pick a chat on the left.")}</p> : (
            <>
              <div className="mb-3 text-sm">
                <b>{(th as Thread).a_email}</b> ↔ <b>{(th as Thread).b_email}</b>
              </div>
              <ul className="space-y-2 text-sm">
                {(msgs ?? []).map((m) => (
                  <li key={m.id} className={`rounded-lg px-3 py-2 ${m.sender_email === (th as Thread).a_email ? "bg-mist" : "bg-online"}`}>
                    <div className="flex items-center gap-2 text-xs text-ink-3">
                      <span>{m.sender_email}</span><span>{L.dateTime(new Date(m.created_at), lang)}</span>
                      {m.masked && <Pill tone="bad">{t("নম্বর লুকানো", "number hidden")}</Pill>}
                      <form action={deleteMessage.bind(null, m.id, open!)} className="ml-auto">
                        <Confirm ask={t("মেসেজটা সরিয়ে দেবেন?", "Remove this message?")} className="text-redpen underline">{t("সরান", "Remove")}</Confirm>
                      </form>
                    </div>
                    <p className="mt-1 whitespace-pre-wrap">{m.body}</p>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
