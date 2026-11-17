import "server-only";
import { CLASS_LEVELS, DHAKA_AREAS, SUBJECTS, distanceKm } from "@mastermoshai/core";
import type { TeacherProfile } from "@/lib/batches";
import { db } from "@/lib/data";
import { maskContacts } from "./mask";
import { notify } from "./notify";
import { proSet } from "./pro";

/**
 * Tuition requests. A student posts what they need; tutors whose own filter
 * matches are notified, can message the student and bid; the student picks a
 * bid, or invites a tutor who is open to new students.
 */
export type Mode = "HOME" | "ONLINE";
export interface TuitionRequest {
  id: string; student_email: string; student_name: string | null; subject: string; level: string; mode: Mode;
  area: string | null; budget: number; days_per_week: number; note: string | null;
  status: "OPEN" | "MATCHED" | "CLOSED"; chosen_bid: string | null; notified: number; created_at: string; expires_at: string;
}
export interface Bid {
  id: string; request_id: string; teacher_id: string; teacher_email: string; teacher_name: string | null;
  price: number; message: string | null; status: "PENDING" | "ACCEPTED" | "DECLINED" | "WITHDRAWN"; created_at: string;
}
export interface Prefs { user_id: string; open: boolean; notify: boolean; min_budget: number | null; extra_areas: string[] }
/** What a student sees about a tutor: no phone, no email. */
export interface TutorCard {
  id: string; name: string; headline: string | null; university: string | null; department: string | null;
  subjects: string[]; area: string | null; price: number | null; distanceKm: number | null; pro: boolean;
}

export const MAX_OPEN = 5;
export const AREAS = Object.keys(DHAKA_AREAS);
const DEFAULT_RADIUS = 5;
const NOTIFY_CAP = 200;

const defaults = (user_id: string): Prefs => ({ user_id, open: true, notify: true, min_budget: null, extra_areas: [] });

export async function getPrefs(userId: string): Promise<Prefs> {
  const { data } = await db().from("teacher_request_prefs").select("user_id,open,notify,min_budget,extra_areas").eq("user_id", userId).maybeSingle();
  return (data as Prefs) ?? defaults(userId);
}

export async function savePrefs(p: Prefs) {
  const extra = p.extra_areas.filter((a) => AREAS.includes(a)).slice(0, 10);
  const min = p.min_budget && p.min_budget > 0 ? Math.min(100000, Math.round(p.min_budget)) : null;
  await db().from("teacher_request_prefs").upsert({ ...p, extra_areas: extra, min_budget: min, updated_at: new Date().toISOString() });
}

function km(a: string | null, b: string | null): number | null {
  const pa = a ? DHAKA_AREAS[a] : undefined, pb = b ? DHAKA_AREAS[b] : undefined;
  return pa && pb ? distanceKm(pa, pb) : null;
}

/** Does this request fall inside the tutor's own filter? */
export function matches(r: Pick<TuitionRequest, "subject" | "level" | "mode" | "area" | "budget">, t: TeacherProfile, p: Prefs): boolean {
  if (!t.subjects.includes(r.subject)) return false;
  if (t.levels.length && !t.levels.includes(r.level)) return false;
  if (p.min_budget && r.budget < p.min_budget) return false;
  if (r.mode === "ONLINE") return t.teaches_online;
  if (!t.teaches_home) return false;
  if (r.area && p.extra_areas.includes(r.area)) return true;
  const d = km(r.area, t.home_area);
  return d !== null && d <= (t.home_radius_km ?? DEFAULT_RADIUS);
}

async function prefsMap(ids: string[]): Promise<Map<string, Prefs>> {
  if (!ids.length) return new Map();
  const { data } = await db().from("teacher_request_prefs").select("user_id,open,notify,min_budget,extra_areas").in("user_id", ids);
  const m = new Map((data as Prefs[] | null ?? []).map((p) => [p.user_id, p]));
  return new Map(ids.map((id) => [id, m.get(id) ?? defaults(id)]));
}

