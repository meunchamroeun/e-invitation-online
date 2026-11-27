"use client";
import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { EventSettingsSchema, type EventSettingsInput } from "@/features/events/settings-schema";
import { Bell, Loader2, Lock, LockOpen, Send } from "lucide-react";
import { deleteEventAction, setGiftQrLockAction, unpublishAction, updateEventSettingsAction } from "@/features/events/actions";
import { telegramLinkCodeAction, telegramStatusAction, testNotificationAction, updateNotificationPrefsAction } from "@/features/account/actions";
import { Badge, Button, Field, Input, Textarea } from "@/components/ui";

export type NotificationInitial = {
  serverBotConfigured: boolean;
  telegramChatId: string;
  telegramBotToken: string;
  onRsvp: boolean;
  onDecline: boolean;
  onWish: boolean;
};

export function EventSettingsForm({ eventId, locale, initial, notifications, canDelete, canQr, canPublish, published, giftLocked, publicUrl }: { eventId: string; locale: "km" | "en"; initial: EventSettingsInput; notifications: NotificationInitial; canDelete: boolean; canQr: boolean; canPublish: boolean; published: boolean; giftLocked: boolean; publicUrl: string | null }) {
  const L = (km: string, en: string) => (locale === "km" ? km : en);
  const router = useRouter();
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<EventSettingsInput>({
    resolver: zodResolver(EventSettingsSchema), defaultValues: initial,
  });
  const [message, setMessage] = useState<{ text: string; error: boolean } | null>(null);
  const [notif, setNotif] = useState(notifications);
  const [notifMsg, setNotifMsg] = useState<{ text: string; error: boolean } | null>(null);
  const [tgCode, setTgCode] = useState<{ code: string; bot: string | null } | null>(null);
  const [pending, start] = useTransition();
  const [confirm, setConfirm] = useState("");
  const failure = L("សូមពិនិត្យព័ត៌មានកម្មវិធី ហើយព្យាយាមម្ដងទៀត។", "Check the event details and try again.");
  const submit = handleSubmit(async (values) => {
    setMessage(null);
    try {
      const result = await updateEventSettingsAction(eventId, values);
      if (!result.ok) { setMessage({ text: failure, error: true }); return; }
      setMessage({ text: L("បានរក្សាទុក ✓", "Saved ✓"), error: false });
      router.refresh();
    } catch {
      setMessage({ text: failure, error: true });
    }
  }, () => setMessage({ text: failure, error: true }));
  const card = "rounded-3xl border border-line bg-white p-6";
  return (
    <div className="max-w-3xl space-y-6">
      <form className={card} onSubmit={submit} aria-busy={isSubmitting}>
        <h2 className="mb-5 font-semibold">{L("ព័ត៌មានកម្មវិធី", "Event details")}</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={L("ចំណងជើង", "Title")} className="sm:col-span-2" htmlFor="s-t"><Input id="s-t" required maxLength={160} {...register("title")} aria-invalid={!!errors.title} /></Field>
          <Field label={L("កាលបរិច្ឆេទ", "Date")} htmlFor="s-d"><Input id="s-d" type="date" required {...register("date")} aria-invalid={!!errors.date} /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label={L("ចាប់ផ្ដើម", "Start")} htmlFor="s-s"><Input id="s-s" type="time" required {...register("startTime")} aria-invalid={!!errors.startTime} /></Field>
            <Field label={L("បញ្ចប់", "End")} htmlFor="s-e"><Input id="s-e" type="time" {...register("endTime")} aria-invalid={!!errors.endTime} /></Field>
          </div>
          <Field label={L("ទីកន្លែង", "Venue")} htmlFor="s-v"><Input id="s-v" maxLength={200} {...register("venueName")} aria-invalid={!!errors.venueName} /></Field>
          <Field label={L("អាសយដ្ឋាន", "Address")} htmlFor="s-a"><Input id="s-a" maxLength={400} {...register("venueAddress")} aria-invalid={!!errors.venueAddress} /></Field>
          <Field label={L("តំណ Google Maps", "Google Maps link")} className="sm:col-span-2" htmlFor="s-m"><Input id="s-m" type="url" {...register("mapUrl")} aria-invalid={!!errors.mapUrl} /></Field>
          <Field label={L("ថ្ងៃផុតកំណត់ RSVP", "RSVP deadline")} htmlFor="s-r"><Input id="s-r" type="date" {...register("rsvpDeadline")} aria-invalid={!!errors.rsvpDeadline} /></Field>
          <Field label={L("ល្វែងម៉ោង", "Timezone")} htmlFor="s-z"><Input id="s-z" {...register("timezone")} aria-invalid={!!errors.timezone} /></Field>
          <Field label={L("កំណត់ចំណាំអ្នករៀបចំ", "Organizer notes")} htmlFor="organizer-notes" className="sm:col-span-2">
            <Textarea id="organizer-notes" maxLength={2000} {...register("organizerNotes")} aria-invalid={!!errors.organizerNotes} />
          </Field>
        </div>
        <div className="mt-5 space-y-3 border-t border-line pt-5 text-sm">
          {([["allowMaybe", L("អនុញ្ញាតជម្រើស «មិនទាន់ប្រាកដ»", "Allow “Maybe” replies")], ["wishesEnabled", L("បើកពាក្យជូនពរ (ត្រូវការការអនុម័ត)", "Enable wishes (moderated)")], ["isPublic", L("បើកតំណសាធារណៈ (មើលបាន មិនអាច RSVP)", "Enable a public link (view-only, no RSVP)")]] as const).map(([k, label]) => (
            <label key={k} className="flex items-center justify-between gap-4">{label}<input type="checkbox" {...register(k)} className="h-4 w-4 accent-[#B68A45]" /></label>
          ))}
          {publicUrl ? <p className="break-all rounded-xl bg-paper px-3 py-2 font-mono text-xs">{publicUrl}</p> : null}
        </div>
        <div className="mt-6 flex items-center justify-end gap-3">
          {message ? <span className={message.error ? "text-sm text-danger" : "text-sm text-success"} role={message.error ? "alert" : "status"}>{message.text}</span> : null}
          <Button type="submit" disabled={pending || isSubmitting}>{isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}{L("រក្សាទុក", "Save")}</Button>
        </div>
      </form>

      <div className={card}>
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Bell className="h-4 w-4 text-gold-2" />
            <h2 className="font-semibold">{L("ការកំណត់ការជូនដំណឹង (Web App & Telegram)", "Notification settings (Web App & Telegram)")}</h2>
          </div>
          {notif.telegramChatId ? <Badge tone="success">{L("Telegram បានភ្ជាប់", "Telegram connected")}</Badge> : <Badge>{L("Web App ប៉ុណ្ណោះ", "Web App only")}</Badge>}
        </div>
        <p className="mt-1 text-sm text-muted">
          {L("ទទួលការជូនដំណឹងក្នុងកម្មវិធី និងតាម Telegram bot នៅពេលភ្ញៀវឆ្លើយតប ឬសរសេរសារជូនពរ។", "Receive in-app and Telegram bot notifications when guests RSVP or send wishes.")}
        </p>
        <div className="mt-4 space-y-2.5 text-sm">
          {([["onRsvp", L("ភ្ញៀវឆ្លើយតបចូលរួម (RSVP)", "Guest RSVPs")], ["onDecline", L("ភ្ញៀវមិនអាចចូលរួម", "Guest declines")], ["onWish", L("សារជូនពរថ្មីពីភ្ញៀវ", "New guest wishes")]] as const).map(([k, label]) => (
            <label key={k} className="flex items-center justify-between gap-4">
              {label}
              <input type="checkbox" checked={notif[k]} onChange={(e) => setNotif({ ...notif, [k]: e.target.checked })} className="h-4 w-4 accent-[#B68A45]" />
            </label>
          ))}
        </div>
        <div className="mt-5 grid gap-4 border-t border-line pt-5 sm:grid-cols-2">
          <Field label={L("Telegram Chat ID", "Telegram Chat ID")} htmlFor="n-chat">
            <Input id="n-chat" value={notif.telegramChatId} onChange={(e) => setNotif({ ...notif, telegramChatId: e.target.value })} placeholder="123456789" maxLength={64} />
          </Field>
          <Field label={L("Telegram Bot Token (ស្រេចចិត្ត)", "Telegram Bot Token (optional)")} htmlFor="n-bot">
            <Input id="n-bot" type="password" value={notif.telegramBotToken} onChange={(e) => setNotif({ ...notif, telegramBotToken: e.target.value })} placeholder={notif.serverBotConfigured ? L("ប្រើ token របស់ប្រព័ន្ធស្រាប់", "Using server env token") : "123456:ABC-DEF..."} maxLength={160} />
          </Field>
        </div>
        {notif.serverBotConfigured ? (
          <TelegramAutoConnect
            tgCode={tgCode}
            pending={pending}
            locale={locale}
            onStart={() => start(async () => {
              const res = await telegramLinkCodeAction();
              setTgCode(res);
              if (res.bot) window.open(`https://t.me/${res.bot}?start=${res.code}`, "_blank", "noopener,noreferrer");
            })}
            onConnected={(chatId) => {
              setTgCode(null);
              setNotif((n) => ({ ...n, telegramChatId: chatId }));
              setNotifMsg({ text: L("បានភ្ជាប់ Telegram ដោយស្វ័យប្រវត្តិ ✓", "Telegram connected automatically ✓"), error: false });
              router.refresh();
            }}
          />
        ) : null}
        <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
          <Button type="button" variant="outline" disabled={pending} onClick={() => {
            setNotifMsg(null);
            start(async () => {
              await updateNotificationPrefsAction(notif);
              const r = await testNotificationAction(eventId);
              setNotifMsg({
                text: r.telegram === "sent"
                  ? L("បានផ្ញើសារសាកល្បងទៅ Web App និង Telegram ✓", "Sent test to Web App & Telegram ✓")
                  : L(`បានផ្ញើទៅ Web App ✓ (Telegram: ${r.error ?? r.telegram})`, `Sent to Web App ✓ (Telegram: ${r.error ?? r.telegram})`),
                error: false,
              });
              router.refresh();
            });
          }}>{L("សាកល្បងការជូនដំណឹង", "Send test notification")}</Button>
          <div className="flex items-center gap-3">
            {notifMsg ? <span className={notifMsg.error ? "text-sm text-danger" : "text-sm text-success"}>{notifMsg.text}</span> : null}
            <Button type="button" disabled={pending} onClick={() => {
              setNotifMsg(null);
              start(async () => {
                await updateNotificationPrefsAction(notif);
                setNotifMsg({ text: L("បានរក្សាទុក ✓", "Saved ✓"), error: false });
                router.refresh();
              });
            }}>{L("រក្សាទុកការជូនដំណឹង", "Save notifications")}</Button>
          </div>
        </div>
      </div>

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

function TelegramAutoConnect({
  tgCode, pending, locale, onStart, onConnected,
}: {
  tgCode: { code: string; bot: string | null } | null;
  pending: boolean;
  locale: "km" | "en";
  onStart: () => void;
  onConnected: (chatId: string) => void;
}) {
  const L = (km: string, en: string) => (locale === "km" ? km : en);
  useEffect(() => {
    if (!tgCode) return;
    let cancelled = false;
    const id = window.setInterval(async () => {
      const st = await telegramStatusAction().catch(() => null);
      if (!cancelled && st?.connected && st.chatId) {
        window.clearInterval(id);
        onConnected(st.chatId);
      }
    }, 2500);
    const stopTimer = window.setTimeout(() => window.clearInterval(id), 120000);
    return () => {
      cancelled = true;
      window.clearInterval(id);
      window.clearTimeout(stopTimer);
    };
  }, [tgCode, onConnected]);

  return (
    <div className="mt-3 flex flex-wrap items-center gap-3 text-xs">
      <Button type="button" variant="outline" size="sm" disabled={pending} onClick={onStart}>
        <Send className="h-3.5 w-3.5" />{L("ភ្ជាប់តាម Telegram Bot", "Link via Telegram Bot")}
      </Button>
      {tgCode ? (
        <span className="inline-flex flex-wrap items-center gap-2 rounded-lg bg-paper px-3 py-1.5">
          <Loader2 className="h-3.5 w-3.5 animate-spin text-gold-2" />
          <span>{L("កំពុងរង់ចាំចុច Start ក្នុង", "Waiting for Start in")}</span>
          {tgCode.bot ? (
            <a className="font-medium text-gold-2 underline" href={`https://t.me/${tgCode.bot}?start=${tgCode.code}`} target="_blank" rel="noopener noreferrer">
              @{tgCode.bot}
            </a>
          ) : (
            <code className="font-mono">/start {tgCode.code}</code>
          )}
        </span>
      ) : null}
    </div>
  );
}
