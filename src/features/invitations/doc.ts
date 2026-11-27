import { z } from "zod";

/** Bilingual text. Khmer first. Plain text only — never HTML. */
export const L = z.object({ km: z.string().max(2000).default(""), en: z.string().max(2000).default("") });
export type LText = z.infer<typeof L>;
export const l = (km = "", en = ""): LText => ({ km, en });

/** Media reference: an uploaded asset ("/api/media/<uuid>") or a built-in placeholder ("placeholder:<kind>"). */
export const MediaRef = z
  .string()
  .max(200)
  .refine((v) => v === "" || /^\/api\/media\/[0-9a-f-]{36}$/.test(v) || /^placeholder:[a-z0-9-]+$/.test(v), "Invalid media reference");

const base = { id: z.string().min(1).max(40), hidden: z.boolean().default(false) };

const Parent = z.object({ father: L, mother: L });

export const SectionSchema = z.discriminatedUnion("type", [
  z.object({ ...base, type: z.literal("cover"), data: z.object({ kicker: L, title: L, names: L, photo: MediaRef.default(""), button: L }) }),
  z.object({ ...base, type: z.literal("hero"), data: z.object({ kicker: L, names: L, tagline: L, photo: MediaRef.default(""), /** optional cinematic intro video (muted, looping) */ video: MediaRef.default("") }) }),
  z.object({
    ...base,
    type: z.literal("video"),
    data: z.object({
      heading: L,
      caption: L,
      src: MediaRef.default(""),
      poster: MediaRef.default(""),
      /** YouTube video id (11 chars) — embedded via youtube-nocookie.com */
      youtube: z.string().regex(/^([A-Za-z0-9_-]{11})?$/).default(""),
      autoPlay: z.boolean().default(true),
    }),
  }),
  z.object({
    ...base,
    type: z.literal("invitation"),
    data: z.object({ heading: L, leftFamily: Parent, rightFamily: Parent, body: L, showParents: z.boolean().default(true) }),
  }),
  z.object({
    ...base,
    type: z.literal("couple"),
    data: z.object({
      left: z.object({ role: L, name: L, photo: MediaRef.default(""), bio: L }),
      right: z.object({ role: L, name: L, photo: MediaRef.default(""), bio: L }),
    }),
  }),
  z.object({ ...base, type: z.literal("countdown"), data: z.object({ heading: L }) }),
  z.object({
    ...base,
    type: z.literal("schedule"),
    data: z.object({
      heading: L,
      items: z.array(z.object({ time: z.string().max(40), title: L, desc: L, icon: z.string().max(30).default("chan") })).max(30),
    }),
  }),
  z.object({
    ...base,
    type: z.literal("story"),
    data: z.object({
      heading: L,
      chapters: z.array(z.object({ date: z.string().max(60), title: L, text: L, photo: MediaRef.default("") })).max(12),
    }),
  }),
  z.object({
    ...base,
    type: z.literal("gallery"),
    data: z.object({ heading: L, video: MediaRef.optional(), photos: z.array(z.object({ src: MediaRef, caption: L })).max(60) }),
  }),
  z.object({
    ...base,
    type: z.literal("venue"),
    data: z.object({
      heading: L,
      note: L,
      parking: L,
      /** Optional hand-drawn / printed directions map uploaded by the host. */
      mapImage: MediaRef.default(""),
      /** Host phone numbers shown as tap-to-call buttons. */
      contacts: z.array(z.object({ label: L, phone: z.string().regex(/^[0-9+()\-\s]{0,30}$/) })).max(4).default([]),
      showQr: z.boolean().default(true),
    }),
  }),
  z.object({
    ...base,
    type: z.literal("gift"),
    data: z.object({
      heading: L,
      note: L,
      accounts: z
        .array(z.object({ bank: z.string().max(60), holder: z.string().max(120), number: z.string().max(60).default(""), qr: MediaRef.default("") }))
        .max(4),
    }),
  }),
  z.object({ ...base, type: z.literal("rsvp"), data: z.object({ heading: L, note: L }) }),
  z.object({ ...base, type: z.literal("wishes"), data: z.object({ heading: L, note: L }) }),
  z.object({ ...base, type: z.literal("thankyou"), data: z.object({ message: L, signature: L }) }),
]);

export type Section = z.infer<typeof SectionSchema>;
export type SectionType = Section["type"];

