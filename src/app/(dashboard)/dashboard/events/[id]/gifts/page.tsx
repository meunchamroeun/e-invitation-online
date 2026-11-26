import { asc, desc, eq } from "drizzle-orm";
import { requireEvent } from "@/lib/auth/event-access";
import { can } from "@/lib/auth/permissions";
import { db, schema } from "@/lib/db";
import { getI18n } from "@/i18n/server";
import { GiftLedger } from "@/components/dashboard/finance";

export default async function GiftsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { role } = await requireEvent(id, "finance.view");
  const { locale } = await getI18n();
  const [gifts, guests] = await Promise.all([
    db.select().from(schema.giftRecords).where(eq(schema.giftRecords.eventId, id)).orderBy(desc(schema.giftRecords.createdAt)),
    db.select({ id: schema.guests.id, name: schema.guests.fullName, khmer: schema.guests.khmerName }).from(schema.guests).where(eq(schema.guests.eventId, id)).orderBy(asc(schema.guests.fullName)),
  ]);
  return <GiftLedger eventId={id} locale={locale} canEdit={can(role, "finance.edit")} guests={guests.map((g) => ({ id: g.id, name: g.khmer || g.name }))}
    gifts={gifts.map((g) => ({ id: g.id, kind: g.kind as "cash" | "item", amountMinor: g.amountMinor, currency: g.currency as "USD" | "KHR", guestId: g.guestId ?? "", description: g.description ?? "", receivedOn: g.receivedOn ?? "", notes: g.notes ?? "" }))} />;
}
