"use client";

import { useRef, useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import { ArrowUpRight, Check, Eye, LayoutGrid, X } from "lucide-react";
import { TemplateThumb } from "@/components/marketing/template-thumb";
import { Badge, Button, Field, Select } from "@/components/ui";
import type { MarketTemplate } from "@/features/templates/queries";
import { cn } from "@/lib/utils";

const COPY = {
  select: { km: "ជ្រើសរើសគំរូ", en: "Select a template" },
  browse: { km: "មើលគំរូធៀប", en: "Browse designs" },
  dialog: { km: "ជ្រើសរើសគំរូធៀប", en: "Choose an invitation design" },
  close: { km: "បិទ", en: "Close" },
  free: { km: "ឥតគិតថ្លៃ", en: "Free" },
  premium: { km: "ពិសេស", en: "Premium" },
  premiumNote: {
    km: "អាចកែ និងមើលជាមុនដោយឥតគិតថ្លៃ។ ត្រូវការកញ្ចប់ដែលគាំទ្រដើម្បីផ្សព្វផ្សាយ។",
    en: "Edit and preview for free. Publishing requires an eligible plan.",
  },
  empty: {
    km: "មិនមានគំរូធៀបសម្រាប់ប្រភេទកម្មវិធីនេះទេ។",
    en: "There are no published designs for this event type.",
  },
  use: { km: "ប្រើគំរូ", en: "Use design" },
  selected: { km: "បានជ្រើសរើស", en: "Selected" },
  preview: { km: "មើលគំរូ", en: "Preview" },
};

export function EventTemplatePicker({ category, locale, templates, value, onChange }: {
  category: string;
  locale: "km" | "en";
  templates: MarketTemplate[];
  value: string;
  onChange: (slug: string) => void;
}) {
  const L = (text: { km: string; en: string }) => text[locale];
  const dialog = useRef<HTMLDialogElement>(null);
  const browse = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const reduceMotion = useReducedMotion();
  const selected = templates.find((template) => template.slug === value);

  if (templates.length === 0) return <p className="text-sm text-ink-2">{L(COPY.empty)}</p>;

  return (
    <>
      <Field label={L(COPY.select)} htmlFor="event-template">
        <Select id="event-template" className="appearance-auto bg-none" required value={value}
          onChange={(event) => onChange(event.target.value)}>
          {templates.map((template) => <option key={template.slug} value={template.slug}>{L(template.name)}</option>)}
        </Select>
      </Field>
      {selected ? (
        <motion.div key={selected.slug} initial={reduceMotion ? false : { opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}
          className="mt-4 flex items-start gap-3 rounded-xl border border-line bg-paper p-3">
          <div className="shrink-0 overflow-hidden rounded-lg border border-line">
            <TemplateThumb slug={selected.slug} locale={locale} width={62} />
          </div>
          <div className="min-w-0">
            <Badge tone={selected.tier === "premium" ? "gold" : "neutral"}>{L(COPY[selected.tier])}</Badge>
            <p className="mt-2 text-sm leading-6 text-ink-2">{L(selected.description)}</p>
          </div>
        </motion.div>
      ) : null}
      {selected?.tier === "premium" ? <p className="mt-3 text-xs text-ink-2">{L(COPY.premiumNote)}</p> : null}
      <Button ref={browse} type="button" variant="outline" className="mt-4 w-full" aria-haspopup="dialog"
        onClick={() => { dialog.current?.showModal(); setOpen(true); }}>
        <LayoutGrid aria-hidden className="size-4" />
        {L(COPY.browse)}
      </Button>
      <dialog ref={dialog} aria-labelledby="event-design-dialog-title"
        onClose={() => { setOpen(false); browse.current?.focus(); }}
        className={cn(
          "m-auto hidden max-h-[88dvh] w-[calc(100%_-_1.5rem)] flex-col overflow-hidden rounded-2xl border border-line bg-paper text-ink shadow-lift backdrop:bg-ink/55 open:flex",
          templates.length === 1 ? "max-w-md" : "max-w-5xl",
        )}>
        <header className="flex shrink-0 items-start justify-between gap-4 border-b border-line-2 bg-white px-4 py-4 sm:px-6">
          <div>
            <p className="text-xs font-medium text-gold-2">{category}</p>
            <h3 id="event-design-dialog-title" className="mt-1 text-lg font-semibold sm:text-xl">{L(COPY.dialog)}</h3>
          </div>
          <Button type="button" variant="outline" className="size-10 shrink-0 px-0" aria-label={L(COPY.close)}
            onClick={() => dialog.current?.close()}>
            <X aria-hidden className="size-4" />
          </Button>
        </header>
        {open ? (
          <ul className={cn(
            "grid min-h-0 auto-rows-max content-start gap-3 overflow-y-auto overscroll-contain p-3 sm:gap-4 sm:p-5",
            templates.length === 1 ? "grid-cols-1" : "grid-cols-1 min-[350px]:grid-cols-2 md:grid-cols-3 xl:grid-cols-4",
          )}>
            {templates.map((template) => {
              const active = template.slug === value;
              const name = L(template.name);
              return (
                <li key={template.slug} className={cn(
                  "flex min-w-0 flex-col overflow-hidden rounded-xl border bg-white",
                  active ? "border-gold ring-1 ring-gold" : "border-line-2",
                )}>
                  <div className="relative grid place-items-center border-b border-line bg-[#EFECE6] px-2 pb-4 pt-10">
                    <Badge tone={template.tier === "premium" ? "gold" : "neutral"} className="absolute left-2 top-2 bg-white">
                      {L(COPY[template.tier])}
                    </Badge>
                    {active ? <span className="absolute right-2 top-2 grid size-6 place-items-center rounded-full bg-ink text-white">
                      <Check aria-hidden className="size-3.5" />
                      <span className="sr-only">{L(COPY.selected)}</span>
                    </span> : null}
                    <div className="overflow-hidden rounded-lg border border-line-2 bg-white shadow-soft">
                      <TemplateThumb slug={template.slug} locale={locale} width={104} />
                    </div>
                  </div>
                  <div className="flex flex-1 flex-col gap-3 p-2.5 sm:p-3">
                    <h4 className="flex-1 break-words text-sm font-semibold leading-6">{name}</h4>
                    <div className="grid gap-2">
                      <Button asChild variant="outline" className="w-full gap-1.5 px-2">
                        <a href={`/t/${template.slug}?lang=${locale}`} target="_blank" rel="noopener" aria-label={`${L(COPY.preview)}: ${name}`}>
                          <Eye aria-hidden className="size-4 shrink-0" />
                          {L(COPY.preview)}
                          <ArrowUpRight aria-hidden className="size-3 shrink-0" />
                        </a>
                      </Button>
                      <Button type="button" variant={active ? "soft" : "primary"} className="px-2"
                        aria-label={`${L(COPY.use)}: ${name}`} aria-pressed={active}
                        onClick={() => { onChange(template.slug); dialog.current?.close(); }}>
                        {L(COPY[active ? "selected" : "use"])}
                      </Button>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        ) : null}
      </dialog>
    </>
  );
}
