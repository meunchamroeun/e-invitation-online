"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, Check, Loader2 } from "lucide-react";
import { EVENT_TYPES, type EventType } from "@/features/templates/registry";
import type { MarketTemplate } from "@/features/templates/queries";
import { createEventAction } from "@/features/events/actions";
import { Button, Field, Input, Badge } from "@/components/ui";
import { ChanFlower, Lotus } from "@/components/invitation/ornaments";
import { TemplateThumb } from "@/components/marketing/template-thumb";
import { toKhmerDigits } from "@/i18n/format";
import { cn } from "@/lib/utils";

const STORAGE = "ei:wizard:v1"; // UI convenience only — the event itself is stored server-side on creation.

const TX = {
  steps: [{ km: "ប្រភេទ", en: "Type" }, { km: "ព័ត៌មាន", en: "Details" }, { km: "គំរូ", en: "Design" }, { km: "ពិនិត្យ", en: "Review" }],
  typeTitle: { km: "តើអ្នករៀបចំកម្មវិធីអ្វី?", en: "What are you celebrating?" },
  infoTitle: { km: "ព័ត៌មានកម្មវិធី", en: "Event details" },
  tplTitle: { km: "ជ្រើសរើសគំរូធៀប", en: "Choose a design" },
  reviewTitle: { km: "ពិនិត្យ និងបង្កើត", en: "Review & create" },
  title: { km: "ចំណងជើងកម្មវិធី (សម្រាប់អ្នកប៉ុណ្ណោះ)", en: "Event title (only you see this)" },
  hostKm: { km: "ឈ្មោះម្ចាស់កម្មវិធី (ខ្មែរ)", en: "Host names (Khmer)" },
  hostEn: { km: "ឈ្មោះម្ចាស់កម្មវិធី (អង់គ្លេស)", en: "Host names (English)" },
  hostHint: { km: "ឧ. សុវណ្ណ & លក្ខិណា", en: "e.g. Sovann & Lakhena" },
  date: { km: "កាលបរិច្ឆេទ", en: "Date" }, start: { km: "ម៉ោងចាប់ផ្ដើម", en: "Start time" }, end: { km: "ម៉ោងបញ្ចប់", en: "End time" },
  venue: { km: "ឈ្មោះទីកន្លែង", en: "Venue name" }, address: { km: "អាសយដ្ឋាន", en: "Address" }, map: { km: "តំណ Google Maps (ស្រេចចិត្ត)", en: "Google Maps link (optional)" },
  lunar: { km: "កាលបរិច្ឆេទច័ន្ទគតិ អាចបញ្ចូលដោយខ្លួនឯងនៅក្នុងកម្មវិធីកែធៀប", en: "You can add a verified lunar date yourself in the builder" },
  next: { km: "បន្ទាប់", en: "Next" }, back: { km: "ថយក្រោយ", en: "Back" }, create: { km: "បង្កើត និងចាប់ផ្ដើមកែធៀប", en: "Create & open builder" },
  noInvent: { km: "យើងមិនបំពេញឈ្មោះឪពុកម្ដាយ ឬព័ត៌មានផ្ទាល់ខ្លួនជំនួសអ្នកឡើយ — អ្នកបញ្ចូលវានៅក្នុងកម្មវិធីកែធៀប។", en: "We never fill in parents' names or personal details for you — you add them in the builder." },
  required: { km: "សូមបំពេញព័ត៌មានដែលត្រូវការ", en: "Please fill in the required fields" },
  saved: { km: "ព្រាងត្រូវបានរក្សាទុកក្នុងឧបករណ៍នេះ", en: "Progress saved on this device" },
  premium: { km: "ពិសេស", en: "Premium" },
  premiumNote: { km: "គំរូពិសេសអាចកែ និងមើលបានដោយឥតគិតថ្លៃ — ត្រូវការកញ្ចប់ពេលផ្សព្វផ្សាយ", en: "Premium designs are free to edit and preview — a plan is needed to publish" },
  errors: { plan_events_limit: { km: "អ្នកបានដល់ចំនួនកម្មវិធីអតិបរមានៃកញ្ចប់របស់អ្នក", en: "You've reached your plan's event limit" } } as Record<string, { km: string; en: string }>,
};

type State = { step: number; type: EventType | ""; title: string; hostKm: string; hostEn: string; date: string; startTime: string; endTime: string; venueName: string; venueAddress: string; mapUrl: string; template: string };
const EMPTY: State = { step: 0, type: "", title: "", hostKm: "", hostEn: "", date: "", startTime: "17:00", endTime: "", venueName: "", venueAddress: "", mapUrl: "", template: "" };

