"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { CalendarPlus, ChevronLeft, ChevronRight, Copy, Download, MapPin, Mic, Music, Navigation, Scissors, Send, Wine, X, Flame as FlameIcon, Car } from "lucide-react";
import type { Section, LText } from "@/features/invitations/doc";
import { pick } from "@/features/invitations/doc";
import type { TemplateDef } from "@/features/templates/registry";
import type { Dictionary } from "@/i18n/dictionaries";
import { countdownParts, formatDate, formatTime, num, zonedParts } from "@/i18n/format";
import type { FamilyTokens } from "./theme";
import {
  ArchCrest, Butterfly, ChanFlower, ChanPatternBg, FestiveConfetti, Flame, GoldCorner, GoldDivider, KbachDivider, KbachFrame, Lotus, MarbleBg, PalmLeafStrip, PrasatSilhouette, Rose, RoseCluster, SugarPalms, WeaveBand,
} from "./ornaments";
import QRCode from "qrcode";
import { Phone } from "lucide-react";
import { Photo } from "./photo";

export type EventInfo = {
  title: string;
  startsAt: string | null;
  endsAt: string | null;
  timezone: string;
  venueName: string | null;
  venueAddress: string | null;
  mapUrl: string | null;
  allowMaybe: boolean;
  wishesEnabled: boolean;
  rsvpDeadline?: string | null;
  publicUrl?: string | null;
};

export type GuestInfo = {
  name: string;
  honorific: string | null;
  allowed: number;
  rsvpStatus: string;
  attendeeCount: number;
  dietary: string | null;
  message: string | null;
  updatedAt: string | null;
  table: string | null;
};

export type Ctx = {
  t: TemplateDef;
  fam: FamilyTokens;
  locale: "km" | "en";
  d: Dictionary["invite"];
  event: EventInfo;
  guest: GuestInfo | null;
  mode: "live" | "preview" | "editor";
  khNum: boolean;
  tx: (v: LText | undefined) => string;
  slots: { rsvp?: ReactNode; wishes?: ReactNode; checkin?: ReactNode };
};

/* ---------------- shared bits ---------------- */

const display = { fontFamily: "var(--inv-display)" } as const;
const latin = { fontFamily: "var(--inv-latin)" } as const;
const muted = { color: "var(--inv-muted)" } as const;
const primary = { color: "var(--inv-primary)" } as const;

export function Reveal({ children, className = "", delay = 0 }: { children: ReactNode; className?: string; delay?: number }) {
  return (
    <div className={`inv-reveal w-full ${className}`} style={{ transitionDelay: `${delay}ms` }}>
      {children}
    </div>
  );
}

export function Divider({ ctx, width = 220 }: { ctx: Ctx; width?: number }) {
  const k = ctx.fam.divider;
  return (
    <div className="inv-shimmer flex justify-center" style={primary} aria-hidden>
      {k === "kbach" && <KbachDivider width={width} />}
      {k === "lotus" && <Lotus size={44} />}
      {k === "flame" && (
        <div className="flex items-end gap-1">
          <span className="h-px w-16" style={{ background: "currentColor", opacity: 0.6 }} />
          <Flame size={14} className="-rotate-45" /> <Flame size={22} /> <Flame size={14} className="rotate-45" />
          <span className="h-px w-16" style={{ background: "currentColor", opacity: 0.6 }} />
        </div>
      )}
      {k === "weave" && <div className="w-48" style={{ color: "var(--inv-accent)" }}><WeaveBand height={14} /></div>}
      {k === "rule" && <span className="block h-[2px] w-12" style={{ background: "var(--inv-accent)" }} />}
      {k === "dots" && (
        <div className="flex gap-2">
          {["var(--inv-primary)", "var(--inv-accent)", "#4BA3A0"].map((c) => <span key={c} className="h-2.5 w-2.5 rounded-full" style={{ background: c }} />)}
        </div>
      )}
      {k === "leaf" && <ChanFlower size={28} />}
      {k === "gold" && <div style={{ color: "var(--inv-accent)" }}><GoldDivider width={width} /></div>}
    </div>
  );
}

function Heading({ ctx, children, eyebrow }: { ctx: Ctx; children: ReactNode; eyebrow?: string }) {
  const left = ctx.fam.align === "left";
  if (ctx.fam.hero === "editorial") {
    return (
      <div className="mb-10 border-t pt-4" style={{ borderColor: "color-mix(in oklab, var(--inv-ink) 18%, transparent)" }}>
        {eyebrow ? <p className="mb-2 text-xs uppercase" style={{ ...muted, letterSpacing: ctx.locale === "en" ? "0.18em" : 0 }}>{eyebrow}</p> : null}
        <h2 className={ctx.fam.headingClass} style={{ ...display, lineHeight: 1.5 }}>{children}</h2>
      </div>
    );
  }
  if (ctx.fam.hero === "leaf") {
    return (
      <div className="mb-8 flex justify-center">
        <PalmLeafStrip className="min-w-[240px] text-center">
          <h2 className={ctx.fam.headingClass} style={{ ...display, ...primary }}>{children}</h2>
        </PalmLeafStrip>
      </div>
    );
  }
  return (
    <div className={`mb-8 ${left ? "text-left" : "text-center"}`}>
      {eyebrow ? <p className="mb-1 text-sm" style={muted}>{eyebrow}</p> : null}
      <h2 className={ctx.fam.headingClass} style={{ ...display, ...primary }}>{children}</h2>
      <div className={`mt-3 ${left ? "[&>div]:justify-start" : ""}`}><Divider ctx={ctx} width={180} /></div>
    </div>
  );
}

export function Card({ ctx, children, className = "" }: { ctx: Ctx; children: ReactNode; className?: string }) {
  const c = ctx.fam.card;
  const base = "relative";
  const styles: Record<FamilyTokens["card"], { cls: string; style: React.CSSProperties }> = {
    bordered: { cls: "rounded-sm p-6 sm:p-8", style: { background: "var(--inv-surface)", border: "1px solid color-mix(in oklab, var(--inv-primary) 55%, transparent)", boxShadow: "inset 0 0 0 4px var(--inv-surface), inset 0 0 0 5px color-mix(in oklab, var(--inv-primary) 35%, transparent)" } },
    soft: { cls: "rounded-2xl p-6 sm:p-8", style: { background: "var(--inv-surface)", boxShadow: "0 1px 0 rgba(0,0,0,.03), 0 20px 40px -28px rgba(60,40,10,.35)" } },
    glass: { cls: "rounded-xl p-6 sm:p-8 backdrop-blur", style: { background: "color-mix(in oklab, var(--inv-surface) 80%, transparent)", border: "1px solid color-mix(in oklab, var(--inv-primary) 30%, transparent)" } },
    pill: { cls: "rounded-[2rem] p-6 sm:p-8", style: { background: "var(--inv-surface)", border: "1px solid color-mix(in oklab, var(--inv-primary) 22%, transparent)" } },
    flat: { cls: "p-0", style: {} },
    leaf: { cls: "rounded-[999px/48px] px-8 py-8 sm:px-12", style: { background: "linear-gradient(180deg, color-mix(in oklab, var(--inv-surface) 92%, #c9a25e), var(--inv-surface) 45%, color-mix(in oklab, var(--inv-surface) 88%, #b48a46))", boxShadow: "0 10px 26px -16px rgba(60,40,10,.45)" } },
    rounded: { cls: "rounded-3xl p-6 sm:p-8", style: { background: "var(--inv-surface)", boxShadow: "0 8px 0 0 color-mix(in oklab, var(--inv-accent) 70%, transparent)" } },
    marble: { cls: "p-7 sm:p-10", style: { background: "color-mix(in oklab, var(--inv-surface) 82%, transparent)", border: "1px solid color-mix(in oklab, var(--inv-accent) 75%, transparent)", boxShadow: "inset 0 0 0 5px color-mix(in oklab, var(--inv-surface) 60%, transparent), inset 0 0 0 6px color-mix(in oklab, var(--inv-accent) 45%, transparent), 0 20px 40px -30px rgba(74,22,34,.35)" } },
  };
  const s = styles[c];
  if (c === "marble") {
    return (
      <div className={`${base} ${s.cls} ${className}`} style={s.style}>
        <div aria-hidden style={{ color: "var(--inv-accent)" }}>
          <GoldCorner size={44} style={{ position: "absolute", left: 4, top: 4 }} />
          <GoldCorner size={44} style={{ position: "absolute", right: 4, top: 4, transform: "scaleX(-1)" }} />
          <GoldCorner size={44} style={{ position: "absolute", left: 4, bottom: 4, transform: "scaleY(-1)" }} />
          <GoldCorner size={44} style={{ position: "absolute", right: 4, bottom: 4, transform: "scale(-1,-1)" }} />
        </div>
        <div className="relative">{children}</div>
      </div>
    );
  }
  return <div className={`${base} ${s.cls} ${className}`} style={s.style}>{children}</div>;
}

