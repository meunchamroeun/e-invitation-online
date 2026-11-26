"use client";

import { useEffect, useRef, useState } from "react";
import type { TemplateDef } from "@/features/templates/registry";
import { ChanPatternBg, GoldDivider, KbachDivider, MarbleBg, RoseCluster, WaxSeal } from "./ornaments";
import { Photo } from "./photo";

type Phase = "closed" | "seal" | "flap" | "card" | "leave" | "done";

export function Envelope({
  template,
  kicker,
  names,
  photo,
  button,
  guestLine,
  skipLabel,
  initials,
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
  onOpened: () => void;
}) {
  const [phase, setPhase] = useState<Phase>("closed");
  const timers = useRef<number[]>([]);
  const btn = useRef<HTMLButtonElement>(null);
  const e = template.envelope;

  useEffect(() => {
    btn.current?.focus({ preventScroll: true });
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
      timers.current.forEach((t) => window.clearTimeout(t));
    };
  }, []);

  function finish() {
    timers.current.forEach((t) => window.clearTimeout(t));
    setPhase("done");
    document.body.style.overflow = "";
    onOpened();
  }

  function open() {
    if (phase !== "closed") return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    onOpenedEarly();
    if (reduce) return finish();
    const seq: [Phase, number][] = [["seal", 0], ["flap", 380], ["card", 1050], ["leave", 1900]];
    seq.forEach(([p, ms]) => timers.current.push(window.setTimeout(() => setPhase(p), ms)));
    timers.current.push(window.setTimeout(finish, 2500));
  }
  // Start audio inside the user gesture (browsers block autoplay otherwise).
  function onOpenedEarly() {
    window.dispatchEvent(new CustomEvent("invite:gesture"));
  }

  if (phase === "done") return null;
  const after = (p: Phase) => ["seal", "flap", "card", "leave"].indexOf(phase) >= ["seal", "flap", "card", "leave"].indexOf(p);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={button}
      className="fixed inset-0 z-50 flex flex-col items-center justify-center overflow-hidden px-6"
      style={{
        background: "var(--inv-bg)",
        color: "var(--inv-ink)",
        transition: "opacity 600ms ease, transform 600ms ease",
        opacity: phase === "leave" ? 0 : 1,
        transform: phase === "leave" ? "scale(1.04)" : "none",
      }}
    >
      {template.family === "marble" ? (
        <>
          <MarbleBg />
          <RoseCluster corner="bl" scale={0.7} />
          <RoseCluster corner="tr" scale={0.55} line />
        </>
      ) : (
        <div className="absolute inset-0" style={{ color: "var(--inv-primary)" }}>
          <ChanPatternBg opacity={0.07} />
        </div>
      )}
      <div className="absolute inset-0 opacity-40">
        <Photo src={photo} alt="" className="opacity-25 blur-[2px]" />
      </div>
      <div className="absolute inset-0" style={{ background: "radial-gradient(ellipse at center, transparent 0%, var(--inv-bg) 72%)" }} />

      <div className="relative z-10 mb-8 text-center" style={{ transition: "opacity 400ms", opacity: after("flap") ? 0 : 1 }}>
        <p className="text-sm" style={{ color: "var(--inv-muted)" }}>{kicker}</p>
        <h1 className="mt-2 text-3xl sm:text-4xl" style={{ fontFamily: "var(--inv-display)", color: "var(--inv-primary)" }}>
          {names}
        </h1>
        <div className="mt-3 flex justify-center" style={{ color: "var(--inv-primary)" }}>
          {template.family === "marble" ? <span style={{ color: "var(--inv-accent)" }}><GoldDivider width={220} /></span> : <KbachDivider width={200} />}
        </div>
      </div>

      {/* Envelope */}
      <div className="relative z-10" style={{ perspective: "1400px", width: "min(84vw, 400px)", aspectRatio: "1.5" }}>
        <div className="absolute inset-0 rounded-md shadow-[0_30px_60px_-25px_rgba(0,0,0,0.55)]" style={{ background: e.body }} />
        {/* Card */}
        <div
          className="absolute inset-x-[6%] top-[6%] bottom-[6%] flex flex-col items-center justify-center rounded-sm px-4 text-center"
          style={{
            background: "var(--inv-surface)",
            color: "var(--inv-ink)",
            transform: after("card") ? "translateY(-58%)" : "translateY(0)",
            transition: "transform 900ms cubic-bezier(.2,.8,.2,1), opacity 300ms",
            opacity: after("flap") ? 1 : 0,
            zIndex: after("card") ? 4 : 1,
            boxShadow: "0 10px 30px -12px rgba(0,0,0,0.35)",
          }}
        >
          <span className="text-[11px]" style={{ color: "var(--inv-muted)" }}>{guestLine}</span>
          <span className="mt-1 text-lg" style={{ fontFamily: "var(--inv-display)", color: "var(--inv-primary)" }}>{names}</span>
        </div>
        {/* Front pocket */}
        <div
          className="absolute inset-0 rounded-md"
          style={{ background: `linear-gradient(160deg, ${e.flap}, ${e.body})`, clipPath: "polygon(0 22%, 50% 62%, 100% 22%, 100% 100%, 0 100%)", zIndex: 3 }}
        />
        {/* Flap */}
        <div
          className="absolute inset-x-0 top-0 h-[62%] origin-top"
          style={{
            transformStyle: "preserve-3d",
            transform: after("flap") ? "rotateX(180deg)" : "rotateX(0deg)",
            transition: "transform 800ms cubic-bezier(.5,.1,.3,1)",
            zIndex: after("flap") ? 0 : 5,
          }}
        >
          <div className="absolute inset-0" style={{ background: e.flap, clipPath: "polygon(0 0, 100% 0, 50% 100%)", backfaceVisibility: "hidden", filter: "drop-shadow(0 2px 2px rgba(0,0,0,.2))" }} />
          <div className="absolute inset-0" style={{ background: e.liner, clipPath: "polygon(0 0, 100% 0, 50% 100%)", transform: "rotateX(180deg)", backfaceVisibility: "hidden" }} />
        </div>
        {/* Seal */}
        <div
          className="absolute left-1/2 top-[62%] z-[6] -translate-x-1/2 -translate-y-1/2"
          style={{ transition: "transform 380ms ease, opacity 380ms ease", transform: `translate(-50%,-50%) scale(${after("seal") ? 1.25 : 1})`, opacity: after("seal") ? 0 : 1 }}
        >
          <WaxSeal size={72} color={e.seal} initials={initials} />
        </div>
      </div>

      <div className="relative z-10 mt-10 flex flex-col items-center gap-3" style={{ transition: "opacity 300ms", opacity: phase === "closed" ? 1 : 0 }}>
        <button
          ref={btn}
          onClick={open}
          className="rounded-full px-8 py-3 text-base shadow-lg transition-transform hover:scale-[1.03] active:scale-95"
          style={{ background: "var(--inv-primary)", color: "var(--inv-on-primary)", fontFamily: "var(--inv-body)" }}
        >
          {button}
        </button>
        <button onClick={() => { onOpenedEarly(); finish(); }} className="text-xs underline underline-offset-4" style={{ color: "var(--inv-muted)" }}>
          {skipLabel}
        </button>
      </div>
    </div>
  );
}
