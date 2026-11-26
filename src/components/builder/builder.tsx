"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useReducer, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { DndContext, KeyboardSensor, PointerSensor, closestCenter, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { SortableContext, arrayMove, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  ArrowLeft, Check, CloudOff, Copy, Eye, EyeOff, GripVertical, History as HistoryIcon, Layers, Loader2, Monitor, Palette, Pencil, Plus, Redo2, RotateCcw, Smartphone, Tablet, Trash2, Undo2, AlertTriangle,
} from "lucide-react";
import type { InvitationDoc, Section, SectionType } from "@/features/invitations/doc";
import { SECTION_LABELS, SECTION_TYPES, blankSection } from "@/features/invitations/doc";
import { TEMPLATES, getTemplate, type Palette as Pal } from "@/features/templates/registry";
import { saveDraftAction, listVersionsAction, restoreVersionAction } from "@/features/events/actions";
import { InvitationRenderer } from "@/components/invitation/renderer";
import type { EventInfo } from "@/components/invitation/sections";
import { TemplateThumb } from "@/components/marketing/template-thumb";
import { PublishButton } from "@/components/dashboard/publish-button";
import { Frame } from "./frame";
import { FitDevice, FinishPicker, type Finish } from "@/components/ui/device-frame";
import { isDark } from "@/components/invitation/theme";
import { historyReducer, initHistory } from "./history";
import { SectionEditor, MediaPicker, type EditorCtx, type MediaItem } from "./section-editor";
import { cn } from "@/lib/utils";

type SaveState = "saved" | "dirty" | "saving" | "error" | "conflict";
type Device = "mobile" | "tablet" | "desktop";

