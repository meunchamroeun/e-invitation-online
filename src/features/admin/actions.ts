"use server";

import { z } from "zod";
import { and, eq, inArray, isNull, ne, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db, schema } from "@/lib/db";
import { requireAdmin } from "@/lib/auth/session";
import { getTemplate } from "@/features/templates/registry";
import type { ActionResult } from "@/features/events/actions";

type Transaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

async function lockAccounts(tx: Transaction, actorId: string, targetId: string) {
  const users = await tx.select({ id: schema.users.id, role: schema.users.role, suspendedAt: schema.users.suspendedAt })
    .from(schema.users).where(and(inArray(schema.users.id, [actorId, targetId]), isNull(schema.users.deletedAt)))
    .orderBy(schema.users.id).for("update");
  const actor = users.find((user) => user.id === actorId);
  return { allowed: actor?.role === "super_admin" && !actor.suspendedAt, target: users.find((user) => user.id === targetId) };
}

export async function setUserPlanAction(userId: string, planCode: string): Promise<ActionResult> {
  const admin = await requireAdmin();
  if (!z.uuid().safeParse(userId).success || !z.string().min(1).max(60).safeParse(planCode).success) return { ok: false, error: "invalid" };
  const result = await db.transaction(async (tx): Promise<ActionResult> => {
    const [plan] = await tx.select({ code: schema.plans.code }).from(schema.plans)
      .where(and(eq(schema.plans.code, planCode), eq(schema.plans.isActive, true))).for("share");
    if (!plan) return { ok: false, error: "plan" };
    const [user] = await tx.update(schema.users).set({ planCode, updatedAt: new Date() })
      .where(and(eq(schema.users.id, userId), isNull(schema.users.deletedAt)))
      .returning({ id: schema.users.id });
    if (!user) return { ok: false, error: "not_found" };
    await tx.insert(schema.auditLogs).values({ action: "admin.user_plan", actorId: admin.id, meta: { userId, planCode } });
    return { ok: true };
  });
  if (result.ok) revalidatePath("/admin", "layout");
  return result;
}

export async function setUserRoleAction(userId: string, role: "user" | "super_admin"): Promise<ActionResult> {
  const admin = await requireAdmin();
  if (!z.uuid().safeParse(userId).success || !z.enum(["user", "super_admin"]).safeParse(role).success) return { ok: false, error: "invalid" };
  if (userId === admin.id) return { ok: false, error: "self" };
  const result = await db.transaction(async (tx): Promise<ActionResult> => {
    const { allowed, target } = await lockAccounts(tx, admin.id, userId);
    if (!allowed) return { ok: false, error: "forbidden" };
    if (!target) return { ok: false, error: "not_found" };
    if (target.suspendedAt && role === "super_admin") return { ok: false, error: "suspended" };
    if (target.role === role) return { ok: true };
    await tx.update(schema.users).set({ role, updatedAt: new Date() }).where(eq(schema.users.id, userId));
    await tx.delete(schema.sessions).where(eq(schema.sessions.userId, userId));
    await tx.insert(schema.auditLogs).values({ action: "admin.user_role", actorId: admin.id, meta: { userId, role } });
    return { ok: true };
  });
  if (result.ok) revalidatePath("/admin", "layout");
  return result;
}

export async function setUserSuspendedAction(userId: string, suspended: boolean): Promise<ActionResult> {
  const admin = await requireAdmin();
  if (!z.uuid().safeParse(userId).success || typeof suspended !== "boolean") return { ok: false, error: "invalid" };
  if (userId === admin.id) return { ok: false, error: "self" };
  const result = await db.transaction(async (tx): Promise<ActionResult> => {
    const { allowed, target } = await lockAccounts(tx, admin.id, userId);
    if (!allowed) return { ok: false, error: "forbidden" };
    if (!target) return { ok: false, error: "not_found" };
    if (Boolean(target.suspendedAt) === suspended) return { ok: true };
    const now = new Date();
    await tx.update(schema.users).set({ suspendedAt: suspended ? now : null, updatedAt: now }).where(eq(schema.users.id, userId));
    if (suspended) await tx.delete(schema.sessions).where(eq(schema.sessions.userId, userId));
    await tx.insert(schema.auditLogs).values({
      action: suspended ? "admin.user_suspended" : "admin.user_restored", actorId: admin.id, meta: { userId },
    });
    return { ok: true };
  });
  if (result.ok) revalidatePath("/admin", "layout");
  return result;
}

