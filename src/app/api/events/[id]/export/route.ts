import { NextResponse, type NextRequest } from "next/server";
import { asc, eq } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/session";
import { getEventRole } from "@/lib/auth/event-access";
import { can } from "@/lib/auth/permissions";
import { toCsv } from "@/features/guests/csv";
import { guestLink } from "@/features/guests/links";
import { formatMoney, type Currency } from "@/lib/money";
import { audit } from "@/lib/audit";

/** CSV exports: guests | seating | gifts | expenses. Permission-checked per kind; formula-injection safe. */
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user || !/^[0-9a-f-]{36}$/.test(id)) return new NextResponse(null, { status: 404 });
  const role = await getEventRole(user.id, id);
  const kind = req.nextUrl.searchParams.get("kind") ?? "guests";
  const need = kind === "gifts" || kind === "expenses" ? "finance.view" : "guests.view";
  if (!can(role, need)) return new NextResponse(null, { status: 404 });

  let rows: unknown[][] = [];
  if (kind === "guests" || kind === "seating") {
    const status = req.nextUrl.searchParams.get("status");
    const groups = await db.select().from(schema.guestGroups).where(eq(schema.guestGroups.eventId, id));
    const tables = await db.select().from(schema.seatingTables).where(eq(schema.seatingTables.eventId, id));
    let guests = await db.select().from(schema.guests).where(eq(schema.guests.eventId, id)).orderBy(asc(schema.guests.fullName));
    if (status) guests = guests.filter((g) => g.rsvpStatus === status);
    const withLinks = can(role, "guests.edit") && req.nextUrl.searchParams.get("links") === "1";
    if (kind === "seating") {
      guests.sort((a, b) => (tables.find((t) => t.id === a.tableId)?.label ?? "~").localeCompare(tables.find((t) => t.id === b.tableId)?.label ?? "~"));
      rows = [["Table", "Name", "Khmer name", "Group", "RSVP", "Attending"], ...guests.map((g) => [tables.find((t) => t.id === g.tableId)?.label ?? "", g.fullName, g.khmerName, groups.find((x) => x.id === g.groupId)?.name ?? "", g.rsvpStatus, g.attendeeCount])];
    } else {
      rows = [["Name", "Khmer name", "Title", "Phone", "Email", "Group", "Allowed", "RSVP", "Attending", "Checked in", "Table", "Notes", ...(withLinks ? ["Link"] : [])],
        ...guests.map((g) => [g.fullName, g.khmerName, g.honorific, g.phone, g.email, groups.find((x) => x.id === g.groupId)?.name ?? "", g.allowedAttendees, g.rsvpStatus, g.attendeeCount, g.checkedInCount, tables.find((t) => t.id === g.tableId)?.label ?? "", g.notes, ...(withLinks ? [guestLink(g.tokenEnc) ?? ""] : [])])];
    }
  } else if (kind === "gifts") {
    const gifts = await db.select({ g: schema.giftRecords, name: schema.guests.fullName }).from(schema.giftRecords).leftJoin(schema.guests, eq(schema.guests.id, schema.giftRecords.guestId)).where(eq(schema.giftRecords.eventId, id));
    rows = [["Guest", "Type", "Amount", "Currency", "Description", "Date", "Notes"], ...gifts.map(({ g, name }) => [name ?? "", g.kind, g.kind === "cash" ? formatMoney(g.amountMinor, g.currency as Currency) : "", g.currency, g.description, g.receivedOn, g.notes])];
  } else if (kind === "expenses") {
    const ex = await db.select().from(schema.expenses).where(eq(schema.expenses.eventId, id));
    rows = [["Category", "Vendor", "Planned", "Actual", "Currency", "Status", "Notes"], ...ex.map((e) => [e.category, e.vendor, formatMoney(e.plannedMinor, e.currency as Currency), formatMoney(e.actualMinor, e.currency as Currency), e.currency, e.paymentStatus, e.notes])];
  } else return new NextResponse(null, { status: 400 });

  await audit("export", { actorId: user.id, eventId: id, meta: { kind } });
  return new NextResponse(toCsv(rows), {
    headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="${kind}-${id.slice(0, 8)}.csv"`, "Cache-Control": "private, no-store" },
  });
}
