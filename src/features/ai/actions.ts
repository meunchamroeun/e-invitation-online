"use server";

import { z } from "zod";
import { assertEvent } from "@/lib/auth/event-access";
import { rateLimit } from "@/lib/security/rate-limit";
import { EVENT_TYPES } from "@/features/templates/registry";
import { formatDate, formatTime } from "@/i18n/format";

export async function aiStatusAction() {
  return { enabled: !!process.env.ANTHROPIC_API_KEY };
}

const Out = z.object({ suggestions: z.array(z.object({ km: z.string().max(1500), en: z.string().max(1500) })).min(1).max(3) });

/**
 * Suggests formal invitation wording. Grounded ONLY in details the user already entered; missing facts are left as
 * bracketed placeholders (never invented). Results go back to the editor for review — nothing is saved or published here.
 */
export async function suggestWordingAction(eventId: string, opts: { tone: "formal" | "warm" | "modern"; extra: string }) {
  const { user, event } = await assertEvent(eventId, "event.edit");
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return { ok: false as const, error: "disabled" };
  if (!(await rateLimit(`ai:${user.id}`, 20, 3600))) return { ok: false as const, error: "rate" };
  const type = EVENT_TYPES.find((e) => e.value === event.type)?.label.en ?? event.type;
  const facts = {
    eventType: type,
    title: event.title,
    date: event.startsAt ? formatDate(event.startsAt, "en", event.timezone) : null,
    time: event.startsAt ? formatTime(event.startsAt, "en", event.timezone) : null,
    venue: event.venueName,
    notesFromHost: opts.extra.slice(0, 500),
  };
  const system = `You write invitation wording for Cambodian families in Khmer and English.
Rules: Use ONLY the facts provided. Never invent names, parents' names, dates, lunar dates, ceremonies or venues. If a fact is needed but missing, write a bracketed placeholder like [ឈ្មោះមាតាបិតា] / [parents' names].
Khmer must be natural, respectful, correctly spelled Unicode Khmer (e.g. formal phrases such as «សូមគោរពអញ្ជើញ»), not a literal translation of the English.
Return strict JSON: {"suggestions":[{"km":"...","en":"..."}]} with 3 suggestions in a ${opts.tone} tone. No markdown.`;
  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "content-type": "application/json", "x-api-key": key, "anthropic-version": "2023-06-01" },
      body: JSON.stringify({ model: process.env.AI_MODEL || "claude-sonnet-5-5", max_tokens: 1500, system, messages: [{ role: "user", content: `Facts: ${JSON.stringify(facts)}` }] }),
      signal: AbortSignal.timeout(30000),
    });
    const j = (await res.json()) as { content?: { type: string; text: string }[] };
    const text = j.content?.find((c) => c.type === "text")?.text ?? "";
    const parsed = Out.safeParse(JSON.parse(text.slice(text.indexOf("{"), text.lastIndexOf("}") + 1)));
    if (!parsed.success) return { ok: false as const, error: "bad_output" };
    return { ok: true as const, suggestions: parsed.data.suggestions };
  } catch {
    return { ok: false as const, error: "failed" };
  }
}
