"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

export function EventTabs({ id, labels, allowed }: { id: string; labels: Record<string, string>; allowed: string[] }) {
  const path = usePathname();
  const base = `/dashboard/events/${id}`;
  const tabs = ["overview", "builder", "templates", "guests", "rsvp", "seating", "checkin", "gifts", "budget", "analytics", "settings"].filter((k) => allowed.includes(k));
  return (
    <nav className="-mx-4 mb-6 overflow-x-auto border-b border-line px-4 [scrollbar-width:none] sm:mx-0 sm:px-0" aria-label="Event">
      <ul className="flex gap-1">
        {tabs.map((k) => {
          const href = k === "overview" ? base : `${base}/${k}`;
          const active = k === "overview" ? path === base : path.startsWith(href);
          return (
            <li key={k}>
              <Link href={href} aria-current={active ? "page" : undefined} className={cn("relative block whitespace-nowrap px-3 pb-3 pt-1 text-sm transition-colors", active ? "font-medium text-ink" : "text-muted hover:text-ink")}>
                {labels[k]}
                {active ? <span className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-gold" /> : null}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