/** Tutors who teach this subject and whose filter takes this request. */
export async function matchingTutors(r: Pick<TuitionRequest, "subject" | "level" | "mode" | "area" | "budget">, opts: { openOnly?: boolean } = {}) {
  const { data } = await db().from("teacher_profiles").select("*").contains("subjects", [r.subject]).limit(1000);
  const profiles = (data ?? []) as TeacherProfile[];
  const prefs = await prefsMap(profiles.map((t) => t.user_id));
  return profiles.filter((t) => {
    const p = prefs.get(t.user_id)!;
    return matches(r, t, p) && (!opts.openOnly || p.open);
  }).map((t) => ({ t, p: prefs.get(t.user_id)! }));
}

export function card(t: TeacherProfile, r?: Pick<TuitionRequest, "mode" | "area">, pro = false): TutorCard {
  return {
    id: t.user_id, name: t.name, headline: t.headline, university: t.university, department: t.department, subjects: t.subjects,
    pro, area: t.teaches_home ? t.home_area : null, price: r?.mode === "HOME" ? t.price_home : t.price_online,
    distanceKm: r?.mode === "HOME" ? (() => { const d = km(r.area, t.home_area); return d === null ? null : Math.round(d * 10) / 10; })() : null,
  };
}

/** "৪,০০০ টাকা" or "4000" → 4000. */
export const toNumber = (x: unknown) => Number(String(x ?? "").replace(/[০-৯]/g, (d) => String("০১২৩৪৫৬৭৮৯".indexOf(d))).replace(/[^\d]/g, "")) || 0;

export interface NewRequest { subject: string; level: string; mode: Mode; area: string | null; budget: number; days: number; note: string }

/** Checks a new request; returns an error key or the cleaned request. */
export function clean(f: Partial<Record<keyof NewRequest, unknown>>): NewRequest | { error: string } {
  const subject = SUBJECTS.find((s) => s === f.subject);
  const level = CLASS_LEVELS.find((l) => l === f.level);
  const mode: Mode = f.mode === "ONLINE" ? "ONLINE" : "HOME";
  const area = AREAS.find((a) => a === f.area) ?? null;
  const budget = toNumber(f.budget);
  const days = toNumber(f.days ?? 3);
  if (!subject || !level) return { error: "subject" };
  if (mode === "HOME" && !area) return { error: "area" };
  if (!(budget >= 500 && budget <= 100000)) return { error: "budget" };
  if (!(days >= 1 && days <= 7)) return { error: "days" };
  return { subject, level, mode, area: mode === "HOME" ? area : null, budget, days, note: maskContacts(String(f.note ?? "").trim().slice(0, 500)).text };
}

export async function openCount(email: string): Promise<number> {
  const { count } = await db().from("tuition_requests").select("id", { count: "exact", head: true }).eq("student_email", email).eq("status", "OPEN").gt("expires_at", new Date().toISOString());
  return count ?? 0;
}

/** Post a request and tell every matching tutor who wants to hear about them. */
export async function postRequest(email: string, name: string, r: NewRequest): Promise<TuitionRequest> {
  const { data, error } = await db().from("tuition_requests").insert({
    student_email: email, student_name: name, subject: r.subject, level: r.level, mode: r.mode, area: r.area,
    budget: r.budget, days_per_week: r.days, note: r.note || null,
  }).select("*").single();
  if (error) throw error;
  const req = data as TuitionRequest;
  const all = (await matchingTutors(req)).filter(({ t, p }) => p.notify && t.email && t.email.toLowerCase() !== email);
  const pros = await proSet(all.map(({ t }) => t.user_id));
  const tutors = [...all.filter(({ t }) => pros.has(t.user_id)), ...all.filter(({ t }) => !pros.has(t.user_id))].slice(0, NOTIFY_CAP);
  const where = req.mode === "HOME" ? `${req.area} (বাসায় গিয়ে)` : "অনলাইনে";
  await Promise.all(tutors.map(({ t }) => notify({
    email: t.email!.toLowerCase(), kind: "REQUEST", title: `নতুন ছাত্র খুঁজছে: ${req.subject}, ${where}`,
    body: `বাজেট মাসে ৳${req.budget}, সপ্তাহে ${req.days_per_week} দিন`, path: `/teach/requests/${req.id}`, mail: pros.has(t.user_id),
  })));
  await db().from("tuition_requests").update({ notified: tutors.length }).eq("id", req.id);
  return { ...req, notified: tutors.length };
}

