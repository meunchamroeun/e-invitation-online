"use client";

import { useRef, useState, type ReactNode } from "react";
import { ArrowDown, ArrowUp, ImagePlus, Loader2, Lock, Plus, Trash2, X } from "lucide-react";
import type { LText, Section } from "@/features/invitations/doc";
import { SECTION_LABELS } from "@/features/invitations/doc";
import { Input, Textarea, Select } from "@/components/ui";
import { AiAssist } from "./ai-assist";
import { cn } from "@/lib/utils";

export type MediaItem = { id: string; url: string; kind: string };
type Upd = (data: unknown, key: string) => void;

export type EditorCtx = {
  locale: "km" | "en";
  eventId: string;
  media: MediaItem[];
  onUploaded: (m: MediaItem) => void;
  giftLocked: boolean;
  canEditGift: boolean;
};

const T = (c: EditorCtx, km: string, en: string) => (c.locale === "km" ? km : en);

/* ---------- primitives ---------- */

function Group({ title, children }: { title: string; children: ReactNode }) {
  return (
    <fieldset className="space-y-3 border-b border-line px-4 py-4 last:border-0">
      <legend className="sr-only">{title}</legend>
      <p className="text-[11px] font-semibold uppercase tracking-wider text-muted">{title}</p>
      {children}
    </fieldset>
  );
}

