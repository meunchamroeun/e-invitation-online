"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Download, Loader2, Send } from "lucide-react";
import { changePasswordAction, deleteAccountAction, telegramLinkCodeAction, updateNotificationPrefsAction, updateProfileAction } from "@/features/account/actions";
import { setLocaleAction } from "@/features/auth/actions";
import { Badge, Button, Field, Input, Select, buttonClass } from "@/components/ui";

export function ProfileForms({ locale, user, telegram }: { locale: "km" | "en"; user: { name: string; locale: "km" | "en" }; telegram: { configured: boolean; connected: boolean; onRsvp: boolean; onDecline: boolean; onWish: boolean } }) {
  const L = (km: string, en: string) => (locale === "km" ? km : en);
  const router = useRouter();
  const [p, setP] = useState(user);
  const [tg, setTg] = useState(telegram);
  const [code, setCode] = useState<{ code: string; bot: string | null } | null>(null);
  const [pw, setPw] = useState({ cur: "", next: "" });
  const [del, setDel] = useState("");
  const [msg, setMsg] = useState<Record<string, string>>({});
  const [pending, start] = useTransition();
  const card = "rounded-3xl border border-line bg-white p-6";
  return (
    <div className="max-w-2xl space-y-6">
      <form className={card} onSubmit={(e) => { e.preventDefault(); start(async () => { await updateProfileAction(p); await setLocaleAction(p.locale); setMsg({ profile: "✓" }); router.refresh(); }); }}>
        <h2 className="mb-4 font-semibold">{L("គណនី", "Account")}</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={L("ឈ្មោះ", "Name")} htmlFor="p-n"><Input id="p-n" value={p.name} maxLength={80} onChange={(e) => setP({ ...p, name: e.target.value })} /></Field>
          <Field label={L("ភាសា", "Language")} htmlFor="p-l"><Select id="p-l" value={p.locale} onChange={(e) => setP({ ...p, locale: e.target.value as "km" })}><option value="km">ខ្មែរ</option><option value="en">English</option></Select></Field>
        </div>
        <div className="mt-5 flex items-center justify-end gap-3"><span className="text-sm text-success">{msg.profile}</span><Button disabled={pending}>{L("រក្សាទុក", "Save")}</Button></div>
      </form>

      <div className={card}>
        <div className="flex items-center justify-between"><h2 className="font-semibold">Telegram</h2>{tg.connected ? <Badge tone="success">{L("បានភ្ជាប់", "Connected")}</Badge> : <Badge>{L("មិនទាន់ភ្ជាប់", "Not connected")}</Badge>}</div>
        {!tg.configured ? <p className="mt-2 rounded-xl bg-paper p-3 text-sm text-muted">{L("Telegram bot មិនទាន់កំណត់រចនាសម្ព័ន្ធលើម៉ាស៊ីនមេនេះទេ (TELEGRAM_BOT_TOKEN)។ ការជូនដំណឹងនៅតែបង្ហាញក្នុងកម្មវិធី។", "The Telegram bot isn't configured on this server (TELEGRAM_BOT_TOKEN). Notifications still appear in-app.")}</p> : null}
        {tg.configured && !tg.connected ? (
          <div className="mt-3 space-y-3 text-sm">
            <Button variant="outline" onClick={() => start(async () => setCode(await telegramLinkCodeAction()))}><Send className="h-4 w-4" />{L("ភ្ជាប់ Telegram", "Connect Telegram")}</Button>
            {code ? (
              <p className="rounded-xl bg-paper p-3">{L("ផ្ញើសារនេះទៅ bot", "Send this to the bot")}{code.bot ? <> <a className="font-medium text-gold-2 underline" href={`https://t.me/${code.bot}?start=${code.code}`} target="_blank" rel="noopener noreferrer">@{code.bot}</a></> : null}: <code className="rounded bg-white px-2 py-0.5">/start {code.code}</code></p>
            ) : null}
          </div>
        ) : null}
        <div className="mt-4 space-y-2 text-sm">
          {([["onRsvp", L("ភ្ញៀវឆ្លើយតបចូលរួម", "Guest RSVPs")], ["onDecline", L("ភ្ញៀវមិនអាចចូលរួម", "Guest declines")], ["onWish", L("ពាក្យជូនពររង់ចាំការអនុម័ត", "Wishes awaiting approval")]] as const).map(([k, label]) => (
            <label key={k} className="flex items-center justify-between">{label}<input type="checkbox" checked={tg[k]} onChange={(e) => { const n = { ...tg, [k]: e.target.checked }; setTg(n); start(async () => { await updateNotificationPrefsAction(n); }); }} className="h-4 w-4 accent-[#B68A45]" /></label>
          ))}
          {tg.connected ? <button className="text-xs text-danger underline" onClick={() => start(async () => { await updateNotificationPrefsAction({ ...tg, disconnect: true }); router.refresh(); })}>{L("ផ្ដាច់", "Disconnect")}</button> : null}
        </div>
      </div>

      <form className={card} onSubmit={(e) => { e.preventDefault(); start(async () => { const r = await changePasswordAction(pw.cur, pw.next); if (r && !r.ok) setMsg({ pw: r.error === "wrong" ? L("ពាក្យសម្ងាត់មិនត្រឹមត្រូវ", "Wrong password") : L("យ៉ាងតិច ៨ តួអក្សរ", "At least 8 characters") }); }); }}>
        <h2 className="mb-4 font-semibold">{L("ប្ដូរពាក្យសម្ងាត់", "Change password")}</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={L("ពាក្យសម្ងាត់បច្ចុប្បន្ន", "Current password")} htmlFor="pw-c"><Input id="pw-c" type="password" autoComplete="current-password" value={pw.cur} onChange={(e) => setPw({ ...pw, cur: e.target.value })} /></Field>
          <Field label={L("ពាក្យសម្ងាត់ថ្មី", "New password")} htmlFor="pw-n"><Input id="pw-n" type="password" autoComplete="new-password" minLength={8} value={pw.next} onChange={(e) => setPw({ ...pw, next: e.target.value })} /></Field>
        </div>
        <div className="mt-5 flex items-center justify-end gap-3"><span className="text-sm text-danger">{msg.pw}</span><Button variant="outline" disabled={pending}>{L("ប្ដូរ", "Change")}</Button></div>
      </form>

      <div className={card}>
        <h2 className="font-semibold">{L("ទិន្នន័យរបស់អ្នក", "Your data")}</h2>
        <p className="mt-1 text-sm text-muted">{L("ទាញយកទិន្នន័យទាំងអស់ (JSON)។", "Download everything we store for your account (JSON).")}</p>
        <a href="/api/account/export" className={`${buttonClass("outline", "md")} mt-4`}><Download className="h-4 w-4" />{L("នាំចេញទិន្នន័យ", "Export data")}</a>
      </div>

      <div className="rounded-3xl border border-danger/30 bg-white p-6">
        <h2 className="font-semibold text-danger">{L("លុបគណនី", "Delete account")}</h2>
        <p className="mt-1 text-sm text-muted">{L("លុបបញ្ជីភ្ញៀវ និងទិន្នន័យផ្ទាល់ខ្លួនភ្លាមៗ។ មិនអាចត្រឡប់វិញបានទេ។", "Guest lists and personal data are removed immediately. This cannot be undone.")}</p>
        <div className="mt-4 flex gap-2">
          <Input type="password" placeholder={L("បញ្ចូលពាក្យសម្ងាត់ដើម្បីបញ្ជាក់", "Enter password to confirm")} value={del} onChange={(e) => setDel(e.target.value)} autoComplete="current-password" />
          <Button variant="danger" disabled={!del || pending} onClick={() => { if (window.confirm(L("លុបគណនីជាអចិន្ត្រៃយ៍?", "Permanently delete your account?"))) start(async () => { const r = await deleteAccountAction(del); if (r && !r.ok) setMsg({ del: L("ពាក្យសម្ងាត់មិនត្រឹមត្រូវ", "Wrong password") }); }); }}>{pending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}{L("លុប", "Delete")}</Button>
        </div>
        {msg.del ? <p className="mt-2 text-sm text-danger">{msg.del}</p> : null}
      </div>
    </div>
  );
}
