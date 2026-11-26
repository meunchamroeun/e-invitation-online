/**
 * Original Khmer ornament library (kbach) — all shapes are drawn procedurally here,
 * inspired by the four classical schools (kbach Angkor, phni tes, phni voa, phni pleung).
 * No third-party artwork is copied. Colors come from `currentColor` so every template can tint them.
 */
import { useId, type SVGProps } from "react";

type P = SVGProps<SVGSVGElement> & { size?: number | string };

const fmt = (n: number) => Math.round(n * 100) / 100;

/** Pointed lotus/leaf petal pointing up from origin, length r, half-width w. */
function petal(r: number, w: number) {
  return `M0 0 C ${fmt(w)} ${fmt(-r * 0.3)} ${fmt(w * 0.9)} ${fmt(-r * 0.78)} 0 ${fmt(-r)} C ${fmt(-w * 0.9)} ${fmt(-r * 0.78)} ${fmt(-w)} ${fmt(-r * 0.3)} 0 0Z`;
}

/** Phni pleung — flame tongue with a flicked tip (small base, thick middle, curling point). */
function flame(r: number, w: number, flick = 0.35) {
  return `M0 0 C ${fmt(w)} ${fmt(-r * 0.25)} ${fmt(w * 1.1)} ${fmt(-r * 0.62)} ${fmt(w * flick)} ${fmt(-r * 0.86)} C ${fmt(w * flick * 0.2)} ${fmt(-r * 0.95)} ${fmt(r * flick * 0.5)} ${fmt(-r * 1.02)} ${fmt(r * flick * 0.35)} ${fmt(-r * 1.12)} C ${fmt(-w * 0.2)} ${fmt(-r * 0.98)} ${fmt(-w * 1.05)} ${fmt(-r * 0.7)} ${fmt(-w * 0.85)} ${fmt(-r * 0.35)} C ${fmt(-w * 0.7)} ${fmt(-r * 0.15)} ${fmt(-w * 0.2)} ${fmt(-r * 0.04)} 0 0Z`;
}

/** Vong hien — snail-shell spiral as a stroked path. */
function spiral(turns = 2.2, r = 10, steps = 48) {
  let d = "";
  for (let i = 0; i <= steps; i++) {
    const t = (i / steps) * turns * Math.PI * 2;
    const rr = r * (1 - i / steps) ** 1.15;
    const x = Math.cos(t) * rr;
    const y = Math.sin(t) * rr;
    d += `${i === 0 ? "M" : "L"}${fmt(x)} ${fmt(y)} `;
  }
  return d;
}

/** Chan flower (ផ្កាចន្ទ) — the most used medallion of Angkorian decoration. */
export function ChanFlower({ size = 64, petals = 8, ...rest }: P & { petals?: number }) {
  const step = 360 / petals;
  return (
    <svg viewBox="-50 -50 100 100" width={size} height={size} aria-hidden fill="currentColor" {...rest}>
      <g opacity="0.95">
        {Array.from({ length: petals }).map((_, i) => (
          <path key={`o${i}`} d={flame(46, 12, 0.3)} transform={`rotate(${i * step + step / 2})`} opacity="0.55" />
        ))}
        {Array.from({ length: petals }).map((_, i) => (
          <path key={`m${i}`} d={petal(36, 11)} transform={`rotate(${i * step})`} />
        ))}
      </g>
      <circle r="15" fill="none" stroke="currentColor" strokeWidth="2.2" />
      {Array.from({ length: 12 }).map((_, i) => (
        <circle key={`d${i}`} r="1.8" cx={fmt(Math.cos((i * Math.PI) / 6) * 19.5)} cy={fmt(Math.sin((i * Math.PI) / 6) * 19.5)} />
      ))}
      <circle r="9" />
      <circle r="4" fill="var(--inv-bg, #fff)" opacity="0.6" />
    </svg>
  );
}

