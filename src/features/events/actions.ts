"use server";

import { z } from "zod";
import { and, count, eq, isNull, desc } from "drizzle-orm";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { db, schema } from "@/lib/db";
import { requireUser } from "@/lib/auth/session";
import { assertEvent } from "@/lib/auth/event-access";
import { getTemplate, starterDoc, EVENT_TYPES } from "@/features/templates/registry";
import { InvitationDocSchema, type InvitationDoc } from "@/features/invitations/doc";
import { zonedToUtc } from "@/i18n/format";
import { audit } from "@/lib/audit";
import { getPlan } from "@/features/billing/queries";
import { generateToken } from "@/lib/security/tokens";
import { can } from "@/lib/auth/permissions";
import { notify } from "@/features/notifications/notify";

const DEFAULT_GROUPS = ["ខាងកូនប្រុស · Groom's family", "ខាងកូនស្រី · Bride's family", "មិត្តភក្ដិ · Friends", "សហការី · Colleagues", "VIP"];

const CreateSchema = z.object({
  type: z.enum(EVENT_TYPES.map((e) => e.value) as [string, ...string[]]),
  title: z.string().trim().min(1).max(160),
  hostKm: z.string().trim().max(160).default(""),
  hostEn: z.string().trim().max(160).default(""),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  startTime: z.string().regex(/^\d{2}:\d{2}$/),
  endTime: z.string().regex(/^(\d{2}:\d{2})?$/).default(""),
  timezone: z.string().max(60).default("Asia/Phnom_Penh"),
  venueName: z.string().trim().max(200).default(""),
  venueAddress: z.string().trim().max(400).default(""),
  mapUrl: z.string().trim().max(500).refine((v) => v === "" || /^https:\/\//.test(v), "https only").default(""),
  template: z.string().max(80),
});

export type ActionResult = { ok: true; message?: string; data?: unknown } | { ok: false; error: string };

export async function createEventAction(input: z.input<typeof CreateSchema>): Promise<ActionResult> {
  const user = await requireUser();
  const parsed = CreateSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join(", ") };
  const v = parsed.data;
  const tpl = getTemplate(v.template);
  if (!tpl) return { ok: false, error: "Unknown template" };
  if (!v.hostKm && !v.hostEn) return { ok: false, error: "host" };

  const plan = await getPlan(user.planCode);
  const [{ n }] = await db.select({ n: count() }).from(schema.events).where(and(eq(schema.events.ownerId, user.id), isNull(schema.events.deletedAt)));
  if (user.role !== "super_admin" && n >= plan.limits.maxEvents) return { ok: false, error: "plan_events_limit" };

  const startsAt = zonedToUtc(v.date, v.startTime, v.timezone);
  const endsAt = v.endTime ? zonedToUtc(v.date, v.endTime, v.timezone) : null;
  const doc = starterDoc(tpl, { hostNames: { km: v.hostKm || v.hostEn, en: v.hostEn || v.hostKm } });

  const eventId = await db.transaction(async (tx) => {
    const [ev] = await tx
      .insert(schema.events)
      .values({
        ownerId: user.id, type: v.type, title: v.title, timezone: v.timezone, startsAt, endsAt,
        venueName: v.venueName || null, venueAddress: v.venueAddress || null, mapUrl: v.mapUrl || null,
        templateSlug: tpl.slug, templateVersion: tpl.version, draft: doc,
      })
      .returning({ id: schema.events.id });
    await tx.insert(schema.eventMembers).values({ eventId: ev.id, userId: user.id, role: "owner" });
    const groups = v.type === "wedding" || v.type === "engagement" ? DEFAULT_GROUPS : DEFAULT_GROUPS.slice(2);
    await tx.insert(schema.guestGroups).values(groups.map((name, i) => ({ eventId: ev.id, name, sort: i })));
    return ev.id;
  });
  await audit("event.create", { actorId: user.id, eventId, meta: { template: tpl.slug } });
  revalidatePath("/dashboard");
  return { ok: true, data: { id: eventId } };
}

