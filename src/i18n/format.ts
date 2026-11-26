/** Locale & numeral helpers. Dates are stored as UTC timestamps and formatted for a timezone. */
const KH_DIGITS = ["០", "១", "២", "៣", "៤", "៥", "៦", "៧", "៨", "៩"];

export function toKhmerDigits(input: string | number): string {
  return String(input).replace(/[0-9]/g, (d) => KH_DIGITS[Number(d)]);
}

export function num(n: number | string, locale: "km" | "en", khmerDigits = true): string {
  const s = typeof n === "number" ? n.toLocaleString("en-US") : n;
  return locale === "km" && khmerDigits ? toKhmerDigits(s) : s;
}

const KM_MONTHS = ["មករា", "កុម្ភៈ", "មីនា", "មេសា", "ឧសភា", "មិថុនា", "កក្កដា", "សីហា", "កញ្ញា", "តុលា", "វិច្ឆិកា", "ធ្នូ"];
const KM_DAYS = ["អាទិត្យ", "ចន្ទ", "អង្គារ", "ពុធ", "ព្រហស្បតិ៍", "សុក្រ", "សៅរ៍"];

type Parts = { year: number; month: number; day: number; weekday: number; hour: number; minute: number };

export function zonedParts(iso: string | Date, timeZone = "Asia/Phnom_Penh"): Parts {
  const d = typeof iso === "string" ? new Date(iso) : iso;
  const f = new Intl.DateTimeFormat("en-US", {
    timeZone, year: "numeric", month: "numeric", day: "numeric", weekday: "short", hour: "numeric", minute: "numeric", hour12: false,
  });
  const p = Object.fromEntries(f.formatToParts(d).map((x) => [x.type, x.value]));
  const wd = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(p.weekday);
  return { year: +p.year, month: +p.month, day: +p.day, weekday: wd, hour: +p.hour % 24, minute: +p.minute };
}

export function formatDate(iso: string | Date | null | undefined, locale: "km" | "en", tz = "Asia/Phnom_Penh", khmerDigits = true): string {
  if (!iso) return "";
  const p = zonedParts(iso, tz);
  if (locale === "km") {
    return `ថ្ងៃ${KM_DAYS[p.weekday]} ទី${num(String(p.day), "km", khmerDigits)} ខែ${KM_MONTHS[p.month - 1]} ឆ្នាំ${num(String(p.year), "km", khmerDigits)}`;
  }
  return new Intl.DateTimeFormat("en-GB", { timeZone: tz, weekday: "long", day: "numeric", month: "long", year: "numeric" }).format(new Date(iso));
}

export function formatTime(iso: string | Date | null | undefined, locale: "km" | "en", tz = "Asia/Phnom_Penh", khmerDigits = true): string {
  if (!iso) return "";
  const p = zonedParts(iso, tz);
  const hh = String(p.hour).padStart(2, "0");
  const mm = String(p.minute).padStart(2, "0");
  if (locale === "km") {
    const period = p.hour < 12 ? "ព្រឹក" : p.hour < 17 ? "រសៀល" : "ល្ងាច";
    return `ម៉ោង ${num(`${hh}:${mm}`, "km", khmerDigits)} ${period}`;
  }
  return new Intl.DateTimeFormat("en-US", { timeZone: tz, hour: "numeric", minute: "2-digit" }).format(new Date(iso));
}

export function shortDate(iso: string | Date | null | undefined, locale: "km" | "en", tz = "Asia/Phnom_Penh"): string {
  if (!iso) return "—";
  const p = zonedParts(iso, tz);
  if (locale === "km") return `${toKhmerDigits(p.day)} ${KM_MONTHS[p.month - 1]} ${toKhmerDigits(String(p.year))}`;
  return new Intl.DateTimeFormat("en-GB", { timeZone: tz, day: "numeric", month: "short", year: "numeric" }).format(new Date(iso));
}

/** Convert a local wall-clock time in a timezone to a UTC Date. (Handles fixed-offset zones like Asia/Phnom_Penh and DST zones.) */
export function zonedToUtc(date: string, time: string, timeZone: string): Date {
  const [y, m, d] = date.split("-").map(Number);
  const [hh, mm] = (time || "00:00").split(":").map(Number);
  const guess = Date.UTC(y, m - 1, d, hh, mm);
  const p = zonedParts(new Date(guess), timeZone);
  const asIfUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute);
  return new Date(guess - (asIfUtc - guess));
}

export function countdownParts(targetMs: number, nowMs: number) {
  const diff = Math.max(0, targetMs - nowMs);
  const s = Math.floor(diff / 1000);
  return { done: diff === 0, days: Math.floor(s / 86400), hours: Math.floor((s % 86400) / 3600), minutes: Math.floor((s % 3600) / 60), seconds: s % 60 };
}
