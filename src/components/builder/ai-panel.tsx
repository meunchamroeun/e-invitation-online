"use client";

import { useEffect, useState, useTransition } from "react";
import { Tabs } from "@base-ui/react/tabs";
import { AnimatePresence, motion } from "motion/react";
import { Bot, Check, Copy, Loader2, Send, Sparkles, Wand2 } from "lucide-react";
import {
  aiStatusAction,
  askAiAssistantAction,
  generateInvitationContentAction,
  type GeneratedInvitationContent,
} from "@/features/ai/actions";
import type { InvitationDoc, Section } from "@/features/invitations/doc";
import { cn } from "@/lib/utils";

type Tone = "formal" | "warm" | "modern";
type Scope = "all" | "schedule" | "story";

type ChatMessage = {
  role: "user" | "assistant";
  text: string;
  km?: string;
  en?: string;
};

export function AiBuilderPanel({
  eventId,
  locale,
  doc,
  onApplyDoc,
}: {
  eventId: string;
  locale: "km" | "en";
  doc: InvitationDoc;
  onApplyDoc: (next: InvitationDoc, key?: string) => void;
}) {
  const L = (km: string, en: string) => (locale === "km" ? km : en);
  const [enabled, setEnabled] = useState<boolean | null>(null);
  const [mode, setMode] = useState<"generate" | "assistant">("generate");

  // AI Generate state
  const [tone, setTone] = useState<Tone>("formal");
  const [scope, setScope] = useState<Scope>("all");
  const [prompt, setPrompt] = useState("");
  const [generated, setGenerated] = useState<GeneratedInvitationContent | null>(null);
  const [genErr, setGenErr] = useState("");
  const [applied, setApplied] = useState(false);
  const [genPending, startGen] = useTransition();

  // AI Assistant state
  const [chatInput, setChatInput] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [chatErr, setChatErr] = useState("");
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);
  const [chatPending, startChat] = useTransition();

  useEffect(() => {
    aiStatusAction().then((s) => setEnabled(s.enabled)).catch(() => setEnabled(false));
  }, []);

  const applyGenerated = (data: GeneratedInvitationContent) => {
    const nextSections: Section[] = doc.sections.map((section) => {
      if (section.type === "cover" && data.cover) {
        return {
          ...section,
          data: {
            ...section.data,
            kicker: data.cover.kicker,
            title: data.cover.title,
            button: data.cover.button,
          },
        };
      }
      if (section.type === "hero" && data.hero) {
        return {
          ...section,
          data: {
            ...section.data,
            kicker: data.hero.kicker,
            tagline: data.hero.tagline,
          },
        };
      }
      if (section.type === "invitation" && data.invitation) {
        return {
          ...section,
          data: {
            ...section.data,
            heading: data.invitation.heading,
            body: data.invitation.body,
          },
        };
      }
      if (section.type === "story" && data.story) {
        return {
          ...section,
          data: {
            ...section.data,
            heading: data.story.heading,
            chapters: data.story.chapters.map((ch, idx) => ({
              date: ch.date,
              title: ch.title,
              text: ch.text,
              photo: section.data.chapters[idx]?.photo ?? "",
            })),
          },
        };
      }
      if (section.type === "schedule" && data.schedule) {
        return {
          ...section,
          data: {
            ...section.data,
            heading: data.schedule.heading,
            items: data.schedule.items.map((it, idx) => ({
              time: it.time,
              title: it.title,
              desc: it.desc,
              icon: section.data.items[idx]?.icon ?? "chan",
            })),
          },
        };
      }
      if (section.type === "rsvp" && data.rsvp) {
        return {
          ...section,
          data: {
            ...section.data,
            heading: data.rsvp.heading,
            note: data.rsvp.note,
          },
        };
      }
      if (section.type === "gift" && data.gift) {
        return {
          ...section,
          data: {
            ...section.data,
            heading: data.gift.heading,
            note: data.gift.note,
          },
        };
      }
      return section;
    });

    onApplyDoc({ ...doc, sections: nextSections }, "ai-generate");
    setApplied(true);
    window.setTimeout(() => setApplied(false), 2500);
  };

  const handleGenerate = () => {
    setGenErr("");
    setApplied(false);
    startGen(async () => {
      const res = await generateInvitationContentAction(eventId, {
        prompt: prompt || L("បង្កើតខ្លឹមសារធៀបអញ្ជើញជាភាសាខ្មែរ និងអង់គ្លេស", "Generate bilingual Khmer and English invitation content"),
        tone,
        scope,
      });
      if (!res.ok) {
        setGenErr(
          res.error === "rate"
            ? L("ប្រើប្រាស់ច្រើនពេក សូមរង់ចាំបន្តិច", "Rate limit reached. Please wait a moment.")
            : L("មិនអាចបង្កើតបានទេ សូមព្យាយាមម្តងទៀត", "Could not generate content. Please try again."),
        );
        return;
      }
      setGenerated(res.data);
    });
  };

  const handleAsk = (e: React.FormEvent) => {
    e.preventDefault();
    const q = chatInput.trim();
    if (!q || chatPending) return;
    setChatErr("");
    setChatInput("");
    setMessages((prev) => [...prev, { role: "user", text: q }]);
    startChat(async () => {
      const res = await askAiAssistantAction(eventId, { message: q, locale });
      if (!res.ok) {
        setChatErr(L("AI មិនឆ្លើយតបទេ សូមព្យាយាមម្តងទៀត", "AI could not reply right now."));
        return;
      }
      setMessages((prev) => [...prev, { role: "assistant", text: res.reply, km: res.km, en: res.en }]);
    });
  };

  const copyPair = async (idx: number, km?: string, en?: string) => {
    const combined = [km, en].filter(Boolean).join("\n\n");
    if (!combined) return;
    try {
      await navigator.clipboard.writeText(combined);
      setCopiedIdx(idx);
      window.setTimeout(() => setCopiedIdx((prev) => (prev === idx ? null : prev)), 1500);
    } catch {
      /* ignore */
    }
  };

  if (enabled === null) {
    return (
      <div className="flex items-center justify-center p-8 text-xs text-muted">
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        {L("កំពុងពិនិត្យ AI…", "Checking AI…")}
      </div>
    );
  }

  if (!enabled) {
    return (
      <div className="p-4">
        <div className="rounded-2xl border border-dashed border-line-2 bg-white p-4 text-xs leading-5 text-muted">
          <Sparkles className="mb-1.5 h-4 w-4 text-gold-2" />
          {L(
            "មុខងារ AI មិនទាន់បានកំណត់រចនាសម្ព័ន្ធលើម៉ាស៊ីនមេទេ (GEMINI_API_KEY)។",
            "AI features are not configured on this server (GEMINI_API_KEY).",
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3 p-3.5">
      {/* Mode Switcher */}
      <Tabs.Root value={mode} onValueChange={(v) => setMode(v as "generate" | "assistant")}>
        <Tabs.List className="grid grid-cols-2 rounded-xl border border-line bg-[#EFECE6] p-1">
          {(
            [
              ["generate", L("បង្កើតធៀប AI", "AI Generate"), Wand2],
              ["assistant", L("ជំនួយការ AI", "AI Assistant"), Bot],
            ] as const
          ).map(([key, label, Icon]) => {
            const active = mode === key;
            return (
              <Tabs.Tab
                key={key}
                value={key}
                className={cn(
                  "relative z-10 flex items-center justify-center gap-1.5 rounded-lg py-1.5 text-xs font-medium transition-colors",
                  active ? "text-ink" : "text-muted hover:text-ink",
                )}
              >
                {active ? (
                  <motion.span
                    layoutId="builder-ai-mode"
                    transition={{ type: "spring", stiffness: 450, damping: 32 }}
                    className="absolute inset-0 -z-10 rounded-lg bg-white shadow-xs"
                  />
                ) : null}
                <Icon className="h-3.5 w-3.5" />
                <span>{label}</span>
              </Tabs.Tab>
            );
          })}
        </Tabs.List>
      </Tabs.Root>

      <AnimatePresence mode="wait">
        {mode === "generate" ? (
          <motion.div
            key="generate"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.16 }}
            className="space-y-3"
          >
            <div className="space-y-3 rounded-2xl border border-line bg-white p-3.5 shadow-xs">
              <div>
                <p className="mb-1.5 text-[11px] font-semibold text-ink-2">{L("ផ្នែកដែលត្រូវបង្កើត", "What to generate")}</p>
                <div className="grid grid-cols-3 gap-1 rounded-xl bg-[#EFECE6] p-1">
                  {(
                    [
                      ["all", L("ទាំងអស់", "All text")],
                      ["schedule", L("កម្មវិធី", "Schedule")],
                      ["story", L("សាច់រឿង", "Story")],
                    ] as const
                  ).map(([val, label]) => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => setScope(val)}
                      className={cn(
                        "rounded-lg py-1 text-[11px] font-medium transition-all",
                        scope === val ? "bg-white text-ink shadow-xs" : "text-muted hover:text-ink",
                      )}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <p className="mb-1.5 text-[11px] font-semibold text-ink-2">{L("រចនាបថពាក្យ", "Tone")}</p>
                <div className="grid grid-cols-3 gap-1 rounded-xl bg-[#EFECE6] p-1">
                  {(
                    [
                      ["formal", L("ផ្លូវការ", "Formal")],
                      ["warm", L("កក់ក្តៅ", "Warm")],
                      ["modern", L("ទំនើប", "Modern")],
                    ] as const
                  ).map(([val, label]) => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => setTone(val)}
                      className={cn(
                        "rounded-lg py-1 text-[11px] font-medium transition-all",
                        tone === val ? "bg-white text-ink shadow-xs" : "text-muted hover:text-ink",
                      )}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <p className="mb-1.5 text-[11px] font-semibold text-ink-2">{L("ពណ៌នាអំពីកម្មវិធី", "Describe your event")}</p>
                <textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  rows={3}
                  maxLength={800}
                  placeholder={L(
                    "ឧ. ពិធីមង្គលការ សុខា & តារា ពេលព្រឹក ៧:០០ នៅកោះពេជ្រ រចនាបថខ្មែរប្រពៃណី…",
                    "e.g. Khmer traditional wedding for Sokha & Dara, morning ceremony 7 AM, dinner at Koh Pich…",
                  )}
                  className="w-full rounded-xl border border-line-2 bg-paper/40 p-2.5 text-xs leading-relaxed text-ink placeholder:text-muted/70 focus:border-gold focus:bg-white focus:outline-none"
                />
                <div className="mt-1.5 flex flex-wrap gap-1">
                  {[
                    L("មង្គលការប្រពៃណីខ្មែរ", "Traditional Khmer wedding"),
                    L("ពិធីភ្ជាប់ពាក្យកក់ក្តៅ", "Warm engagement"),
                    L("ពិធីឡើងគេហដ្ឋាន", "Housewarming"),
                  ].map((chip) => (
                    <button
                      key={chip}
                      type="button"
                      onClick={() => setPrompt(chip)}
                      className="rounded-full border border-line bg-paper px-2 py-0.5 text-[10px] text-ink-2 hover:border-gold/50 hover:bg-gold-soft/30"
                    >
                      + {chip}
                    </button>
                  ))}
                </div>
              </div>

              <button
                type="button"
                disabled={genPending}
                onClick={handleGenerate}
                className="flex h-9 w-full items-center justify-center gap-1.5 rounded-xl bg-[#241c19] text-xs font-medium text-white shadow-xs transition-opacity hover:opacity-95 disabled:opacity-60"
              >
                {genPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Wand2 className="h-3.5 w-3.5" />}
                {genPending ? L("កំពុងបង្កើត…", "Generating…") : L("បង្កើតខ្លឹមសារដោយ AI", "Generate with AI")}
              </button>

              {genErr ? <p className="text-xs text-danger">{genErr}</p> : null}
            </div>

            {generated ? (
              <div className="space-y-2.5 rounded-2xl border border-gold/40 bg-[#fcf8ef] p-3.5 shadow-xs">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs font-semibold text-gold-2">{L("លទ្ធផលដែលបានបង្កើត", "Generated preview")}</p>
                  <button
                    type="button"
                    onClick={() => applyGenerated(generated)}
                    className="inline-flex items-center gap-1 rounded-lg bg-[#86622f] px-2.5 py-1 text-[11px] font-medium text-white hover:bg-[#705024]"
                  >
                    {applied ? <Check className="h-3 w-3" /> : <Sparkles className="h-3 w-3" />}
                    {applied ? L("បានអនុវត្ត!", "Applied!") : L("ប្រើទាំងអស់", "Apply all")}
                  </button>
                </div>

                <div className="space-y-2 text-[11px] leading-relaxed">
                  {generated.hero ? (
                    <div className="rounded-xl border border-line bg-white p-2.5">
                      <p className="font-semibold text-ink">Hero</p>
                      <p lang="km" className="text-ink-2">{generated.hero.kicker.km} · {generated.hero.tagline.km}</p>
                      <p className="text-muted">{generated.hero.kicker.en} · {generated.hero.tagline.en}</p>
                    </div>
                  ) : null}
                  {generated.invitation ? (
                    <div className="rounded-xl border border-line bg-white p-2.5">
                      <p className="font-semibold text-ink">{L("លិខិតអញ្ជើញ", "Invitation")}</p>
                      <p lang="km" className="line-clamp-3 text-ink-2">{generated.invitation.body.km}</p>
                    </div>
                  ) : null}
                  {generated.schedule ? (
                    <div className="rounded-xl border border-line bg-white p-2.5">
                      <p className="font-semibold text-ink">{L("កម្មវិធី", "Schedule")} ({generated.schedule.items.length})</p>
                      <p lang="km" className="text-muted">
                        {generated.schedule.items.slice(0, 3).map((it) => `${it.time} ${it.title.km}`).join(" · ")}
                      </p>
                    </div>
                  ) : null}
                  {generated.story ? (
                    <div className="rounded-xl border border-line bg-white p-2.5">
                      <p className="font-semibold text-ink">{L("សាច់រឿង", "Story")} ({generated.story.chapters.length})</p>
                      <p lang="km" className="text-muted">
                        {generated.story.chapters.map((c) => c.title.km).join(" · ")}
                      </p>
                    </div>
                  ) : null}
                </div>
              </div>
            ) : null}
          </motion.div>
        ) : (
          <motion.div
            key="assistant"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.16 }}
            className="flex flex-col space-y-3 rounded-2xl border border-line bg-white p-3.5 shadow-xs"
          >
            <div className="flex flex-wrap gap-1">
              {[
                L("សរសេរពាក្យអរគុណសម្រាប់ចំណងដៃ", "Write a gift thank-you note"),
                L("ណែនាំកាលវិភាគមង្គលការខ្មែរ", "Suggest Khmer wedding schedule"),
                L("បកប្រែពាក្យអញ្ជើញទៅជាខ្មែរផ្លូវការ", "Translate to formal Khmer"),
              ].map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setChatInput(preset)}
                  className="rounded-full border border-line bg-paper px-2.5 py-1 text-[10px] text-ink-2 hover:border-gold/50 hover:bg-gold-soft/30"
                >
                  {preset}
                </button>
              ))}
            </div>

            <div className="max-h-72 space-y-2.5 overflow-y-auto pr-1">
              {messages.length === 0 ? (
                <p className="py-6 text-center text-xs text-muted">
                  {L("សួរ AI ដើម្បីជួយសរសេរ កែសម្រួល ឬបកប្រែអត្ថបទធៀបអញ្ជើញ។", "Ask AI to draft, refine, or translate any invitation text.")}
                </p>
              ) : null}
              {messages.map((m, idx) => (
                <div
                  key={idx}
                  className={cn(
                    "rounded-xl p-2.5 text-xs leading-relaxed",
                    m.role === "user" ? "ml-6 bg-[#241c19] text-white" : "mr-2 border border-line bg-[#faf8f3] text-ink",
                  )}
                >
                  <p dir="auto">{m.text}</p>
                  {m.km || m.en ? (
                    <div className="mt-2 space-y-1 rounded-lg border border-line bg-white p-2 text-[11px]">
                      {m.km ? <p lang="km" className="text-ink">{m.km}</p> : null}
                      {m.en ? <p className="text-muted">{m.en}</p> : null}
                      <button
                        type="button"
                        onClick={() => void copyPair(idx, m.km, m.en)}
                        className="mt-1 inline-flex items-center gap-1 text-[10px] font-medium text-gold-2 hover:underline"
                      >
                        {copiedIdx === idx ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                        {copiedIdx === idx ? L("បានចម្លង", "Copied") : L("ចម្លងអត្ថបទ", "Copy text")}
                      </button>
                    </div>
                  ) : null}
                </div>
              ))}
              {chatPending ? (
                <div className="flex items-center gap-2 rounded-xl border border-line bg-[#faf8f3] p-2.5 text-xs text-muted">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  {L("AI កំពុងគិត…", "Thinking…")}
                </div>
              ) : null}
            </div>

            {chatErr ? <p className="text-xs text-danger">{chatErr}</p> : null}

            <form onSubmit={handleAsk} className="flex items-center gap-1.5 border-t border-line pt-2.5">
              <input
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                maxLength={500}
                placeholder={L("សួរ AI…", "Ask AI assistant…")}
                className="h-9 min-w-0 flex-1 rounded-xl border border-line-2 bg-paper/40 px-3 text-xs focus:border-gold focus:bg-white focus:outline-none"
              />
              <button
                type="submit"
                disabled={chatPending || !chatInput.trim()}
                aria-label="Send"
                className="grid size-9 shrink-0 place-items-center rounded-xl bg-[#241c19] text-white disabled:opacity-50"
              >
                <Send className="h-3.5 w-3.5" />
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
