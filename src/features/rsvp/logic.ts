/** Pure RSVP rules — unit tested. */
export type RsvpStatus = "attending" | "declined" | "maybe";

export function validateRsvp(input: { status: string; count: number }, opts: { allowed: number; allowMaybe: boolean; deadline: Date | null; now: Date }):
  | { ok: true; status: RsvpStatus; count: number }
  | { ok: false; error: "deadline" | "status" | "count" } {
  if (opts.deadline && opts.now > opts.deadline) return { ok: false, error: "deadline" };
  const s = input.status;
  if (s !== "attending" && s !== "declined" && !(s === "maybe" && opts.allowMaybe)) return { ok: false, error: "status" };
  if (s === "declined") return { ok: true, status: "declined", count: 0 };
  const c = Math.trunc(Number(input.count));
  if (!Number.isFinite(c) || c < 1 || c > opts.allowed) return { ok: false, error: "count" };
  return { ok: true, status: s as RsvpStatus, count: c };
}

export function summarize(guests: { rsvpStatus: string; attendeeCount: number; allowedAttendees: number; checkedInCount: number }[]) {
  const s = { invited: guests.length, attending: 0, declined: 0, maybe: 0, pending: 0, expected: 0, maxPossible: 0, checkedIn: 0 };
  for (const g of guests) {
    s.maxPossible += g.allowedAttendees;
    s.checkedIn += g.checkedInCount;
    if (g.rsvpStatus === "attending") { s.attending++; s.expected += g.attendeeCount; }
    else if (g.rsvpStatus === "declined") s.declined++;
    else if (g.rsvpStatus === "maybe") s.maybe++;
    else s.pending++;
  }
  return s;
}
