"use client";
import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { setLocaleAction } from "@/features/auth/actions";
import { cn } from "@/lib/utils";

export function LocaleSwitch({ locale, className }: { locale: "km" | "en"; className?: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <div className={cn("inline-flex rounded-full border border-line-2 bg-white p-0.5 text-xs font-medium", pending && "opacity-60", className)} role="group" aria-label="Language">
      {(["km", "en"] as const).map((l) => (
        <button
          key={l}
          aria-pressed={locale === l}
          onClick={() => start(async () => { await setLocaleAction(l); router.refresh(); })}
          className={cn("rounded-full px-2.5 py-1 transition-colors", locale === l ? "bg-ink text-white" : "text-muted hover:text-ink")}
        >
          {l === "km" ? "ខ្មែរ" : "EN"}
        </button>
      ))}
    </div>
  );
}
