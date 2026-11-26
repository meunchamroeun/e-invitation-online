"use client";

/**
 * Invitation motion system — CSS-driven so it stays smooth inside Telegram / Messenger in-app browsers.
 * - Ambient particles per template (petals, lotus, gold dust, stars, confetti, leaves)
 * - Reveal variants (up / zoom / blur / fade / left)
 * - Ken Burns photos, ornament draw-in, gold shimmer, slow spin, parallax
 * Khmer text is never split into letters (that breaks subscript consonants and vowel signs) — names reveal as whole words.
 */
import { useEffect, useState } from "react";

export type ParticleKind = "petals" | "lotus" | "gold" | "stars" | "confetti" | "leaves" | "none";
export type MotionLevel = "full" | "subtle" | "off";

/** Deterministic pseudo-random (same on server and client). */
function rand(i: number, salt: number) {
  const x = Math.sin(i * 12.9898 + salt * 78.233) * 43758.5453;
  return x - Math.floor(x);
}

export const MOTION_CSS = `
@keyframes inv-fall { 0% { transform: translate3d(0,-12vh,0) rotate(0deg); } 100% { transform: translate3d(0,112vh,0) rotate(var(--r)); } }
@keyframes inv-sway { 0% { transform: translateX(calc(var(--sw) * -1)) rotateY(0deg); } 100% { transform: translateX(var(--sw)) rotateY(180deg); } }
@keyframes inv-rise { 0% { transform: translate3d(0,8vh,0); opacity: 0; } 15% { opacity: var(--o); } 85% { opacity: var(--o); } 100% { transform: translate3d(var(--sw),-60vh,0); opacity: 0; } }
@keyframes inv-twinkle { 0%,100% { opacity: .15; transform: scale(.7); } 50% { opacity: var(--o); transform: scale(1); } }
@keyframes inv-kb { from { transform: scale(1.02) translate3d(0,0,0); } to { transform: scale(1.13) translate3d(-2%,-1.5%,0); } }
@keyframes inv-draw { to { stroke-dashoffset: 0; } }
@keyframes inv-shimmer { 0%,100% { filter: brightness(1) drop-shadow(0 0 0 transparent); } 50% { filter: brightness(1.25) drop-shadow(0 0 6px color-mix(in oklab, var(--inv-accent) 55%, transparent)); } }
@keyframes inv-spin { to { transform: rotate(360deg); } }
@keyframes inv-float { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-8px); } }
@keyframes inv-glow { 0%,100% { text-shadow: 0 0 0 transparent; } 50% { text-shadow: 0 0 18px color-mix(in oklab, var(--inv-accent) 45%, transparent); } }

.inv-root .inv-reveal { opacity: 0; transition: opacity var(--rv-d,1s) cubic-bezier(.2,.7,.2,1), transform var(--rv-d,1s) cubic-bezier(.2,.7,.2,1), filter var(--rv-d,1s) ease; transform: translateY(var(--rv-y,18px)); }
.inv-root[data-reveal="zoom"] .inv-reveal { transform: scale(.93); }
.inv-root[data-reveal="blur"] .inv-reveal { transform: translateY(10px); filter: blur(8px); }
.inv-root[data-reveal="fade"] .inv-reveal { transform: none; }
.inv-root[data-reveal="left"] .inv-reveal { transform: translateX(-24px); }
.inv-root .inv-reveal.in { opacity: 1; transform: none; filter: none; }
.inv-root[data-motion="subtle"] { --rv-d: .7s; --rv-y: 8px; }

.inv-root:not([data-motion="off"]) .inv-kb > * { animation: inv-kb 18s ease-in-out infinite alternate; transform-origin: 60% 40%; }
.inv-root:not([data-motion="off"]) .inv-draw path[stroke], .inv-root:not([data-motion="off"]) .inv-draw path:not([fill]) { stroke-dasharray: 420; stroke-dashoffset: 420; animation: inv-draw 2.8s cubic-bezier(.4,.1,.2,1) .25s forwards; }
.inv-root:not([data-motion="off"]) .inv-shimmer { animation: inv-shimmer 3.6s ease-in-out infinite; }
.inv-root:not([data-motion="off"]) .inv-spin { animation: inv-spin 60s linear infinite; }
.inv-root:not([data-motion="off"]) .inv-float { animation: inv-float 6s ease-in-out infinite; }
.inv-root[data-motion="full"] .inv-glow { animation: inv-glow 4.5s ease-in-out infinite; }
.inv-root[data-motion="off"] .inv-reveal { opacity: 1 !important; transform: none !important; filter: none !important; transition: none !important; }

@media (prefers-reduced-motion: reduce) {
  .inv-root .inv-reveal { opacity: 1 !important; transform: none !important; filter: none !important; }
  .inv-root .inv-kb > *, .inv-root .inv-shimmer, .inv-root .inv-spin, .inv-root .inv-float, .inv-root .inv-glow, .inv-particles { animation: none !important; }
  .inv-particles { display: none; }
  .inv-root .inv-draw path { stroke-dashoffset: 0 !important; animation: none !important; }
}
`;

