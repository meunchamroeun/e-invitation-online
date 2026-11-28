"use client";

import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { Switch } from "@base-ui/react/switch";
import { Tabs } from "@base-ui/react/tabs";
import { cva } from "class-variance-authority";
import gsap from "gsap";
import { motion } from "motion/react";
import {
  ArrowUpRight,
  Check,
  ChevronDown,
  Copy,
  MoreHorizontal,
  Search,
  SlidersHorizontal,
  X,
} from "lucide-react";
import { Button, Input } from "@/components/ui";
import { cn } from "@/lib/utils";

/* ---------------- KPI Strip (GSAP + cva + Motion) ---------------- */

const kpiCardVariants = cva(
  "admin-kpi group relative overflow-hidden rounded-2xl border bg-white p-4 shadow-xs transition-shadow hover:shadow-sm",
  {
    variants: {
      tone: {
        neutral: "border-[#e7e1d5]",
        gold: "border-[#e3d2b4] bg-gradient-to-br from-white to-[#fcf8ef]",
        success: "border-[#d8e7dc] bg-gradient-to-br from-white to-[#f6fbf7]",
        warning: "border-[#eedcb9] bg-gradient-to-br from-white to-[#fdf9ef]",
        danger: "border-[#f0cfcf] bg-gradient-to-br from-white to-[#fff7f7]",
      },
    },
    defaultVariants: { tone: "neutral" },
  },
);

const kpiLabelTone = {
  neutral: "text-muted",
  gold: "text-[#86622f]",
  success: "text-[#2c6644]",
  warning: "text-[#8a5a12]",
  danger: "text-[#9b2c2c]",
} as const;

export type AdminKpiItem = {
  label: string;
  value: number;
  suffix?: string;
  hint?: string;
  href?: string;
  tone?: keyof typeof kpiLabelTone;
};

export function AdminKpiStrip({ items, className }: { items: AdminKpiItem[]; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ctx = gsap.context(() => {
      gsap.fromTo(
        ".admin-kpi",
        { y: 12, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.4, stagger: 0.05, ease: "power2.out", clearProps: "transform" },
      );
      el.querySelectorAll<HTMLElement>("[data-kpi-count]").forEach((node) => {
        const target = Number(node.dataset.kpiCount ?? 0);
        const state = { val: 0 };
        gsap.to(state, {
          val: target,
          duration: 0.6,
          ease: "power2.out",
          onUpdate: () => {
            node.textContent = Math.round(state.val).toLocaleString("en-US");
          },
        });
      });
    }, ref);
    return () => ctx.revert();
  }, [items.length]);

  return (
    <div ref={ref} className={cn("mb-5 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4", className)}>
      {items.map((item) => {
        const tone = item.tone ?? "neutral";
        const body = (
          <>
            <p className={cn("text-xs font-medium", kpiLabelTone[tone])}>{item.label}</p>
            <p className="num mt-2 text-2xl font-semibold tracking-tight text-ink">
              <span data-kpi-count={item.value}>{item.value.toLocaleString("en-US")}</span>
              {item.suffix ? <span className="ml-1 text-sm font-medium text-muted">{item.suffix}</span> : null}
            </p>
            {item.hint ? <p className="mt-1 text-xs text-muted">{item.hint}</p> : null}
            {item.href ? (
              <ArrowUpRight
                size={14}
                aria-hidden="true"
                className="absolute right-3.5 bottom-3.5 text-[#86622f] opacity-0 transition-all group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:opacity-100"
              />
            ) : null}
          </>
        );
        return item.href ? (
          <Link key={item.label} href={item.href} className={kpiCardVariants({ tone })}>
            {body}
          </Link>
        ) : (
          <div key={item.label} className={kpiCardVariants({ tone })}>
            {body}
          </div>
        );
      })}
    </div>
  );
}

/* ---------------- Filter Toolbar (Base UI Tabs + Radix Dropdown + Motion) ---------------- */

export type AdminFilterOption = readonly [string, string];

export type AdminToolbarFilter = {
  name: string;
  label: string;
  value: string;
  options: readonly AdminFilterOption[];
};

function buildUrl(path: string, nextParams: Record<string, string>) {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(nextParams)) {
    if (v) sp.set(k, v);
  }
  const qs = sp.toString();
  return qs ? `${path}?${qs}` : path;
}