function dateLine(ctx: Ctx) {
  return formatDate(ctx.event.startsAt, ctx.locale, ctx.event.timezone, ctx.khNum);
}
function timeLine(ctx: Ctx) {
  return formatTime(ctx.event.startsAt, ctx.locale, ctx.event.timezone, ctx.khNum);
}
function guestFullName(ctx: Ctx) {
  if (!ctx.guest) return "";
  return [ctx.guest.honorific, ctx.guest.name].filter(Boolean).join(" ");
}

function GuestBanner({ ctx }: { ctx: Ctx }) {
  if (!ctx.guest) return null;
  return (
    <div className="mx-auto mt-8 max-w-md text-center">
      <p className="text-sm" style={muted}>{ctx.d.dear}</p>
      <p className="mt-1 text-xl sm:text-2xl" style={{ ...display, ...primary }}>{guestFullName(ctx)}</p>
    </div>
  );
}

/* ---------------- HERO variants ---------------- */

function HeroSection({ s, ctx }: { s: Extract<Section, { type: "hero" }>; ctx: Ctx }) {
  const k = ctx.tx(s.data.kicker);
  const names = ctx.tx(s.data.names);
  const namesEn = ctx.locale === "km" ? s.data.names.en : "";
  const tagline = ctx.tx(s.data.tagline);
  const date = dateLine(ctx);
  const time = timeLine(ctx);
  const venue = ctx.event.venueName ?? "";
  const h = ctx.fam.hero;

  if (h === "frame") {
    return (
      <div className="relative flex min-h-[100svh] items-center justify-center px-5 py-16">
        <div className="absolute inset-0" style={{ color: "var(--inv-accent)" }}><ChanPatternBg opacity={0.06} /></div>
        <div className="relative w-full max-w-xl px-6 py-14 text-center sm:px-12" style={{ border: "1px solid color-mix(in oklab, var(--inv-primary) 70%, transparent)", boxShadow: "inset 0 0 0 6px var(--inv-bg), inset 0 0 0 7px color-mix(in oklab, var(--inv-primary) 40%, transparent)" }}>
          <div style={primary} className="inv-draw"><KbachFrame inset={10} size={84} /></div>
          <Reveal><div className="flex justify-center" style={primary}><ChanFlower size={56} className="inv-spin" /></div></Reveal>
          <Reveal delay={120}><p className="mt-5 text-base" style={{ color: "var(--inv-accent)" }}>{k}</p></Reveal>
          {s.data.photo ? (
            <Reveal delay={200}>
              <div className="mx-auto mt-6 h-40 w-40 overflow-hidden rounded-full sm:h-48 sm:w-48" style={{ boxShadow: "0 0 0 3px var(--inv-bg), 0 0 0 5px var(--inv-primary)" }}>
                <Photo src={s.data.photo} alt={names} kenBurns />
              </div>
            </Reveal>
          ) : null}
          <Reveal delay={300}><h1 className="inv-glow mt-6 text-[2rem] leading-[1.6] sm:text-5xl sm:leading-[1.5]" style={{ ...display, ...primary }}>{names}</h1></Reveal>
          {namesEn ? <Reveal delay={360}><p className="text-xl italic" style={{ ...latin, color: "var(--inv-accent)" }}>{namesEn}</p></Reveal> : null}
          <Reveal delay={420}><div className="my-5"><Divider ctx={ctx} width={240} /></div></Reveal>
          <Reveal delay={480}><p className="text-base">{date}</p><p className="text-sm" style={muted}>{time}{venue ? ` · ${venue}` : ""}</p></Reveal>
          <GuestBanner ctx={ctx} />
        </div>
      </div>
    );
  }

  if (h === "arch") {
    return (
      <div className="relative flex min-h-[100svh] flex-col items-center justify-center px-6 py-16 text-center paper-grain">
        <Reveal><p className="text-sm" style={muted}>{k}</p></Reveal>
        <Reveal delay={120}>
          <div className="relative mx-auto mt-6 w-[min(72%,300px)]">
            <div className="absolute -inset-3 rounded-t-[999px]" style={{ border: "1px solid var(--inv-primary)" }} />
            <div className="aspect-[3/4] overflow-hidden rounded-t-[999px]"><Photo src={s.data.photo} alt={names} kenBurns /></div>
            <div className="inv-shimmer absolute -top-9 left-1/2 -translate-x-1/2" style={primary}><ArchCrest width={150} /></div>
          </div>
        </Reveal>
        <Reveal delay={240}><h1 className="mt-10 text-3xl sm:text-[2.6rem] sm:leading-[1.6]" style={{ ...display, ...primary }}>{names}</h1></Reveal>
        {namesEn ? <Reveal delay={300}><p className="mt-1 text-2xl italic" style={latin}>{namesEn}</p></Reveal> : null}
        <Reveal delay={360}><p className="mt-3 max-w-sm text-sm" style={muted}>{tagline}</p></Reveal>
        <Reveal delay={420}>
          <div className="mt-6 flex items-center justify-center gap-4 text-sm">
            <span className="h-px w-10" style={{ background: "var(--inv-primary)" }} />
            <span>{date}</span>
            <span className="h-px w-10" style={{ background: "var(--inv-primary)" }} />
          </div>
          <p className="mt-1 text-xs" style={muted}>{time}{venue ? ` · ${venue}` : ""}</p>
        </Reveal>
        <GuestBanner ctx={ctx} />
      </div>
    );
  }

  if (h === "night") {
    return (
      <div className="relative flex min-h-[100svh] flex-col items-center justify-center overflow-hidden px-6 pb-40 pt-20 text-center">
        <div aria-hidden className="absolute inset-0" style={{ background: "radial-gradient(ellipse at 50% 110%, color-mix(in oklab, var(--inv-primary) 35%, transparent), transparent 60%), radial-gradient(1px 1px at 20% 30%, #fff8 50%, transparent), radial-gradient(1px 1px at 70% 20%, #fff7 50%, transparent), radial-gradient(1.5px 1.5px at 85% 45%, #fff6 50%, transparent), radial-gradient(1px 1px at 35% 12%, #fff9 50%, transparent), radial-gradient(1px 1px at 55% 40%, #fff5 50%, transparent), radial-gradient(1px 1px at 10% 55%, #fff6 50%, transparent)" }} />
        <Reveal><div style={primary} className="inv-shimmer"><ArchCrest width={170} /></div></Reveal>
        <Reveal delay={120}><p className="mt-4 text-sm" style={{ color: "var(--inv-accent)" }}>{k}</p></Reveal>
        <Reveal delay={220}><h1 className="inv-glow mt-4 text-[2.1rem] leading-[1.6] sm:text-6xl sm:leading-[1.45]" style={{ ...display, color: "var(--inv-accent)", textShadow: "0 0 30px color-mix(in oklab, var(--inv-primary) 60%, transparent)" }}>{names}</h1></Reveal>
        {namesEn ? <Reveal delay={280}><p className="mt-2 text-xl italic" style={{ ...latin, color: "var(--inv-ink)" }}>{namesEn}</p></Reveal> : null}
        <Reveal delay={360}><p className="mt-6 text-base">{date}</p><p className="text-sm" style={muted}>{time}{venue ? ` · ${venue}` : ""}</p></Reveal>
        {s.data.photo ? (
          <Reveal delay={420}><div className="mx-auto mt-8 h-28 w-28 overflow-hidden rounded-full ring-1" style={{ ["--tw-ring-color" as string]: "var(--inv-primary)" }}><Photo src={s.data.photo} alt={names} /></div></Reveal>
        ) : null}
        <GuestBanner ctx={ctx} />
        <div data-parallax="0.18" className="absolute inset-x-0 bottom-0 flex justify-center" style={primary}><PrasatSilhouette width={720} className="w-[140%] max-w-none sm:w-[720px]" /></div>
      </div>
    );
  }

  if (h === "round") {
    return (
      <div className="relative flex min-h-[100svh] flex-col items-center justify-center overflow-hidden px-6 py-16 text-center">
        <div aria-hidden data-parallax="0.3" className="absolute -left-16 top-10 opacity-30" style={{ color: "var(--inv-accent)" }}><Lotus size={220} /></div>
        <div aria-hidden data-parallax="-0.15" className="absolute -right-20 bottom-10 rotate-12 opacity-25" style={{ color: "var(--inv-primary)" }}><Lotus size={260} /></div>
        <Reveal><p className="text-sm" style={muted}>{k}</p></Reveal>
        <Reveal delay={120}>
          <div className="relative mx-auto mt-6 h-56 w-56 sm:h-64 sm:w-64">
            <div className="absolute -inset-2 rounded-full" style={{ border: "1px dashed var(--inv-primary)" }} />
            <div className="h-full w-full overflow-hidden rounded-full"><Photo src={s.data.photo} alt={names} kenBurns /></div>
            <div className="inv-float absolute -bottom-6 left-1/2 -translate-x-1/2" style={primary}><Lotus size={70} /></div>
          </div>
        </Reveal>
        {namesEn ? <Reveal delay={220}><p className="mt-10 text-5xl sm:text-6xl" style={{ ...latin, ...primary }}>{namesEn}</p></Reveal> : null}
        <Reveal delay={280}><h1 className={`${namesEn ? "mt-2 text-2xl" : "mt-10 text-4xl"}`} style={display}>{names}</h1></Reveal>
        <Reveal delay={360}><p className="mt-4 text-sm" style={muted}>{tagline}</p><p className="mt-3">{date}</p><p className="text-sm" style={muted}>{time}</p></Reveal>
        <GuestBanner ctx={ctx} />
      </div>
    );
  }

  if (h === "split") {
    return (
      <div className="relative grid min-h-[100svh] items-center gap-10 px-6 py-16 md:grid-cols-2 md:px-14">
        <div aria-hidden className="absolute bottom-0 left-2 top-0 hidden w-6 flex-col items-center justify-around md:flex" style={primary}>
          {Array.from({ length: 8 }).map((_, i) => <Flame key={i} size={16} className={i % 2 ? "rotate-12" : "-rotate-12"} />)}
        </div>
        <div className="order-2 md:order-1">
          <Reveal><p className="text-sm" style={{ color: "var(--inv-accent)" }}>{k}</p></Reveal>
          <Reveal delay={120}><h1 className="mt-4 text-[2.2rem] leading-[1.6] sm:text-6xl sm:leading-[1.45]" style={{ ...display, ...primary }}>{names}</h1></Reveal>
          {namesEn ? <Reveal delay={180}><p className="mt-1 text-2xl italic" style={latin}>{namesEn}</p></Reveal> : null}
          <Reveal delay={240}><div className="my-6 [&>div]:justify-start"><Divider ctx={ctx} width={220} /></div></Reveal>
          <Reveal delay={300}>
            <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
              <dt style={muted}>◆</dt><dd>{date}</dd>
              <dt style={muted}>◆</dt><dd>{time}</dd>
              {venue ? (<><dt style={muted}>◆</dt><dd>{venue}</dd></>) : null}
            </dl>
          </Reveal>
          <GuestBannerLeft ctx={ctx} />
        </div>
        <Reveal className="order-1 md:order-2" delay={100}>
          <div className="relative mx-auto w-[min(80%,380px)]">
            <div className="absolute inset-0 translate-x-4 translate-y-4" style={{ border: "1px solid var(--inv-primary)" }} />
            <div className="relative aspect-[4/5] overflow-hidden"><Photo src={s.data.photo} alt={names} kenBurns /></div>
          </div>
        </Reveal>
      </div>
    );
  }

  if (h === "band") {
    return (
      <div className="relative flex min-h-[100svh] flex-col justify-center py-14 text-center">
        <div style={{ color: "var(--inv-primary)" }}><WeaveBand height={22} /></div>
        <div className="px-6 py-12" style={{ background: "var(--inv-primary)", color: "var(--inv-on-primary)" }}>
          <Reveal><p className="text-sm opacity-80">{k}</p></Reveal>
          <Reveal delay={120}><h1 className="mt-4 text-[2.1rem] leading-[1.6] sm:text-6xl sm:leading-[1.45]" style={display}>{names}</h1></Reveal>
          {namesEn ? <Reveal delay={180}><p className="mt-1 text-xl italic opacity-90" style={latin}>{namesEn}</p></Reveal> : null}
          <Reveal delay={240}><div className="mx-auto mt-6 w-56" style={{ color: "var(--inv-accent)" }}><WeaveBand height={12} /></div></Reveal>
          <Reveal delay={300}><p className="mt-6">{date}</p><p className="text-sm opacity-80">{time}{venue ? ` · ${venue}` : ""}</p></Reveal>
        </div>
        <div style={{ color: "var(--inv-accent)" }}><WeaveBand height={22} /></div>
        {s.data.photo ? (
          <Reveal delay={200}><div className="mx-auto mt-10 aspect-[16/10] w-[min(90%,560px)] overflow-hidden" style={{ outline: "6px solid var(--inv-surface)", outlineOffset: "-6px" }}><Photo src={s.data.photo} alt={names} kenBurns /></div></Reveal>
        ) : null}
        <GuestBanner ctx={ctx} />
      </div>
    );
  }

  if (h === "leaf") {
    return (
      <div className="relative flex min-h-[100svh] flex-col items-center justify-center gap-5 px-4 py-16 text-center paper-grain">
        <Reveal><PalmLeafStrip className="w-[min(92%,560px)]"><p className="text-sm" style={muted}>{k}</p></PalmLeafStrip></Reveal>
        <Reveal delay={140}>
          <PalmLeafStrip className="w-[min(96%,640px)] py-10">
            <h1 className="text-[2rem] leading-[1.6] sm:text-5xl sm:leading-[1.5]" style={{ ...display, ...primary }}>{names}</h1>
            {namesEn ? <p className="mt-1 text-xl italic" style={latin}>{namesEn}</p> : null}
          </PalmLeafStrip>
        </Reveal>
        <Reveal delay={260}><PalmLeafStrip className="w-[min(92%,560px)]"><p>{date}</p><p className="text-sm" style={muted}>{time}{venue ? ` · ${venue}` : ""}</p></PalmLeafStrip></Reveal>
        {s.data.photo ? <Reveal delay={340}><div className="mt-4 h-44 w-72 overflow-hidden rounded-[999px/60px] sm:h-52 sm:w-96"><Photo src={s.data.photo} alt={names} kenBurns /></div></Reveal> : null}
        <GuestBanner ctx={ctx} />
      </div>
    );
  }

  if (h === "editorial") {
    const p = ctx.event.startsAt ? zonedParts(ctx.event.startsAt, ctx.event.timezone) : null;
    return (
      <div className="relative min-h-[100svh] px-6 py-10 sm:px-12">
        <div className="flex items-center justify-between border-b pb-3 text-[11px] uppercase" style={{ borderColor: "color-mix(in oklab, var(--inv-ink) 20%, transparent)", letterSpacing: ctx.locale === "en" ? "0.2em" : 0 }}>
          <span>{k}</span>
          <span style={muted}>{venue}</span>
        </div>
        <div className="grid gap-8 pt-10 md:grid-cols-[1.3fr_1fr] md:pt-16">
          <div>
            <Reveal><h1 className="text-[2.6rem] font-semibold leading-[1.35] sm:text-7xl sm:leading-[1.25]" style={display}>{names}</h1></Reveal>
            {namesEn ? <Reveal delay={100}><p className="mt-4 text-lg" style={muted}>{namesEn}</p></Reveal> : null}
            <Reveal delay={160}><p className="mt-6 max-w-md text-base" style={muted}>{tagline}</p></Reveal>
            {p ? (
              <Reveal delay={220}>
                <div className="mt-10 flex items-end gap-4">
                  <span className="text-7xl font-light leading-none sm:text-8xl" style={{ color: "var(--inv-accent)" }}>{num(String(p.day).padStart(2, "0"), ctx.locale, ctx.khNum)}</span>
                  <div className="pb-2 text-sm"><p>{dateLine(ctx)}</p><p style={muted}>{time}</p></div>
                </div>
              </Reveal>
            ) : null}
            <GuestBannerLeft ctx={ctx} />
          </div>
          <Reveal delay={120}><div className="aspect-[3/4] w-full overflow-hidden md:mt-12"><Photo src={s.data.photo} alt={names} kenBurns /></div></Reveal>
        </div>
      </div>
    );
  }

  if (h === "festive") {
    return (
      <div className="relative flex min-h-[100svh] flex-col items-center justify-center overflow-hidden px-6 py-16 text-center">
        <FestiveConfetti colors={["var(--inv-primary)", "var(--inv-accent)", "#4BA3A0", "#8A5CC2"]} />
        <Reveal><p className="relative rounded-full px-4 py-1 text-sm" style={{ background: "var(--inv-accent)", color: "var(--inv-ink)" }}>{k}</p></Reveal>
        <Reveal delay={120}>
          <div className="inv-float relative mx-auto mt-8 w-56 rotate-[-4deg] bg-white p-3 pb-10 shadow-xl sm:w-64">
            <div className="aspect-square overflow-hidden"><Photo src={s.data.photo} alt={names} /></div>
          </div>
        </Reveal>
        <Reveal delay={220}><h1 className="relative mt-8 text-5xl leading-[1.5] sm:text-7xl" style={{ ...display, ...primary }}>{names}</h1></Reveal>
        <Reveal delay={280}><p className="relative mt-2 text-lg">{tagline}</p></Reveal>
        <Reveal delay={340}><p className="relative mt-5 inline-block rounded-2xl px-5 py-2 text-sm" style={{ background: "var(--inv-ink)", color: "var(--inv-bg)" }}>{date} · {time}</p></Reveal>
        <GuestBanner ctx={ctx} />
      </div>
    );
  }

  if (h === "landscape") {
    return (
      <div className="relative flex min-h-[100svh] flex-col items-center overflow-hidden px-6 pt-20 text-center" style={{ background: "linear-gradient(180deg, color-mix(in oklab, var(--inv-accent) 30%, var(--inv-bg)) 0%, var(--inv-bg) 55%)" }}>
        <div aria-hidden data-parallax="0.35" className="absolute right-[12%] top-16 h-20 w-20 rounded-full" style={{ background: "var(--inv-accent)", opacity: 0.55, boxShadow: "0 0 60px 20px color-mix(in oklab, var(--inv-accent) 35%, transparent)" }} />
        <Reveal><p className="relative text-sm" style={muted}>{k}</p></Reveal>
        <Reveal delay={120}><h1 className="relative mt-4 text-[2.4rem] leading-[1.5] sm:text-6xl" style={{ ...display, ...primary }}>{names}</h1></Reveal>
        <Reveal delay={200}><p className="relative mt-3 max-w-md" style={muted}>{tagline}</p></Reveal>
        <Reveal delay={260}><p className="relative mt-6">{date}</p><p className="relative text-sm" style={muted}>{time}{venue ? ` · ${venue}` : ""}</p></Reveal>
        <GuestBanner ctx={ctx} />
        <div data-parallax="0.12" className="relative mt-auto w-full" style={primary}>
          <SugarPalms width={600} className="mx-auto block w-full max-w-[640px]" />
          <div className="h-10" style={{ background: "repeating-linear-gradient(170deg, var(--inv-primary) 0 2px, color-mix(in oklab, var(--inv-primary) 70%, var(--inv-bg)) 2px 9px)" }} />
        </div>
      </div>
    );
  }

  if (h === "marble") {
    const realPhoto = s.data.photo && !s.data.photo.startsWith("placeholder:");
    const enDate = ctx.event.startsAt ? `On ${new Intl.DateTimeFormat("en-US", { timeZone: ctx.event.timezone, weekday: "long" }).format(new Date(ctx.event.startsAt))}, ${new Intl.DateTimeFormat("en-GB", { timeZone: ctx.event.timezone, day: "2-digit", month: "2-digit", year: "numeric" }).format(new Date(ctx.event.startsAt)).replace(/\//g, " / ")}, At ${formatTime(ctx.event.startsAt, "en", ctx.event.timezone)}` : "";
    const nameParts = names.split(/\s*&\s*/);
    return (
      <div className="relative flex min-h-[100svh] items-center justify-center overflow-hidden px-4 py-10 sm:px-8">
        <MarbleBg />
        {/* fine gold frame */}
        <div aria-hidden className="absolute inset-3 sm:inset-5" style={{ border: "1px solid color-mix(in oklab, var(--inv-accent) 80%, transparent)" }} />
        <div aria-hidden className="absolute inset-[18px] sm:inset-[26px]" style={{ border: "0.5px solid color-mix(in oklab, var(--inv-accent) 45%, transparent)" }} />
        <div aria-hidden className="inv-draw" style={{ color: "var(--inv-accent)" }}>
          <GoldCorner size={62} style={{ position: "absolute", left: 10, top: 10 }} />
          <GoldCorner size={62} style={{ position: "absolute", right: 10, top: 10, transform: "scaleX(-1)" }} />
          <GoldCorner size={62} style={{ position: "absolute", left: 10, bottom: 10, transform: "scaleY(-1)" }} />
          <GoldCorner size={62} style={{ position: "absolute", right: 10, bottom: 10, transform: "scale(-1,-1)" }} />
        </div>
        {/* line-art roses top, painted bouquets bottom */}
        <div className="opacity-[0.28]"><RoseCluster corner="tl" scale={0.62} line /><RoseCluster corner="tr" scale={0.62} line /></div>
        <div data-parallax="0.12" className="absolute inset-0"><RoseCluster corner="bl" scale={0.78} /><RoseCluster corner="br" scale={0.7} /></div>

        <div className="relative z-10 mx-auto max-w-xl pb-24 text-center sm:pb-16">
          <Reveal><p className="text-[1.7rem] leading-[1.7] sm:text-[2.4rem]" style={{ ...display, ...primary }}>{k}</p></Reveal>
          <Reveal delay={100}>
            <p className="-mt-1 flex items-center justify-center gap-2 text-2xl sm:text-3xl" style={{ fontFamily: "var(--font-pinyon)", color: "var(--inv-ink)" }}>
              Wedding Invitation <span style={primary}><Rose size={18} line /></span>
            </p>
          </Reveal>
          {realPhoto ? (
            <Reveal delay={150}><div className="mx-auto mt-5 h-40 w-32 overflow-hidden rounded-[50%] sm:h-48 sm:w-40" style={{ boxShadow: "0 0 0 3px var(--inv-surface), 0 0 0 4px var(--inv-accent)" }}><Photo src={s.data.photo} alt={names} /></div></Reveal>
          ) : null}
          <Reveal delay={200}>
            <div className="relative mx-auto mt-4 inline-block px-6">
              <span className="inv-float absolute -right-4 -top-2" style={primary}><Butterfly size={34} /></span>
              {nameParts.length === 2 ? (
                <h1 style={{ ...display, ...primary }} className="inv-glow leading-[1.55]">
                  <span className="block text-[2.3rem] sm:text-[3.2rem]">{nameParts[0]}</span>
                  <span className="block text-[2.3rem] sm:text-[3.2rem]">{nameParts[1]}</span>
                </h1>
              ) : <h1 className="text-[2.3rem] leading-[1.55] sm:text-[3.2rem]" style={{ ...display, ...primary }}>{names}</h1>}
            </div>
          </Reveal>
          {namesEn ? <Reveal delay={240}><p className="text-xl" style={{ fontFamily: "var(--font-pinyon)", color: "var(--inv-muted)" }}>{namesEn}</p></Reveal> : null}
          <Reveal delay={280}><p className="mt-3 text-xl sm:text-2xl" style={{ ...display, color: "var(--inv-accent)" }}>{tagline}</p></Reveal>
          <Reveal delay={320}><div className="mx-auto mt-3 flex justify-center" style={{ color: "var(--inv-accent)" }}><GoldDivider width={280} /></div></Reveal>
          <Reveal delay={360}>
            <p className="mt-3 text-[15px] font-bold leading-8 sm:text-lg" style={{ color: "var(--inv-ink)" }}>{date}</p>
            <p className="text-[15px] font-bold leading-8 sm:text-lg" style={{ color: "var(--inv-ink)" }}>{time}{venue ? ` · ${venue}` : ""}</p>
            {ctx.event.venueAddress ? <p className="text-sm leading-7" style={{ color: "var(--inv-ink)" }}>{ctx.event.venueAddress}</p> : null}
            {ctx.locale === "km" && enDate ? <p className="mt-1 text-base font-semibold sm:text-lg" style={{ fontFamily: "var(--font-playfair)", color: "var(--inv-ink)" }}>{enDate}</p> : null}
          </Reveal>
          <GuestBanner ctx={ctx} />
        </div>
      </div>
    );
  }

  // memorial
  return (
    <div className="relative flex min-h-[90svh] flex-col items-center justify-center px-6 py-16 text-center">
      <Reveal><div style={muted}><Lotus size={56} /></div></Reveal>
      <Reveal delay={100}><p className="mt-4 text-sm" style={muted}>{k}</p></Reveal>
      {s.data.photo ? (
        <Reveal delay={160}><div className="mx-auto mt-6 aspect-[3/4] w-44 overflow-hidden p-1.5" style={{ border: "1px solid var(--inv-muted)" }}><Photo src={s.data.photo} alt={names} className="grayscale" /></div></Reveal>
      ) : null}
      <Reveal delay={220}><h1 className="mt-6 text-3xl sm:text-4xl" style={display}>{names}</h1></Reveal>
      <Reveal delay={280}><p className="mt-3 max-w-md text-sm" style={muted}>{tagline}</p></Reveal>
      <GuestBanner ctx={ctx} />
    </div>
  );
}