/** Autosave with optimistic concurrency: never overwrite a newer revision saved from another tab/device. */
export async function saveDraftAction(eventId: string, baseRevision: number, doc: InvitationDoc, templateSlug?: string): Promise<{ ok: true; revision: number } | { ok: false; error: "conflict" | "invalid" | "forbidden" | "gift_locked"; revision?: number; detail?: string }> {
  const { user, event, role } = await assertEvent(eventId, "event.edit");
  const parsed = InvitationDocSchema.safeParse(doc);
  if (!parsed.success) return { ok: false, error: "invalid", detail: parsed.error.issues.slice(0, 3).map((i) => `${i.path.join(".")}: ${i.message}`).join("; ") };
  // Payment QR protection.
  const giftOf = (d: InvitationDoc) => JSON.stringify(d.sections.filter((s) => s.type === "gift").map((s) => (s.type === "gift" ? s.data.accounts : null)));
  const prevDoc = InvitationDocSchema.safeParse(event.draft);
  const giftChanged = prevDoc.success && giftOf(prevDoc.data) !== giftOf(parsed.data);
  if (giftChanged) {
    if (event.giftQrLocked) return { ok: false, error: "gift_locked" };
    if (!can(role, "giftqr.edit")) return { ok: false, error: "forbidden" };
  }
  const tpl = templateSlug ? getTemplate(templateSlug) : undefined;
  if (templateSlug && !tpl) return { ok: false, error: "invalid", detail: "template" };
  const res = await db
    .update(schema.events)
    .set({ draft: parsed.data, revision: baseRevision + 1, updatedAt: new Date(), ...(tpl ? { templateSlug: tpl.slug, templateVersion: tpl.version } : {}) })
    .where(and(eq(schema.events.id, eventId), eq(schema.events.revision, baseRevision)))
    .returning({ revision: schema.events.revision });
  if (!res.length) {
    const [cur] = await db.select({ revision: schema.events.revision }).from(schema.events).where(eq(schema.events.id, eventId));
    return { ok: false, error: "conflict", revision: cur?.revision };
  }
  if (giftChanged) {
    await audit("giftqr.change", { actorId: user.id, eventId, meta: { accounts: parsed.data.sections.filter((x) => x.type === "gift").map((x) => (x.type === "gift" ? x.data.accounts.map((a) => ({ bank: a.bank, holder: a.holder, qr: a.qr })) : [])) } });
    await notify({ userId: event.ownerId, eventId, kind: "giftqr_changed", idempotencyKey: `giftqr:${eventId}:${res[0].revision}`, payload: { title: event.title } });
  }
  return { ok: true, revision: res[0].revision };
}

export async function publishAction(eventId: string): Promise<ActionResult> {
  const { user, event } = await assertEvent(eventId, "event.publish");
  const tpl = getTemplate(event.templateSlug);
  const [owner] = await db.select({ planCode: schema.users.planCode, role: schema.users.role }).from(schema.users).where(eq(schema.users.id, event.ownerId));
  const plan = await getPlan(owner.planCode);
  if (tpl?.tier === "premium" && !plan.limits.premiumTemplates && owner.role !== "super_admin") return { ok: false, error: "plan_premium_template" };
  const doc = InvitationDocSchema.parse(event.draft);
  await db.transaction(async (tx) => {
    await tx.update(schema.events).set({ published: doc, publishedAt: new Date(), status: "published", updatedAt: new Date() }).where(eq(schema.events.id, eventId));
    await tx.insert(schema.invitationVersions).values({ eventId, kind: "publish", doc, createdBy: user.id });
  });
  await audit("event.publish", { actorId: user.id, eventId });
  revalidatePath(`/dashboard/events/${eventId}`);
  return { ok: true };
}

export async function unpublishAction(eventId: string): Promise<ActionResult> {
  const { user } = await assertEvent(eventId, "event.publish");
  await db.update(schema.events).set({ status: "draft", updatedAt: new Date() }).where(eq(schema.events.id, eventId));
  await audit("event.unpublish", { actorId: user.id, eventId });
  revalidatePath(`/dashboard/events/${eventId}`);
  return { ok: true };
}

