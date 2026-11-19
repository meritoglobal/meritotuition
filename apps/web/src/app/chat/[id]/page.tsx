import Link from "next/link";
import { notFound } from "next/navigation";
import { growthCopy } from "@/lib/copy-growth";
import { DATA_LIVE } from "@/lib/data";
import { getLang } from "@/lib/lang";
import { messages, thread } from "@/lib/growth/chat";
import { mustMe } from "@/lib/growth/page";
import ChatBox from "./ChatBox";

export const dynamic = "force-dynamic";

export default async function ChatThread({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const m = await mustMe(`/chat/${id}`);
  if (!DATA_LIVE) notFound();
  const t = await thread(id, m.email);
  if (!t) notFound();
  const c = growthCopy(await getLang()).chat;
  const first = await messages(t, m.email);
  return (
    <div className="mx-auto flex h-[calc(100dvh-7rem)] max-w-3xl flex-col px-4 py-4">
      <div className="flex items-center gap-3 border-b border-line pb-3">
        <Link href="/chat" className="text-sm text-ink-2">← {c.back}</Link>
        <h1 className="truncate text-lg font-bold">{t.otherName}</h1>
      </div>
      <ChatBox threadId={t.id} initial={first} />
    </div>
  );
}
