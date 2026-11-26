import "server-only";
import { and, eq, isNull } from "drizzle-orm";
import { notFound } from "next/navigation";
import { db, schema } from "@/lib/db";
import { requireUser, type SessionUser } from "./session";
import { can, type EventAction, type EventRole } from "./permissions";

export type EventRow = typeof schema.events.$inferSelect;

export async function getEventRole(userId: string, eventId: string): Promise<EventRole | null> {
  const rows = await db
    .select({ role: schema.eventMembers.role })
    .from(schema.eventMembers)
    .where(and(eq(schema.eventMembers.eventId, eventId), eq(schema.eventMembers.userId, userId)))
    .limit(1);
  return (rows[0]?.role as EventRole) ?? null;
}

/** Loads an event only if the current user holds a role permitting `action`. 404 otherwise (no existence leak). */
export async function requireEvent(
  eventId: string,
  action: EventAction,
): Promise<{ user: SessionUser; event: EventRow; role: EventRole }> {
  const user = await requireUser();
  if (!/^[0-9a-f-]{36}$/i.test(eventId)) notFound();
  const role = await getEventRole(user.id, eventId);
  if (!can(role, action)) notFound();
  const rows = await db
    .select()
    .from(schema.events)
    .where(and(eq(schema.events.id, eventId), isNull(schema.events.deletedAt)))
    .limit(1);
  if (!rows[0]) notFound();
  return { user, event: rows[0], role: role! };
}

/** Same check for server actions / route handlers: throws instead of rendering 404. */
export async function assertEvent(eventId: string, action: EventAction) {
  try {
    return await requireEvent(eventId, action);
  } catch (e) {
    throw e;
  }
}