export function AdminFilterToolbar({
  path,
  q,
  placeholder,
  params,
  segmented,
  dropdowns = [],
  actions,
}: {
  path: string;
  q: string;
  placeholder: string;
  params: Record<string, string>;
  segmented?: AdminToolbarFilter;
  dropdowns?: AdminToolbarFilter[];
  actions?: ReactNode;
}) {
  const router = useRouter();
  const id = useId();
  const [search, setSearch] = useState(q);

  useEffect(() => {
    setSearch(q);
  }, [q]);

  const navigate = (patch: Record<string, string>) => {
    const merged = { ...params, ...patch };
    delete merged.page;
    router.push(buildUrl(path, merged));
  };

  const hasActive = Boolean(
    q || (segmented && segmented.value) || dropdowns.some((d) => Boolean(d.value)),
  );

  return (
    <div className="space-y-3 border-b border-line p-3.5 sm:p-4">
      <div className="flex flex-col gap-2.5 lg:flex-row lg:items-center lg:justify-between">
        <form
          className="flex min-w-0 flex-1 items-center gap-2 lg:max-w-md"
          onSubmit={(e) => {
            e.preventDefault();
            navigate({ q: search.trim() });
          }}
        >
          <div className="relative flex-1">
            <Search
              size={15}
              aria-hidden="true"
              className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-muted"
            />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={placeholder}
              aria-label={placeholder}
              className="h-9 rounded-xl pl-9 pr-8 text-sm"
            />
            {search ? (
              <button
                type="button"
                aria-label="Clear search"
                onClick={() => {
                  setSearch("");
                  if (q) navigate({ q: "" });
                }}
                className="absolute top-1/2 right-2 -translate-y-1/2 rounded-full p-1 text-muted hover:bg-black/5 hover:text-ink"
              >
                <X size={13} aria-hidden="true" />
              </button>
            ) : null}
          </div>
          <Button type="submit" variant="outline" size="sm" className="h-9 rounded-xl px-3 text-xs">
            Search
          </Button>
        </form>

        <div className="flex flex-wrap items-center gap-2">
          {dropdowns.map((dd) => {
            const activeLabel = dd.options.find(([val]) => val === dd.value)?.[1] ?? dd.label;
            return (
              <DropdownMenu.Root key={dd.name}>
                <DropdownMenu.Trigger asChild>
                  <button
                    type="button"
                    className={cn(
                      "inline-flex h-9 items-center gap-2 rounded-xl border px-3 text-xs font-medium transition-colors",
                      dd.value
                        ? "border-[#86622f]/50 bg-[#fcf6e8] text-[#6d4d20]"
                        : "border-[#e7e1d5] bg-[#faf8f3] text-ink-2 hover:border-[#cbbba0]",
                    )}
                  >
                    <SlidersHorizontal size={13} aria-hidden="true" />
                    <span>{activeLabel}</span>
                    <ChevronDown size={13} className="opacity-65" aria-hidden="true" />
                  </button>
                </DropdownMenu.Trigger>
                <DropdownMenu.Portal>
                  <DropdownMenu.Content
                    align="end"
                    sideOffset={6}
                    className="z-50 min-w-44 rounded-xl border border-[#e7e1d5] bg-white p-1.5 shadow-xl"
                  >
                    {dd.options.map(([val, label]) => (
                      <DropdownMenu.Item
                        key={val || "_all"}
                        onSelect={() => navigate({ [dd.name]: val })}
                        className={cn(
                          "flex cursor-pointer items-center gap-2 rounded-lg px-2.5 py-2 text-xs font-medium outline-none hover:bg-[#faf8f3]",
                          dd.value === val ? "bg-[#faf8f3] text-ink" : "text-ink-2",
                        )}
                      >
                        <Check
                          size={13}
                          className={dd.value === val ? "opacity-100 text-[#86622f]" : "opacity-0"}
                          aria-hidden="true"
                        />
                        <span>{label}</span>
                      </DropdownMenu.Item>
                    ))}
                  </DropdownMenu.Content>
                </DropdownMenu.Portal>
              </DropdownMenu.Root>
            );
          })}

          {actions}

          {hasActive ? (
            <button
              type="button"
              onClick={() => {
                setSearch("");
                router.push(path);
              }}
              className="inline-flex h-9 items-center gap-1 rounded-xl px-2.5 text-xs font-medium text-[#86622f] hover:bg-[#fcf6e8]"
            >
              <X size={13} aria-hidden="true" />
              Reset
            </button>
          ) : null}
        </div>
      </div>

      {segmented ? (
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Tabs.Root
            value={segmented.value}
            onValueChange={(val) => navigate({ [segmented.name]: String(val) })}
          >
            <Tabs.List
              aria-label={segmented.label}
              className="inline-flex flex-wrap items-center rounded-xl border border-[#e7e1d5] bg-[#faf8f3] p-0.5"
            >
              {segmented.options.map(([val, label]) => {
                const active = segmented.value === val;
                return (
                  <Tabs.Tab
                    key={val || "_all"}
                    value={val}
                    className={cn(
                      "relative z-10 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors",
                      active ? "text-[#241c19]" : "text-muted hover:text-ink",
                    )}
                  >
                    {active ? (
                      <motion.span
                        layoutId={`admin-seg-${id}`}
                        transition={{ type: "spring", stiffness: 450, damping: 32 }}
                        className="absolute inset-0 -z-10 rounded-lg bg-white shadow-xs"
                      />
                    ) : null}
                    {label}
                  </Tabs.Tab>
                );
              })}
            </Tabs.List>
          </Tabs.Root>
        </div>
      ) : null}
    </div>
  );
}

