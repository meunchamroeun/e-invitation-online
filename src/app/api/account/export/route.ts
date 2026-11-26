import { NextResponse } from "next/server";
import { eq, inArray } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/session";
import { audit } from "@/lib/audit";

/** GDPR-style export of everything the account owns. Guest link tokens are excluded (credentials). */
export async function GET() {
  const u = await getCurrentUser();
  if (!u) return new NextResponse(null, { status: 401 });
  const events = await db.select().from(schema.events).where(eq(schema.events.ownerId, u.id));
  const ids = events.map((e) => e.id);
  const inEv = <T extends { eventId: unknown }>(t: T) => t;
  void inEv;
  const [guests, responses, gifts, expenses, tables, wishes] = ids.length ? await Promise.all([
    db.select().from(schema.guests).where(inArray(schema.guests.eventId, ids)),
    db.select().from(schema.rsvpResponses).where(inArray(schema.rsvpResponses.eventId, ids)),
    db.select().from(schema.giftRecords).where(inArray(schema.giftRecords.eventId, ids)),
    db.select().from(schema.expenses).where(inArray(schema.expenses.eventId, ids)),
    db.select().from(schema.seatingTables).where(inArray(schema.seatingTables.eventId, ids)),
    db.select().from(schema.guestWishes).where(inArray(schema.guestWishes.eventId, ids)),
  ]) : [[], [], [], [], [], []];
  await audit("user.export", { actorId: u.id });
  const body = JSON.stringify({ exportedAt: new Date().toISOString(), user: u, events, guests: guests.map(({ tokenHash, tokenEnc, ...g }) => (void tokenHash, void tokenEnc, g)), responses, gifts, expenses, tables, wishes }, null, 2);
  return new NextResponse(body, { headers: { "Content-Type": "application/json", "Content-Disposition": `attachment; filename="theab-export.json"`, "Cache-Control": "no-store" } });
}
