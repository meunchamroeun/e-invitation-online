"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui";
import { EventTemplatePicker } from "@/components/dashboard/event-template-picker";
import { changeEventTemplateAction } from "@/features/events/actions";
import type { MarketTemplate } from "@/features/templates/queries";

export function EventDesignForm({ eventId, current, revision, category, templates, locale }: {
  eventId: string; current: string; revision: number; category: string; templates: MarketTemplate[]; locale: "km" | "en";
}) {
  const L = (km: string, en: string) => locale === "km" ? km : en;
  const router = useRouter();
  const [choice, setChoice] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const [pending, start] = useTransition();
  const selected = choice ?? (templates.some((template) => template.slug === current) ? current : templates[0]?.slug ?? current);

  return (
    <form onSubmit={(event) => {
      event.preventDefault();
      if (selected === current || pending) return;
      setError("");
      setSaved(false);
      start(async () => {
        try {
          const result = await changeEventTemplateAction(eventId, revision, selected);
          if (result.ok) {
            setSaved(true);
            setChoice(null);
            router.refresh();
          } else if (result.error === "conflict") {
            setChoice(null);
            setError(L("មានការកែប្រែថ្មី។ សូមជ្រើសរើសគំរូម្ដងទៀត។", "The draft changed. Choose the design again."));
            router.refresh();
          } else {
            setError(L("គំរូនេះមិនអាចប្រើបានទេ។", "This design is unavailable."));
          }
        } catch {
          setError(L("មិនអាចរក្សាទុកគំរូបានទេ។ សូមព្យាយាមម្ដងទៀត។", "Couldn’t save the design. Try again."));
        }
      });
    }}>
      <fieldset disabled={pending} className="min-w-0">
        <EventTemplatePicker category={category} locale={locale} templates={templates} value={selected}
          onChange={(slug) => { setChoice(slug); setSaved(false); setError(""); }} />
        {templates.length ? (
          <div className="mt-5 flex flex-wrap items-center gap-3 border-t border-line pt-4">
            <Button type="submit" disabled={selected === current}>
              {pending ? L("កំពុងរក្សាទុក…", "Saving…") : L("រក្សាទុកគំរូ", "Save design")}
            </Button>
            {saved ? <span role="status" className="text-sm text-success">{L("បានរក្សាទុកគំរូ", "Design saved")}</span> : null}
          </div>
        ) : null}
        {error ? <p role="alert" className="mt-3 text-sm text-danger">{error}</p> : null}
      </fieldset>
    </form>
  );
}
