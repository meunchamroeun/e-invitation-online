"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Download, Gift, Loader2, Pencil, Plus, Search, Trash2, Wallet } from "lucide-react";
import { deleteExpenseAction, deleteGiftAction, saveExpenseAction, saveGiftAction } from "@/features/finance/actions";
import { formatMoney, sumByCurrency, type Currency } from "@/lib/money";
import { Badge, Button, EmptyState, Field, Input, Select, Stat, Textarea, buttonClass } from "@/components/ui";
import { Dialog } from "@/components/ui/dialog";
import { HBars } from "./charts";

type GiftRow = { id: string; kind: "cash" | "item"; amountMinor: number; currency: Currency; guestId: string; description: string; receivedOn: string; notes: string };
const toInput = (minor: number, c: Currency) => (c === "KHR" ? String(minor) : `${Math.floor(minor / 100)}.${String(minor % 100).padStart(2, "0")}`);
const both = (t: Record<Currency, number>) => [t.USD ? formatMoney(t.USD, "USD") : null, t.KHR ? formatMoney(t.KHR, "KHR") : null].filter(Boolean).join(" + ") || "$0.00";

export function GiftLedger({ eventId, locale, canEdit, guests, gifts }: { eventId: string; locale: "km" | "en"; canEdit: boolean; guests: { id: string; name: string }[]; gifts: GiftRow[] }) {
  const L = (km: string, en: string) => (locale === "km" ? km : en);
  const router = useRouter();
  const [edit, setEdit] = useState<GiftRow | "new" | null>(null);
  const [q, setQ] = useState("");
  const [pending, start] = useTransition();
  const [err, setErr] = useState("");
  const cash = gifts.filter((g) => g.kind === "cash");
  const totals = sumByCurrency(cash, (g) => g.amountMinor, (g) => g.currency);
  const name = (id: string) => guests.find((g) => g.id === id)?.name ?? "—";
  const list = gifts.filter((g) => `${name(g.guestId)} ${g.description} ${g.notes}`.toLowerCase().includes(q.toLowerCase()));
  return (
    <div className="space-y-5">
      <p className="rounded-2xl border border-line bg-white px-4 py-3 text-xs leading-6 text-muted">{L("កំណត់ត្រាឯកជន — សម្រាប់ម្ចាស់កម្មវិធីប៉ុណ្ណោះ។ ការបង្ហាញ KHQR មិនមែនជាភស្តុតាងថាបានទូទាត់ទេ ដូច្នេះសូមកត់ត្រាចំណងដៃដែលអ្នកបានទទួលពិតប្រាកដ។", "Private records for hosts only. Displaying a KHQR does not prove a payment happened — record gifts you actually received.")}</p>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="USD" value={formatMoney(totals.USD, "USD")} tone="success" />
        <Stat label="KHR" value={formatMoney(totals.KHR, "KHR")} tone="success" />
        <Stat label={L("ចំណងដៃជាសាច់ប្រាក់", "Cash gifts")} value={cash.length} />
        <Stat label={L("ចំណងដៃជារបស់", "Item gifts")} value={gifts.length - cash.length} />
      </div>
      <div className="flex flex-wrap gap-2">
        <div className="relative flex-1"><Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" /><Input value={q} onChange={(e) => setQ(e.target.value)} className="pl-10" placeholder={L("ស្វែងរក", "Search")} /></div>
        <a href={`/api/events/${eventId}/export?kind=gifts`} className={buttonClass("outline", "md")}><Download className="h-4 w-4" />CSV</a>
        {canEdit ? <Button onClick={() => setEdit("new")}><Plus className="h-4 w-4" />{L("កត់ត្រាចំណងដៃ", "Record gift")}</Button> : null}
      </div>
      {!gifts.length ? <EmptyState icon={<Gift className="h-10 w-10" />} title={L("មិនទាន់មានកំណត់ត្រា", "No gift records yet")} /> : (
        <div className="overflow-hidden rounded-2xl border border-line bg-white">
          {list.map((g) => (
            <div key={g.id} className="flex items-center gap-3 border-b border-line px-4 py-3 text-sm last:border-0">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-gold-soft text-gold-2">{g.kind === "cash" ? <Wallet className="h-4 w-4" /> : <Gift className="h-4 w-4" />}</span>
              <div className="min-w-0 flex-1"><p className="font-medium">{name(g.guestId)}</p><p className="truncate text-xs text-muted">{[g.description, g.receivedOn].filter(Boolean).join(" · ")}</p></div>
              <span className="num font-semibold">{g.kind === "cash" ? formatMoney(g.amountMinor, g.currency) : <Badge>{L("របស់", "Item")}</Badge>}</span>
              {canEdit ? <button onClick={() => setEdit(g)} className="rounded-full p-1.5 text-muted hover:bg-black/5" aria-label="Edit"><Pencil className="h-3.5 w-3.5" /></button> : null}
              {canEdit ? <button onClick={() => { if (window.confirm(L("លុបកំណត់ត្រានេះ?", "Delete this record?"))) start(async () => { await deleteGiftAction(eventId, g.id); router.refresh(); }); }} className="rounded-full p-1.5 text-danger hover:bg-danger/10" aria-label="Delete"><Trash2 className="h-3.5 w-3.5" /></button> : null}
            </div>
          ))}
        </div>
      )}
      {edit ? (
        <GiftDialog L={L} guests={guests} initial={edit === "new" ? null : edit} pending={pending} err={err} onClose={() => { setEdit(null); setErr(""); }}
          onSave={(v) => start(async () => { const r = await saveGiftAction(eventId, edit === "new" ? null : edit.id, v); if (r.ok) { setEdit(null); router.refresh(); } else setErr(r.error === "amount" ? L("ចំនួនទឹកប្រាក់មិនត្រឹមត្រូវ (USD ៖ ២ ខ្ទង់ទសភាគ, KHR ៖ គ្មានទសភាគ)", "Invalid amount (USD: up to 2 decimals, KHR: whole riel)") : r.error); })} />
      ) : null}
    </div>
  );
}

