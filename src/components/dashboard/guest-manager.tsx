"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import QRCode from "qrcode";
import { Copy, Download, FileUp, Link2, Loader2, MoreHorizontal, Plus, QrCode, RefreshCw, Search, Send, Trash2, Users, Ban, Check, AlertTriangle } from "lucide-react";
import * as DM from "@radix-ui/react-dropdown-menu";
import { Badge, Button, EmptyState, Field, Input, Select, Textarea, buttonClass } from "@/components/ui";
import { Dialog } from "@/components/ui/dialog";
import {
  addGroupAction, addGuestAction, commitImportAction, deleteGuestsAction, moveGuestsAction, previewImportAction, regenerateLinkAction, revokeLinkAction, updateGuestAction, type GuestInput, type ImportPreview,
} from "@/features/guests/actions";
import { cn } from "@/lib/utils";

export type GuestRow = {
  id: string; fullName: string; khmerName: string; honorific: string; phone: string; email: string; groupId: string; allowedAttendees: number; notes: string;
  rsvpStatus: string; attendeeCount: number; checkedInCount: number; table: string; viewed: boolean; link: string | null;
};

const HONORIFICS = ["លោក", "លោកស្រី", "កញ្ញា", "អ្នកនាង", "ឯកឧត្តម", "លោកជំទាវ", "Mr.", "Mrs.", "Ms."];

