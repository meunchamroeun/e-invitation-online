"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { Checkbox } from "@base-ui/react/checkbox";
import { Switch } from "@base-ui/react/switch";
import { Tabs } from "@base-ui/react/tabs";
import { cva } from "class-variance-authority";
import gsap from "gsap";
import { AnimatePresence, motion } from "motion/react";
import {
  ArrowUpRight,
  Check,
  Copy,
  Crown,
  Eye,
  EyeOff,
  Flame,
  LayoutGrid,
  List,
  MoreHorizontal,
  PencilLine,
  Search,
  Sparkles,
  Star,
  X,
} from "lucide-react";
import { bulkUpdateTemplatesAction, updateTemplateFlagsAction } from "@/features/admin/actions";
import { TemplateThumb } from "@/components/marketing/template-thumb";
import { Badge, Button, EmptyState, Field, Input } from "@/components/ui";
import { Dialog, DialogClose } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

export type AdminTemplateItem = {
  slug: string;
  name: string;
  nameKm: string;
  category: string;
  categoryLabel: string;
  family: string;
  style: string;
  color: string;
  version: number;
  tier: "free" | "premium";
  isPublished: boolean;
  isFeatured: boolean;
  popularity: number;
  eventsCount: number;
};

type SortKey = "name" | "usage" | "popularity" | "version";
type TierFilter = "all" | "free" | "premium";
type VisibilityFilter = "all" | "published" | "hidden" | "featured";

const chipVariants = cva(
  "inline-flex h-8 items-center gap-1.5 rounded-full border px-3 text-xs font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#86622f]/40",
  {
    variants: {
      active: {
        true: "border-[#86622f] bg-[#241c19] text-[#fffaf4] shadow-xs",
        false: "border-[#e7e1d5] bg-white text-ink-2 hover:border-[#cbbba0] hover:bg-[#faf8f3]",
      },
    },
    defaultVariants: { active: false },
  },
);

const statCardVariants = cva(
  "relative overflow-hidden rounded-2xl border bg-white p-4 shadow-xs transition-shadow hover:shadow-sm",
  {
    variants: {
      tone: {
        neutral: "border-[#e7e1d5]",
        gold: "border-[#e3d2b4] bg-gradient-to-br from-white to-[#fcf8ef]",
        success: "border-[#d8e7dc] bg-gradient-to-br from-white to-[#f6fbf7]",
      },
    },
    defaultVariants: { tone: "neutral" },
  },
);

function BaseCheckbox({
  checked,
  onCheckedChange,
  label,
}: {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  label: string;
}) {
  return (
    <Checkbox.Root
      checked={checked}
      onCheckedChange={onCheckedChange}
      aria-label={label}
      className={cn(
        "grid size-5 shrink-0 place-items-center rounded-md border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#86622f]/40",
        checked
          ? "border-[#86622f] bg-[#86622f] text-white"
          : "border-[#d5cbb9] bg-white/95 hover:border-[#86622f]",
      )}
    >
      <Checkbox.Indicator className="flex items-center justify-center">
        <Check size={13} strokeWidth={2.5} aria-hidden="true" />
      </Checkbox.Indicator>
    </Checkbox.Root>
  );
}

function BasePublishSwitch({
  checked,
  disabled,
  onCheckedChange,
  label,
}: {
  checked: boolean;
  disabled?: boolean;
  onCheckedChange: (checked: boolean) => void;
  label: string;
}) {
  return (
    <Switch.Root
      checked={checked}
      disabled={disabled}
      onCheckedChange={onCheckedChange}
      aria-label={label}
      className={cn(
        "relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border p-0.5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#86622f]/40 disabled:cursor-not-allowed disabled:opacity-50",
        checked ? "border-[#2e6b48] bg-[#2e6b48]" : "border-[#d5cbb9] bg-[#ebe5d9]",
      )}
    >
      <Switch.Thumb
        className={cn(
          "block size-4.5 rounded-full bg-white shadow-xs transition-transform duration-200",
          checked ? "translate-x-5" : "translate-x-0",
        )}
      />
    </Switch.Root>
  );
}

