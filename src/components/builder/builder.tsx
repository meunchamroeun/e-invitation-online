"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { DndContext, KeyboardSensor, PointerSensor, closestCenter, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { SortableContext, arrayMove, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Tooltip } from "@base-ui/react/tooltip";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { QueryClient, QueryClientProvider, useQuery, useQueryClient } from "@tanstack/react-query";
import { createStore, useStore } from "zustand";
import {
  ArrowLeft, Ban, Check, ChevronDown, CloudOff, Copy, Eye, EyeOff, Flower2, GripVertical, History as HistoryIcon, Layers, Leaf, Loader2, Monitor, Music, Palette, PartyPopper, Pencil, Plus, Redo2, RotateCcw, Smartphone, Sparkles, Star, Tablet, Trash2, Undo2, AlertTriangle,
} from "lucide-react";
import type { InvitationDoc, Section, SectionType } from "@/features/invitations/doc";
import { SECTION_LABELS, SECTION_TYPES, blankSection } from "@/features/invitations/doc";
import { TEMPLATES, getTemplate, type KhmerFont, type LatinFont, type Palette as Pal } from "@/features/templates/registry";
import { saveDraftAction, listVersionsAction, restoreVersionAction } from "@/features/events/actions";
import { InvitationRenderer } from "@/components/invitation/renderer";
import type { EventInfo } from "@/components/invitation/sections";
import { FluidThumb } from "@/components/marketing/template-thumb";
import { PublishButton } from "@/components/dashboard/publish-button";
import { Frame } from "./frame";
import { FitDevice, FinishPicker, type Finish } from "@/components/ui/device-frame";
import { isDark, KHMER_FONT, LATIN_FONT } from "@/components/invitation/theme";
import { historyReducer, initHistory, type HistoryAction } from "./history";
import { SectionEditor, MediaPicker, type EditorCtx, type MediaItem } from "./section-editor";
import { cn } from "@/lib/utils";

type SaveState = "saved" | "dirty" | "saving" | "error" | "conflict";
type Device = "mobile" | "tablet" | "desktop";

type BuilderProps = {
  eventId: string; eventTitle: string; initialDoc: InvitationDoc; initialRevision: number; templateSlug: string; templateSlugs: string[]; event: EventInfo;
  media: MediaItem[]; locale: "km" | "en"; giftLocked: boolean; canEditGift: boolean; canPublish: boolean; published: boolean;
};

export function Builder(props: BuilderProps) {
  const [client] = useState(() => new QueryClient());
  return <QueryClientProvider client={client}><BuilderEditor key={props.eventId} {...props} /></QueryClientProvider>;
}

