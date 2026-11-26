"use server";

import { z } from "zod";
import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db, schema } from "@/lib/db";
import { requireAdmin } from "@/lib/auth/session";
import { audit } from "@/lib/audit";
import type { ActionResult } from "@/features/events/actions";

export async function setUserPlanAction(userId: string, planCode: string): Promise<ActionResult> {
  const admin = await requireAdmin();
  const [p] = await db.select().from(schema.plans).where(eq(schema.plans.code, planCode));
  if (!p) return { ok: false, error: "plan" };
  await db.update(schema.users).set({ planCode }).where(eq(schema.users.id, userId));
  await audit("admin.user_plan", { actorId: admin.id, meta: { userId, planCode } });
  revalidatePath("/admin/users");
  return { ok: true };
}

export async function setUserRoleAction(userId: string, role: "user" | "super_admin"): Promise<ActionResult> {
  const admin = await requireAdmin();
  if (userId === admin.id) return { ok: false, error: "self" }; // prevent locking yourself out
  await db.update(schema.users).set({ role }).where(eq(schema.users.id, userId));
  await audit("admin.user_role", { actorId: admin.id, meta: { userId, role } });
  revalidatePath("/admin/users");
  return { ok: true };
}

export async function updateTemplateFlagsAction(slug: string, flags: { isPublished?: boolean; isFeatured?: boolean; tier?: "free" | "premium" }): Promise<ActionResult> {
  const admin = await requireAdmin();
  const p = z.object({ isPublished: z.boolean().optional(), isFeatured: z.boolean().optional(), tier: z.enum(["free", "premium"]).optional() }).parse(flags);
  await db.update(schema.templates).set({ ...p, updatedAt: new Date() }).where(eq(schema.templates.slug, slug));
  await audit("admin.template", { actorId: admin.id, meta: { slug, ...p } });
  revalidatePath("/admin/templates");
  revalidatePath("/templates");
  return { ok: true };
}

const PlanSchema = z.object({
  nameKm: z.string().trim().min(1).max(60), nameEn: z.string().trim().min(1).max(60),
  priceMinor: z.number().int().min(0).max(10_000_000),
  maxEvents: z.number().int().min(0).max(10000), maxGuestsPerEvent: z.number().int().min(0).max(100000), maxPhotos: z.number().int().min(0).max(500),
  premiumTemplates: z.boolean(), seating: z.boolean(), checkin: z.boolean(), telegram: z.boolean(), finance: z.boolean(), branding: z.boolean(), isActive: z.boolean(),
});

export async function updatePlanAction(code: string, input: z.input<typeof PlanSchema>): Promise<ActionResult> {
  const admin = await requireAdmin();
  const p = PlanSchema.safeParse(input);
  if (!p.success) return { ok: false, error: "invalid" };
  const { nameKm, nameEn, priceMinor, isActive, ...limits } = p.data;
  await db.update(schema.plans).set({ nameKm, nameEn, priceMinor, isActive, limits, updatedAt: new Date() }).where(eq(schema.plans.code, code));
  await audit("admin.plan_update", { actorId: admin.id, meta: { code, priceMinor } });
  revalidatePath("/admin/plans");
  return { ok: true };
}

/** Manual payment approval: only pending transactions, recorded with reviewer + time; idempotent. */
export async function reviewBillingAction(txId: string, decision: "approved" | "rejected", note: string): Promise<ActionResult> {
  const admin = await requireAdmin();
  const res = await db.transaction(async (tx) => {
    const [t] = await tx.update(schema.billingTransactions)
      .set({ status: decision, reviewedBy: admin.id, reviewedAt: new Date(), note: note.slice(0, 500) || null })
      .where(and(eq(schema.billingTransactions.id, txId), eq(schema.billingTransactions.status, "pending")))
      .returning();
    if (!t) return null;
    if (decision === "approved") await tx.update(schema.users).set({ planCode: t.planCode }).where(eq(schema.users.id, t.userId));
    return t;
  });
  if (!res) return { ok: false, error: "already_reviewed" };
  await audit(`admin.billing_${decision}`, { actorId: admin.id, meta: { txId, userId: res.userId, planCode: res.planCode, ref: res.providerRef } });
  revalidatePath("/admin/billing");
  return { ok: true };
}