function GuestBannerLeft({ ctx }: { ctx: Ctx }) {
  if (!ctx.guest) return null;
  return (
    <div className="mt-8 border-l-2 pl-4" style={{ borderColor: "var(--inv-accent)" }}>
      <p className="text-sm" style={muted}>{ctx.d.dear}</p>
      <p className="text-xl" style={{ ...display, ...primary }}>{guestFullName(ctx)}</p>
    </div>
  );
}

/* ---------------- Content sections ---------------- */

function Shell({ ctx, children, narrow = true, className = "" }: { ctx: Ctx; children: ReactNode; narrow?: boolean; className?: string }) {
  return (
    <div className={`relative px-5 py-16 sm:px-8 sm:py-24 ${className}`}>
      <div className={`relative mx-auto ${narrow ? "max-w-2xl" : "max-w-5xl"}`}>{children}</div>
    </div>
  );
}

function InvitationSection({ s, ctx }: { s: Extract<Section, { type: "invitation" }>; ctx: Ctx }) {
  const wedding = ctx.t.category === "wedding" || ctx.t.category === "engagement";
  const fam = (f: { father: LText; mother: LText }) => [ctx.tx(f.father), ctx.tx(f.mother)].filter(Boolean);
  const left = fam(s.data.leftFamily);
  const right = fam(s.data.rightFamily);
  const showParents = s.data.showParents && (left.length > 0 || right.length > 0);
  return (
    <Shell ctx={ctx}>
      <Reveal>
        <Card ctx={ctx} className={ctx.fam.align === "left" ? "text-left" : "text-center"}>
          <Heading ctx={ctx}>{ctx.tx(s.data.heading)}</Heading>
          {showParents ? (
            <div className="mb-8 grid grid-cols-2 gap-4 text-sm sm:gap-10">
              <div>
                <p className="mb-2 text-xs" style={muted}>{wedding ? ctx.d.groomParents : ctx.d.hostParents}</p>
                {left.map((x) => <p key={x} className="leading-8">{x}</p>)}
              </div>
              <div>
                <p className="mb-2 text-xs" style={muted}>{wedding ? ctx.d.brideParents : ""}</p>
                {right.map((x) => <p key={x} className="leading-8">{x}</p>)}
              </div>
            </div>
          ) : null}
          <p className="whitespace-pre-line text-[15px] leading-8 sm:text-base sm:leading-9">{ctx.tx(s.data.body)}</p>
          {ctx.guest ? (
            <div className="mt-8 rounded-lg px-4 py-4" style={{ background: "color-mix(in oklab, var(--inv-primary) 10%, transparent)" }}>
              <p className="text-sm" style={muted}>{ctx.d.dear}</p>
              <p className="text-xl" style={{ ...display, ...primary }}>{guestFullName(ctx)}</p>
              {ctx.guest.allowed > 1 ? <p className="mt-1 text-xs" style={muted}>{num(ctx.guest.allowed, ctx.locale, ctx.khNum)} {ctx.locale === "km" ? "នាក់" : "guests"}</p> : null}
            </div>
          ) : null}
          <div className="mt-8 text-sm">
            <p style={{ ...display, ...primary }} className="text-base">{dateLine(ctx)}</p>
            <p style={muted}>{timeLine(ctx)}</p>
            {ctx.event.venueName ? <p className="mt-1">{ctx.event.venueName}</p> : null}
          </div>
        </Card>
      </Reveal>
    </Shell>
  );
}

