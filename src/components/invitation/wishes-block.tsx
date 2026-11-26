"use client";
import { useState, useTransition } from "react";
import { submitWishAction } from "@/features/rsvp/actions";
import type { Dictionary } from "@/i18n/dictionaries";

export function WishesBlock({ token, d, wishes }: { token: string | null; d: Dictionary["invite"]; wishes: { id: string; name: string; message: string }[] }) {
  const [msg, setMsg] = useState("");
  const [sent, setSent] = useState(false);
  const [err, setErr] = useState("");
  const [pending, start] = useTransition();
  return (
    <div className="space-y-6">
      {wishes.length ? (
        <ul className="grid gap-3 sm:grid-cols-2">
          {wishes.map((w) => (
            <li key={w.id} className="rounded-2xl p-4" style={{ background: "color-mix(in oklab, var(--inv-surface) 85%, transparent)", border: "1px solid color-mix(in oklab, var(--inv-primary) 20%, transparent)" }}>
              <p className="whitespace-pre-line text-sm leading-7">“{w.message}”</p>
              <p className="mt-2 text-xs" style={{ color: "var(--inv-primary)" }}>— {w.name}</p>
            </li>
          ))}
        </ul>
      ) : null}
      {token ? (
        sent ? <p className="text-center text-sm" style={{ color: "var(--inv-muted)" }} aria-live="polite">{d.wishPending}</p> : (
          <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); setErr(""); start(async () => { const r = await submitWishAction(token, msg); if (r.ok) setSent(true); else setErr(r.error ?? "error"); }); }}>
            <textarea value={msg} onChange={(e) => setMsg(e.target.value)} maxLength={600} rows={3} placeholder={d.wishPlaceholder} aria-label={d.wishPlaceholder}
              className="w-full rounded-2xl bg-transparent px-4 py-3" style={{ border: "1px solid color-mix(in oklab, var(--inv-primary) 35%, transparent)" }} />
            {err ? <p className="text-xs text-red-500">{err}</p> : null}
            <button disabled={pending || msg.trim().length < 2} className="h-11 w-full rounded-full text-sm disabled:opacity-40" style={{ background: "var(--inv-primary)", color: "var(--inv-on-primary)" }}>{d.wishSend}</button>
          </form>
        )
      ) : null}
    </div>
  );
}