function TemplateEditDialog({
  template,
  open,
  onOpenChange,
  onSaved,
}: {
  template: AdminTemplateItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: (message: string, patch: Partial<AdminTemplateItem>) => void;
}) {
  const [tier, setTier] = useState<"free" | "premium">(template?.tier ?? "free");
  const [isPublished, setIsPublished] = useState(template?.isPublished ?? true);
  const [isFeatured, setIsFeatured] = useState(template?.isFeatured ?? false);
  const [popularity, setPopularity] = useState(String(template?.popularity ?? 0));
  const [previewLocale, setPreviewLocale] = useState<"km" | "en">("km");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (!template) return;
    setTier(template.tier);
    setIsPublished(template.isPublished);
    setIsFeatured(template.isFeatured);
    setPopularity(String(template.popularity));
    setError(null);
  }, [template]);

  if (!template) return null;

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const pop = Math.max(0, Math.min(10_000, Math.round(Number(popularity) || 0)));
    startTransition(async () => {
      const res = await updateTemplateFlagsAction(template.slug, {
        tier,
        isPublished,
        isFeatured,
        popularity: pop,
      });
      if (!res.ok) {
        setError("Could not update template settings.");
        return;
      }
      onSaved(`Saved "${template.name}"`, {
        tier,
        isPublished,
        isFeatured,
        popularity: pop,
      });
      onOpenChange(false);
    });
  };

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      wide
      title={
        <span className="flex items-center gap-2">
          <span>{template.name}</span>
          <Badge tone={tier === "premium" ? "gold" : "neutral"}>
            {tier === "premium" ? "Premium" : "Free"}
          </Badge>
        </span>
      }
      description={
        <span lang="km" className="text-muted">
          {template.nameKm} · {template.categoryLabel} · v{template.version}
        </span>
      }
    >
      <div className="grid gap-6 sm:grid-cols-[200px_minmax(0,1fr)]">
        <div className="flex flex-col items-center gap-2.5 rounded-2xl border border-[#e7e1d5] bg-[#faf8f3] p-3">
          <div className="overflow-hidden rounded-xl border border-[#e7e1d5] bg-white shadow-sm">
            <TemplateThumb slug={template.slug} locale={previewLocale} width={170} />
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
          <Link
            href={`/t/${template.slug}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs font-medium text-[#86622f] hover:underline"
          >
            Open full preview <ArrowUpRight size={13} aria-hidden="true" />
          </Link>
        </div>

        <form onSubmit={submit} className="flex flex-col justify-between space-y-4">
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-2 rounded-xl border border-[#e7e1d5] bg-[#faf8f3] p-3 text-xs">
              <div>
                <p className="text-muted">Slug</p>
                <p className="mt-0.5 truncate font-mono font-medium text-ink">{template.slug}</p>
              </div>
              <div>
                <p className="text-muted">Style</p>
                <p className="mt-0.5 capitalize font-medium text-ink">{template.style}</p>
              </div>
              <div>
                <p className="text-muted">Active Events</p>
                <p className="num mt-0.5 font-semibold text-ink">{template.eventsCount}</p>
              </div>
            </div>

            <Field label="Access tier">
              <div className="grid grid-cols-2 gap-2">
                {(["free", "premium"] as const).map((option) => (
                  <button
                    key={option}
                    type="button"
                    disabled={pending}
                    onClick={() => setTier(option)}
                    className={cn(
                      "flex h-11 items-center justify-center gap-2 rounded-xl border text-sm font-medium transition-all",
                      tier === option
                        ? option === "premium"
                          ? "border-[#86622f] bg-[#fcf6e8] text-[#6d4d20] ring-2 ring-[#86622f]/20"
                          : "border-[#241c19] bg-[#241c19] text-white"
                        : "border-[#e7e1d5] bg-white text-ink-2 hover:bg-[#faf8f3]",
                    )}
                  >
                    {option === "premium" ? <Crown size={15} aria-hidden="true" /> : <Sparkles size={15} aria-hidden="true" />}
                    {option === "premium" ? "Premium" : "Free"}
                  </button>
                ))}
              </div>
            </Field>

            <Field label="Popularity score" hint="Higher appears first in catalog">
              <Input
                type="number"
                min={0}
                max={10000}
                step={1}
                value={popularity}
                disabled={pending}
                onChange={(e) => setPopularity(e.target.value)}
              />
            </Field>

            <div className="space-y-3 rounded-xl border border-[#e7e1d5] p-3.5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-medium text-ink">Published in catalog</p>
                  <p className="text-xs text-muted">Visible to users when picking a template</p>
                </div>
                <BasePublishSwitch
                  checked={isPublished}
                  disabled={pending}
                  onCheckedChange={setIsPublished}
                  label="Published in catalog"
                />
              </div>

              <div className="border-t border-line pt-3 flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-medium text-ink">Featured placement</p>
                  <p className="text-xs text-muted">Highlight with a featured badge on /templates</p>
                </div>
                <Switch.Root
                  checked={isFeatured}
                  disabled={pending}
                  onCheckedChange={setIsFeatured}
                  aria-label="Featured placement"
                  className={cn(
                    "relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border p-0.5 transition-colors",
                    isFeatured ? "border-[#b8862d] bg-[#c79538]" : "border-[#d5cbb9] bg-[#ebe5d9]",
                  )}
                >
                  <Switch.Thumb
                    className={cn(
                      "block size-4.5 rounded-full bg-white shadow-xs transition-transform duration-200",
                      isFeatured ? "translate-x-5" : "translate-x-0",
                    )}
                  />
                </Switch.Root>
              </div>
            </div>

            {error ? <p role="alert" className="text-xs text-danger">{error}</p> : null}
          </div>

          <div className="flex justify-end gap-2 border-t border-line pt-4">
            <DialogClose asChild>
              <Button type="button" variant="outline" className="rounded-xl" disabled={pending}>
                Cancel
              </Button>
            </DialogClose>
            <Button type="submit" className="rounded-xl" disabled={pending}>
              {pending ? "Saving…" : "Save changes"}
            </Button>
          </div>
        </form>
      </div>
    </Dialog>
  );
}

export function AdminTemplatesWorkspace({ initialItems }: { initialItems: AdminTemplateItem[] }) {
  const router = useRouter();
  const [items, setItems] = useState<AdminTemplateItem[]>(initialItems);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");
  const [tier, setTier] = useState<TierFilter>("all");
  const [visibility, setVisibility] = useState<VisibilityFilter>("all");
  const [sortBy, setSortBy] = useState<SortKey>("name");
  const [viewMode, setViewMode] = useState<"grid" | "table">("grid");
  const [previewLocale, setPreviewLocale] = useState<"km" | "en">("km");
  const [selectedSlugs, setSelectedSlugs] = useState<string[]>([]);
  const [editing, setEditing] = useState<AdminTemplateItem | null>(null);
  const [toast, setToast] = useState<{ text: string; tone: "ok" | "err" } | null>(null);
  const [busySlug, setBusySlug] = useState<string | null>(null);
  const [bulkPending, startBulkTransition] = useTransition();

  const statsRef = useRef<HTMLDivElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setItems(initialItems);
  }, [initialItems]);

  // GSAP entrance & number count-up for KPI summary cards
  useEffect(() => {
    const el = statsRef.current;
    if (!el) return;
    const ctx = gsap.context(() => {
      gsap.fromTo(
        ".kpi-card",
        { y: 14, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.45, stagger: 0.06, ease: "power2.out", clearProps: "transform" },
      );
      el.querySelectorAll<HTMLElement>("[data-count]").forEach((node) => {
        const target = Number(node.dataset.count ?? 0);
        const state = { val: 0 };
        gsap.to(state, {
          val: target,
          duration: 0.65,
          ease: "power2.out",
          onUpdate: () => {
            node.textContent = String(Math.round(state.val));
          },
        });
      });
    }, statsRef);
    return () => ctx.revert();
  }, []);

  // GSAP staggered entrance for grid cards when switching to grid view
  useEffect(() => {
    const el = gridRef.current;
    if (!el || viewMode !== "grid") return;
    const ctx = gsap.context(() => {
      gsap.fromTo(
        ".tpl-card",
        { y: 16, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.4, stagger: { amount: 0.28, from: "start" }, ease: "power2.out", clearProps: "transform" },
      );
    }, gridRef);
    return () => ctx.revert();
  }, [viewMode]);

  const showToast = (text: string, tone: "ok" | "err" = "ok") => {
    setToast({ text, tone });
    window.setTimeout(() => {
      setToast((prev) => (prev?.text === text ? null : prev));
    }, 3200);
  };

  const categories = useMemo(() => {
    const map = new Map<string, string>();
    for (const item of items) {
      map.set(item.category, item.categoryLabel);
    }
    return Array.from(map.entries());
  }, [items]);

  const stats = useMemo(() => {
    const published = items.filter((i) => i.isPublished).length;
    const featured = items.filter((i) => i.isFeatured).length;
    const premium = items.filter((i) => i.tier === "premium").length;
    const totalEvents = items.reduce((sum, i) => sum + i.eventsCount, 0);
    return { total: items.length, published, featured, premium, totalEvents };
  }, [items]);

  const filtered = useMemo(() => {
    const q = query.trim().toLocaleLowerCase();
    return items
      .filter((item) => {
        if (category !== "all" && item.category !== category) return false;
        if (tier !== "all" && item.tier !== tier) return false;
        if (visibility === "published" && !item.isPublished) return false;
        if (visibility === "hidden" && item.isPublished) return false;
        if (visibility === "featured" && !item.isFeatured) return false;
        if (!q) return true;
        return [item.name, item.nameKm, item.slug, item.categoryLabel, item.style]
          .some((v) => v.toLocaleLowerCase().includes(q));
      })
      .sort((a, b) => {
        if (sortBy === "usage") return b.eventsCount - a.eventsCount || a.name.localeCompare(b.name);
        if (sortBy === "popularity") return b.popularity - a.popularity || a.name.localeCompare(b.name);
        if (sortBy === "version") return b.version - a.version || a.name.localeCompare(b.name);
        return a.name.localeCompare(b.name);
      });
  }, [items, query, category, tier, visibility, sortBy]);

  const allVisibleSelected =
    filtered.length > 0 && filtered.every((item) => selectedSlugs.includes(item.slug));

  const toggleSelect = (slug: string, checked: boolean) => {
    setSelectedSlugs((prev) =>
      checked ? (prev.includes(slug) ? prev : [...prev, slug]) : prev.filter((s) => s !== slug),
    );
  };

  const toggleSelectAllVisible = (checked: boolean) => {
    if (!checked) {
      const visibleSet = new Set(filtered.map((i) => i.slug));
      setSelectedSlugs((prev) => prev.filter((s) => !visibleSet.has(s)));
      return;
    }
    setSelectedSlugs((prev) => Array.from(new Set([...prev, ...filtered.map((i) => i.slug)])));
  };

  const quickPatch = async (
    slug: string,
    patch: { isPublished?: boolean; isFeatured?: boolean; tier?: "free" | "premium" },
    successText: string,
  ) => {
    const previous = items.find((i) => i.slug === slug);
    if (!previous) return;
    setBusySlug(slug);
    setItems((prev) => prev.map((i) => (i.slug === slug ? { ...i, ...patch } : i)));
    const res = await updateTemplateFlagsAction(slug, patch);
    setBusySlug(null);
    if (!res.ok) {
      setItems((prev) => prev.map((i) => (i.slug === slug ? previous : i)));
      showToast("Update failed. Please try again.", "err");
      return;
    }
    showToast(successText);
    router.refresh();
  };

  const runBulk = (
    patch: { isPublished?: boolean; isFeatured?: boolean; tier?: "free" | "premium" },
    label: string,
  ) => {
    if (selectedSlugs.length === 0) return;
    const targets = [...selectedSlugs];
    startBulkTransition(async () => {
      const res = await bulkUpdateTemplatesAction(targets, patch);
      if (!res.ok) {
        showToast("Bulk update failed.", "err");
        return;
      }
      setItems((prev) => prev.map((i) => (targets.includes(i.slug) ? { ...i, ...patch } : i)));
      setSelectedSlugs([]);
      showToast(`${label} (${targets.length} templates)`);
      router.refresh();
    });
  };

  const copySlug = async (slug: string) => {
    try {
      await navigator.clipboard.writeText(slug);
      showToast(`Copied "${slug}"`);
    } catch {
      showToast("Could not copy slug", "err");
    }
  };

  return (
    <div className="space-y-6 pb-20">
      {/* Live toast notification */}
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

      {/* KPI Summary Strip (GSAP animated) */}
      <div ref={statsRef} className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <div className={cn("kpi-card", statCardVariants({ tone: "neutral" }))}>
          <p className="text-xs font-medium text-muted">Total Templates</p>
          <p className="num mt-2 text-2xl font-semibold tracking-tight text-ink" data-count={stats.total}>
            {stats.total}
          </p>
          <p className="mt-1 text-xs text-muted">{stats.premium} premium · {stats.total - stats.premium} free</p>
        </div>

        <div className={cn("kpi-card", statCardVariants({ tone: "success" }))}>
          <p className="text-xs font-medium text-[#2c6644]">Published</p>
          <p className="num mt-2 text-2xl font-semibold tracking-tight text-ink" data-count={stats.published}>
            {stats.published}
          </p>
          <p className="mt-1 text-xs text-muted">{stats.total - stats.published} hidden from catalog</p>
        </div>

        <div className={cn("kpi-card", statCardVariants({ tone: "gold" }))}>
          <p className="text-xs font-medium text-[#86622f]">Featured</p>
          <p className="num mt-2 text-2xl font-semibold tracking-tight text-ink" data-count={stats.featured}>
            {stats.featured}
          </p>
          <p className="mt-1 text-xs text-muted">Promoted in template picker</p>
        </div>

        <div className={cn("kpi-card", statCardVariants({ tone: "neutral" }))}>
          <p className="text-xs font-medium text-muted">Events Using Templates</p>
          <p className="num mt-2 text-2xl font-semibold tracking-tight text-ink" data-count={stats.totalEvents}>
            {stats.totalEvents}
          </p>
          <p className="mt-1 text-xs text-muted">Live invitations & drafts</p>
        </div>
      </div>

      {/* Filter & View Controls */}
      <div className="space-y-3 rounded-2xl border border-[#e7e1d5] bg-white p-4 shadow-xs">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="relative flex-1 lg:max-w-md">
            <Search
              size={16}
              aria-hidden="true"
              className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-muted"
            />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by name, Khmer title, slug, style..."
              className="h-10 pl-10 pr-9 text-sm"
            />
            {query ? (
              <button
                type="button"
                aria-label="Clear search"
                onClick={() => setQuery("")}
                className="absolute top-1/2 right-2.5 -translate-y-1/2 rounded-full p-1 text-muted hover:bg-black/5 hover:text-ink"
              >
                <X size={14} aria-hidden="true" />
              </button>
            ) : null}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Sort select */}
            <label className="sr-only" htmlFor="tpl-sort">Sort templates</label>
            <select
              id="tpl-sort"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortKey)}
              className="h-9 rounded-xl border border-[#e7e1d5] bg-[#faf8f3] px-3 text-xs font-medium text-ink-2 focus:border-[#86622f] focus:outline-none"
            >
              <option value="name">Sort: Name (A–Z)</option>
              <option value="usage">Sort: Most Used</option>
              <option value="popularity">Sort: Popularity</option>
              <option value="version">Sort: Version</option>
            </select>

            {/* Preview Locale Toggle (Base UI Tabs) */}
            <Tabs.Root value={previewLocale} onValueChange={(v) => setPreviewLocale(v as "km" | "en")}>
              <Tabs.List
                aria-label="Preview language"
                className="inline-flex h-9 items-center rounded-xl border border-[#e7e1d5] bg-[#faf8f3] p-0.5"
              >
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
                        layoutId="tpl-locale-pill"
                        transition={{ type: "spring", stiffness: 450, damping: 32 }}
                        className="absolute inset-0 -z-10 rounded-lg bg-[#241c19]"
                      />
                    ) : null}
                    {loc}
                  </Tabs.Tab>
                ))}
              </Tabs.List>
            </Tabs.Root>

            {/* View Switcher (Base UI Tabs + Motion layoutId) */}
            <Tabs.Root value={viewMode} onValueChange={(v) => setViewMode(v as "grid" | "table")}>
              <Tabs.List
                aria-label="View mode"
                className="inline-flex h-9 items-center rounded-xl border border-[#e7e1d5] bg-[#faf8f3] p-0.5"
              >
                <Tabs.Tab
                  value="grid"
                  className={cn(
                    "relative z-10 inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium transition-colors",
                    viewMode === "grid" ? "text-[#241c19]" : "text-muted hover:text-ink",
                  )}
                >
                  {viewMode === "grid" ? (
                    <motion.span
                      layoutId="tpl-view-pill"
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
                      layoutId="tpl-view-pill"
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

        {/* Category + Visibility + Tier Chips */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line pt-3">
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={() => setCategory("all")}
              className={chipVariants({ active: category === "all" })}
            >
              All Categories
            </button>
            {categories.map(([key, label]) => (
              <button
                key={key}
                type="button"
                onClick={() => setCategory(key)}
                className={chipVariants({ active: category === key })}
              >
                {label}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            {(
              [
                ["all", "All"],
                ["published", "Published"],
                ["hidden", "Hidden"],
                ["featured", "Featured"],
              ] as const
            ).map(([key, label]) => (
              <button
                key={key}
                type="button"
                onClick={() => setVisibility(key)}
                className={chipVariants({ active: visibility === key })}
              >
                {label}
              </button>
            ))}

            <span aria-hidden="true" className="mx-1 h-4 w-px bg-[#e7e1d5]" />

            {(
              [
                ["all", "Any Tier"],
                ["free", "Free"],
                ["premium", "Premium"],
              ] as const
            ).map(([key, label]) => (
              <button
                key={key}
                type="button"
                onClick={() => setTier(key)}
                className={chipVariants({ active: tier === key })}
              >
                {key === "premium" ? <Crown size={12} aria-hidden="true" /> : null}
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Selection header */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-line pt-2.5 text-xs text-muted">
          <div className="flex items-center gap-2.5">
            <BaseCheckbox
              checked={allVisibleSelected}
              onCheckedChange={toggleSelectAllVisible}
              label="Select all visible templates"
            />
            <span>
              Showing <strong className="font-semibold text-ink">{filtered.length}</strong> of {items.length} templates
            </span>
          </div>
          {selectedSlugs.length > 0 ? (
            <button
              type="button"
              onClick={() => setSelectedSlugs([])}
              className="font-medium text-[#86622f] hover:underline"
            >
              Clear {selectedSlugs.length} selected
            </button>
          ) : null}
        </div>
      </div>

      {/* Empty State */}
      {filtered.length === 0 ? (
        <EmptyState
          icon={<Search size={30} />}
          title="No matching templates"
          body="Try adjusting your search query or clearing the active category and visibility filters."
          action={
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setQuery("");
                setCategory("all");
                setTier("all");
                setVisibility("all");
              }}
            >
              Reset all filters
            </Button>
          }
        />
      ) : viewMode === "grid" ? (
        /* Grid View */
        <div
          ref={gridRef}
          className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
        >
          {filtered.map((tpl) => {
            const selected = selectedSlugs.includes(tpl.slug);
            const isBusy = busySlug === tpl.slug;
            return (
              <motion.article
                key={tpl.slug}
                layout
                whileHover={{ y: -3 }}
                transition={{ type: "spring", stiffness: 360, damping: 28 }}
                className={cn(
                  "tpl-card group flex flex-col overflow-hidden rounded-2xl border bg-white shadow-xs transition-shadow hover:shadow-md",
                  selected ? "border-[#86622f] ring-2 ring-[#86622f]/20" : "border-[#e7e1d5]",
                  !tpl.isPublished ? "opacity-80" : "",
                )}
              >
                {/* Preview Thumbnail Header */}
                <div className="relative flex justify-center overflow-hidden border-b border-[#efe9dc] bg-[#f7f4ec] pt-4 pb-3">
                  <div className="absolute top-3 left-3 z-10">
                    <BaseCheckbox
                      checked={selected}
                      onCheckedChange={(checked) => toggleSelect(tpl.slug, checked)}
                      label={`Select ${tpl.name}`}
                    />
                  </div>

                  <div className="absolute top-3 right-3 z-10 flex items-center gap-1">
                    <button
                      type="button"
                      disabled={isBusy}
                      aria-label={tpl.isFeatured ? `Unfeature ${tpl.name}` : `Feature ${tpl.name}`}
                      onClick={() =>
                        quickPatch(
                          tpl.slug,
                          { isFeatured: !tpl.isFeatured },
                          tpl.isFeatured ? `Removed featured from "${tpl.name}"` : `Featured "${tpl.name}"`,
                        )
                      }
                      className={cn(
                        "grid size-7 place-items-center rounded-full border backdrop-blur-xs transition-colors",
                        tpl.isFeatured
                          ? "border-[#d4a84f] bg-[#fdf5e2] text-[#9b6c16]"
                          : "border-[#e7e1d5] bg-white/90 text-muted hover:text-[#9b6c16]",
                      )}
                    >
                      <Star size={13} className={tpl.isFeatured ? "fill-current" : ""} aria-hidden="true" />
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={() => setEditing(tpl)}
                    className="relative overflow-hidden rounded-xl border border-[#e5decb] bg-white shadow-sm transition-transform duration-300 group-hover:scale-[1.02]"
                    aria-label={`Inspect and edit ${tpl.name}`}
                  >
                    <TemplateThumb slug={tpl.slug} locale={previewLocale} width={156} />
                    {!tpl.isPublished ? (
                      <div className="absolute inset-0 grid place-items-center bg-black/35 backdrop-blur-[1px]">
                        <span className="inline-flex items-center gap-1 rounded-full bg-black/75 px-2.5 py-1 text-[11px] font-medium text-white">
                          <EyeOff size={12} aria-hidden="true" /> Hidden
                        </span>
                      </div>
                    ) : null}
                  </button>
                </div>

                {/* Card Body */}
                <div className="flex flex-1 flex-col justify-between p-4">
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <h3 className="truncate text-sm font-semibold text-ink">{tpl.name}</h3>
                        <p className="mt-0.5 truncate text-xs text-muted" lang="km">
                          {tpl.nameKm}
                        </p>
                      </div>
                      <Badge tone={tpl.tier === "premium" ? "gold" : "neutral"} className="shrink-0">
                        {tpl.tier === "premium" ? "Premium" : "Free"}
                      </Badge>
                    </div>

                    <div className="mt-3 flex flex-wrap items-center gap-1.5 text-[11px] text-muted">
                      <span className="rounded-md bg-[#f7f5ef] px-2 py-0.5 font-medium text-ink-2">
                        {tpl.categoryLabel}
                      </span>
                      <span className="num rounded-md bg-[#f7f5ef] px-2 py-0.5">v{tpl.version}</span>
                      <span className="num inline-flex items-center gap-1 rounded-md bg-[#f7f5ef] px-2 py-0.5">
                        <Flame size={11} className="text-[#b8732a]" aria-hidden="true" />
                        {tpl.eventsCount} uses
                      </span>
                    </div>
                  </div>

                  {/* Card Footer Actions */}
                  <div className="mt-4 flex items-center justify-between gap-2 border-t border-line pt-3">
                    <div className="flex items-center gap-2">
                      <BasePublishSwitch
                        checked={tpl.isPublished}
                        disabled={isBusy}
                        onCheckedChange={(checked) =>
                          quickPatch(
                            tpl.slug,
                            { isPublished: checked },
                            checked ? `Published "${tpl.name}"` : `Hidden "${tpl.name}"`,
                          )
                        }
                        label={`Toggle visibility for ${tpl.name}`}
                      />
                      <span className="text-xs font-medium text-ink-2">
                        {tpl.isPublished ? "Live" : "Hidden"}
                      </span>
                    </div>

                    <div className="flex items-center gap-1">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-8 rounded-lg px-2.5 text-xs"
                        onClick={() => setEditing(tpl)}
                      >
                        <PencilLine size={13} aria-hidden="true" />
                        Edit
                      </Button>

                      <TemplateActionMenu
                        template={tpl}
                        onEdit={() => setEditing(tpl)}
                        onToggleTier={() =>
                          quickPatch(
                            tpl.slug,
                            { tier: tpl.tier === "premium" ? "free" : "premium" },
                            `Set "${tpl.name}" to ${tpl.tier === "premium" ? "Free" : "Premium"}`,
                          )
                        }
                        onToggleFeatured={() =>
                          quickPatch(
                            tpl.slug,
                            { isFeatured: !tpl.isFeatured },
                            tpl.isFeatured ? `Unfeatured "${tpl.name}"` : `Featured "${tpl.name}"`,
                          )
                        }
                        onCopySlug={() => copySlug(tpl.slug)}
                      />
                    </div>
                  </div>
                </div>
              </motion.article>
            );
          })}
        </div>
      ) : (
        /* Table View */
        <div className="overflow-hidden rounded-2xl border border-[#e7e1d5] bg-white shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[48rem] border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-[#e7e1d5] bg-[#faf8f3] text-xs font-medium text-muted">
                  <th className="w-10 px-4 py-3">
                    <BaseCheckbox
                      checked={allVisibleSelected}
                      onCheckedChange={toggleSelectAllVisible}
                      label="Select all templates"
                    />
                  </th>
                  <th className="px-4 py-3">Template</th>
                  <th className="px-4 py-3">Category</th>
                  <th className="px-4 py-3">Tier</th>
                  <th className="px-4 py-3">Usage</th>
                  <th className="px-4 py-3">Popularity</th>
                  <th className="px-4 py-3">Featured</th>
                  <th className="px-4 py-3">Published</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {filtered.map((tpl) => {
                  const selected = selectedSlugs.includes(tpl.slug);
                  const isBusy = busySlug === tpl.slug;
                  return (
                    <tr
                      key={tpl.slug}
                      className={cn(
                        "transition-colors hover:bg-[#fcfaf5]",
                        selected ? "bg-[#fcf8ef]" : "",
                      )}
                    >
                      <td className="px-4 py-3">
                        <BaseCheckbox
                          checked={selected}
                          onCheckedChange={(checked) => toggleSelect(tpl.slug, checked)}
                          label={`Select ${tpl.name}`}
                        />
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <button
                            type="button"
                            onClick={() => setEditing(tpl)}
                            className="shrink-0 overflow-hidden rounded-lg border border-[#e7e1d5] bg-[#faf8f3]"
                            aria-label={`Preview ${tpl.name}`}
                          >
                            <TemplateThumb slug={tpl.slug} locale={previewLocale} width={44} />
                          </button>
                          <div className="min-w-0">
                            <p className="font-semibold text-ink">{tpl.name}</p>
                            <p className="text-xs text-muted" lang="km">{tpl.nameKm}</p>
                            <p className="font-mono text-[11px] text-muted">{tpl.slug} · v{tpl.version}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-ink-2">{tpl.categoryLabel}</td>
                      <td className="px-4 py-3">
                        <button
                          type="button"
                          disabled={isBusy}
                          onClick={() =>
                            quickPatch(
                              tpl.slug,
                              { tier: tpl.tier === "premium" ? "free" : "premium" },
                              `Set "${tpl.name}" to ${tpl.tier === "premium" ? "Free" : "Premium"}`,
                            )
                          }
                          className="cursor-pointer"
                          title="Click to toggle Free/Premium"
                        >
                          <Badge tone={tpl.tier === "premium" ? "gold" : "neutral"}>
                            {tpl.tier === "premium" ? "Premium" : "Free"}
                          </Badge>
                        </button>
                      </td>
                      <td className="num px-4 py-3 text-ink-2">{tpl.eventsCount}</td>
                      <td className="num px-4 py-3 text-ink-2">{tpl.popularity}</td>
                      <td className="px-4 py-3">
                        <button
                          type="button"
                          disabled={isBusy}
                          aria-label={tpl.isFeatured ? `Unfeature ${tpl.name}` : `Feature ${tpl.name}`}
                          onClick={() =>
                            quickPatch(
                              tpl.slug,
                              { isFeatured: !tpl.isFeatured },
                              tpl.isFeatured ? `Removed featured from "${tpl.name}"` : `Featured "${tpl.name}"`,
                            )
                          }
                          className={cn(
                            "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium transition-colors",
                            tpl.isFeatured
                              ? "bg-[#fdf5e2] text-[#9b6c16]"
                              : "bg-black/[.04] text-muted hover:text-ink",
                          )}
                        >
                          <Star size={12} className={tpl.isFeatured ? "fill-current" : ""} aria-hidden="true" />
                          {tpl.isFeatured ? "Featured" : "Standard"}
                        </button>
                      </td>
                      <td className="px-4 py-3">
                        <BasePublishSwitch
                          checked={tpl.isPublished}
                          disabled={isBusy}
                          onCheckedChange={(checked) =>
                            quickPatch(
                              tpl.slug,
                              { isPublished: checked },
                              checked ? `Published "${tpl.name}"` : `Hidden "${tpl.name}"`,
                            )
                          }
                          label={`Toggle visibility for ${tpl.name}`}
                        />
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="inline-flex items-center gap-1">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="h-8 rounded-lg px-2.5 text-xs"
                            onClick={() => setEditing(tpl)}
                          >
                            <PencilLine size={13} aria-hidden="true" />
                            Edit
                          </Button>
                          <TemplateActionMenu
                            template={tpl}
                            onEdit={() => setEditing(tpl)}
                            onToggleTier={() =>
                              quickPatch(
                                tpl.slug,
                                { tier: tpl.tier === "premium" ? "free" : "premium" },
                                `Set "${tpl.name}" to ${tpl.tier === "premium" ? "Free" : "Premium"}`,
                              )
                            }
                            onToggleFeatured={() =>
                              quickPatch(
                                tpl.slug,
                                { isFeatured: !tpl.isFeatured },
                                tpl.isFeatured ? `Unfeatured "${tpl.name}"` : `Featured "${tpl.name}"`,
                              )
                            }
                            onCopySlug={() => copySlug(tpl.slug)}
                          />
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Floating Bulk Action Bar (Motion AnimatePresence) */}
      <AnimatePresence>
        {selectedSlugs.length > 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 24, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 24, scale: 0.96 }}
            transition={{ type: "spring", stiffness: 400, damping: 30 }}
            className="fixed bottom-5 left-1/2 z-40 flex w-[calc(100%-2rem)] max-w-2xl -translate-x-1/2 flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#3d312a] bg-[#241c19] px-4 py-3 text-white shadow-2xl"
          >
            <div className="flex items-center gap-2.5 text-sm">
              <span className="grid size-6 place-items-center rounded-full bg-[#ead7b6] text-xs font-bold text-[#241c19]">
                {selectedSlugs.length}
              </span>
              <span className="font-medium">selected</span>
            </div>

            <div className="flex flex-wrap items-center gap-1.5">
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={bulkPending}
                onClick={() => runBulk({ isPublished: true }, "Published")}
                className="h-8 rounded-lg border-white/20 bg-white/10 text-xs text-white hover:bg-white/20"
              >
                <Eye size={13} aria-hidden="true" /> Publish
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={bulkPending}
                onClick={() => runBulk({ isPublished: false }, "Hidden")}
                className="h-8 rounded-lg border-white/20 bg-white/10 text-xs text-white hover:bg-white/20"
              >
                <EyeOff size={13} aria-hidden="true" /> Hide
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={bulkPending}
                onClick={() => runBulk({ isFeatured: true }, "Featured")}
                className="h-8 rounded-lg border-white/20 bg-white/10 text-xs text-white hover:bg-white/20"
              >
                <Star size={13} aria-hidden="true" /> Feature
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={bulkPending}
                onClick={() => runBulk({ tier: "premium" }, "Set to Premium")}
                className="h-8 rounded-lg border-white/20 bg-white/10 text-xs text-white hover:bg-white/20"
              >
                <Crown size={13} aria-hidden="true" /> Premium
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={bulkPending}
                onClick={() => runBulk({ tier: "free" }, "Set to Free")}
                className="h-8 rounded-lg border-white/20 bg-white/10 text-xs text-white hover:bg-white/20"
              >
                Free
              </Button>
              <button
                type="button"
                aria-label="Clear selection"
                onClick={() => setSelectedSlugs([])}
                className="ml-1 rounded-lg p-1.5 text-white/70 hover:bg-white/10 hover:text-white"
              >
                <X size={15} aria-hidden="true" />
              </button>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>

      {/* Edit & Live Preview Dialog (Radix Dialog) */}
      <TemplateEditDialog
        template={editing}
        open={!!editing}
        onOpenChange={(open) => {
          if (!open) setEditing(null);
        }}
        onSaved={(message, patch) => {
          if (!editing) return;
          const slug = editing.slug;
          setItems((prev) => prev.map((i) => (i.slug === slug ? { ...i, ...patch } : i)));
          showToast(message);
          router.refresh();
        }}
      />
    </div>
  );
}

function TemplateActionMenu({
  template,
  onEdit,
  onToggleTier,
  onToggleFeatured,
  onCopySlug,
}: {
  template: AdminTemplateItem;
  onEdit: () => void;
  onToggleTier: () => void;
  onToggleFeatured: () => void;
  onCopySlug: () => void;
}) {
  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button
          type="button"
          aria-label={`More actions for ${template.name}`}
          className="grid size-8 place-items-center rounded-lg border border-[#e7e1d5] bg-white text-ink-2 transition-colors hover:bg-[#faf8f3]"
        >
          <MoreHorizontal size={15} aria-hidden="true" />
        </button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="end"
          sideOffset={6}
          className="z-50 min-w-48 rounded-xl border border-[#e7e1d5] bg-white p-1.5 text-sm shadow-xl"
        >
          <DropdownMenu.Item
            onSelect={onEdit}
            className="flex cursor-pointer items-center gap-2 rounded-lg px-2.5 py-2 text-xs font-medium text-ink outline-none hover:bg-[#faf8f3]"
          >
            <PencilLine size={14} aria-hidden="true" />
            Edit &amp; Live Preview
          </DropdownMenu.Item>
          <DropdownMenu.Item
            onSelect={onToggleTier}
            className="flex cursor-pointer items-center gap-2 rounded-lg px-2.5 py-2 text-xs font-medium text-ink outline-none hover:bg-[#faf8f3]"
          >
            <Crown size={14} aria-hidden="true" />
            Switch to {template.tier === "premium" ? "Free" : "Premium"}
          </DropdownMenu.Item>
          <DropdownMenu.Item
            onSelect={onToggleFeatured}
            className="flex cursor-pointer items-center gap-2 rounded-lg px-2.5 py-2 text-xs font-medium text-ink outline-none hover:bg-[#faf8f3]"
          >
            <Star size={14} aria-hidden="true" />
            {template.isFeatured ? "Remove Featured" : "Mark as Featured"}
          </DropdownMenu.Item>
          <DropdownMenu.Separator className="my-1 h-px bg-[#efe9dc]" />
          <DropdownMenu.Item asChild>
            <Link
              href={`/t/${template.slug}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex cursor-pointer items-center gap-2 rounded-lg px-2.5 py-2 text-xs font-medium text-ink outline-none hover:bg-[#faf8f3]"
            >
              <ArrowUpRight size={14} aria-hidden="true" />
              Open Full Preview
            </Link>
          </DropdownMenu.Item>
          <DropdownMenu.Item
            onSelect={onCopySlug}
            className="flex cursor-pointer items-center gap-2 rounded-lg px-2.5 py-2 text-xs font-medium text-ink outline-none hover:bg-[#faf8f3]"
          >
            <Copy size={14} aria-hidden="true" />
            Copy Slug
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
