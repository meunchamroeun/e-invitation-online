import { describe, expect, it } from "vitest";
import { countdownParts, formatDate, formatTime, toKhmerDigits, zonedToUtc } from "@/i18n/format";
import { dictionaries } from "@/i18n/dictionaries";
import { historyReducer, initHistory } from "@/components/builder/history";
import { InvitationDocSchema, blankSection, SECTION_TYPES } from "@/features/invitations/doc";
import { EVENT_TYPES, TEMPLATES, sampleDoc, starterDoc } from "@/features/templates/registry";

describe("localization", () => {
  it("Khmer digits", () => expect(toKhmerDigits("2027-02-14 17:00")).toBe("២០២៧-០២-១៤ ១៧:០០"));
  it("formats dates in Asia/Phnom_Penh without thousands separators in years", () => {
    const iso = "2027-02-14T10:00:00.000Z"; // 17:00 in Phnom Penh
    expect(formatDate(iso, "km")).toBe("ថ្ងៃអាទិត្យ ទី១៤ ខែកុម្ភៈ ឆ្នាំ២០២៧");
    expect(formatDate(iso, "en")).toBe("Sunday, 14 February 2027");
    expect(formatTime(iso, "km")).toBe("ម៉ោង ១៧:០០ ល្ងាច");
    expect(formatTime(iso, "km", "Asia/Phnom_Penh", false)).toBe("ម៉ោង 17:00 ល្ងាច");
  });
  it("converts local wall time to UTC", () => {
    expect(zonedToUtc("2027-02-14", "17:00", "Asia/Phnom_Penh").toISOString()).toBe("2027-02-14T10:00:00.000Z");
    expect(zonedToUtc("2027-07-01", "09:30", "America/New_York").toISOString()).toBe("2027-07-01T13:30:00.000Z");
  });
  it("countdown never goes negative", () => {
    expect(countdownParts(1000 * (86400 + 3661), 0)).toEqual({ done: false, days: 1, hours: 1, minutes: 1, seconds: 1 });
    expect(countdownParts(0, 5000).done).toBe(true);
  });
  it("English dictionary covers every Khmer key", () => {
    const keys = (o: object, p = ""): string[] => Object.entries(o).flatMap(([k, v]) => (typeof v === "object" ? keys(v, `${p}${k}.`) : [`${p}${k}`]));
    expect(keys(dictionaries.en).sort()).toEqual(keys(dictionaries.km).sort());
  });
});

describe("editor history", () => {
  const d0 = sampleDoc(TEMPLATES[0]);
  const d1 = { ...d0, defaultLocale: "en" as const };
  const d2 = { ...d0, defaultLocale: "km" as const, sections: d0.sections.slice(1) };
  it("undo / redo", () => {
    let h = initHistory(d0);
    h = historyReducer(h, { type: "set", doc: d1, at: 0 });
    h = historyReducer(h, { type: "set", doc: d2, at: 5000 });
    h = historyReducer(h, { type: "undo" });
    expect(h.present).toBe(d1);
    h = historyReducer(h, { type: "undo" });
    expect(h.present).toBe(d0);
    h = historyReducer(h, { type: "redo" });
    expect(h.present).toBe(d1);
    h = historyReducer(h, { type: "set", doc: d2 });
    expect(h.future).toEqual([]);
  });
  it("coalesces rapid typing on the same field into one step", () => {
    let h = initHistory(d0);
    h = historyReducer(h, { type: "set", doc: d1, key: "s1.title", at: 1000 });
    h = historyReducer(h, { type: "set", doc: d2, key: "s1.title", at: 1300 });
    expect(h.past.length).toBe(1);
    h = historyReducer(h, { type: "undo" });
    expect(h.present).toBe(d0);
  });
});

describe("invitation documents & templates", () => {
  it("every template's sample + starter doc validates", () => {
    for (const t of TEMPLATES) {
      expect(InvitationDocSchema.safeParse(sampleDoc(t)).success).toBe(true);
      expect(InvitationDocSchema.safeParse(starterDoc(t, { hostNames: { km: "ក", en: "A" } })).success).toBe(true);
    }
  });
  it("starter docs never carry sample parents' names", () => {
    const d = starterDoc(TEMPLATES[0], { hostNames: { km: "ក & ខ", en: "A & B" } });
    const inv = d.sections.find((s) => s.type === "invitation")!;
    expect(inv.type === "invitation" && inv.data.leftFamily.father.km).toBe("");
    const cover = d.sections.find((s) => s.type === "cover")!;
    expect(cover.type === "cover" && cover.data.names.en).toBe("A & B");
  });
  it("marble-rose sample shows a sample map, but new events start with no map/phones", () => {
    const t = TEMPLATES.find((x) => x.slug === "marble-rose")!;
    const venue = (d: ReturnType<typeof sampleDoc>) => d.sections.find((s) => s.type === "venue")!;
    const v1 = venue(sampleDoc(t)); const v2 = venue(starterDoc(t, { hostNames: { km: "ក", en: "A" } }));
    expect(v1.type === "venue" && v1.data.mapImage).toBe("placeholder:map");
    expect(v2.type === "venue" && v2.data.mapImage).toBe("");
    expect(v2.type === "venue" && v2.data.contacts).toEqual([]);
  });
  it("rejects arbitrary URLs / script in media references", () => {
    const d = sampleDoc(TEMPLATES[0]);
    const bad = structuredClone(d);
    const hero = bad.sections.find((s) => s.type === "hero")!;
    if (hero.type === "hero") hero.data.photo = "javascript:alert(1)";
    expect(InvitationDocSchema.safeParse(bad).success).toBe(false);
    if (hero.type === "hero") hero.data.photo = "https://evil.example/x.png";
    expect(InvitationDocSchema.safeParse(bad).success).toBe(false);
  });
  it("blank sections of every type validate", () => {
    for (const t of SECTION_TYPES) expect(InvitationDocSchema.safeParse({ ...sampleDoc(TEMPLATES[0]), sections: [blankSection(t, "x1")] }).success).toBe(true);
  });
  it("has at least 17 templates across 12 distinct layout families", () => {
    expect(TEMPLATES.length).toBeGreaterThanOrEqual(17);
    expect(new Set(TEMPLATES.map((t) => t.family)).size).toBeGreaterThanOrEqual(12);
    expect(new Set(TEMPLATES.map((t) => t.slug)).size).toBe(TEMPLATES.length);
  });
  it("has a free design for every event type", () => {
    const freeCategories = new Set(TEMPLATES.filter((template) => template.tier === "free").map((template) => template.category));
    for (const type of EVENT_TYPES) expect(freeCategories.has(type.value)).toBe(true);
  });
});
