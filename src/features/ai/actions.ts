"use server";

import { z } from "zod";
import { assertEvent } from "@/lib/auth/event-access";
import { rateLimit } from "@/lib/security/rate-limit";
import { EVENT_TYPES } from "@/features/templates/registry";
import { formatDate, formatTime } from "@/i18n/format";

const GEMINI_MODELS = ["gemini-flash-latest", "gemini-3.5-flash", "gemini-3-flash-preview"] as const;

function getAiConfig() {
  const geminiKey = process.env.GEMINI_API_KEY?.trim();
  if (geminiKey) return { provider: "gemini" as const, key: geminiKey };
  const anthropicKey = process.env.ANTHROPIC_API_KEY?.trim();
  if (anthropicKey) return { provider: "anthropic" as const, key: anthropicKey };
  return null;
}

export async function aiStatusAction() {
  const cfg = getAiConfig();
  return { enabled: Boolean(cfg), provider: cfg?.provider ?? null };
}

async function callAi(system: string, userMessage: string, maxTokens = 2000): Promise<string | null> {
  const cfg = getAiConfig();
  if (!cfg) return null;

  if (cfg.provider === "gemini") {
    const models = process.env.AI_MODEL?.trim() ? [process.env.AI_MODEL.trim(), ...GEMINI_MODELS] : [...GEMINI_MODELS];
    for (const model of models) {
      try {
        const res = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(cfg.key)}`,
          {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({
              systemInstruction: { parts: [{ text: system }] },
              contents: [{ role: "user", parts: [{ text: userMessage }] }],
              generationConfig: { maxOutputTokens: maxTokens, temperature: 0.7 },
            }),
            signal: AbortSignal.timeout(30000),
          },
        );
        if (!res.ok) continue;
        const data = (await res.json()) as {
          candidates?: { content?: { parts?: { text?: string }[] } }[];
        };
        const text = data.candidates?.[0]?.content?.parts?.map((p) => p.text ?? "").join("").trim();
        if (text) return text;
      } catch {
        /* try next fallback model */
      }
    }
    return null;
  }

  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "content-type": "application/json", "x-api-key": cfg.key, "anthropic-version": "2023-06-01" },
      body: JSON.stringify({
        model: process.env.AI_MODEL || "claude-sonnet-5-5",
        max_tokens: maxTokens,
        system,
        messages: [{ role: "user", content: userMessage }],
      }),
      signal: AbortSignal.timeout(30000),
    });
    if (!res.ok) return null;
    const j = (await res.json()) as { content?: { type: string; text: string }[] };
    return j.content?.find((c) => c.type === "text")?.text ?? null;
  } catch {
    return null;
  }
}

function extractJson(text: string): unknown {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end <= start) return null;
  try {
    return JSON.parse(text.slice(start, end + 1));
  } catch {
    return null;
  }
}

const Out = z.object({
  suggestions: z.array(z.object({ km: z.string().max(1500), en: z.string().max(1500) })).min(1).max(3),
});

/**
 * Suggests formal invitation wording. Grounded ONLY in details the user already entered; missing facts are left as
 * bracketed placeholders (never invented). Results go back to the editor for review — nothing is saved or published here.
 */
export async function suggestWordingAction(eventId: string, opts: { tone: "formal" | "warm" | "modern"; extra: string }) {
  const { user, event } = await assertEvent(eventId, "event.edit");
  if (!getAiConfig()) return { ok: false as const, error: "disabled" };
  if (!(await rateLimit(`ai:${user.id}`, 30, 3600))) return { ok: false as const, error: "rate" };
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

  const text = await callAi(system, `Facts: ${JSON.stringify(facts)}`, 1500);
  if (!text) return { ok: false as const, error: "failed" };
  const parsed = Out.safeParse(extractJson(text));
  if (!parsed.success) return { ok: false as const, error: "bad_output" };
  return { ok: true as const, suggestions: parsed.data.suggestions };
}

const LPair = z.object({ km: z.string().max(1500), en: z.string().max(1500) });

const GeneratedDraftSchema = z.object({
  cover: z.object({ kicker: LPair, title: LPair, button: LPair }).optional(),
  hero: z.object({ kicker: LPair, tagline: LPair }).optional(),
  invitation: z.object({ heading: LPair, body: LPair }).optional(),
  story: z.object({
    heading: LPair,
    chapters: z.array(z.object({ date: z.string().max(60), title: LPair, text: LPair })).max(4),
  }).optional(),
  schedule: z.object({
    heading: LPair,
    items: z.array(z.object({ time: z.string().max(40), title: LPair, desc: LPair })).max(8),
  }).optional(),
  rsvp: z.object({ heading: LPair, note: LPair }).optional(),
  gift: z.object({ heading: LPair, note: LPair }).optional(),
});

export type GeneratedInvitationContent = z.infer<typeof GeneratedDraftSchema>;

export async function generateInvitationContentAction(
  eventId: string,
  opts: { prompt: string; tone: "formal" | "warm" | "modern"; scope: "all" | "schedule" | "story" },
) {
  const { user, event } = await assertEvent(eventId, "event.edit");
  if (!getAiConfig()) return { ok: false as const, error: "disabled" };
  if (!(await rateLimit(`ai:${user.id}`, 30, 3600))) return { ok: false as const, error: "rate" };

  const type = EVENT_TYPES.find((e) => e.value === event.type)?.label.en ?? event.type;
  const facts = {
    eventType: type,
    title: event.title,
    date: event.startsAt ? formatDate(event.startsAt, "en", event.timezone) : null,
    time: event.startsAt ? formatTime(event.startsAt, "en", event.timezone) : null,
    venue: event.venueName,
    userPrompt: opts.prompt.trim().slice(0, 800),
    tone: opts.tone,
    scope: opts.scope,
  };

  const scopeHint =
    opts.scope === "schedule"
      ? `Return JSON with ONLY "schedule": {"heading":{"km":"...","en":"..."},"items":[{"time":"07:00 AM","title":{"km":"...","en":"..."},"desc":{"km":"...","en":"..."}}]}`
      : opts.scope === "story"
        ? `Return JSON with ONLY "story": {"heading":{"km":"...","en":"..."},"chapters":[{"date":"2023","title":{"km":"...","en":"..."},"text":{"km":"...","en":"..."}}]}`
        : `Return JSON with "cover", "hero", "invitation", "schedule", "story", "rsvp", "gift".`;

  const system = `You are a bilingual Khmer & English e-invitation copywriter for Cambodian events.
Write respectful, natural Unicode Khmer (e.g. សិរីមង្គលអាពាហ៍ពិពាហ៍, សូមគោរពអញ្ជើញ) and natural English in a ${opts.tone} tone.
Use ONLY facts from the user prompt and event details. If a specific detail like parents' names or exact time is missing, use clean placeholders like [ឈ្មោះមាតាបិតា] or sensible traditional Cambodian event schedule times when scope is schedule.
${scopeHint}
Strict JSON only, no markdown fences, matching:
{
  "cover": {"kicker":{"km":"","en":""},"title":{"km":"","en":""},"button":{"km":"","en":""}},
  "hero": {"kicker":{"km":"","en":""},"tagline":{"km":"","en":""}},
  "invitation": {"heading":{"km":"","en":""},"body":{"km":"","en":""}},
  "story": {"heading":{"km":"","en":""},"chapters":[{"date":"","title":{"km":"","en":""},"text":{"km":"","en":""}}]},
  "schedule": {"heading":{"km":"","en":""},"items":[{"time":"","title":{"km":"","en":""},"desc":{"km":"","en":""}}]},
  "rsvp": {"heading":{"km":"","en":""},"note":{"km":"","en":""}},
  "gift": {"heading":{"km":"","en":""},"note":{"km":"","en":""}}
}`;

  const text = await callAi(system, `Event & request: ${JSON.stringify(facts)}`, 2500);
  if (!text) return { ok: false as const, error: "failed" };
  const parsed = GeneratedDraftSchema.safeParse(extractJson(text));
  if (!parsed.success) return { ok: false as const, error: "bad_output" };
  return { ok: true as const, data: parsed.data };
}

const AssistantReplySchema = z.object({
  reply: z.string().max(2000),
  km: z.string().max(1500).optional(),
  en: z.string().max(1500).optional(),
});

export async function askAiAssistantAction(
  eventId: string,
  opts: { message: string; locale: "km" | "en" },
) {
  const { user, event } = await assertEvent(eventId, "event.edit");
  if (!getAiConfig()) return { ok: false as const, error: "disabled" };
  if (!(await rateLimit(`ai:${user.id}`, 40, 3600))) return { ok: false as const, error: "rate" };

  const type = EVENT_TYPES.find((e) => e.value === event.type)?.label.en ?? event.type;
  const system = `You are a helpful AI assistant inside an e-invitation builder for Cambodian events.
Respond primarily in ${opts.locale === "km" ? "Khmer" : "English"}.
Event context: type=${type}, title=${event.title}, venue=${event.venueName ?? "N/A"}.
Return strict JSON only (no markdown):
{"reply":"brief helpful answer","km":"optional Khmer text ready to copy/use","en":"optional English text ready to copy/use"}`;

  const text = await callAi(system, opts.message.trim().slice(0, 1000), 1200);
  if (!text) return { ok: false as const, error: "failed" };
  const parsed = AssistantReplySchema.safeParse(extractJson(text));
  if (!parsed.success) {
    return { ok: true as const, reply: text.slice(0, 1500), km: undefined, en: undefined };
  }
  return { ok: true as const, ...parsed.data };
}