/** Frontal lotus (ផ្កាឈូក) — three tiers of petals. */
export function Lotus({ size = 64, ...rest }: P) {
  return (
    <svg viewBox="-50 -60 100 70" width={size} height={(Number(size) * 0.7) || undefined} aria-hidden fill="currentColor" {...rest}>
      {[-62, -38, 38, 62].map((a) => (
        <path key={a} d={petal(40, 12)} transform={`rotate(${a})`} opacity="0.45" />
      ))}
      {[-22, 22].map((a) => (
        <path key={a} d={petal(48, 13)} transform={`rotate(${a})`} opacity="0.72" />
      ))}
      <path d={petal(55, 15)} />
      <path d="M-46 6 Q0 -6 46 6" fill="none" stroke="currentColor" strokeWidth="2" />
    </svg>
  );
}

/** A single kbach phni pleung flame — used for borders and finials. */
export function Flame({ size = 24, ...rest }: P) {
  return (
    <svg viewBox="-20 -46 40 50" width={size} height={size} aria-hidden fill="currentColor" {...rest}>
      <path d={flame(40, 13, 0.4)} />
    </svg>
  );
}

/** Horizontal divider: rule — vine with spirals & flames — central lotus — mirrored. */
export function KbachDivider({ width = 320, ...rest }: P & { width?: number }) {
  const half = (
    <g>
      <path d="M-150 0 H-58" stroke="currentColor" strokeWidth="1.2" fill="none" />
      <path d="M-58 0 C-48 -10 -36 -10 -30 -2" stroke="currentColor" strokeWidth="1.6" fill="none" />
      <path d={spiral(1.6, 6)} transform="translate(-60 -4) rotate(200)" stroke="currentColor" strokeWidth="1.4" fill="none" />
      {[-44, -34].map((x, i) => (
        <path key={x} d={flame(14, 4.5, 0.4)} transform={`translate(${x} ${-1}) rotate(${-70 + i * 10})`} />
      ))}
      <path d={flame(12, 4, 0.4)} transform="translate(-40 2) rotate(-125)" opacity="0.7" />
      <circle cx="-150" cy="0" r="2" />
      <circle cx="-136" cy="0" r="1.2" />
    </g>
  );
  return (
    <svg viewBox="-160 -26 320 40" width={width} height={(width * 40) / 320} aria-hidden fill="currentColor" {...rest}>
      {half}
      <g transform="scale(-1 1)">{half}</g>
      <g transform="translate(0 6) scale(0.42)">
        <path d={petal(55, 15)} />
        {[-24, 24].map((a) => (
          <path key={a} d={petal(46, 12)} transform={`rotate(${a})`} opacity="0.7" />
        ))}
        {[-52, 52].map((a) => (
          <path key={a} d={petal(36, 10)} transform={`rotate(${a})`} opacity="0.45" />
        ))}
      </g>
    </svg>
  );
}

/** Corner piece for frames. Default orientation: top-left. */
export function KbachCorner({ size = 120, ...rest }: P) {
  return (
    <svg viewBox="0 0 120 120" width={size} height={size} aria-hidden fill="currentColor" {...rest}>
      <path d="M6 116 V18 Q6 6 18 6 H116" fill="none" stroke="currentColor" strokeWidth="1.4" />
      <path d="M14 116 V26 Q14 14 26 14 H116" fill="none" stroke="currentColor" strokeWidth="0.7" opacity="0.7" />
      <g transform="translate(30 30)">
        <path d={spiral(2, 11)} fill="none" stroke="currentColor" strokeWidth="1.6" transform="rotate(-45)" />
        {[-10, 35, 80].map((a, i) => (
          <path key={a} d={flame(30 - i * 3, 8, 0.4)} transform={`rotate(${a + 60}) translate(0 -8)`} opacity={0.9 - i * 0.15} />
        ))}
      </g>
      <g transform="translate(58 18)">
        <path d={spiral(1.5, 6)} fill="none" stroke="currentColor" strokeWidth="1.2" />
        <path d={flame(16, 5, 0.4)} transform="translate(8 2) rotate(80)" />
      </g>
      <g transform="translate(18 58)">
        <path d={spiral(1.5, 6)} fill="none" stroke="currentColor" strokeWidth="1.2" transform="scale(-1 1)" />
        <path d={flame(16, 5, 0.4)} transform="translate(2 8) rotate(170)" />
      </g>
      <g transform="translate(80 10) scale(0.12)"><ChanPath /></g>
      <g transform="translate(10 80) scale(0.12)"><ChanPath /></g>
    </svg>
  );
}

