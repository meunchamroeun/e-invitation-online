"use client";
import { useEffect, useState, useTransition } from "react";
import { Loader2, Sparkles } from "lucide-react";
import { aiStatusAction, suggestWordingAction } from "@/features/ai/actions";
import type { LText } from "@/features/invitations/doc";

export function AiAssist({ eventId, locale, onUse }: { eventId: string; locale: "km" | "en"; onUse: (v: LText) => void }) {
  const L = (km: string, en: string) => (locale === "km" ? km : en);
  const [enabled, setEnabled] = useState<boolean | null>(null);
  const [tone, setTone] = useState<"formal" | "warm" | "modern">("formal");
  const [extra, setExtra] = useState("");
  const [list, setList] = useState<LText[]>([]);
  const [err, setErr] = useState("");
  const [pending, start] = useTransition();
  useEffect(() => { aiStatusAction().then((s) => setEnabled(s.enabled)); }, []);
  if (enabled === null) return null;
  if (!enabled) return <p className="rounded-xl border border-dashed border-line-2 p-3 text-xs leading-5 text-muted"><Sparkles className="mr-1 inline h-3.5 w-3.5" />{L("ជំនួយការ AI មិនទាន់បើក (GEMINI_API_KEY)។ អ្នកអាចសរសេរដោយផ្ទាល់ខាងលើ។", "AI assistant isn't configured on this server (GEMINI_API_KEY). You can write the text manually above.")}</p>;
  return (
    <div className="space-y-2 rounded-xl border border-gold/30 bg-gold-soft/40 p-3">
      <p className="flex items-center gap-1.5 text-xs font-semibold text-gold-2"><Sparkles className="h-3.5 w-3.5" />{L("ស្នើពាក្យអញ្ជើញដោយ AI", "Suggest wording with AI")}</p>
      <div className="flex gap-1">{(["formal", "warm", "modern"] as const).map((t) => <button key={t} type="button" onClick={() => setTone(t)} className={`rounded-full px-2.5 py-1 text-[11px] ${tone === t ? "bg-ink text-white" : "bg-white"}`}>{t}</button>)}</div>
      <input value={extra} onChange={(e) => setExtra(e.target.value)} maxLength={300} placeholder={L("ព័ត៌មានបន្ថែម (ស្រេចចិត្ត)", "Anything to include (optional)")} className="h-8 w-full rounded-lg border border-line-2 px-2 text-xs" />
      <button type="button" disabled={pending} onClick={() => start(async () => { setErr(""); const r = await suggestWordingAction(eventId, { tone, extra }); if (r.ok) setList(r.suggestions); else setErr(r.error); })} className="inline-flex h-8 items-center gap-1.5 rounded-full bg-ink px-3 text-xs text-white">
        {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}{L("បង្កើតសំណើ", "Generate")}
      </button>
      {err ? <p className="text-xs text-danger">{err}</p> : null}
      {list.map((s, i) => (
        <div key={i} className="rounded-lg bg-white p-2.5 text-xs leading-6">
          <p lang="km">{s.km}</p><p className="mt-1 text-muted">{s.en}</p>
          <button type="button" className="mt-1 text-gold-2 underline" onClick={() => onUse(s)}>{L("ប្រើ (អាចកែបាន)", "Use (you can edit)")}</button>
        </div>
      ))}
      <p className="text-[10px] text-muted">{L("AI មិនបំពេញឈ្មោះ ឬកាលបរិច្ឆេទដោយខ្លួនឯងទេ — សូមពិនិត្យមុនផ្សព្វផ្សាយ", "AI never invents names or dates — review before publishing")}</p>
    </div>
  );
}