function BuilderEditor(props: BuilderProps) {
  const L = (km: string, en: string) => (props.locale === "km" ? km : en);
  const router = useRouter();
  const [history] = useState(() => createStore(() => initHistory(props.initialDoc)));
  const doc = useStore(history, (state) => state.present);
  const canUndo = useStore(history, (state) => state.past.length > 0);
  const canRedo = useStore(history, (state) => state.future.length > 0);
  const dispatch = useCallback((action: HistoryAction) => history.setState((state) => historyReducer(state, action), true), [history]);
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

  const set = useCallback((next: InvitationDoc, key?: string) => dispatch({ type: "set", doc: next, key }), [dispatch]);
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
  }, [doc, tplSlug, persist, dispatch]);

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

  const adminTracksQuery = useQuery({
    queryKey: ["admin-music-tracks"],
    queryFn: async () => {
      const r = await fetch("/api/music");
      if (!r.ok) return [] as Array<{ id: string; title: string; url: string }>;
      const j = (await r.json()) as { tracks?: Array<{ id: string; title: string; url: string }> };
      return j.tracks ?? [];
    },
    enabled: panel === "theme" || mobileView === "theme",
    staleTime: 60_000,
  });

  const selectedAdminTrack = adminTracksQuery.data?.find((tr) => tr.url === doc.theme.music.src);

  const ThemePanel = (
    <div className="space-y-3.5 bg-[#F8F6F1] p-3.5">
      <div className="space-y-3 rounded-2xl border border-line bg-white p-3.5 shadow-xs">
        <MediaPicker c={ctx} label={L("រូបក្របតំណធៀប (Share Preview)", "Link preview cover")} value={doc.shareImage ?? ""}
          onChange={(value) => set({ ...doc, shareImage: value })} />
      </div>

      <div className="space-y-3 rounded-2xl border border-line bg-white p-3.5 shadow-xs">
        <MediaPicker c={ctx} purpose="audio" label={L("ភ្លេងផ្ទៃខាងក្រោយ (MP3)", "Background music (MP3)")} value={doc.theme.music.src}
          onChange={(v) => set({ ...doc, theme: { ...doc.theme, music: { ...doc.theme.music, src: v } } })} />
        {(adminTracksQuery.data?.length ?? 0) > 0 ? (
          <div className="border-t border-line pt-2.5">
            <p className="mb-1.5 text-[11px] font-medium text-muted">{L("ឬជ្រើសភ្លេងពីប្រព័ន្ធ (Admin)", "Or choose from Admin library")}</p>
            <DropdownMenu.Root>
              <DropdownMenu.Trigger asChild>
                <button
                  type="button"
                  className="flex h-9 w-full items-center justify-between gap-2 rounded-xl border border-line-2 bg-paper/50 px-3 text-left text-xs font-medium text-ink transition-colors hover:border-gold hover:bg-white focus:border-gold focus:outline-none"
                >
                  <span className="flex min-w-0 items-center gap-2">
                    <Music className="h-3.5 w-3.5 shrink-0 text-gold-2" />
                    <span className="truncate" dir="auto">
                      {selectedAdminTrack ? selectedAdminTrack.title : L("ជ្រើសរើសបទភ្លេង...", "Select a song...")}
                    </span>
                  </span>
                  <ChevronDown className="h-3.5 w-3.5 shrink-0 text-muted" />
                </button>
              </DropdownMenu.Trigger>
              <DropdownMenu.Portal>
                <DropdownMenu.Content
                  sideOffset={6}
                  align="start"
                  className="z-50 w-[260px] max-h-60 overflow-y-auto rounded-2xl border border-line bg-white p-1.5 shadow-xl animate-[fade-up_0.18s_ease-out]"
                >
                  {adminTracksQuery.data!.map((tr) => {
                    const active = doc.theme.music.src === tr.url;
                    return (
                      <DropdownMenu.Item
                        key={tr.id}
                        onSelect={() => set({ ...doc, theme: { ...doc.theme, music: { src: tr.url, title: tr.title } } }, "music.preset")}
                        className={cn(
                          "flex cursor-pointer items-center justify-between gap-2 rounded-xl px-2.5 py-2 text-xs outline-none transition-colors",
                          active ? "bg-gold-soft/50 font-medium text-ink" : "text-ink-2 hover:bg-paper focus:bg-paper",
                        )}
                      >
                        <span className="flex min-w-0 items-center gap-2">
                          <Music className="h-3.5 w-3.5 shrink-0 text-gold-2" />
                          <span className="truncate" dir="auto">{tr.title}</span>
                        </span>
                        {active ? <Check className="h-3.5 w-3.5 shrink-0 text-gold-2" /> : null}
                      </DropdownMenu.Item>
                    );
                  })}
                </DropdownMenu.Content>
              </DropdownMenu.Portal>
            </DropdownMenu.Root>
          </div>
        ) : null}
      </div>

      <div className="rounded-2xl border border-line bg-white p-3.5 shadow-xs">
        <div className="mb-2.5 flex items-center justify-between gap-2">
          <p className="text-xs font-semibold text-ink">{L("គំរូធៀប", "Template")}</p>
          <span className="text-[11px] text-muted">{L("រក្សាទុកខ្លឹមសារដដែល", "Keeps your content")}</span>
        </div>
        <div className="grid max-h-[340px] grid-cols-2 gap-2.5 overflow-y-auto pr-1">
          {TEMPLATES.filter((t) => props.templateSlugs.includes(t.slug) || t.slug === tplSlug).map((t) => {
            const active = tplSlug === t.slug;
            return (
              <button
                key={t.slug}
                type="button"
                onClick={() => setTplSlug(t.slug)}
                title={t.name[props.locale]}
                aria-pressed={active}
                className={cn(
                  "group relative flex flex-col overflow-hidden rounded-xl border-2 bg-paper/40 text-left transition-all",
                  active ? "border-gold ring-2 ring-gold/25" : "border-line hover:border-gold/50",
                )}
              >
                <div className="relative w-full overflow-hidden">
                  <FluidThumb slug={t.slug} locale={props.locale} />
                  {active ? (
                    <span className="absolute right-1.5 top-1.5 grid size-5 place-items-center rounded-full bg-gold text-white shadow">
                      <Check className="h-3 w-3" />
                    </span>
                  ) : null}
                </div>
                <span className={cn("line-clamp-2 px-2 py-1.5 text-[11px] leading-snug font-medium", active ? "bg-gold-soft/40 text-ink" : "bg-white text-ink-2")} dir="auto">
                  {t.name[props.locale]}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="rounded-2xl border border-line bg-white p-3.5 shadow-xs">
        <div className="mb-2.5 flex items-center justify-between">
          <p className="text-xs font-semibold text-ink">{L("ពណ៌រចនា", "Colour palette")}</p>
          {Object.keys(doc.theme.palette).length ? (
            <button type="button" className="inline-flex items-center gap-1 rounded-full bg-paper px-2.5 py-1 text-[11px] font-medium text-ink-2 hover:text-ink" onClick={() => set({ ...doc, theme: { ...doc.theme, palette: {} } })}>
              <RotateCcw className="h-3 w-3" />{L("ដើម", "Reset")}
            </button>
          ) : null}
        </div>
        <div className="mb-3 flex flex-wrap gap-1.5">
          {[
            { label: L("មាស", "Gold"), pal: { primary: "#B68A45", accent: "#E3B868" } },
            { label: L("ក្រហមទុំ", "Burgundy"), pal: { primary: "#7A1F32", accent: "#B8893E" } },
            { label: L("ខៀវចាស់", "Navy"), pal: { bg: "#0E1630", surface: "#16213F", ink: "#F2E9D8", muted: "#AFA68F", primary: "#CFA855", accent: "#F3D98B", onPrimary: "#0E1630" } },
            { label: L("ភ្លុកដំរី", "Ivory"), pal: { bg: "#FAF5EE", surface: "#FFFFFF", ink: "#3D2B1F", muted: "#8A7355", primary: "#B4813F", accent: "#D09D5A", onPrimary: "#FFFFFF" } },
          ].map((preset) => (
            <button
              key={preset.label}
              type="button"
              onClick={() => set({ ...doc, theme: { ...doc.theme, palette: { ...doc.theme.palette, ...preset.pal } } }, "palette.preset")}
              className="inline-flex items-center gap-1.5 rounded-full border border-line-2 bg-paper/60 px-2.5 py-1 text-[11px] font-medium text-ink-2 transition-colors hover:border-gold hover:bg-white"
            >
              <span className="h-2.5 w-2.5 rounded-full" style={{ background: preset.pal.primary }} />
              {preset.label}
            </button>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-1.5">
          {(Object.keys(palette) as (keyof Pal)[]).map((k) => (
            <label key={k} className="flex cursor-pointer items-center gap-2 rounded-xl border border-line bg-paper/40 p-1.5 pr-2 text-xs transition-colors hover:bg-white">
              <input type="color" value={palette[k]} onChange={(e) => set({ ...doc, theme: { ...doc.theme, palette: { ...doc.theme.palette, [k]: e.target.value } } }, `palette.${k}`)} className="h-6 w-6 shrink-0 cursor-pointer rounded-md border-0 bg-transparent p-0" />
              <span className="truncate text-ink-2">{({ bg: L("ផ្ទៃ", "Background"), surface: L("កាត", "Surface"), ink: L("អក្សរ", "Text"), muted: L("អក្សររង", "Muted"), primary: L("ចម្បង", "Primary"), accent: L("បន្ថែម", "Accent"), onPrimary: L("លើចម្បង", "On primary") } as Record<string, string>)[k]}</span>
            </label>
          ))}
        </div>
      </div>

      <div className="space-y-3 rounded-2xl border border-line bg-white p-3.5 shadow-xs">
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold text-ink">{L("ពុម្ពអក្សរ (ខ្មែរ & EN)", "Fonts (Khmer & EN)")}</p>
          {doc.theme.fonts && Object.keys(doc.theme.fonts).length ? (
            <button type="button" className="inline-flex items-center gap-1 rounded-full bg-paper px-2.5 py-1 text-[11px] font-medium text-ink-2 hover:text-ink" onClick={() => set({ ...doc, theme: { ...doc.theme, fonts: undefined } })}>
              <RotateCcw className="h-3 w-3" />{L("ដើម", "Reset")}
            </button>
          ) : null}
        </div>
        {(() => {
          const khmerFonts: { id: KhmerFont; name: string }[] = [
            { id: "moul", name: "Moul (មូល)" },
            { id: "moulpali", name: "Moulpali (មូលប៉ាលី)" },
            { id: "dangrek", name: "Dangrek (ដងរែក)" },
            { id: "kantumruy", name: "Kantumruy Pro" },
            { id: "battambang", name: "Battambang (បាត់ដំបង)" },
            { id: "notoSerif", name: "Noto Serif Khmer" },
          ];
          const latinFonts: { id: LatinFont; name: string }[] = [
            { id: "cormorant", name: "Cormorant Garamond" },
            { id: "playfair", name: "Playfair Display" },
            { id: "pinyon", name: "Pinyon Script" },
            { id: "inter", name: "Inter" },
          ];
          const curDisplay = doc.theme.fonts?.display ?? template.fonts.display;
          const curBody = doc.theme.fonts?.body ?? template.fonts.body;
          const curLatin = doc.theme.fonts?.latin ?? template.fonts.latin;
          return (
            <div className="space-y-2.5">
              {([
                {
                  label: L("ពុម្ពអក្សរខ្មែរ (ចំណងជើង)", "Khmer Heading Font"),
                  value: curDisplay,
                  options: khmerFonts,
                  sample: "សិរីមង្គលអាពាហ៍ពិពាហ៍",
                  fontMap: KHMER_FONT,
                  onPick: (id: string) => set({ ...doc, theme: { ...doc.theme, fonts: { ...doc.theme.fonts, display: id as KhmerFont } } }, "fonts.display"),
                },
                {
                  label: L("ពុម្ពអក្សរខ្មែរ (អត្ថបទ)", "Khmer Body Font"),
                  value: curBody,
                  options: khmerFonts,
                  sample: "សូមគោរពអញ្ជើញភ្ញៀវកិត្តិយស",
                  fontMap: KHMER_FONT,
                  onPick: (id: string) => set({ ...doc, theme: { ...doc.theme, fonts: { ...doc.theme.fonts, body: id as KhmerFont } } }, "fonts.body"),
                },
                {
                  label: L("ពុម្ពអក្សរអង់គ្លេស (EN)", "English Font"),
                  value: curLatin,
                  options: latinFonts,
                  sample: "Together with their families",
                  fontMap: LATIN_FONT,
                  onPick: (id: string) => set({ ...doc, theme: { ...doc.theme, fonts: { ...doc.theme.fonts, latin: id as LatinFont } } }, "fonts.latin"),
                },
              ] as const).map((field) => {
                const selected = field.options.find((o) => o.id === field.value) ?? field.options[0];
                return (
                  <div key={field.label}>
                    <p className="mb-1 text-[11px] font-medium text-muted">{field.label}</p>
                    <DropdownMenu.Root>
                      <DropdownMenu.Trigger asChild>
                        <button
                          type="button"
                          className="flex h-10 w-full items-center justify-between gap-2 rounded-xl border border-line-2 bg-paper/50 px-3 text-left text-xs text-ink transition-colors hover:border-gold hover:bg-white focus:border-gold focus:outline-none"
                        >
                          <span className="truncate" style={{ fontFamily: field.fontMap[selected.id as keyof typeof field.fontMap] }}>
                            {field.sample} <span className="ml-1 text-[10px] text-muted" style={{ fontFamily: "var(--font-sans)" }}>· {selected.name}</span>
                          </span>
                          <ChevronDown className="h-3.5 w-3.5 shrink-0 text-muted" />
                        </button>
                      </DropdownMenu.Trigger>
                      <DropdownMenu.Portal>
                        <DropdownMenu.Content
                          sideOffset={6}
                          align="start"
                          className="z-50 w-[268px] max-h-64 overflow-y-auto rounded-2xl border border-line bg-white p-1.5 shadow-xl animate-[fade-up_0.18s_ease-out]"
                        >
                          {field.options.map((opt) => {
                            const active = opt.id === field.value;
                            return (
                              <DropdownMenu.Item
                                key={opt.id}
                                onSelect={() => field.onPick(opt.id)}
                                className={cn(
                                  "flex cursor-pointer items-center justify-between gap-2 rounded-xl px-2.5 py-2 outline-none transition-colors",
                                  active ? "bg-gold-soft/50 text-ink" : "text-ink-2 hover:bg-paper focus:bg-paper",
                                )}
                              >
                                <div className="min-w-0">
                                  <p className="truncate text-sm" style={{ fontFamily: field.fontMap[opt.id as keyof typeof field.fontMap] }}>
                                    {field.sample}
                                  </p>
                                  <p className="text-[10px] text-muted">{opt.name}</p>
                                </div>
                                {active ? <Check className="h-3.5 w-3.5 shrink-0 text-gold-2" /> : null}
                              </DropdownMenu.Item>
                            );
                          })}
                        </DropdownMenu.Content>
                      </DropdownMenu.Portal>
                    </DropdownMenu.Root>
                  </div>
                );
              })}
            </div>
          );
        })()}
      </div>

      <div className="space-y-3 rounded-2xl border border-line bg-white p-3.5 shadow-xs">
        <p className="text-xs font-semibold text-ink">{L("ជម្រើសទូទៅ", "General options")}</p>
        {([
          ["envelope", L("ចលនាបើកស្រោមសំបុត្រ", "Envelope opening animation")],
          ["khmerNumerals", L("ប្រើលេខខ្មែរ (០១២៣)", "Use Khmer numerals (០១២៣)")],
        ] as const).map(([k, label]) => {
          const on = doc.theme[k];
          return (
            <button
              key={k}
              type="button"
              role="switch"
              aria-checked={on}
              onClick={() => set({ ...doc, theme: { ...doc.theme, [k]: !on } })}
              className="flex w-full items-center justify-between gap-3 text-left text-xs font-medium text-ink-2"
            >
              <span>{label}</span>
              <span className={cn("relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors", on ? "bg-gold" : "bg-black/15")}>
                <span className={cn("inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform", on ? "translate-x-4" : "translate-x-0.5")} />
              </span>
            </button>
          );
        })}
        <label className="flex items-center justify-between gap-3 pt-1 text-xs font-medium text-ink-2">
          <span>{L("ភាសាដើមរបស់ធៀប", "Default language")}</span>
          <div className="inline-flex rounded-xl bg-[#EFECE6] p-0.5">
            {(["km", "en"] as const).map((loc) => (
              <button
                key={loc}
                type="button"
                onClick={() => set({ ...doc, defaultLocale: loc })}
                className={cn("rounded-lg px-2.5 py-1 text-[11px] font-medium transition-all", doc.defaultLocale === loc ? "bg-white text-ink shadow-xs" : "text-muted")}
              >
                {loc === "km" ? "ខ្មែរ" : "EN"}
              </button>
            ))}
          </div>
        </label>
      </div>

      <div className="space-y-3 rounded-2xl border border-line bg-white p-3.5 shadow-xs">
        <p className="text-xs font-semibold text-ink">{L("ចលនា & បែបផែន", "Animation & effects")}</p>
        <div className="grid grid-cols-3 gap-1 rounded-xl bg-[#EFECE6] p-1">
          {(["full", "subtle", "off"] as const).map((lv) => (
            <button key={lv} type="button" onClick={() => set({ ...doc, theme: { ...doc.theme, motion: { ...doc.theme.motion, level: lv } } })} aria-pressed={doc.theme.motion.level === lv}
              className={cn("rounded-lg py-1.5 text-xs transition-all", doc.theme.motion.level === lv ? "bg-white font-medium text-ink shadow-xs" : "text-muted")}>
              {{ full: L("ពេញ", "Full"), subtle: L("ស្រាល", "Subtle"), off: L("បិទ", "Off") }[lv]}
            </button>
          ))}
        </div>
        <div>
          <p className="mb-1.5 text-[11px] font-medium text-muted">{L("បែបផែនអណ្ដែត", "Floating particles")}</p>
          <div className="grid grid-cols-2 gap-1.5">
            {([
              ["auto", L("តាមគំរូ", "Auto"), Sparkles],
              ["petals", L("ផ្កាកុលាប", "Petals"), Flower2],
              ["lotus", L("ផ្កាឈូក", "Lotus"), Flower2],
              ["gold", L("ធូលីមាស", "Gold dust"), Sparkles],
              ["stars", L("ផ្កាយភ្លឺ", "Stars"), Star],
              ["confetti", L("ក្រដាសពណ៌", "Confetti"), PartyPopper],
              ["leaves", L("ស្លឹកឈើ", "Leaves"), Leaf],
              ["none", L("គ្មាន", "None"), Ban],
            ] as const).map(([val, label, Icon]) => {
              const on = doc.theme.motion.particles === val;
              return (
                <button
                  key={val}
                  type="button"
                  onClick={() => set({ ...doc, theme: { ...doc.theme, motion: { ...doc.theme.motion, particles: val } } })}
                  className={cn(
                    "flex items-center gap-1.5 rounded-xl border px-2.5 py-1.5 text-left text-[11px] font-medium transition-all",
                    on ? "border-gold bg-gold-soft/45 text-ink shadow-xs" : "border-line bg-paper/40 text-ink-2 hover:bg-white",
                  )}
                >
                  <Icon className={cn("h-3.5 w-3.5 shrink-0", on ? "text-gold-2" : "text-muted")} />
                  <span className="truncate">{label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );

  const queryClient = useQueryClient();
  const versionsKey = ["invitation-versions", props.eventId] as const;
  const versions = useQuery({
    queryKey: versionsKey, queryFn: () => listVersionsAction(props.eventId),
    enabled: panel === "versions", retry: false,
  });
  const [restoring, startRestore] = useTransition();
  const VersionsPanel = (
    <div className="p-4">
      <p className="mb-3 text-xs text-muted">{L("កំណែនីមួយៗត្រូវបានរក្សាទុកពេលអ្នកផ្សព្វផ្សាយ", "A snapshot is kept every time you publish")}</p>
      {versions.isLoading ? <p role="status" className="text-sm text-muted">{L("កំពុងផ្ទុកប្រវត្តិ…", "Loading history…")}</p> : null}
      {versions.isError ? (
        <div className="text-sm">
          <p role="alert" className="text-danger">{L("មិនអាចផ្ទុកប្រវត្តិបានទេ", "Couldn’t load version history")}</p>
          <button type="button" className="mt-2 text-gold-2 underline" onClick={() => void versions.refetch()}>{L("ព្យាយាមម្ដងទៀត", "Try again")}</button>
        </div>
      ) : null}
      {versions.data?.length === 0 ? <p className="text-sm text-muted">{L("មិនទាន់មានកំណែ", "No versions yet")}</p> : null}
      <ul className="space-y-2">
        {versions.data?.map((v) => (
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
        <button className={iconBtn} onClick={() => dispatch({ type: "undo" })} disabled={!canUndo} aria-label="Undo" title="Undo (Ctrl+Z)"><Undo2 className="h-4 w-4" /></button>
        <button className={iconBtn} onClick={() => dispatch({ type: "redo" })} disabled={!canRedo} aria-label="Redo" title="Redo (Ctrl+Shift+Z)"><Redo2 className="h-4 w-4" /></button>
        <span className="ml-1 hidden text-xs sm:inline">{status}</span>
        <div className="mx-auto hidden items-center rounded-full bg-[#F3F1EC] p-1 lg:flex">
          <Tooltip.Provider>
            {([
              ["mobile", Smartphone, L("មើលលើទូរសព្ទ", "Mobile preview")],
              ["tablet", Tablet, L("មើលលើថេប្លេត", "Tablet preview")],
              ["desktop", Monitor, L("មើលលើកុំព្យូទ័រ", "Desktop preview")],
            ] as const).map(([d, I, label]) => (
              <Tooltip.Root key={d}>
                <Tooltip.Trigger type="button" onClick={() => setDevice(d)} aria-pressed={device === d} aria-label={label}
                  className={cn("rounded-full p-1.5", device === d ? "bg-white shadow-sm" : "text-muted")}><I className="h-4 w-4" /></Tooltip.Trigger>
                <Tooltip.Portal>
                  <Tooltip.Positioner side="bottom" sideOffset={7} className="z-[60]">
                    <Tooltip.Popup className="rounded-md bg-ink px-2 py-1 text-xs text-white">{label}</Tooltip.Popup>
                  </Tooltip.Positioner>
                </Tooltip.Portal>
              </Tooltip.Root>
            ))}
          </Tooltip.Provider>
        </div>
        <div className="ml-auto flex items-center gap-1.5">
          <button onClick={() => setPreviewLocale(previewLocale === "km" ? "en" : "km")} className="h-9 rounded-full border border-line-2 px-3 text-xs font-medium">{previewLocale === "km" ? "ខ្មែរ" : "EN"}</button>
          <Link href={`/preview/${props.eventId}`} target="_blank" className="hidden h-9 items-center gap-1.5 rounded-full border border-line-2 px-3 text-sm sm:inline-flex" onClick={() => persist(doc, tplSlug)}><Eye className="h-4 w-4" />{L("មើល", "Preview")}</Link>
          {props.canPublish ? <PublishButton eventId={props.eventId} locale={props.locale} size="sm"
            onPublished={() => void queryClient.invalidateQueries({ queryKey: versionsKey })}
            label={props.published ? L("ធ្វើបច្ចុប្បន្នភាព", "Update") : L("ផ្សព្វផ្សាយ", "Publish")} /> : null}
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
