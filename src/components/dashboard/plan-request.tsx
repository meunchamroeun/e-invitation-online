"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { requestPlanAction } from "@/features/account/actions";
import { Button, Input } from "@/components/ui";

export function PlanRequest({ planCode, locale }: { planCode: string; locale: "km" | "en" }) {
  const L = (km: string, en: string) => (locale === "km" ? km : en);
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [ref, setRef] = useState("");
  const [err, setErr] = useState("");
  const [pending, start] = useTransition();
  if (!open) return <Button variant="outline" size="sm" className="mt-4" onClick={() => setOpen(true)}>{L("ដំឡើង", "Upgrade")}</Button>;
  return (
    <form className="mt-4 space-y-2" onSubmit={(e) => { e.preventDefault(); start(async () => { const r = await requestPlanAction(planCode, ref); if (r.ok) { setOpen(false); router.refresh(); } else setErr(r.error === "duplicate_reference" ? L("លេខយោងនេះត្រូវបានប្រើរួច", "Reference already used") : L("សូមបញ្ចូលលេខយោងត្រឹមត្រូវ", "Enter a valid reference")); }); }}>
      <Input value={ref} onChange={(e) => setRef(e.target.value)} placeholder={L("លេខយោងប្រតិបត្តិការ ABA", "ABA transaction reference")} className="h-9 text-sm" />
      {err ? <p className="text-xs text-danger">{err}</p> : null}
      <Button size="sm" className="w-full" disabled={pending}>{L("ដាក់ស្នើ", "Submit for review")}</Button>
    </form>
  );
}