export async function getRequest(id: string): Promise<TuitionRequest | null> {
  const { data } = await db().from("tuition_requests").select("*").eq("id", id).maybeSingle();
  return (data as TuitionRequest) ?? null;
}

export const isLive = (r: TuitionRequest) => r.status === "OPEN" && new Date(r.expires_at) > new Date();

export async function myRequests(email: string): Promise<(TuitionRequest & { bids: number })[]> {
  const { data } = await db().from("tuition_requests").select("*, request_bids(count)").eq("student_email", email).order("created_at", { ascending: false }).limit(50);
  return ((data ?? []) as (TuitionRequest & { request_bids: { count: number }[] })[]).map(({ request_bids, ...r }) => ({ ...r, bids: request_bids?.[0]?.count ?? 0 }));
}

export async function bidsFor(requestId: string): Promise<(Bid & { tutor: TutorCard | null })[]> {
  const s = db();
  const { data } = await s.from("request_bids").select("*").eq("request_id", requestId).neq("status", "WITHDRAWN").order("created_at");
  const bids = (data ?? []) as Bid[];
  if (!bids.length) return [];
  const { data: ps } = await s.from("teacher_profiles").select("*").in("user_id", bids.map((b) => b.teacher_id));
  const req = await getRequest(requestId);
  const byId = new Map(((ps ?? []) as TeacherProfile[]).map((t) => [t.user_id, t]));
  const pros = await proSet(bids.map((b) => b.teacher_id));
  return bids.map((b) => ({ ...b, tutor: byId.has(b.teacher_id) ? card(byId.get(b.teacher_id)!, req ?? undefined, pros.has(b.teacher_id)) : null }))
    .sort((a, b) => Number(pros.has(b.teacher_id)) - Number(pros.has(a.teacher_id))); // Pro first, then oldest first
}

/** Tutors open to new students whose filter takes this request (minus those who already bid). */
export async function suggestions(r: TuitionRequest): Promise<(TutorCard & { invited: boolean })[]> {
  const s = db();
  const [list, { data: bids }, { data: inv }] = await Promise.all([
    matchingTutors(r, { openOnly: true }),
    s.from("request_bids").select("teacher_id").eq("request_id", r.id),
    s.from("request_invites").select("teacher_id").eq("request_id", r.id),
  ]);
  const bid = new Set((bids ?? []).map((b) => b.teacher_id));
  const invited = new Set((inv ?? []).map((b) => b.teacher_id));
  const left = list.filter(({ t }) => !bid.has(t.user_id) && t.email?.toLowerCase() !== r.student_email);
  const pros = await proSet(left.map(({ t }) => t.user_id));
  return left.map(({ t }) => ({ ...card(t, r, pros.has(t.user_id)), invited: invited.has(t.user_id) }))
    .sort((a, b) => Number(b.pro) - Number(a.pro) || (a.distanceKm ?? 99) - (b.distanceKm ?? 99))
    .slice(0, 30);
}

export async function invite(r: TuitionRequest, teacherId: string): Promise<boolean> {
  if (!isLive(r)) return false;
  const { data: t } = await db().from("teacher_profiles").select("*").eq("user_id", teacherId).maybeSingle();
  if (!t?.email || !matches(r, t as TeacherProfile, await getPrefs(teacherId))) return false;
  const { error } = await db().from("request_invites").insert({ request_id: r.id, teacher_id: teacherId });
  if (!error) await notify({ email: t.email.toLowerCase(), kind: "REQUEST", title: `${r.student_name ?? "একজন ছাত্র"} আপনাকে পড়ানোর জন্য ডেকেছে`, body: `${r.subject}, বাজেট মাসে ৳${r.budget}`, path: `/teach/requests/${r.id}`, mail: true });
  return true;
}