/* ---------------- Base UI Switch for Forms ---------------- */

export function AdminSwitchOption({
  name,
  label,
  defaultChecked,
  disabled,
}: {
  name: string;
  label: string;
  defaultChecked: boolean;
  disabled: boolean;
}) {
  const [checked, setChecked] = useState(defaultChecked);
  return (
    <label className="flex min-h-9 cursor-pointer items-center justify-between gap-3 rounded-xl border border-[#efe9dc] bg-[#fcfbf8] px-3 py-2 text-sm text-ink-2 transition-colors hover:border-[#dfd5c3]">
      <span className="text-[13px] font-medium">{label}</span>
      <input type="checkbox" name={name} checked={checked} readOnly hidden />
      <Switch.Root
        checked={checked}
        disabled={disabled}
        onCheckedChange={setChecked}
        aria-label={label}
        className={cn(
          "relative inline-flex h-5.5 w-10 shrink-0 cursor-pointer items-center rounded-full border p-0.5 transition-colors disabled:cursor-not-allowed disabled:opacity-50",
          checked ? "border-[#86622f] bg-[#86622f]" : "border-[#d5cbb9] bg-[#ebe5d9]",
        )}
      >
        <Switch.Thumb
          className={cn(
            "block size-4 rounded-full bg-white shadow-xs transition-transform duration-200",
            checked ? "translate-x-4.5" : "translate-x-0",
          )}
        />
      </Switch.Root>
    </label>
  );
}

/* ---------------- Row Quick Menu & Copy ---------------- */

export type RowMenuAction =
  | { kind: "link"; label: string; href: string; external?: boolean }
  | { kind: "copy"; label: string; value: string };

export function AdminRowQuickMenu({ label, items }: { label: string; items: RowMenuAction[] }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async (val: string) => {
    try {
      await navigator.clipboard.writeText(val);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      /* ignore clipboard error */
    }
  };

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button
          type="button"
          aria-label={label}
          className="grid size-8 shrink-0 place-items-center rounded-lg border border-[#e7e1d5] bg-white text-ink-2 transition-colors hover:bg-[#faf8f3]"
        >
          {copied ? <Check size={14} className="text-[#2c6644]" aria-hidden="true" /> : <MoreHorizontal size={15} aria-hidden="true" />}
        </button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="end"
          sideOffset={6}
          className="z-50 min-w-44 rounded-xl border border-[#e7e1d5] bg-white p-1.5 shadow-xl"
        >
          {items.map((item) =>
            item.kind === "link" ? (
              <DropdownMenu.Item key={item.label} asChild>
                <Link
                  href={item.href}
                  target={item.external ? "_blank" : undefined}
                  rel={item.external ? "noopener noreferrer" : undefined}
                  className="flex cursor-pointer items-center gap-2 rounded-lg px-2.5 py-2 text-xs font-medium text-ink outline-none hover:bg-[#faf8f3]"
                >
                  <ArrowUpRight size={13} aria-hidden="true" />
                  {item.label}
                </Link>
              </DropdownMenu.Item>
            ) : (
              <DropdownMenu.Item
                key={item.label}
                onSelect={() => handleCopy(item.value)}
                className="flex cursor-pointer items-center gap-2 rounded-lg px-2.5 py-2 text-xs font-medium text-ink outline-none hover:bg-[#faf8f3]"
              >
                <Copy size={13} aria-hidden="true" />
                {item.label}
              </DropdownMenu.Item>
            ),
          )}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
