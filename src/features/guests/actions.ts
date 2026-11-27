"use server";

import { z } from "zod";
import { and, count, eq, inArray } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db, schema } from "@/lib/db";
import { assertEvent } from "@/lib/auth/event-access";
import { encrypt, generateToken, sha256 } from "@/lib/security/tokens";
import { audit } from "@/lib/audit";
import { getPlan } from "@/features/billing/queries";
import { parseCsv } from "./csv";
import type { ActionResult } from "@/features/events/actions";

const GuestSchema = z.object({
  fullName: z.string().trim().min(1).max(160),
  khmerName: z.string().trim().max(160).default(""),
  honorific: z.string().trim().max(40).default(""),
  phone: z.string().trim().max(40).default(""),
  email: z.string().trim().max(200).refine((v) => v === "" || z.string().email().safeParse(v).success, "email").default(""),
  groupId: z.string().uuid().nullable().or(z.literal("")).default(""),
  allowedAttendees: z.coerce.number().int().min(0).max(50).default(0),
  notes: z.string().trim().max(1000).default(""),
});
export type GuestInput = z.input<typeof GuestSchema>;

function newToken() {
  const token = generateToken();
  return { tokenHash: sha256(token), tokenEnc: encrypt(token), tokenIssuedAt: new Date() };
}

async function checkGuestQuota(eventId: string, ownerId: string, adding: number) {
  const [owner] = await db.select({ planCode: schema.users.planCode, role: schema.users.role }).from(schema.users).where(eq(schema.users.id, ownerId));
  if (owner.role === "super_admin") return true;
  const plan = await getPlan(owner.planCode);
  const [{ n }] = await db.select({ n: count() }).from(schema.guests).where(eq(schema.guests.eventId, eventId));
  return n + adding <= plan.limits.maxGuestsPerEvent;
}

async function groupBelongs(eventId: string, groupId: string | null) {
  if (!groupId) return true;
  const r = await db.select({ id: schema.guestGroups.id }).from(schema.guestGroups).where(and(eq(schema.guestGroups.id, groupId), eq(schema.guestGroups.eventId, eventId)));
  return r.length > 0;
}

export async function addGuestAction(eventId: string, input: GuestInput): Promise<ActionResult> {
  const { user, event } = await assertEvent(eventId, "guests.edit");
  const p = GuestSchema.safeParse(input);
  if (!p.success) return { ok: false, error: p.error.issues.map((i) => i.path.join(".")).join(", ") };
  const groupId = p.data.groupId || null;
  if (!(await groupBelongs(eventId, groupId))) return { ok: false, error: "group" };
  if (!(await checkGuestQuota(eventId, event.ownerId, 1))) return { ok: false, error: "plan_guest_limit" };
  const [g] = await db.insert(schema.guests).values({
    eventId, ...p.data, groupId, khmerName: p.data.khmerName || null, honorific: p.data.honorific || null,
    phone: p.data.phone || null, email: p.data.email || null, notes: p.data.notes || null, ...newToken(),
  }).returning({ id: schema.guests.id });
  await audit("guest.add", { actorId: user.id, eventId, meta: { guestId: g.id } });
  revalidatePath(`/dashboard/events/${eventId}/guests`);
  return { ok: true, data: { id: g.id } };
}

export async function updateGuestAction(eventId: string, guestId: string, input: GuestInput): Promise<ActionResult> {
  const { user } = await assertEvent(eventId, "guests.edit");
  const p = GuestSchema.safeParse(input);
  if (!p.success) return { ok: false, error: p.error.issues.map((i) => i.path.join(".")).join(", ") };
  const groupId = p.data.groupId || null;
  if (!(await groupBelongs(eventId, groupId))) return { ok: false, error: "group" };
  const r = await db.update(schema.guests).set({
    ...p.data, groupId, khmerName: p.data.khmerName || null, honorific: p.data.honorific || null,
    phone: p.data.phone || null, email: p.data.email || null, notes: p.data.notes || null, updatedAt: new Date(),
  }).where(and(eq(schema.guests.id, guestId), eq(schema.guests.eventId, eventId))).returning({ id: schema.guests.id });
  if (!r.length) return { ok: false, error: "not_found" };
  await audit("guest.update", { actorId: user.id, eventId, meta: { guestId } });
  revalidatePath(`/dashboard/events/${eventId}/guests`);
  return { ok: true };
}

