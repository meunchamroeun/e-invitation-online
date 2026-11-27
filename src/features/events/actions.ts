"use server";

import { z } from "zod";
import { createHash, randomUUID } from "node:crypto";
import { and, count, eq, isNull, desc, ne } from "drizzle-orm";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { db, schema } from "@/lib/db";
import { requireUser } from "@/lib/auth/session";
import { assertEvent } from "@/lib/auth/event-access";
import { getTemplate, starterDoc, EVENT_TYPES } from "@/features/templates/registry";
import { EventSettingsSchema, type EventSettingsInput } from "./settings-schema";
import { getTemplatePolicy } from "@/features/templates/queries";
import { InvitationDocSchema, l, type InvitationDoc } from "@/features/invitations/doc";
import { zonedToUtc } from "@/i18n/format";
import { audit } from "@/lib/audit";
import { getPlan } from "@/features/billing/queries";
import { generateToken } from "@/lib/security/tokens";
import { can } from "@/lib/auth/permissions";
import { notify } from "@/features/notifications/notify";
import { deleteObject, putObject } from "@/lib/storage/files";
import { sniff } from "@/lib/storage/sniff";

const DEFAULT_GROUPS = ["ខាងកូនប្រុស · Groom's family", "ខាងកូនស្រី · Bride's family", "មិត្តភក្ដិ · Friends", "សហការី · Colleagues", "VIP"];