export function Builder(props: {
  eventId: string; eventTitle: string; initialDoc: InvitationDoc; initialRevision: number; templateSlug: string; templateSlugs: string[]; event: EventInfo;
  media: MediaItem[]; locale: "km" | "en"; giftLocked: boolean; canEditGift: boolean; canPublish: boolean; published: boolean;
}) {
  const L = (km: string, en: string) => (props.locale === "km" ? km : en);
  const router = useRouter();
  const [h, dispatch] = useReducer(historyReducer, props.initialDoc, initHistory);
  const doc = h.present;
  const [tplSlug, setTplSlug] = useState(props.templateSlug);
  const template = getTemplate(tplSlug)!;
  const [selected, setSelected] = useState<string | null>(doc.sections.find((s) => s.type === "hero")?.id ?? null);
  const [device, setDevice] = useState<Device>("mobile");
  const [finish, setFinish] = useState<Finish>("black");
  const [previewLocale, setPreviewLocale] = useState<"km" | "en">(props.locale);
  const [panel, setPanel] = useState<"sections" | "theme" | "versions">("sections");
  const [mobileView, setMobileView] = useState<"sections" | "edit" | "theme" | "preview">("preview");
  const [media, setMedia] = useState(props.media);
  const [save, setSave] = useState<SaveState>("saved");
  const [saveErr, setSaveErr] = useState("");
  const revision = useRef(props.initialRevision);
  const savedJson = useRef(JSON.stringify(props.initialDoc) + props.templateSlug);
  const frameWrap = useRef<HTMLDivElement>(null);

  const set = useCallback((next: InvitationDoc, key?: string) => dispatch({ type: "set", doc: next, key }), []);
  const updateSection = useCallback((id: string, data: unknown, key: string) => {
    set({ ...doc, sections: doc.sections.map((s) => (s.id === id ? ({ ...s, data } as Section) : s)) }, key);
  }, [doc, set]);

  /* ---- autosave (debounced, optimistic concurrency) ---- */
  const persist = useCallback(async (d: InvitationDoc, slug: string, force = false) => {
    setSave("saving");
    const r = await saveDraftAction(props.eventId, revision.current, d, slug);
    if (r.ok) {
      revision.current = r.revision;
      savedJson.current = JSON.stringify(d) + slug;
      setSave("saved");
      setSaveErr("");
    } else if (r.error === "conflict") {
      if (force && r.revision) { revision.current = r.revision; return persist(d, slug); }
      setSave("conflict");
    } else {
      setSave("error");
      setSaveErr(r.error === "gift_locked" ? L("QR ចំណងដៃត្រូវបានចាក់សោ — ការកែប្រែមិនត្រូវបានរក្សាទុក", "Gift QR is locked — that change was not saved") : r.error === "invalid" ? `${L("ទិន្នន័យមិនត្រឹមត្រូវ", "Invalid content")}: ${r.detail ?? ""}` : r.error);
    }
  }, [props.eventId]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const json = JSON.stringify(doc) + tplSlug;
    if (json === savedJson.current) return;
    if (save === "conflict") return;
    setSave("dirty");
    const id = window.setTimeout(() => persist(doc, tplSlug), 1200);
    return () => window.clearTimeout(id);
  }, [doc, tplSlug]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const warn = (e: BeforeUnloadEvent) => { if (save !== "saved") { e.preventDefault(); } };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [save]);

  /* ---- keyboard shortcuts ---- */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey;
      if (!mod) return;
      if (e.key.toLowerCase() === "z") { e.preventDefault(); dispatch({ type: e.shiftKey ? "redo" : "undo" }); }
      else if (e.key.toLowerCase() === "y") { e.preventDefault(); dispatch({ type: "redo" }); }
      else if (e.key.toLowerCase() === "s") { e.preventDefault(); persist(doc, tplSlug); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [doc, tplSlug, persist]);

  /* ---- section ops ---- */
  const newId = () => `s${Math.random().toString(36).slice(2, 9)}`;
  const ops = {
    toggle: (id: string) => set({ ...doc, sections: doc.sections.map((s) => (s.id === id ? { ...s, hidden: !s.hidden } : s)) }),
    duplicate: (id: string) => {
      const i = doc.sections.findIndex((s) => s.id === id);
      const copy = { ...structuredClone(doc.sections[i]), id: newId() };
      const arr = [...doc.sections]; arr.splice(i + 1, 0, copy);
      set({ ...doc, sections: arr }); setSelected(copy.id);
    },
    remove: (id: string) => {
      if (!window.confirm(L("លុបផ្នែកនេះ? (អាចត្រឡប់វិញដោយ Undo)", "Delete this section? (You can undo)"))) return;
      set({ ...doc, sections: doc.sections.filter((s) => s.id !== id) });
      if (selected === id) setSelected(null);
    },
    add: (type: SectionType) => {
      const s = blankSection(type, newId());
      const at = Math.max(0, doc.sections.findIndex((x) => x.type === "thankyou"));
      const arr = [...doc.sections]; arr.splice(at === 0 ? arr.length : at, 0, s);
      set({ ...doc, sections: arr }); select(s.id);
    },
  };

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }), useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }));
  const onDragEnd = (e: DragEndEvent) => {
    if (!e.over || e.active.id === e.over.id) return;
    const from = doc.sections.findIndex((s) => s.id === e.active.id);
    const to = doc.sections.findIndex((s) => s.id === e.over!.id);
    set({ ...doc, sections: arrayMove(doc.sections, from, to) });
  };

  function select(id: string, fromCanvas = false) {
    setSelected(id);
    if (fromCanvas) { if (window.innerWidth < 1024) setMobileView("edit"); return; }
    const iframe = frameWrap.current?.querySelector("iframe");
    iframe?.contentDocument?.querySelector(`[data-section="${id}"]`)?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  const sel = doc.sections.find((s) => s.id === selected) ?? null;
  const ctx: EditorCtx = { locale: props.locale, eventId: props.eventId, media, onUploaded: (m) => setMedia((x) => [m, ...x]), giftLocked: props.giftLocked, canEditGift: props.canEditGift };
  const palette = { ...template.palette, ...doc.theme.palette } as Pal;

  /* ---- panels ---- */
  const SectionsPanel = (
    <div className="p-3">
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
        <SortableContext items={doc.sections.map((s) => s.id)} strategy={verticalListSortingStrategy}>
          <ul className="space-y-1">
            {doc.sections.map((s) => (
              <SortableRow key={s.id} s={s} label={SECTION_LABELS[s.type][props.locale]} active={selected === s.id}
                onSelect={() => { select(s.id); if (window.innerWidth < 1024) setMobileView("edit"); }} onToggle={() => ops.toggle(s.id)} onDuplicate={() => ops.duplicate(s.id)} onRemove={() => ops.remove(s.id)}
                hideLabel={L("លាក់/បង្ហាញ", "Hide/show")} />
            ))}
          </ul>
        </SortableContext>
      </DndContext>
      <details className="group mt-3">
        <summary className="flex h-10 cursor-pointer list-none items-center justify-center gap-1.5 rounded-xl border border-dashed border-line-2 text-sm text-ink-2 hover:border-gold hover:text-gold-2"><Plus className="h-4 w-4" />{L("បន្ថែមផ្នែក", "Add section")}</summary>
        <div className="mt-2 grid grid-cols-2 gap-1.5">
          {SECTION_TYPES.filter((t) => t !== "cover" || !doc.sections.some((s) => s.type === "cover")).map((t) => (
            <button key={t} onClick={() => ops.add(t)} className="rounded-lg border border-line bg-white px-2 py-2 text-left text-xs hover:border-gold">{SECTION_LABELS[t][props.locale]}</button>
          ))}
        </div>
      </details>
    </div>
  );

  const ThemePanel = (
    <div className="space-y-6 p-4">
      <div>
        <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted">{L("គំរូ", "Template")}</p>
        <div className="grid grid-cols-3 gap-2">
          {TEMPLATES.filter((t) => props.templateSlugs.includes(t.slug) || t.slug === tplSlug).map((t) => (
            <button key={t.slug} onClick={() => setTplSlug(t.slug)} title={t.name[props.locale]} aria-pressed={tplSlug === t.slug}
              className={cn("overflow-hidden rounded-lg border-2 transition-all", tplSlug === t.slug ? "border-gold" : "border-transparent hover:border-line-2")}>
              <TemplateThumb slug={t.slug} locale={props.locale} width={76} />
            </button>
          ))}
        </div>
        <p className="mt-2 text-xs text-muted">{L("ខ្លឹមសាររបស់អ្នកនៅដដែល ពេលប្ដូរគំរូ", "Your content is kept when switching templates")}</p>
      </div>
      <div>
        <div className="mb-2 flex items-center justify-between">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted">{L("ពណ៌", "Colours")}</p>
          {Object.keys(doc.theme.palette).length ? <button className="inline-flex items-center gap-1 text-xs text-muted hover:text-ink" onClick={() => set({ ...doc, theme: { ...doc.theme, palette: {} } })}><RotateCcw className="h-3 w-3" />{L("កំណត់ឡើងវិញ", "Reset")}</button> : null}
        </div>
        <div className="grid grid-cols-2 gap-2">
          {(Object.keys(palette) as (keyof Pal)[]).map((k) => (
            <label key={k} className="flex items-center gap-2 rounded-xl border border-line bg-white p-1.5 pr-2 text-xs">
              <input type="color" value={palette[k]} onChange={(e) => set({ ...doc, theme: { ...doc.theme, palette: { ...doc.theme.palette, [k]: e.target.value } } }, `palette.${k}`)} className="h-7 w-7 cursor-pointer rounded-lg border-0 bg-transparent p-0" />
              <span className="text-ink-2">{({ bg: L("ផ្ទៃ", "Background"), surface: L("កាត", "Surface"), ink: L("អក្សរ", "Text"), muted: L("អក្សររង", "Muted"), primary: L("ចម្បង", "Primary"), accent: L("បន្ថែម", "Accent"), onPrimary: L("លើចម្បង", "On primary") } as Record<string, string>)[k]}</span>
            </label>
          ))}
        </div>
      </div>
      <div className="space-y-3">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-muted">{L("ជម្រើស", "Options")}</p>
        {([
          ["envelope", L("ចលនាបើកស្រោមសំបុត្រ", "Envelope opening animation")],
          ["khmerNumerals", L("ប្រើលេខខ្មែរ (០១២៣)", "Use Khmer numerals (០១២៣)")],
        ] as const).map(([k, label]) => (
          <label key={k} className="flex items-center justify-between gap-3 text-sm">
            {label}
            <input type="checkbox" checked={doc.theme[k]} onChange={(e) => set({ ...doc, theme: { ...doc.theme, [k]: e.target.checked } })} className="h-4 w-4 accent-[#B68A45]" />
          </label>
        ))}
        <label className="flex items-center justify-between gap-3 text-sm">
          {L("ភាសាដើមរបស់ធៀប", "Default invitation language")}
          <select value={doc.defaultLocale} onChange={(e) => set({ ...doc, defaultLocale: e.target.value as "km" | "en" })} className="h-9 rounded-lg border border-line-2 bg-white px-2 text-sm">
            <option value="km">ខ្មែរ</option><option value="en">English</option>
          </select>
        </label>
      </div>
      <div className="space-y-3">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-muted">{L("ចលនា", "Animation")}</p>
        <div className="grid grid-cols-3 gap-1 rounded-xl bg-[#EFECE6] p-1">
          {(["full", "subtle", "off"] as const).map((lv) => (
            <button key={lv} onClick={() => set({ ...doc, theme: { ...doc.theme, motion: { ...doc.theme.motion, level: lv } } })} aria-pressed={doc.theme.motion.level === lv}
              className={cn("rounded-lg py-1.5 text-xs", doc.theme.motion.level === lv ? "bg-white font-medium shadow-sm" : "text-muted")}>
              {{ full: L("ពេញ", "Full"), subtle: L("ស្រាល", "Subtle"), off: L("បិទ", "Off") }[lv]}
            </button>
          ))}
        </div>
        <label className="flex items-center justify-between gap-3 text-sm">
          {L("បែបផែនធ្លាក់/អណ្ដែត", "Floating effect")}
          <select value={doc.theme.motion.particles} onChange={(e) => set({ ...doc, theme: { ...doc.theme, motion: { ...doc.theme.motion, particles: e.target.value as "auto" } } })} className="h-9 rounded-lg border border-line-2 bg-white px-2 text-sm">
            <option value="auto">{L("តាមគំរូ", "Template default")}</option>
            <option value="petals">{L("ផ្កាកុលាបធ្លាក់", "Rose petals")}</option>
            <option value="lotus">{L("ផ្កាឈូក", "Lotus petals")}</option>
            <option value="gold">{L("ធូលីមាស", "Gold dust")}</option>
            <option value="stars">{L("ផ្កាយភ្លឺ", "Twinkling stars")}</option>
            <option value="confetti">{L("ក្រដាសពណ៌", "Confetti")}</option>
            <option value="leaves">{L("ស្លឹកឈើ", "Leaves")}</option>
            <option value="none">{L("គ្មាន", "None")}</option>
          </select>
        </label>
        <p className="text-[11px] leading-5 text-muted">{L("មើលចលនាពេញលេញតាមប៊ូតុង «មើល»។ ភ្ញៀវដែលបិទចលនាក្នុងទូរស័ព្ទ នឹងឃើញកំណែស្ងប់។", "See full animation via “Preview”. Guests who turned off motion on their phone get a calm version automatically.")}</p>
      </div>
      <MediaPicker c={ctx} label={L("រូបក្របតំណធៀប", "Link preview cover")} value={doc.shareImage ?? ""}
        onChange={(value) => set({ ...doc, shareImage: value })} />
      <MediaPicker c={ctx} purpose="audio" label={L("ភ្លេងផ្ទៃខាងក្រោយ (ចាប់ផ្ដើមតែពេលភ្ញៀវបើកធៀប)", "Background music (starts only when the guest opens)")} value={doc.theme.music.src}
        onChange={(v) => set({ ...doc, theme: { ...doc.theme, music: { ...doc.theme.music, src: v } } })} />
    </div>
  );

  const [versions, setVersions] = useState<{ id: string; kind: string; createdAt: Date }[] | null>(null);
  const [restoring, startRestore] = useTransition();
  const VersionsPanel = (
    <div className="p-4">
      <p className="mb-3 text-xs text-muted">{L("កំណែនីមួយៗត្រូវបានរក្សាទុកពេលអ្នកផ្សព្វផ្សាយ", "A snapshot is kept every time you publish")}</p>
      {versions === null ? <button className="text-sm text-gold-2 underline" onClick={async () => setVersions(await listVersionsAction(props.eventId))}>{L("ផ្ទុកប្រវត្តិ", "Load history")}</button> : null}
      {versions?.length === 0 ? <p className="text-sm text-muted">{L("មិនទាន់មានកំណែ", "No versions yet")}</p> : null}
      <ul className="space-y-2">
        {versions?.map((v) => (
          <li key={v.id} className="flex items-center justify-between rounded-xl border border-line bg-white px-3 py-2 text-sm">
            <span><span className="font-medium">{v.kind}</span><br /><span className="text-xs text-muted">{new Date(v.createdAt).toLocaleString()}</span></span>
            <button disabled={restoring} className="rounded-full border border-line-2 px-3 py-1 text-xs" onClick={() => {
              if (!window.confirm(L("ស្ដារកំណែនេះជាព្រាង?", "Restore this version into your draft?"))) return;
              startRestore(async () => { await restoreVersionAction(props.eventId, v.id); window.location.reload(); });
            }}>{L("ស្ដារ", "Restore")}</button>
          </li>
        ))}
      </ul>
    </div>
  );

  const PropsPanel = sel ? (
    <div>
      <div className="sticky top-0 z-10 flex items-center justify-between border-b border-line bg-white px-4 py-3">
        <p className="text-sm font-semibold">{SECTION_LABELS[sel.type][props.locale]}</p>
        <label className="flex items-center gap-2 text-xs text-muted"><input type="checkbox" checked={!sel.hidden} onChange={() => ops.toggle(sel.id)} className="accent-[#B68A45]" />{L("បង្ហាញ", "Visible")}</label>
      </div>
      <SectionEditor s={sel} c={ctx} update={(data, key) => updateSection(sel.id, data, key)} />
    </div>
  ) : <p className="p-6 text-center text-sm text-muted">{L("ចុចលើផ្នែកណាមួយក្នុងធៀប ដើម្បីកែ", "Click any part of the invitation to edit it")}</p>;

  const width = device === "tablet" ? 768 : undefined;
  const preview = (
    <Frame title={L("មើលធៀប", "Invitation preview")} className="h-full w-full border-0">
      <InvitationRenderer template={template} doc={doc} event={props.event} mode="editor" locale={previewLocale} selectedId={selected} onSelect={(id) => select(id, true)} />
    </Frame>
  );
  const Canvas = device === "mobile" ? (
    <div ref={frameWrap} className="relative h-full">
      <div className="absolute inset-3 sm:inset-5"><FitDevice finish={finish} statusBg={palette.bg} darkStatus={isDark(palette.bg)}>{preview}</FitDevice></div>
      <div className="absolute bottom-3 right-3 hidden rounded-full bg-white/90 px-2 py-1.5 shadow-sm backdrop-blur lg:block"><FinishPicker value={finish} onChange={setFinish} /></div>
    </div>
  ) : (
    <div ref={frameWrap} className="flex h-full items-start justify-center overflow-auto p-3 sm:p-6">
      <div className="h-full overflow-hidden rounded-xl border border-line bg-white shadow-[0_30px_60px_-30px_rgba(0,0,0,.35)] transition-[width] duration-300" style={{ width: width ?? "100%", maxWidth: "100%" }}>
        {preview}
      </div>
    </div>
  );

  const status = {
    saved: <span className="inline-flex items-center gap-1.5 text-success"><Check className="h-3.5 w-3.5" />{L("បានរក្សាទុក", "Saved")}</span>,
    dirty: <span className="inline-flex items-center gap-1.5 text-muted"><Pencil className="h-3.5 w-3.5" />{L("កំពុងកែ…", "Editing…")}</span>,
    saving: <span className="inline-flex items-center gap-1.5 text-muted"><Loader2 className="h-3.5 w-3.5 animate-spin" />{L("កំពុងរក្សាទុក…", "Saving…")}</span>,
    error: <span className="inline-flex items-center gap-1.5 text-danger" title={saveErr}><CloudOff className="h-3.5 w-3.5" />{L("មិនបានរក្សាទុក", "Not saved")}</span>,
    conflict: <span className="inline-flex items-center gap-1.5 text-warning"><AlertTriangle className="h-3.5 w-3.5" />{L("មានកំណែថ្មីជាង", "Newer version exists")}</span>,
  }[save];

  const iconBtn = "flex h-9 w-9 items-center justify-center rounded-full text-ink-2 hover:bg-black/5 disabled:opacity-30";

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-[#ECE9E3]">
      {/* Toolbar */}
      <header className="flex h-14 shrink-0 items-center gap-2 border-b border-line bg-white px-2 sm:px-3">
        <Link href={`/dashboard/events/${props.eventId}`} className={iconBtn} aria-label={L("ត្រឡប់", "Back")}><ArrowLeft className="h-4 w-4" /></Link>
        <p className="hidden max-w-[180px] truncate text-sm font-semibold md:block">{props.eventTitle}</p>
        <div className="mx-1 hidden h-5 w-px bg-line md:block" />
        <button className={iconBtn} onClick={() => dispatch({ type: "undo" })} disabled={!h.past.length} aria-label="Undo" title="Undo (Ctrl+Z)"><Undo2 className="h-4 w-4" /></button>
        <button className={iconBtn} onClick={() => dispatch({ type: "redo" })} disabled={!h.future.length} aria-label="Redo" title="Redo (Ctrl+Shift+Z)"><Redo2 className="h-4 w-4" /></button>
        <span className="ml-1 hidden text-xs sm:inline">{status}</span>
        <div className="mx-auto hidden items-center rounded-full bg-[#F3F1EC] p-1 lg:flex">
          {([["mobile", Smartphone], ["tablet", Tablet], ["desktop", Monitor]] as const).map(([d, I]) => (
            <button key={d} onClick={() => setDevice(d)} aria-pressed={device === d} className={cn("rounded-full p-1.5", device === d ? "bg-white shadow-sm" : "text-muted")} aria-label={d}><I className="h-4 w-4" /></button>
          ))}
        </div>
        <div className="ml-auto flex items-center gap-1.5">
          <button onClick={() => setPreviewLocale(previewLocale === "km" ? "en" : "km")} className="h-9 rounded-full border border-line-2 px-3 text-xs font-medium">{previewLocale === "km" ? "ខ្មែរ" : "EN"}</button>
          <Link href={`/preview/${props.eventId}`} target="_blank" className="hidden h-9 items-center gap-1.5 rounded-full border border-line-2 px-3 text-sm sm:inline-flex" onClick={() => persist(doc, tplSlug)}><Eye className="h-4 w-4" />{L("មើល", "Preview")}</Link>
          {props.canPublish ? <PublishButton eventId={props.eventId} locale={props.locale} size="sm" label={props.published ? L("ធ្វើបច្ចុប្បន្នភាព", "Update") : L("ផ្សព្វផ្សាយ", "Publish")} /> : null}
        </div>
      </header>

      {save === "conflict" ? (
        <div className="flex flex-wrap items-center gap-3 border-b border-warning/30 bg-warning/10 px-4 py-2 text-sm">
          <AlertTriangle className="h-4 w-4 text-warning" />
          {L("ធៀបនេះត្រូវបានកែពីកន្លែងផ្សេង។ ការកែប្រែរបស់អ្នកមិនទាន់រក្សាទុក។", "This invitation was changed elsewhere. Your edits are not saved yet.")}
          <button className="rounded-full bg-white px-3 py-1 text-xs font-medium" onClick={() => { router.refresh(); window.location.reload(); }}>{L("ផ្ទុកកំណែថ្មី", "Load newer version")}</button>
          <button className="rounded-full bg-ink px-3 py-1 text-xs font-medium text-white" onClick={() => persist(doc, tplSlug, true)}>{L("រក្សាទុករបស់ខ្ញុំជំនួស", "Keep mine")}</button>
        </div>
      ) : null}
      {save === "error" && saveErr ? <div className="border-b border-danger/20 bg-danger/8 px-4 py-2 text-sm text-danger">{saveErr}</div> : null}

      {/* Desktop: 3 panes */}
      <div className="hidden min-h-0 flex-1 lg:grid lg:grid-cols-[280px_1fr_340px]">
        <aside className="flex min-h-0 flex-col border-r border-line bg-[#F8F7F4]">
          <div className="flex gap-1 border-b border-line p-2">
            {([["sections", Layers, L("ផ្នែក", "Sections")], ["theme", Palette, L("រចនា", "Design")], ["versions", HistoryIcon, L("កំណែ", "Versions")]] as const).map(([k, I, label]) => (
              <button key={k} onClick={() => setPanel(k)} className={cn("flex flex-1 items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-medium", panel === k ? "bg-white shadow-sm" : "text-muted hover:text-ink")}><I className="h-3.5 w-3.5" />{label}</button>
            ))}
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto">{panel === "sections" ? SectionsPanel : panel === "theme" ? ThemePanel : VersionsPanel}</div>
        </aside>
        <div className="min-h-0">{Canvas}</div>
        <aside className="min-h-0 overflow-y-auto border-l border-line bg-white">{PropsPanel}</aside>
      </div>

      {/* Mobile: one view at a time */}
      <div className="min-h-0 flex-1 overflow-y-auto bg-white lg:hidden">
        {mobileView === "preview" ? <div className="h-full bg-[#ECE9E3]">{Canvas}</div> : mobileView === "sections" ? SectionsPanel : mobileView === "theme" ? <>{ThemePanel}{VersionsPanel}</> : PropsPanel}
      </div>
      <nav className="grid shrink-0 grid-cols-4 border-t border-line bg-white pb-[env(safe-area-inset-bottom)] lg:hidden">
        {([["preview", Eye, L("មើល", "Preview")], ["sections", Layers, L("ផ្នែក", "Sections")], ["edit", Pencil, L("កែ", "Edit")], ["theme", Palette, L("រចនា", "Design")]] as const).map(([k, I, label]) => (
          <button key={k} onClick={() => setMobileView(k)} className={cn("flex flex-col items-center gap-0.5 py-2 text-[11px]", mobileView === k ? "text-gold-2" : "text-muted")}><I className="h-5 w-5" />{label}</button>
        ))}
      </nav>
      <span className="sr-only" aria-live="polite">{save}</span>
    </div>
  );
}

