"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { Languages, Music2, Pause } from "lucide-react";
import type { InvitationDoc } from "@/features/invitations/doc";
import { CLASSIC_SAMPLE_AUDIO, CURTAINS_SAMPLE_AUDIO, type TemplateDef } from "@/features/templates/registry";
import { dictionaries } from "@/i18n/dictionaries";
import { FAMILIES, particleColors, resolvePalette, themeStyle } from "./theme";
import { Ambient, MOTION_CSS, useParallax, type ParticleKind } from "./motion";
import { RenderSection, useTx, type Ctx, type EventInfo, type GuestInfo } from "./sections";
import { Envelope } from "./envelope";
import { ChanPatternBg, MarbleBg } from "./ornaments";

export type RendererProps = {
  template: TemplateDef;
  doc: InvitationDoc;
  event: EventInfo;
  guest?: GuestInfo | null;
  mode: "live" | "preview" | "editor";
  initialLocale?: "km" | "en";
  /** Force a locale (editor preview toggle). */
  locale?: "km" | "en";
  showEnvelope?: boolean;
  slots?: Ctx["slots"];
  selectedId?: string | null;
  onSelect?: (id: string) => void;
  /** Contain fixed elements (used when rendered inside a device frame). */
  contained?: boolean;
};

export function InvitationRenderer(props: RendererProps) {
  const { template, doc, event, guest = null, mode } = props;
  const [stateLocale, setLocale] = useState<"km" | "en">(props.initialLocale ?? doc.defaultLocale ?? "km");
  const locale = props.locale ?? stateLocale;
  const [opened, setOpened] = useState(!(props.showEnvelope ?? (mode !== "editor" && doc.theme.envelope)));
  const tx = useTx(locale);
  const fam = FAMILIES[template.family];
  const root = useRef<HTMLDivElement>(null);
  const motionLevel = doc.theme.motion?.level ?? "full";
  const defaultParticles = template.slug === "ivory-scratch-lite" ? "gold" : fam.particles;
  const particleKind = ((doc.theme.motion?.particles ?? "auto") === "auto" ? defaultParticles : doc.theme.motion!.particles) as ParticleKind;
  useParallax(root, mode !== "editor" && motionLevel === "full");

  useEffect(() => {
    if (mode === "editor" || props.contained) return;
    const prev = window.history.scrollRestoration;
    if ("scrollRestoration" in window.history) window.history.scrollRestoration = "manual";
    window.scrollTo(0, 0);
    return () => {
      if ("scrollRestoration" in window.history) window.history.scrollRestoration = prev;
    };
  }, [mode, props.contained]);

  useEffect(() => {
    if (!opened || mode === "editor" || props.contained) return;
    window.scrollTo(0, 0);
    document.documentElement.scrollTop = 0;
    const id = requestAnimationFrame(() => {
      window.scrollTo(0, 0);
      document.documentElement.scrollTop = 0;
    });
    return () => cancelAnimationFrame(id);
  }, [opened, mode, props.contained]);

  const ctx: Ctx = {
    t: template, fam, locale, d: dictionaries[locale].invite,
    event: event.previewVenueName ? { ...event, venueName: tx(event.previewVenueName) || event.venueName } : event,
    guest, mode,
    khNum: doc.theme.khmerNumerals, tx, slots: props.slots ?? {},
  };

  // Scroll-reveal with IntersectionObserver — no animation library on the critical path.
  useEffect(() => {
    const el = root.current;
    if (!el) return;
    const items = el.querySelectorAll<HTMLElement>(".inv-reveal:not(.in)");
    if (mode === "editor" || !("IntersectionObserver" in window) || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      items.forEach((i) => i.classList.add("in"));
      return;
    }
    const io = new IntersectionObserver(
      (entries) => entries.forEach((e) => { if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); } }),
      { rootMargin: "0px 0px -8% 0px", threshold: 0.05 },
    );
    items.forEach((i) => io.observe(i));
    return () => io.disconnect();
  });

  const cover = doc.sections.find((s) => s.type === "cover" && !s.hidden);
  const visible = doc.sections.filter((s) => !s.hidden || mode === "editor");
  const guestLine = guest ? `${ctx.d.dear} ${[guest.honorific, guest.name].filter(Boolean).join(" ")}` : ctx.d.guestOf;

  const namesForInitials = cover && cover.type === "cover" ? cover.data.names.en : "";
  const initials = namesForInitials.split(/[&,]| and /).map((x) => x.trim()[0]).filter(Boolean).slice(0, 2).join("·");

  return (
    <div ref={root} lang={locale} data-motion={motionLevel} data-reveal={fam.reveal} className="inv-root relative min-h-full overflow-x-hidden" style={themeStyle(template, doc)}>
      <style>{MOTION_CSS + `.inv-root h1,.inv-root h2{text-wrap:balance}.inv-root :lang(km),.inv-root[lang=km]{letter-spacing:0}`}</style>
      {mode !== "editor" || props.contained ? <Ambient kind={particleKind} level={motionLevel} colors={particleColors(particleKind, resolvePalette(template, doc))} contained={props.contained} /> : null}
      {fam.bg === "marble" ? <MarbleBg fixed /> : null}
      {template.slug === "classic-floral" ? (
        <div aria-hidden className={`pointer-events-none inset-0 z-0 overflow-hidden ${props.contained ? "absolute" : "fixed"}`}>
          <video className="h-full w-full object-cover opacity-55" src="/templates/planessential/classic-bg.mp4" autoPlay muted loop playsInline preload="auto" />
          <div className="absolute inset-0 bg-[#FAF5EE]/35" />
        </div>
      ) : null}
      {(template.slug === "navy-scratch" || template.slug === "crimson-lovestory" || template.slug === "ivory-scratch-lite") ? (
        <div
          aria-hidden
          className={`pointer-events-none inset-0 z-0 opacity-[0.09] ${props.contained ? "absolute" : "fixed"}`}
          style={{ backgroundImage: "url(/templates/planessential/kbach-pattern.png)", backgroundSize: "320px auto", backgroundRepeat: "repeat" }}
        />
      ) : null}
      {fam.bg === "curtains" ? (
        <div aria-hidden className={`pointer-events-none inset-0 z-0 overflow-hidden ${props.contained ? "absolute" : "fixed"}`}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/templates/champagne-curtains/bg.jpg" alt="" className="h-full w-full object-cover" />
          <div className="absolute inset-0 bg-[#FAF6F0]/25" />
        </div>
      ) : null}
      {fam.bg === "chan" ? <div className="pointer-events-none absolute inset-0" style={{ color: "var(--inv-primary)" }}><ChanPatternBg opacity={0.035} /></div> : null}

      {cover && cover.type === "cover" && !opened && mode !== "editor" ? (
        <Envelope
          template={template}
          kicker={tx(cover.data.kicker)}
          names={tx(cover.data.names)}
          photo={cover.data.photo}
          button={tx(cover.data.button) || ctx.d.open}
          guestLine={guestLine}
          skipLabel={ctx.d.skip}
          initials={initials}
          motionOff={motionLevel === "off"}
          onOpened={() => {
            setOpened(true);
            requestAnimationFrame(() => window.scrollTo(0, 0));
          }}
        />
      ) : null}

      <main className="relative">
        {visible.map((s) => (
          <SectionFrame key={s.id} id={s.id} editor={mode === "editor"} selected={props.selectedId === s.id} hidden={s.hidden} onSelect={props.onSelect}>
            <RenderSection s={s} ctx={ctx} />
          </SectionFrame>
        ))}
        {mode !== "editor" ? (
          <footer className="pb-24 pt-6 text-center text-[11px]" style={{ color: "var(--inv-muted)" }}>
            <a href="/" className="opacity-70 hover:opacity-100">ធៀបអនឡាញ · Theab Online</a>
          </footer>
        ) : null}
      </main>

      {mode !== "editor" ? (
        <FloatingControls
          contained={props.contained}
          locale={locale}
          onLocale={() => setLocale(locale === "km" ? "en" : "km")}
          music={doc.theme.music.src}
          musicLabel={ctx.d.music}
          langLabel={ctx.d.lang}
        />
      ) : null}
    </div>
  );
}