/** Open requests for a tutor's feed: the ones their filter takes, or all of them. */
export async function feed(t: TeacherProfile | null, p: Prefs, all: boolean): Promise<(TuitionRequest & { mine: Bid | null; bids: number; invited: boolean })[]> {
  const s = db();
  let q = s.from("tuition_requests").select("*, request_bids(count)").eq("status", "OPEN").gt("expires_at", new Date().toISOString()).order("created_at", { ascending: false }).limit(300);
  if (t?.subjects.length) q = q.in("subject", t.subjects);
  const { data } = await q;
  let list = ((data ?? []) as (TuitionRequest & { request_bids: { count: number }[] })[]).map(({ request_bids, ...r }) => ({ ...r, bids: request_bids?.[0]?.count ?? 0 }));
  if (!all) list = t ? list.filter((r) => matches(r, t, p)) : [];
  if (t?.email) list = list.filter((r) => r.student_email !== t.email!.toLowerCase());
  list = list.slice(0, 100);
  if (!t || !list.length) return list.map((r) => ({ ...r, mine: null, invited: false }));
  const ids = list.map((r) => r.id);
  const [{ data: mine }, { data: inv }] = await Promise.all([
    s.from("request_bids").select("*").eq("teacher_id", t.user_id).in("request_id", ids),
    s.from("request_invites").select("request_id").eq("teacher_id", t.user_id).in("request_id", ids),
  ]);
  const bids = new Map(((mine ?? []) as Bid[]).map((b) => [b.request_id, b]));
  const invited = new Set((inv ?? []).map((i) => i.request_id));
  return list.map((r) => ({ ...r, mine: bids.get(r.id) ?? null, invited: invited.has(r.id) })).sort((a, b) => Number(b.invited) - Number(a.invited));
}

export async function myBid(requestId: string, teacherId: string): Promise<Bid | null> {
  const { data } = await db().from("request_bids").select("*").eq("request_id", requestId).eq("teacher_id", teacherId).maybeSingle();
  return (data as Bid) ?? null;
}

export async function myBids(teacherId: string): Promise<(Bid & { request: TuitionRequest | null })[]> {
  const { data } = await db().from("request_bids").select("*, tuition_requests(*)").eq("teacher_id", teacherId).order("created_at", { ascending: false }).limit(50);
  return ((data ?? []) as (Bid & { tuition_requests: TuitionRequest | null })[]).map(({ tuition_requests, ...b }) => ({ ...b, request: tuition_requests }));
}

/** May this tutor see the request and bid on it? Their filter takes it, or the student invited them. */
export async function tutorMaySee(r: TuitionRequest, t: TeacherProfile): Promise<boolean> {
  if (t.email?.toLowerCase() === r.student_email) return false;
  if (matches(r, t, await getPrefs(t.user_id))) return true;
  if (!t.subjects.includes(r.subject)) {
    const { data } = await db().from("request_invites").select("teacher_id").eq("request_id", r.id).eq("teacher_id", t.user_id).maybeSingle();
    return Boolean(data);
  }
  return true; // teaches the subject: may bid from the "all requests" list
}

/** Place or change a bid. */
export async function placeBid(r: TuitionRequest, t: TeacherProfile, price: number, message: string): Promise<Bid | null> {
  if (!isLive(r) || !t.email || !(price >= 500 && price <= 100000)) return null;
  const prev = await myBid(r.id, t.user_id);
  const row = { request_id: r.id, teacher_id: t.user_id, teacher_email: t.email.toLowerCase(), teacher_name: t.name, price: Math.round(price), message: maskContacts(message.trim().slice(0, 500)).text || null, status: "PENDING" as const };
  const { data, error } = await db().from("request_bids").upsert(row, { onConflict: "request_id,teacher_id" }).select("*").single();
  if (error) return null;
  if (!prev || prev.status === "WITHDRAWN") await notify({ email: r.student_email, kind: "BID", title: `${t.name} আপনাকে পড়াতে চান`, body: `মাসে ৳${row.price}${row.message ? `: ${row.message.slice(0, 100)}` : ""}`, path: `/requests/${r.id}`, mail: true });
  return data as Bid;
}