function GiftDialog({ L, guests, initial, onSave, onClose, pending, err }: { L: (a: string, b: string) => string; guests: { id: string; name: string }[]; initial: GiftRow | null; onSave: (v: { kind: "cash" | "item"; amount: string; currency: Currency; guestId: string; description: string; receivedOn: string; notes: string }) => void; onClose: () => void; pending: boolean; err: string }) {
  const [v, setV] = useState({ kind: initial?.kind ?? "cash" as "cash" | "item", amount: initial ? toInput(initial.amountMinor, initial.currency) : "", currency: initial?.currency ?? "USD" as Currency, guestId: initial?.guestId ?? "", description: initial?.description ?? "", receivedOn: initial?.receivedOn ?? "", notes: initial?.notes ?? "" });
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()} title={initial ? L("កែកំណត់ត្រា", "Edit gift") : L("កត់ត្រាចំណងដៃ", "Record gift")}>
      <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); onSave(v); }}>
        <div className="flex gap-2">{(["cash", "item"] as const).map((k) => <button type="button" key={k} onClick={() => setV({ ...v, kind: k })} aria-pressed={v.kind === k} className={`flex-1 rounded-full border py-2 text-sm ${v.kind === k ? "border-ink bg-ink text-white" : "border-line-2"}`}>{k === "cash" ? L("សាច់ប្រាក់", "Cash") : L("របស់", "Item")}</button>)}</div>
        <Field label={L("ភ្ញៀវ", "Guest")} htmlFor="gf-g"><Select id="gf-g" value={v.guestId} onChange={(e) => setV({ ...v, guestId: e.target.value })}><option value="">—</option>{guests.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}</Select></Field>
        {v.kind === "cash" ? (
          <div className="grid grid-cols-[1fr_110px] gap-3">
            <Field label={L("ចំនួន", "Amount")} htmlFor="gf-a"><Input id="gf-a" inputMode="decimal" required value={v.amount} onChange={(e) => setV({ ...v, amount: e.target.value })} placeholder={v.currency === "USD" ? "50.00" : "200000"} /></Field>
            <Field label={L("រូបិយប័ណ្ណ", "Currency")} htmlFor="gf-c"><Select id="gf-c" value={v.currency} onChange={(e) => setV({ ...v, currency: e.target.value as Currency })}><option>USD</option><option>KHR</option></Select></Field>
          </div>
        ) : null}
        <Field label={L("ពិពណ៌នា", "Description")} htmlFor="gf-d"><Input id="gf-d" maxLength={300} value={v.description} onChange={(e) => setV({ ...v, description: e.target.value })} placeholder={L("ឧ. ស្រោមសំបុត្រ, ABA", "e.g. envelope, ABA transfer")} /></Field>
        <Field label={L("កាលបរិច្ឆេទទទួល", "Date received")} htmlFor="gf-r"><Input id="gf-r" type="date" value={v.receivedOn} onChange={(e) => setV({ ...v, receivedOn: e.target.value })} /></Field>
        <Field label={L("កំណត់ចំណាំ", "Notes")} htmlFor="gf-n"><Textarea id="gf-n" maxLength={1000} value={v.notes} onChange={(e) => setV({ ...v, notes: e.target.value })} /></Field>
        {err ? <p className="text-sm text-danger" role="alert">{err}</p> : null}
        <div className="flex justify-end gap-2"><Button type="button" variant="ghost" onClick={onClose}>{L("បោះបង់", "Cancel")}</Button><Button disabled={pending}>{pending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}{L("រក្សាទុក", "Save")}</Button></div>
      </form>
    </Dialog>
  );
}

