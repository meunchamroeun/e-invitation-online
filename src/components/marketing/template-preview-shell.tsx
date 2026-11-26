"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowLeft, Monitor, RotateCcw, Smartphone, Tablet } from "lucide-react";
import type { TemplateDef } from "@/features/templates/registry";
import type { InvitationDoc } from "@/features/invitations/doc";
import type { Dictionary } from "@/i18n/dictionaries";
import { cn } from "@/lib/utils";
import { FitDevice, FinishPicker, DEVICE, type Finish } from "@/components/ui/device-frame";
import { isDark } from "@/components/invitation/theme";

type Device = "mobile" | "tablet" | "desktop";
const SIZES: Record<Device, { w: number; h: number }> = { mobile: { w: DEVICE.screenW, h: DEVICE.screenH }, tablet: { w: 768, h: 960 }, desktop: { w: 1280, h: 800 } };

export function TemplatePreviewShell({ template, locale, dict }: { template: TemplateDef; doc: InvitationDoc; event: unknown; locale: "km" | "en"; dict: Dictionary["templates"] }) {
  const [device, setDevice] = useState<Device>("mobile");
  const [lang, setLang] = useState<"km" | "en">(locale);
  const [nonce, setNonce] = useState(0);
  const [finish, setFinish] = useState<Finish>(template.palette.primary.toLowerCase().startsWith("#7") || template.color === "red" ? "burgundy" : "black");
  const size = SIZES[device];
  const name = locale === "km" ? template.name.km : template.name.en;
  return (
    <div className="flex min-h-[100svh] flex-col bg-[#EFECE6]">
      <div className="sticky top-0 z-20 flex flex-wrap items-center gap-3 border-b border-line bg-paper/90 px-4 py-3 backdrop-blur">
        <Link href="/templates" className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-ink"><ArrowLeft className="h-4 w-4" />{dict.title}</Link>
        <div className="mx-2 hidden h-5 w-px bg-line sm:block" />
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold">{name}</p>
          <p className="truncate text-xs text-muted">{template.tier === "premium" ? dict.premium : dict.free} · {dict.placeholderNote}</p>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <div className="hidden items-center rounded-full border border-line bg-white p-1 md:flex">
            {([["mobile", Smartphone], ["tablet", Tablet], ["desktop", Monitor]] as const).map(([d, Icon]) => (
              <button key={d} onClick={() => setDevice(d)} aria-pressed={device === d} className={cn("rounded-full p-2 text-muted", device === d && "bg-ink text-white")} title={dict[d]}>
                <Icon className="h-4 w-4" />
              </button>
            ))}
          </div>
          {device === "mobile" ? <div className="hidden items-center gap-2 rounded-full border border-line bg-white px-2.5 py-1.5 lg:flex"><span className="text-[11px] text-muted">{DEVICE.name}</span><FinishPicker value={finish} onChange={setFinish} /></div> : null}
          <button onClick={() => setLang(lang === "km" ? "en" : "km")} className="rounded-full border border-line bg-white px-3 py-2 text-xs font-medium">{lang === "km" ? "EN" : "ខ្មែរ"}</button>
          <button onClick={() => setNonce((n) => n + 1)} className="rounded-full border border-line bg-white p-2" title="Replay"><RotateCcw className="h-4 w-4" /></button>
          <Link href={`/dashboard/events/new?template=${template.slug}`} className="rounded-full bg-ink px-4 py-2 text-sm font-medium text-white hover:bg-black">{dict.use}</Link>
        </div>
      </div>
      {device === "mobile" ? (
        <div className="relative flex-1" style={{ minHeight: "calc(100svh - 70px)" }}>
          <div className="absolute inset-3 md:inset-6"><FitDevice finish={finish} statusBg={template.palette.bg} darkStatus={isDark(template.palette.bg)}>
            <iframe key={`${lang}-${nonce}`} title={name} src={`/t/${template.slug}?lang=${lang}`} className="h-full w-full border-0" />
          </FitDevice></div>
        </div>
      ) : (
        <div className="flex flex-1 items-start justify-center overflow-auto p-4 md:p-8">
          <div className="overflow-hidden rounded-xl border border-line bg-white shadow-[0_40px_80px_-40px_rgba(0,0,0,0.45)] transition-all duration-500" style={{ width: `min(100%, ${size.w}px)`, height: `min(78svh, ${size.h}px)` }}>
            <iframe key={`${lang}-${nonce}`} title={name} src={`/t/${template.slug}?lang=${lang}`} className="h-full w-full" />
          </div>
        </div>
      )}
    </div>
  );
}