function ChanPath() {
  return (
    <g>
      {Array.from({ length: 8 }).map((_, i) => (
        <path key={i} d={petal(36, 11)} transform={`rotate(${i * 45})`} />
      ))}
      <circle r="10" />
    </g>
  );
}

/** Four corners + optional edge flames around a positioned parent. */
export function KbachFrame({ inset = 12, size = 96, className = "" }: { inset?: number; size?: number; className?: string }) {
  const pos = [
    { s: { top: inset, left: inset }, t: "" },
    { s: { top: inset, right: inset }, t: "scaleX(-1)" },
    { s: { bottom: inset, left: inset }, t: "scaleY(-1)" },
    { s: { bottom: inset, right: inset }, t: "scale(-1,-1)" },
  ];
  return (
    <div aria-hidden className={`pointer-events-none absolute inset-0 ${className}`}>
      {pos.map((p, i) => (
        <KbachCorner key={i} size={size} style={{ position: "absolute", ...p.s, transform: p.t }} />
      ))}
    </div>
  );
}

/** Angkor-style five-tower silhouette (original simplified drawing). */
export function PrasatSilhouette({ width = 600, ...rest }: P & { width?: number }) {
  const tower = (x: number, h: number, w: number) => {
    const tiers = 6;
    let d = `M${x - w / 2} 200 `;
    for (let i = 0; i < tiers; i++) {
      const y = 200 - (h * i) / tiers;
      const ww = (w / 2) * (1 - i / (tiers + 1.5));
      d += `L${fmt(x - ww)} ${fmt(y - h / tiers / 2)} L${fmt(x - ww * 0.86)} ${fmt(y - h / tiers)} `;
    }
    d += `L${x} ${200 - h - 18} `;
    for (let i = tiers - 1; i >= 0; i--) {
      const y = 200 - (h * i) / tiers;
      const ww = (w / 2) * (1 - i / (tiers + 1.5));
      d += `L${fmt(x + ww * 0.86)} ${fmt(y - h / tiers)} L${fmt(x + ww)} ${fmt(y - h / tiers / 2)} `;
    }
    return d + `L${x + w / 2} 200Z`;
  };
  return (
    <svg viewBox="0 0 600 200" width={width} height={(width * 200) / 600} aria-hidden fill="currentColor" preserveAspectRatio="xMidYMax meet" {...rest}>
      <path d="M0 200 L40 176 H560 L600 200Z" opacity="0.9" />
      <rect x="60" y="160" width="480" height="18" opacity="0.9" />
      <path d={tower(110, 70, 46)} opacity="0.8" />
      <path d={tower(490, 70, 46)} opacity="0.8" />
      <path d={tower(200, 98, 54)} opacity="0.9" />
      <path d={tower(400, 98, 54)} opacity="0.9" />
      <path d={tower(300, 150, 70)} />
      {[150, 250, 350, 450].map((x) => (
        <rect key={x} x={x - 22} y="146" width="44" height="16" opacity="0.85" />
      ))}
    </svg>
  );
}

/** Sugar palm (ដើមត្នោត) silhouettes — a quintessential Cambodian landscape. */
export function SugarPalms({ width = 300, ...rest }: P & { width?: number }) {
  const palm = (x: number, h: number, k: number) => {
    const top = 200 - h;
    const fronds = Array.from({ length: 11 }).map((_, i) => {
      const a = (-170 + (i * 160) / 10) * (Math.PI / 180);
      const L = 26 + (i % 2) * 6;
      const ex = x + Math.cos(a) * L;
      const ey = top + Math.sin(a) * L * 0.8;
      return <path key={i} d={`M${x} ${top} Q${fmt((x + ex) / 2)} ${fmt(top - 10)} ${fmt(ex)} ${fmt(ey + 8)}`} stroke="currentColor" strokeWidth="2.4" fill="none" strokeLinecap="round" />;
    });
    return (
      <g key={k}>
        <path d={`M${x - 2} 200 Q${x + 4} ${200 - h / 2} ${x} ${top}`} stroke="currentColor" strokeWidth="3" fill="none" />
        {fronds}
        <circle cx={x} cy={top + 3} r="4" />
      </g>
    );
  };
  return (
    <svg viewBox="0 0 300 200" width={width} height={(width * 200) / 300} aria-hidden fill="currentColor" preserveAspectRatio="xMidYMax meet" {...rest}>
      {palm(60, 150, 1)}
      {palm(118, 118, 2)}
      {palm(236, 170, 3)}
      <path d="M0 200 Q150 186 300 200Z" />
    </svg>
  );
}