function CoupleSection({ s, ctx }: { s: Extract<Section, { type: "couple" }>; ctx: Ctx }) {
  const shape = ctx.fam.hero === "arch" ? "rounded-t-[999px]" : ctx.fam.hero === "round" || ctx.fam.hero === "frame" ? "rounded-full" : ctx.fam.hero === "leaf" ? "rounded-[999px/50px]" : "rounded-sm";
  const person = (p: typeof s.data.left, i: number) => (
    <Reveal key={i} delay={i * 140} className="text-center">
      <div className={`mx-auto aspect-[3/4] w-full max-w-[220px] overflow-hidden ${shape}`} style={{ boxShadow: "0 0 0 1px color-mix(in oklab, var(--inv-primary) 50%, transparent), 0 20px 40px -24px rgba(0,0,0,.4)" }}>
        <Photo src={p.photo || "placeholder:host"} alt={ctx.tx(p.name)} kenBurns />
      </div>
      <p className="mt-5 text-xs" style={muted}>{ctx.tx(p.role)}</p>
      <p className="mt-1 text-xl" style={{ ...display, ...primary }}>{ctx.tx(p.name)}</p>
      {ctx.tx(p.bio) ? <p className="mt-1 text-sm" style={muted}>{ctx.tx(p.bio)}</p> : null}
    </Reveal>
  );
  return (
    <Shell ctx={ctx}>
      <div className="grid grid-cols-2 items-start gap-6 sm:gap-12">
        {person(s.data.left, 0)}
        {person(s.data.right, 1)}
      </div>
      <div className="mt-8"><Divider ctx={ctx} /></div>
    </Shell>
  );
}

