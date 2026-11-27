import type { CSSProperties } from "react";
import type { Family, KhmerFont, LatinFont, Palette, TemplateDef } from "@/features/templates/registry";
import type { InvitationDoc } from "@/features/invitations/doc";

export const KHMER_FONT: Record<KhmerFont, string> = {
  moul: "var(--font-moul)",
  moulpali: "var(--font-moulpali)",
  dangrek: "var(--font-dangrek)",
  kantumruy: "var(--font-km)",
  battambang: "var(--font-battambang)",
  notoSerif: "var(--font-serif-km)",
};
export const LATIN_FONT: Record<LatinFont, string> = {
  cormorant: "var(--font-cormorant)",
  playfair: "var(--font-playfair)",
  pinyon: "var(--font-pinyon)",
  inter: "var(--font-sans)",
};

export type FamilyTokens = {
  hero: "frame" | "arch" | "night" | "round" | "split" | "band" | "leaf" | "editorial" | "festive" | "landscape" | "memorial" | "marble" | "moonlit" | "curtains";
  divider: "kbach" | "lotus" | "weave" | "rule" | "dots" | "leaf" | "flame" | "gold" | "curtains";
  card: "bordered" | "soft" | "glass" | "pill" | "flat" | "leaf" | "rounded" | "marble" | "curtains";
  bg: "chan" | "grain" | "stars" | "none" | "confetti" | "lotus" | "marble" | "curtains";
  align: "center" | "left";
  /** Heading scale for Khmer display font (Moul is visually larger). */
  headingClass: string;
  frameCorners: boolean;
  /** Default ambient particles + reveal style (owners can override per invitation). */
  particles: "petals" | "lotus" | "gold" | "stars" | "confetti" | "leaves" | "none";
  reveal: "up" | "zoom" | "blur" | "fade" | "left";
};

export const FAMILIES: Record<Family, FamilyTokens> = {
  royal: { hero: "frame", divider: "kbach", card: "bordered", bg: "chan", align: "center", headingClass: "text-[1.55rem] sm:text-3xl", frameCorners: true, particles: "gold", reveal: "zoom" },
  ivory: { hero: "arch", divider: "kbach", card: "soft", bg: "grain", align: "center", headingClass: "text-2xl sm:text-[2rem]", frameCorners: false, particles: "petals", reveal: "blur" },
  temple: { hero: "night", divider: "flame", card: "glass", bg: "stars", align: "center", headingClass: "text-[1.55rem] sm:text-3xl", frameCorners: false, particles: "stars", reveal: "blur" },
  lotus: { hero: "round", divider: "lotus", card: "pill", bg: "lotus", align: "center", headingClass: "text-2xl sm:text-[2rem]", frameCorners: false, particles: "lotus", reveal: "up" },
  emerald: { hero: "split", divider: "kbach", card: "bordered", bg: "chan", align: "left", headingClass: "text-[1.55rem] sm:text-3xl", frameCorners: false, particles: "leaves", reveal: "left" },
  silk: { hero: "band", divider: "weave", card: "flat", bg: "none", align: "center", headingClass: "text-[1.55rem] sm:text-3xl", frameCorners: false, particles: "gold", reveal: "up" },
  palmleaf: { hero: "leaf", divider: "leaf", card: "leaf", bg: "grain", align: "center", headingClass: "text-2xl sm:text-[2rem]", frameCorners: false, particles: "leaves", reveal: "fade" },
  editorial: { hero: "editorial", divider: "rule", card: "flat", bg: "none", align: "left", headingClass: "text-3xl sm:text-5xl font-semibold", frameCorners: false, particles: "none", reveal: "left" },
  festive: { hero: "festive", divider: "dots", card: "rounded", bg: "confetti", align: "center", headingClass: "text-3xl sm:text-4xl", frameCorners: false, particles: "confetti", reveal: "zoom" },
  village: { hero: "landscape", divider: "rule", card: "soft", bg: "grain", align: "center", headingClass: "text-2xl sm:text-4xl", frameCorners: false, particles: "leaves", reveal: "up" },
  marble: { hero: "marble", divider: "gold", card: "marble", bg: "marble", align: "center", headingClass: "text-[1.6rem] sm:text-3xl", frameCorners: false, particles: "petals", reveal: "blur" },
  moonlit: { hero: "moonlit", divider: "rule", card: "bordered", bg: "grain", align: "center", headingClass: "text-2xl sm:text-4xl", frameCorners: false, particles: "stars", reveal: "fade" },
  curtains: { hero: "curtains", divider: "curtains", card: "curtains", bg: "curtains", align: "center", headingClass: "text-[1.35rem] sm:text-[1.7rem] leading-[1.7]", frameCorners: false, particles: "petals", reveal: "up" },
  memorial: { hero: "memorial", divider: "lotus", card: "flat", bg: "none", align: "center", headingClass: "text-2xl sm:text-[1.75rem]", frameCorners: false, particles: "none", reveal: "fade" },
};

export function resolvePalette(t: TemplateDef, doc: InvitationDoc): Palette {
  return { ...t.palette, ...(doc.theme.palette ?? {}) } as Palette;
}

export function themeStyle(t: TemplateDef, doc: InvitationDoc): CSSProperties {
  const p = resolvePalette(t, doc);
  return {
    ["--inv-bg" as string]: p.bg,
    ["--inv-surface" as string]: p.surface,
    ["--inv-ink" as string]: p.ink,
    ["--inv-muted" as string]: p.muted,
    ["--inv-primary" as string]: p.primary,
    ["--inv-accent" as string]: p.accent,
    ["--inv-on-primary" as string]: p.onPrimary,
    ["--inv-display" as string]: KHMER_FONT[t.fonts.display],
    ["--inv-body" as string]: KHMER_FONT[t.fonts.body],
    ["--inv-latin" as string]: LATIN_FONT[t.fonts.latin],
    ["--font-latin-display" as string]: LATIN_FONT[t.fonts.latin],
    background: p.bg,
    color: p.ink,
    fontFamily: KHMER_FONT[t.fonts.body],
  };
}

export function isDark(hex: string): boolean {
  const n = parseInt(hex.slice(1), 16);
  const r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  return 0.2126 * r + 0.7152 * g + 0.0722 * b < 128;
}

/** Particle colours derived from the palette so effects always match the template. */
export function particleColors(kind: string, p: Palette): string[] {
  switch (kind) {
    case "petals": return [p.primary, `color-mix(in oklab, ${p.primary} 70%, white)`, `color-mix(in oklab, ${p.accent} 60%, ${p.primary})`];
    case "lotus": return ["#F2B8C2", "#F7D3D9", `color-mix(in oklab, ${p.primary} 50%, #F7D3D9)`];
    case "gold": return [p.accent, `color-mix(in oklab, ${p.accent} 60%, white)`];
    case "stars": return ["#FFFFFF", p.accent];
    case "confetti": return [p.primary, p.accent, "#4BA3A0", "#8A5CC2"];
    case "leaves": return [`color-mix(in oklab, ${p.accent} 70%, #7A8F5A)`, "#9BB08A", `color-mix(in oklab, ${p.primary} 40%, #C9A86A)`];
    default: return [p.accent];
  }
}