/** Sampot / hol-inspired woven band (repeating diamond & tooth pattern). */
export function WeaveBand({ height = 18, className = "" }: { height?: number; className?: string }) {
  const id = `weave${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;
  return (
    <svg width="100%" height={height} aria-hidden className={className} preserveAspectRatio="none">
      <defs>
        <pattern id={id} width="24" height="18" patternUnits="userSpaceOnUse">
          <rect width="24" height="2" fill="currentColor" />
          <rect y="16" width="24" height="2" fill="currentColor" />
          <path d="M0 9 L6 4 L12 9 L6 14Z M12 9 L18 4 L24 9 L18 14Z" fill="currentColor" opacity="0.85" />
          <circle cx="6" cy="9" r="1.5" fill="var(--inv-bg, #fff)" />
          <circle cx="18" cy="9" r="1.5" fill="var(--inv-bg, #fff)" />
          <path d="M0 2 L3 5 L6 2 M12 2 L15 5 L18 2 M6 16 L9 13 L12 16 M18 16 L21 13 L24 16" stroke="currentColor" strokeWidth="1" fill="none" />
        </pattern>
      </defs>
      <rect width="100%" height={height} fill={`url(#${id})`} />
    </svg>
  );
}

/** Subtle tiled background of tiny chan flowers in a diamond lattice. */
export function ChanPatternBg({ opacity = 0.08, scale = 1 }: { opacity?: number; scale?: number }) {
  const s = 48 * scale;
  const id = `chan${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;
  return (
    <svg aria-hidden className="pointer-events-none absolute inset-0 h-full w-full" style={{ opacity }}>
      <defs>
        <pattern id={id} width={s} height={s} patternUnits="userSpaceOnUse">
          <g transform={`translate(${s / 2} ${s / 2}) scale(${0.16 * scale})`} fill="currentColor">
            <ChanPath />
          </g>
          <g transform={`scale(${0.08 * scale})`} fill="currentColor">
            <ChanPath />
          </g>
          <path d={`M0 ${s / 2} L${s / 2} 0 L${s} ${s / 2} L${s / 2} ${s}Z`} fill="none" stroke="currentColor" strokeWidth="0.5" />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill={`url(#${id})`} />
    </svg>
  );
}