export async function withdrawBid(r: TuitionRequest, teacherId: string): Promise<boolean> {
  const { data } = await db().from("request_bids").update({ status: "WITHDRAWN" }).eq("request_id", r.id).eq("teacher_id", teacherId).eq("status", "PENDING").select("id");
  return Boolean(data?.length);
}

/** The student picks a tutor: request matched, the others are told politely. */
export async function acceptBid(r: TuitionRequest, bidId: string): Promise<Bid | null> {
  if (!isLive(r)) return null;
  const s = db();
  const { data: b } = await s.from("request_bids").select("*").eq("id", bidId).eq("request_id", r.id).eq("status", "PENDING").maybeSingle();
  if (!b) return null;
  const { data: done } = await s.from("tuition_requests").update({ status: "MATCHED", chosen_bid: bidId }).eq("id", r.id).eq("status", "OPEN").select("id");
  if (!done?.length) return null;
  await s.from("request_bids").update({ status: "ACCEPTED", decided_at: new Date().toISOString() }).eq("id", bidId);
  const { data: others } = await s.from("request_bids").update({ status: "DECLINED" }).eq("request_id", r.id).eq("status", "PENDING").select("teacher_email");
  await notify({ email: b.teacher_email, kind: "BID", title: "অভিনন্দন! ছাত্র আপনাকে বেছে নিয়েছে", body: `${r.subject}, মাসে ৳${b.price}। মেসেজে কথা বলে শুরু করুন।`, path: `/teach/requests/${r.id}`, mail: true });
  await Promise.all((others ?? []).map((o) => notify({ email: o.teacher_email, kind: "BID", title: "এই টিউশনটা অন্য কেউ পেয়েছেন", body: `${r.subject}। নতুন রিকোয়েস্ট এলে জানাব।`, path: "/teach/requests" })));
  return { ...(b as Bid), status: "ACCEPTED" };
}

export async function setStatus(r: TuitionRequest, status: "OPEN" | "CLOSED"): Promise<boolean> {
  const patch = status === "OPEN"
    ? { status, chosen_bid: null, expires_at: new Date(Date.now() + 14 * 86400_000).toISOString() }
    : { status };
  const { error } = await db().from("tuition_requests").update(patch).eq("id", r.id);
  if (!error && status === "OPEN") await db().from("request_bids").update({ status: "PENDING" }).eq("request_id", r.id).in("status", ["ACCEPTED", "DECLINED"]);
  return !error;
}

/** Chat is allowed between a student and a tutor who bid on, were invited to, or match the student's live request. */
export async function requestLinked(student: string, tutorEmail: string): Promise<boolean> {
  const s = db();
  const { data: reqs } = await s.from("tuition_requests").select("*").eq("student_email", student).in("status", ["OPEN", "MATCHED"]).order("created_at", { ascending: false }).limit(10);
  if (!reqs?.length) return false;
  const { data: t } = await s.from("teacher_profiles").select("*").eq("email", tutorEmail).limit(1).maybeSingle();
  if (!t) return false;
  const ids = reqs.map((r) => r.id);
  const [{ data: b }, { data: i }] = await Promise.all([
    s.from("request_bids").select("id").eq("teacher_id", t.user_id).in("request_id", ids).limit(1),
    s.from("request_invites").select("teacher_id").eq("teacher_id", t.user_id).in("request_id", ids).limit(1),
  ]);
  if (b?.length || i?.length) return true;
  const p = await getPrefs(t.user_id);
  return (reqs as TuitionRequest[]).some((r) => isLive(r) && matches(r, t as TeacherProfile, p));
}