function LInput({ label, value, onChange, multiline, k, max = 2000 }: { label: string; value: LText; onChange: (v: LText) => void; multiline?: boolean; k: string; max?: number }) {
  const C = multiline ? Textarea : Input;
  return (
    <div>
      <p className="mb-1.5 text-[13px] font-medium text-ink-2">{label}</p>
      <div className="space-y-1.5">
        {(["km", "en"] as const).map((lang) => (
          <div key={lang} className="relative">
            <span className="pointer-events-none absolute left-2.5 top-2.5 z-10 rounded bg-black/[.05] px-1.5 text-[10px] font-semibold text-muted">{lang === "km" ? "ខ្មែរ" : "EN"}</span>
            <C
              id={`${k}-${lang}`}
              lang={lang}
              maxLength={max}
              value={value[lang]}
              onChange={(e: { target: { value: string } }) => onChange({ ...value, [lang]: e.target.value })}
              className={cn("pl-12 text-sm", multiline ? "min-h-20" : "h-10")}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

function TextIn({ label, value, onChange, placeholder, max = 120 }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string; max?: number }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[13px] font-medium text-ink-2">{label}</span>
      <Input value={value} maxLength={max} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} className="h-10 text-sm" />
    </label>
  );
}

async function prepareImageForUpload(f: File, purpose: string): Promise<File> {
  if ((purpose !== "image" && purpose !== "qr") || f.type === "image/gif" || f.size <= 3.5 * 1024 * 1024) {
    return f;
  }
  try {
    const bmp = await createImageBitmap(f);
    const maxDim = purpose === "qr" ? 1200 : 2000;
    const scale = Math.min(1, maxDim / Math.max(bmp.width, bmp.height));
    const w = Math.max(1, Math.round(bmp.width * scale));
    const h = Math.max(1, Math.round(bmp.height * scale));
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) { bmp.close(); return f; }
    ctx.drawImage(bmp, 0, 0, w, h);
    bmp.close();
    const mime = purpose === "qr" ? "image/png" : "image/webp";
    const blob = await new Promise<Blob | null>((res) => canvas.toBlob(res, mime, 0.85));
    if (!blob || blob.size >= f.size) return f;
    return new File([blob], f.name.replace(/\.[^.]+$/, "") + (purpose === "qr" ? ".png" : ".webp"), { type: mime });
  } catch {
    return f;
  }
}

export function MediaPicker({ c, value, onChange, purpose = "image", label, hint }: { c: EditorCtx; value: string; onChange: (v: string) => void; purpose?: "image" | "qr" | "audio" | "video"; label: string; hint?: string }) {
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [lib, setLib] = useState(false);
  async function upload(f: File) {
    setBusy(true); setErr("");
    const prepared = await prepareImageForUpload(f, purpose);
    const fd = new FormData();
    fd.set("file", prepared); fd.set("eventId", c.eventId); fd.set("purpose", purpose);
    const res = await fetch("/api/media", { method: "POST", body: fd });
    const j = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) return setErr(j.error === "too_large" ? T(c, `ឯកសារធំពេក (អតិបរមា ${j.maxMb}MB)`, `File too large (max ${j.maxMb}MB)`) : T(c, "ប្រភេទឯកសារមិនត្រូវបានគាំទ្រ", "Unsupported file type"));
    c.onUploaded({ id: j.id, url: j.url, kind: purpose });
    onChange(j.url);
  }
  const images = c.media.filter((m) => (purpose === "audio" ? m.kind === "audio" : purpose === "video" ? m.kind === "video" : m.kind === "image" || m.kind === "qr"));
  return (
    <div>
      <p className="mb-1.5 text-[13px] font-medium text-ink-2">{label}</p>
      <div className="flex items-center gap-3">
        {purpose === "video" ? (value && !value.startsWith("placeholder:") ? <video src={value} muted playsInline preload="metadata" className="h-16 w-28 shrink-0 rounded-xl bg-black object-cover" /> : <span className="flex h-16 w-28 shrink-0 items-center justify-center rounded-xl border border-line bg-paper text-[10px] text-muted">{value ? T(c, "គំរូ", "Sample") : "—"}</span>) : purpose !== "audio" ? (
          <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl border border-line bg-paper">
            {value && !value.startsWith("placeholder:") ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={value} alt="" className="h-full w-full object-cover" />
            ) : <span className="flex h-full items-center justify-center text-[10px] text-muted">{value ? T(c, "គំរូ", "Sample") : "—"}</span>}
          </div>
        ) : value ? <audio src={value} controls className="h-9 w-full" /> : null}
        <div className="flex flex-wrap gap-1.5">
          <button type="button" onClick={() => input.current?.click()} disabled={busy} className="inline-flex h-8 items-center gap-1.5 rounded-full border border-line-2 bg-white px-3 text-xs font-medium hover:border-ink/40">
            {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ImagePlus className="h-3.5 w-3.5" />}{T(c, "ផ្ទុកឡើង", "Upload")}
          </button>
          {images.length ? <button type="button" onClick={() => setLib(!lib)} className="h-8 rounded-full px-3 text-xs text-ink-2 hover:bg-black/5">{T(c, "បណ្ណាល័យ", "Library")}</button> : null}
          {value ? <button type="button" onClick={() => onChange("")} className="h-8 rounded-full px-2 text-xs text-muted hover:bg-black/5" aria-label="Remove"><X className="h-3.5 w-3.5" /></button> : null}
        </div>
        <input ref={input} type="file" hidden accept={purpose === "audio" ? "audio/mpeg,audio/mp4,audio/ogg" : purpose === "video" ? "video/mp4,video/quicktime,video/webm" : "image/jpeg,image/png,image/webp"} onChange={(e) => { const f = e.target.files?.[0]; if (f) upload(f); e.target.value = ""; }} />
      </div>
      {hint ? <p className="mt-1 text-[11px] leading-5 text-muted">{hint}</p> : null}
      {err ? <p className="mt-1 text-xs text-danger">{err}</p> : null}
      {lib ? (
        <div className="mt-2 grid grid-cols-4 gap-1.5 rounded-xl border border-line p-1.5">
          {images.map((m) => (
            <button key={m.id} type="button" onClick={() => { onChange(m.url); setLib(false); }} className="aspect-square overflow-hidden rounded-lg border border-line">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              {m.kind === "audio" ? <span className="text-[10px]">♪</span> : m.kind === "video" ? <video src={m.url} muted preload="metadata" className="h-full w-full object-cover" /> : <img src={m.url} alt="" className="h-full w-full object-cover" />}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

/** Upload many photos at once (sequential, so a slow connection doesn't time out). */
function BulkPhotos({ c, onAdd }: { c: EditorCtx; onAdd: (urls: string[]) => void }) {
  const input = useRef<HTMLInputElement>(null);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [errors, setErrors] = useState(0);
  async function run(files: File[]) {
    const urls: string[] = [];
    let bad = 0;
    setProgress({ done: 0, total: files.length });
    for (const [i, f] of files.entries()) {
      const fd = new FormData();
      fd.set("file", f); fd.set("eventId", c.eventId); fd.set("purpose", "image");
      const res = await fetch("/api/media", { method: "POST", body: fd });
      const j = await res.json().catch(() => ({}));
      if (res.ok) { urls.push(j.url); c.onUploaded({ id: j.id, url: j.url, kind: "image" }); } else bad++;
      setProgress({ done: i + 1, total: files.length });
    }
    setErrors(bad);
    setProgress(null);
    if (urls.length) onAdd(urls);
  }
  return (
    <div>
      <button type="button" disabled={!!progress} onClick={() => input.current?.click()} className="flex h-11 w-full items-center justify-center gap-2 rounded-2xl bg-ink text-sm font-medium text-white disabled:opacity-60">
        {progress ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImagePlus className="h-4 w-4" />}
        {progress ? `${progress.done} / ${progress.total}` : T(c, "ផ្ទុករូបថតច្រើនក្នុងពេលតែមួយ", "Upload many photos at once")}
      </button>
      <input ref={input} type="file" hidden multiple accept="image/jpeg,image/png,image/webp" onChange={(e) => { const f = Array.from(e.target.files ?? []).slice(0, 40); if (f.length) run(f); e.target.value = ""; }} />
      {errors ? <p className="mt-1 text-xs text-danger">{T(c, `រូប ${errors} មិនអាចផ្ទុកបាន (ធំពេក ឬប្រភេទមិនត្រឹមត្រូវ)`, `${errors} photo(s) failed (too large or unsupported)`)}</p> : null}
    </div>
  );
}

function ListEditor<T>({ c, items, onChange, render, blank, max, addLabel }: { c: EditorCtx; items: T[]; onChange: (v: T[]) => void; render: (it: T, set: (v: T) => void, i: number) => ReactNode; blank: () => T; max: number; addLabel: string }) {
  const move = (i: number, d: number) => { const a = [...items]; const [x] = a.splice(i, 1); a.splice(i + d, 0, x); onChange(a); };
  return (
    <div className="space-y-3">
      {items.map((it, i) => (
        <div key={i} className="rounded-2xl border border-line bg-paper/50 p-3">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-xs font-semibold text-muted">#{i + 1}</span>
            <div className="flex gap-0.5">
              <button type="button" disabled={i === 0} onClick={() => move(i, -1)} className="rounded p-1 text-muted hover:bg-black/5 disabled:opacity-30" aria-label="Up"><ArrowUp className="h-3.5 w-3.5" /></button>
              <button type="button" disabled={i === items.length - 1} onClick={() => move(i, 1)} className="rounded p-1 text-muted hover:bg-black/5 disabled:opacity-30" aria-label="Down"><ArrowDown className="h-3.5 w-3.5" /></button>
              <button type="button" onClick={() => onChange(items.filter((_, j) => j !== i))} className="rounded p-1 text-danger hover:bg-danger/10" aria-label={T(c, "លុប", "Remove")}><Trash2 className="h-3.5 w-3.5" /></button>
            </div>
          </div>
          <div className="space-y-2.5">{render(it, (v) => onChange(items.map((x, j) => (j === i ? v : x))), i)}</div>
        </div>
      ))}
      {items.length < max ? (
        <button type="button" onClick={() => onChange([...items, blank()])} className="flex h-10 w-full items-center justify-center gap-1.5 rounded-2xl border border-dashed border-line-2 text-sm text-ink-2 hover:border-gold hover:text-gold-2">
          <Plus className="h-4 w-4" />{addLabel}
        </button>
      ) : null}
    </div>
  );
}

const e = (): LText => ({ km: "", en: "" });

/* ---------- per-section forms ---------- */

export function SectionEditor({ s, c, update }: { s: Section; c: EditorCtx; update: Upd }) {
  const k = s.id;
  const set = (patch: object, key: string) => update({ ...s.data, ...patch }, `${k}.${key}`);
  const title = SECTION_LABELS[s.type][c.locale];

  switch (s.type) {
    case "cover":
      return (
        <Group title={title}>
          <LInput k={`${k}.kicker`} label={T(c, "អក្សរតូចខាងលើ", "Small heading")} value={s.data.kicker} onChange={(v) => set({ kicker: v }, "kicker")} />
          <LInput k={`${k}.names`} label={T(c, "ឈ្មោះ", "Names")} value={s.data.names} onChange={(v) => set({ names: v }, "names")} />
          <LInput k={`${k}.button`} label={T(c, "អក្សរប៊ូតុង", "Button text")} value={s.data.button} onChange={(v) => set({ button: v }, "button")} />
          <MediaPicker c={c} label={T(c, "រូបផ្ទៃខាងក្រោយ", "Background photo")} value={s.data.photo} onChange={(v) => set({ photo: v }, "photo")} />
        </Group>
      );
    case "hero":
      return (
        <Group title={title}>
          <LInput k={`${k}.kicker`} label={T(c, "ចំណងជើងតូច", "Kicker")} value={s.data.kicker} onChange={(v) => set({ kicker: v }, "kicker")} />
          <LInput k={`${k}.names`} label={T(c, "ឈ្មោះ", "Names")} value={s.data.names} onChange={(v) => set({ names: v }, "names")} />
          <LInput k={`${k}.tagline`} label={T(c, "ឃ្លាអញ្ជើញ", "Tagline")} value={s.data.tagline} onChange={(v) => set({ tagline: v }, "tagline")} multiline />
          <MediaPicker c={c} label={T(c, "រូបថតចម្បង", "Main photo")} value={s.data.photo} onChange={(v) => set({ photo: v }, "photo")} />
          <MediaPicker c={c} purpose="video" label={T(c, "វីដេអូបើកឆាក (ស្រេចចិត្ត)", "Opening video (optional)")} value={s.data.video} onChange={(v) => set({ video: v }, "video")}
            hint={T(c, "លេងដោយស្ងាត់ និងវិលជុំ ពេញអេក្រង់ មុនផ្ទាំងដើម។ ណែនាំ MP4 ខ្លី (១០–២០ វិនាទី) ទំហំតូចជាង ២០MB។", "Plays muted & looping, full-screen, before the hero. Use a short MP4 (10–20 s), ideally under 20 MB.")} />
          <p className="text-xs text-muted">{T(c, "កាលបរិច្ឆេទ និងទីតាំង យកពីការកំណត់កម្មវិធី", "Date & venue come from event settings")}</p>
        </Group>
      );
    case "invitation":
      return (
        <>
          <Group title={title}>
            <LInput k={`${k}.heading`} label={T(c, "ចំណងជើង", "Heading")} value={s.data.heading} onChange={(v) => set({ heading: v }, "heading")} />
            <LInput k={`${k}.body`} label={T(c, "សេចក្ដីអញ្ជើញ", "Invitation text")} value={s.data.body} onChange={(v) => set({ body: v }, "body")} multiline />
            <AiAssist eventId={c.eventId} locale={c.locale} onUse={(v) => set({ body: v }, "body-ai")} />
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={s.data.showParents} onChange={(ev) => set({ showParents: ev.target.checked }, "showParents")} className="h-4 w-4 accent-[#B68A45]" />{T(c, "បង្ហាញឈ្មោះមាតាបិតា", "Show parents' names")}</label>
          </Group>
          {s.data.showParents ? (
            <>
              <Group title={T(c, "មាតាបិតាខាងប្រុស / ម្ចាស់កម្មវិធី", "Groom's parents / hosts")}>
                <LInput k={`${k}.lf`} label={T(c, "ឪពុក", "Father")} value={s.data.leftFamily.father} onChange={(v) => set({ leftFamily: { ...s.data.leftFamily, father: v } }, "lf")} />
                <LInput k={`${k}.lm`} label={T(c, "ម្ដាយ", "Mother")} value={s.data.leftFamily.mother} onChange={(v) => set({ leftFamily: { ...s.data.leftFamily, mother: v } }, "lm")} />
              </Group>
              <Group title={T(c, "មាតាបិតាខាងស្រី", "Bride's parents")}>
                <LInput k={`${k}.rf`} label={T(c, "ឪពុក", "Father")} value={s.data.rightFamily.father} onChange={(v) => set({ rightFamily: { ...s.data.rightFamily, father: v } }, "rf")} />
                <LInput k={`${k}.rm`} label={T(c, "ម្ដាយ", "Mother")} value={s.data.rightFamily.mother} onChange={(v) => set({ rightFamily: { ...s.data.rightFamily, mother: v } }, "rm")} />
              </Group>
            </>
          ) : null}
        </>
      );
    case "couple":
      return (
        <>
          {(["left", "right"] as const).map((side) => (
            <Group key={side} title={side === "left" ? T(c, "បុគ្គលទី ១", "Person 1") : T(c, "បុគ្គលទី ២", "Person 2")}>
              <LInput k={`${k}.${side}.role`} label={T(c, "តួនាទី", "Role")} value={s.data[side].role} onChange={(v) => set({ [side]: { ...s.data[side], role: v } }, `${side}.role`)} />
              <LInput k={`${k}.${side}.name`} label={T(c, "ឈ្មោះ", "Name")} value={s.data[side].name} onChange={(v) => set({ [side]: { ...s.data[side], name: v } }, `${side}.name`)} />
              <LInput k={`${k}.${side}.bio`} label={T(c, "ពិពណ៌នាខ្លី", "Short note")} value={s.data[side].bio} onChange={(v) => set({ [side]: { ...s.data[side], bio: v } }, `${side}.bio`)} />
              <MediaPicker c={c} label={T(c, "រូបថត", "Portrait")} value={s.data[side].photo} onChange={(v) => set({ [side]: { ...s.data[side], photo: v } }, `${side}.photo`)} />
            </Group>
          ))}
        </>
      );
    case "countdown":
    case "rsvp":
    case "wishes":
    case "venue":
      return (
        <Group title={title}>
          <LInput k={`${k}.heading`} label={T(c, "ចំណងជើង", "Heading")} value={s.data.heading} onChange={(v) => set({ heading: v }, "heading")} />
          {"note" in s.data ? <LInput k={`${k}.note`} label={T(c, "កំណត់ចំណាំ", "Note")} value={s.data.note} onChange={(v) => set({ note: v }, "note")} multiline /> : null}
          {s.type === "venue" ? <LInput k={`${k}.parking`} label={T(c, "ចំណតរថយន្ត", "Parking")} value={s.data.parking} onChange={(v) => set({ parking: v }, "parking")} /> : null}
          {s.type === "venue" ? (
            <>
              <MediaPicker c={c} label={T(c, "រូបផែនទីផ្លូវ (ឧ. ផែនទីគូរដៃពីធៀបបោះពុម្ព)", "Directions map image (e.g. the hand-drawn map from your printed card)")} value={s.data.mapImage} onChange={(v) => set({ mapImage: v }, "mapImage")} />
              <ListEditor c={c} max={4} items={s.data.contacts} onChange={(v) => set({ contacts: v }, "contacts")} addLabel={T(c, "បន្ថែមលេខទូរស័ព្ទ", "Add phone number")}
                blank={() => ({ label: e(), phone: "" })}
                render={(it, upd) => (
                  <>
                    <TextIn label={T(c, "លេខទូរស័ព្ទ", "Phone")} value={it.phone} onChange={(v) => upd({ ...it, phone: v.replace(/[^0-9+()\-\s]/g, "") })} placeholder="012 345 678" max={30} />
                    <LInput k={`${k}.ct`} label={T(c, "ឈ្មោះ (ស្រេចចិត្ត)", "Label (optional)")} value={it.label} onChange={(v) => upd({ ...it, label: v })} />
                  </>
                )} />
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={s.data.showQr} onChange={(ev) => set({ showQr: ev.target.checked }, "showQr")} className="h-4 w-4 accent-[#B68A45]" />{T(c, "បង្ហាញ QR ទីតាំង (ពីតំណ Google Maps)", "Show location QR (from Google Maps link)")}</label>
              <p className="text-xs text-muted">{T(c, "ឈ្មោះ អាសយដ្ឋាន និងតំណផែនទី កែនៅក្នុង ការកំណត់", "Venue name, address and map link are edited in Settings")}</p>
            </>
          ) : null}
          {s.type === "rsvp" ? <p className="text-xs text-muted">{T(c, "ថ្ងៃផុតកំណត់ និង «មិនប្រាកដ» កំណត់នៅក្នុង ការកំណត់", "Deadline and the “maybe” option live in Settings")}</p> : null}
        </Group>
      );
    case "schedule":
      return (
        <Group title={title}>
          <LInput k={`${k}.heading`} label={T(c, "ចំណងជើង", "Heading")} value={s.data.heading} onChange={(v) => set({ heading: v }, "heading")} />
          <ListEditor c={c} max={30} items={s.data.items} onChange={(v) => set({ items: v }, "items")} addLabel={T(c, "បន្ថែមកម្មវិធី", "Add item")}
            blank={() => ({ time: "", title: e(), desc: e(), icon: "chan" })}
            render={(it, upd) => (
              <>
                <div className="grid grid-cols-2 gap-2">
                  <TextIn label={T(c, "ម៉ោង", "Time")} value={it.time} onChange={(v) => upd({ ...it, time: v })} placeholder="07:00" max={40} />
                  <label className="block"><span className="mb-1.5 block text-[13px] font-medium text-ink-2">{T(c, "រូបតំណាង", "Icon")}</span>
                    <Select value={it.icon} onChange={(ev) => upd({ ...it, icon: ev.target.value })} className="h-10 text-sm">
                      {["chan", "lotus", "procession", "scissors", "glass", "music", "mic", "flame"].map((x) => <option key={x} value={x}>{x}</option>)}
                    </Select>
                  </label>
                </div>
                <LInput k={`${k}.it.t`} label={T(c, "ឈ្មោះកម្មវិធី", "Title")} value={it.title} onChange={(v) => upd({ ...it, title: v })} />
                <LInput k={`${k}.it.d`} label={T(c, "ពិពណ៌នា", "Description")} value={it.desc} onChange={(v) => upd({ ...it, desc: v })} />
              </>
            )} />
        </Group>
      );
    case "story":
      return (
        <Group title={title}>
          <LInput k={`${k}.heading`} label={T(c, "ចំណងជើង", "Heading")} value={s.data.heading} onChange={(v) => set({ heading: v }, "heading")} />
          <ListEditor c={c} max={12} items={s.data.chapters} onChange={(v) => set({ chapters: v }, "chapters")} addLabel={T(c, "បន្ថែមជំពូក", "Add chapter")}
            blank={() => ({ date: "", title: e(), text: e(), photo: "" })}
            render={(it, upd) => (
              <>
                <TextIn label={T(c, "ពេលវេលា", "Date")} value={it.date} onChange={(v) => upd({ ...it, date: v })} max={60} />
                <LInput k={`${k}.ch.t`} label={T(c, "ចំណងជើង", "Title")} value={it.title} onChange={(v) => upd({ ...it, title: v })} />
                <LInput k={`${k}.ch.x`} label={T(c, "អត្ថបទ", "Text")} value={it.text} onChange={(v) => upd({ ...it, text: v })} multiline />
                <MediaPicker c={c} label={T(c, "រូបថត", "Photo")} value={it.photo} onChange={(v) => upd({ ...it, photo: v })} />
              </>
            )} />
        </Group>
      );
    case "gallery":
      return (
        <Group title={title}>
          <LInput k={`${k}.heading`} label={T(c, "ចំណងជើង", "Heading")} value={s.data.heading} onChange={(v) => set({ heading: v }, "heading")} />
          <BulkPhotos c={c} onAdd={(urls) => set({ photos: [...s.data.photos.filter((p) => !p.src.startsWith("placeholder:")), ...urls.map((u) => ({ src: u, caption: e() }))].slice(0, 60) }, "photos-bulk")} />
          <ListEditor c={c} max={60} items={s.data.photos} onChange={(v) => set({ photos: v }, "photos")} addLabel={T(c, "បន្ថែមរូបថត", "Add photo")}
            blank={() => ({ src: "", caption: e() })}
            render={(it, upd) => (
              <>
                <MediaPicker c={c} label={T(c, "រូបថត", "Photo")} value={it.src} onChange={(v) => upd({ ...it, src: v })} />
                <LInput k={`${k}.ph.c`} label={T(c, "ចំណងជើងរូប", "Caption")} value={it.caption} onChange={(v) => upd({ ...it, caption: v })} />
              </>
            )} />
        </Group>
      );
    case "gift": {
      const locked = c.giftLocked || !c.canEditGift;
      return (
        <Group title={title}>
          <LInput k={`${k}.heading`} label={T(c, "ចំណងជើង", "Heading")} value={s.data.heading} onChange={(v) => set({ heading: v }, "heading")} />
          <LInput k={`${k}.note`} label={T(c, "សារ", "Message")} value={s.data.note} onChange={(v) => set({ note: v }, "note")} multiline />
          {locked ? (
            <p className="flex items-start gap-2 rounded-xl bg-gold-soft/70 p-3 text-xs leading-6 text-gold-2"><Lock className="mt-0.5 h-3.5 w-3.5 shrink-0" />{T(c, "QR ចំណងដៃត្រូវបានចាក់សោ។ ដោះសោនៅក្នុង ការកំណត់ ដើម្បីកែប្រែ (ត្រូវបានកត់ត្រា)។", "Gift QR is locked. Unlock it in Settings to change it (the change is audited).")}</p>
          ) : null}
          <fieldset disabled={locked} className={cn(locked && "pointer-events-none opacity-50")}>
            <ListEditor c={c} max={4} items={s.data.accounts} onChange={(v) => set({ accounts: v }, "accounts")} addLabel={T(c, "បន្ថែមគណនី / KHQR", "Add account / KHQR")}
              blank={() => ({ bank: "ABA", holder: "", number: "", qr: "" })}
              render={(it, upd) => (
                <>
                  <div className="grid grid-cols-2 gap-2">
                    <TextIn label={T(c, "ធនាគារ", "Bank")} value={it.bank} onChange={(v) => upd({ ...it, bank: v })} max={60} />
                    <TextIn label={T(c, "លេខគណនី", "Account no.")} value={it.number} onChange={(v) => upd({ ...it, number: v })} max={60} />
                  </div>
                  <TextIn label={T(c, "ឈ្មោះម្ចាស់គណនី", "Account holder")} value={it.holder} onChange={(v) => upd({ ...it, holder: v })} />
                  <MediaPicker c={c} purpose="qr" label="KHQR / QR" value={it.qr} onChange={(v) => upd({ ...it, qr: v })} />
                </>
              )} />
          </fieldset>
          <p className="text-[11px] leading-5 text-muted">{T(c, "យើងបង្ហាញរូប QR ដូចដែលអ្នកបានផ្ទុកឡើង មិនកែប្រែទិន្នន័យទូទាត់ឡើយ។", "Your QR image is shown exactly as uploaded; payment data is never altered.")}</p>
        </Group>
      );
    }
    case "video": {
      return (
        <Group title={title}>
          <LInput k={`${k}.heading`} label={T(c, "ចំណងជើង", "Heading")} value={s.data.heading} onChange={(v) => set({ heading: v }, "heading")} />
          <MediaPicker c={c} purpose="video" label={T(c, "ផ្ទុកវីដេអូ (MP4 / MOV / WebM)", "Upload video (MP4 / MOV / WebM)")} value={s.data.src} onChange={(v) => set({ src: v, autoPlay: true }, "src")}
            hint={T(c, "ណែនាំ៖ MP4 (H.264) ដើម្បីលេងបានលើ iPhone និង Android។", "Tip: MP4 (H.264) plays on both iPhone and Android.")} />
          <MediaPicker c={c} label={T(c, "រូបគម្រប (Poster)", "Poster image")} value={s.data.poster} onChange={(v) => set({ poster: v }, "poster")} />
          <LInput k={`${k}.caption`} label={T(c, "ចំណងជើងរង", "Caption")} value={s.data.caption} onChange={(v) => set({ caption: v }, "caption")} />
          <label className="flex items-center justify-between gap-3 rounded-xl border border-line px-3 py-2.5 text-sm">
            <span>{T(c, "លេងដោយស្វ័យប្រវត្តិ (Autoplay)", "Autoplay (muted loop)")}</span>
            <input type="checkbox" checked={s.data.autoPlay ?? true} onChange={(e) => set({ autoPlay: e.target.checked }, "autoPlay")} className="h-4 w-4 accent-[#B68A45]" />
          </label>
          <p className="text-[11px] leading-5 text-muted">{T(c, "វីដេអូលេងស្វ័យប្រវត្តិត្រូវបិទសំឡេងជាមុនសិន (ភ្ញៀវអាចបើកសំឡេងបាន)។", "Autoplay starts muted so mobile browsers allow it (guests can unmute).")}</p>
        </Group>
      );
    }
    case "thankyou":
      return (
        <Group title={title}>
          <LInput k={`${k}.message`} label={T(c, "សារអរគុណ", "Message")} value={s.data.message} onChange={(v) => set({ message: v }, "message")} multiline />
          <LInput k={`${k}.signature`} label={T(c, "ហត្ថលេខា", "Signature")} value={s.data.signature} onChange={(v) => set({ signature: v }, "signature")} />
        </Group>
      );
  }
}
