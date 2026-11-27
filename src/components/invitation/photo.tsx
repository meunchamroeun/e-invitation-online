import { ChanFlower, Lotus, PrasatSilhouette, SugarPalms } from "./ornaments";
import { CURTAINS_SAMPLE_COVER, MOONLIT_SAMPLE_PHOTO } from "@/features/templates/registry";

const CURTAINS_PHOTOS: Record<string, string> = {
  [CURTAINS_SAMPLE_COVER]: "/templates/champagne-curtains/cover.jpg",
  "placeholder:curtains-g1": "/templates/champagne-curtains/gallery-1.jpg",
  "placeholder:curtains-g2": "/templates/champagne-curtains/gallery-2.jpg",
  "placeholder:curtains-g3": "/templates/champagne-curtains/gallery-3.jpg",
  "placeholder:curtains-g4": "/templates/champagne-curtains/gallery-4.jpg",
  "placeholder:classic-groom": "/templates/planessential/groom.png",
  "placeholder:classic-bride": "/templates/planessential/bride.png",
};

/**
 * Renders an uploaded image, or — for "placeholder:*" refs — an original illustrated placeholder
 * clearly labelled as a sample so demo content can never be mistaken for a real photo.
 */
export function Photo({
  src,
  alt,
  className = "",
  label = "រូបភាពគំរូ · Sample",
  rounded = "",
  kenBurns = false,
}: {
  src: string;
  alt: string;
  className?: string;
  label?: string;
  rounded?: string;
  /** Slow cinematic zoom (disabled automatically for reduced motion / motion "off"). */
  kenBurns?: boolean;
}) {
  if (!src) return null;
  if (kenBurns) {
    return (
      <div className={`inv-kb h-full w-full overflow-hidden ${rounded}`}>
        <Photo src={src} alt={alt} className={className} label={label} rounded={rounded} />
      </div>
    );
  }
  if (!src.startsWith("placeholder:")) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={src} alt={alt} loading="lazy" decoding="async" className={`h-full w-full object-cover ${rounded} ${className}`} />;
  }
  if (src === MOONLIT_SAMPLE_PHOTO) {
    return (
      <div className={`relative h-full w-full overflow-hidden ${rounded} ${className}`}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/templates/moonlit-jasmine/couple.webp" alt={`${alt} (${label})`} loading="lazy" decoding="async"
          className="h-full w-full object-cover object-[center_18%]" />
        <span aria-hidden className="absolute inset-e-3 bottom-3 rounded-full bg-black/65 px-2.5 py-1 text-[10px] text-white">
          {label}
        </span>
      </div>
    );
  }
  if (src in CURTAINS_PHOTOS) {
    return (
      <div className={`relative h-full w-full overflow-hidden ${rounded} ${className}`}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={CURTAINS_PHOTOS[src]} alt={`${alt} (${label})`} loading="lazy" decoding="async"
          className={`h-full w-full object-cover ${className}`} />
        <span aria-hidden className="absolute inset-e-3 bottom-3 rounded-full bg-black/65 px-2.5 py-1 text-[10px] text-white">
          {label}
        </span>
      </div>
    );
  }
  const kind = src.slice("placeholder:".length);
  if (kind === "map") return <SampleMap label={label} className={className} />;
  if (kind === "video") return <SampleVideoPoster label={label} className={className} />;
  const motif = kind.includes("story-2") || kind === "g2" || kind === "g5" ? "prasat" : kind === "g3" || kind === "g6" || kind === "story-3" ? "palms" : kind.includes("bride") || kind === "g4" ? "lotus" : "chan";
  const seed = [...kind].reduce((a, c) => a + c.charCodeAt(0), 0);
  const angle = 140 + (seed % 60);
  return (
    <div
      role="img"
      aria-label={`${alt} (${label})`}
      className={`relative h-full w-full overflow-hidden ${rounded} ${className}`}
      style={{
        background: `linear-gradient(${angle}deg, color-mix(in oklab, var(--inv-primary) 78%, var(--inv-bg)) 0%, color-mix(in oklab, var(--inv-accent) 55%, var(--inv-bg)) 55%, color-mix(in oklab, var(--inv-surface) 85%, var(--inv-primary)) 100%)`,
      }}
    >
      <div className="absolute inset-0 opacity-[0.16]" style={{ background: "radial-gradient(circle at 30% 20%, #fff 0, transparent 45%)" }} />
      <div className="absolute inset-x-0 bottom-0 flex justify-center" style={{ color: "var(--inv-on-primary)", opacity: 0.38 }}>
        {motif === "prasat" && <PrasatSilhouette width={420} className="w-[110%] max-w-none" />}
        {motif === "palms" && <SugarPalms width={320} className="w-full" />}
        {motif === "lotus" && <Lotus size={180} className="mb-6" />}
        {motif === "chan" && <ChanFlower size={160} className="mb-[18%]" />}
      </div>
      <span
        className="absolute bottom-[14%] left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full px-2 py-0.5 text-[10px] font-medium"
        style={{ background: "rgb(0 0 0 / 0.28)", color: "#fff", fontFamily: "var(--font-km)", letterSpacing: 0 }}
      >
        {label}
      </span>
    </div>
  );
}

