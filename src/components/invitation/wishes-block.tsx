"use client";
import { useState, useTransition } from "react";
import { submitPublicWishAction, submitWishAction } from "@/features/rsvp/actions";
import type { Dictionary } from "@/i18n/dictionaries";

export function WishesBlock({ token, publicSlug, demo, d, wishes }: { token: string | null; publicSlug?: string | null; demo?: boolean; d: Dictionary["invite"]; wishes: { id: string; name: string; message: string }[] }) {
  const [items, setItems] = useState(wishes);
  const [name, setName] = useState("");
  const [msg, setMsg] = useState("");
  const [sent, setSent] = useState(false);
  const [err, setErr] = useState("");
  const [pending, start] = useTransition();
  const canSubmit = !!token || !!publicSlug || !!demo;
  const needsName = !token && (!!publicSlug || !!demo);
  const valid = msg.trim().length >= 2 && (!needsName || name.trim().length >= 2);
  return (
    <div className="space-y-6">
      {items.length ? (
        <ul className="grid gap-3 sm:grid-cols-2">
          {items.map((w) => (
            <li key={w.id} className="rounded-2xl p-4" style={{ background: "color-mix(in oklab, var(--inv-surface) 85%, transparent)", border: "1px solid color-mix(in oklab, var(--inv-primary) 20%, transparent)" }}>
              <p className="whitespace-pre-line text-sm leading-7">“{w.message}”</p>
              <p className="mt-2 text-xs" style={{ color: "var(--inv-primary)" }}>— {w.name}</p>
            </li>
          ))}
        </ul>
      ) : null}
      {canSubmit ? (
        sent ? <p className="text-center text-sm" style={{ color: "var(--inv-muted)" }} aria-live="polite">{d.wishPending}</p> : (
          <form className="space-y-3" onSubmit={(e) => {
            e.preventDefault();
            setErr("");
            if (demo) {
              setItems((prev) => [{ id: `demo-${Date.now()}`, name: name.trim(), message: msg.trim() }, ...prev]);
              setMsg("");
              setSent(true);
              return;
            }
            start(async () => {
              const r = token
                ? await submitWishAction(token, msg)
                : await submitPublicWishAction(publicSlug!, name, msg);
              if (r.ok) setSent(true);
              else setErr(r.error ?? "error");
            });
          }}>
            {needsName ? (
              <input value={name} onChange={(e) => setName(e.target.value)} maxLength={100} placeholder={d.wishNamePlaceholder} aria-label={d.wishNamePlaceholder}
                className="h-11 w-full rounded-2xl bg-transparent px-4" style={{ border: "1px solid color-mix(in oklab, var(--inv-primary) 35%, transparent)" }} />
            ) : null}
            <textarea value={msg} onChange={(e) => setMsg(e.target.value)} maxLength={600} rows={3} placeholder={d.wishPlaceholder} aria-label={d.wishPlaceholder}
              className="w-full rounded-2xl bg-transparent px-4 py-3" style={{ border: "1px solid color-mix(in oklab, var(--inv-primary) 35%, transparent)" }} />
            {err ? <p className="text-xs text-red-500">{err}</p> : null}
            <button disabled={pending || !valid} className="h-11 w-full rounded-full text-sm disabled:opacity-40" style={{ background: "var(--inv-primary)", color: "var(--inv-on-primary)" }}>{d.wishSend}</button>
          </form>
        )
      ) : null}
    </div>
  );
}
