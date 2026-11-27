import type { ReactNode } from "react";
import { requireAdmin } from "@/lib/auth/session";
import { AdminShell } from "@/components/admin/admin-shell";

export const dynamic = "force-dynamic";
export const metadata = { robots: { index: false }, title: "Admin" };

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const { name, email } = await requireAdmin();
  return <AdminShell name={name} email={email}>{children}</AdminShell>;
}