function CountdownSection({ s, ctx }: { s: Extract<Section, { type: "countdown" }>; ctx: Ctx }) {
  const target = ctx.event.startsAt ? new Date(ctx.event.startsAt).getTime() : null;
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    setNow(Date.now());
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);
  if (!target) return null;
  const c = countdownParts(target, now ?? target);
  const cells: [number, string][] = [[c.days, ctx.d.days], [c.hours, ctx.d.hours], [c.minutes, ctx.d.minutes], [c.seconds, ctx.d.seconds]];
  return (
    <Shell ctx={ctx}>
      <Heading ctx={ctx}>{ctx.tx(s.data.heading)}</Heading>
      {now !== null && c.done ? (
        <p className="text-center text-lg" style={primary}>{ctx.d.started}</p>
      ) : (
        <div className="grid grid-cols-4 gap-2 sm:gap-4" aria-live="off">
          {cells.map(([v, label]) => (
            <Card key={label} ctx={ctx} className="!p-3 text-center sm:!p-5">
              <span className="num block text-3xl sm:text-5xl" style={{ ...primary, fontFamily: ctx.locale === "km" ? "var(--inv-display)" : "var(--inv-latin)" }} suppressHydrationWarning>
                {now === null ? "—" : num(String(v).padStart(2, "0"), ctx.locale, ctx.khNum)}
              </span>
              <span className="mt-1 block text-xs" style={muted}>{label}</span>
            </Card>
          ))}
        </div>
      )}
    </Shell>
  );
}

