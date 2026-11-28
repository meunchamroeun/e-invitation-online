export const auditActionLabels: Record<string, string> = {
  "admin.user_plan": "Changed user plan",
  "admin.user_role": "Changed user role",
  "admin.user_suspended": "Suspended user",
  "admin.user_restored": "Restored user access",
  "admin.event_archived": "Archived event",
  "admin.event_restored": "Restored event",
  "admin.template": "Updated template settings",
  "admin.template.bulk": "Bulk updated templates",
  "admin.plan_update": "Updated subscription plan",
  "admin.billing_approved": "Approved payment",
  "admin.billing_rejected": "Rejected payment",
  "event.publish": "Published event",
  "event.unpublish": "Unpublished event",
  "event.restore_version": "Restored an invitation version",
  "event.settings": "Updated event settings",
  "event.delete": "Deleted event",
  "billing.request": "Requested plan upgrade",
  "user.login.google": "Signed in with Google",
  "user.register.google": "Registered with Google",
  "user.login.telegram": "Signed in with Telegram",
  "user.register.telegram": "Registered with Telegram",
  "user.login": "Signed in",
  "user.register": "Registered a user",
  "user.password_change": "Changed account password",
  "user.export": "Exported account data",
  "user.delete": "Deleted account",
  "rsvp.override": "Updated RSVP as organizer",
  "wish.moderate": "Moderated a wish",
};

export function auditActionLabel(action: string) {
  const known = auditActionLabels[action];
  if (known) return known;
  const cleaned = action.replaceAll(/[._]/g, " ");
  return cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
}

export function auditSummary(action: string, meta: unknown) {
  if (!meta || typeof meta !== "object" || Array.isArray(meta)) return "";
  const { planCode, code, role, slug, status, isPublished, isFeatured, tier, count } = meta as Record<string, unknown>;
  if (action === "admin.user_plan" && typeof planCode === "string") return `Plan ${planCode}`;
  if (action === "admin.user_role" && typeof role === "string") return role === "super_admin" ? "Role set to super admin" : "Role set to user";
  if (action === "admin.plan_update" && typeof code === "string") return `Plan ${code}`;
  if (action === "admin.template") {
    return [
      typeof slug === "string" ? slug : null,
      typeof tier === "string" ? tier : null,
      typeof isPublished === "boolean" ? (isPublished ? "published" : "hidden") : null,
      typeof isFeatured === "boolean" ? (isFeatured ? "featured" : "unfeatured") : null,
    ].filter(Boolean).join(" · ");
  }
  if (action === "admin.template.bulk") {
    return [
      typeof count === "number" ? `${count} templates` : null,
      typeof tier === "string" ? tier : null,
      typeof isPublished === "boolean" ? (isPublished ? "published" : "hidden") : null,
      typeof isFeatured === "boolean" ? (isFeatured ? "featured" : "unfeatured") : null,
    ].filter(Boolean).join(" · ");
  }
  if (action.startsWith("admin.event_") && typeof status === "string") return `Status ${status}`;
  if ((action.startsWith("admin.billing_") || action === "billing.request") && typeof planCode === "string") return `Plan ${planCode}`;
  if ((action === "guest.import" || action === "guest.delete") && typeof count === "number") return `${count} guest records`;
  return "";
}

export const accountIdPattern = /^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i;

export function auditTargetAccount(action: string, meta: unknown) {
  if (!action.startsWith("admin.user_") && !action.startsWith("admin.billing_")) return null;
  if (!meta || typeof meta !== "object" || !("userId" in meta)) return null;
  return typeof meta.userId === "string" && accountIdPattern.test(meta.userId) ? meta.userId : null;
}