/** Temple-doorway arch mask outline with a flame crest — used to frame portraits. */
export function ArchCrest({ width = 200, ...rest }: P & { width?: number }) {
  return (
    <svg viewBox="-100 -40 200 50" width={width} height={(width * 50) / 200} aria-hidden fill="currentColor" {...rest}>
      {Array.from({ length: 9 }).map((_, i) => {
        const a = -80 + i * 20;
        const rad = (a * Math.PI) / 180;
        return (
          <path key={i} d={flame(i === 4 ? 30 : 20, 6, 0.4)} transform={`translate(${fmt(Math.sin(rad) * 70)} ${fmt(10 - Math.cos(rad) * 18)}) rotate(${a * 0.6})`} opacity={i === 4 ? 1 : 0.75} />
        );
      })}
      <path d="M-90 10 Q0 -26 90 10" fill="none" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

/** Wax seal with a chan-flower impression. */
export function WaxSeal({ size = 88, color = "#8E1B1B", initials }: { size?: number; color?: string; initials?: string }) {
  const gid = `seal${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;
  return (
    <svg viewBox="-50 -50 100 100" width={size} height={size} aria-hidden>
      <defs>
        <radialGradient id={gid} cx="35%" cy="30%">
          <stop offset="0%" stopColor="#fff" stopOpacity="0.35" />
          <stop offset="60%" stopColor={color} stopOpacity="1" />
          <stop offset="100%" stopColor="#000" stopOpacity="0.35" />
        </radialGradient>
      </defs>
      <path
        d={Array.from({ length: 28 })
          .map((_, i) => {
            const a = (i / 28) * Math.PI * 2;
            const r = 44 + (i % 2 ? 3 : -1) + ((i * 7) % 3);
            return `${i ? "L" : "M"}${fmt(Math.cos(a) * r)} ${fmt(Math.sin(a) * r)}`;
          })
          .join(" ") + "Z"}
        fill={color}
      />
      <circle r="40" fill={`url(#${gid})`} />
      <circle r="31" fill="none" stroke="#000" strokeOpacity="0.25" strokeWidth="2" />
      <g fill="#000" fillOpacity="0.22" transform="scale(0.55)">
        <ChanPath />
      </g>
      {initials ? (
        <text y="6" textAnchor="middle" fontSize="16" fill="#fff" fillOpacity="0.85" style={{ fontFamily: "var(--font-latin-display)" }}>
          {initials}
        </text>
      ) : null}
    </svg>
  );
}

/** Long palm-leaf manuscript (slek rith) strip with binding holes. Children render on it. */
export function PalmLeafStrip({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`relative rounded-[999px/40px] px-10 py-6 shadow-[inset_0_0_0_1px_rgba(0,0,0,0.08),0_8px_24px_-12px_rgba(60,40,10,0.35)] ${className}`}
      style={{ background: "linear-gradient(180deg, color-mix(in oklab, var(--inv-surface) 92%, #c9a25e) 0%, var(--inv-surface) 40%, color-mix(in oklab, var(--inv-surface) 88%, #b48a46) 100%)" }}>
      <span aria-hidden className="absolute left-[5%] top-1/2 h-2 w-2 -translate-y-1/2 rounded-full" style={{ background: "var(--inv-ink)", opacity: 0.35 }} />
      <span aria-hidden className="absolute right-[5%] top-1/2 h-2 w-2 -translate-y-1/2 rounded-full" style={{ background: "var(--inv-ink)", opacity: 0.35 }} />
      {children}
    </div>
  );
}

/** Confetti of tiny chan flowers + dots for festive templates. */
export function FestiveConfetti({ colors }: { colors: string[] }) {
  const items = Array.from({ length: 22 }).map((_, i) => ({
    x: (i * 37) % 100,
    y: (i * 53) % 100,
    s: 8 + ((i * 13) % 14),
    c: colors[i % colors.length],
    r: (i * 47) % 360,
  }));
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      {items.map((it, i) => (
        <svg key={i} viewBox="-50 -50 100 100" width={it.s} height={it.s} style={{ position: "absolute", left: `${it.x}%`, top: `${it.y}%`, transform: `rotate(${it.r}deg)`, color: it.c, opacity: 0.8 }} fill="currentColor">
          {i % 3 === 0 ? <circle r="30" /> : <ChanPath />}
        </svg>
      ))}
    </div>
  );
}

/* ======================================================================
 * Marble & Burgundy Rose set (original drawings, inspired by printed
 * Khmer wedding cards: white marble, burgundy roses, eucalyptus, gold frame)
 * ====================================================================== */

