"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { Tabs } from "@base-ui/react/tabs";
import gsap from "gsap";
import { AnimatePresence, motion } from "motion/react";
import {
  Archive,
  ArrowUpRight,
  CalendarDays,
  Check,
  Copy,
  Eye,
  LayoutGrid,
  List,
  MapPin,
  MoreHorizontal,
  RotateCcw,
  Search,
  UsersRound,
  X,
} from "lucide-react";
import { setEventArchivedAction } from "@/features/admin/actions";
import { TemplateThumb } from "@/components/marketing/template-thumb";
import { Badge, Button, EmptyState, Input } from "@/components/ui";
import { Dialog, DialogClose } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

export type AdminEventItem = {
  id: string;
  title: string;
  typeLabel: string;
  templateSlug: string;
  templateName: string;
  hasTemplate: boolean;
  ownerEmail: string;
  venueName: string | null;
  dateLabel: string;
  status: "draft" | "published" | "archived" | "deleted";
  publicHref: string | null;
  guestsCount: number;
};

const statusBadgeTone = {
  published: "success",
  draft: "neutral",
  archived: "warning",
  deleted: "danger",
} as const;

const statusLabel = {
  published: "Published",
  draft: "Draft",
  archived: "Archived",
  deleted: "Deleted",
} as const;

function EventPreviewDialog({
  event,
  open,
  onOpenChange,
  onStatusChanged,
}: {
  event: AdminEventItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onStatusChanged: (id: string, nextStatus: "draft" | "published" | "archived") => void;
}) {
  const [previewLocale, setPreviewLocale] = useState<"km" | "en">("km");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    setError(null);
  }, [event]);

  if (!event) return null;

  const isArchived = event.status === "archived";
  const isDeleted = event.status === "deleted";

  const toggleArchive = () => {
    setError(null);
    startTransition(async () => {
      const res = await setEventArchivedAction(event.id, !isArchived);
      if (!res.ok) {
        setError("Could not update event status.");
        return;
      }
      onStatusChanged(event.id, isArchived ? "published" : "archived");
      onOpenChange(false);
    });
  };

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      wide
      title={
        <span className="flex flex-wrap items-center gap-2">
          <span dir="auto">{event.title}</span>
          <Badge tone={statusBadgeTone[event.status]}>{statusLabel[event.status]}</Badge>
        </span>
      }
      description={`${event.typeLabel} · ${event.ownerEmail}`}
    >
      <div className="grid gap-6 sm:grid-cols-[200px_minmax(0,1fr)]">
        {/* Live Template Preview */}
        <div className="flex flex-col items-center gap-2.5 rounded-2xl border border-[#e7e1d5] bg-[#faf8f3] p-3">
          <div className="overflow-hidden rounded-xl border border-[#e7e1d5] bg-white shadow-sm">
            {event.hasTemplate ? (
              <TemplateThumb slug={event.templateSlug} locale={previewLocale} width={170} />
            ) : (
              <div className="grid h-[340px] w-[170px] place-items-center p-4 text-center text-xs text-muted">
                Preview unavailable ({event.templateSlug})
              </div>
            )}
          </div>
          <div className="flex items-center gap-1 rounded-full border border-[#e7e1d5] bg-white p-0.5 text-xs">
            {(["km", "en"] as const).map((loc) => (
              <button
                key={loc}
                type="button"
                onClick={() => setPreviewLocale(loc)}
                className={cn(
                  "rounded-full px-2.5 py-1 font-medium uppercase transition-colors",
                  previewLocale === loc ? "bg-[#241c19] text-white" : "text-muted hover:text-ink",
                )}
              >
                {loc}
              </button>
            ))}
          </div>
          {event.publicHref ? (
            <Link
              href={event.publicHref}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs font-medium text-[#86622f] hover:underline"
            >
              Open public link <ArrowUpRight size={13} aria-hidden="true" />
            </Link>
          ) : (
            <span className="text-[11px] text-muted">No public link</span>
          )}
        </div>

        {/* Event Metadata & Actions */}
        <div className="flex flex-col justify-between space-y-4">
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2.5 rounded-xl border border-[#e7e1d5] bg-[#faf8f3] p-3.5 text-xs">
              <div>
                <p className="text-muted">Template</p>
                <p className="mt-0.5 font-semibold text-ink">{event.templateName}</p>
                <p className="font-mono text-[11px] text-muted">{event.templateSlug}</p>
              </div>
              <div>
                <p className="text-muted">Guests</p>
                <p className="num mt-0.5 text-sm font-semibold text-ink">{event.guestsCount}</p>
              </div>
              <div>
                <p className="text-muted">Event Date</p>
                <p className="mt-0.5 font-medium text-ink">{event.dateLabel}</p>
              </div>
              <div>
                <p className="text-muted">Venue</p>
                <p className="mt-0.5 truncate font-medium text-ink" dir="auto">
                  {event.venueName || "—"}
                </p>
              </div>
            </div>

            <div className="rounded-xl border border-[#e7e1d5] p-3.5 text-xs">
              <p className="text-muted">Event ID</p>
              <p className="mt-0.5 break-all font-mono text-ink-2">{event.id}</p>
            </div>

            {!isDeleted ? (
              <div className="rounded-xl border border-[#e7e1d5] p-3.5">
                <p className="text-sm font-semibold text-ink">
                  {isArchived ? "Restore event" : "Archive event"}
                </p>
                <p className="mt-1 text-xs leading-relaxed text-muted">
                  {isArchived
                    ? "Restore this event to its previous status so invitation links work again."
                    : "Archiving disables all invitation links for this event until restored by an admin."}
                </p>
              </div>
            ) : null}

            {error ? <p role="alert" className="text-xs text-danger">{error}</p> : null}
          </div>

          <div className="flex flex-wrap justify-end gap-2 border-t border-line pt-4">
            <DialogClose asChild>
              <Button type="button" variant="outline" className="rounded-xl" disabled={pending}>
                Close
              </Button>
            </DialogClose>
            {!isDeleted ? (
              <Button
                type="button"
                variant={isArchived ? "primary" : "danger"}
                className="rounded-xl"
                disabled={pending}
                onClick={toggleArchive}
              >
                {isArchived ? <RotateCcw size={14} aria-hidden="true" /> : <Archive size={14} aria-hidden="true" />}
                {pending ? "Saving…" : isArchived ? "Restore event" : "Archive event"}
              </Button>
            ) : null}
          </div>
        </div>
      </div>
    </Dialog>
  );
}