export function GuestManager({ eventId, eventTitle, published, guests, groups, canEdit, locale }: { eventId: string; eventTitle: string; published: boolean; guests: GuestRow[]; groups: { id: string; name: string }[]; canEdit: boolean; locale: "km" | "en" }) {
  const L = (km: string, en: string) => (locale === "km" ? km : en);
  const router = useRouter();
  const [q, setQ] = useState("");
  const [group, setGroup] = useState("all");
  const [status, setStatus] = useState("all");
  const [sel, setSel] = useState<Set<string>>(new Set());
  const [editing, setEditing] = useState<GuestRow | "new" | null>(null);
  const [qr, setQr] = useState<{ name: string; svg: string; link: string } | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const [toast, setToast] = useState("");

  const STATUS: Record<string, { label: string; tone: "success" | "danger" | "warning" | "neutral" }> = {
    attending: { label: L("ចូលរួម", "Attending"), tone: "success" },
    declined: { label: L("មិនចូលរួម", "Declined"), tone: "danger" },
    maybe: { label: L("មិនប្រាកដ", "Maybe"), tone: "warning" },
    pending: { label: L("មិនទាន់ឆ្លើយ", "Pending"), tone: "neutral" },
  };

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    return guests.filter((g) =>
      (group === "all" || (group === "none" ? !g.groupId : g.groupId === group)) &&
      (status === "all" || g.rsvpStatus === status) &&
      (!s || `${g.fullName} ${g.khmerName} ${g.phone} ${g.email}`.toLowerCase().includes(s)));
  }, [guests, q, group, status]);

  const dupes = useMemo(() => {
    const m = new Map<string, number>();
    guests.forEach((g) => { const k = (g.khmerName || g.fullName).toLowerCase().replace(/\s+/g, ""); m.set(k, (m.get(k) ?? 0) + 1); });
    return new Set(guests.filter((g) => (m.get((g.khmerName || g.fullName).toLowerCase().replace(/\s+/g, "")) ?? 0) > 1).map((g) => g.id));
  }, [guests]);

  const run = (fn: () => Promise<{ ok: boolean; error?: string }>, msg?: string) => start(async () => {
    const r = await fn();
    if (!r.ok) setToast(r.error === "plan_guest_limit" ? L("ដល់ចំនួនភ្ញៀវអតិបរមានៃកញ្ចប់", "Plan guest limit reached") : r.error ?? "Error");
    else { if (msg) setToast(msg); setSel(new Set()); router.refresh(); }
    setTimeout(() => setToast(""), 3000);
  });

  async function copy(text: string, id: string) {
    await navigator.clipboard.writeText(text);
    setCopied(id); setTimeout(() => setCopied(null), 1500);
  }
  async function showQr(g: GuestRow) {
    if (!g.link) return;
    setQr({ name: g.fullName, link: g.link, svg: await QRCode.toString(g.link, { type: "svg", margin: 1 }) });
  }
  const shareText = (g: GuestRow) => `${L("សូមគោរពអញ្ជើញ", "You're invited")} ${[g.honorific, g.khmerName || g.fullName].filter(Boolean).join(" ")} — ${eventTitle}`;

  const allSel = filtered.length > 0 && filtered.every((g) => sel.has(g.id));
  const toggleAll = () => setSel(allSel ? new Set() : new Set(filtered.map((g) => g.id)));

  return (
    <div>
      {!published && guests.length ? (
        <p className="mb-4 flex items-center gap-2 rounded-2xl border border-warning/30 bg-warning/10 px-4 py-3 text-sm"><AlertTriangle className="h-4 w-4 text-warning" />{L("ធៀបមិនទាន់ផ្សព្វផ្សាយ — តំណភ្ញៀវនឹងដំណើរការក្រោយពេលអ្នកចុច «ផ្សព្វផ្សាយ»", "Not published yet — guest links start working after you publish")}</p>
      ) : null}

      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder={L("ស្វែងរកឈ្មោះ លេខទូរស័ព្ទ…", "Search name, phone…")} className="pl-10" aria-label="Search" />
        </div>
        <div className="flex gap-2">
          <Select value={group} onChange={(e) => setGroup(e.target.value)} className="w-auto min-w-36" aria-label="Group">
            <option value="all">{L("គ្រប់ក្រុម", "All groups")}</option>
            {groups.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
            <option value="none">{L("គ្មានក្រុម", "No group")}</option>
          </Select>
          <Select value={status} onChange={(e) => setStatus(e.target.value)} className="w-auto min-w-32" aria-label="Status">
            <option value="all">{L("គ្រប់ស្ថានភាព", "All statuses")}</option>
            {Object.entries(STATUS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </Select>
        </div>
        <div className="flex flex-wrap gap-2">
          {canEdit ? <Button variant="outline" onClick={() => setImportOpen(true)}><FileUp className="h-4 w-4" />{L("នាំចូល", "Import")}</Button> : null}
          <a href={`/api/events/${eventId}/export?kind=guests${canEdit ? "&links=1" : ""}`} className={buttonClass("outline", "md")}><Download className="h-4 w-4" />CSV</a>
          {canEdit ? <Button onClick={() => setEditing("new")}><Plus className="h-4 w-4" />{L("បន្ថែមភ្ញៀវ", "Add guest")}</Button> : null}
        </div>
      </div>

      {sel.size && canEdit ? (
        <div className="mb-3 flex flex-wrap items-center gap-2 rounded-2xl bg-ink px-4 py-2.5 text-sm text-white">
          <span>{sel.size} {L("បានជ្រើស", "selected")}</span>
          <select className="h-8 rounded-full bg-white/10 px-3 text-xs" defaultValue="" onChange={(e) => { if (e.target.value) run(() => moveGuestsAction(eventId, [...sel], e.target.value === "none" ? null : e.target.value)); e.target.value = ""; }} aria-label="Move to group">
            <option value="" disabled>{L("ផ្លាស់ទៅក្រុម…", "Move to group…")}</option>
            {groups.map((g) => <option key={g.id} value={g.id} className="text-ink">{g.name}</option>)}
            <option value="none" className="text-ink">{L("គ្មានក្រុម", "No group")}</option>
          </select>
          <button className="ml-auto inline-flex items-center gap-1.5 rounded-full bg-danger px-3 py-1 text-xs" onClick={() => { if (window.confirm(L(`លុបភ្ញៀវ ${sel.size} នាក់? មិនអាចត្រឡប់វិញបានទេ។`, `Delete ${sel.size} guests? This cannot be undone.`))) run(() => deleteGuestsAction(eventId, [...sel])); }}>
            <Trash2 className="h-3.5 w-3.5" />{L("លុប", "Delete")}
          </button>
        </div>
      ) : null}

      {!guests.length ? (
        <EmptyState icon={<Users className="h-10 w-10" />} title={L("មិនទាន់មានភ្ញៀវ", "No guests yet")} body={L("បន្ថែមម្ដងម្នាក់ ឬនាំចូលពីឯកសារ CSV / Excel (រក្សាទុកជា CSV)", "Add guests one by one, or import a CSV (save Excel as CSV)")}
          action={canEdit ? <div className="flex gap-2"><Button variant="outline" onClick={() => setImportOpen(true)}>{L("នាំចូល CSV", "Import CSV")}</Button><Button onClick={() => setEditing("new")}>{L("បន្ថែមភ្ញៀវ", "Add guest")}</Button></div> : undefined} />
      ) : (
        <div className="overflow-hidden rounded-2xl border border-line bg-white">
          <table className="w-full text-sm">
            <thead className="hidden border-b border-line bg-paper/60 text-left text-xs text-muted md:table-header-group">
              <tr>
                {canEdit ? <th className="w-10 px-4 py-3"><input type="checkbox" checked={allSel} onChange={toggleAll} aria-label="Select all" className="accent-[#B68A45]" /></th> : null}
                <th className="px-2 py-3 font-medium">{L("ឈ្មោះ", "Name")}</th>
                <th className="px-2 py-3 font-medium">{L("ក្រុម", "Group")}</th>
                <th className="px-2 py-3 font-medium">RSVP</th>
                <th className="px-2 py-3 text-center font-medium">{L("ចំនួន", "Guests")}</th>
                <th className="px-2 py-3 font-medium">{L("តំណ", "Link")}</th>
                <th className="w-10" />
              </tr>
            </thead>
            <tbody>
              {filtered.map((g) => (
                <tr key={g.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 border-b border-line px-4 py-3 last:border-0 md:table-row md:p-0">
                  {canEdit ? <td className="md:px-4 md:py-3"><input type="checkbox" checked={sel.has(g.id)} onChange={() => { const n = new Set(sel); if (n.has(g.id)) n.delete(g.id); else n.add(g.id); setSel(n); }} aria-label={`Select ${g.fullName}`} className="accent-[#B68A45]" /></td> : null}
                  <td className="min-w-0 basis-[calc(100%-3rem)] md:basis-auto md:px-2 md:py-3">
                    <button className="text-left" onClick={() => canEdit && setEditing(g)}>
                      <span className="font-medium">{[g.honorific, g.khmerName || g.fullName].filter(Boolean).join(" ")}</span>
                      {g.khmerName ? <span className="block text-xs text-muted">{g.fullName}</span> : null}
                      {g.phone ? <span className="block text-xs text-muted">{g.phone}</span> : null}
                    </button>
                    {dupes.has(g.id) ? <Badge tone="warning" className="ml-1">{L("ឈ្មោះស្ទួន?", "Duplicate?")}</Badge> : null}
                  </td>
                  <td className="text-xs text-ink-2 md:px-2 md:py-3">{groups.find((x) => x.id === g.groupId)?.name ?? "—"}</td>
                  <td className="md:px-2 md:py-3">
                    <Badge tone={STATUS[g.rsvpStatus]?.tone ?? "neutral"}>{STATUS[g.rsvpStatus]?.label ?? g.rsvpStatus}</Badge>
                    {g.viewed && g.rsvpStatus === "pending" ? <span className="ml-1 text-[11px] text-muted">{L("បានបើក", "opened")}</span> : null}
                  </td>
                  <td className="num text-center text-xs md:px-2 md:py-3">{g.rsvpStatus === "attending" ? <b>{g.attendeeCount}</b> : "–"}/{g.allowedAttendees}</td>
                  <td className="md:px-2 md:py-3">
                    {g.link ? (
                      <div className="flex gap-1">
                        <button onClick={() => copy(g.link!, g.id)} className="inline-flex h-8 items-center gap-1 rounded-full border border-line-2 px-2.5 text-xs hover:border-ink/40" title={L("ចម្លងតំណ", "Copy link")}>
                          {copied === g.id ? <Check className="h-3.5 w-3.5 text-success" /> : <Copy className="h-3.5 w-3.5" />}<span className="hidden xl:inline">{copied === g.id ? L("បានចម្លង", "Copied") : L("ចម្លង", "Copy")}</span>
                        </button>
                        <a href={`https://t.me/share/url?url=${encodeURIComponent(g.link)}&text=${encodeURIComponent(shareText(g))}`} target="_blank" rel="noopener noreferrer" className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-line-2 text-[#229ED9] hover:border-[#229ED9]" title="Telegram"><Send className="h-3.5 w-3.5" /></a>
                        <button onClick={() => showQr(g)} className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-line-2 hover:border-ink/40" title="QR"><QrCode className="h-3.5 w-3.5" /></button>
                      </div>
                    ) : canEdit ? <span className="text-xs text-danger">{L("បានបិទ", "Revoked")}</span> : <span className="text-xs text-muted">—</span>}
                  </td>
                  <td className="md:pr-3">
                    {canEdit ? (
                      <DM.Root>
                        <DM.Trigger className="rounded-full p-1.5 text-muted hover:bg-black/5" aria-label="More"><MoreHorizontal className="h-4 w-4" /></DM.Trigger>
                        <DM.Portal>
                          <DM.Content align="end" sideOffset={4} className="z-50 min-w-48 rounded-xl border border-line bg-white p-1 text-sm shadow-lift">
                            <DM.Item onSelect={() => setEditing(g)} className="cursor-pointer rounded-lg px-3 py-2 outline-none data-[highlighted]:bg-paper">{L("កែព័ត៌មាន", "Edit")}</DM.Item>
                            <DM.Item onSelect={() => { if (window.confirm(L("បង្កើតតំណថ្មី? តំណចាស់នឹងលែងដំណើរការ។", "Generate a new link? The old link will stop working."))) run(() => regenerateLinkAction(eventId, g.id), L("បានបង្កើតតំណថ្មី", "New link generated")); }} className="flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2 outline-none data-[highlighted]:bg-paper"><RefreshCw className="h-3.5 w-3.5" />{L("បង្កើតតំណថ្មី", "Regenerate link")}</DM.Item>
                            {g.link ? <DM.Item onSelect={() => { if (window.confirm(L("បិទតំណនេះ?", "Revoke this link?"))) run(() => revokeLinkAction(eventId, g.id)); }} className="flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2 outline-none data-[highlighted]:bg-paper"><Ban className="h-3.5 w-3.5" />{L("បិទតំណ", "Revoke link")}</DM.Item> : null}
                            <DM.Separator className="my-1 h-px bg-line" />
                            <DM.Item onSelect={() => { if (window.confirm(L("លុបភ្ញៀវនេះ?", "Delete this guest?"))) run(() => deleteGuestsAction(eventId, [g.id])); }} className="flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-danger outline-none data-[highlighted]:bg-danger/10"><Trash2 className="h-3.5 w-3.5" />{L("លុប", "Delete")}</DM.Item>
                          </DM.Content>
                        </DM.Portal>
                      </DM.Root>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!filtered.length ? <p className="p-8 text-center text-sm text-muted">{L("គ្មានលទ្ធផល", "No results")}</p> : null}
        </div>
      )}
      <p className="mt-3 text-xs text-muted">{filtered.length} / {guests.length}</p>

      {editing ? (
        <GuestDialog key={editing === "new" ? "new" : editing.id} L={L} groups={groups} initial={editing === "new" ? null : editing} pending={pending} onClose={() => setEditing(null)}
          onAddGroup={(name) => run(() => addGroupAction(eventId, name))}
          onSave={(v) => start(async () => {
            const r = editing === "new" ? await addGuestAction(eventId, v) : await updateGuestAction(eventId, editing.id, v);
            if (r.ok) { setEditing(null); router.refresh(); } else setToast(r.error === "plan_guest_limit" ? L("ដល់ចំនួនភ្ញៀវអតិបរមានៃកញ្ចប់", "Plan guest limit reached") : r.error);
          })} />
      ) : null}

      <Dialog open={!!qr} onOpenChange={(o) => !o && setQr(null)} title={qr?.name ?? ""} description={L("ភ្ញៀវស្កេន QR នេះ ដើម្បីបើកធៀបផ្ទាល់ខ្លួន", "Guest scans this to open their personal invitation")}>
        {qr ? (
          <div className="text-center">
            <div className="mx-auto w-56 rounded-2xl border border-line p-3" dangerouslySetInnerHTML={{ __html: qr.svg }} />
            <p className="mt-3 break-all font-mono text-[11px] text-muted">{qr.link}</p>
            <a className={cn(buttonClass("outline", "sm"), "mt-4")} download={`invite-${qr.name}.svg`} href={`data:image/svg+xml;charset=utf-8,${encodeURIComponent(qr.svg)}`}><Download className="h-3.5 w-3.5" />SVG</a>
          </div>
        ) : null}
      </Dialog>

      <ImportDialog open={importOpen} onOpenChange={setImportOpen} eventId={eventId} L={L} onDone={(n) => { setImportOpen(false); setToast(L(`បាននាំចូល ${n} នាក់`, `Imported ${n} guests`)); router.refresh(); }} />

      {toast ? <div role="status" className="fixed bottom-6 left-1/2 z-[60] -translate-x-1/2 rounded-full bg-ink px-5 py-2.5 text-sm text-white shadow-lift">{toast}</div> : null}
      {pending ? <Loader2 className="fixed bottom-6 right-6 h-5 w-5 animate-spin text-gold" /> : null}
      <span className="hidden"><Link2 /></span>
    </div>
  );
}

function GuestDialog({ L, groups, initial, onSave, onClose, pending, onAddGroup }: { L: (a: string, b: string) => string; groups: { id: string; name: string }[]; initial: GuestRow | null; onSave: (v: GuestInput) => void; onClose: () => void; pending: boolean; onAddGroup: (n: string) => void }) {
  const [v, setV] = useState<GuestInput>({
    fullName: initial?.fullName ?? "", khmerName: initial?.khmerName ?? "", honorific: initial?.honorific ?? "លោក", phone: initial?.phone ?? "", email: initial?.email ?? "",
    groupId: initial?.groupId ?? "", allowedAttendees: initial?.allowedAttendees ?? 1, notes: initial?.notes ?? "",
  });
  const up = (p: Partial<GuestInput>) => setV((x) => ({ ...x, ...p }));
  const [newGroup, setNewGroup] = useState("");
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()} title={initial ? L("កែព័ត៌មានភ្ញៀវ", "Edit guest") : L("បន្ថែមភ្ញៀវ", "Add guest")}>
      <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); if (v.fullName?.trim()) onSave(v); }}>
        <div className="grid grid-cols-[110px_1fr] gap-3">
          <Field label={L("ងារ", "Title")} htmlFor="g-h">
            <Select id="g-h" value={v.honorific} onChange={(e) => up({ honorific: e.target.value })}>{["", ...HONORIFICS].map((h) => <option key={h} value={h}>{h || "—"}</option>)}</Select>
          </Field>
          <Field label={`${L("ឈ្មោះ", "Name")} *`} htmlFor="g-n"><Input id="g-n" required maxLength={160} value={v.fullName} onChange={(e) => up({ fullName: e.target.value })} /></Field>
        </div>
        <Field label={L("ឈ្មោះជាអក្សរខ្មែរ (បង្ហាញលើធៀប)", "Khmer name (shown on invitation)")} htmlFor="g-k"><Input id="g-k" lang="km" maxLength={160} value={v.khmerName} onChange={(e) => up({ khmerName: e.target.value })} /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label={L("ទូរស័ព្ទ", "Phone")} htmlFor="g-p"><Input id="g-p" type="tel" maxLength={40} value={v.phone} onChange={(e) => up({ phone: e.target.value })} /></Field>
          <Field label={L("ចំនួនអនុញ្ញាត", "Allowed guests")} htmlFor="g-a"><Input id="g-a" type="number" min={1} max={50} value={Number(v.allowedAttendees ?? 1)} onChange={(e) => up({ allowedAttendees: Number(e.target.value) })} /></Field>
        </div>
        <Field label={L("ក្រុម", "Group")} htmlFor="g-g">
          <div className="flex gap-2">
            <Select id="g-g" value={v.groupId ?? ""} onChange={(e) => up({ groupId: e.target.value })}>
              <option value="">—</option>{groups.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
            </Select>
          </div>
          <div className="mt-2 flex gap-2">
            <Input value={newGroup} onChange={(e) => setNewGroup(e.target.value)} placeholder={L("ក្រុមថ្មី…", "New group…")} className="h-9 text-sm" />
            <Button type="button" variant="outline" size="sm" onClick={() => { if (newGroup.trim()) { onAddGroup(newGroup); setNewGroup(""); } }}>{L("បន្ថែម", "Add")}</Button>
          </div>
        </Field>
        <Field label={L("អ៊ីមែល", "Email")} htmlFor="g-e"><Input id="g-e" type="email" maxLength={200} value={v.email} onChange={(e) => up({ email: e.target.value })} /></Field>
        <Field label={L("កំណត់ចំណាំ", "Notes")} htmlFor="g-no"><Textarea id="g-no" maxLength={1000} value={v.notes} onChange={(e) => up({ notes: e.target.value })} /></Field>
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="ghost" onClick={onClose}>{L("បោះបង់", "Cancel")}</Button>
          <Button type="submit" disabled={pending}>{pending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}{L("រក្សាទុក", "Save")}</Button>
        </div>
      </form>
    </Dialog>
  );
}

function ImportDialog({ open, onOpenChange, eventId, L, onDone }: { open: boolean; onOpenChange: (o: boolean) => void; eventId: string; L: (a: string, b: string) => string; onDone: (n: number) => void }) {
  const [text, setText] = useState("");
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [skipDup, setSkipDup] = useState(true);
  const [err, setErr] = useState("");
  const [pending, start] = useTransition();
  const template = "﻿Name,Khmer name,Title,Phone,Email,Group,Allowed,Notes\r\nSok Dara,សុខ ដារ៉ា,លោក,012345678,,Friends,2,\r\n";
  const valid = preview?.rows.filter((r) => !r.error && !(skipDup && r.duplicate)).length ?? 0;
  return (
    <Dialog open={open} onOpenChange={(o) => { onOpenChange(o); if (!o) { setPreview(null); setText(""); setErr(""); } }} wide title={L("នាំចូលភ្ញៀវ", "Import guests")} description={L("ឯកសារ CSV (UTF-8)។ ពី Excel៖ File → Save As → CSV UTF-8", "CSV file (UTF-8). From Excel: File → Save As → CSV UTF-8")}>
      {!preview ? (
        <div className="space-y-4">
          <a href={`data:text/csv;charset=utf-8,${encodeURIComponent(template)}`} download="guest-template.csv" className="inline-flex items-center gap-1.5 text-sm text-gold-2 underline"><Download className="h-4 w-4" />{L("ទាញយកគំរូ CSV", "Download CSV template")}</a>
          <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-line-2 p-8 text-center hover:border-gold">
            <FileUp className="h-8 w-8 text-gold" />
            <span className="text-sm font-medium">{L("ជ្រើសរើសឯកសារ CSV", "Choose a CSV file")}</span>
            <span className="text-xs text-muted">{L("ជួរឈរ៖ Name, Khmer name, Title, Phone, Email, Group, Allowed, Notes", "Columns: Name, Khmer name, Title, Phone, Email, Group, Allowed, Notes")}</span>
            <input type="file" accept=".csv,text/csv" hidden onChange={async (e) => { const f = e.target.files?.[0]; if (!f) return; if (f.size > 2_000_000) return setErr("Max 2MB"); setText(await f.text()); }} />
          </label>
          {text ? <p className="text-sm">✓ {text.split(/\r?\n/).filter(Boolean).length - 1} {L("ជួរ", "rows")}</p> : null}
          {err ? <p className="text-sm text-danger">{err}</p> : null}
          <div className="flex justify-end"><Button disabled={!text || pending} onClick={() => start(async () => { const r = await previewImportAction(eventId, text); if ("error" in r) setErr(r.error); else setPreview(r); })}>{pending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}{L("ពិនិត្យមុន", "Preview")}</Button></div>
        </div>
      ) : (
        <div className="space-y-4">
          {preview.unknownHeaders.length ? <p className="rounded-xl bg-warning/10 px-3 py-2 text-xs">{L("ជួរឈរមិនស្គាល់ (មិននាំចូល)៖", "Ignored columns:")} {preview.unknownHeaders.join(", ")}</p> : null}
          <div className="max-h-72 overflow-auto rounded-xl border border-line">
            <table className="w-full text-xs">
              <thead className="sticky top-0 bg-paper text-left text-muted"><tr><th className="p-2">#</th><th className="p-2">{L("ឈ្មោះ", "Name")}</th><th className="p-2">{L("ក្រុម", "Group")}</th><th className="p-2">{L("ចំនួន", "Allowed")}</th><th className="p-2">{L("ស្ថានភាព", "Status")}</th></tr></thead>
              <tbody>
                {preview.rows.map((r) => (
                  <tr key={r.line} className={cn("border-t border-line", r.error && "bg-danger/5", r.duplicate && !r.error && "bg-warning/5")}>
                    <td className="p-2 text-muted">{r.line}</td>
                    <td className="p-2">{r.data.fullName}{r.data.khmerName ? ` · ${r.data.khmerName}` : ""}</td>
                    <td className="p-2">{r.data.group}</td>
                    <td className="p-2">{String(r.data.allowedAttendees ?? "")}</td>
                    <td className="p-2">{r.error ? <span className="text-danger">{r.error}</span> : r.duplicate ? <span className="text-[#8a5a12]">{L("ស្ទួន", "Duplicate")}</span> : <span className="text-success">OK</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={skipDup} onChange={(e) => setSkipDup(e.target.checked)} className="accent-[#B68A45]" />{L("រំលងឈ្មោះស្ទួន", "Skip duplicates")}</label>
          {err ? <p className="text-sm text-danger">{err}</p> : null}
          <div className="flex justify-between">
            <Button variant="ghost" onClick={() => setPreview(null)}>{L("ថយក្រោយ", "Back")}</Button>
            <Button variant="gold" disabled={!valid || pending} onClick={() => start(async () => { const r = await commitImportAction(eventId, text, skipDup); if (r.ok) onDone((r.data as { imported: number }).imported); else setErr(r.error); })}>
              {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}{L(`នាំចូល ${valid} នាក់`, `Import ${valid} guests`)}
            </Button>
          </div>
        </div>
      )}
    </Dialog>
  );
}
