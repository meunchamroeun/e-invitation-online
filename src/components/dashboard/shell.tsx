"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Bell, CalendarHeart, CreditCard, LayoutGrid, LayoutTemplate, LogOut, Menu, Settings, Shield, X } from "lucide-react";
import { Logo } from "@/components/layout/logo";
import { LocaleSwitch } from "@/components/layout/locale-switch";
import { logoutAction } from "@/features/auth/actions";
import type { Dictionary } from "@/i18n/dictionaries";
import { cn } from "@/lib/utils";

export function DashboardShell({ t, nav, locale, user, unread, children }: {
  t: Dictionary["dash"]; nav: Dictionary["nav"]; locale: "km" | "en"; user: { name: string; email: string; role: string; planCode: string }; unread: number; children: React.ReactNode;
}) {
  const path = usePathname();
  const [open, setOpen] = useState(false);
  const items = [
    { href: "/dashboard", label: t.overview, icon: LayoutGrid, exact: true },
    { href: "/dashboard/events", label: t.events, icon: CalendarHeart },
    { href: "/templates", label: t.templates, icon: LayoutTemplate },
    { href: "/dashboard/notifications", label: t.notifications, icon: Bell, badge: unread },
    { href: "/dashboard/billing", label: t.billing, icon: CreditCard },
    { href: "/dashboard/profile", label: t.settings, icon: Settings },
    ...(user.role === "super_admin" ? [{ href: "/admin", label: t.admin, icon: Shield }] : []),
  ];
  const isActive = (href: string, exact?: boolean) => (exact ? path === href : path.startsWith(href));

  const NavList = (
    <nav className="flex flex-col gap-0.5">
      {items.map((it) => (
        <Link key={it.href} href={it.href} onClick={() => setOpen(false)}
          className={cn("flex items-center gap-3 rounded-xl px-3 py-2.5 text-[14px] transition-colors", isActive(it.href, it.exact) ? "bg-white font-medium text-ink shadow-soft" : "text-ink-2 hover:bg-black/[.04]")}>
          <it.icon className={cn("h-[18px] w-[18px]", isActive(it.href, it.exact) ? "text-gold" : "text-muted")} />
          <span className="flex-1">{it.label}</span>
          {"badge" in it && it.badge ? <span className="rounded-full bg-gold px-1.5 text-[11px] font-semibold text-white">{it.badge}</span> : null}
        </Link>
      ))}
    </nav>
  );

  const UserBox = (
    <div className="rounded-2xl border border-line bg-white p-3">
      <div className="flex items-center gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gold-soft text-sm font-semibold text-gold-2">{user.name.slice(0, 1).toUpperCase()}</span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">{user.name}</p>
          <p className="truncate text-xs text-muted">{user.email}</p>
        </div>
        <form action={logoutAction}><button className="rounded-full p-2 text-muted hover:bg-black/5 hover:text-ink" title={nav.logout} aria-label={nav.logout}><LogOut className="h-4 w-4" /></button></form>
      </div>
      <div className="mt-3 flex items-center justify-between">
        <span className="rounded-full bg-black/[.05] px-2 py-0.5 text-[11px] font-medium uppercase tracking-wide text-ink-2">{user.planCode}</span>
        <LocaleSwitch locale={locale} />
      </div>
    </div>
  );

  return (
    <div className="min-h-[100svh] bg-[#F5F3EF]">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-[248px] flex-col gap-6 border-r border-line bg-[#F5F3EF] px-3 py-5 lg:flex">
        <Link href="/dashboard" className="px-2"><Logo /></Link>
        <div className="flex-1">{NavList}</div>
        {UserBox}
      </aside>
      <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-line bg-[#F5F3EF]/90 px-4 backdrop-blur lg:hidden">
        <button onClick={() => setOpen(true)} aria-label={nav.menu} className="rounded-full p-2 hover:bg-black/5"><Menu className="h-5 w-5" /></button>
        <Link href="/dashboard"><Logo compact /></Link>
        <Link href="/dashboard/notifications" className="relative ml-auto rounded-full p-2 hover:bg-black/5" aria-label={t.notifications}>
          <Bell className="h-5 w-5" />{unread ? <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-gold" /> : null}
        </Link>
      </header>
      {open ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/30" onClick={() => setOpen(false)} />
          <div className="absolute inset-y-0 left-0 flex w-[280px] flex-col gap-6 bg-[#F5F3EF] px-3 py-5 shadow-2xl">
            <div className="flex items-center justify-between px-2"><Logo /><button onClick={() => setOpen(false)} className="rounded-full p-2" aria-label="Close"><X className="h-5 w-5" /></button></div>
            <div className="flex-1">{NavList}</div>
            {UserBox}
          </div>
        </div>
      ) : null}
      <div className="lg:pl-[248px]">
        <main className="mx-auto w-full max-w-[1480px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">{children}</main>
      </div>
    </div>
  );
}