export function EventWizard({ locale, templates, initialTemplate }: { locale: "km" | "en"; templates: MarketTemplate[]; initialTemplate?: string }) {
  const L = (x: { km: string; en: string }) => x[locale];
  const router = useRouter();
  const [s, setS] = useState<State>(EMPTY);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState("");
  const [pending, start] = useTransition();

  useEffect(() => {
    let init = EMPTY;
    try { const raw = localStorage.getItem(STORAGE); if (raw) init = { ...EMPTY, ...JSON.parse(raw) }; } catch { /* storage unavailable */ }
    const pre = templates.find((t) => t.slug === initialTemplate);
    if (pre) init = { ...init, template: pre.slug, type: init.type || pre.category, step: init.step || 0 };
    setS(init);
    setLoaded(true);
  }, [initialTemplate, templates]);
  useEffect(() => { if (loaded) try { localStorage.setItem(STORAGE, JSON.stringify(s)); } catch { /* ignore */ } }, [s, loaded]);

  const up = (p: Partial<State>) => setS((x) => ({ ...x, ...p }));
  const list = useMemo(() => {
    const same = templates.filter((t) => t.category === s.type);
    return [...same, ...templates.filter((t) => t.category !== s.type)];
  }, [templates, s.type]);

  const infoValid = !!(s.title.trim() && (s.hostKm.trim() || s.hostEn.trim()) && s.date && s.startTime);
  const canNext = [!!s.type, infoValid, !!s.template, true][s.step];

  function submit() {
    setError("");
    start(async () => {
      const r = await createEventAction({ type: s.type as string, title: s.title, hostKm: s.hostKm, hostEn: s.hostEn, date: s.date, startTime: s.startTime, endTime: s.endTime, timezone: "Asia/Phnom_Penh", venueName: s.venueName, venueAddress: s.venueAddress, mapUrl: s.mapUrl, template: s.template });
      if (r.ok) {
        try { localStorage.removeItem(STORAGE); } catch { /* ignore */ }
        router.push(`/dashboard/events/${(r.data as { id: string }).id}/builder`);
      } else setError(TX.errors[r.error] ? L(TX.errors[r.error]) : r.error);
    });
  }

  const tpl = templates.find((t) => t.slug === s.template);

  return (
    <div className="mx-auto max-w-4xl">
      <ol className="mb-8 flex items-center gap-2 overflow-x-auto" aria-label="Progress">
        {TX.steps.map((st, i) => (
          <li key={i} className="flex shrink-0 items-center gap-2">
            <button disabled={i > s.step} onClick={() => up({ step: i })} className={cn("flex items-center gap-2 rounded-full py-1.5 pl-1.5 pr-3 text-sm transition-colors", i === s.step ? "bg-ink text-white" : i < s.step ? "bg-white text-ink" : "text-muted")} aria-current={i === s.step ? "step" : undefined}>
              <span className={cn("flex h-6 w-6 items-center justify-center rounded-full text-xs", i === s.step ? "bg-white/15" : i < s.step ? "bg-success text-white" : "border border-line-2")}>
                {i < s.step ? <Check className="h-3.5 w-3.5" /> : locale === "km" ? toKhmerDigits(i + 1) : i + 1}
              </span>
              {L(st)}
            </button>
            {i < 3 ? <span className="h-px w-6 bg-line-2" /> : null}
          </li>
        ))}
      </ol>

      <div className="rounded-3xl border border-line bg-white p-5 shadow-soft sm:p-8">
        {s.step === 0 ? (
          <>
            <h1 className="text-2xl font-semibold">{L(TX.typeTitle)}</h1>
            <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
              {EVENT_TYPES.map((e) => (
                <button key={e.value} onClick={() => up({ type: e.value, step: 1 })} aria-pressed={s.type === e.value}
                  className={cn("group flex flex-col items-start gap-3 rounded-2xl border p-4 text-left transition-all", s.type === e.value ? "border-gold bg-gold-soft/60 ring-4 ring-gold/10" : "border-line hover:border-line-2")}>
                  <span className="text-gold">{e.value === "funeral" ? <Lotus size={26} /> : <ChanFlower size={26} />}</span>
                  <span><span className="block font-medium">{e.label.km}</span><span className="text-xs text-muted">{e.label.en}</span></span>
                </button>
              ))}
            </div>
          </>
        ) : null}

        {s.step === 1 ? (
          <>
            <h1 className="text-2xl font-semibold">{L(TX.infoTitle)}</h1>
            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <Field label={`${L(TX.title)} *`} className="sm:col-span-2" htmlFor="title"><Input id="title" value={s.title} maxLength={160} onChange={(e) => up({ title: e.target.value })} /></Field>
              <Field label={`${L(TX.hostKm)} *`} hint={L(TX.hostHint)} htmlFor="hk"><Input id="hk" lang="km" value={s.hostKm} maxLength={160} onChange={(e) => up({ hostKm: e.target.value })} /></Field>
              <Field label={L(TX.hostEn)} htmlFor="he"><Input id="he" value={s.hostEn} maxLength={160} onChange={(e) => up({ hostEn: e.target.value })} /></Field>
              <Field label={`${L(TX.date)} *`} htmlFor="date"><Input id="date" type="date" value={s.date} onChange={(e) => up({ date: e.target.value })} /></Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label={`${L(TX.start)} *`} htmlFor="st"><Input id="st" type="time" value={s.startTime} onChange={(e) => up({ startTime: e.target.value })} /></Field>
                <Field label={L(TX.end)} htmlFor="et"><Input id="et" type="time" value={s.endTime} onChange={(e) => up({ endTime: e.target.value })} /></Field>
              </div>
              <Field label={L(TX.venue)} htmlFor="vn"><Input id="vn" value={s.venueName} maxLength={200} onChange={(e) => up({ venueName: e.target.value })} /></Field>
              <Field label={L(TX.address)} htmlFor="va"><Input id="va" value={s.venueAddress} maxLength={400} onChange={(e) => up({ venueAddress: e.target.value })} /></Field>
              <Field label={L(TX.map)} className="sm:col-span-2" htmlFor="mu"><Input id="mu" type="url" placeholder="https://maps.app.goo.gl/…" value={s.mapUrl} onChange={(e) => up({ mapUrl: e.target.value })} /></Field>
            </div>
            <p className="mt-4 text-xs text-muted">Asia/Phnom_Penh · {L(TX.lunar)}</p>
          </>
        ) : null}

        {s.step === 2 ? (
          <>
            <h1 className="text-2xl font-semibold">{L(TX.tplTitle)}</h1>
            <p className="mt-1 text-sm text-muted">{L(TX.premiumNote)}</p>
            <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
              {list.map((t) => (
                <button key={t.slug} onClick={() => up({ template: t.slug })} aria-pressed={s.template === t.slug} className="group text-left">
                  <div className={cn("relative overflow-hidden rounded-2xl border-2 p-1 transition-all", s.template === t.slug ? "border-gold shadow-lift" : "border-transparent hover:border-line-2")}>
                    <div className="overflow-hidden rounded-xl"><TemplateThumb slug={t.slug} locale={locale} width={176} className="!w-full" /></div>
                    {s.template === t.slug ? <span className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-gold text-white"><Check className="h-4 w-4" /></span> : null}
                    {t.tier === "premium" ? <Badge tone="dark" className="absolute left-2 top-2">★ {L(TX.premium)}</Badge> : null}
                  </div>
                  <p className="mt-2 text-sm font-medium">{L(t.name)}</p>
                </button>
              ))}
            </div>
          </>
        ) : null}

        {s.step === 3 ? (
          <div className="grid gap-8 sm:grid-cols-[200px_1fr]">
            {tpl ? <div className="overflow-hidden rounded-2xl border border-line"><TemplateThumb slug={tpl.slug} locale={locale} width={200} /></div> : null}
            <div>
              <h1 className="text-2xl font-semibold">{L(TX.reviewTitle)}</h1>
              <dl className="mt-5 divide-y divide-line text-sm">
                {[
                  [L(TX.steps[0]), L(EVENT_TYPES.find((e) => e.value === s.type)?.label ?? { km: "", en: "" })],
                  [L(TX.title), s.title],
                  [L(TX.hostKm), [s.hostKm, s.hostEn].filter(Boolean).join(" · ")],
                  [L(TX.date), `${s.date} · ${s.startTime}${s.endTime ? `–${s.endTime}` : ""}`],
                  [L(TX.venue), [s.venueName, s.venueAddress].filter(Boolean).join(", ") || "—"],
                  [L(TX.steps[2]), tpl ? L(tpl.name) : "—"],
                ].map(([k, v]) => (
                  <div key={k} className="grid grid-cols-[140px_1fr] gap-3 py-2.5"><dt className="text-muted">{k}</dt><dd className="font-medium">{v}</dd></div>
                ))}
              </dl>
              <p className="mt-5 rounded-xl bg-gold-soft/70 px-4 py-3 text-xs leading-6 text-gold-2">{L(TX.noInvent)}</p>
            </div>
          </div>
        ) : null}

        {error ? <p role="alert" className="mt-5 rounded-xl bg-danger/8 px-4 py-2.5 text-sm text-danger">{error}</p> : null}

        <div className="mt-8 flex items-center justify-between border-t border-line pt-5">
          <Button variant="ghost" onClick={() => up({ step: Math.max(0, s.step - 1) })} disabled={s.step === 0}><ArrowLeft className="h-4 w-4" />{L(TX.back)}</Button>
          <span className="hidden text-xs text-muted sm:block">{loaded ? L(TX.saved) : ""}</span>
          {s.step < 3 ? (
            <Button onClick={() => (canNext ? up({ step: s.step + 1 }) : setError(L(TX.required)))} disabled={!canNext}>{L(TX.next)}<ArrowRight className="h-4 w-4" /></Button>
          ) : (
            <Button variant="gold" onClick={submit} disabled={pending}>{pending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}{L(TX.create)}</Button>
          )}
        </div>
      </div>
    </div>
  );
}