function ScheduleIcon({ name }: { name: string }) {
  const cls = "h-4 w-4";
  switch (name) {
    case "lotus": return <Lotus size={20} />;
    case "glass": return <Wine className={cls} />;
    case "music": return <Music className={cls} />;
    case "mic": return <Mic className={cls} />;
    case "scissors": return <Scissors className={cls} />;
    case "flame": return <FlameIcon className={cls} />;
    case "procession": return <Flame size={16} />;
    default: return <ChanFlower size={18} />;
  }
}

function ScheduleSection({ s, ctx }: { s: Extract<Section, { type: "schedule" }>; ctx: Ctx }) {
  if (!s.data.items.length) return null;
  return (
    <Shell ctx={ctx}>
      <Heading ctx={ctx}>{ctx.tx(s.data.heading)}</Heading>
      <ol className="relative mx-auto max-w-lg">
        <span aria-hidden className="absolute bottom-2 left-[22px] top-2 w-px" style={{ background: "color-mix(in oklab, var(--inv-primary) 45%, transparent)" }} />
        {s.data.items.map((it, i) => (
          <Reveal key={i} delay={i * 80}>
            <li className="relative flex gap-5 pb-8 last:pb-0">
              <span className="relative z-10 flex h-11 w-11 shrink-0 items-center justify-center rounded-full" style={{ background: "var(--inv-surface)", color: "var(--inv-primary)", boxShadow: "0 0 0 1px color-mix(in oklab, var(--inv-primary) 50%, transparent)" }}>
                <ScheduleIcon name={it.icon} />
              </span>
              <div className="pt-1.5">
                <p className="num text-sm" style={{ color: "var(--inv-accent)" }}>{num(it.time, ctx.locale, ctx.khNum)}</p>
                <p className="text-base font-medium sm:text-lg">{ctx.tx(it.title)}</p>
                {ctx.tx(it.desc) ? <p className="text-sm" style={muted}>{ctx.tx(it.desc)}</p> : null}
              </div>
            </li>
          </Reveal>
        ))}
      </ol>
    </Shell>
  );
}

function StorySection({ s, ctx }: { s: Extract<Section, { type: "story" }>; ctx: Ctx }) {
  if (!s.data.chapters.length) return null;
  return (
    <Shell ctx={ctx} narrow={false}>
      <Heading ctx={ctx}>{ctx.tx(s.data.heading)}</Heading>
      <div className="-mx-5 flex snap-x snap-mandatory gap-5 overflow-x-auto px-5 pb-4 sm:mx-0 sm:px-0 [scrollbar-width:thin]">
        {s.data.chapters.map((c, i) => (
          <article key={i} className="w-[78%] shrink-0 snap-center sm:w-[42%] lg:w-[31%]">
            <div className="aspect-[4/5] overflow-hidden rounded-sm"><Photo src={c.photo || "placeholder:story-1"} alt={ctx.tx(c.title)} kenBurns /></div>
            <p className="mt-4 text-sm" style={{ color: "var(--inv-accent)" }}>{num(c.date, ctx.locale, ctx.khNum)}</p>
            <h3 className="text-lg" style={display}>{ctx.tx(c.title)}</h3>
            <p className="mt-1 text-sm" style={muted}>{ctx.tx(c.text)}</p>
          </article>
        ))}
      </div>
    </Shell>
  );
}

function GallerySection({ s, ctx }: { s: Extract<Section, { type: "gallery" }>; ctx: Ctx }) {
  const [open, setOpen] = useState<number | null>(null);
  const photos = s.data.photos;
  useEffect(() => {
    if (open === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(null);
      if (e.key === "ArrowRight") setOpen((o) => (o === null ? o : (o + 1) % photos.length));
      if (e.key === "ArrowLeft") setOpen((o) => (o === null ? o : (o - 1 + photos.length) % photos.length));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, photos.length]);
  const [touchX, setTouchX] = useState<number | null>(null);
  if (!photos.length) return null;
  return (
    <Shell ctx={ctx} narrow={false}>
      <Heading ctx={ctx}>{ctx.tx(s.data.heading)}</Heading>
      <div className="columns-2 gap-3 sm:columns-3 [&>*]:mb-3">
        {photos.map((p, i) => (
          <button key={i} onClick={() => setOpen(i)} className="block w-full break-inside-avoid overflow-hidden rounded-sm focus-visible:outline-2" aria-label={`${ctx.tx(p.caption) || "Photo"} ${i + 1}`}>
            <div className={i % 3 === 0 ? "aspect-[3/4]" : i % 3 === 1 ? "aspect-square" : "aspect-[4/5]"}>
              <Photo src={p.src} alt={ctx.tx(p.caption) || `Photo ${i + 1}`} className="transition-transform duration-700 hover:scale-105" />
            </div>
          </button>
        ))}
      </div>
      {open !== null ? (
        <div role="dialog" aria-modal="true" className="fixed inset-0 z-[60] flex items-center justify-center bg-black/90 p-4"
          onTouchStart={(e) => setTouchX(e.touches[0].clientX)}
          onTouchEnd={(e) => { if (touchX === null) return; const dx = e.changedTouches[0].clientX - touchX; if (Math.abs(dx) > 40) setOpen((o) => (o! + (dx < 0 ? 1 : -1) + photos.length) % photos.length); setTouchX(null); }}>
          <button onClick={() => setOpen(null)} className="absolute right-4 top-4 rounded-full bg-white/10 p-2 text-white" aria-label="Close"><X className="h-5 w-5" /></button>
          <button onClick={() => setOpen((open - 1 + photos.length) % photos.length)} className="absolute left-2 rounded-full bg-white/10 p-2 text-white" aria-label="Previous"><ChevronLeft /></button>
          <div className="aspect-[3/4] max-h-[82vh] w-full max-w-lg overflow-hidden"><Photo src={photos[open].src} alt={ctx.tx(photos[open].caption)} /></div>
          <button onClick={() => setOpen((open + 1) % photos.length)} className="absolute right-2 rounded-full bg-white/10 p-2 text-white" aria-label="Next"><ChevronRight /></button>
          {ctx.tx(photos[open].caption) ? <p className="absolute bottom-6 text-sm text-white/80">{ctx.tx(photos[open].caption)}</p> : null}
        </div>
      ) : null}
    </Shell>
  );
}

function icsFor(ctx: Ctx) {
  if (!ctx.event.startsAt) return "";
  const fmt = (d: Date) => d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  const start = new Date(ctx.event.startsAt);
  const end = ctx.event.endsAt ? new Date(ctx.event.endsAt) : new Date(start.getTime() + 4 * 3600_000);
  const esc = (v: string) => v.replace(/[\\;,]/g, (m) => `\\${m}`).replace(/\n/g, "\\n");
  return [
    "BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//e-invitation-online//EN", "BEGIN:VEVENT",
    `UID:${start.getTime()}-${encodeURIComponent(ctx.event.title).slice(0, 20)}@e-invitation`,
    `DTSTAMP:${fmt(new Date())}`, `DTSTART:${fmt(start)}`, `DTEND:${fmt(end)}`,
    `SUMMARY:${esc(ctx.event.title)}`,
    `LOCATION:${esc([ctx.event.venueName, ctx.event.venueAddress].filter(Boolean).join(", "))}`,
    "BEGIN:VALARM", "TRIGGER:-P1D", "ACTION:DISPLAY", "DESCRIPTION:Reminder", "END:VALARM",
    "END:VEVENT", "END:VCALENDAR",
  ].join("\r\n");
}

function LocationQr({ url, label }: { url: string; label: string }) {
  const [svg, setSvg] = useState("");
  useEffect(() => { QRCode.toString(url, { type: "svg", margin: 1, color: { dark: "#2b1b1f", light: "#ffffff" } }).then(setSvg).catch(() => {}); }, [url]);
  if (!svg) return null;
  return (
    <div className="mx-auto mt-6 hidden w-40 text-center sm:block">
      <div className="rounded-xl bg-white p-2 shadow-sm" dangerouslySetInnerHTML={{ __html: svg }} />
      <p className="mt-2 text-xs font-semibold" style={primary}>{label}</p>
    </div>
  );
}

function VenueSection({ s, ctx }: { s: Extract<Section, { type: "venue" }>; ctx: Ctx }) {
  const [zoom, setZoom] = useState(false);
  const q = [ctx.event.venueName, ctx.event.venueAddress].filter(Boolean).join(", ");
  const mapHref = ctx.event.mapUrl || (q ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}` : "");
  const gcal = ctx.event.startsAt
    ? `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(ctx.event.title)}&dates=${new Date(ctx.event.startsAt).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "")}/${new Date(ctx.event.endsAt ?? new Date(new Date(ctx.event.startsAt).getTime() + 4 * 3600_000)).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "")}&location=${encodeURIComponent(q)}`
    : "";
  function downloadIcs() {
    const blob = new Blob([icsFor(ctx)], { type: "text/calendar" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "invitation.ics";
    a.click();
    URL.revokeObjectURL(a.href);
  }
  const btn = "inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm transition-opacity hover:opacity-85";
  const contacts = (s.data.contacts ?? []).filter((c) => c.phone.replace(/\D/g, "").length >= 6);
  const hasDrawnMap = !!s.data.mapImage;
  return (
    <Shell ctx={ctx}>
      <Heading ctx={ctx}>{ctx.tx(s.data.heading)}</Heading>
      <Reveal>
        <Card ctx={ctx} className="text-center">
          <MapPin className="mx-auto h-6 w-6" style={primary} />
          <p className="mt-3 text-xl" style={display}>{ctx.event.venueName}</p>
          <p className="mt-1 text-sm" style={muted}>{ctx.event.venueAddress}</p>
          <p className="mt-4 text-sm">{dateLine(ctx)} · {timeLine(ctx)}</p>
          {ctx.tx(s.data.note) ? <p className="mt-3 whitespace-pre-line text-sm" style={muted}>{ctx.tx(s.data.note)}</p> : null}
          {ctx.tx(s.data.parking) ? <p className="mt-3 inline-flex items-center gap-2 text-sm" style={muted}><Car className="h-4 w-4" /> {ctx.tx(s.data.parking)}</p> : null}

          {hasDrawnMap ? (
            <button type="button" onClick={() => setZoom(true)} className="mt-6 block w-full overflow-hidden rounded-lg" style={{ border: "1px solid color-mix(in oklab, var(--inv-accent) 45%, transparent)" }} aria-label={ctx.d.map}>
              <Photo src={s.data.mapImage} alt={ctx.d.map} className="!h-auto" />
            </button>
          ) : q && ctx.mode !== "editor" ? (
            <div className="mt-6 overflow-hidden rounded-lg" style={{ border: "1px solid color-mix(in oklab, var(--inv-primary) 25%, transparent)" }}>
              <iframe title="map" loading="lazy" referrerPolicy="no-referrer" className="h-56 w-full" src={`https://maps.google.com/maps?q=${encodeURIComponent(q)}&z=15&output=embed`} />
            </div>
          ) : null}

          {contacts.length ? (
            <div className="mt-6">
              <p className="text-sm font-semibold" style={primary}>{ctx.locale === "km" ? "លេខម្ចាស់កម្មវិធី" : "Hosts' phone"}</p>
              <div className="mt-2 flex flex-wrap justify-center gap-2">
                {contacts.map((c, i) => (
                  <a key={i} href={`tel:${c.phone.replace(/[^0-9+]/g, "")}`} className={btn} style={{ border: "1px solid var(--inv-primary)", color: "var(--inv-primary)" }}>
                    <Phone className="h-4 w-4" /><span className="num font-semibold">{c.phone}</span>{ctx.tx(c.label) ? <span className="text-xs" style={muted}>· {ctx.tx(c.label)}</span> : null}
                  </a>
                ))}
              </div>
            </div>
          ) : null}

          <div className="mt-6 flex flex-wrap justify-center gap-2">
            {mapHref ? <a href={mapHref} target="_blank" rel="noopener noreferrer" className={btn} style={{ background: "var(--inv-primary)", color: "var(--inv-on-primary)" }}><Navigation className="h-4 w-4" />{ctx.d.directions}</a> : null}
            {ctx.event.startsAt ? <button onClick={downloadIcs} className={btn} style={{ border: "1px solid var(--inv-primary)", color: "var(--inv-primary)" }}><CalendarPlus className="h-4 w-4" />{ctx.d.calendar}</button> : null}
            {gcal ? <a href={gcal} target="_blank" rel="noopener noreferrer" className={btn} style={{ border: "1px solid color-mix(in oklab, var(--inv-primary) 40%, transparent)", color: "var(--inv-ink)" }}>Google Calendar</a> : null}
          </div>
          {s.data.showQr && ctx.event.mapUrl ? <LocationQr url={ctx.event.mapUrl} label={ctx.locale === "km" ? "ស្កេន QR ដើម្បីមើលទីតាំង" : "Scan for the location"} /> : null}
        </Card>
      </Reveal>
      {zoom && hasDrawnMap ? (
        <div role="dialog" aria-modal="true" className="fixed inset-0 z-[60] flex items-center justify-center bg-black/90 p-3" onClick={() => setZoom(false)}>
          <button className="absolute right-4 top-4 rounded-full bg-white/10 p-2 text-white" aria-label="Close"><X className="h-5 w-5" /></button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={s.data.mapImage} alt={ctx.d.map} className="max-h-[90vh] max-w-full rounded-lg object-contain" style={{ touchAction: "pinch-zoom" }} />
        </div>
      ) : null}
    </Shell>
  );
}

