"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { Eye, Search, SlidersHorizontal, X } from "lucide-react";
import type { MarketTemplate } from "@/features/templates/queries";
import { EVENT_TYPES } from "@/features/templates/registry";
import type { Dictionary } from "@/i18n/dictionaries";
import { TemplateThumb } from "./template-thumb";
import { Badge, buttonClass } from "@/components/ui";
import { cn } from "@/lib/utils";

const STYLES: Record<string, { km: string; en: string }> = {
  traditional: { km: "ប្រពៃណី", en: "Traditional" }, luxury: { km: "ប្រណិត", en: "Luxury" }, modern: { km: "ទំនើប", en: "Modern" },
  minimal: { km: "សាមញ្ញ", en: "Minimal" }, floral: { km: "ផ្កា", en: "Floral" }, festive: { km: "សប្បាយ", en: "Festive" }, solemn: { km: "ស្ងប់ស្ងាត់", en: "Solemn" },
};
const COLORS: Record<string, string> = { red: "#8E1B1B", gold: "#B68A45", ivory: "#EFE4D0", navy: "#16213F", pink: "#E7B9B5", green: "#1F5A45", black: "#111", brown: "#7B4A1E", white: "#fff", saffron: "#D98B1E", purple: "#6F427F" };

export function TemplateMarket({ items, locale, t, initialType, inDashboard = false }: {
  items: MarketTemplate[]; locale: "km" | "en"; t: Dictionary["templates"]; initialType: string; inDashboard?: boolean;
}) {
  const [q, setQ] = useState("");
  const [type, setType] = useState(initialType);
  const [style, setStyle] = useState("all");
  const [color, setColor] = useState("all");
  const [tier, setTier] = useState("all");
  const [sort, setSort] = useState<"popular" | "new">("popular");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const L = (x: { km: string; en: string }) => (locale === "km" ? x.km : x.en);

  const types = useMemo(() => EVENT_TYPES.filter((e) => items.some((i) => i.category === e.value)), [items]);
  const countsByType = useMemo(() => {
    const map: Record<string, number> = { all: items.length };
    for (const i of items) map[i.category] = (map[i.category] ?? 0) + 1;
    return map;
  }, [items]);
  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    return items
      .filter((i) => type === "all" || i.category === type)
      .filter((i) => style === "all" || i.style === style)
      .filter((i) => color === "all" || i.color === color)
      .filter((i) => tier === "all" || i.tier === tier)
      .filter((i) => !s || `${i.name.km} ${i.name.en} ${i.description.km} ${i.description.en}`.toLowerCase().includes(s))
      .sort((a, b) => (sort === "popular" ? b.popularity - a.popularity : b.createdAt.localeCompare(a.createdAt)));
  }, [items, q, type, style, color, tier, sort]);
  const active = [style, color, tier].filter((x) => x !== "all").length + (type !== "all" ? 1 : 0) + (q ? 1 : 0);
  const reset = () => { setQ(""); setType("all"); setStyle("all"); setColor("all"); setTier("all"); };

  const chip = (on: boolean) => cn(
    "shrink-0 rounded-full border px-3.5 py-1.5 text-sm font-medium transition-all",
    on ? "border-ink bg-ink text-white shadow-sm" : "border-line-2 bg-white text-ink-2 hover:border-ink/40",
  );
  const tabBtn = (on: boolean) => cn(
    "flex shrink-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-xl px-3.5 py-2 text-sm font-medium transition-all lg:flex-1",
    on
      ? "bg-white text-ink shadow-sm ring-1 ring-black/5"
      : "text-ink-2 hover:bg-white/60 hover:text-ink",
  );
  const previewTarget = inDashboard ? { target: "_blank", rel: "noopener noreferrer" } : {};

  return (
    <div>
      <div className={cn("min-w-0 bg-paper/95 py-3", inDashboard
        ? "rounded-2xl border border-line-2 px-3"
        : "sticky top-16 z-30 -mx-4 border-b border-line px-4 backdrop-blur sm:mx-0 sm:rounded-2xl sm:border sm:px-4")}>
        <div className="flex items-center gap-2">
          <div className="relative min-w-0 flex-1">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t.search} aria-label={t.search} className="h-11 w-full rounded-xl border border-line-2 bg-white pl-10 pr-4 text-[15px] focus:border-gold focus:outline-none focus:ring-4 focus:ring-gold/15" />
          </div>
          <button onClick={() => setFiltersOpen(!filtersOpen)} className={cn(buttonClass("outline", "md"), "h-11 rounded-xl")} aria-label={t.filterStyle} aria-expanded={filtersOpen}>
            <SlidersHorizontal className="h-4 w-4" /><span className="hidden sm:inline">{t.filterStyle}</span>{active ? <Badge tone="dark" className="!px-1.5">{active}</Badge> : null}
          </button>
          <select value={sort} onChange={(e) => setSort(e.target.value as "popular" | "new")} aria-label={t.sort} className="hidden h-11 rounded-xl border border-line-2 bg-white px-4 text-sm sm:block">
            <option value="popular">{t.sortPopular}</option>
            <option value="new">{t.sortNew}</option>
          </select>
        </div>
        <div
          role="tablist"
          aria-label={t.all}
          className="mt-3 flex w-full items-center gap-1 overflow-x-auto rounded-2xl bg-[#efeae1] p-1 [scrollbar-width:none]"
        >
          <button role="tab" aria-selected={type === "all"} className={tabBtn(type === "all")} onClick={() => setType("all")}>
            <span>{t.all}</span>
            <span className={cn("rounded-full px-1.5 py-0.5 text-[11px] tabular-nums", type === "all" ? "bg-ink/10 text-ink" : "bg-black/5 text-muted")}>
              {countsByType.all}
            </span>
          </button>
          {types.map((e) => (
            <button key={e.value} role="tab" aria-selected={type === e.value} className={tabBtn(type === e.value)} onClick={() => setType(e.value)}>
              <span>{L(e.label)}</span>
              <span className={cn("rounded-full px-1.5 py-0.5 text-[11px] tabular-nums", type === e.value ? "bg-ink/10 text-ink" : "bg-black/5 text-muted")}>
                {countsByType[e.value] ?? 0}
              </span>
            </button>
          ))}
        </div>
        {filtersOpen ? (
          <div className="mt-3 grid gap-4 border-t border-line pt-4 sm:grid-cols-3">
            <div>
              <p className="mb-2 text-xs font-medium text-muted">{t.filterStyle}</p>
              <div className="flex flex-wrap gap-1.5">
                <button className={chip(style === "all")} onClick={() => setStyle("all")}>{t.all}</button>
                {Object.entries(STYLES).filter(([k]) => items.some((i) => i.style === k)).map(([k, v]) => <button key={k} className={chip(style === k)} onClick={() => setStyle(k)}>{L(v)}</button>)}
              </div>
            </div>
            <div>
              <p className="mb-2 text-xs font-medium text-muted">{t.filterColor}</p>
              <div className="flex flex-wrap gap-2">
                <button className={chip(color === "all")} onClick={() => setColor("all")}>{t.all}</button>
                {Object.entries(COLORS).filter(([k]) => items.some((i) => i.color === k)).map(([k, v]) => (
                  <button key={k} onClick={() => setColor(k)} aria-label={k} aria-pressed={color === k} title={k} className={cn("h-8 w-8 rounded-full border-2 transition-transform", color === k ? "scale-110 border-ink" : "border-white shadow-[0_0_0_1px_#ddd8cf]")} style={{ background: v }} />
                ))}
              </div>
            </div>
            <div>
              <p className="mb-2 text-xs font-medium text-muted">{t.filterTier}</p>
              <div className="flex flex-wrap gap-1.5">
                {(["all", "free", "premium"] as const).map((k) => <button key={k} className={chip(tier === k)} onClick={() => setTier(k)}>{t[k]}</button>)}
              </div>
            </div>
          </div>
        ) : null}
      </div>

      <div className="mt-6 flex items-center justify-between text-sm text-muted">
        <span>{filtered.length} {t.count}</span>
        {active ? <button onClick={reset} className="inline-flex items-center gap-1 hover:text-ink"><X className="h-3.5 w-3.5" />{t.reset}</button> : null}
      </div>

      {filtered.length ? (
        <div className={cn("mt-4 grid grid-cols-2 gap-x-4 gap-y-6 sm:grid-cols-3 sm:gap-x-5 lg:grid-cols-4 xl:grid-cols-5", inDashboard && "gap-x-3 2xl:grid-cols-6")}>
          {filtered.map((it) => (
            <article key={it.slug} className="group min-w-0">
              <div className="relative overflow-hidden rounded-[1.4rem] border border-line bg-white p-1.5 shadow-soft transition-[transform,box-shadow] duration-500 group-hover:-translate-y-1 group-hover:shadow-lift">
                <Link href={`/templates/${it.slug}`} {...previewTarget} className="block overflow-hidden rounded-[1.05rem]" aria-label={`${t.preview}: ${L(it.name)}`}>
                  <ThumbFill slug={it.slug} locale={locale} />
                </Link>
                <div className="absolute left-3 top-3 flex gap-1">
                  {it.tier === "premium" ? <Badge tone="dark">★ {t.premium}</Badge> : <Badge className="bg-white/90">{t.free}</Badge>}
                </div>
                {!inDashboard ? <div className="pointer-events-none absolute inset-x-1.5 bottom-1.5 hidden translate-y-2 gap-2 rounded-b-[1.05rem] bg-gradient-to-t from-black/60 to-transparent p-3 pt-10 opacity-0 transition-all duration-300 group-hover:pointer-events-auto group-hover:translate-y-0 group-hover:opacity-100 group-focus-within:pointer-events-auto group-focus-within:translate-y-0 group-focus-within:opacity-100 md:flex">
                  <Link href={`/templates/${it.slug}`} className={cn(buttonClass("outline", "sm"), "flex-1")}><Eye className="h-3.5 w-3.5" />{t.preview}</Link>
                  <Link href={`/dashboard/events/new?template=${it.slug}`} className={cn(buttonClass("gold", "sm"), "flex-1")}>{t.use}</Link>
                </div> : null}
              </div>
              <div className="mt-3 px-1">
                <h3 className="text-[15px] font-semibold [overflow-wrap:anywhere]">{L(it.name)}</h3>
                <p className="line-clamp-2 text-xs leading-6 text-muted">{L(it.description)}</p>
                <div className={cn("mt-2 flex gap-2", inDashboard ? "flex-col sm:flex-row sm:flex-wrap" : "md:hidden")}>
                  <Link href={`/templates/${it.slug}`} {...previewTarget} className={cn(buttonClass("outline", "sm"), "flex-1 px-2", inDashboard && "h-auto min-h-9 whitespace-normal text-center")}>{t.preview}</Link>
                  <Link href={`/dashboard/events/new?template=${it.slug}`} className={cn(buttonClass("primary", "sm"), "flex-1 px-2", inDashboard && "h-auto min-h-9 whitespace-normal text-center")}>{t.use}</Link>
                </div>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="mt-10 rounded-2xl border border-dashed border-line-2 p-12 text-center">
          <p className="text-muted">{t.none}</p>
          <button onClick={reset} className={cn(buttonClass("outline", "sm"), "mt-4")}>{t.reset}</button>
        </div>
      )}
    </div>
  );
}

/** Fills the card width by measuring it (ResizeObserver) and rendering the thumb at that width. */
function ThumbFill({ slug, locale }: { slug: string; locale: "km" | "en" }) {
  const ref = useRef<HTMLDivElement>(null);
  const [w, setW] = useState(260);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setW(Math.round(e.contentRect.width)));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return (
    <div ref={ref} className="relative aspect-[3/4] w-full overflow-hidden">
      <TemplateThumb slug={slug} locale={locale} width={w} />
    </div>
  );
}