function SortableRow({ s, label, active, onSelect, onToggle, onDuplicate, onRemove, hideLabel }: { s: Section; label: string; active: boolean; onSelect: () => void; onToggle: () => void; onDuplicate: () => void; onRemove: () => void; hideLabel: string }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: s.id });
  return (
    <li ref={setNodeRef} style={{ transform: CSS.Transform.toString(transform), transition }} className={cn("group flex items-center gap-1 rounded-xl border bg-white pr-1 text-sm", active ? "border-gold ring-2 ring-gold/15" : "border-line", isDragging && "z-10 shadow-lift", s.hidden && "opacity-55")}>
      <button {...attributes} {...listeners} className="cursor-grab touch-none p-2 text-muted active:cursor-grabbing" aria-label={`Reorder ${label}`}><GripVertical className="h-4 w-4" /></button>
      <button onClick={onSelect} className="min-w-0 flex-1 truncate py-2 text-left">{label}</button>
      <button onClick={onToggle} className="rounded-md p-1.5 text-muted hover:bg-black/5" aria-label={hideLabel} title={hideLabel}>{s.hidden ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}</button>
      <button onClick={onDuplicate} className="hidden rounded-md p-1.5 text-muted hover:bg-black/5 group-hover:block" aria-label="Duplicate"><Copy className="h-3.5 w-3.5" /></button>
      <button onClick={onRemove} className="hidden rounded-md p-1.5 text-danger hover:bg-danger/10 group-hover:block" aria-label="Delete"><Trash2 className="h-3.5 w-3.5" /></button>
    </li>
  );
}
