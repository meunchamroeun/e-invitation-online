"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

/**
 * Realistic phone frame modelled on the iPhone 18 Pro Max (per Apple's published specs):
 * 6.9" display, 2868×1320 px @ 460 ppi → 440×956 CSS points; body 78.0 × 163.4 mm (≈ 471×987 pt);
 * aluminium unibody in Black / Silver / Glacier / Burgundy; Dynamic Island; Action button, volume
 * buttons, side button and Camera Control. Everything is drawn in CSS — no Apple artwork is used.
 */
export const DEVICE = {
  name: "iPhone 18 Pro Max",
  screenW: 440,
  screenH: 956,
  bezel: 15.5, // body edge + black border around the glass, in points
  bodyRadius: 70,
  screenRadius: 58,
  statusH: 54,
} as const;

export type Finish = "black" | "silver" | "glacier" | "burgundy";

export const FINISHES: Record<Finish, { label: string; edge: string; band: string; button: string; swatch: string }> = {
  black: { label: "Black", edge: "linear-gradient(135deg,#4a4a4d 0%,#1d1d1f 18%,#3a3a3c 45%,#151516 70%,#47474a 100%)", band: "#2c2c2e", button: "#2a2a2c", swatch: "#2c2c2e" },
  silver: { label: "Silver", edge: "linear-gradient(135deg,#f4f4f2 0%,#c9c9c6 20%,#ecebe8 45%,#b9b8b4 72%,#f2f1ee 100%)", band: "#d6d5d1", button: "#c4c3bf", swatch: "#dcdbd7" },
  glacier: { label: "Glacier", edge: "linear-gradient(135deg,#e7eef3 0%,#aebfcc 22%,#dbe6ee 48%,#9fb2c1 74%,#e3ecf2 100%)", band: "#c3d1dc", button: "#adbdca", swatch: "#bfd0dd" },
  burgundy: { label: "Burgundy", edge: "linear-gradient(135deg,#8a3a4a 0%,#4f1622 22%,#7a2a3a 48%,#3f0f1a 74%,#8f4050 100%)", band: "#5e1b29", button: "#561726", swatch: "#6b2232" },
};

export const FRAME_W = DEVICE.screenW + DEVICE.bezel * 2;
export const FRAME_H = DEVICE.screenH + DEVICE.bezel * 2;

function StatusBar({ dark }: { dark: boolean }) {
  const c = dark ? "#fff" : "#0b0b0c";
  return (
    <div className="pointer-events-none absolute inset-x-0 top-0 z-20 flex items-start justify-between px-[34px] pt-[19px]" style={{ height: DEVICE.statusH, color: c, fontFamily: "-apple-system, 'SF Pro Text', 'Inter Variable', system-ui, sans-serif" }}>
      <span className="w-[86px] text-center text-[17px] font-semibold tracking-tight">9:41</span>
      <span className="flex items-center gap-[6px] pt-[3px]">
        {/* signal */}
        <svg width="19" height="12" viewBox="0 0 19 12" fill={c}><rect x="0" y="8" width="3.2" height="4" rx="1" /><rect x="5" y="5.5" width="3.2" height="6.5" rx="1" /><rect x="10" y="3" width="3.2" height="9" rx="1" /><rect x="15" y="0" width="3.2" height="12" rx="1" /></svg>
        {/* wifi */}
        <svg width="17" height="12" viewBox="0 0 17 12" fill={c}><path d="M8.5 2.4c2.3 0 4.4.9 6 2.4l1.2-1.2A10.1 10.1 0 0 0 8.5.6 10.1 10.1 0 0 0 1.3 3.6l1.2 1.2a8.4 8.4 0 0 1 6-2.4Z" /><path d="M8.5 5.8c1.4 0 2.6.5 3.6 1.4l1.2-1.2a6.7 6.7 0 0 0-9.6 0l1.2 1.2c1-.9 2.2-1.4 3.6-1.4Z" /><path d="M8.5 9.2c.5 0 .9.2 1.2.5L8.5 11 7.3 9.7c.3-.3.7-.5 1.2-.5Z" /></svg>
        {/* battery */}
        <svg width="27" height="13" viewBox="0 0 27 13"><rect x="0.5" y="0.5" width="22.5" height="12" rx="3.6" fill="none" stroke={c} strokeOpacity=".4" /><rect x="2.2" y="2.2" width="19" height="8.6" rx="2.2" fill={c} /><path d="M24.6 4.3v4.4c.9-.3 1.5-1.2 1.5-2.2s-.6-1.9-1.5-2.2Z" fill={c} fillOpacity=".45" /></svg>
      </span>
    </div>
  );
}

