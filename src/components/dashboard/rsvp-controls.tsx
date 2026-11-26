"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { moderateWishAction, ownerSetRsvpAction } from "@/features/rsvp/actions";
import { Badge } from "@/components/ui";

export function RsvpOverride({ eventId, guestId, allowed, current, locale }: { eventId: string; guestId: string; allowed: number; current: string; locale: "km" | "en" }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState(current);
  const [count, setCount] = useState(1);
  const [pending, start] = useTransition();
  const km = locale === "km";
  if (!open) return <button className="text-xs text-gold-2 underline-offset-4 hover:underline" onClick={() => setOpen(true)}>{km ? "កែ" : "Override"}</button>;
  return (
    <div className="flex w-full items-center gap-2 rounded-xl bg-paper p-2 sm:w-auto">
      <select value={status} onChange={(e) => setStatus(e.target.value)} className="h-8 rounded-lg border border-line-2 bg-white px-2 text-xs">
        {["attending", "declined", "maybe", "pending"].map((s) => <option key={s} value={s}>{s}</option>)}
      </select>
      {status === "attending" || status === "maybe" ? <input type="number" min={1} max={allowed} value={count} onChange={(e) => setCount(Number(e.target.value))} className="h-8 w-14 rounded-lg border border-line-2 px-2 text-xs" aria-label="count" /> : null}
      <button disabled={pending} className="h-8 rounded-lg bg-ink px-3 text-xs text-white" onClick={() => start(async () => { await ownerSetRsvpAction(eventId, guestId, status as "attending", count); setOpen(false); router.refresh(); })}>{km ? "រក្សាទុក" : "Save"}</button>
    </div>
  );
}

export function WishModeration({ eventId, wishId, status, locale }: { eventId: string; wishId: string; status: string; locale: "km" | "en" }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const km = locale === "km";
  const set = (s: "approved" | "hidden") => start(async () => { await moderateWishAction(eventId, wishId, s); router.refresh(); });
  return (
    <div className="flex items-center gap-2">
      <Badge tone={status === "approved" ? "success" : status === "hidden" ? "neutral" : "warning"}>{status === "approved" ? (km ? "បានអនុម័ត" : "Approved") : status === "hidden" ? (km ? "លាក់" : "Hidden") : (km ? "រង់ចាំ" : "Pending")}</Badge>
      {status !== "approved" ? <button disabled={pending} onClick={() => set("approved")} className="rounded-full bg-success px-3 py-1 text-xs text-white">{km ? "អនុម័ត" : "Approve"}</button> : null}
      {status !== "hidden" ? <button disabled={pending} onClick={() => set("hidden")} className="rounded-full border border-line-2 px-3 py-1 text-xs">{km ? "លាក់" : "Hide"}</button> : null}
    </div>
  );
}
