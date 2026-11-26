"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Rocket } from "lucide-react";
import { publishAction } from "@/features/events/actions";
import { Button } from "@/components/ui";

const ERR: Record<string, { km: string; en: string }> = {
  plan_premium_template: { km: "គំរូនេះជាគំរូពិសេស — សូមដំឡើងកញ្ចប់ ដើម្បីផ្សព្វផ្សាយ", en: "This is a premium design — upgrade your plan to publish" },
};

export function PublishButton({ eventId, label, locale, size = "md" }: { eventId: string; label: string; locale: "km" | "en"; size?: "sm" | "md" }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [err, setErr] = useState("");
  return (
    <div className="flex flex-col items-end gap-1">
      <Button variant="gold" size={size} disabled={pending} onClick={() => start(async () => {
        setErr("");
        const r = await publishAction(eventId);
        if (!r.ok) setErr(ERR[r.error]?.[locale] ?? r.error); else router.refresh();
      })}>
        {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Rocket className="h-4 w-4" />}{label}
      </Button>
      {err ? <p className="max-w-xs text-right text-xs text-danger" role="alert">{err}</p> : null}
    </div>
  );
}