/** The phone at native point size (471×987). Wrap in <FitDevice> to scale it into a container. */
export function DeviceFrame({ children, finish = "black", darkStatus = false, statusBg, showStatusBar = true, className = "" }: { children: ReactNode; finish?: Finish; darkStatus?: boolean; statusBg?: string; showStatusBar?: boolean; className?: string }) {
  const f = FINISHES[finish];
  const btn = (style: React.CSSProperties) => (
    <span aria-hidden className="absolute" style={{ width: 4, borderRadius: 2, background: `linear-gradient(90deg, ${f.button}, ${f.band} 60%, rgba(255,255,255,.35))`, boxShadow: "inset 0 0 0 .5px rgba(0,0,0,.25)", ...style }} />
  );
  return (
    <div className={`relative ${className}`} style={{ width: FRAME_W, height: FRAME_H }} role="img" aria-label={`${DEVICE.name} preview (${f.label})`}>
      {/* left: Action button, volume up, volume down */}
      {btn({ left: -3, top: 196, height: 34 })}
      {btn({ left: -3, top: 258, height: 64 })}
      {btn({ left: -3, top: 336, height: 64 })}
      {/* right: side button + Camera Control (flush, slightly lower) */}
      {btn({ right: -3, top: 286, height: 104 })}
      <span aria-hidden className="absolute" style={{ right: -1.5, top: 610, width: 3, height: 74, borderRadius: 2, background: `linear-gradient(90deg, rgba(0,0,0,.35), ${f.band})` }} />

      {/* aluminium body */}
      <div className="absolute inset-0" style={{ borderRadius: DEVICE.bodyRadius, background: f.edge, boxShadow: "0 50px 90px -40px rgba(0,0,0,.55), 0 18px 30px -18px rgba(0,0,0,.35), inset 0 0 0 1px rgba(255,255,255,.18), inset 0 0 2px 1px rgba(0,0,0,.35)" }} />
      {/* antenna lines */}
      {[118, FRAME_H - 118].map((y) => <span key={y} aria-hidden className="absolute inset-x-0 h-[3px]" style={{ top: y, background: "rgba(0,0,0,.18)" }} />)}
      {/* black glass border */}
      <div className="absolute" style={{ inset: 4, borderRadius: DEVICE.bodyRadius - 4, background: "#050506", boxShadow: "inset 0 0 0 1px rgba(255,255,255,.06)" }} />

      {/* screen */}
      <div className="absolute overflow-hidden" style={{ left: DEVICE.bezel, top: DEVICE.bezel, width: DEVICE.screenW, height: DEVICE.screenH, borderRadius: DEVICE.screenRadius, background: statusBg ?? (darkStatus ? "#000" : "#fff"), isolation: "isolate" }}>
        {showStatusBar ? <StatusBar dark={darkStatus} /> : null}
        <div className="absolute inset-x-0 bottom-0" style={{ top: showStatusBar ? DEVICE.statusH : 0 }}>{children}</div>
        {/* Dynamic Island */}
        <span aria-hidden className="absolute left-1/2 z-30 -translate-x-1/2" style={{ top: 11, width: 125, height: 37, borderRadius: 20, background: "#000", boxShadow: "inset 0 0 0 .5px rgba(255,255,255,.06)" }}>
          <span className="absolute right-[22px] top-1/2 h-[11px] w-[11px] -translate-y-1/2 rounded-full" style={{ background: "radial-gradient(circle at 35% 35%, #2a3550, #0a0d16 60%)" }} />
        </span>
        {/* home indicator */}
        <span aria-hidden className="pointer-events-none absolute bottom-[8px] left-1/2 z-30 h-[5px] w-[144px] -translate-x-1/2 rounded-full" style={{ background: darkStatus ? "rgba(255,255,255,.75)" : "rgba(0,0,0,.72)", mixBlendMode: "normal" }} />
        {/* glass sheen */}
        <span aria-hidden className="pointer-events-none absolute inset-0 z-40" style={{ borderRadius: DEVICE.screenRadius, background: "linear-gradient(115deg, rgba(255,255,255,.07) 0%, rgba(255,255,255,0) 35%)" }} />
      </div>
    </div>
  );
}

/** Scales the native-size frame to fit its container (keeps the 440-pt viewport inside intact). */
export function FitDevice({ children, maxScale = 1, className = "", ...frame }: Parameters<typeof DeviceFrame>[0] & { maxScale?: number }) {
  const box = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.6);
  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => {
      const { width, height } = e.contentRect;
      setScale(Math.max(0.2, Math.min(maxScale, (width - 8) / (FRAME_W + 8), (height - 8) / (FRAME_H + 8))));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [maxScale]);
  return (
    <div ref={box} className={`flex h-full w-full items-start justify-center ${className}`}>
      <div style={{ width: FRAME_W * scale, height: FRAME_H * scale }}>
        <div style={{ transform: `scale(${scale})`, transformOrigin: "top left", width: FRAME_W, height: FRAME_H }}>
          <DeviceFrame {...frame}>{children}</DeviceFrame>
        </div>
      </div>
    </div>
  );
}

/** Static-scale frame for decorative use (homepage, cards). */
export function StaticDevice({ scale, children, ...frame }: Parameters<typeof DeviceFrame>[0] & { scale: number }) {
  return (
    <div style={{ width: FRAME_W * scale, height: FRAME_H * scale }}>
      <div style={{ transform: `scale(${scale})`, transformOrigin: "top left", width: FRAME_W, height: FRAME_H }}>
        <DeviceFrame {...frame}>{children}</DeviceFrame>
      </div>
    </div>
  );
}

export function FinishPicker({ value, onChange }: { value: Finish; onChange: (f: Finish) => void }) {
  return (
    <div className="flex items-center gap-1.5" role="radiogroup" aria-label="Phone colour">
      {(Object.keys(FINISHES) as Finish[]).map((k) => (
        <button key={k} role="radio" aria-checked={value === k} title={FINISHES[k].label} onClick={() => onChange(k)}
          className={`h-6 w-6 rounded-full border-2 transition-transform ${value === k ? "scale-110 border-ink" : "border-white shadow-[0_0_0_1px_#ddd8cf]"}`}
          style={{ background: FINISHES[k].swatch }} />
      ))}
    </div>
  );
}
