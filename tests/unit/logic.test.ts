import { describe, expect, it } from "vitest";
import { summarize, validateRsvp } from "@/features/rsvp/logic";
import { formatMoney, parseMoney, sumByCurrency } from "@/lib/money";
import { csvCell, parseCsv, toCsv } from "@/features/guests/csv";

const now = new Date("2027-01-01T00:00:00Z");

describe("RSVP rules", () => {
  it("enforces attendee allowance", () => {
    expect(validateRsvp({ status: "attending", count: 2 }, { allowed: 2, allowMaybe: true, deadline: null, now })).toEqual({ ok: true, status: "attending", count: 2 });
    expect(validateRsvp({ status: "attending", count: 3 }, { allowed: 2, allowMaybe: true, deadline: null, now })).toEqual({ ok: false, error: "count" });
    expect(validateRsvp({ status: "attending", count: 0 }, { allowed: 2, allowMaybe: true, deadline: null, now })).toEqual({ ok: false, error: "count" });
    expect(validateRsvp({ status: "attending", count: NaN }, { allowed: 2, allowMaybe: true, deadline: null, now }).ok).toBe(false);
  });
  it("declined always counts zero", () => {
    expect(validateRsvp({ status: "declined", count: 9 }, { allowed: 2, allowMaybe: true, deadline: null, now })).toEqual({ ok: true, status: "declined", count: 0 });
  });
  it("respects maybe toggle, unknown statuses and deadline", () => {
    expect(validateRsvp({ status: "maybe", count: 1 }, { allowed: 2, allowMaybe: false, deadline: null, now }).ok).toBe(false);
    expect(validateRsvp({ status: "checked_in", count: 1 }, { allowed: 2, allowMaybe: true, deadline: null, now }).ok).toBe(false);
    expect(validateRsvp({ status: "attending", count: 1 }, { allowed: 2, allowMaybe: true, deadline: new Date("2026-12-31"), now })).toEqual({ ok: false, error: "deadline" });
  });
  it("summarizes totals correctly", () => {
    const s = summarize([
      { rsvpStatus: "attending", attendeeCount: 3, allowedAttendees: 4, checkedInCount: 2 },
      { rsvpStatus: "declined", attendeeCount: 0, allowedAttendees: 2, checkedInCount: 0 },
      { rsvpStatus: "maybe", attendeeCount: 1, allowedAttendees: 1, checkedInCount: 0 },
      { rsvpStatus: "pending", attendeeCount: 0, allowedAttendees: 2, checkedInCount: 0 },
    ]);
    expect(s).toEqual({ invited: 4, attending: 1, declined: 1, maybe: 1, pending: 1, expected: 3, maxPossible: 9, checkedIn: 2 });
  });
});

describe("money (integer minor units)", () => {
  it("parses without float error", () => {
    expect(parseMoney("0.1", "USD")).toBe(10);
    expect(parseMoney("0.2", "USD")).toBe(20);
    expect(parseMoney("1,234.56", "USD")).toBe(123456);
    expect(parseMoney("$50", "USD")).toBe(5000);
    expect(parseMoney("1.234", "USD")).toBeNull();
    expect(parseMoney("-5", "USD")).toBeNull();
    expect(parseMoney("100000", "KHR")).toBe(100000);
    expect(parseMoney("100.5", "KHR")).toBeNull();
    expect(parseMoney("abc", "USD")).toBeNull();
  });
  it("sums 0.1 + 0.2 exactly and keeps currencies separate", () => {
    const t = sumByCurrency([{ a: 10, c: "USD" }, { a: 20, c: "USD" }, { a: 40000, c: "KHR" }], (r) => r.a, (r) => r.c);
    expect(t).toEqual({ USD: 30, KHR: 40000 });
    expect(formatMoney(t.USD, "USD")).toBe("$0.30");
    expect(formatMoney(40000, "KHR")).toBe("40,000 ៛");
    expect(formatMoney(-150, "USD")).toBe("-$1.50");
  });
});

describe("CSV", () => {
  it("parses quotes, commas, newlines, BOM and Khmer", () => {
    const rows = parseCsv('﻿Name,Notes\r\n"Sok, Dara","He said ""hi""\nline2"\r\nសុខា,');
    expect(rows).toEqual([["Name", "Notes"], ["Sok, Dara", 'He said "hi"\nline2'], ["សុខា", ""]]);
  });
  it("neutralises formula injection on export", () => {
    expect(csvCell("=HYPERLINK(\"evil\")")).toBe(`"'=HYPERLINK(""evil"")"`);
    expect(csvCell("+1")).toBe("'+1");
    expect(toCsv([["a"]]).startsWith("﻿")).toBe(true);
  });
});
