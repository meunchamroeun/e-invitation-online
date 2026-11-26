import { Plus } from "lucide-react";
import type { Dictionary } from "@/i18n/dictionaries";

export function FaqList({ t }: { t: Dictionary["faq"] }) {
  const items = [1, 2, 3, 4, 5, 6].map((i) => [t[`q${i}` as keyof typeof t], t[`a${i}` as keyof typeof t]]);
  return (
    <div className="divide-y divide-line border-y border-line">
      {items.map(([q, a]) => (
        <details key={q} className="group py-5 [&_summary::-webkit-details-marker]:hidden">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-[16px] font-medium">
            {q}
            <Plus className="h-4 w-4 shrink-0 text-gold transition-transform group-open:rotate-45" />
          </summary>
          <p className="mt-3 max-w-2xl text-[15px] leading-7 text-ink-2">{a}</p>
        </details>
      ))}
    </div>
  );
}
