"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { getTemplate, sampleDoc, sampleEvent } from "@/features/templates/registry";
import { dictionaries } from "@/i18n/dictionaries";
import { FAMILIES, themeStyle } from "@/components/invitation/theme";
import { RenderSection, useTx, type Ctx } from "@/components/invitation/sections";
import { cn } from "@/lib/utils";

/** Renders a template's real hero at phone size, scaled down. No iframe, no network. */
export function TemplateThumb({ slug, locale = "km", width = 240, className, section = "hero" }: { slug: string; locale?: "km" | "en"; width?: number; className?: string; section?: "hero" | "invitation" }) {
  const t = getTemplate(slug)!;
  const doc = useMemo(() => sampleDoc(t), [t]);
  const tx = useTx(locale);
  const ev = useMemo(() => ({ ...sampleEvent(t), rsvpDeadline: null, publicUrl: null }), [t]);
  const ctx: Ctx = { t, fam: FAMILIES[t.family], locale, d: dictionaries[locale].invite,
    event: ev.previewVenueName ? { ...ev, venueName: tx(ev.previewVenueName) || ev.venueName } : ev,
    guest: null, mode: "preview", khNum: true, tx, slots: {} };
  const s = doc.sections.find((x) => x.type === section)!;
  const scale = width / 390;
  return (
    <div className={cn("inv-thumb relative overflow-hidden", className)} style={{ width, height: 780 * scale }} aria-hidden>
      <div lang={locale} style={{ ...themeStyle(t, doc), width: 390, height: 780, transform: `scale(${scale})`, transformOrigin: "top left", position: "absolute", inset: 0 }}>
        <RenderSection s={s} ctx={ctx} />
      </div>
    </div>
  );
}

export function FluidThumb({ slug, locale }: { slug: string; locale: "km" | "en" }) {
  const ref = useRef<HTMLDivElement>(null);
  const [w, setW] = useState(200);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setW(Math.round(e.contentRect.width)));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return (
    <div ref={ref} className="relative aspect-[1/2] w-full overflow-hidden">
      <TemplateThumb slug={slug} locale={locale} width={w} />
    </div>
  );
}