function PetalShape({ color, kind }: { color: string; kind: ParticleKind }) {
  if (kind === "leaves")
    return <svg viewBox="-10 -16 20 32" width="100%" height="100%"><path d="M0 -15 C 9 -8, 9 8, 0 15 C -9 8, -9 -8, 0 -15Z" fill={color} /><path d="M0 -13 V13" stroke="rgba(255,255,255,.45)" strokeWidth="1" /></svg>;
  if (kind === "lotus")
    return <svg viewBox="-10 -16 20 32" width="100%" height="100%"><path d="M0 15 C 10 6, 9 -8, 0 -15 C -9 -8, -10 6, 0 15Z" fill={color} opacity=".9" /><path d="M0 12 C 4 4, 3 -6, 0 -11" stroke="rgba(255,255,255,.5)" strokeWidth="1" fill="none" /></svg>;
  // rose petal: rounded heart-ish with a soft notch
  return <svg viewBox="-12 -12 24 24" width="100%" height="100%"><path d="M0 11 C -11 4, -12 -6, -5 -10 C -2 -11, 0 -8, 0 -6 C 0 -8, 2 -11, 5 -10 C 12 -6, 11 4, 0 11Z" fill={color} /><path d="M-3 -5 C -4 0, -2 5, 0 8" stroke="rgba(255,255,255,.35)" strokeWidth="1" fill="none" /></svg>;
}