const Time = z.iso.time({ precision: -1 });
const CreateSchema = z.object({
  type: z.enum(EVENT_TYPES.map((e) => e.value) as [string, ...string[]]),
  title: z.string().trim().min(1).max(160),
  hostKm: z.string().trim().max(160).default(""),
  hostEn: z.string().trim().max(160).default(""),
  partnerOne: z.string().trim().max(160).default(""),
  partnerTwo: z.string().trim().max(160).default(""),
  date: z.iso.date(),
  startTime: Time,
  endTime: Time.or(z.literal("")).default(""),
  timezone: z.string().max(60).default("Asia/Phnom_Penh"),
  venueName: z.string().trim().max(200).default(""),
  venueAddress: z.string().trim().max(400).default(""),
  mapUrl: z.string().trim().max(500).refine((v) => v === "" || /^https:\/\//.test(v), "https only").default(""),
  template: z.string().max(80),
  message: z.string().trim().max(2000).default(""),
  organizerNotes: z.string().trim().max(2000).default(""),
  locale: z.enum(["km", "en"]).default("km"),
  agenda: z.array(z.object({
    time: Time,
    title: z.string().trim().min(1).max(160),
    notes: z.string().trim().max(500).default(""),
  })).max(30).optional(),
});

export type ActionResult = { ok: true; message?: string; data?: unknown } | { ok: false; error: string };

export async function createEventAction(input: z.input<typeof CreateSchema>, media?: FormData): Promise<ActionResult> {
  const user = await requireUser();
  const parsed = CreateSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join(", ") };
  const v = parsed.data;
  const tpl = getTemplate(v.template);
  if (!tpl || tpl.category !== v.type || !(await getTemplatePolicy(tpl)).listed) {
    return { ok: false, error: "template_unavailable" };
  }
  const isCouple = ["wedding", "engagement", "anniversary"].includes(v.type);
  const hasPartner = !!(v.partnerOne || v.partnerTwo);
  if (hasPartner && (!isCouple || !v.partnerOne || !v.partnerTwo)) return { ok: false, error: "host" };
  if (!hasPartner && !v.hostKm && !v.hostEn) return { ok: false, error: "host" };

  const plan = await getPlan(user.planCode);
  const [{ n }] = await db.select({ n: count() }).from(schema.events).where(and(eq(schema.events.ownerId, user.id), isNull(schema.events.deletedAt)));
  if (user.role !== "super_admin" && n >= plan.limits.maxEvents) return { ok: false, error: "plan_events_limit" };

  let startsAt: Date;
  let endsAt: Date | null;
  try {
    startsAt = zonedToUtc(v.date, v.startTime, v.timezone);
    endsAt = v.endTime ? zonedToUtc(v.date, v.endTime, v.timezone) : null;
  } catch {
    return { ok: false, error: "invalid_date" };
  }

  const partnerNames = hasPartner ? [v.partnerOne, v.partnerTwo] as const : undefined;
  const names = partnerNames?.join(" & ");
  const hostNames = names
    ? v.locale === "km" ? l(names, v.hostEn || names) : l(v.hostKm || names, names)
    : l(v.hostKm || v.hostEn, v.hostEn || v.hostKm);
  const doc = starterDoc(tpl, { hostNames, partnerNames, message: v.message, agenda: v.agenda, locale: v.locale });

  const file = media?.get("cover");
  let image: Buffer | undefined;
  if (file != null) {
    if (!(file instanceof File) || !file.size) return { ok: false, error: "invalid_cover" };
    const envMax = Number(process.env.MAX_UPLOAD_MB || 0);
    if (envMax > 0 && file.size > envMax * 1024 * 1024) return { ok: false, error: "cover_too_large" };
    const bytes = Buffer.from(await file.arrayBuffer());
    if (sniff(bytes)?.kind !== "image") return { ok: false, error: "invalid_cover" };
    try {
      const sharp = (await import("sharp")).default;
      image = await sharp(bytes, { failOn: "error", limitInputPixels: 40_000_000 })
        .rotate().resize(1200, 630, { fit: "inside", withoutEnlargement: true })
        .flatten({ background: "#FAF9F6" }).jpeg({ quality: 85 }).toBuffer();
    } catch {
      return { ok: false, error: "invalid_cover" };
    }
  }

  const eventId = randomUUID();
  const assetId = image ? randomUUID() : undefined;
  const storageKey = assetId ? `${eventId}/${assetId}` : undefined;
  if (assetId) doc.shareImage = `/api/media/${assetId}`;

  try {
    if (image && storageKey) await putObject(storageKey, image);
    await db.transaction(async (tx) => {
      await tx.insert(schema.events).values({
        id: eventId, ownerId: user.id, type: v.type, title: v.title, organizerNotes: v.organizerNotes || null,
        timezone: v.timezone, startsAt, endsAt,
        venueName: v.venueName || null, venueAddress: v.venueAddress || null, mapUrl: v.mapUrl || null,
        templateSlug: tpl.slug, templateVersion: tpl.version, draft: doc,
      });
      if (image && assetId && storageKey) {
        await tx.insert(schema.mediaAssets).values({
          id: assetId, eventId, ownerId: user.id, kind: "image", mime: "image/jpeg", bytes: image.length,
          storageKey, sha256: createHash("sha256").update(image).digest("hex"),
        });
      }
      await tx.insert(schema.eventMembers).values({ eventId, userId: user.id, role: "owner" });
      const groups = v.type === "wedding" || v.type === "engagement" ? DEFAULT_GROUPS : DEFAULT_GROUPS.slice(2);
      await tx.insert(schema.guestGroups).values(groups.map((name, i) => ({ eventId, name, sort: i })));
      await tx.insert(schema.auditLogs).values({
        action: "event.create", actorId: user.id, eventId, meta: { template: tpl.slug },
      });
    });
  } catch (error) {
    if (storageKey) await deleteObject(storageKey).catch(() => undefined);
    console.error("Event creation failed", error);
    return { ok: false, error: "create_failed" };
  }
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
  if (tpl && tpl.slug !== event.templateSlug && !(await getTemplatePolicy(tpl)).listed) {
    return { ok: false, error: "invalid", detail: "template" };
  }
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

export async function changeEventTemplateAction(eventId: string, revision: number, slug: string): Promise<ActionResult> {
  const { event } = await assertEvent(eventId, "event.edit");
  if (revision !== event.revision) return { ok: false, error: "conflict" };
  const template = getTemplate(slug);
  if (!template || template.category !== event.type || !(await getTemplatePolicy(template)).listed) {
    return { ok: false, error: "template_unavailable" };
  }
  const updated = await db.update(schema.events)
    .set({ templateSlug: template.slug, templateVersion: template.version, revision: revision + 1, updatedAt: new Date() })
    .where(and(eq(schema.events.id, eventId), eq(schema.events.revision, revision), isNull(schema.events.deletedAt)))
    .returning({ id: schema.events.id });
  if (!updated.length) return { ok: false, error: "conflict" };
  revalidatePath(`/dashboard/events/${eventId}`, "layout");
  return { ok: true };
}

export async function publishAction(eventId: string): Promise<ActionResult> {
  const { user, event } = await assertEvent(eventId, "event.publish");
  if (event.status === "archived") return { ok: false, error: "event_archived" };
  const tpl = getTemplate(event.templateSlug);
  const tier = tpl ? (await getTemplatePolicy(tpl)).tier : undefined;
  const [owner] = await db.select({ planCode: schema.users.planCode, role: schema.users.role }).from(schema.users).where(eq(schema.users.id, event.ownerId));
  const plan = await getPlan(owner.planCode);
  if (tier === "premium" && !plan.limits.premiumTemplates && owner.role !== "super_admin") return { ok: false, error: "plan_premium_template" };
  const doc = InvitationDocSchema.parse(event.draft);
  const updated = await db.transaction(async (tx) => {
    const [row] = await tx.update(schema.events).set({
      published: doc, publishedTemplateSlug: event.templateSlug, publishedAt: new Date(), status: "published", updatedAt: new Date(),
    }).where(and(eq(schema.events.id, eventId), isNull(schema.events.deletedAt), ne(schema.events.status, "archived")))
      .returning({ id: schema.events.id });
    if (!row) return false;
    await tx.insert(schema.invitationVersions).values({ eventId, kind: "publish", doc, createdBy: user.id });
    return true;
  });
  if (!updated) return { ok: false, error: "event_archived" };
  await audit("event.publish", { actorId: user.id, eventId });
  revalidatePath(`/dashboard/events/${eventId}`);
  return { ok: true };
}

export async function unpublishAction(eventId: string): Promise<ActionResult> {
  const { user } = await assertEvent(eventId, "event.publish");
  const [updated] = await db.update(schema.events).set({ status: "draft", updatedAt: new Date() })
    .where(and(eq(schema.events.id, eventId), isNull(schema.events.deletedAt), ne(schema.events.status, "archived")))
    .returning({ id: schema.events.id });
  if (!updated) return { ok: false, error: "event_archived" };
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

export async function updateEventSettingsAction(eventId: string, input: EventSettingsInput): Promise<ActionResult> {
  const { user, event } = await assertEvent(eventId, "event.edit");
  const p = EventSettingsSchema.safeParse(input);
  if (!p.success) return { ok: false, error: p.error.issues.map((i) => i.path.join(".")).join(", ") };
  const v = p.data;
  await db
    .update(schema.events)
    .set({
      title: v.title, timezone: v.timezone,
      ...(v.organizerNotes !== undefined ? { organizerNotes: v.organizerNotes || null } : {}),
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
