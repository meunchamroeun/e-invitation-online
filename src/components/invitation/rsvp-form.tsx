"use client";

import { useState, useTransition } from "react";
import { Check, Loader2, Minus, Plus } from "lucide-react";
import { submitRsvpAction } from "@/features/rsvp/actions";
import type { Dictionary } from "@/i18n/dictionaries";
import { num } from "@/i18n/format";

export function RsvpForm({ token, d, locale, allowed, allowMaybe, initial, deadlinePassed }: {
  token: string; d: Dictionary["invite"]; locale: "km" | "en"; allowed: number; allowMaybe: boolean; deadlinePassed: boolean;
  initial: { status: string; count: number; updatedAt: string | null };
}) {
  const [status, setStatus] = useState(initial.status === "pending" ? "" : initial.status);
  const [count, setCount] = useState(Math.max(1, Math.min(allowed, initial.count || 1)));
  const [dietary, setDietary] = useState("");
  const [message, setMessage] = useState("");
  const [saved, setSaved] = useState<{ status: string; count: number; updatedAt: string } | null>(initial.status !== "pending" && initial.updatedAt ? { status: initial.status, count: initial.count, updatedAt: initial.updatedAt } : null);
  const [editing, setEditing] = useState(initial.status === "pending");
  const [error, setError] = useState("");
  const [pending, start] = useTransition();

  const opt = (value: string, label: string) => (
    <button type="button" onClick={() => setStatus(value)} aria-pressed={status === value}
      className="flex-1 rounded-full px-3 py-3 text-sm transition-all"
      style={status === value ? { background: "var(--inv-primary)", color: "var(--inv-on-primary)" } : { border: "1px solid color-mix(in oklab, var(--inv-primary) 45%, transparent)" }}>
      {label}
    </button>
  );

  if (deadlinePassed && !saved) return <p className="text-center text-sm" style={{ color: "var(--inv-muted)" }}>{d.deadlinePassed}</p>;

  if (saved && !editing) {
    return (
      <div className="text-center" aria-live="polite">
        <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full" style={{ background: "var(--inv-primary)", color: "var(--inv-on-primary)" }}><Check className="h-5 w-5" /></span>
        <p className="mt-4 text-lg">{saved.status === "declined" ? d.thanksDeclined : d.thanksAttending}</p>
        <p className="mt-1 text-sm" style={{ color: "var(--inv-muted)" }}>
          {saved.status === "attending" ? `${d.rsvpAttending} · ${num(saved.count, locale)}` : saved.status === "maybe" ? d.rsvpMaybe : d.rsvpDeclined}
        </p>
        <p className="mt-1 text-[11px]" style={{ color: "var(--inv-muted)" }}>{d.lastUpdated}: {new Date(saved.updatedAt).toLocaleString(locale === "km" ? "km-KH" : "en-GB", { timeZone: "Asia/Phnom_Penh" })}</p>
        {!deadlinePassed ? <button className="mt-4 text-sm underline underline-offset-4" style={{ color: "var(--inv-primary)" }} onClick={() => setEditing(true)}>{d.update}</button> : null}
      </div>
    );
  }

  return (
    <form
      className="space-y-5"
      onSubmit={(e) => {
        e.preventDefault();
        if (!status) return;
        setError("");
        start(async () => {
          const r = await submitRsvpAction({ token, status, count, dietary, message });
          if (r.ok) { setSaved(r); setEditing(false); }
          else setError(r.error === "deadline" ? d.deadlinePassed : r.error === "rate" ? "Too many attempts — please try again later." : "Something went wrong. Please try again.");
        });
      }}
    >
      <div className="flex gap-2" role="group">
        {opt("attending", d.rsvpAttending)}
        {opt("declined", d.rsvpDeclined)}
        {allowMaybe ? opt("maybe", d.rsvpMaybe) : null}
      </div>
      {status === "attending" || status === "maybe" ? (
        <div className="flex items-center justify-between rounded-2xl px-4 py-3" style={{ background: "color-mix(in oklab, var(--inv-primary) 8%, transparent)" }}>
          <span className="text-sm">{d.rsvpCount} <span style={{ color: "var(--inv-muted)" }}>({d.rsvpOf} {num(allowed, locale)})</span></span>
          <span className="flex items-center gap-3">
            <button type="button" aria-label="-" disabled={count <= 1} onClick={() => setCount(count - 1)} className="flex h-9 w-9 items-center justify-center rounded-full disabled:opacity-30" style={{ border: "1px solid var(--inv-primary)" }}><Minus className="h-4 w-4" /></button>
            <span className="num w-5 text-center text-lg">{num(count, locale)}</span>
            <button type="button" aria-label="+" disabled={count >= allowed} onClick={() => setCount(count + 1)} className="flex h-9 w-9 items-center justify-center rounded-full disabled:opacity-30" style={{ border: "1px solid var(--inv-primary)" }}><Plus className="h-4 w-4" /></button>
          </span>
        </div>
      ) : null}
      {status && status !== "declined" ? (
        <label className="block text-sm">
          <span style={{ color: "var(--inv-muted)" }}>{d.dietary}</span>
          <input value={dietary} onChange={(e) => setDietary(e.target.value)} maxLength={200} className="mt-1 h-11 w-full rounded-xl bg-transparent px-3" style={{ border: "1px solid color-mix(in oklab, var(--inv-primary) 35%, transparent)" }} />
        </label>
      ) : null}
      {status ? (
        <label className="block text-sm">
          <span style={{ color: "var(--inv-muted)" }}>{d.message}</span>
          <textarea value={message} onChange={(e) => setMessage(e.target.value)} maxLength={1000} rows={3} className="mt-1 w-full rounded-xl bg-transparent px-3 py-2" style={{ border: "1px solid color-mix(in oklab, var(--inv-primary) 35%, transparent)" }} />
        </label>
      ) : null}
      {error ? <p role="alert" className="text-center text-sm text-red-500">{error}</p> : null}
      <button type="submit" disabled={!status || pending} className="flex h-12 w-full items-center justify-center gap-2 rounded-full text-base disabled:opacity-40" style={{ background: "var(--inv-primary)", color: "var(--inv-on-primary)" }}>
        {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}{saved ? d.update : d.submit}
      </button>
    </form>
  );
}