function SectionFrame({ id, editor, selected, hidden, onSelect, children }: { id: string; editor: boolean; selected: boolean; hidden: boolean; onSelect?: (id: string) => void; children: ReactNode }) {
  if (!editor) return <section data-section={id}>{children}</section>;
  return (
    <section
      data-section={id}
      onClickCapture={(e) => { e.preventDefault(); onSelect?.(id); }}
      className={`relative cursor-pointer transition-[outline-color] ${hidden ? "opacity-35" : ""}`}
      style={{ outline: selected ? "2px solid #B68A45" : "1px dashed transparent", outlineOffset: "-2px" }}
      onMouseEnter={(e) => { if (!selected) e.currentTarget.style.outline = "1px dashed rgba(182,138,69,.7)"; }}
      onMouseLeave={(e) => { if (!selected) e.currentTarget.style.outline = "1px dashed transparent"; }}
    >
      {children}
    </section>
  );
}

function FloatingControls({ locale, onLocale, music, musicLabel, langLabel, contained }: { locale: string; onLocale: () => void; music: string; musicLabel: string; langLabel: string; contained?: boolean }) {
  const audio = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);
  useEffect(() => {
    if (!music) return;
    const resolved = music === CURTAINS_SAMPLE_AUDIO
      ? "/templates/champagne-curtains/audio.mp3"
      : music === CLASSIC_SAMPLE_AUDIO
        ? "/templates/planessential/audio-7.mp3"
        : music;
    const a = new Audio(resolved);
    a.loop = true;
    a.preload = "none";
    audio.current = a;
    // Music only ever starts from a user gesture (opening the envelope) — never autoplay.
    const onGesture = () => { a.play().then(() => setPlaying(true)).catch(() => setPlaying(false)); };
    window.addEventListener("invite:gesture", onGesture);
    return () => { window.removeEventListener("invite:gesture", onGesture); a.pause(); };
  }, [music]);
  const pos = contained ? "absolute" : "fixed";
  const btn = "flex h-11 w-11 items-center justify-center rounded-full shadow-lg backdrop-blur transition-transform active:scale-95";
  const style = { background: "color-mix(in oklab, var(--inv-surface) 85%, transparent)", color: "var(--inv-primary)", border: "1px solid color-mix(in oklab, var(--inv-primary) 35%, transparent)" };
  return (
    <div className={`${pos} bottom-5 right-4 z-40 flex flex-col gap-2`}>
      <button onClick={onLocale} className={btn} style={style} aria-label={langLabel} title={langLabel}>
        <span className="text-[11px] font-semibold" style={{ fontFamily: "var(--font-km)" }}>{locale === "km" ? "EN" : "ខ្មែរ"}</span>
      </button>
      {music ? (
        <button
          onClick={() => { const a = audio.current; if (!a) return; if (playing) { a.pause(); setPlaying(false); } else { a.play().then(() => setPlaying(true)).catch(() => {}); } }}
          className={btn} style={style} aria-label={musicLabel} aria-pressed={playing}
        >
          {playing ? <Pause className="h-4 w-4" /> : <Music2 className="h-4 w-4" />}
        </button>
      ) : null}
      <span className="sr-only"><Languages /></span>
    </div>
  );
}