const hex = z.string().regex(/^#[0-9a-fA-F]{6}$/);

export const InvitationDocSchema = z.object({
  v: z.literal(1),
  defaultLocale: z.enum(["km", "en"]).default("km"),
  shareImage: MediaRef.optional(),
  theme: z.object({
    palette: z
      .object({ bg: hex, surface: hex, ink: hex, muted: hex, primary: hex, accent: hex, onPrimary: hex })
      .partial()
      .default({}),
    envelope: z.boolean().default(true),
    music: z.object({ src: MediaRef.default(""), title: z.string().max(120).default("") }).default({ src: "", title: "" }),
    khmerNumerals: z.boolean().default(true),
    motion: z
      .object({
        level: z.enum(["full", "subtle", "off"]).default("full"),
        particles: z.enum(["auto", "petals", "lotus", "gold", "stars", "confetti", "leaves", "none"]).default("auto"),
      })
      .default({ level: "full", particles: "auto" }),
  }),
  sections: z.array(SectionSchema).max(40),
});

export type InvitationDoc = z.infer<typeof InvitationDocSchema>;

export const SECTION_TYPES: SectionType[] = [
  "cover", "hero", "invitation", "couple", "countdown", "schedule", "story", "video", "gallery", "venue", "gift", "rsvp", "wishes", "thankyou",
];

export const SECTION_LABELS: Record<SectionType, LText> = {
  cover: l("ស្រោមសំបុត្រ", "Envelope cover"),
  hero: l("ផ្ទាំងដើម", "Hero"),
  invitation: l("សេចក្ដីអញ្ជើញ", "Formal invitation"),
  couple: l("គូស្វាមីភរិយា / ម្ចាស់កម្មវិធី", "Couple / hosts"),
  countdown: l("រាប់ថយក្រោយ", "Countdown"),
  schedule: l("កម្មវិធី", "Schedule"),
  story: l("រឿងរ៉ាវស្នេហា", "Love story"),
  video: l("វីដេអូ", "Video"),
  gallery: l("វិចិត្រសាល", "Gallery"),
  venue: l("ទីតាំង", "Venue"),
  gift: l("ចំណងដៃ", "Gift / KHQR"),
  rsvp: l("ឆ្លើយតប", "RSVP"),
  wishes: l("ពាក្យជូនពរ", "Wishes"),
  thankyou: l("អរគុណ", "Thank you"),
};

/** A blank section of a given type — used by the builder's "Add section". */
export function blankSection(type: SectionType, id: string): Section {
  const e = l();
  switch (type) {
    case "cover": return { id, type, hidden: false, data: { kicker: e, title: e, names: e, photo: "", button: l("បើកធៀប", "Open invitation") } };
    case "hero": return { id, type, hidden: false, data: { kicker: e, names: e, tagline: e, photo: "", video: "" } };
    case "video": return { id, type, hidden: false, data: { heading: l("វីដេអូរបស់យើង", "Our film"), caption: e, src: "", poster: "", youtube: "", autoPlay: true } };
    case "invitation": return { id, type, hidden: false, data: { heading: e, leftFamily: { father: e, mother: e }, rightFamily: { father: e, mother: e }, body: e, showParents: true } };
    case "couple": return { id, type, hidden: false, data: { left: { role: e, name: e, photo: "", bio: e }, right: { role: e, name: e, photo: "", bio: e } } };
    case "countdown": return { id, type, hidden: false, data: { heading: l("រាប់ថយក្រោយដល់ថ្ងៃមង្គល", "Counting down") } };
    case "schedule": return { id, type, hidden: false, data: { heading: l("កម្មវិធី", "Programme"), items: [] } };
    case "story": return { id, type, hidden: false, data: { heading: l("រឿងរ៉ាវរបស់យើង", "Our story"), chapters: [] } };
    case "gallery": return { id, type, hidden: false, data: { heading: l("អនុស្សាវរីយ៍", "Gallery"), photos: [] } };
    case "venue": return { id, type, hidden: false, data: { heading: l("ទីតាំងកម្មវិធី", "Venue"), note: e, parking: e, mapImage: "", contacts: [], showQr: true } };
    case "gift": return { id, type, hidden: false, data: { heading: l("ចំណងដៃ", "Wedding gift"), note: e, accounts: [] } };
    case "rsvp": return { id, type, hidden: false, data: { heading: l("សូមឆ្លើយតប", "Kindly reply"), note: e } };
    case "wishes": return { id, type, hidden: false, data: { heading: l("ពាក្យជូនពរ", "Wishes"), note: e } };
    case "thankyou": return { id, type, hidden: false, data: { message: e, signature: e } };
  }
}

export function pick(t: LText | undefined, locale: "km" | "en"): string {
  if (!t) return "";
  return (locale === "km" ? t.km || t.en : t.en || t.km) ?? "";
}
