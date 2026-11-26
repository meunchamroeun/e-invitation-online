import Link from "next/link";
import { requireAdmin } from "@/lib/auth/session";
import { Logo } from "@/components/layout/logo";

export const dynamic = "force-dynamic";
export const metadata = { robots: { index: false }, title: "Admin" };

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireAdmin(); // enforced server-side for every admin route
  const nav = [["/admin", "Overview"], ["/admin/users", "Users"], ["/admin/events", "Events"], ["/admin/templates", "Templates"], ["/admin/plans", "Plans"], ["/admin/billing", "Billing"], ["/admin/audit-logs", "Audit logs"]];
  return (
    <div className="min-h-[100svh] bg-[#F5F3EF]">
      <header className="border-b border-line bg-[#1B1512] text-white">
        <div className="mx-auto flex max-w-[1200px] flex-wrap items-center gap-4 px-4 py-3">
          <Link href="/admin" className="[&_span.text-muted]:text-white/50"><Logo /></Link>
          <span className="rounded-full bg-gold px-2 py-0.5 text-[11px] font-semibold">SUPER ADMIN</span>
          <nav className="flex flex-wrap gap-1 text-sm">{nav.map(([h, l]) => <Link key={h} href={h} className="rounded-full px-3 py-1.5 text-white/80 hover:bg-white/10 hover:text-white">{l}</Link>)}</nav>
          <Link href="/dashboard" className="ml-auto text-sm text-white/70 hover:text-white">← Dashboard</Link>
        </div>
      </header>
      <main className="mx-auto max-w-[1200px] px-4 py-8">{children}</main>
    </div>
  );
}
