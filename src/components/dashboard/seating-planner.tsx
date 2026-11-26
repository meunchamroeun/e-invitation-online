"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { DndContext, PointerSensor, TouchSensor, useDraggable, useDroppable, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { Crown, Download, List, Map as MapIcon, Plus, Printer, Search, Trash2, X } from "lucide-react";
import { assignGuestsAction, createTableAction, deleteTableAction, updateTableAction } from "@/features/seating/actions";
import { Badge, Button, Input, Select, buttonClass } from "@/components/ui";
import { cn } from "@/lib/utils";

type Table = { id: string; label: string; shape: "round" | "rect"; capacity: number; isVip: boolean; x: number; y: number };
type Guest = { id: string; name: string; khmer: string | null; groupId: string | null; tableId: string | null; rsvp: string; attending: number; allowed: number };

/** Seats a guest occupies: confirmed headcount if they replied yes, otherwise their invitation allowance. */
const seats = (g: Guest) => (g.rsvp === "declined" ? 0 : g.rsvp === "attending" ? g.attending : g.allowed);

export function SeatingPlanner({ eventId, title, locale, tables: initialTables, guests: initialGuests, groups }: { eventId: string; title: string; locale: "km" | "en"; tables: Table[]; guests: Guest[]; groups: { id: string; name: string }[] }) {
  const L = (km: string, en: string) => (locale === "km" ? km : en);
  const router = useRouter();
  const [tables, setTables] = useState(initialTables);
  const [guests, setGuests] = useState(initialGuests);
  // Re-sync when the server sends fresh data (after router.refresh()).
  useEffect(() => setTables(initialTables), [initialTables]);
  useEffect(() => setGuests(initialGuests), [initialGuests]);
  const [view, setView] = useState<"map" | "list">("map");
  const [q, setQ] = useState("");
  const [grp, setGrp] = useState("all");
  const [selTable, setSelTable] = useState<string | null>(null);
  const [, start] = useTransition();
  const [newT, setNewT] = useState({ label: "", capacity: 10, shape: "round" as "round" | "rect", isVip: false });

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }), useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 6 } }));
  const used = useMemo(() => Object.fromEntries(tables.map((t) => [t.id, guests.filter((g) => g.tableId === t.id).reduce((a, g) => a + seats(g), 0)])), [tables, guests]);
  const unassigned = guests.filter((g) => !g.tableId && g.rsvp !== "declined" && (grp === "all" || g.groupId === grp) && `${g.name} ${g.khmer ?? ""}`.toLowerCase().includes(q.toLowerCase()));

  function assign(guestIds: string[], tableId: string | null) {
    setGuests((gs) => gs.map((g) => (guestIds.includes(g.id) ? { ...g, tableId } : g)));
    start(async () => { await assignGuestsAction(eventId, guestIds, tableId); });
  }

  function onDragEnd(e: DragEndEvent) {
    const id = String(e.active.id);
    if (id.startsWith("table:")) {
      const tid = id.slice(6);
      setTables((ts) => ts.map((t) => (t.id === tid ? { ...t, x: Math.max(0, Math.round(t.x + e.delta.x)), y: Math.max(0, Math.round(t.y + e.delta.y)) } : t)));
      const t = tables.find((x) => x.id === tid)!;
      start(async () => { await updateTableAction(eventId, tid, { x: Math.max(0, Math.round(t.x + e.delta.x)), y: Math.max(0, Math.round(t.y + e.delta.y)) }); });
    } else if (id.startsWith("guest:") && e.over) {
      const target = String(e.over.id);
      assign([id.slice(6)], target === "unassigned" ? null : target.slice(6));
    }
  }

  const selected = tables.find((t) => t.id === selTable);
  const totalSeats = tables.reduce((a, t) => a + t.capacity, 0);
  const totalUsed = Object.values(used).reduce((a, b) => a + b, 0);

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-2 print:hidden">
        <div className="flex rounded-full border border-line-2 bg-white p-0.5">
          <button onClick={() => setView("map")} aria-pressed={view === "map"} className={cn("inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm", view === "map" && "bg-ink text-white")}><MapIcon className="h-4 w-4" />{L("ប្លង់", "Floor plan")}</button>
          <button onClick={() => setView("list")} aria-pressed={view === "list"} className={cn("inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm", view === "list" && "bg-ink text-white")}><List className="h-4 w-4" />{L("បញ្ជី", "List")}</button>
        </div>
        <span className="text-sm text-muted">{L("កៅអី", "Seats")}: <b className="num text-ink">{totalUsed}</b> / {totalSeats}</span>
        <div className="ml-auto flex gap-2">
          <a href={`/api/events/${eventId}/export?kind=seating`} className={buttonClass("outline", "sm")}><Download className="h-3.5 w-3.5" />CSV</a>
          <Button variant="outline" size="sm" onClick={() => window.print()}><Printer className="h-3.5 w-3.5" />{L("បោះពុម្ព", "Print")}</Button>
        </div>
      </div>

      <form className="mb-5 flex flex-wrap items-end gap-2 rounded-2xl border border-line bg-white p-3 print:hidden" onSubmit={(e) => {
        e.preventDefault();
        const label = newT.label.trim() || `${L("តុ", "Table")} ${tables.length + 1}`;
        start(async () => { await createTableAction(eventId, { ...newT, label }); setNewT({ ...newT, label: "" }); router.refresh(); });
      }}>
        <label className="text-xs text-muted">{L("ឈ្មោះតុ", "Label")}<Input value={newT.label} onChange={(e) => setNewT({ ...newT, label: e.target.value })} placeholder={`${L("តុ", "Table")} ${tables.length + 1}`} className="mt-1 h-9 w-36 text-sm" maxLength={40} /></label>
        <label className="text-xs text-muted">{L("កៅអី", "Seats")}<Input type="number" min={1} max={40} value={newT.capacity} onChange={(e) => setNewT({ ...newT, capacity: Number(e.target.value) })} className="mt-1 h-9 w-20 text-sm" /></label>
        <label className="text-xs text-muted">{L("រាង", "Shape")}<Select value={newT.shape} onChange={(e) => setNewT({ ...newT, shape: e.target.value as "round" })} className="mt-1 h-9 w-28 text-sm"><option value="round">{L("មូល", "Round")}</option><option value="rect">{L("ចតុកោណ", "Rectangle")}</option></Select></label>
        <label className="flex h-9 items-center gap-1.5 text-sm"><input type="checkbox" checked={newT.isVip} onChange={(e) => setNewT({ ...newT, isVip: e.target.checked })} className="accent-[#B68A45]" />VIP</label>
        <Button type="submit" size="sm" className="h-9"><Plus className="h-4 w-4" />{L("បន្ថែមតុ", "Add table")}</Button>
      </form>

      {view === "map" ? (
        <DndContext sensors={sensors} onDragEnd={onDragEnd}>
          <div className="grid gap-4 lg:grid-cols-[260px_1fr] print:block">
            <Unassigned guests={unassigned} groups={groups} q={q} setQ={setQ} grp={grp} setGrp={setGrp} L={L} />
            <div className="relative h-[640px] overflow-auto rounded-2xl border border-line bg-[radial-gradient(#e7e2d8_1px,transparent_1px)] [background-size:22px_22px] print:h-auto print:border-0">
              <div className="relative h-[1200px] w-[1200px]">
                {tables.map((t) => <TableNode key={t.id} t={t} used={used[t.id]} guests={guests.filter((g) => g.tableId === t.id)} selected={selTable === t.id} onSelect={() => setSelTable(t.id)} />)}
                {!tables.length ? <p className="absolute left-8 top-8 text-sm text-muted">{L("បន្ថែមតុដំបូងរបស់អ្នក រួចអូសភ្ញៀវទៅដាក់លើតុ", "Add your first table, then drag guests onto it")}</p> : null}
              </div>
            </div>
          </div>
        </DndContext>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-line bg-white">
          <table className="w-full text-sm">
            <thead className="border-b border-line bg-paper/60 text-left text-xs text-muted"><tr><th className="p-3">{L("ភ្ញៀវ", "Guest")}</th><th className="p-3">{L("កៅអី", "Seats")}</th><th className="p-3">{L("តុ", "Table")}</th></tr></thead>
            <tbody>
              {guests.filter((g) => g.rsvp !== "declined").map((g) => (
                <tr key={g.id} className="border-b border-line last:border-0">
                  <td className="p-3">{g.khmer || g.name}</td>
                  <td className="num p-3">{seats(g)}</td>
                  <td className="p-3">
                    <Select aria-label={`Table for ${g.name}`} value={g.tableId ?? ""} onChange={(e) => assign([g.id], e.target.value || null)} className="h-9 w-48 text-sm">
                      <option value="">— {L("មិនទាន់ចាត់", "Unassigned")} —</option>
                      {tables.map((t) => <option key={t.id} value={t.id}>{t.label} ({used[t.id]}/{t.capacity})</option>)}
                    </Select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {selected ? (
        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-white p-4 shadow-2xl sm:inset-x-auto sm:bottom-6 sm:right-6 sm:w-96 sm:rounded-2xl sm:border print:hidden">
          <div className="mb-3 flex items-center justify-between">
            <input defaultValue={selected.label} maxLength={40} onBlur={(e) => { const v = e.target.value.trim(); if (v && v !== selected.label) { setTables((ts) => ts.map((t) => (t.id === selected.id ? { ...t, label: v } : t))); start(async () => { await updateTableAction(eventId, selected.id, { label: v }); }); } }} className="rounded-lg px-2 py-1 text-base font-semibold hover:bg-paper focus:bg-paper focus:outline-none" aria-label="Table label" />
            <button onClick={() => setSelTable(null)} className="rounded-full p-1.5 hover:bg-black/5" aria-label="Close"><X className="h-4 w-4" /></button>
          </div>
          <div className="mb-3 flex items-center gap-3 text-sm">
            <label className="flex items-center gap-2">{L("កៅអី", "Seats")}<input type="number" min={1} max={40} defaultValue={selected.capacity} onBlur={(e) => { const c = Number(e.target.value); setTables((ts) => ts.map((t) => (t.id === selected.id ? { ...t, capacity: c } : t))); start(async () => { await updateTableAction(eventId, selected.id, { capacity: c }); }); }} className="h-8 w-16 rounded-lg border border-line-2 px-2" /></label>
            <span className={cn("num", used[selected.id] > selected.capacity && "font-semibold text-danger")}>{used[selected.id]}/{selected.capacity}</span>
            <button className="ml-auto inline-flex items-center gap-1 text-xs text-danger" onClick={() => { if (window.confirm(L("លុបតុនេះ? ភ្ញៀវនឹងត្រលប់ទៅមិនទាន់ចាត់។", "Delete table? Its guests become unassigned."))) start(async () => { await deleteTableAction(eventId, selected.id); setSelTable(null); router.refresh(); }); }}><Trash2 className="h-3.5 w-3.5" />{L("លុប", "Delete")}</button>
          </div>
          <ul className="max-h-56 space-y-1 overflow-y-auto">
            {guests.filter((g) => g.tableId === selected.id).map((g) => (
              <li key={g.id} className="flex items-center justify-between rounded-lg bg-paper px-3 py-1.5 text-sm">
                <span>{g.khmer || g.name} <span className="text-xs text-muted">×{seats(g)}</span></span>
                <button onClick={() => assign([g.id], null)} className="text-muted hover:text-danger" aria-label="Unassign"><X className="h-3.5 w-3.5" /></button>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {/* Print-only seating list */}
      <div className="hidden print:block">
        <h1 className="mb-4 text-2xl font-semibold">{title}</h1>
        {tables.map((t) => (
          <div key={t.id} className="mb-4 break-inside-avoid">
            <h2 className="font-semibold">{t.label} ({used[t.id]}/{t.capacity})</h2>
            <p className="text-sm">{guests.filter((g) => g.tableId === t.id).map((g) => `${g.khmer || g.name} ×${seats(g)}`).join(" · ")}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function Unassigned({ guests, groups, q, setQ, grp, setGrp, L }: { guests: Guest[]; groups: { id: string; name: string }[]; q: string; setQ: (v: string) => void; grp: string; setGrp: (v: string) => void; L: (a: string, b: string) => string }) {
  const { setNodeRef, isOver } = useDroppable({ id: "unassigned" });
  return (
    <aside ref={setNodeRef} className={cn("flex h-[640px] flex-col rounded-2xl border bg-white print:hidden", isOver ? "border-gold" : "border-line")}>
      <div className="space-y-2 border-b border-line p-3">
        <p className="text-sm font-semibold">{L("មិនទាន់ចាត់តុ", "Unassigned")} <span className="text-muted">({guests.length})</span></p>
        <div className="relative"><Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted" /><Input value={q} onChange={(e) => setQ(e.target.value)} className="h-9 pl-8 text-sm" placeholder={L("ស្វែងរក", "Search")} /></div>
        <Select value={grp} onChange={(e) => setGrp(e.target.value)} className="h-9 text-sm"><option value="all">{L("គ្រប់ក្រុម", "All groups")}</option>{groups.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}</Select>
      </div>
      <ul className="flex-1 space-y-1 overflow-y-auto p-2">
        {guests.map((g) => <GuestChip key={g.id} g={g} />)}
      </ul>
    </aside>
  );
}

function GuestChip({ g }: { g: Guest }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: `guest:${g.id}` });
  return (
    <li ref={setNodeRef} {...attributes} {...listeners} style={{ transform: transform ? `translate(${transform.x}px,${transform.y}px)` : undefined }}
      className={cn("flex cursor-grab touch-none items-center justify-between rounded-lg border border-line bg-white px-3 py-2 text-sm", isDragging && "z-50 shadow-lift")}>
      <span className="truncate">{g.khmer || g.name}</span>
      <Badge tone={g.rsvp === "attending" ? "success" : "neutral"}>×{seats(g)}</Badge>
    </li>
  );
}

function TableNode({ t, used, guests, selected, onSelect }: { t: Table; used: number; guests: Guest[]; selected: boolean; onSelect: () => void }) {
  const drag = useDraggable({ id: `table:${t.id}` });
  const drop = useDroppable({ id: `table:${t.id}` });
  const over = used > t.capacity;
  const size = t.shape === "round" ? { w: 130, h: 130 } : { w: 170, h: 100 };
  return (
    <div ref={drag.setNodeRef} style={{ left: t.x, top: t.y, width: size.w, transform: drag.transform ? `translate(${drag.transform.x}px,${drag.transform.y}px)` : undefined }} className="absolute">
      <div ref={drop.setNodeRef} onClick={onSelect} {...drag.attributes} {...drag.listeners}
        className={cn("flex cursor-move touch-none flex-col items-center justify-center border-2 bg-white text-center shadow-soft transition-colors",
          t.shape === "round" ? "rounded-full" : "rounded-2xl", over ? "border-danger bg-danger/5" : drop.isOver ? "border-gold bg-gold-soft" : selected ? "border-ink" : "border-line-2")}
        style={{ height: size.h }} role="button" aria-label={`${t.label} ${used}/${t.capacity}`}>
        {t.isVip ? <Crown className="h-3.5 w-3.5 text-gold" /> : null}
        <span className="max-w-[90%] truncate text-sm font-semibold">{t.label}</span>
        <span className={cn("num text-xs", over ? "font-semibold text-danger" : "text-muted")}>{used}/{t.capacity}</span>
        {guests.length ? <span className="mt-0.5 max-w-[85%] truncate text-[10px] text-muted">{guests.map((g) => g.khmer || g.name).join(", ")}</span> : null}
      </div>
    </div>
  );
}
