import "server-only";
import { db } from "@/lib/data";
import { studentBatches } from "@/lib/batches";
import { maskContacts } from "./mask";
import { notify } from "./notify";
import { displayName, isUuid } from "./people";
import { requestLinked } from "./requests";

/** Quote a value for a PostgREST or() filter. */
const q = (v: string) => `"${v.replace(/["\\]/g, "")}"`;

export interface Thread {
  id: string; other: string; otherName: string; lastText: string | null; lastAt: string; unread: boolean;
}
export interface Message { id: number; mine: boolean; body: string; masked: boolean; at: string }

interface Row { id: string; a_email: string; b_email: string; a_name: string | null; b_name: string | null; last_text: string | null; last_at: string; a_read_at: string; b_read_at: string }

const view = (r: Row, me: string): Thread => {
  const a = r.a_email === me;
  return {
    id: r.id, other: a ? r.b_email : r.a_email, otherName: (a ? r.b_name : r.a_name) ?? (a ? r.b_email : r.a_email).split("@")[0]!,
    lastText: r.last_text, lastAt: r.last_at, unread: new Date(a ? r.a_read_at : r.b_read_at) < new Date(r.last_at) && r.last_text != null,
  };
};

export async function threads(me: string): Promise<Thread[]> {
  const { data } = await db().from("chat_threads").select("*").or(`a_email.eq.${q(me)},b_email.eq.${q(me)}`).order("last_at", { ascending: false }).limit(100);
  return ((data ?? []) as Row[]).map((r) => view(r, me));
}

export async function thread(id: string, me: string): Promise<Thread | null> {
  if (!isUuid(id)) return null;
  const { data } = await db().from("chat_threads").select("*").eq("id", id).maybeSingle();
  const r = data as Row | null;
  return r && (r.a_email === me || r.b_email === me) ? view(r, me) : null;
}

/**
 * Who may start a chat with whom: people who share a batch (tutor ↔ student),
 * a guardian with their child's tutors, a subscriber with their package tutor,
 * a student with the tutor answering their question. Anyone may reply in an existing thread.
 */
export async function canChat(me: string, other: string): Promise<boolean> {
  if (me === other) return false;
  const s = db();
  const linked = async (student: string, tutor: string) => {
    const bs = await studentBatches(student);
    if (!bs.length) return false;
    const { data } = await s.from("teacher_profiles").select("user_id").eq("email", tutor);
    const ids = new Set((data ?? []).map((r) => r.user_id));
    return bs.some((b) => ids.has(b.teacher_id));
  };
  if (await linked(me, other) || await linked(other, me)) return true;
  const { data: kids } = await s.from("guardian_links").select("student_email").eq("guardian_email", me);
  for (const k of kids ?? []) if (await linked(k.student_email, other)) return true;
  const { data: kids2 } = await s.from("guardian_links").select("student_email").eq("guardian_email", other);
  for (const k of kids2 ?? []) if (await linked(k.student_email, me)) return true;
  const pair = async (x: string, y: string) => {
    const { data } = await s.from("subscriptions").select("id, packages!inner(teacher_email)").or(`student_email.eq.${q(x)},payer_email.eq.${q(x)}`).eq("packages.teacher_email", y).limit(1);
    if (data?.length) return true;
    const { data: d } = await s.from("doubts").select("id").eq("asker_email", x).eq("tutor_email", y).limit(1);
    return Boolean(d?.length);
  };
  if ((await pair(me, other)) || (await pair(other, me))) return true;
  return (await requestLinked(me, other)) || (await requestLinked(other, me));
}

/** Find or create the one thread between two people. */
export async function openThread(me: string, other: string): Promise<string> {
  const [a, b] = me < other ? [me, other] : [other, me];
  const s = db();
  const { data } = await s.from("chat_threads").select("id").eq("a_email", a).eq("b_email", b).maybeSingle();
  if (data) return data.id;
  const [an, bn] = await Promise.all([displayName(a), displayName(b)]);
  const { data: made, error } = await s.from("chat_threads").insert({ a_email: a, b_email: b, a_name: an, b_name: bn, last_text: null }).select("id").single();
  if (error) {
    const again = await s.from("chat_threads").select("id").eq("a_email", a).eq("b_email", b).single();
    return again.data!.id;
  }
  return made.id;
}

export async function messages(t: Thread, me: string, after = 0): Promise<Message[]> {
  const s = db();
  const { data } = await s.from("chat_messages").select("id,sender_email,body,masked,created_at").eq("thread_id", t.id).gt("id", after).order("id").limit(300);
  const [a] = me < t.other ? [me] : [t.other];
  await s.from("chat_threads").update(a === me ? { a_read_at: new Date().toISOString() } : { b_read_at: new Date().toISOString() }).eq("id", t.id);
  return (data ?? []).map((m) => ({ id: m.id, mine: m.sender_email === me, body: m.body, masked: m.masked, at: m.created_at }));
}

export async function send(t: Thread, me: string, raw: string): Promise<Message | null> {
  const text = raw.trim().slice(0, 2000);
  if (!text) return null;
  const { text: body, masked } = maskContacts(text);
  const s = db();
  const { data, error } = await s.from("chat_messages").insert({ thread_id: t.id, sender_email: me, body, masked }).select("id,created_at").single();
  if (error) return null;
  const now = new Date().toISOString();
  const mineIsA = me < t.other;
  await s.from("chat_threads").update({ last_text: body.slice(0, 140), last_at: now, ...(mineIsA ? { a_read_at: now } : { b_read_at: now }) }).eq("id", t.id);
  // One notification per burst: skip if the other side already has an unread one for this thread.
  const { count } = await s.from("app_notifications").select("id", { count: "exact", head: true }).eq("email", t.other).eq("kind", "CHAT").eq("path", `/chat/${t.id}`).eq("read", false);
  if (!count) await notify({ email: t.other, kind: "CHAT", title: `${await displayName(me)}: নতুন মেসেজ`, body: body.slice(0, 120), path: `/chat/${t.id}` });
  return { id: data.id, mine: true, body, masked, at: data.created_at };
}

export async function unreadCount(me: string): Promise<number> {
  return (await threads(me)).filter((t) => t.unread).length;
}