export async function deleteGuestsAction(eventId: string, guestIds: string[]): Promise<ActionResult> {
  const { user } = await assertEvent(eventId, "guests.edit");
  if (!guestIds.length || guestIds.length > 2000) return { ok: false, error: "invalid" };
  await db.delete(schema.guests).where(and(eq(schema.guests.eventId, eventId), inArray(schema.guests.id, guestIds)));
  await audit("guest.delete", { actorId: user.id, eventId, meta: { count: guestIds.length } });
  revalidatePath(`/dashboard/events/${eventId}/guests`);
  return { ok: true };
}

export async function moveGuestsAction(eventId: string, guestIds: string[], groupId: string | null): Promise<ActionResult> {
  await assertEvent(eventId, "guests.edit");
  if (!(await groupBelongs(eventId, groupId))) return { ok: false, error: "group" };
  await db.update(schema.guests).set({ groupId, updatedAt: new Date() }).where(and(eq(schema.guests.eventId, eventId), inArray(schema.guests.id, guestIds)));
  revalidatePath(`/dashboard/events/${eventId}/guests`);
  return { ok: true };
}

/** Regenerate = old link stops working immediately; revoke = no working link until regenerated. */
export async function regenerateLinkAction(eventId: string, guestId: string): Promise<ActionResult> {
  const { user } = await assertEvent(eventId, "guests.edit");
  const r = await db.update(schema.guests).set({ ...newToken(), updatedAt: new Date() }).where(and(eq(schema.guests.id, guestId), eq(schema.guests.eventId, eventId))).returning({ id: schema.guests.id });
  if (!r.length) return { ok: false, error: "not_found" };
  await audit("guest.link_regenerate", { actorId: user.id, eventId, meta: { guestId } });
  revalidatePath(`/dashboard/events/${eventId}/guests`);
  return { ok: true };
}

export async function revokeLinkAction(eventId: string, guestId: string): Promise<ActionResult> {
  const { user } = await assertEvent(eventId, "guests.edit");
  await db.update(schema.guests).set({ tokenHash: null, tokenEnc: null, updatedAt: new Date() }).where(and(eq(schema.guests.id, guestId), eq(schema.guests.eventId, eventId)));
  await audit("guest.link_revoke", { actorId: user.id, eventId, meta: { guestId } });
  revalidatePath(`/dashboard/events/${eventId}/guests`);
  return { ok: true };
}

export async function addGroupAction(eventId: string, name: string): Promise<ActionResult> {
  await assertEvent(eventId, "guests.edit");
  const n = name.trim().slice(0, 80);
  if (!n) return { ok: false, error: "name" };
  await db.insert(schema.guestGroups).values({ eventId, name: n, sort: 99 }).onConflictDoNothing();
  revalidatePath(`/dashboard/events/${eventId}/guests`);
  return { ok: true };
}

export async function deleteGroupAction(eventId: string, groupId: string): Promise<ActionResult> {
  await assertEvent(eventId, "guests.edit");
  await db.delete(schema.guestGroups).where(and(eq(schema.guestGroups.id, groupId), eq(schema.guestGroups.eventId, eventId)));
  revalidatePath(`/dashboard/events/${eventId}/guests`);
  return { ok: true };
}

const HEADER_MAP: Record<string, keyof GuestInput | "group"> = {
  name: "fullName", "full name": "fullName", fullname: "fullName", "ឈ្មោះ": "fullName",
  "khmer name": "khmerName", "ឈ្មោះខ្មែរ": "khmerName",
  title: "honorific", honorific: "honorific", "ងារ": "honorific",
  phone: "phone", "លេខទូរស័ព្ទ": "phone", "ទូរស័ព្ទ": "phone",
  email: "email", "អ៊ីមែល": "email",
  group: "group", "ក្រុម": "group",
  allowed: "allowedAttendees", "allowed attendees": "allowedAttendees", guests: "allowedAttendees", "ចំនួន": "allowedAttendees",
  notes: "notes", "កំណត់ចំណាំ": "notes",
};

