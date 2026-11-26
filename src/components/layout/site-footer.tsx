import Link from "next/link";
import { Logo } from "./logo";
import type { Dictionary } from "@/i18n/dictionaries";
import { WeaveBand } from "@/components/invitation/ornaments";

export function SiteFooter({ t, nav, brand }: { t: Dictionary["footer"]; nav: Dictionary["nav"]; brand: Dictionary["brand"] }) {
  return (
    <footer className="mt-24 bg-[#1B1512] text-[#E9E1D3]">
      <div className="text-[#B68A45]/70"><WeaveBand height={14} /></div>
      <div className="container-x grid gap-10 py-14 md:grid-cols-[1.4fr_1fr_1fr]">
        <div>
          <div className="[&_span.text-muted]:text-[#9c9286]"><Logo /></div>
          <p className="mt-4 max-w-xs text-sm text-[#bfb5a6]">{brand.tagline}</p>
        </div>
        <div>
          <p className="mb-3 text-sm font-semibold text-white">{t.product}</p>
          <ul className="space-y-2 text-sm text-[#bfb5a6]">
            <li><Link href="/templates" className="hover:text-white">{nav.templates}</Link></li>
            <li><Link href="/pricing" className="hover:text-white">{nav.pricing}</Link></li>
            <li><Link href="/#faq" className="hover:text-white">{nav.faq}</Link></li>
          </ul>
        </div>
        <div>
          <p className="mb-3 text-sm font-semibold text-white">{t.company}</p>
          <ul className="space-y-2 text-sm text-[#bfb5a6]">
            <li><Link href="/about" className="hover:text-white">{t.about}</Link></li>
            <li><Link href="/contact" className="hover:text-white">{t.contact}</Link></li>
            <li><Link href="/privacy" className="hover:text-white">{t.privacy}</Link></li>
          </ul>
        </div>
      </div>
      <div className="border-t border-white/10">
        <div className="container-x flex flex-col gap-2 py-5 text-xs text-[#9c9286] sm:flex-row sm:justify-between">
          <span>© {new Date().getFullYear()} ធៀបអនឡាញ · {t.rights}</span>
          <span>{t.madeIn}</span>
        </div>
      </div>
    </footer>
  );
}