/** Illustrative directions map in the style of printed Khmer cards (sample only). */
function SampleMap({ label, className = "" }: { label: string; className?: string }) {
  const c = "var(--inv-primary)";
  return (
    <div role="img" aria-label={`Directions map (${label})`} className={`relative w-full bg-white ${className}`}>
      <svg viewBox="0 0 400 260" className="block h-auto w-full" fill="none" stroke={c} strokeWidth="2.2" strokeLinecap="round" style={{ fontFamily: "var(--font-km)" }}>
        <path d="M30 250 L120 150 L170 60 M60 250 L140 160 L195 70" />
        <circle cx="132" cy="155" r="13" />
        <path d="M145 150 H385 M150 175 H385" />
        <rect x="246" y="146" width="26" height="22" rx="3" fill={c} stroke="none" />
        <text x="259" y="162" fill="#fff" stroke="none" fontSize="13" textAnchor="middle" fontWeight="700">5</text>
        <g transform="translate(330 95)"><path d="M0 22 L20 6 L40 22 V44 H0Z" fill={c} stroke="none" /><rect x="15" y="30" width="10" height="14" fill="#fff" stroke="none" /></g>
        <text x="350" y="62" fill={c} stroke="none" fontSize="13" textAnchor="middle">ផ្ទះការ</text>
        <g transform="translate(205 195)"><path d="M0 30 H50 M5 30 V14 H45 V30 M10 14 L25 0 L40 14" strokeWidth="1.6" /></g>
        <text x="230" y="245" fill={c} stroke="none" fontSize="13" textAnchor="middle">វត្ត</text>
        <path d="M360 128 V112 M354 118 L360 110 L366 118" strokeWidth="1.8" />
        <text x="215" y="138" fill={c} stroke="none" fontSize="11">ផ្លូវជាតិ</text>
        <text x="30" y="40" fill={c} stroke="none" fontSize="11">N ↑</text>
      </svg>
      <span className="absolute left-2 top-2 rounded-full px-2 py-0.5 text-[10px] font-medium" style={{ background: "rgb(0 0 0 / 0.55)", color: "#fff", fontFamily: "var(--font-km)" }}>{label}</span>
    </div>
  );
}

function SampleVideoPoster({ label, className = "" }: { label: string; className?: string }) {
  return (
    <div role="img" aria-label={`Video (${label})`} className={`relative flex aspect-video h-full w-full items-center justify-center overflow-hidden ${className}`}
      style={{ background: "linear-gradient(135deg, color-mix(in oklab, var(--inv-primary) 85%, black), color-mix(in oklab, var(--inv-accent) 55%, var(--inv-primary)))" }}>
      <div className="absolute inset-x-0 bottom-0 flex justify-center opacity-30" style={{ color: "var(--inv-on-primary)" }}><PrasatSilhouette width={520} /></div>
      <span className="relative flex h-16 w-16 items-center justify-center rounded-full bg-white/90 shadow-xl"><svg viewBox="0 0 24 24" width="26" height="26"><path d="M8 5v14l11-7z" fill="var(--inv-primary)" /></svg></span>
      <span className="absolute left-2 top-2 rounded-full px-2 py-0.5 text-[10px] font-medium" style={{ background: "rgb(0 0 0 / 0.45)", color: "#fff", fontFamily: "var(--font-km)" }}>{label}</span>
    </div>
  );
}
