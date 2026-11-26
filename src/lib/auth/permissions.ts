/** Pure permission matrix — unit tested. Server code must always call this; never trust the UI. */
export type EventRole = "owner" | "editor" | "staff" | "viewer";
export type EventAction =
  | "event.view"
  | "event.edit"
  | "event.publish"
  | "event.delete"
  | "guests.view"
  | "guests.edit"
  | "rsvp.override"
  | "checkin.perform"
  | "seating.edit"
  | "finance.view"
  | "finance.edit"
  | "giftqr.edit"
  | "team.manage";

const MATRIX: Record<EventRole, EventAction[]> = {
  owner: [
    "event.view", "event.edit", "event.publish", "event.delete", "guests.view", "guests.edit", "rsvp.override",
    "checkin.perform", "seating.edit", "finance.view", "finance.edit", "giftqr.edit", "team.manage",
  ],
  editor: ["event.view", "event.edit", "guests.view", "guests.edit", "rsvp.override", "seating.edit", "checkin.perform"],
  staff: ["event.view", "guests.view", "checkin.perform"],
  viewer: ["event.view", "guests.view"],
};

export function can(role: EventRole | null | undefined, action: EventAction): boolean {
  if (!role) return false;
  return MATRIX[role]?.includes(action) ?? false;
}
