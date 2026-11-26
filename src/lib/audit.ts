import "server-only";
import { db, schema } from "@/lib/db";

export async function audit(action: string, opts: { actorId?: string | null; eventId?: string | null; meta?: unknown } = {}) {
  await db.insert(schema.auditLogs).values({
    action,
    actorId: opts.actorId ?? null,
    eventId: opts.eventId ?? null,
    meta: (opts.meta ?? null) as object | null,
  });
}
