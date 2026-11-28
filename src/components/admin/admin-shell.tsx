"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "motion/react";
import { ArrowUpRight, CalendarDays, CreditCard, History, LayoutGrid, Layers3, Music, PanelTop, ShieldCheck, UsersRound } from "lucide-react";
import { Logo } from "@/components/layout/logo";
import { cn } from "@/lib/utils";

const navigation = [
  { href: "/admin", label: "Overview", icon: LayoutGrid },
  { href: "/admin/users", label: "Users", icon: UsersRound },
  { href: "/admin/events", label: "Events", icon: CalendarDays },
  { href: "/admin/templates", label: "Templates", icon: PanelTop },
  { href: "/admin/music", label: "Music", icon: Music },
  { href: "/admin/plans", label: "Plans", icon: Layers3 },
  { href: "/admin/billing", label: "Billing", icon: CreditCard },
  { href: "/admin/audit-logs", label: "Audit logs", icon: History },
];

export function AdminShell({ name, email, children }: { name: string; email: string; children: ReactNode }) {
  const pathname = usePathname();
  const selected = navigation.find(({ href }) => pathname === href) ?? navigation[0];

  return (
    <div lang="en" className="min-h-svh bg-[#f7f5ef] font-sans lg:grid lg:grid-cols-[232px_minmax(0,1fr)]">
      <a href="#admin-main" className="sr-only z-50 focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:rounded-lg focus:bg-white focus:px-4 focus:py-2">
        Skip to content
      </a>
      <aside className="flex min-w-0 flex-col bg-[#241c19] text-[#fffaf4] lg:sticky lg:top-0 lg:h-svh">
        <div className="flex items-center justify-between gap-2 px-4 py-3.5 sm:px-6 lg:px-6 lg:pt-7 lg:pb-5">
          <Link href="/admin" aria-label="Theab Online Admin" className="rounded-md [&_.text-muted]:text-[#c9b6a3]">
            <Logo />
          </Link>
          <Link href="/dashboard" className="inline-flex items-center gap-1.5 rounded-md px-2 py-2 text-xs text-[#e5d6c7] hover:bg-white/10 lg:hidden">
            Dashboard <ArrowUpRight aria-hidden="true" size={13} />
          </Link>
        </div>
        <nav aria-label="Admin navigation" className="flex gap-1 overflow-x-auto px-3 pb-3 sm:px-5 lg:mt-4 lg:flex-col lg:overflow-visible lg:px-3.5">
          {navigation.map(({ href, label, icon: Icon }) => {
            const active = selected.href === href;
            return (
              <Link
                key={href}
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "relative z-10 flex min-h-10 shrink-0 items-center gap-2 rounded-xl px-3 text-[13px] font-medium transition-colors lg:gap-3",
                  active ? "text-[#321e14]" : "text-[#e2d6c9] hover:bg-white/10 hover:text-white",
                )}
              >
                {active ? (
                  <motion.span
                    layoutId="admin-nav-pill"
                    transition={{ type: "spring", stiffness: 420, damping: 32 }}
                    className="absolute inset-0 -z-10 rounded-xl bg-[#ead7b6] shadow-sm"
                  />
                ) : null}
                <Icon size={16} aria-hidden="true" />{label}
              </Link>
            );
          })}
        </nav>
        <div className="mt-auto hidden p-3.5 lg:block">
          <Link href="/dashboard" className="flex min-h-11 items-center justify-between gap-2 rounded-lg border border-white/15 px-3 text-sm text-[#e2d6c9] transition-colors hover:bg-white/10 hover:text-white">
            Back to dashboard <ArrowUpRight size={15} aria-hidden="true" />
          </Link>
        </div>
      </aside>
      <div className="min-w-0">
        <header className="sticky top-0 z-20 border-b border-[#e7e1d5] bg-[#fffdf8]/90 backdrop-blur-md">
          <div className="mx-auto flex min-h-14 max-w-[1600px] items-center justify-between gap-3 px-4 sm:px-7 lg:min-h-16 lg:px-9">
            <div className="flex items-center gap-2 text-[13px]">
              <ShieldCheck aria-hidden="true" size={17} className="shrink-0 text-[#86622f]" />
              <span className="font-semibold text-ink">Administration</span>
              <span aria-hidden="true" className="hidden text-muted sm:inline">/</span>
              <span className="hidden text-ink-2 sm:inline">{selected.label}</span>
            </div>
            <div className="flex min-w-0 items-center gap-2.5">
              <span aria-hidden="true" className="grid size-8 shrink-0 place-items-center rounded-full bg-gold-soft text-[13px] font-semibold text-[#664621]">{Array.from(name.trim())[0]?.toLocaleUpperCase() || "A"}</span>
              <div className="min-w-0 leading-tight" title={email}>
                <p className="max-w-[34vw] truncate text-xs font-semibold sm:max-w-48" dir="auto">{name}</p>
                <p className="mt-0.5 text-[11px] text-muted">Super admin</p>
              </div>
            </div>
          </div>
        </header>
        <main id="admin-main" className="mx-auto w-full max-w-[1600px] px-4 py-6 sm:px-7 sm:py-8 lg:px-9 lg:py-9">
          <motion.div
            key={pathname}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
          >
            {children}
          </motion.div>
        </main>
      </div>
    </div>
  );
}
