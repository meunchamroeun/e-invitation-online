"use client";

import { useEffect, useRef, useState } from "react";
import type { gsap } from "gsap";
import type { TemplateDef } from "@/features/templates/registry";
import { ChanFlower, ChanPatternBg, GoldCorner, GoldDivider, KbachDivider, KbachFrame, MarbleBg, RoseCluster, WaxSeal } from "./ornaments";
import { Photo } from "./photo";

const SCRATCH_SLUGS = new Set(["navy-scratch", "crimson-lovestory", "ivory-scratch-lite", "champagne-scratch"]);

function ScratchGate({
  template,
  kicker,
  names,
  photo,
  button,
  guestLine,
  skipLabel,
  onOpenedEarly,
  onDone,
}: {
  template: TemplateDef;
  kicker: string;
  names: string;
  photo: string;
  button: string;
  guestLine?: string;
  skipLabel: string;
  onOpenedEarly: () => void;
  onDone: () => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const lastPos = useRef<{ x: number; y: number } | null>(null);
  const doneRef = useRef(false);
  const timerRef = useRef<number | null>(null);
  const ringTimerRef = useRef<number | null>(null);
  const [scratched, setScratched] = useState(false);
  const [intro, setIntro] = useState(false);
  const [ringActive, setRingActive] = useState(false);
  const [fading, setFading] = useState(false);

  useEffect(() => {
    return () => {
      if (timerRef.current) window.clearTimeout(timerRef.current);
      if (ringTimerRef.current) window.clearTimeout(ringTimerRef.current);
    };
  }, []);

  const isDarkBg = template.slug === "navy-scratch" || template.slug === "crimson-lovestory";
  const frameImg = isDarkBg ? "/templates/planessential/kbach-frame.png" : "/templates/planessential/frame-scratch.png";
  const artworkImg = isDarkBg ? "/templates/planessential/art-work.png" : "/templates/planessential/art-work-dark.png";
  const bgStyle: React.CSSProperties =
    template.slug === "navy-scratch"
      ? { backgroundColor: "#0B1A3A", color: "#FFF3D2" }
      : template.slug === "crimson-lovestory"
        ? { backgroundColor: "#8A1A27", color: "#FFF3D2" }
        : { backgroundColor: "#E4E0DB", color: "#5A3E1F" };

  useEffect(() => {
    const c = canvasRef.current;
    if (!c) return;
    const ctx = c.getContext("2d");
    if (!ctx) return;
    const g = ctx.createRadialGradient(c.width * 0.44, c.height * 0.34, c.width * 0.08, c.width * 0.5, c.height * 0.5, c.height * 0.65);
    if (isDarkBg) {
      g.addColorStop(0, "#FFF6D6");
      g.addColorStop(0.35, "#E9C77B");
      g.addColorStop(0.75, "#C99A4B");
      g.addColorStop(1, "#9E7229");
    } else {
      g.addColorStop(0, "#F8FAFC");
      g.addColorStop(0.45, "#CBD5E1");
      g.addColorStop(1, "#94A3B8");
    }
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, c.width, c.height);
    // Subtle metallic glitter specks
    for (let i = 0; i < 90; i++) {
      const sx = ((Math.sin(i * 12.9898) * 43758.5453) % 1 + 1) % 1 * c.width;
      const sy = ((Math.sin(i * 78.233) * 43758.5453) % 1 + 1) % 1 * c.height;
      ctx.fillStyle = i % 2 === 0 ? "rgba(255,255,255,0.42)" : "rgba(255,235,170,0.3)";
      ctx.fillRect(sx, sy, 1.5, 1.5);
    }
  }, [isDarkBg]);

  function finishReveal() {
    if (timerRef.current) window.clearTimeout(timerRef.current);
    if (ringTimerRef.current) window.clearTimeout(ringTimerRef.current);
    setFading(true);
    timerRef.current = window.setTimeout(onDone, 680);
  }

  function triggerReveal(immediate = false) {
    if (immediate) {
      doneRef.current = true;
      onOpenedEarly();
      finishReveal();
      return;
    }
    if (doneRef.current) return;
    doneRef.current = true;
    onOpenedEarly();
    setIntro(true);
    setRingActive(true);
    ringTimerRef.current = window.setTimeout(() => setRingActive(false), 1350);
    timerRef.current = window.setTimeout(finishReveal, 2800);
  }

  function scratchAt(clientX: number, clientY: number) {
    const c = canvasRef.current;
    if (!c || doneRef.current) return;
    const rect = c.getBoundingClientRect();
    const x = ((clientX - rect.left) / rect.width) * c.width;
    const y = ((clientY - rect.top) / rect.height) * c.height;
    const ctx = c.getContext("2d");
    if (!ctx) return;
    ctx.globalCompositeOperation = "destination-out";
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.lineWidth = 36;
    ctx.beginPath();
    if (lastPos.current) {
      ctx.moveTo(lastPos.current.x, lastPos.current.y);
      ctx.lineTo(x, y);
      ctx.stroke();
    } else {
      ctx.arc(x, y, 18, 0, Math.PI * 2);
      ctx.fill();
    }
    lastPos.current = { x, y };

    // Sample alpha across grid to auto-reveal at ~32% scratched
    const data = ctx.getImageData(0, 0, c.width, c.height).data;
    let cleared = 0;
    const total = data.length / 64;
    for (let i = 3; i < data.length; i += 64) {
      if (data[i] < 128) cleared++;
    }
    if (cleared / total > 0.32) triggerReveal();
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={button}
      className={`fixed inset-0 z-50 flex justify-center overflow-hidden transition-all duration-700 ease-out ${fading ? "scale-[1.02] opacity-0" : "scale-100 opacity-100"}`}
      style={{ background: "linear-gradient(135deg, #fdf2f8 0%, #fefce8 100%)" }}
    >
      <style>{`
        @keyframes scratch-hand {
          0%, 100% { transform: translate(-11px, 4px) rotate(-10deg) scale(1); }
          50% { transform: translate(11px, -4px) rotate(8deg) scale(0.96); }
        }
        @keyframes scratch-intro-in {
          0% { opacity: 0; transform: scale(0.86); filter: blur(6px); }
          100% { opacity: 1; transform: scale(1); filter: blur(0); }
        }
        @keyframes scratch-ring-orbit {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        @keyframes scratch-ring-glow {
          0%, 100% { transform: scale(1); opacity: 0.85; }
          50% { transform: scale(1.035); opacity: 1; }
        }
        @keyframes scratch-rule-grow {
          0% { transform: scaleX(0); opacity: 0; }
          100% { transform: scaleX(1); opacity: 1; }
        }
      `}</style>
      <div
        className={`relative flex h-full w-full max-w-md flex-col items-center overflow-hidden px-5 shadow-2xl ${intro ? "justify-start pt-16 sm:pt-20" : "justify-center"}`}
        style={bgStyle}
      >
        {template.slug !== "champagne-scratch" ? (
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 opacity-[0.10]"
            style={{ backgroundImage: "url(/templates/planessential/kbach-pattern.png)", backgroundSize: "320px auto", backgroundRepeat: "repeat" }}
          />
        ) : null}

        {/* Centerpiece: either Scratch Oval or Post-Scratch Save-the-Date Intro */}
        {intro ? (
          <div
            className="relative z-10 flex w-full max-w-[330px] flex-col items-center px-4 text-center"
            style={{ animation: "scratch-intro-in 0.55s cubic-bezier(0.2, 0.8, 0.2, 1) forwards" }}
          >
            <div className="relative flex h-60 w-60 items-center justify-center">
              {/* Soft warm golden radial aura matching PlanEssential */}
              <span
                aria-hidden
                className={`pointer-events-none absolute -inset-6 rounded-full transition-all duration-700 ${ringActive ? "opacity-100 scale-100" : "opacity-0 scale-105"}`}
                style={{
                  background: isDarkBg
                    ? "radial-gradient(circle, rgba(240,212,143,0.34) 0%, rgba(240,212,143,0.12) 52%, transparent 72%)"
                    : "radial-gradient(circle, rgba(255,220,140,0.45) 0%, rgba(255,210,115,0.16) 52%, transparent 72%)",
                }}
              />
              {/* Thin bright glowing ring + orbiting sparkle dot */}
              <span
                aria-hidden
                className={`pointer-events-none absolute inset-0 rounded-full transition-all duration-700 ${ringActive ? "opacity-100 scale-100" : "opacity-0 scale-110"}`}
                style={{
                  border: isDarkBg ? "1px solid rgba(255,235,175,0.8)" : "1px solid rgba(245,205,120,0.85)",
                  boxShadow: isDarkBg
                    ? "0 0 28px rgba(240,212,143,0.45), inset 0 0 20px rgba(240,212,143,0.22)"
                    : "0 0 28px rgba(245,205,120,0.45), inset 0 0 20px rgba(245,205,120,0.22)",
                  animation: ringActive ? "scratch-ring-glow 1.2s ease-in-out infinite" : undefined,
                }}
              />
              {/* Orbiting comet arc + dual sparkles */}
              <span
                aria-hidden
                className={`pointer-events-none absolute inset-0 rounded-full transition-opacity duration-500 ${ringActive ? "opacity-100" : "opacity-0"}`}
                style={{ animation: "scratch-ring-orbit 2.2s linear infinite" }}
              >
                <span
                  className="absolute inset-0 rounded-full"
                  style={{
                    background: isDarkBg
                      ? "conic-gradient(from 0deg, rgba(255,235,175,0.75) 0deg, rgba(255,235,175,0.2) 55deg, transparent 110deg, transparent 360deg)"
                      : "conic-gradient(from 0deg, rgba(245,205,120,0.85) 0deg, rgba(245,205,120,0.22) 55deg, transparent 110deg, transparent 360deg)",
                    WebkitMask: "radial-gradient(farthest-side, transparent calc(100% - 2px), #000 calc(100% - 1px))",
                    mask: "radial-gradient(farthest-side, transparent calc(100% - 2px), #000 calc(100% - 1px))",
                  }}
                />
                <span
                  className="absolute -top-1 left-1/2 h-2.5 w-2.5 -translate-x-1/2 rounded-full"
                  style={{
                    background: "#FFFDF0",
                    boxShadow: "0 0 12px 4px rgba(255,225,140,0.95)",
                  }}
                />
                <span
                  className="absolute -bottom-1 left-1/2 h-1.5 w-1.5 -translate-x-1/2 rounded-full opacity-75"
                  style={{
                    background: "#FFF8DC",
                    boxShadow: "0 0 8px 2px rgba(255,225,140,0.8)",
                  }}
                />
              </span>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={artworkImg} alt="Save the Date" className="relative h-36 w-auto object-contain" />
            </div>

            <div className={`mt-10 w-full transition-all duration-700 ${ringActive ? "translate-y-3 opacity-0" : "translate-y-0 opacity-100"}`}>
              <div className="flex origin-center items-center gap-3" style={!ringActive ? { animation: "scratch-rule-grow 0.6s cubic-bezier(0.2, 0.8, 0.2, 1) both" } : undefined}>
                <span className="h-px flex-1" style={{ background: isDarkBg ? "rgba(240,212,143,0.45)" : "rgba(180,129,63,0.45)" }} />
                <span className="h-1.5 w-1.5 rotate-45" style={{ background: isDarkBg ? "#F0D48F" : "#B4813F" }} />
                <span className="h-px flex-1" style={{ background: isDarkBg ? "rgba(240,212,143,0.45)" : "rgba(180,129,63,0.45)" }} />
              </div>
              <p className="mt-4 text-sm font-medium opacity-80" style={{ fontFamily: "var(--inv-body)" }}>
                សូមគោរពអញ្ជើញ
              </p>
              <p className="mt-2 text-xl leading-[1.6]" style={{ fontFamily: "var(--inv-display)", color: isDarkBg ? "#F0D48F" : "#B4813F" }}>
                {guestLine || "ភ្ញៀវកិត្តិយស"}
              </p>
              <div className="mt-4 flex origin-center items-center gap-3" style={!ringActive ? { animation: "scratch-rule-grow 0.6s cubic-bezier(0.2, 0.8, 0.2, 1) both" } : undefined}>
                <span className="h-px flex-1" style={{ background: isDarkBg ? "rgba(240,212,143,0.45)" : "rgba(180,129,63,0.45)" }} />
                <span className="h-1.5 w-1.5 rotate-45" style={{ background: isDarkBg ? "#F0D48F" : "#B4813F" }} />
                <span className="h-px flex-1" style={{ background: isDarkBg ? "rgba(240,212,143,0.45)" : "rgba(180,129,63,0.45)" }} />
              </div>
            </div>
          </div>
        ) : (
        <div
          className="relative z-10 flex w-[280px] items-center justify-center sm:w-[310px]"
          style={{ aspectRatio: isDarkBg ? "469 / 695" : "596 / 746" }}
        >
          {/* Revealed artwork & guest name inside the inner oval */}
          <div
            className={`absolute flex flex-col items-center justify-center overflow-hidden rounded-[50%] p-4 shadow-inner ${isDarkBg ? "h-[67%] w-[74%]" : "h-[62%] w-[62%]"}`}
            style={{
              zIndex: 15,
              background: isDarkBg
                ? "radial-gradient(circle, rgba(16,35,74,0.96) 0%, rgba(9,21,48,0.98) 100%)"
                : "radial-gradient(circle, rgba(255,253,249,0.98) 0%, rgba(244,239,232,0.96) 100%)",
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={artworkImg} alt="" className="h-24 w-auto object-contain" />
            {guestLine ? <p className="mt-2 text-xs font-medium">{guestLine}</p> : null}
          </div>

          {/* Interactive scratch foil canvas */}
          <canvas
            ref={canvasRef}
            width={220}
            height={285}
            className={`relative cursor-pointer touch-none rounded-[50%] ${isDarkBg ? "h-[67%] w-[74%]" : "h-[62%] w-[62%]"}`}
            style={{ zIndex: 20, clipPath: "ellipse(50% 50% at 50% 50%)" }}
            onPointerDown={(e) => { drawing.current = true; lastPos.current = null; setScratched(true); scratchAt(e.clientX, e.clientY); }}
            onPointerMove={(e) => { if (drawing.current) scratchAt(e.clientX, e.clientY); }}
            onPointerUp={() => { drawing.current = false; lastPos.current = null; }}
            onPointerCancel={() => { drawing.current = false; lastPos.current = null; }}
          />

          {/* Ornate wreath frame */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={frameImg}
            alt=""
            aria-hidden
            className="pointer-events-none absolute inset-0 h-full w-full object-contain drop-shadow-[0_20px_42px_rgba(0,0,0,0.5)]"
            style={{ zIndex: isDarkBg ? 30 : 10 }}
          />

          {/* Hand pointer + white Khmer scratch prompt centered over the foil */}
          {!scratched ? (
            <div
              className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center text-white"
              style={{ zIndex: 40, textShadow: "0 2px 6px rgba(60, 35, 10, 0.7)" }}
            >
              <svg aria-hidden viewBox="0 0 24 24" className="mb-2 h-8 w-8 drop-shadow-[0_2px_4px_rgba(0,0,0,0.45)]" style={{ animation: "scratch-hand 1.35s ease-in-out infinite" }} fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 11V6a2 2 0 0 0-2-2 2 2 0 0 0-2 2" />
                <path d="M14 10V4a2 2 0 0 0-2-2 2 2 0 0 0-2 2v2" />
                <path d="M10 10.5V6a2 2 0 0 0-2-2 2 2 0 0 0-2 2v8" />
                <path d="M18 8a2 2 0 1 1 4 0v6a8 8 0 0 1-8 8h-2c-2.8 0-4.5-.86-5.99-2.34l-3.6-3.6a2 2 0 0 1 2.83-2.82L7 15" />
              </svg>
              <span className="block text-sm font-semibold leading-snug" style={{ fontFamily: "var(--inv-body)" }}>
                សូមកោសនៅត្រង់នេះ!
              </span>
            </div>
          ) : null}
        </div>
        )}

        <button type="button" onClick={() => triggerReveal(true)} className="relative z-10 mt-6 text-xs underline underline-offset-4 opacity-55 transition-opacity hover:opacity-100">
          {skipLabel}
        </button>
      </div>
    </div>
  );
}

export function Envelope({
  template,
  kicker,
  names,
  photo,
  button,
  guestLine,
  skipLabel,
  initials,
  motionOff,
  onOpened,
}: {
  template: TemplateDef;
  kicker: string;
  names: string;
  photo: string;
  button: string;
  guestLine?: string;
  skipLabel: string;
  initials?: string;
  motionOff: boolean;
  onOpened: () => void;
}) {
  const [opening, setOpening] = useState(false);
  const active = useRef(false);
  const sequence = useRef<gsap.core.Timeline>(null);
  const overlay = useRef<HTMLDivElement>(null);
  const leftDoor = useRef<HTMLDivElement>(null);
  const rightDoor = useRef<HTMLDivElement>(null);
  const centerCard = useRef<HTMLDivElement>(null);
  const sealRing = useRef<HTMLDivElement>(null);
  const btn = useRef<HTMLButtonElement>(null);
  const e = template.envelope;

  useEffect(() => {
    window.scrollTo(0, 0);
    btn.current?.focus({ preventScroll: true });
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
      active.current = false;
      sequence.current?.kill();
    };
  }, []);

  function scrollTop() {
    window.scrollTo(0, 0);
    overlay.current?.parentElement?.scrollTo(0, 0);
  }

  function finish() {
    active.current = false;
    sequence.current?.kill();
    scrollTop();
    onOpened();
  }

  async function open() {
    if (active.current) return;
    active.current = true;
    scrollTop();
    onOpenedEarly();
    if (motionOff || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return finish();
    setOpening(true);
    try {
      const { gsap } = await import("gsap");
      if (!active.current || !overlay.current) return;
      sequence.current = gsap.timeline({ onComplete: finish })
        // 1. Medallion ring gently expands & center card lifts softly
        .to(sealRing.current, { scale: 2.1, opacity: 0, duration: 0.9, ease: "power2.out" }, 0)
        .to(centerCard.current, { scale: 1.08, opacity: 0, duration: 0.85, ease: "power2.inOut" }, 0.15)
        // 2. Left & right luxury gate-fold panels glide open slowly and smoothly in 3D
        .to(leftDoor.current, { xPercent: -104, rotateY: 10, opacity: 0.35, duration: 1.7, ease: "power2.inOut" }, 0.45)
        .to(rightDoor.current, { xPercent: 104, rotateY: -10, opacity: 0.35, duration: 1.7, ease: "power2.inOut" }, 0.45)
        // 3. Overlay dissolves gracefully into the live Hero underneath
        .to(overlay.current, { opacity: 0, duration: 0.9, ease: "sine.inOut" }, 1.65);
    } catch {
      if (active.current) finish();
    }
  }
  // Start audio inside the user gesture (browsers block autoplay otherwise).
  function onOpenedEarly() {
    window.dispatchEvent(new CustomEvent("invite:gesture"));
  }

  if (SCRATCH_SLUGS.has(template.slug)) {
    return (
      <ScratchGate
        template={template}
        kicker={kicker}
        names={names}
        photo={photo}
        button={button}
        guestLine={guestLine}
        skipLabel={skipLabel}
        onOpenedEarly={onOpenedEarly}
        onDone={finish}
      />
    );
  }

  const doorStyle: React.CSSProperties = {
    background:
      template.family === "curtains"
        ? "linear-gradient(180deg, rgba(250,246,240,0.88) 0%, rgba(243,231,211,0.92) 100%)"
        : `linear-gradient(180deg, color-mix(in oklab, ${e.body} 88%, var(--inv-surface)) 0%, ${e.body} 100%)`,
    backdropFilter: "blur(18px)",
    WebkitBackdropFilter: "blur(18px)",
  };

  return (
    <div
      ref={overlay}
      role="dialog"
      aria-modal="true"
      aria-label={button}
      className="fixed inset-0 z-50 flex items-center justify-center overflow-hidden"
      style={{ color: "var(--inv-ink)", perspective: "1800px" }}
    >
      {/* Background atmospheric preview */}
      <div className="pointer-events-none absolute inset-0">
        {template.family === "curtains" ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src="/templates/champagne-curtains/bg.jpg" alt="" className="h-full w-full object-cover" />
        ) : template.slug === "classic-floral" ? (
          <video className="h-full w-full object-cover opacity-75" src="/templates/planessential/classic-bg.mp4" autoPlay muted loop playsInline preload="auto" />
        ) : template.family === "marble" ? (
          <MarbleBg />
        ) : (
          <div className="h-full w-full" style={{ background: "var(--inv-bg)" }}>
            <ChanPatternBg opacity={0.07} />
          </div>
        )}
        {photo ? (
          <div className="absolute inset-0 opacity-35">
            <Photo src={photo} alt="" className="scale-105 object-[center_20%] blur-md" />
          </div>
        ) : null}
      </div>

      {/* Left Gate-Fold Panel */}
      <div
        ref={leftDoor}
        className="absolute inset-y-0 left-0 w-1/2 origin-left overflow-hidden will-change-transform shadow-[12px_0_40px_rgba(40,22,8,0.18)]"
        style={{
          ...doorStyle,
          borderRight: "1px solid color-mix(in oklab, var(--inv-accent) 55%, transparent)",
        }}
      >
        <div
          aria-hidden
          className="pointer-events-none absolute inset-3 right-2 rounded-l-2xl border border-r-0"
          style={{ borderColor: "color-mix(in oklab, var(--inv-accent) 35%, transparent)" }}
        />
      </div>

      {/* Right Gate-Fold Panel */}
      <div
        ref={rightDoor}
        className="absolute inset-y-0 right-0 w-1/2 origin-right overflow-hidden will-change-transform shadow-[-12px_0_40px_rgba(40,22,8,0.18)]"
        style={{
          ...doorStyle,
          borderLeft: "1px solid color-mix(in oklab, var(--inv-accent) 55%, transparent)",
        }}
      >
        <div
          aria-hidden
          className="pointer-events-none absolute inset-3 left-2 rounded-r-2xl border border-l-0"
          style={{ borderColor: "color-mix(in oklab, var(--inv-accent) 35%, transparent)" }}
        />
      </div>

      {/* Center Khmer ធៀប (Invitation Card) */}
      <div
        ref={centerCard}
        className="relative z-10 mx-4 flex w-full max-w-[370px] flex-col items-center overflow-hidden rounded-2xl px-7 py-9 text-center backdrop-blur-xl sm:px-9 sm:py-10"
        style={{
          background:
            template.family === "curtains"
              ? "linear-gradient(180deg, rgba(255,253,249,0.94) 0%, rgba(250,242,229,0.92) 100%)"
              : "color-mix(in oklab, var(--inv-surface) 92%, transparent)",
          border: "1.5px solid color-mix(in oklab, var(--inv-accent) 75%, transparent)",
          boxShadow:
            "inset 0 0 0 6px color-mix(in oklab, var(--inv-surface) 75%, transparent), inset 0 0 0 7.5px color-mix(in oklab, var(--inv-accent) 45%, transparent), 0 32px 80px -20px rgba(40,22,8,0.42)",
        }}
      >
        {/* Ornate Khmer Kbach / Gold Corners */}
        <div aria-hidden className="pointer-events-none" style={{ color: "var(--inv-accent)" }}>
          {template.family === "marble" ? (
            <>
              <GoldCorner size={54} style={{ position: "absolute", left: 6, top: 6 }} />
              <GoldCorner size={54} style={{ position: "absolute", right: 6, top: 6, transform: "scaleX(-1)" }} />
              <GoldCorner size={54} style={{ position: "absolute", left: 6, bottom: 6, transform: "scaleY(-1)" }} />
              <GoldCorner size={54} style={{ position: "absolute", right: 6, bottom: 6, transform: "scale(-1,-1)" }} />
            </>
          ) : (
            <KbachFrame inset={8} size={62} className="opacity-80" />
          )}
        </div>

        {/* Top Khmer Crest & Kicker */}
        <div className="relative z-10 flex flex-col items-center">
          <span style={{ color: "var(--inv-accent)" }}><ChanFlower size={26} /></span>
          <p className="mt-2 text-xs font-medium tracking-wide sm:text-sm" style={{ color: "var(--inv-primary)" }}>{kicker}</p>
        </div>

        {/* Circular couple portrait or wax seal medallion */}
        <div
          onClick={open}
          className="group relative z-10 my-5 flex h-28 w-28 cursor-pointer items-center justify-center"
        >
          <div
            ref={sealRing}
            aria-hidden
            className="absolute inset-0 rounded-full border-2 opacity-65 transition-transform duration-500 group-hover:scale-110"
            style={{ borderColor: "var(--inv-accent)" }}
          />
          <div
            aria-hidden
            className="absolute inset-1.5 animate-ping rounded-full opacity-15"
            style={{ background: "var(--inv-accent)", animationDuration: "3s" }}
          />
          {template.slug === "classic-floral" ? (
            <div className="relative flex h-28 w-28 items-center justify-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/templates/planessential/monogram-frame.svg" alt="" aria-hidden className="pointer-events-none absolute inset-0 h-full w-full object-contain" />
              <span className="relative text-xl font-semibold" style={{ fontFamily: "var(--inv-latin)", color: "var(--inv-primary)" }}>{initials || "✦"}</span>
            </div>
          ) : photo ? (
            <div className="relative h-24 w-24 overflow-hidden rounded-full shadow-md ring-2 ring-offset-2" style={{ ["--tw-ring-color" as string]: "var(--inv-accent)" }}>
              {photo === "placeholder:curtains-cover" ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src="/templates/champagne-curtains/cover.jpg" alt={names} className="h-full w-full object-cover object-[center_20%] transition-transform duration-500 group-hover:scale-105" />
              ) : (
                <Photo src={photo} alt={names} label="" className="object-[center_20%] transition-transform duration-500 group-hover:scale-105" />
              )}
            </div>
          ) : (
            <WaxSeal size={82} color={e.seal} initials={initials} />
          )}
        </div>

        {/* Couple Names */}
        <h1 className="relative z-10 text-2xl leading-[1.65] sm:text-[1.75rem]" style={{ fontFamily: "var(--inv-display)", color: "var(--inv-primary)" }}>
          {names}
        </h1>
        <div className="relative z-10 mt-1.5 flex justify-center" style={{ color: "var(--inv-accent)" }}>
          {template.family === "marble" ? (
            <GoldDivider width={190} />
          ) : template.family === "curtains" ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src="/templates/champagne-curtains/divider.png" alt="" className="h-auto w-[160px] select-none object-contain" />
          ) : (
            <KbachDivider width={180} />
          )}
        </div>

        {/* Khmer Guest Plaque */}
        {guestLine ? (
          template.family === "curtains" ? (
            <div className="relative z-10 mt-4 flex aspect-[4/1] w-full max-w-[250px] items-center justify-center px-7">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/templates/champagne-curtains/name-frame.png" alt="" aria-hidden className="pointer-events-none absolute inset-0 h-full w-full object-contain" />
              <p className="relative z-10 truncate text-xs text-[#364153] sm:text-[13px]" style={{ fontFamily: "var(--inv-display)" }}>
                {guestLine}
              </p>
            </div>
          ) : (
            <div
              className="relative z-10 mt-4 rounded-lg px-5 py-1.5 text-xs font-medium"
              style={{
                background: "color-mix(in oklab, var(--inv-accent) 12%, transparent)",
                border: "1px solid color-mix(in oklab, var(--inv-accent) 45%, transparent)",
                color: "var(--inv-ink)",
              }}
            >
              {guestLine}
            </div>
          )
        ) : null}

        {/* Open ធៀប CTA */}
        <div className="relative z-10 mt-6 flex w-full flex-col items-center gap-2.5">
          <button
            ref={btn}
            type="button"
            disabled={opening}
            onClick={open}
            className="w-full max-w-[220px] rounded-full px-8 py-3 text-base font-medium shadow-[0_14px_30px_-8px_rgba(122,74,46,0.48)] transition-all duration-200 hover:scale-[1.03] active:scale-95 disabled:opacity-60"
            style={{
              background: "linear-gradient(135deg, var(--inv-primary), color-mix(in oklab, var(--inv-primary) 70%, var(--inv-accent)))",
              border: "1px solid color-mix(in oklab, var(--inv-accent) 65%, transparent)",
              color: "var(--inv-on-primary)",
              fontFamily: "var(--inv-body)",
            }}
          >
            {button}
          </button>
          <button
            type="button"
            onClick={() => { if (!active.current) onOpenedEarly(); finish(); }}
            className="text-xs underline underline-offset-4 opacity-75 transition-opacity hover:opacity-100"
            style={{ color: "var(--inv-muted)" }}
          >
            {skipLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
