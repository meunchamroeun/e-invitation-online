/**
 * Money is stored as integer minor units: USD cents, KHR whole riel (KHR has no minor unit in practice).
 * Never use floats for totals. No exchange rate is assumed — totals are kept per currency.
 */
export type Currency = "USD" | "KHR";
export const MINOR: Record<Currency, number> = { USD: 100, KHR: 1 };

/** Parse a user-entered decimal string into minor units without floating point. */
export function parseMoney(input: string, currency: Currency): number | null {
  const s = input.replace(/[,\s៛$]/g, "").trim();
  if (!/^\d+(\.\d+)?$/.test(s)) return null;
  const [whole, frac = ""] = s.split(".");
  if (currency === "KHR") {
    if (frac && /[^0]/.test(frac)) return null;
    return Number(whole);
  }
  if (frac.length > 2) return null;
  return Number(whole) * 100 + Number((frac + "00").slice(0, 2));
}

export function formatMoney(minor: number, currency: Currency): string {
  if (currency === "KHR") return `${minor.toLocaleString("en-US")} ៛`;
  const neg = minor < 0;
  const abs = Math.abs(minor);
  const s = `$${Math.floor(abs / 100).toLocaleString("en-US")}.${String(abs % 100).padStart(2, "0")}`;
  return neg ? `-${s}` : s;
}

export function sumByCurrency<T>(rows: T[], amount: (r: T) => number, currency: (r: T) => string): Record<Currency, number> {
  const out: Record<Currency, number> = { USD: 0, KHR: 0 };
  for (const r of rows) {
    const c = currency(r) as Currency;
    if (c in out) out[c] += amount(r);
  }
  return out;
}
