"use client";
import { useActionState } from "react";
import { sendCode, verifyCode, type LoginState } from "@/lib/auth/actions";
import type { OtpChannel } from "@/lib/auth/config";
import { copy } from "@/lib/copy";
import { useLang } from "@/lib/lang-client";

export default function LoginForm({ channel, next, demoNote }: { channel: OtpChannel; next: string; demoNote?: string }) {
  const c = copy(useLang()).login;
  const start: LoginState = { step: "id", next };
  const [sent, send, sending] = useActionState(sendCode, start);
  const [checked, verify, verifying] = useActionState(verifyCode, start);

  // A new send resets the verify step; verify keeps its own error state.
  const atCode = sent.step === "code" && sent.id;
  const error = atCode ? (checked.id === sent.id ? checked.error : undefined) : sent.error;

  if (!atCode) {
    return (
      <form action={send} className="space-y-4">
        <input type="hidden" name="next" value={next} />
        <label className="field">
          <span>{channel === "phone" ? c.phoneLabel : c.emailLabel}</span>
          <input
            name="id"
            type={channel === "phone" ? "tel" : "email"}
            inputMode={channel === "phone" ? "tel" : "email"}
            autoComplete={channel === "phone" ? "tel" : "email"}
            placeholder={channel === "phone" ? c.phonePh : c.emailPh}
            defaultValue={sent.id}
            required
            autoFocus
            className="w-full bg-transparent text-lg font-semibold outline-none"
          />
        </label>
        {error && <p role="alert" className="rounded-lg bg-redpen-tint text-redpen px-3 py-2 text-sm font-medium">{c.errors[error]}</p>}
        <button disabled={sending} className="btn-gold w-full text-base disabled:opacity-60">{sending ? c.sending : c.send}</button>
        {demoNote && <p className="rounded-lg border border-dashed border-ink-3/50 px-3 py-2 text-sm text-ink-2">{demoNote}</p>}
      </form>
    );
  }

  return (
    <form action={verify} className="space-y-4" key={sent.id}>
      <input type="hidden" name="id" value={sent.id} />
      <input type="hidden" name="next" value={next} />
      <div>
        <h2 className="font-display text-3xl">{c.sentH}</h2>
        <p className="mt-1 text-ink-2">{channel === "phone" ? c.sentSubPhone(sent.id!) : c.sentSub(sent.id!)}</p>
      </div>
      <label className="field">
        <span>{c.codeLabel}</span>
        <input
          name="code"
          inputMode="numeric"
          autoComplete="one-time-code"
          pattern="[0-9 ]{6,12}"
          maxLength={12}
          placeholder="••••••"
          required
          autoFocus
          className="w-full bg-transparent text-3xl font-bold tracking-[0.4em] outline-none"
        />
      </label>
      {error && <p role="alert" className="rounded-lg bg-redpen-tint text-redpen px-3 py-2 text-sm font-medium">{c.errors[error]}</p>}
      <button disabled={verifying} className="btn-gold w-full text-base disabled:opacity-60">{verifying ? c.verifying : c.verify}</button>
      {demoNote && <p className="rounded-lg border border-dashed border-ink-3/50 px-3 py-2 text-sm text-ink-2">{demoNote}</p>}
      <button type="button" onClick={() => location.reload()} className="text-sm font-semibold underline underline-offset-4">{c.change}</button>
    </form>
  );
}
