import Link from "next/link";
import { ArrowRight, BellRing, Check, Gift, Languages, Link2, QrCode, Table2, Users, MousePointerClick } from "lucide-react";
import { getI18n } from "@/i18n/server";
import { buttonClass } from "@/components/ui";
import { FluidThumb, TemplateThumb } from "@/components/marketing/template-thumb";
import { StaticDevice } from "@/components/ui/device-frame";
import { getTemplate } from "@/features/templates/registry";
import { PersonalDemo } from "@/components/marketing/personal-demo";
import { ChanFlower, KbachCorner, KbachDivider, Lotus, PrasatSilhouette, WeaveBand } from "@/components/invitation/ornaments";
import { EVENT_TYPES, TEMPLATES } from "@/features/templates/registry";
import { toKhmerDigits } from "@/i18n/format";
import { FaqList } from "@/components/marketing/faq";
import { PricingCards } from "@/components/marketing/pricing-cards";

export default async function HomePage() {
  const { t, locale } = await getI18n();
  const h = t.home;
  const featured = ["royal-khmer", "slek-rith", "angkor-twilight", "ivory-champagne", "sampot-silk", "lotus-blush"];
  const n = (x: number) => (locale === "km" ? toKhmerDigits(x) : String(x));

  return (
    <>
      {/* HERO */}
      <section className="relative overflow-hidden">
        <div className="paper-grain absolute inset-0" />
        <div className="container-x relative grid items-center gap-12 pb-20 pt-10 lg:grid-cols-[1.05fr_1fr] lg:pb-28 lg:pt-16">
          <div className="animate-fade-up">
            <p className="eyebrow flex items-center gap-2"><ChanFlower size={14} className="text-gold" />{t.hero.eyebrow}</p>
            <h1 className="mt-5 text-[2.35rem] font-bold leading-[1.45] tracking-tight sm:text-[3.4rem] sm:leading-[1.35]">
              {t.hero.title1}
              <br />
              <span className="relative inline-block font-[family-name:var(--font-moul)] font-normal text-maroon" style={{ fontSize: "0.82em" }}>
                {t.hero.title2}
                <svg aria-hidden viewBox="0 0 300 12" className="absolute -bottom-1 left-0 w-full text-gold" preserveAspectRatio="none"><path d="M2 8 C 80 2, 220 2, 298 8" stroke="currentColor" strokeWidth="2.5" fill="none" strokeLinecap="round" /></svg>
              </span>
              <br />
              <span className="text-ink-2">{t.hero.title3}</span>
            </h1>
            <p className="mt-3 text-sm italic text-muted" lang={locale === "km" ? "en" : "km"}>{t.hero.en}</p>
            <p className="mt-6 max-w-xl text-[16px] leading-8 text-ink-2">{t.hero.body}</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/register" className={buttonClass("primary", "lg")}>{t.hero.cta}<ArrowRight className="h-4 w-4" /></Link>
              <Link href="/templates" className={buttonClass("outline", "lg")}>{t.hero.cta2}</Link>
            </div>
            <ul className="mt-8 flex flex-col gap-2.5 text-sm text-ink-2 sm:flex-row sm:flex-wrap sm:gap-x-6">
              {[t.hero.trust1, t.hero.trust2, t.hero.trust3].map((x) => (
                <li key={x} className="flex items-center gap-2"><Check className="h-4 w-4 text-success" />{x}</li>
              ))}
            </ul>
          </div>

          <div className="relative mx-auto h-[520px] w-full max-w-[520px] sm:h-[600px]">
            <div className="absolute inset-x-6 bottom-0 top-16 rounded-[3rem] bg-gradient-to-b from-[#F3EAD9] to-[#EADCC2]" />
            <div className="absolute inset-x-6 bottom-0 flex justify-center text-[#D9C49C]"><PrasatSilhouette width={460} /></div>
            <div className="absolute left-0 top-24 hidden rotate-[-7deg] animate-float sm:block" style={{ ["--r" as string]: "-7deg", animationDelay: "-2s" }}>
              <Phone slug="slek-rith" scale={0.4} finish="glacier"><TemplateThumb slug="slek-rith" locale={locale} width={440} /></Phone>
            </div>
            <div className="absolute right-0 top-28 hidden rotate-[7deg] animate-float sm:block" style={{ ["--r" as string]: "7deg", animationDelay: "-4s" }}>
              <Phone slug="angkor-twilight" scale={0.4} finish="black"><TemplateThumb slug="angkor-twilight" locale={locale} width={440} /></Phone>
            </div>
            <div className="absolute left-1/2 top-0 z-10 -translate-x-1/2">
              <Phone slug="royal-khmer" scale={0.55} finish="burgundy"><TemplateThumb slug="royal-khmer" locale={locale} width={440} /></Phone>
            </div>
            <div className="absolute bottom-10 left-2 z-20 flex items-center gap-3 rounded-2xl border border-line bg-white/95 px-4 py-3 shadow-lift backdrop-blur sm:left-6">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-success/10 text-success"><Check className="h-4 w-4" /></span>
              <div className="text-xs">
                <p className="font-semibold">{locale === "km" ? "RSVP ថ្មី · ឧទាហរណ៍" : "New RSVP · example"}</p>
                <p className="text-muted">{locale === "km" ? "លោក សុខា — ចូលរួម ២ នាក់" : "Mr. Sokha — attending, 2 guests"}</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CATEGORIES strip */}
      <section className="border-y border-line bg-white">
        <div className="container-x flex items-center gap-2 overflow-x-auto py-4 [scrollbar-width:none]">
          <span className="mr-2 shrink-0 text-xs font-medium text-muted">{h.categoriesTitle}</span>
          {EVENT_TYPES.filter((e) => e.value !== "custom").map((e) => (
            <Link key={e.value} href={`/templates?type=${e.value}`} className="shrink-0 rounded-full border border-line px-3.5 py-1.5 text-sm text-ink-2 hover:border-gold hover:text-gold-2">
              {locale === "km" ? e.label.km : e.label.en}
            </Link>
          ))}
        </div>
      </section>

      {/* SHOWCASE */}
      <section className="container-x py-20 sm:py-28">
        <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
          <div className="max-w-2xl">
            <p className="eyebrow">{t.nav.templates} · {n(TEMPLATES.length)}</p>
            <h2 className="mt-3 text-3xl font-bold leading-[1.5] sm:text-4xl">{h.showcaseTitle}</h2>
            <p className="mt-3 text-ink-2">{h.showcaseBody}</p>
          </div>
          <Link href="/templates" className={buttonClass("outline", "md")}>{h.viewAll}<ArrowRight className="h-4 w-4" /></Link>
        </div>
        <div className="mt-10 grid grid-cols-2 gap-4 sm:gap-6 md:grid-cols-3 lg:grid-cols-6">
          {featured.map((slug, i) => {
            const tpl = TEMPLATES.find((x) => x.slug === slug)!;
            return (
              <Link key={slug} href={`/templates/${slug}`} className={`group ${i % 2 ? "lg:translate-y-10" : ""}`}>
                <div className="overflow-hidden rounded-[1.4rem] border border-line bg-white p-1.5 shadow-soft transition-transform duration-500 group-hover:-translate-y-1 group-hover:shadow-lift">
                  <div className="overflow-hidden rounded-[1.05rem]"><FluidThumb slug={slug} locale={locale} /></div>
                </div>
                <p className="mt-3 text-sm font-semibold">{locale === "km" ? tpl.name.km : tpl.name.en}</p>
                <p className="text-xs text-muted">{locale === "km" ? tpl.name.en : tpl.name.km}</p>
              </Link>
            );
          })}
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section id="how" className="relative overflow-hidden bg-[#F3EEE5] py-20 sm:py-28">
        <div className="absolute -right-10 -top-10 text-gold/20"><KbachCorner size={260} /></div>
        <div className="container-x relative">
          <h2 className="max-w-2xl text-3xl font-bold leading-[1.5] sm:text-4xl">{h.stepsTitle}</h2>
          <ol className="mt-12 grid gap-8 md:grid-cols-3 md:gap-6">
            {[[h.step1, h.step1b], [h.step2, h.step2b], [h.step3, h.step3b]].map(([title, body], i) => (
              <li key={i} className="relative border-t border-ink/15 pt-6">
                <span className="font-[family-name:var(--font-moul)] text-5xl leading-none text-gold">{toKhmerDigits(i + 1)}</span>
                <h3 className="mt-5 text-lg font-semibold">{title}</h3>
                <p className="mt-2 text-[15px] leading-7 text-ink-2">{body}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* PERSONAL DEMO */}
      <section className="container-x grid items-center gap-12 py-20 sm:py-28 lg:grid-cols-2">
        <div>
          <p className="eyebrow">{h.f1}</p>
          <h2 className="mt-3 text-3xl font-bold leading-[1.5] sm:text-4xl">{h.personalTitle}</h2>
          <p className="mt-4 max-w-lg text-ink-2">{h.personalBody}</p>
          <div className="mt-6 inline-flex items-center gap-2 rounded-xl border border-line bg-white px-3 py-2 font-mono text-[13px] text-ink-2">
            <Link2 className="h-4 w-4 text-gold" /> theab.online/i/<span className="text-gold-2">x7Kp2…QmW</span>
          </div>
        </div>
        <PersonalDemo locale={locale} />
      </section>

      {/* FEATURES */}
      <section id="features" className="bg-[#1B1512] py-20 text-[#EFE7DA] sm:py-28">
        <div className="container-x">
          <div className="flex justify-center text-gold"><KbachDivider width={240} /></div>
          <h2 className="mx-auto mt-6 max-w-3xl text-center text-3xl font-bold leading-[1.5] text-white sm:text-4xl">{h.featuresTitle}</h2>
          <div className="mt-14 grid gap-px overflow-hidden rounded-3xl border border-white/10 bg-white/10 sm:grid-cols-2 lg:grid-cols-4">
            {[
              [MousePointerClick, h.f1, h.f1b], [Check, h.f2, h.f2b], [Users, h.f3, h.f3b], [Table2, h.f4, h.f4b],
              [QrCode, h.f5, h.f5b], [Gift, h.f6, h.f6b], [BellRing, h.f7, h.f7b], [Languages, h.f8, h.f8b],
            ].map(([Icon, title, body], i) => {
              const I = Icon as typeof Check;
              return (
                <div key={i} className="bg-[#1B1512] p-6 transition-colors hover:bg-[#231b17]">
                  <I className="h-5 w-5 text-gold" />
                  <h3 className="mt-4 font-semibold text-white">{title as string}</h3>
                  <p className="mt-1.5 text-sm leading-7 text-[#bfb5a6]">{body as string}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* PRICING */}
      <section className="container-x py-20 sm:py-28">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold leading-[1.5] sm:text-4xl">{t.pricing.title}</h2>
          <p className="mt-3 text-ink-2">{t.pricing.subtitle}</p>
        </div>
        <div className="mt-12"><PricingCards /></div>
      </section>

      {/* FAQ */}
      <section id="faq" className="container-x grid gap-10 pb-10 lg:grid-cols-[1fr_1.6fr]">
        <div>
          <div className="text-gold"><Lotus size={48} /></div>
          <h2 className="mt-4 text-3xl font-bold leading-[1.5]">{t.faq.title}</h2>
        </div>
        <FaqList t={t.faq} />
      </section>

      {/* FINAL CTA */}
      <section className="container-x pt-16">
        <div className="relative overflow-hidden rounded-[2rem] bg-maroon px-6 py-16 text-center text-[#F6E7C8] sm:px-12 sm:py-20">
          <div className="absolute inset-x-0 top-0 text-[#D4A64A]/60"><WeaveBand height={14} /></div>
          <div className="absolute left-4 top-6 text-[#D4A64A]/50"><KbachCorner size={90} /></div>
          <div className="absolute bottom-4 right-4 rotate-180 text-[#D4A64A]/50"><KbachCorner size={90} /></div>
          <h2 className="relative font-[family-name:var(--font-moul)] text-2xl leading-[1.8] text-[#F1D592] sm:text-4xl">{h.finalTitle}</h2>
          <p className="relative mx-auto mt-4 max-w-lg text-[#F6E7C8]/80">{h.finalBody}</p>
          <Link href="/register" className="relative mt-8 inline-flex h-12 items-center gap-2 rounded-full bg-[#F1D592] px-7 font-semibold text-[#3A0A0D] hover:bg-white">
            {t.hero.cta}<ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>
    </>
  );
}

function Phone({ children, slug, scale, finish }: { children: React.ReactNode; slug: string; scale: number; finish: "black" | "silver" | "glacier" | "burgundy" }) {
  const bg = getTemplate(slug)?.palette.bg ?? "#fff";
  const dark = parseInt(bg.slice(1, 3), 16) * 0.3 + parseInt(bg.slice(3, 5), 16) * 0.59 + parseInt(bg.slice(5, 7), 16) * 0.11 < 128;
  return <StaticDevice scale={scale} finish={finish} statusBg={bg} darkStatus={dark}>{children}</StaticDevice>;
}
