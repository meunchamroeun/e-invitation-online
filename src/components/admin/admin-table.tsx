import type { ReactNode } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight, ListFilter, Search } from "lucide-react";
import { Button, EmptyState, Input, Select, buttonClass } from "@/components/ui";
import { cn } from "@/lib/utils";

export type AdminQuery = Record<string, string | string[] | undefined>;
export const ADMIN_PAGE_SIZE = 25;

export function readAdminQuery(params: AdminQuery, key: string) {
  const raw = params[key];
  return typeof raw === "string" ? raw.trim().slice(0, 120) : "";
}

export function containsAdminQuery(q: string) {
  return `%${q.replace(/[\\%_]/g, "\\$&")}%`;
}

export function adminPage(params: AdminQuery, total: number) {
  const raw = readAdminQuery(params, "page");
  const last = Math.max(1, Math.ceil(total / ADMIN_PAGE_SIZE));
  const current = /^\d+$/.test(raw) ? Math.min(last, Math.max(1, Number(raw))) : 1;
  return { current, last, offset: (current - 1) * ADMIN_PAGE_SIZE, total };
}

export const adminCell = "px-4 py-3.5";
export const adminRow = "border-b border-line align-middle last:border-b-0 transition-colors hover:bg-[#fcfaf5]";

export function AdminHeading({ title, description, children }: { title: string; description: string; children?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-col gap-3 sm:mb-7 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="text-[1.85rem] leading-[1.12] font-semibold tracking-[-.045em] text-[#241c19] sm:text-[2.35rem]">{title}</h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted">{description}</p>
      </div>
      {children}
    </div>
  );
}

type Filter = { name: string; label: string; value: string; options: readonly (readonly [string, string])[] };

export function AdminFilters({ path, q, placeholder, filters }: { path: string; q: string; placeholder: string; filters: Filter[] }) {
  const active = q || filters.some(({ value }) => value);

  return (
    <form key={JSON.stringify([q, ...filters.map(({ value }) => value)])} action={path} className="flex flex-wrap items-center gap-2 border-b border-line p-3.5 sm:p-4">
      <label className="relative min-w-0 basis-full sm:max-w-[20rem] sm:flex-1">
        <span className="sr-only">{placeholder}</span>
        <Search size={16} aria-hidden="true" className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muted" />
        <Input type="search" name="q" defaultValue={q} placeholder={placeholder} className="h-10 rounded-lg pl-9 text-sm" />
      </label>
      {filters.map(({ name, label, value, options }) => (
        <label key={name} className="min-w-0 flex-1 sm:flex-none">
          <span className="sr-only">{label}</span>
          <Select name={name} defaultValue={value} className="h-10 w-full rounded-lg text-sm sm:w-auto">
            {options.map(([key, text]) => <option key={key} value={key}>{text}</option>)}
          </Select>
        </label>
      ))}
      <Button type="submit" variant="outline" className="rounded-lg px-3"><ListFilter size={15} /> Filter</Button>
      {active ? <Link href={path} className={buttonClass("ghost", "md", "rounded-lg px-3")}>Clear</Link> : null}
    </form>
  );
}

type Page = ReturnType<typeof adminPage>;

function pageLink(path: string, params: Record<string, string>, page: number) {
  const query = new URLSearchParams(Object.entries(params).filter(([, value]) => value));
  if (page > 1) query.set("page", String(page));
  return query.size ? `${path}?${query}` : path;
}

function AdminPagination({ path, params, page }: { path: string; params: Record<string, string>; page: Page }) {
  const { current, last, offset, total } = page;
  const format = (value: number) => value.toLocaleString("en-US");
  return (
    <nav aria-label="Results pages" className="flex min-h-15 flex-wrap items-center justify-between gap-3 border-t border-line px-3.5 py-3 sm:px-4">
      <p className="num text-xs text-muted">
        {total ? `${format(offset + 1)}–${format(Math.min(offset + ADMIN_PAGE_SIZE, total))} of ${format(total)} results` : "0 results"}
      </p>
      {last > 1 ? (
        <div className="flex items-center gap-1">
          <Button asChild={current > 1} disabled={current === 1} variant="outline" size="sm" className="rounded-lg">
            {current > 1 ? <Link href={pageLink(path, params, current - 1)}><ChevronLeft size={14} /> Previous</Link> : <><ChevronLeft size={14} /> Previous</>}
          </Button>
          <span className="num px-1.5 text-xs text-muted">{current} / {last}</span>
          <Button asChild={current < last} disabled={current === last} variant="outline" size="sm" className="rounded-lg">
            {current < last ? <Link href={pageLink(path, params, current + 1)}>Next <ChevronRight size={14} /></Link> : <>Next <ChevronRight size={14} /></>}
          </Button>
        </div>
      ) : null}
    </nav>
  );
}

export function AdminTable({ label, path, params, page, toolbar, columns, children, empty, className }: {
  label: string;
  path: string;
  params: Record<string, string>;
  page: Page;
  toolbar: ReactNode;
  columns: string[];
  children: ReactNode;
  empty: string;
  className?: string;
}) {
  return (
    <div className="space-y-4">
      {toolbar}
      <section aria-label={label} className="min-w-0 overflow-hidden rounded-2xl border border-[#e7e1d5] bg-white shadow-xs">
        {page.total ? (
          <>
            <p className="border-b border-line px-4 py-2 text-xs text-muted sm:hidden">Scroll to see all columns</p>
            <div className="overflow-x-auto focus-visible:outline-offset-[-3px]" tabIndex={0} role="region" aria-label={`${label} table`}>
              <table className={cn("w-full text-left text-[13px]", className)}>
                <thead className="border-b border-[#e7e1d5] bg-[#faf8f3] text-xs font-medium text-muted">
                  <tr>{columns.map((name) => <th key={name} scope="col" className="whitespace-nowrap px-4 py-3">{name}</th>)}</tr>
                </thead>
                <tbody>{children}</tbody>
              </table>
            </div>
          </>
        ) : <div className="p-4"><EmptyState title={empty} body={Object.values(params).some(Boolean) ? "Try changing your search or filters." : undefined} /></div>}
        <AdminPagination path={path} params={params} page={page} />
      </section>
    </div>
  );
}