/** Ambient particle layer. Rendered after mount (never blocks first paint); disabled for reduced-motion users via CSS. */
export function Ambient({ kind, level, colors, contained }: { kind: ParticleKind; level: MotionLevel; colors: string[]; contained?: boolean }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    // Defer until the browser is idle so the invitation renders first.
    const w = window as unknown as { requestIdleCallback?: (cb: () => void) => number };
    const id = w.requestIdleCallback ? w.requestIdleCallback(() => setMounted(true)) : window.setTimeout(() => setMounted(true), 600);
    return () => { if (!w.requestIdleCallback) window.clearTimeout(id); };
  }, []);
  if (!mounted || kind === "none" || level === "off") return null;
  const count = { petals: 16, lotus: 10, gold: 26, stars: 34, confetti: 26, leaves: 14 }[kind] * (level === "subtle" ? 0.45 : 1);
  const pos = contained ? "absolute" : "fixed";
  return (
    <div aria-hidden className={`inv-particles pointer-events-none ${pos} inset-0 z-[5] overflow-hidden`}>
      {Array.from({ length: Math.round(count) }).map((_, i) => {
        const r1 = rand(i, 1), r2 = rand(i, 2), r3 = rand(i, 3), r4 = rand(i, 4);
        const color = colors[i % colors.length];
        const left = `${(r1 * 100).toFixed(2)}%`;
        if (kind === "stars" || kind === "gold") {
          const size = kind === "stars" ? 1.5 + r2 * 2.5 : 2 + r2 * 4;
          const style: React.CSSProperties = {
            position: "absolute", left, top: kind === "stars" ? `${(r3 * 70).toFixed(2)}%` : undefined, bottom: kind === "gold" ? `${(r3 * 30 - 10).toFixed(2)}%` : undefined,
            width: size, height: size, borderRadius: "50%", background: color,
            boxShadow: `0 0 ${size * 3}px ${size}px ${color}`,
            ["--o" as string]: (0.5 + r4 * 0.5).toFixed(2), ["--sw" as string]: `${((r2 - 0.5) * 80).toFixed(0)}px`,
            animation: kind === "stars" ? `inv-twinkle ${(2.5 + r2 * 4).toFixed(2)}s ease-in-out ${(-r3 * 6).toFixed(2)}s infinite` : `inv-rise ${(9 + r2 * 10).toFixed(2)}s linear ${(-r3 * 18).toFixed(2)}s infinite`,
          };
          return <span key={i} style={style} />;
        }
        if (kind === "confetti") {
          const w = 5 + r2 * 6, h = r4 > 0.5 ? w : w * 0.45;
          return (
            <span key={i} style={{ position: "absolute", left, top: 0, ["--r" as string]: `${(360 + r3 * 720).toFixed(0)}deg`, animation: `inv-fall ${(7 + r2 * 7).toFixed(2)}s linear ${(-r3 * 14).toFixed(2)}s infinite` }}>
              <span style={{ display: "block", width: w, height: h, background: color, borderRadius: r4 > 0.7 ? "50%" : 2, ["--sw" as string]: "14px", animation: `inv-sway ${(1.2 + r1 * 1.4).toFixed(2)}s ease-in-out infinite alternate` }} />
            </span>
          );
        }
        const size = kind === "lotus" ? 18 + r2 * 16 : kind === "leaves" ? 12 + r2 * 12 : 12 + r2 * 13;
        return (
          <span key={i} style={{ position: "absolute", left, top: 0, width: size, height: size, opacity: 0.55 + r4 * 0.4, ["--r" as string]: `${(180 + r3 * 360).toFixed(0)}deg`, animation: `inv-fall ${(kind === "lotus" ? 16 : 11) + r2 * 9}s linear ${(-r3 * 22).toFixed(2)}s infinite` }}>
            <span style={{ display: "block", width: "100%", height: "100%", ["--sw" as string]: `${(20 + r1 * 30).toFixed(0)}px`, animation: `inv-sway ${(2.6 + r4 * 2.6).toFixed(2)}s ease-in-out infinite alternate` }}>
              <PetalShape color={color} kind={kind} />
            </span>
          </span>
        );
      })}
    </div>
  );
}

/** Scroll parallax for elements marked data-parallax="0.15" (fraction of scroll). rAF-throttled, passive. */
export function useParallax(root: React.RefObject<HTMLElement | null>, enabled: boolean) {
  useEffect(() => {
    const el = root.current;
    if (!el || !enabled || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const win = el.ownerDocument.defaultView ?? window;
    let raf = 0;
    const items = () => el.querySelectorAll<HTMLElement>("[data-parallax]");
    const update = () => {
      raf = 0;
      const y = win.scrollY;
      if (y > win.innerHeight * 1.6) return;
      items().forEach((n) => { n.style.transform = `translate3d(0, ${(y * Number(n.dataset.parallax)).toFixed(1)}px, 0)`; });
    };
    const on = () => { if (!raf) raf = win.requestAnimationFrame(update); };
    win.addEventListener("scroll", on, { passive: true });
    update();
    return () => { win.removeEventListener("scroll", on); if (raf) win.cancelAnimationFrame(raf); };
  }, [root, enabled]);
}