/** White marble: soft clouding + hand-placed grey veins. Pure SVG/CSS, cheap on mobile. */
export function MarbleBg({ fixed = false }: { fixed?: boolean }) {
  const veins = [
    "M-20 120 C 60 140, 90 90, 170 130 S 300 210, 420 170",
    "M-10 330 C 80 300, 140 360, 230 320 S 360 300, 430 360",
    "M40 -10 C 70 80, 30 160, 110 240 S 160 420, 120 520",
    "M260 -20 C 240 90, 320 170, 280 260 S 300 430, 380 520",
    "M-20 600 C 90 560, 170 640, 260 600 S 380 560, 430 620",
    "M150 520 C 190 600, 150 690, 210 820",
    "M330 640 C 300 700, 350 760, 320 830",
  ];
  const twigs = ["M170 130 C 185 150, 180 175, 200 190", "M230 320 C 220 345, 240 360, 232 390", "M110 240 C 130 250, 140 270, 160 272", "M280 260 C 300 275, 315 270, 335 290", "M260 600 C 270 620, 262 640, 280 655"];
  return (
    <div aria-hidden className={`pointer-events-none ${fixed ? "fixed" : "absolute"} inset-0 overflow-hidden`}
      style={{ background: "radial-gradient(ellipse at 20% 15%, #ffffff 0%, transparent 55%), radial-gradient(ellipse at 85% 70%, #fbfaf8 0%, transparent 50%), linear-gradient(160deg, #f7f4f1 0%, #efebe7 45%, #f6f3f0 100%)" }}>
      <svg className="absolute inset-0 h-full w-full" viewBox="0 0 400 800" preserveAspectRatio="xMidYMid slice">
        <g fill="none" strokeLinecap="round">
          {veins.map((d, i) => <path key={i} d={d} stroke="#bdb2ac" strokeWidth={i % 3 === 0 ? 1.4 : 0.8} opacity={0.45} />)}
          {veins.map((d, i) => <path key={`b${i}`} d={d} stroke="#d9d0cb" strokeWidth={5} opacity={0.18} />)}
          {twigs.map((d, i) => <path key={`t${i}`} d={d} stroke="#c7bdb8" strokeWidth={0.6} opacity={0.5} />)}
        </g>
      </svg>
    </div>
  );
}

/** Rounded rose petal from origin upwards. */
function rosePetal(r: number, w: number) {
  return `M0 0 C ${fmt(w * 1.05)} ${fmt(-r * 0.15)} ${fmt(w * 1.1)} ${fmt(-r * 0.85)} ${fmt(w * 0.35)} ${fmt(-r)} C ${fmt(w * 0.1)} ${fmt(-r * 1.04)} ${fmt(-w * 0.1)} ${fmt(-r * 1.04)} ${fmt(-w * 0.35)} ${fmt(-r)} C ${fmt(-w * 1.1)} ${fmt(-r * 0.85)} ${fmt(-w * 1.05)} ${fmt(-r * 0.15)} 0 0Z`;
}

