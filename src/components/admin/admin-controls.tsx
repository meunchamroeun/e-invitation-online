"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { reviewBillingAction, setUserPlanAction, setUserRoleAction, updatePlanAction, updateTemplateFlagsAction } from "@/features/admin/actions";
import { Badge, Button, Input } from "@/components/ui";

export function AdminUserRow({ user, plans }: { user: { id: string; name: string; email: string; createdAt: string; planCode: string; role: string; deleted: boolean }; plans: string[] }) {
  const router = useRouter();
  const [p, start] = useTransition();
  return (
    <tr className="border-b border-line last:border-0">
      <td className="p-3"><p className="font-medium">{user.name} {user.deleted ? <Badge tone="danger">deleted</Badge> : null}</p><p className="text-xs text-muted">{user.email}</p></td>
      <td className="p-3 text-xs">{user.createdAt}</td>
      <td className="p-3"><select disabled={p} defaultValue={user.planCode} onChange={(e) => start(async () => { await setUserPlanAction(user.id, e.target.value); router.refresh(); })} className="h-8 rounded-lg border border-line-2 px-2 text-xs">{plans.map((x) => <option key={x}>{x}</option>)}</select></td>
      <td className="p-3"><select disabled={p} defaultValue={user.role} onChange={(e) => { if (window.confirm(`Change role to ${e.target.value}?`)) start(async () => { const r = await setUserRoleAction(user.id, e.target.value as "user"); if (!r.ok) alert(r.error); router.refresh(); }); }} className="h-8 rounded-lg border border-line-2 px-2 text-xs"><option value="user">user</option><option value="super_admin">super_admin</option></select></td>
    </tr>
  );
}

export function AdminTemplateRow({ t }: { t: { slug: string; name: string; category: string; version: number; tier: "free" | "premium"; isPublished: boolean; isFeatured: boolean } }) {
  const router = useRouter();
  const [p, start] = useTransition();
  const set = (f: Parameters<typeof updateTemplateFlagsAction>[1]) => start(async () => { await updateTemplateFlagsAction(t.slug, f); router.refresh(); });
  return (
    <tr className="border-b border-line last:border-0">
      <td className="p-3"><a href={`/templates/${t.slug}`} target="_blank" className="font-medium hover:underline">{t.name}</a><p className="font-mono text-xs text-muted">{t.slug}</p></td>
      <td className="p-3">{t.category}</td><td className="p-3">v{t.version}</td>
      <td className="p-3"><select disabled={p} defaultValue={t.tier} onChange={(e) => set({ tier: e.target.value as "free" })} className="h-8 rounded-lg border border-line-2 px-2 text-xs"><option>free</option><option>premium</option></select></td>
      <td className="p-3"><input type="checkbox" disabled={p} defaultChecked={t.isPublished} onChange={(e) => set({ isPublished: e.target.checked })} className="accent-[#B68A45]" /></td>
      <td className="p-3"><input type="checkbox" disabled={p} defaultChecked={t.isFeatured} onChange={(e) => set({ isFeatured: e.target.checked })} className="accent-[#B68A45]" /></td>
    </tr>
  );
}

type PlanForm = { code: string; nameKm: string; nameEn: string; priceMinor: number; isActive: boolean; maxEvents: number; maxGuestsPerEvent: number; maxPhotos: number; premiumTemplates: boolean; seating: boolean; checkin: boolean; telegram: boolean; finance: boolean; branding: boolean };
export function AdminPlanForm({ plan }: { plan: PlanForm }) {
  const router = useRouter();
  const [v, setV] = useState(plan);
  const [msg, setMsg] = useState("");
  const [p, start] = useTransition();
  const num = (k: keyof PlanForm, label: string) => <label className="text-xs text-muted">{label}<Input type="number" value={Number(v[k])} onChange={(e) => setV({ ...v, [k]: Number(e.target.value) })} className="mt-1 h-9 text-sm" /></label>;
  return (
    <form className="rounded-2xl border border-line bg-white p-5" onSubmit={(e) => { e.preventDefault(); const { code, ...rest } = v; start(async () => { const r = await updatePlanAction(code, rest); setMsg(r.ok ? "Saved ✓" : r.error); router.refresh(); }); }}>
      <p className="mb-3 font-mono text-xs text-muted">{v.code}</p>
      <div className="grid grid-cols-2 gap-3">
        <label className="text-xs text-muted">Name (KM)<Input value={v.nameKm} onChange={(e) => setV({ ...v, nameKm: e.target.value })} className="mt-1 h-9 text-sm" /></label>
        <label className="text-xs text-muted">Name (EN)<Input value={v.nameEn} onChange={(e) => setV({ ...v, nameEn: e.target.value })} className="mt-1 h-9 text-sm" /></label>
        {num("priceMinor", "Price (US cents)")}{num("maxEvents", "Max events")}{num("maxGuestsPerEvent", "Max guests / event")}{num("maxPhotos", "Max photos")}
      </div>
      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-xs">
        {(["premiumTemplates", "seating", "checkin", "telegram", "finance", "branding", "isActive"] as const).map((k) => <label key={k} className="flex items-center gap-1.5"><input type="checkbox" checked={v[k]} onChange={(e) => setV({ ...v, [k]: e.target.checked })} className="accent-[#B68A45]" />{k}</label>)}
      </div>
      <div className="mt-4 flex items-center justify-end gap-3"><span className="text-xs text-success">{msg}</span><Button size="sm" disabled={p}>Save</Button></div>
    </form>
  );
}

export function AdminBillingReview({ id }: { id: string }) {
  const router = useRouter();
  const [note, setNote] = useState("");
  const [p, start] = useTransition();
  const go = (d: "approved" | "rejected") => { if (window.confirm(`${d === "approved" ? "Approve and activate plan" : "Reject"}?`)) start(async () => { const r = await reviewBillingAction(id, d, note); if (!r.ok) alert(r.error); router.refresh(); }); };
  return (
    <div className="flex items-center gap-2">
      <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="note" className="h-8 w-28 text-xs" />
      <Button size="sm" variant="gold" disabled={p} onClick={() => go("approved")}>Approve</Button>
      <Button size="sm" variant="outline" disabled={p} onClick={() => go("rejected")}>Reject</Button>
    </div>
  );
}