export type ImportPreview = { rows: { line: number; data: GuestInput & { group?: string }; error?: string; duplicate?: boolean }[]; unknownHeaders: string[] };

function normName(s: string) {
  return s.normalize("NFC").toLowerCase().replace(/\s+/g, " ").trim();
}

/** Parse + validate + detect duplicates (against existing guests and within the file). Nothing is written. */
export async function previewImportAction(eventId: string, csvText: string): Promise<ImportPreview | { error: string }> {
  await assertEvent(eventId, "guests.edit");
  if (csvText.length > 2_000_000) return { error: "file_too_large" };
  const table = parseCsv(csvText);
  if (table.length < 2) return { error: "empty" };
  const headers = table[0].map((h) => h.trim().toLowerCase());
  const mapped = headers.map((h) => HEADER_MAP[h]);
  const existing = await db.select({ fullName: schema.guests.fullName, phone: schema.guests.phone }).from(schema.guests).where(eq(schema.guests.eventId, eventId));
  const seen = new Set(existing.map((g) => normName(g.fullName) + "|" + (g.phone ?? "")));
  const rows: ImportPreview["rows"] = [];
  table.slice(1, 3001).forEach((cells, i) => {
    if (cells.every((c) => !c.trim())) return;
    const rec: Record<string, string> = {};
    mapped.forEach((key, idx) => { if (key) rec[key] = (cells[idx] ?? "").trim(); });
    const p = GuestSchema.safeParse({ ...rec, groupId: "" });
    const key = normName(rec.fullName ?? "") + "|" + (rec.phone ?? "");
    const duplicate = seen.has(key);
    seen.add(key);
    rows.push({ line: i + 2, data: { ...(p.success ? p.data : (rec as GuestInput)), group: rec.group }, error: p.success ? undefined : p.error.issues.map((x) => x.path.join(".")).join(", "), duplicate });
  });
  return { rows, unknownHeaders: headers.filter((_, i) => !mapped[i]) };
}

export async function commitImportAction(eventId: string, csvText: string, skipDuplicates: boolean): Promise<ActionResult> {
  const { user, event } = await assertEvent(eventId, "guests.edit");
  const prev = await previewImportAction(eventId, csvText);
  if ("error" in prev) return { ok: false, error: prev.error };
  const good = prev.rows.filter((r) => !r.error && !(skipDuplicates && r.duplicate));
  if (!good.length) return { ok: false, error: "no_valid_rows" };
  if (!(await checkGuestQuota(eventId, event.ownerId, good.length))) return { ok: false, error: "plan_guest_limit" };

  await db.transaction(async (tx) => {
    const groups = await tx.select().from(schema.guestGroups).where(eq(schema.guestGroups.eventId, eventId));
    const byName = new Map(groups.map((g) => [normName(g.name), g.id]));
    for (const r of good) {
      const gname = r.data.group?.trim();
      if (gname && !byName.has(normName(gname))) {
        const [g] = await tx.insert(schema.guestGroups).values({ eventId, name: gname.slice(0, 80), sort: 50 }).returning({ id: schema.guestGroups.id });
        byName.set(normName(gname), g.id);
      }
    }
    const values = good.map((r) => {
      const d = GuestSchema.parse({ ...r.data, groupId: "" });
      return {
        eventId, fullName: d.fullName, khmerName: d.khmerName || null, honorific: d.honorific || null, phone: d.phone || null, email: d.email || null,
        allowedAttendees: d.allowedAttendees, notes: d.notes || null, groupId: r.data.group ? byName.get(normName(r.data.group)) ?? null : null, ...newToken(),
      };
    });
    for (let i = 0; i < values.length; i += 200) await tx.insert(schema.guests).values(values.slice(i, i + 200));
  });
  await audit("guest.import", { actorId: user.id, eventId, meta: { count: good.length } });
  revalidatePath(`/dashboard/events/${eventId}/guests`);
  return { ok: true, data: { imported: good.length } };
}