/** Painterly burgundy rose (top view). */
export function Rose({ size = 120, dark = "#5A1222", mid = "#8A2840", light = "#C2667A", rotate = 0, line = false }: { size?: number; dark?: string; mid?: string; light?: string; rotate?: number; line?: boolean }) {
  const id = `rose${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;
  const fillOf = (k: string) => (line ? "none" : `url(#${id}${k})`);
  const stroke = line ? mid : light;
  const sw = line ? 1.1 : 0.7;
  return (
    <svg viewBox="-50 -50 100 100" width={size} height={size} aria-hidden style={{ overflow: "visible" }}>
      {!line ? (
        <defs>
          <radialGradient id={`${id}o`} cx="35%" cy="30%" r="80%"><stop offset="0%" stopColor={light} /><stop offset="55%" stopColor={mid} /><stop offset="100%" stopColor={dark} /></radialGradient>
          <radialGradient id={`${id}i`} cx="50%" cy="50%" r="60%"><stop offset="0%" stopColor={dark} /><stop offset="70%" stopColor={mid} /><stop offset="100%" stopColor={light} /></radialGradient>
        </defs>
      ) : null}
      <g transform={`rotate(${rotate})`} strokeLinejoin="round">
        {Array.from({ length: 6 }).map((_, i) => (
          <path key={`o${i}`} d={rosePetal(46, 24)} transform={`rotate(${i * 60 + 12})`} fill={fillOf("o")} stroke={stroke} strokeWidth={sw} opacity={line ? 0.9 : 0.97} />
        ))}
        {Array.from({ length: 5 }).map((_, i) => (
          <path key={`m${i}`} d={rosePetal(33, 18)} transform={`rotate(${i * 72 + 40})`} fill={fillOf("o")} stroke={stroke} strokeWidth={sw} />
        ))}
        <circle r="20" fill={fillOf("i")} stroke={line ? mid : "none"} strokeWidth={sw} />
        {/* spiralling inner petals */}
        {[17, 13, 9.5, 6.5, 4].map((r, i) => (
          <path key={`c${i}`} d={`M ${fmt(-r)} ${fmt(r * 0.15)} A ${r} ${fmt(r * 0.92)} 0 0 1 ${fmt(r * 0.9)} ${fmt(-r * 0.35)}`} transform={`rotate(${i * 70 - 20})`} fill="none" stroke={line ? mid : i % 2 ? light : "#3c0b16"} strokeWidth={line ? 1 : 1.3} opacity={line ? 0.8 : 0.75} strokeLinecap="round" />
        ))}
        {!line ? <circle r="3" fill="#3c0b16" opacity="0.7" /> : null}
      </g>
    </svg>
  );
}

/** Eucalyptus / silver-dollar sprig. */
export function Eucalyptus({ size = 160, rotate = 0, line = false, color = "#6F8F73" }: { size?: number; rotate?: number; line?: boolean; color?: string }) {
  const id = `euc${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;
  const leaves = Array.from({ length: 9 }).map((_, i) => {
    const t = i / 8;
    const x = fmt(t * 150 + Math.sin(t * 3) * 6);
    const y = fmt(-t * 40 + Math.sin(t * 5) * 4);
    const side = i % 2 ? 1 : -1;
    const r = 13 - t * 6;
    return { x, y, side, r, a: side * (35 + t * 20) };
  });
  return (
    <svg viewBox="-10 -70 180 100" width={size} height={size * (100 / 180)} aria-hidden style={{ overflow: "visible", transform: `rotate(${rotate}deg)` }}>
      {!line ? <defs><linearGradient id={id} x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor="#B9CDB5" /><stop offset="100%" stopColor={color} /></linearGradient></defs> : null}
      <path d="M0 0 C 50 -6, 100 -24, 152 -42" fill="none" stroke={line ? color : "#5d7a5f"} strokeWidth="1.4" strokeLinecap="round" />
      {leaves.map((l, i) => (
        <g key={i} transform={`translate(${l.x} ${l.y}) rotate(${l.a})`}>
          <ellipse cx="0" cy={fmt(-l.r * l.side)} rx={fmt(l.r * 0.78)} ry={fmt(l.r)} fill={line ? "none" : `url(#${id})`} stroke={line ? color : "#5d7a5f"} strokeWidth={line ? 1 : 0.5} opacity={line ? 0.8 : 0.92} />
          <path d={`M0 0 L0 ${fmt(-l.r * 1.7 * l.side)}`} stroke={line ? color : "#eef3ec"} strokeWidth="0.5" opacity="0.7" />
        </g>
      ))}
    </svg>
  );
}

/** A bouquet corner: roses + buds + eucalyptus. `corner` mirrors it into place. */
export function RoseCluster({ corner = "bl", scale = 1, line = false }: { corner?: "bl" | "br" | "tl" | "tr"; scale?: number; line?: boolean }) {
  const flip = { bl: "", br: "scaleX(-1)", tl: "scaleY(-1)", tr: "scale(-1,-1)" }[corner];
  const pos: React.CSSProperties = { bl: { left: 0, bottom: 0 }, br: { right: 0, bottom: 0 }, tl: { left: 0, top: 0 }, tr: { right: 0, top: 0 } }[corner];
  const s = (n: number) => n * scale;
  return (
    <div aria-hidden className="pointer-events-none absolute" style={{ ...pos, width: s(240), height: s(240), transform: flip, transformOrigin: "center" }}>
      <div className="absolute" style={{ left: s(70), bottom: s(110) }}><Eucalyptus size={s(170)} rotate={-55} line={line} /></div>
      <div className="absolute" style={{ left: s(120), bottom: s(18) }}><Eucalyptus size={s(150)} rotate={-12} line={line} /></div>
      <div className="absolute" style={{ left: s(-28), bottom: s(-30) }}><Rose size={s(170)} rotate={10} line={line} /></div>
      <div className="absolute" style={{ left: s(95), bottom: s(-18) }}><Rose size={s(105)} rotate={-25} line={line} /></div>
      <div className="absolute" style={{ left: s(-14), bottom: s(118) }}><Rose size={s(80)} rotate={40} line={line} /></div>
    </div>
  );
}

