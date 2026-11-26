"use client";
import { useState } from "react";
import { ChanFlower, KbachDivider } from "@/components/invitation/ornaments";

const HONORIFICS = { km: ["លោក", "លោកស្រី", "កញ្ញា", "ឯកឧត្តម", "លោកជំទាវ"], en: ["Mr.", "Mrs.", "Ms.", "H.E.", "Lok Chumteav"] };

export function PersonalDemo({ locale }: { locale: "km" | "en" }) {
  const [name, setName] = useState(locale === "km" ? "សុខ ដារ៉ា" : "Sok Dara");
  const [hon, setHon] = useState(0);
  const [count, setCount] = useState(2);
  const km = locale === "km";
  return (
    <div className="grid gap-5 rounded-[2rem] border border-line bg-white p-5 shadow-soft sm:grid-cols-[1fr_1.1fr] sm:p-6">
      <div className="space-y-4">
        <p className="text-xs font-medium text-muted">{km ? "សាកល្បងវាយឈ្មោះភ្ញៀវ" : "Try typing a guest name"}</p>
        <div className="flex flex-wrap gap-1.5">
          {HONORIFICS[locale].map((h, i) => (
            <button key={h} onClick={() => setHon(i)} className={`rounded-full border px-2.5 py-1 text-xs ${hon === i ? "border-ink bg-ink text-white" : "border-line-2"}`}>{h}</button>
          ))}
        </div>
        <input value={name} onChange={(e) => setName(e.target.value.slice(0, 40))} aria-label="Guest name" className="h-11 w-full rounded-xl border border-line-2 px-3.5 focus:border-gold focus:outline-none focus:ring-4 focus:ring-gold/15" />
        <label className="flex items-center justify-between text-sm">
          <span className="text-ink-2">{km ? "ចំនួនអនុញ្ញាត" : "Allowed guests"}</span>
          <span className="flex items-center gap-2">
            <button className="h-8 w-8 rounded-full border border-line-2" onClick={() => setCount(Math.max(1, count - 1))} aria-label="-">−</button>
            <span className="num w-4 text-center">{count}</span>
            <button className="h-8 w-8 rounded-full border border-line-2" onClick={() => setCount(Math.min(10, count + 1))} aria-label="+">+</button>
          </span>
        </label>
      </div>
      <div className="relative overflow-hidden rounded-2xl bg-[#5E0F14] px-5 py-8 text-center text-[#F6E7C8]">
        <div className="flex justify-center text-[#D4A64A]"><ChanFlower size={36} /></div>
        <p className="mt-3 text-xs text-[#D9BE8A]">{km ? "សូមគោរពអញ្ជើញ" : "We respectfully invite"}</p>
        <p className="mt-2 min-h-[2.4em] font-[family-name:var(--font-moul)] text-xl leading-[1.8] text-[#F1D592]" lang="km">
          {HONORIFICS[locale][hon]} {name || "…"}
        </p>
        <div className="mt-2 flex justify-center text-[#D4A64A]"><KbachDivider width={160} /></div>
        <p className="mt-3 text-xs text-[#D9BE8A]">{km ? `សម្រាប់ ${count} នាក់` : `For ${count} ${count > 1 ? "guests" : "guest"}`}</p>
        <div className="mt-5 grid grid-cols-2 gap-2 text-xs">
          <span className="rounded-full bg-[#D4A64A] py-2 font-medium text-[#3A0A0D]">{km ? "ចូលរួម" : "Attending"}</span>
          <span className="rounded-full border border-[#D4A64A]/60 py-2">{km ? "មិនអាចចូលរួម" : "Can't attend"}</span>
        </div>
      </div>
    </div>
  );
}