export function AdminEventsWorkspace({
  initialItems,
  initialQuery,
  initialStatus,
}: {
  initialItems: AdminEventItem[];
  initialQuery: string;
  initialStatus: string;
}) {
  const router = useRouter();
  const [items, setItems] = useState<AdminEventItem[]>(initialItems);
  const [query, setQuery] = useState(initialQuery);
  const [status, setStatus] = useState<string>(initialStatus || "all");
  const [viewMode, setViewMode] = useState<"grid" | "table">("grid");
  const [previewLocale, setPreviewLocale] = useState<"km" | "en">("km");
  const [inspecting, setInspecting] = useState<AdminEventItem | null>(null);
  const [toast, setToast] = useState<{ text: string; tone: "ok" | "err" } | null>(null);
  const gridRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setItems(initialItems);
  }, [initialItems]);

  useEffect(() => {
    const el = gridRef.current;
    if (!el || viewMode !== "grid") return;
    const ctx = gsap.context(() => {
      gsap.fromTo(
        ".evt-card",
        { y: 14, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.38, stagger: { amount: 0.25, from: "start" }, ease: "power2.out", clearProps: "transform" },
      );
    }, gridRef);
    return () => ctx.revert();
  }, [viewMode]);

  const showToast = (text: string, tone: "ok" | "err" = "ok") => {
    setToast({ text, tone });
    window.setTimeout(() => {
      setToast((prev) => (prev?.text === text ? null : prev));
    }, 3000);
  };

  const filtered = useMemo(() => {
    const q = query.trim().toLocaleLowerCase();
    return items.filter((item) => {
      if (status !== "all" && item.status !== status) return false;
      if (!q) return true;
      return [item.title, item.ownerEmail, item.templateSlug, item.templateName, item.typeLabel, item.venueName ?? ""]
        .some((v) => v.toLocaleLowerCase().includes(q));
    });
  }, [items, query, status]);

  const copyText = async (val: string, label: string) => {
    try {
      await navigator.clipboard.writeText(val);
      showToast(`Copied ${label}`);
    } catch {
      showToast("Copy failed", "err");
    }
  };

  const hasFilters = Boolean(query.trim() || status !== "all");

  return (
    <div className="space-y-4">
      <AnimatePresence>
        {toast ? (
          <motion.div
            initial={{ opacity: 0, y: -12, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.96 }}
            transition={{ duration: 0.2 }}
            className={cn(
              "fixed top-20 right-6 z-50 flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-medium shadow-lg",
              toast.tone === "ok"
                ? "border-[#cfe3d5] bg-[#f4fbf6] text-[#1f5737]"
                : "border-[#f0c7c7] bg-[#fff5f5] text-[#9b2c2c]",
            )}
          >
            {toast.tone === "ok" ? <Check size={15} aria-hidden="true" /> : <X size={15} aria-hidden="true" />}
            <span>{toast.text}</span>
          </motion.div>
        ) : null}
      </AnimatePresence>

      {/* Filter Card (matching /admin/templates) */}
      <div className="space-y-3 rounded-2xl border border-[#e7e1d5] bg-white p-4 shadow-xs">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="relative flex-1 lg:max-w-md">
            <Search size={15} aria-hidden="true" className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-muted" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search event, organizer, template, or venue..."
              className="h-9 rounded-xl pl-9 pr-8 text-sm"
            />
            {query ? (
              <button
                type="button"
                aria-label="Clear search"
                onClick={() => setQuery("")}
                className="absolute top-1/2 right-2 -translate-y-1/2 rounded-full p-1 text-muted hover:bg-black/5 hover:text-ink"
              >
                <X size={13} aria-hidden="true" />
              </button>
            ) : null}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Preview Locale Toggle */}
            <Tabs.Root value={previewLocale} onValueChange={(v) => setPreviewLocale(v as "km" | "en")}>
              <Tabs.List aria-label="Preview language" className="inline-flex h-9 items-center rounded-xl border border-[#e7e1d5] bg-[#faf8f3] p-0.5">
                {(["km", "en"] as const).map((loc) => (
                  <Tabs.Tab
                    key={loc}
                    value={loc}
                    className={cn(
                      "relative z-10 rounded-lg px-2.5 py-1 text-xs font-medium uppercase transition-colors",
                      previewLocale === loc ? "text-white" : "text-muted hover:text-ink",
                    )}
                  >
                    {previewLocale === loc ? (
                      <motion.span
                        layoutId="evt-locale-pill"
                        transition={{ type: "spring", stiffness: 450, damping: 32 }}
                        className="absolute inset-0 -z-10 rounded-lg bg-[#241c19]"
                      />
                    ) : null}
                    {loc}
                  </Tabs.Tab>
                ))}
              </Tabs.List>
            </Tabs.Root>

            {/* Grid / Table View Switcher */}
            <Tabs.Root value={viewMode} onValueChange={(v) => setViewMode(v as "grid" | "table")}>
              <Tabs.List aria-label="View mode" className="inline-flex h-9 items-center rounded-xl border border-[#e7e1d5] bg-[#faf8f3] p-0.5">
                <Tabs.Tab
                  value="grid"
                  className={cn(
                    "relative z-10 inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium transition-colors",
                    viewMode === "grid" ? "text-[#241c19]" : "text-muted hover:text-ink",
                  )}
                >
                  {viewMode === "grid" ? (
                    <motion.span
                      layoutId="evt-view-pill"
                      transition={{ type: "spring", stiffness: 450, damping: 32 }}
                      className="absolute inset-0 -z-10 rounded-lg bg-white shadow-xs"
                    />
                  ) : null}
                  <LayoutGrid size={14} aria-hidden="true" />
                  Grid
                </Tabs.Tab>
                <Tabs.Tab
                  value="table"
                  className={cn(
                    "relative z-10 inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium transition-colors",
                    viewMode === "table" ? "text-[#241c19]" : "text-muted hover:text-ink",
                  )}
                >
                  {viewMode === "table" ? (
                    <motion.span
                      layoutId="evt-view-pill"
                      transition={{ type: "spring", stiffness: 450, damping: 32 }}
                      className="absolute inset-0 -z-10 rounded-lg bg-white shadow-xs"
                    />
                  ) : null}
                  <List size={14} aria-hidden="true" />
                  Table
                </Tabs.Tab>
              </Tabs.List>
            </Tabs.Root>
          </div>
        </div>

        {/* Segmented Status Filter */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-line pt-3">
          <Tabs.Root value={status} onValueChange={(v) => setStatus(String(v))}>
            <Tabs.List aria-label="Filter by status" className="inline-flex flex-wrap items-center rounded-xl border border-[#e7e1d5] bg-[#faf8f3] p-0.5">
              {(
                [
                  ["all", "All"],
                  ["published", "Published"],
                  ["draft", "Draft"],
                  ["archived", "Archived"],
                  ["deleted", "Deleted"],
                ] as const
              ).map(([key, label]) => (
                <Tabs.Tab
                  key={key}
                  value={key}
                  className={cn(
                    "relative z-10 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors",
                    status === key ? "text-[#241c19]" : "text-muted hover:text-ink",
                  )}
                >
                  {status === key ? (
                    <motion.span
                      layoutId="evt-status-pill"
                      transition={{ type: "spring", stiffness: 450, damping: 32 }}
                      className="absolute inset-0 -z-10 rounded-lg bg-white shadow-xs"
                    />
                  ) : null}
                  {label}
                </Tabs.Tab>
              ))}
            </Tabs.List>
          </Tabs.Root>

          <div className="flex items-center gap-2 text-xs text-muted">
            <span>
              Showing <strong className="font-semibold text-ink">{filtered.length}</strong> of {items.length} events
            </span>
            {hasFilters ? (
              <button
                type="button"
                onClick={() => {
                  setQuery("");
                  setStatus("all");
                }}
                className="inline-flex items-center gap-1 rounded-lg px-2 py-1 font-medium text-[#86622f] hover:bg-[#fcf6e8]"
              >
                <X size={13} aria-hidden="true" />
                Reset
              </button>
            ) : null}
          </div>
        </div>
      </div>

      {/* Empty State */}
      {filtered.length === 0 ? (
        <EmptyState
          icon={<CalendarDays size={30} />}
          title="No matching events"
          body="Try adjusting your search query or status filter."
          action={
            hasFilters ? (
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setQuery("");
                  setStatus("all");
                }}
              >
                Reset filters
              </Button>
            ) : undefined
          }
        />
      ) : viewMode === "grid" ? (
        /* Grid View with Live Preview */
        <div ref={gridRef} className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filtered.map((evt) => (
            <motion.article
              key={evt.id}
              layout
              whileHover={{ y: -3 }}
              transition={{ type: "spring", stiffness: 360, damping: 28 }}
              className="evt-card group flex flex-col overflow-hidden rounded-2xl border border-[#e7e1d5] bg-white shadow-xs transition-shadow hover:shadow-md"
            >
              <div className="relative flex justify-center overflow-hidden border-b border-[#efe9dc] bg-[#f7f4ec] pt-4 pb-3">
                <div className="absolute top-3 left-3 z-10">
                  <Badge tone={statusBadgeTone[evt.status]}>{statusLabel[evt.status]}</Badge>
                </div>
                {evt.publicHref ? (
                  <Link
                    href={evt.publicHref}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={`Open public link for ${evt.title}`}
                    className="absolute top-3 right-3 z-10 grid size-7 place-items-center rounded-full border border-[#e7e1d5] bg-white/90 text-ink-2 backdrop-blur-xs transition-colors hover:bg-white hover:text-ink"
                  >
                    <ArrowUpRight size={13} aria-hidden="true" />
                  </Link>
                ) : null}

                <button
                  type="button"
                  onClick={() => setInspecting(evt)}
                  className="relative overflow-hidden rounded-xl border border-[#e5decb] bg-white shadow-sm transition-transform duration-300 group-hover:scale-[1.02]"
                  aria-label={`Preview ${evt.title}`}
                >
                  {evt.hasTemplate ? (
                    <TemplateThumb slug={evt.templateSlug} locale={previewLocale} width={152} />
                  ) : (
                    <div className="grid h-[304px] w-[152px] place-items-center p-3 text-center text-xs text-muted">
                      {evt.templateName}
                    </div>
                  )}
                </button>
              </div>

              <div className="flex flex-1 flex-col justify-between p-4">
                <div>
                  <h3 className="truncate text-sm font-semibold text-ink" dir="auto" title={evt.title}>
                    {evt.title}
                  </h3>
                  <p className="mt-0.5 truncate text-xs text-muted">{evt.ownerEmail}</p>

                  <div className="mt-3 flex flex-wrap items-center gap-1.5 text-[11px] text-muted">
                    <span className="rounded-md bg-[#f7f5ef] px-2 py-0.5 font-medium text-ink-2">
                      {evt.typeLabel}
                    </span>
                    <span className="num inline-flex items-center gap-1 rounded-md bg-[#f7f5ef] px-2 py-0.5">
                      <UsersRound size={11} aria-hidden="true" />
                      {evt.guestsCount}
                    </span>
                    {evt.venueName ? (
                      <span className="inline-flex max-w-full items-center gap-1 truncate rounded-md bg-[#f7f5ef] px-2 py-0.5" dir="auto">
                        <MapPin size={11} aria-hidden="true" />
                        <span className="truncate">{evt.venueName}</span>
                      </span>
                    ) : null}
                  </div>
                </div>

                <div className="mt-4 flex items-center justify-between gap-2 border-t border-line pt-3">
                  <span className="text-xs text-muted">{evt.dateLabel}</span>
                  <div className="flex items-center gap-1">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-8 rounded-lg px-2.5 text-xs"
                      onClick={() => setInspecting(evt)}
                    >
                      <Eye size={13} aria-hidden="true" />
                      Preview
                    </Button>
                    <EventActionMenu
                      event={evt}
                      onPreview={() => setInspecting(evt)}
                      onFilterOwner={() => setQuery(evt.ownerEmail)}
                      onCopyId={() => copyText(evt.id, "event ID")}
                    />
                  </div>
                </div>
              </div>
            </motion.article>
          ))}
        </div>
      ) : (
        /* Table View with Thumbnails */
        <div className="overflow-hidden rounded-2xl border border-[#e7e1d5] bg-white shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[48rem] border-collapse text-left text-[13px]">
              <thead>
                <tr className="border-b border-[#e7e1d5] bg-[#faf8f3] text-xs font-medium text-muted">
                  <th className="px-4 py-3">Event</th>
                  <th className="px-4 py-3">Organizer</th>
                  <th className="px-4 py-3">Template</th>
                  <th className="px-4 py-3">Guests</th>
                  <th className="px-4 py-3">Event date</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {filtered.map((evt) => (
                  <tr key={evt.id} className="transition-colors hover:bg-[#fcfaf5]">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          onClick={() => setInspecting(evt)}
                          className="shrink-0 overflow-hidden rounded-lg border border-[#e7e1d5] bg-[#faf8f3]"
                          aria-label={`Preview ${evt.title}`}
                        >
                          {evt.hasTemplate ? (
                            <TemplateThumb slug={evt.templateSlug} locale={previewLocale} width={42} />
                          ) : (
                            <div className="grid h-[84px] w-[42px] place-items-center text-[10px] text-muted">—</div>
                          )}
                        </button>
                        <div className="min-w-0">
                          <p className="font-semibold text-ink" dir="auto">{evt.title}</p>
                          <p className="text-xs text-muted">{evt.typeLabel}</p>
                        </div>
                      </div>
                    </td>
                    <td className="max-w-48 break-all px-4 py-3 text-ink-2">{evt.ownerEmail}</td>
                    <td className="px-4 py-3 text-ink-2">{evt.templateName}</td>
                    <td className="num px-4 py-3 text-ink-2">{evt.guestsCount}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-muted">{evt.dateLabel}</td>
                    <td className="px-4 py-3">
                      <Badge tone={statusBadgeTone[evt.status]}>{statusLabel[evt.status]}</Badge>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="inline-flex items-center gap-1">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="h-8 rounded-lg px-2.5 text-xs"
                          onClick={() => setInspecting(evt)}
                        >
                          <Eye size={13} aria-hidden="true" />
                          Preview
                        </Button>
                        <EventActionMenu
                          event={evt}
                          onPreview={() => setInspecting(evt)}
                          onFilterOwner={() => setQuery(evt.ownerEmail)}
                          onCopyId={() => copyText(evt.id, "event ID")}
                        />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <EventPreviewDialog
        event={inspecting}
        open={!!inspecting}
        onOpenChange={(open) => {
          if (!open) setInspecting(null);
        }}
        onStatusChanged={(id, nextStatus) => {
          setItems((prev) => prev.map((e) => (e.id === id ? { ...e, status: nextStatus } : e)));
          showToast(nextStatus === "archived" ? "Event archived" : "Event restored");
          router.refresh();
        }}
      />
    </div>
  );
}

function EventActionMenu({
  event,
  onPreview,
  onFilterOwner,
  onCopyId,
}: {
  event: AdminEventItem;
  onPreview: () => void;
  onFilterOwner: () => void;
  onCopyId: () => void;
}) {
  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button
          type="button"
          aria-label={`More actions for ${event.title}`}
          className="grid size-8 place-items-center rounded-lg border border-[#e7e1d5] bg-white text-ink-2 transition-colors hover:bg-[#faf8f3]"
        >
          <MoreHorizontal size={15} aria-hidden="true" />
        </button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content align="end" sideOffset={6} className="z-50 min-w-48 rounded-xl border border-[#e7e1d5] bg-white p-1.5 shadow-xl">
          <DropdownMenu.Item
            onSelect={onPreview}
            className="flex cursor-pointer items-center gap-2 rounded-lg px-2.5 py-2 text-xs font-medium text-ink outline-none hover:bg-[#faf8f3]"
          >
            <Eye size={14} aria-hidden="true" />
            Preview &amp; Details
          </DropdownMenu.Item>
          {event.publicHref ? (
            <DropdownMenu.Item asChild>
              <Link
                href={event.publicHref}
                target="_blank"
                rel="noopener noreferrer"
                className="flex cursor-pointer items-center gap-2 rounded-lg px-2.5 py-2 text-xs font-medium text-ink outline-none hover:bg-[#faf8f3]"
              >
                <ArrowUpRight size={14} aria-hidden="true" />
                Open Public Link
              </Link>
            </DropdownMenu.Item>
          ) : null}
          <DropdownMenu.Item
            onSelect={onFilterOwner}
            className="flex cursor-pointer items-center gap-2 rounded-lg px-2.5 py-2 text-xs font-medium text-ink outline-none hover:bg-[#faf8f3]"
          >
            <Search size={14} aria-hidden="true" />
            Filter by Organizer
          </DropdownMenu.Item>
          <DropdownMenu.Separator className="my-1 h-px bg-[#efe9dc]" />
          <DropdownMenu.Item
            onSelect={onCopyId}
            className="flex cursor-pointer items-center gap-2 rounded-lg px-2.5 py-2 text-xs font-medium text-ink outline-none hover:bg-[#faf8f3]"
          >
            <Copy size={14} aria-hidden="true" />
            Copy Event ID
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
