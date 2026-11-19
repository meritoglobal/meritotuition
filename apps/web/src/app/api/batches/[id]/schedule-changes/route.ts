import { fail, json } from "@/lib/api";
import { teacherBatch } from "@/lib/batches";
import { DATA_LIVE } from "@/lib/data";
import { batchChanges, propose } from "@/lib/biz/schedule";
import { me } from "@/lib/growth/people";

export const dynamic = "force-dynamic";

/**
 * Tutor side.
 * GET → { changes }
 * POST { kind: "ROUTINE", schedule: [{ day: 0-6 (Sun=0), time: "HH:MM", minutes }], note? }
 *   or { kind: "RESCHEDULE", fromAt: ISO, toAt: ISO, minutes?, note? } → { change } (applies only when every student approves)
 */
async function load(ctx: { params: Promise<{ id: string }> }) {
  const m = await me();
  if (!m) return { err: fail("login", 401) };
  if (!DATA_LIVE) return { err: fail("data-off", 503) };
  const b = await teacherBatch((await ctx.params).id, m.user.id);
  if (!b) return { err: fail("not-found", 404) };
  return { b };
}

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const r = await load(ctx);
  if (!r.b) return r.err;
  return json({ changes: await batchChanges(r.b.id) });
}

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const r = await load(ctx);
  if (!r.b) return r.err;
  const body = (await req.json().catch(() => ({}))) as { kind?: string; schedule?: unknown; fromAt?: string; toAt?: string; minutes?: number; note?: string };
  if (body.kind !== "ROUTINE" && body.kind !== "RESCHEDULE") return fail("bad-kind", 400);
  const out = await propose(r.b, { kind: body.kind, schedule: body.schedule, fromAt: body.fromAt, toAt: body.toAt, minutes: body.minutes, note: body.note });
  return "error" in out ? fail(out.error, 400) : json(out);
}