function GiftSection({ s, ctx }: { s: Extract<Section, { type: "gift" }>; ctx: Ctx }) {
  const [copied, setCopied] = useState<number | null>(null);
  return (
    <Shell ctx={ctx}>
      <Heading ctx={ctx}>{ctx.tx(s.data.heading)}</Heading>
      {ctx.tx(s.data.note) ? <p className="mb-8 text-center text-sm" style={muted}>{ctx.tx(s.data.note)}</p> : null}
      <div className={`grid gap-4 ${s.data.accounts.length > 1 ? "sm:grid-cols-2" : "mx-auto max-w-sm"}`}>
        {s.data.accounts.map((a, i) => (
          <Card key={i} ctx={ctx} className="text-center">
            <p className="text-sm font-semibold" style={primary}>{a.bank}</p>
            {a.qr ? (
              <div className="mx-auto mt-4 w-48 rounded-lg bg-white p-2">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={a.qr} alt={`${a.bank} QR`} className="w-full" loading="lazy" />
              </div>
            ) : null}
            <p className="mt-4 text-xs" style={muted}>{ctx.d.holder}</p>
            <p className="text-base">{a.holder}</p>
            {a.number ? (
              <button onClick={() => { navigator.clipboard?.writeText(a.number); setCopied(i); setTimeout(() => setCopied(null), 1500); }} className="num mt-2 inline-flex items-center gap-2 text-sm" style={muted}>
                {a.number} <Copy className="h-3.5 w-3.5" /> {copied === i ? ctx.d.copied : ""}
              </button>
            ) : null}
            {a.qr ? <div className="mt-3"><a href={a.qr} download className="inline-flex items-center gap-1 text-xs underline" style={primary}><Download className="h-3.5 w-3.5" />{ctx.d.saveQr}</a></div> : null}
          </Card>
        ))}
      </div>
      {s.data.accounts.some((a) => a.qr) ? <p className="mt-4 text-center text-[11px]" style={muted}>{ctx.d.qrNote}</p> : null}
    </Shell>
  );
}

function RsvpSection({ s, ctx }: { s: Extract<Section, { type: "rsvp" }>; ctx: Ctx }) {
  return (
    <Shell ctx={ctx}>
      <Heading ctx={ctx}>{ctx.tx(s.data.heading)}</Heading>
      {ctx.tx(s.data.note) ? <p className="mb-6 text-center text-sm" style={muted}>{ctx.tx(s.data.note)}</p> : null}
      <Card ctx={ctx}>{ctx.slots.rsvp ?? <p className="text-center text-sm" style={muted}>{ctx.d.previewOnly}</p>}</Card>
      {ctx.slots.checkin}
    </Shell>
  );
}

function WishesSection({ s, ctx }: { s: Extract<Section, { type: "wishes" }>; ctx: Ctx }) {
  if (!ctx.event.wishesEnabled) return null;
  return (
    <Shell ctx={ctx}>
      <Heading ctx={ctx}>{ctx.tx(s.data.heading)}</Heading>
      {ctx.slots.wishes ?? <p className="text-center text-sm" style={muted}>{ctx.d.previewOnly}</p>}
    </Shell>
  );
}