export async function setEventArchivedAction(eventId: string, archived: boolean): Promise<ActionResult> {
  const admin = await requireAdmin();
  if (!z.uuid().safeParse(eventId).success || typeof archived !== "boolean") return { ok: false, error: "invalid" };
  const result = await db.transaction(async (tx): Promise<ActionResult> => {
    const events = schema.events;
    const [updated] = await tx.update(events).set({
      status: archived ? "archived" : sql`case when ${events.archivedFrom} = 'published' and ${events.published} is not null then 'published' else 'draft' end`,
      archivedFrom: archived ? sql`case when ${events.status} = 'published' then 'published' else 'draft' end` : null,
      updatedAt: new Date(),
    }).where(and(eq(events.id, eventId), isNull(events.deletedAt), archived ? ne(events.status, "archived") : eq(events.status, "archived")))
      .returning({ status: events.status });
    if (!updated) return { ok: false, error: "event_state_changed" };
    await tx.insert(schema.auditLogs).values({
      action: archived ? "admin.event_archived" : "admin.event_restored", actorId: admin.id, eventId, meta: { status: updated.status },
    });
    return { ok: true };
  });
  if (result.ok) {
    revalidatePath("/admin", "layout");
    revalidatePath(`/dashboard/events/${eventId}`, "layout");
  }
  return result;
}

export async function updateTemplateFlagsAction(slug: string, flags: { isPublished?: boolean; isFeatured?: boolean; tier?: "free" | "premium"; popularity?: number }): Promise<ActionResult> {
  const admin = await requireAdmin();
  const template = z.string().min(1).max(80).safeParse(slug).success ? getTemplate(slug) : undefined;
  const parsed = z.object({
    isPublished: z.boolean().optional(),
    isFeatured: z.boolean().optional(),
    tier: z.enum(["free", "premium"]).optional(),
    popularity: z.number().int().min(0).max(10_000).optional(),
  }).safeParse(flags);
  if (!template) return { ok: false, error: "not_found" };
  if (!parsed.success || !Object.values(parsed.data).some((v) => v !== undefined)) return { ok: false, error: "invalid" };
  const p = parsed.data;
  await db.transaction(async (tx) => {
    const [row] = await tx.insert(schema.templates).values({
      slug, nameKm: template.name.km, nameEn: template.name.en, category: template.category, style: template.style, color: template.color,
      tier: p.tier ?? template.tier, isFeatured: p.isFeatured ?? Boolean(template.featured), isPublished: p.isPublished ?? true,
      popularity: p.popularity ?? 0, currentVersion: template.version,
    }).onConflictDoUpdate({ target: schema.templates.slug, set: { ...p, updatedAt: new Date() } }).returning({ id: schema.templates.id });
    await tx.insert(schema.templateVersions).values({ templateId: row.id, version: template.version, definition: template }).onConflictDoNothing();
    await tx.insert(schema.auditLogs).values({ action: "admin.template", actorId: admin.id, meta: { slug, ...p } });
  });
  revalidatePath("/admin", "layout");
  revalidatePath("/templates");
  revalidatePath(`/templates/${slug}`);
  revalidatePath("/");
  revalidatePath("/sitemap.xml");
  return { ok: true };
}