type Exp = { id: string; category: string; vendor: string; plannedMinor: number; actualMinor: number; currency: Currency; paymentStatus: "unpaid" | "deposit" | "paid"; notes: string };
const CATS = ["Venue · ទីតាំង", "Catering · អាហារ", "Decoration · តុបតែង", "Photo & video · ថតរូប", "Attire · សម្លៀកបំពាក់", "Make-up · តុបតែងមុខ", "Music · តន្ត្រី", "Printing · បោះពុម្ព", "Transport · ដឹកជញ្ជូន", "Other · ផ្សេងៗ"];

export function BudgetTracker({ eventId, locale, canEdit, rows }: { eventId: string; locale: "km" | "en"; canEdit: boolean; rows: Exp[] }) {
  const L = (km: string, en: string) => (locale === "km" ? km : en);
  const router = useRouter();
  const [edit, setEdit] = useState<Exp | "new" | null>(null);
  const [pending, start] = useTransition();
  const [err, setErr] = useState("");
  const planned = sumByCurrency(rows, (r) => r.plannedMinor, (r) => r.currency);
  const actual = sumByCurrency(rows, (r) => r.actualMinor, (r) => r.currency);
  const remaining = { USD: planned.USD - actual.USD, KHR: planned.KHR - actual.KHR };
  const byCat = useMemo(() => {
    const m = new Map<string, { p: number; a: number; c: Currency }>();
    rows.filter((r) => r.currency === "USD").forEach((r) => { const x = m.get(r.category) ?? { p: 0, a: 0, c: "USD" as Currency }; x.p += r.plannedMinor; x.a += r.actualMinor; m.set(r.category, x); });
    return [...m.entries()];
  }, [rows]);
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Stat label={L("គម្រោង", "Planned")} value={both(planned)} />
        <Stat label={L("បានចំណាយ", "Spent")} value={both(actual)} tone="warning" />
        <Stat label={L("នៅសល់", "Remaining")} value={<span className={remaining.USD < 0 || remaining.KHR < 0 ? "text-danger" : ""}>{both(remaining)}</span>} tone="success" hint={L("គណនាដាច់ដោយឡែកតាមរូបិយប័ណ្ណ — មិនប្ដូរអត្រា", "Totals per currency — no exchange rate assumed")} />
      </div>
      {byCat.length ? (
        <div className="rounded-2xl border border-line bg-white p-5">
          <p className="mb-4 text-sm font-semibold">{L("តាមប្រភេទ (USD)", "By category (USD)")}</p>
          <HBars rows={byCat.map(([k, v]) => ({ label: k, value: v.a, max: Math.max(v.p, v.a), display: `${formatMoney(v.a, "USD")} / ${formatMoney(v.p, "USD")}`, color: v.a > v.p ? "#D84A4A" : "#B68A45" }))} />
        </div>
      ) : null}
      <div className="flex justify-end gap-2">
        <a href={`/api/events/${eventId}/export?kind=expenses`} className={buttonClass("outline", "md")}><Download className="h-4 w-4" />CSV</a>
        {canEdit ? <Button onClick={() => setEdit("new")}><Plus className="h-4 w-4" />{L("បន្ថែមចំណាយ", "Add expense")}</Button> : null}
      </div>
      {!rows.length ? <EmptyState icon={<Wallet className="h-10 w-10" />} title={L("មិនទាន់មានថវិកា", "No budget items yet")} /> : (
        <div className="overflow-x-auto rounded-2xl border border-line bg-white">
          <table className="w-full min-w-[640px] text-sm">
            <thead className="border-b border-line bg-paper/60 text-left text-xs text-muted"><tr><th className="p-3">{L("ប្រភេទ", "Category")}</th><th className="p-3">{L("អ្នកផ្គត់ផ្គង់", "Vendor")}</th><th className="p-3 text-right">{L("គម្រោង", "Planned")}</th><th className="p-3 text-right">{L("ពិតប្រាកដ", "Actual")}</th><th className="p-3">{L("ស្ថានភាព", "Status")}</th><th /></tr></thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-b border-line last:border-0">
                  <td className="p-3 font-medium">{r.category}</td><td className="p-3 text-ink-2">{r.vendor}</td>
                  <td className="num p-3 text-right">{formatMoney(r.plannedMinor, r.currency)}</td>
                  <td className={`num p-3 text-right ${r.actualMinor > r.plannedMinor ? "text-danger" : ""}`}>{formatMoney(r.actualMinor, r.currency)}</td>
                  <td className="p-3"><Badge tone={r.paymentStatus === "paid" ? "success" : r.paymentStatus === "deposit" ? "warning" : "neutral"}>{{ paid: L("បានបង់", "Paid"), deposit: L("កក់", "Deposit"), unpaid: L("មិនទាន់បង់", "Unpaid") }[r.paymentStatus]}</Badge></td>
                  <td className="whitespace-nowrap p-3 text-right">
                    {canEdit ? <><button onClick={() => setEdit(r)} className="rounded-full p-1.5 text-muted hover:bg-black/5" aria-label="Edit"><Pencil className="h-3.5 w-3.5" /></button>
                    <button onClick={() => { if (window.confirm(L("លុប?", "Delete?"))) start(async () => { await deleteExpenseAction(eventId, r.id); router.refresh(); }); }} className="rounded-full p-1.5 text-danger hover:bg-danger/10" aria-label="Delete"><Trash2 className="h-3.5 w-3.5" /></button></> : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {edit ? (
        <ExpenseDialog L={L} initial={edit === "new" ? null : edit} pending={pending} err={err} onClose={() => { setEdit(null); setErr(""); }}
          onSave={(v) => start(async () => { const r = await saveExpenseAction(eventId, edit === "new" ? null : edit.id, v); if (r.ok) { setEdit(null); router.refresh(); } else setErr(r.error === "amount" ? L("ចំនួនទឹកប្រាក់មិនត្រឹមត្រូវ", "Invalid amount") : r.error); })} />
      ) : null}
    </div>
  );
}

function ExpenseDialog({ L, initial, onSave, onClose, pending, err }: { L: (a: string, b: string) => string; initial: Exp | null; onSave: (v: { category: string; vendor: string; planned: string; actual: string; currency: Currency; paymentStatus: "unpaid" | "deposit" | "paid"; notes: string }) => void; onClose: () => void; pending: boolean; err: string }) {
  const c = initial?.currency ?? "USD";
  const [v, setV] = useState({ category: initial?.category ?? CATS[0], vendor: initial?.vendor ?? "", planned: initial ? toInput(initial.plannedMinor, c) : "", actual: initial ? toInput(initial.actualMinor, c) : "", currency: c as Currency, paymentStatus: initial?.paymentStatus ?? "unpaid" as Exp["paymentStatus"], notes: initial?.notes ?? "" });
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()} title={initial ? L("កែចំណាយ", "Edit expense") : L("បន្ថែមចំណាយ", "Add expense")}>
      <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); onSave(v); }}>
        <Field label={L("ប្រភេទ", "Category")} htmlFor="ex-c"><Input id="ex-c" list="ex-cats" required maxLength={60} value={v.category} onChange={(e) => setV({ ...v, category: e.target.value })} /><datalist id="ex-cats">{CATS.map((x) => <option key={x} value={x} />)}</datalist></Field>
        <Field label={L("អ្នកផ្គត់ផ្គង់", "Vendor")} htmlFor="ex-v"><Input id="ex-v" maxLength={120} value={v.vendor} onChange={(e) => setV({ ...v, vendor: e.target.value })} /></Field>
        <div className="grid grid-cols-3 gap-3">
          <Field label={L("គម្រោង", "Planned")} htmlFor="ex-p"><Input id="ex-p" inputMode="decimal" value={v.planned} onChange={(e) => setV({ ...v, planned: e.target.value })} /></Field>
          <Field label={L("ពិតប្រាកដ", "Actual")} htmlFor="ex-a"><Input id="ex-a" inputMode="decimal" value={v.actual} onChange={(e) => setV({ ...v, actual: e.target.value })} /></Field>
          <Field label={L("រូបិយប័ណ្ណ", "Currency")} htmlFor="ex-cu"><Select id="ex-cu" value={v.currency} onChange={(e) => setV({ ...v, currency: e.target.value as Currency })}><option>USD</option><option>KHR</option></Select></Field>
        </div>
        <Field label={L("ស្ថានភាពទូទាត់", "Payment status")} htmlFor="ex-s"><Select id="ex-s" value={v.paymentStatus} onChange={(e) => setV({ ...v, paymentStatus: e.target.value as Exp["paymentStatus"] })}><option value="unpaid">{L("មិនទាន់បង់", "Unpaid")}</option><option value="deposit">{L("កក់", "Deposit")}</option><option value="paid">{L("បានបង់", "Paid")}</option></Select></Field>
        <Field label={L("កំណត់ចំណាំ", "Notes")} htmlFor="ex-n"><Textarea id="ex-n" maxLength={1000} value={v.notes} onChange={(e) => setV({ ...v, notes: e.target.value })} /></Field>
        {err ? <p className="text-sm text-danger" role="alert">{err}</p> : null}
        <div className="flex justify-end gap-2"><Button type="button" variant="ghost" onClick={onClose}>{L("បោះបង់", "Cancel")}</Button><Button disabled={pending}>{pending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}{L("រក្សាទុក", "Save")}</Button></div>
      </form>
    </Dialog>
  );
}
