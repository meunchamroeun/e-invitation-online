"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Menu, X } from "lucide-react";
import { Logo } from "./logo";
import { LocaleSwitch } from "./locale-switch";
import { buttonClass } from "@/components/ui";
import type { Dictionary } from "@/i18n/dictionaries";
import { cn } from "@/lib/utils";

export function SiteHeader({ t, locale, signedIn }: { t: Dictionary["nav"]; locale: "km" | "en"; signedIn: boolean }) {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const on = () => setScrolled(window.scrollY > 8);
    on();
    window.addEventListener("scroll", on, { passive: true });
    return () => window.removeEventListener("scroll", on);
  }, []);
  const links = [
    { href: "/#features", label: t.features },
    { href: "/templates", label: t.templates },
    { href: "/#how", label: t.how },
    { href: "/pricing", label: t.pricing },
    { href: "/#faq", label: t.faq },
  ];
  return (
    <header className={cn("sticky top-0 z-40 transition-[background,border,backdrop-filter]", scrolled ? "border-b border-line bg-paper/85 backdrop-blur-md" : "border-b border-transparent")}>
      <div className="container-x flex h-16 items-center gap-6">
        <Link href="/" aria-label="Home"><Logo /></Link>
        <nav className="hidden flex-1 items-center gap-1 lg:flex">
          {links.map((l) => (
            <Link key={l.href} href={l.href} className="rounded-full px-3 py-2 text-[14px] text-ink-2 transition-colors hover:bg-black/[.04] hover:text-ink">{l.label}</Link>
          ))}
        </nav>
        <div className="ml-auto hidden items-center gap-3 lg:flex">
          <LocaleSwitch locale={locale} />
          {signedIn ? (
            <Link href="/dashboard" className={buttonClass("primary", "md")}>{t.dashboard}</Link>
          ) : (
            <>
              <Link href="/login" className="px-2 text-[14px] font-medium text-ink-2 hover:text-ink">{t.login}</Link>
              <Link href="/register" className={buttonClass("primary", "md")}>{t.start}</Link>
            </>
          )}
        </div>
        <div className="ml-auto flex items-center gap-2 lg:hidden">
          <Link href={signedIn ? "/dashboard" : "/register"} className={buttonClass("primary", "sm")}>{signedIn ? t.dashboard : t.start}</Link>
          <button onClick={() => setOpen(!open)} className="rounded-full p-2 hover:bg-black/5" aria-expanded={open} aria-label={t.menu}>
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>
      {open ? (
        <div className="border-t border-line bg-paper px-5 pb-6 pt-2 lg:hidden">
          <nav className="flex flex-col">
            {links.map((l) => (
              <Link key={l.href} href={l.href} onClick={() => setOpen(false)} className="border-b border-line py-3.5 text-[15px]">{l.label}</Link>
            ))}
          </nav>
          <div className="mt-5 flex items-center justify-between">
            <LocaleSwitch locale={locale} />
            {!signedIn ? <Link href="/login" className="text-sm font-medium">{t.login}</Link> : null}
          </div>
        </div>
      ) : null}
    </header>
  );
}