export async function bulkUpdateTemplatesAction(
  slugs: string[],
  flags: { isPublished?: boolean; isFeatured?: boolean; tier?: "free" | "premium" },
): Promise<ActionResult> {
  const admin = await requireAdmin();
  const parsedSlugs = z.array(z.string().min(1).max(80)).min(1).max(100).safeParse(slugs);
  const parsedFlags = z.object({
    isPublished: z.boolean().optional(),
    isFeatured: z.boolean().optional(),
    tier: z.enum(["free", "premium"]).optional(),
  }).safeParse(flags);
  if (!parsedSlugs.success || !parsedFlags.success || !Object.values(parsedFlags.data).some((v) => v !== undefined)) {
    return { ok: false, error: "invalid" };
  }
  const uniqueSlugs = Array.from(new Set(parsedSlugs.data));
  const validTemplates = uniqueSlugs
    .map((s) => getTemplate(s))
    .filter((t): t is NonNullable<ReturnType<typeof getTemplate>> => Boolean(t));
  if (validTemplates.length === 0) return { ok: false, error: "not_found" };

  const p = parsedFlags.data;
  await db.transaction(async (tx) => {
    for (const template of validTemplates) {
      const [row] = await tx.insert(schema.templates).values({
        slug: template.slug, nameKm: template.name.km, nameEn: template.name.en, category: template.category, style: template.style, color: template.color,
        tier: p.tier ?? template.tier, isFeatured: p.isFeatured ?? Boolean(template.featured), isPublished: p.isPublished ?? true,
        currentVersion: template.version,
      }).onConflictDoUpdate({ target: schema.templates.slug, set: { ...p, updatedAt: new Date() } }).returning({ id: schema.templates.id });
      await tx.insert(schema.templateVersions).values({ templateId: row.id, version: template.version, definition: template }).onConflictDoNothing();
    }
    await tx.insert(schema.auditLogs).values({
      action: "admin.template.bulk",
      actorId: admin.id,
      meta: { count: validTemplates.length, slugs: validTemplates.map((t) => t.slug), ...p },
    });
  });

  revalidatePath("/admin", "layout");
  revalidatePath("/templates");
  for (const template of validTemplates) {
    revalidatePath(`/templates/${template.slug}`);
  }
  revalidatePath("/");
  revalidatePath("/sitemap.xml");
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
  if (!p.success || !z.string().min(1).max(60).safeParse(code).success) return { ok: false, error: "invalid" };
  const { nameKm, nameEn, priceMinor, isActive, ...limits } = p.data;
  if (code === "free" && !isActive) return { ok: false, error: "base_plan_required" };
  const result = await db.transaction(async (tx): Promise<ActionResult> => {
    const [updated] = await tx.update(schema.plans).set({ nameKm, nameEn, priceMinor, isActive, limits, updatedAt: new Date() })
      .where(eq(schema.plans.code, code)).returning({ code: schema.plans.code });
    if (!updated) return { ok: false, error: "not_found" };
    await tx.insert(schema.auditLogs).values({ action: "admin.plan_update", actorId: admin.id, meta: { code, priceMinor, isActive } });
    return { ok: true };
  });
  if (result.ok) {
    revalidatePath("/admin", "layout");
    revalidatePath("/pricing");
  }
  return result;
}

/** Manual payment approval: only pending transactions, recorded with reviewer + time; idempotent. */
export async function reviewBillingAction(txId: string, decision: "approved" | "rejected", note: string): Promise<ActionResult> {
  const admin = await requireAdmin();
  if (!z.uuid().safeParse(txId).success || !z.enum(["approved", "rejected"]).safeParse(decision).success || typeof note !== "string") return { ok: false, error: "invalid" };
  const result = await db.transaction(async (tx): Promise<ActionResult> => {
    const [payment] = await tx.select().from(schema.billingTransactions).where(eq(schema.billingTransactions.id, txId)).for("update");
    if (!payment) return { ok: false, error: "not_found" };
    if (payment.provider !== "manual") return { ok: false, error: "non_manual" };
    if (payment.status !== "pending") return { ok: false, error: "already_reviewed" };
    const now = new Date();
    if (decision === "approved") {
      const [plan] = await tx.select({ code: schema.plans.code }).from(schema.plans)
        .where(and(eq(schema.plans.code, payment.planCode), eq(schema.plans.isActive, true))).for("share");
      if (!plan) return { ok: false, error: "plan" };
      const [user] = await tx.update(schema.users).set({ planCode: plan.code, updatedAt: now })
        .where(and(eq(schema.users.id, payment.userId), isNull(schema.users.deletedAt))).returning({ id: schema.users.id });
      if (!user) return { ok: false, error: "not_found" };
    }
    await tx.update(schema.billingTransactions)
      .set({ status: decision, reviewedBy: admin.id, reviewedAt: now, note: note.trim().slice(0, 500) || null })
      .where(eq(schema.billingTransactions.id, txId));
    await tx.insert(schema.auditLogs).values({
      action: `admin.billing_${decision}`, actorId: admin.id, meta: { txId, userId: payment.userId, planCode: payment.planCode, ref: payment.providerRef },
    });
    return { ok: true };
  });
  if (result.ok) revalidatePath("/admin", "layout");
  return result;
}
