"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Lock, LockOpen } from "lucide-react";
import { deleteEventAction, setGiftQrLockAction, unpublishAction, updateEventSettingsAction } from "@/features/events/actions";
import { Button, Field, Input } from "@/components/ui";

type S = { title: string; timezone: string; date: string; startTime: string; endTime: string; venueName: string; venueAddress: string; mapUrl: string; rsvpDeadline: string; allowMaybe: boolean; wishesEnabled: boolean; isPublic: boolean };

export function EventSettingsForm({ eventId, locale, initial, canDelete, canQr, canPublish, published, giftLocked, publicUrl }: { eventId: string; locale: "km" | "en"; initial: S; canDelete: boolean; canQr: boolean; canPublish: boolean; published: boolean; giftLocked: boolean; publicUrl: string | null }) {
  const L = (km: string, en: string) => (locale === "km" ? km : en);
  const router = useRouter();
  const [v, setV] = useState(initial);
  const [msg, setMsg] = useState("");
  const [pending, start] = useTransition();
  const [confirm, setConfirm] = useState("");
  const up = (p: Partial<S>) => setV((x) => ({ ...x, ...p }));
  const card = "rounded-3xl border border-line bg-white p-6";
  return (
    <div className="max-w-3xl space-y-6">
      <form className={card} onSubmit={(e) => { e.preventDefault(); start(async () => { const r = await updateEventSettingsAction(eventId, v); setMsg(r.ok ? L("បានរក្សាទុក ✓ — ធៀបដែលបានផ្សព្វផ្សាយ ប្រើកាលបរិច្ឆេទ និងទីតាំងថ្មីភ្លាមៗ", "Saved ✓ — published invitations use the new date & venue immediately") : r.error); router.refresh(); }); }}>
        <h2 className="mb-5 font-semibold">{L("ព័ត៌មានកម្មវិធី", "Event details")}</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={L("ចំណងជើង", "Title")} className="sm:col-span-2" htmlFor="s-t"><Input id="s-t" required maxLength={160} value={v.title} onChange={(e) => up({ title: e.target.value })} /></Field>
          <Field label={L("កាលបរិច្ឆេទ", "Date")} htmlFor="s-d"><Input id="s-d" type="date" required value={v.date} onChange={(e) => up({ date: e.target.value })} /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label={L("ចាប់ផ្ដើម", "Start")} htmlFor="s-s"><Input id="s-s" type="time" required value={v.startTime} onChange={(e) => up({ startTime: e.target.value })} /></Field>
            <Field label={L("បញ្ចប់", "End")} htmlFor="s-e"><Input id="s-e" type="time" value={v.endTime} onChange={(e) => up({ endTime: e.target.value })} /></Field>
          </div>
          <Field label={L("ទីកន្លែង", "Venue")} htmlFor="s-v"><Input id="s-v" maxLength={200} value={v.venueName} onChange={(e) => up({ venueName: e.target.value })} /></Field>
          <Field label={L("អាសយដ្ឋាន", "Address")} htmlFor="s-a"><Input id="s-a" maxLength={400} value={v.venueAddress} onChange={(e) => up({ venueAddress: e.target.value })} /></Field>
          <Field label={L("តំណ Google Maps", "Google Maps link")} className="sm:col-span-2" htmlFor="s-m"><Input id="s-m" type="url" value={v.mapUrl} onChange={(e) => up({ mapUrl: e.target.value })} /></Field>
          <Field label={L("ថ្ងៃផុតកំណត់ RSVP", "RSVP deadline")} htmlFor="s-r"><Input id="s-r" type="date" value={v.rsvpDeadline} onChange={(e) => up({ rsvpDeadline: e.target.value })} /></Field>
          <Field label={L("ល្វែងម៉ោង", "Timezone")} htmlFor="s-z"><Input id="s-z" value={v.timezone} onChange={(e) => up({ timezone: e.target.value })} /></Field>
        </div>
        <div className="mt-5 space-y-3 border-t border-line pt-5 text-sm">
          {([["allowMaybe", L("អនុញ្ញាតជម្រើស «មិនទាន់ប្រាកដ»", "Allow “Maybe” replies")], ["wishesEnabled", L("បើកពាក្យជូនពរ (ត្រូវការការអនុម័ត)", "Enable wishes (moderated)")], ["isPublic", L("បើកតំណសាធារណៈ (មើលបាន មិនអាច RSVP)", "Enable a public link (view-only, no RSVP)")]] as const).map(([k, label]) => (
            <label key={k} className="flex items-center justify-between gap-4">{label}<input type="checkbox" checked={v[k]} onChange={(e) => up({ [k]: e.target.checked })} className="h-4 w-4 accent-[#B68A45]" /></label>
          ))}
          {publicUrl ? <p className="break-all rounded-xl bg-paper px-3 py-2 font-mono text-xs">{publicUrl}</p> : null}
        </div>
        <div className="mt-6 flex items-center justify-end gap-3">
          {msg ? <span className="text-sm text-success" role="status">{msg}</span> : null}
          <Button disabled={pending}>{pending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}{L("រក្សាទុក", "Save")}</Button>
        </div>
      </form>

      {canQr ? (
        <div className={card}>
          <h2 className="font-semibold">{L("សុវត្ថិភាព QR ចំណងដៃ", "Gift QR security")}</h2>
          <p className="mt-1 text-sm text-muted">{L("ពេលចាក់សោ គ្មាននរណាម្នាក់ (រួមទាំងសមាជិកក្រុម) អាចប្ដូរ KHQR/គណនីបានទេ។ ការប្ដូរនីមួយៗត្រូវបានកត់ត្រា ហើយម្ចាស់ទទួលការជូនដំណឹង។", "When locked, nobody (including team members) can change the KHQR/accounts. Every change is audited and the owner is notified.")}</p>
          <Button className="mt-4" variant={giftLocked ? "outline" : "primary"} disabled={pending} onClick={() => {
            if (giftLocked && !window.confirm(L("ដោះសោ QR ចំណងដៃ?", "Unlock the gift QR?"))) return;
            start(async () => { await setGiftQrLockAction(eventId, !giftLocked); router.refresh(); });
          }}>{giftLocked ? <LockOpen className="h-4 w-4" /> : <Lock className="h-4 w-4" />}{giftLocked ? L("ដោះសោ", "Unlock") : L("ចាក់សោ QR", "Lock QR")}</Button>
        </div>
      ) : null}

      {canPublish && published ? (
        <div className={card}>
          <h2 className="font-semibold">{L("ឈប់ផ្សព្វផ្សាយ", "Unpublish")}</h2>
          <p className="mt-1 text-sm text-muted">{L("តំណភ្ញៀវទាំងអស់នឹងបង្ហាញថា «មិនអាចប្រើបាន» រហូតដល់អ្នកផ្សព្វផ្សាយម្ដងទៀត។", "All guest links will show “not available” until you publish again.")}</p>
          <Button className="mt-4" variant="outline" disabled={pending} onClick={() => { if (window.confirm(L("ឈប់ផ្សព្វផ្សាយ?", "Unpublish?"))) start(async () => { await unpublishAction(eventId); router.refresh(); }); }}>{L("ឈប់ផ្សព្វផ្សាយ", "Unpublish")}</Button>
        </div>
      ) : null}

      {canDelete ? (
        <div className="rounded-3xl border border-danger/30 bg-white p-6">
          <h2 className="font-semibold text-danger">{L("លុបកម្មវិធី", "Delete event")}</h2>
          <p className="mt-1 text-sm text-muted">{L("វាយចំណងជើងកម្មវិធី ដើម្បីបញ្ជាក់។", "Type the event title to confirm.")}</p>
          <div className="mt-4 flex gap-2">
            <Input value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder={initial.title} />
            <Button variant="danger" disabled={confirm.trim() !== initial.title.trim() || pending} onClick={() => start(async () => { await deleteEventAction(eventId, confirm); })}>{L("លុប", "Delete")}</Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