/** Ornate gold corner flourish (double rule + scroll). Default top-left. */
export function GoldCorner({ size = 70, style }: { size?: number; style?: React.CSSProperties }) {
  return (
    <svg viewBox="0 0 80 80" width={size} height={size} aria-hidden fill="none" stroke="currentColor" strokeLinecap="round" style={style}>
      <path d={spiral(1.9, 9)} transform="translate(17 17) rotate(-135)" strokeWidth="1.3" />
      <path d="M8 34 C 8 18, 18 8, 34 8" strokeWidth="1.2" />
      <path d="M34 8 C 44 8, 46 16, 40 18 C 35 20, 33 14, 37 13" strokeWidth="1.1" />
      <path d="M8 34 C 8 44, 16 46, 18 40 C 20 35, 14 33, 13 37" strokeWidth="1.1" />
      <path d="M40 18 C 52 16, 60 8, 78 8" strokeWidth="0.9" />
      <path d="M18 40 C 16 52, 8 60, 8 78" strokeWidth="0.9" />
      <circle cx="26" cy="26" r="1.6" fill="currentColor" stroke="none" />
    </svg>
  );
}

/** Gold divider with curled, flame-tipped ends and a small centre scroll. */
export function GoldDivider({ width = 300 }: { width?: number }) {
  const end = (
    <g>
      <path d="M-140 0 H-12" strokeWidth="1.6" />
      <path d="M-140 0 C -150 0, -153 -8, -150 -16 C -148 -22, -152 -28, -158 -30" strokeWidth="1.6" />
      <path d={flame(14, 4.5, 0.5)} transform="translate(-158 -30) rotate(-25)" fill="currentColor" stroke="none" />
    </g>
  );
  return (
    <svg viewBox="-170 -40 340 56" width={width} height={(width * 56) / 340} aria-hidden fill="none" stroke="currentColor" strokeLinecap="round">
      {end}
      <g transform="scale(-1 1)">{end}</g>
      <g transform="translate(0 8)" strokeWidth="1.2">
        <path d="M-30 0 H30" />
        <path d={spiral(1.3, 5)} transform="translate(-10 3) rotate(180)" />
        <path d={spiral(1.3, 5)} transform="translate(10 3) scale(-1 1) rotate(180)" />
        <path d="M0 -4 C 4 0, 4 4, 0 8 C -4 4, -4 0, 0 -4Z" fill="currentColor" stroke="none" />
      </g>
    </svg>
  );
}

export function Butterfly({ size = 36, style }: { size?: number; style?: React.CSSProperties }) {
  return (
    <svg viewBox="-20 -20 40 40" width={size} height={size} aria-hidden fill="none" stroke="currentColor" strokeWidth="1" strokeLinejoin="round" style={style}>
      <path d="M0 -6 C -6 -18, -19 -16, -16 -6 C -14 -1, -6 0, 0 -2Z" />
      <path d="M0 -6 C 6 -18, 19 -16, 16 -6 C 14 -1, 6 0, 0 -2Z" />
      <path d="M0 -1 C -4 4, -13 10, -10 14 C -7 17, -2 10, 0 3Z" />
      <path d="M0 -1 C 4 4, 13 10, 10 14 C 7 17, 2 10, 0 3Z" />
      <path d="M-10 -9 C -8 -10, -6 -8, -6 -6 M10 -9 C 8 -10, 6 -8, 6 -6" strokeWidth="0.6" />
      <path d="M0 -7 V 8 M0 -7 C -2 -12, -5 -14, -7 -15 M0 -7 C 2 -12, 5 -14, 7 -15" />
    </svg>
  );
}
