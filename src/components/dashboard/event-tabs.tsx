"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "motion/react";
import { cn } from "@/lib/utils";

export function EventTabs({ id, labels, allowed }: { id: string; labels: Record<string, string>; allowed: string[] }) {
  const path = usePathname();
  const base = `/dashboard/events/${id}`;
  const tabs = ["overview", "builder", "templates", "guests", "rsvp", "seating", "checkin", "gifts", "budget", "analytics", "settings"].filter((k) => allowed.includes(k));
  return (
    <nav className="-mx-4 mb-6 overflow-x-auto px-4 [scrollbar-width:none] sm:mx-0 sm:px-0" aria-label="Event">
      <ul className="flex w-full items-center gap-1 rounded-2xl bg-[#EAE5DC] p-1">
        {tabs.map((k) => {
          const href = k === "overview" ? base : `${base}/${k}`;
          const active = k === "overview" ? path === base : path.startsWith(href);
          return (
            <li key={k} className="shrink-0 lg:flex-1">
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "relative z-10 flex items-center justify-center whitespace-nowrap rounded-xl px-3 py-2 text-sm transition-colors",
                  active ? "font-medium text-ink" : "text-ink-2 hover:text-ink",
                )}
              >
                {active ? (
                  <motion.span
                    layoutId="event-tab-pill"
                    transition={{ type: "spring", stiffness: 420, damping: 32 }}
                    className="absolute inset-0 -z-10 rounded-xl bg-white shadow-sm ring-1 ring-black/5"
                  />
                ) : null}
                {labels[k]}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