function ThankYouSection({ s, ctx }: { s: Extract<Section, { type: "thankyou" }>; ctx: Ctx }) {
  const [copied, setCopied] = useState(false);
  const url = ctx.event.publicUrl;
  return (
    <Shell ctx={ctx} className="pb-28">
      <div className="text-center">
        <Reveal><div style={primary} className="flex justify-center"><ChanFlower size={64} className="animate-[spin_40s_linear_infinite]" /></div></Reveal>
        <Reveal delay={120}><p className="mx-auto mt-6 max-w-md whitespace-pre-line text-lg leading-9">{ctx.tx(s.data.message)}</p></Reveal>
        <Reveal delay={200}><p className="mt-6 text-2xl" style={{ ...display, ...primary }}>{ctx.tx(s.data.signature)}</p></Reveal>
        {url ? (
          <div className="mt-8 flex flex-wrap justify-center gap-2 text-sm">
            <a className="inline-flex items-center gap-2 rounded-full px-4 py-2" style={{ background: "var(--inv-primary)", color: "var(--inv-on-primary)" }} href={`https://t.me/share/url?url=${encodeURIComponent(url)}`} target="_blank" rel="noopener noreferrer"><Send className="h-4 w-4" /> Telegram</a>
            <a className="rounded-full px-4 py-2" style={{ border: "1px solid var(--inv-primary)" }} href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`} target="_blank" rel="noopener noreferrer">Facebook</a>
            <button className="rounded-full px-4 py-2" style={{ border: "1px solid var(--inv-primary)" }} onClick={async () => {
              if (navigator.share) { try { await navigator.share({ url, title: ctx.event.title }); return; } catch { /* cancelled */ } }
              await navigator.clipboard?.writeText(url); setCopied(true); setTimeout(() => setCopied(false), 1500);
            }}>{copied ? ctx.d.copied : ctx.d.share}</button>
          </div>
        ) : null}
      </div>
    </Shell>
  );
}

function VideoSection({ s, ctx }: { s: Extract<Section, { type: "video" }>; ctx: Ctx }) {
  const hasFile = !!s.data.src && !s.data.src.startsWith("placeholder:");
  const yt = s.data.youtube;
  const [playYt, setPlayYt] = useState(false);
  if (!hasFile && !yt && !s.data.poster) return null;
  const frame = "relative aspect-video w-full overflow-hidden rounded-xl shadow-[0_30px_60px_-30px_rgba(0,0,0,.5)]";
  return (
    <Shell ctx={ctx} narrow={false}>
      <Heading ctx={ctx}>{ctx.tx(s.data.heading)}</Heading>
      <Reveal>
        <div className="mx-auto max-w-3xl">
          {hasFile ? (
            <div className={frame} style={{ background: "#000" }}>
              <video className="h-full w-full object-contain" controls playsInline preload="metadata" poster={s.data.poster && !s.data.poster.startsWith("placeholder:") ? s.data.poster : undefined} src={s.data.src} />
            </div>
          ) : yt ? (
            <div className={frame} style={{ background: "#000" }}>
              {playYt ? (
                <iframe className="h-full w-full" src={`https://www.youtube-nocookie.com/embed/${yt}?autoplay=1&rel=0&playsinline=1`} title={ctx.tx(s.data.heading) || "Video"} allow="autoplay; encrypted-media; picture-in-picture; fullscreen" referrerPolicy="strict-origin-when-cross-origin" />
              ) : (
                // Click-to-load: no third-party request (or tracking) until the guest chooses to play.
                <button type="button" onClick={() => setPlayYt(true)} className="group relative h-full w-full" aria-label="Play video">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={`https://i.ytimg.com/vi/${yt}/hqdefault.jpg`} alt="" className="h-full w-full object-cover opacity-90" loading="lazy" referrerPolicy="no-referrer" />
                  <span className="absolute inset-0 flex items-center justify-center"><span className="flex h-16 w-16 items-center justify-center rounded-full bg-white/90 shadow-xl transition-transform group-hover:scale-110"><svg viewBox="0 0 24 24" width="26" height="26"><path d="M8 5v14l11-7z" fill="var(--inv-primary)" /></svg></span></span>
                </button>
              )}
            </div>
          ) : (
            <div className={frame}><Photo src={s.data.poster} alt={ctx.tx(s.data.heading)} /></div>
          )}
          {ctx.tx(s.data.caption) ? <p className="mt-4 text-center text-sm" style={muted}>{ctx.tx(s.data.caption)}</p> : null}
        </div>
      </Reveal>
    </Shell>
  );
}

/** Cinematic opening: full-screen muted looping video with the names over it (muted autoplay is allowed on iOS/Android). */
function HeroVideoIntro({ s, ctx }: { s: Extract<Section, { type: "hero" }>; ctx: Ctx }) {
  return (
    <div className="relative flex min-h-[100svh] items-end justify-center overflow-hidden" style={{ background: "#000" }}>
      <video className="absolute inset-0 h-full w-full object-cover" src={s.data.video} autoPlay muted loop playsInline preload="auto" aria-hidden />
      <div className="absolute inset-0" style={{ background: "linear-gradient(180deg, rgba(0,0,0,.15) 0%, rgba(0,0,0,.05) 40%, rgba(0,0,0,.65) 100%)" }} />
      <div className="relative z-10 px-6 pb-20 text-center text-white">
        <Reveal><p className="text-sm opacity-85">{ctx.tx(s.data.kicker)}</p></Reveal>
        <Reveal delay={150}><h2 className="inv-glow mt-3 text-[2.2rem] leading-[1.6] sm:text-6xl" style={{ ...display, color: "#fff" }}>{ctx.tx(s.data.names)}</h2></Reveal>
        <Reveal delay={300}><p className="mt-3 text-sm opacity-90">{dateLine(ctx)}</p></Reveal>
        <div className="mx-auto mt-8 h-10 w-6 rounded-full border border-white/60 p-1" aria-hidden><span className="mx-auto block h-2 w-1 animate-bounce rounded-full bg-white" /></div>
      </div>
    </div>
  );
}

function CoverAsSection({ s, ctx }: { s: Extract<Section, { type: "cover" }>; ctx: Ctx }) {
  // In the editor the envelope is shown inline as a static preview card.
  if (ctx.mode !== "editor") return null;
  return (
    <Shell ctx={ctx}>
      <div className="mx-auto max-w-sm rounded-md p-8 text-center" style={{ background: ctx.t.envelope.body, color: "#fff" }}>
        <p className="text-xs opacity-80">{ctx.tx(s.data.kicker)}</p>
        <p className="mt-2 text-2xl" style={display}>{ctx.tx(s.data.names)}</p>
        <p className="mt-4 inline-block rounded-full px-4 py-1.5 text-xs" style={{ background: ctx.t.envelope.seal }}>{ctx.tx(s.data.button)}</p>
      </div>
    </Shell>
  );
}

export function RenderSection({ s, ctx }: { s: Section; ctx: Ctx }) {
  switch (s.type) {
    case "cover": return <CoverAsSection s={s} ctx={ctx} />;
    case "hero": return s.data.video ? <><HeroVideoIntro s={s} ctx={ctx} /><HeroSection s={s} ctx={ctx} /></> : <HeroSection s={s} ctx={ctx} />;
    case "video": return <VideoSection s={s} ctx={ctx} />;
    case "invitation": return <InvitationSection s={s} ctx={ctx} />;
    case "couple": return <CoupleSection s={s} ctx={ctx} />;
    case "countdown": return <CountdownSection s={s} ctx={ctx} />;
    case "schedule": return <ScheduleSection s={s} ctx={ctx} />;
    case "story": return <StorySection s={s} ctx={ctx} />;
    case "gallery": return <GallerySection s={s} ctx={ctx} />;
    case "venue": return <VenueSection s={s} ctx={ctx} />;
    case "gift": return s.data.accounts.length || ctx.mode === "editor" ? <GiftSection s={s} ctx={ctx} /> : null;
    case "rsvp": return <RsvpSection s={s} ctx={ctx} />;
    case "wishes": return <WishesSection s={s} ctx={ctx} />;
    case "thankyou": return <ThankYouSection s={s} ctx={ctx} />;
  }
}

export function useTx(locale: "km" | "en") {
  return useMemo(() => (v: LText | undefined) => pick(v, locale), [locale]);
}

export { muted, primary, display };