export async function listVersionsAction(eventId: string) {
  await assertEvent(eventId, "event.edit");
  return db
    .select({ id: schema.invitationVersions.id, kind: schema.invitationVersions.kind, createdAt: schema.invitationVersions.createdAt })
    .from(schema.invitationVersions)
    .where(eq(schema.invitationVersions.eventId, eventId))
    .orderBy(desc(schema.invitationVersions.createdAt))
    .limit(30);
}

export async function restoreVersionAction(eventId: string, versionId: string): Promise<ActionResult> {
  const { user } = await assertEvent(eventId, "event.edit");
  const [v] = await db.select().from(schema.invitationVersions).where(and(eq(schema.invitationVersions.id, versionId), eq(schema.invitationVersions.eventId, eventId)));
  if (!v) return { ok: false, error: "not_found" };
  const [ev] = await db.select({ revision: schema.events.revision }).from(schema.events).where(eq(schema.events.id, eventId));
  await db.update(schema.events).set({ draft: v.doc, revision: ev.revision + 1, updatedAt: new Date() }).where(eq(schema.events.id, eventId));
  await audit("event.restore_version", { actorId: user.id, eventId, meta: { versionId } });
  return { ok: true };
}

const SettingsSchema = z.object({
  title: z.string().trim().min(1).max(160),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  startTime: z.string().regex(/^\d{2}:\d{2}$/),
  endTime: z.string().regex(/^(\d{2}:\d{2})?$/),
  timezone: z.string().max(60),
  venueName: z.string().trim().max(200),
  venueAddress: z.string().trim().max(400),
  mapUrl: z.string().trim().max(500).refine((v) => v === "" || /^https:\/\//.test(v)),
  rsvpDeadline: z.string().regex(/^(\d{4}-\d{2}-\d{2})?$/),
  allowMaybe: z.boolean(),
  wishesEnabled: z.boolean(),
  isPublic: z.boolean(),
});

export async function updateEventSettingsAction(eventId: string, input: z.input<typeof SettingsSchema>): Promise<ActionResult> {
  const { user, event } = await assertEvent(eventId, "event.edit");
  const p = SettingsSchema.safeParse(input);
  if (!p.success) return { ok: false, error: p.error.issues.map((i) => i.path.join(".")).join(", ") };
  const v = p.data;
  await db
    .update(schema.events)
    .set({
      title: v.title, timezone: v.timezone,
      startsAt: zonedToUtc(v.date, v.startTime, v.timezone),
      endsAt: v.endTime ? zonedToUtc(v.date, v.endTime, v.timezone) : null,
      venueName: v.venueName || null, venueAddress: v.venueAddress || null, mapUrl: v.mapUrl || null,
      rsvpDeadline: v.rsvpDeadline ? zonedToUtc(v.rsvpDeadline, "23:59", v.timezone) : null,
      allowMaybe: v.allowMaybe, wishesEnabled: v.wishesEnabled, isPublic: v.isPublic,
      publicSlug: v.isPublic ? event.publicSlug ?? generateToken(9) : event.publicSlug,
      updatedAt: new Date(),
    })
    .where(eq(schema.events.id, eventId));
  await audit("event.settings", { actorId: user.id, eventId });
  revalidatePath(`/dashboard/events/${eventId}`, "layout");
  return { ok: true };
}

export async function deleteEventAction(eventId: string, confirmTitle: string) {
  const { user, event } = await assertEvent(eventId, "event.delete");
  if (confirmTitle.trim() !== event.title.trim()) return { ok: false, error: "confirm" } as ActionResult;
  await db.update(schema.events).set({ deletedAt: new Date(), status: "archived" }).where(eq(schema.events.id, eventId));
  await audit("event.delete", { actorId: user.id, eventId });
  redirect("/dashboard/events");
}

/** Gift QR lock: when locked, the gift section's QR/accounts cannot be changed until the owner unlocks (audited). */
export async function setGiftQrLockAction(eventId: string, locked: boolean): Promise<ActionResult> {
  const { user } = await assertEvent(eventId, "giftqr.edit");
  await db.update(schema.events).set({ giftQrLocked: locked }).where(eq(schema.events.id, eventId));
  await audit(locked ? "giftqr.lock" : "giftqr.unlock", { actorId: user.id, eventId });
  return { ok: true };
}
