import {
  pgTable,
  uuid,
  text,
  timestamp,
  integer,
  boolean,
  jsonb,
  bigint,
  uniqueIndex,
  index,
  doublePrecision,
} from "drizzle-orm/pg-core";

const ts = (name: string) => timestamp(name, { withTimezone: true });
const createdAt = () => ts("created_at").notNull().defaultNow();
const updatedAt = () => ts("updated_at").notNull().defaultNow();

/* ---------------- Identity ---------------- */

export const users = pgTable(
  "users",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    email: text("email").notNull(),
    passwordHash: text("password_hash").notNull(),
    name: text("name").notNull(),
    locale: text("locale").notNull().default("km"),
    role: text("role").notNull().default("user"), // user | super_admin
    planCode: text("plan_code").notNull().default("free"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
    suspendedAt: ts("suspended_at"),
    deletedAt: ts("deleted_at"),
  },
  (t) => [uniqueIndex("users_email_uq").on(t.email)],
);

export const sessions = pgTable(
  "sessions",
  {
    id: text("id").primaryKey(), // sha256(session token) — raw token only lives in the cookie
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    expiresAt: ts("expires_at").notNull(),
    createdAt: createdAt(),
  },
  (t) => [index("sessions_user_idx").on(t.userId)],
);

/* ---------------- Plans ---------------- */

export const plans = pgTable("plans", {
  code: text("code").primaryKey(), // free | standard | premium | business
  nameKm: text("name_km").notNull(),
  nameEn: text("name_en").notNull(),
  priceMinor: bigint("price_minor", { mode: "number" }).notNull().default(0), // USD cents, admin configurable
  currency: text("currency").notNull().default("USD"),
  limits: jsonb("limits").$type<PlanLimits>().notNull(),
  features: jsonb("features").$type<string[]>().notNull().default([]),
  sort: integer("sort").notNull().default(0),
  isActive: boolean("is_active").notNull().default(true),
  updatedAt: updatedAt(),
});

export type PlanLimits = {
  maxEvents: number;
  maxGuestsPerEvent: number;
  maxPhotos: number;
  premiumTemplates: boolean;
  seating: boolean;
  checkin: boolean;
  telegram: boolean;
  finance: boolean;
  branding: boolean;
};

/* ---------------- Templates ---------------- */

export const templates = pgTable(
  "templates",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    slug: text("slug").notNull(),
    nameKm: text("name_km").notNull(),
    nameEn: text("name_en").notNull(),
    category: text("category").notNull(),
    style: text("style").notNull(),
    color: text("color").notNull(),
    tier: text("tier").notNull().default("free"), // free | premium
    isPublished: boolean("is_published").notNull().default(true),
    isFeatured: boolean("is_featured").notNull().default(false),
    popularity: integer("popularity").notNull().default(0),
    currentVersion: integer("current_version").notNull().default(1),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [uniqueIndex("templates_slug_uq").on(t.slug)],
);

export const templateVersions = pgTable(
  "template_versions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    templateId: uuid("template_id").notNull().references(() => templates.id, { onDelete: "cascade" }),
    version: integer("version").notNull(),
    definition: jsonb("definition").notNull(), // TemplateDefinition (validated with zod)
    createdAt: createdAt(),
  },
  (t) => [uniqueIndex("template_versions_uq").on(t.templateId, t.version)],
);

/* ---------------- Events & invitations ---------------- */

export const events = pgTable(
  "events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    ownerId: uuid("owner_id").notNull().references(() => users.id),
    type: text("type").notNull(),
    title: text("title").notNull(),
    organizerNotes: text("organizer_notes"),
    status: text("status").notNull().default("draft"), // draft | published | archived
    archivedFrom: text("archived_from").$type<"draft" | "published">(),
    timezone: text("timezone").notNull().default("Asia/Phnom_Penh"),
    startsAt: ts("starts_at"),
    endsAt: ts("ends_at"),
    venueName: text("venue_name"),
    venueAddress: text("venue_address"),
    mapUrl: text("map_url"),
    lat: doublePrecision("lat"),
    lng: doublePrecision("lng"),
    templateSlug: text("template_slug").notNull(),
    templateVersion: integer("template_version").notNull().default(1),
    draft: jsonb("draft").notNull(), // InvitationDoc being edited
    revision: integer("revision").notNull().default(1), // optimistic concurrency for autosave
    published: jsonb("published"), // snapshot guests see
    publishedTemplateSlug: text("published_template_slug"),
    publishedAt: ts("published_at"),
    publicSlug: text("public_slug"), // optional public (non-personal) link
    isPublic: boolean("is_public").notNull().default(false),
    rsvpDeadline: ts("rsvp_deadline"),
    allowMaybe: boolean("allow_maybe").notNull().default(true),
    wishesEnabled: boolean("wishes_enabled").notNull().default(true),
    giftQrLocked: boolean("gift_qr_locked").notNull().default(false),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
    deletedAt: ts("deleted_at"),
  },
  (t) => [index("events_owner_idx").on(t.ownerId), uniqueIndex("events_public_slug_uq").on(t.publicSlug)],
);

export const eventMembers = pgTable(
  "event_members",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    eventId: uuid("event_id").notNull().references(() => events.id, { onDelete: "cascade" }),
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    role: text("role").notNull(), // owner | editor | staff | viewer
    createdAt: createdAt(),
  },
  (t) => [uniqueIndex("event_members_uq").on(t.eventId, t.userId)],
);

export const invitationVersions = pgTable(
  "invitation_versions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    eventId: uuid("event_id").notNull().references(() => events.id, { onDelete: "cascade" }),
    kind: text("kind").notNull(), // publish | autosave-checkpoint | restore
    doc: jsonb("doc").notNull(),
    createdBy: uuid("created_by").references(() => users.id),
    createdAt: createdAt(),
  },
  (t) => [index("invitation_versions_event_idx").on(t.eventId)],
);

export const mediaAssets = pgTable(
  "media_assets",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    eventId: uuid("event_id").references(() => events.id, { onDelete: "cascade" }),
    ownerId: uuid("owner_id").notNull().references(() => users.id),
    kind: text("kind").notNull(), // image | audio | qr
    mime: text("mime").notNull(),
    bytes: integer("bytes").notNull(),
    storageKey: text("storage_key").notNull(),
    sha256: text("sha256").notNull(),
    createdAt: createdAt(),
  },
  (t) => [index("media_event_idx").on(t.eventId)],
);

export const mediaBlobs = pgTable("media_blobs", {
  key: text("key").primaryKey(),
  data: text("data").notNull(),
});

export const musicTracks = pgTable("music_tracks", {
  id: uuid("id").primaryKey().defaultRandom(),
  title: text("title").notNull(),
  url: text("url").notNull(),
  createdBy: uuid("created_by").references(() => users.id, { onDelete: "set null" }),
  createdAt: createdAt(),
});

/* ---------------- Guests ---------------- */

export const guestGroups = pgTable(
  "guest_groups",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    eventId: uuid("event_id").notNull().references(() => events.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    sort: integer("sort").notNull().default(0),
    createdAt: createdAt(),
  },
  (t) => [uniqueIndex("guest_groups_uq").on(t.eventId, t.name)],
);

export const seatingTables = pgTable(
  "seating_tables",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    eventId: uuid("event_id").notNull().references(() => events.id, { onDelete: "cascade" }),
    label: text("label").notNull(),
    shape: text("shape").notNull().default("round"), // round | rect
    capacity: integer("capacity").notNull().default(10),
    isVip: boolean("is_vip").notNull().default(false),
    x: integer("x").notNull().default(0),
    y: integer("y").notNull().default(0),
    createdAt: createdAt(),
  },
  (t) => [index("seating_tables_event_idx").on(t.eventId)],
);

export const guests = pgTable(
  "guests",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    eventId: uuid("event_id").notNull().references(() => events.id, { onDelete: "cascade" }),
    groupId: uuid("group_id").references(() => guestGroups.id, { onDelete: "set null" }),
    fullName: text("full_name").notNull(),
    khmerName: text("khmer_name"),
    honorific: text("honorific"), // លោក / លោកស្រី / កញ្ញា ...
    phone: text("phone"),
    email: text("email"),
    allowedAttendees: integer("allowed_attendees").notNull().default(1),
    notes: text("notes"),
    rsvpStatus: text("rsvp_status").notNull().default("pending"), // pending | attending | declined | maybe
    attendeeCount: integer("attendee_count").notNull().default(0),
    checkedInCount: integer("checked_in_count").notNull().default(0),
    tableId: uuid("table_id").references(() => seatingTables.id, { onDelete: "set null" }),
    // Link token: only the SHA-256 hash is used for lookup; the raw token is stored AES-GCM encrypted
    // so the owner can copy the link again. A DB leak alone does not yield working links.
    tokenHash: text("token_hash"),
    tokenEnc: text("token_enc"),
    tokenIssuedAt: ts("token_issued_at"),
    firstViewedAt: ts("first_viewed_at"),
    lastViewedAt: ts("last_viewed_at"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    uniqueIndex("guests_token_hash_uq").on(t.tokenHash),
    index("guests_event_idx").on(t.eventId),
    index("guests_table_idx").on(t.tableId),
  ],
);

export const rsvpResponses = pgTable(
  "rsvp_responses",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    eventId: uuid("event_id").notNull().references(() => events.id, { onDelete: "cascade" }),
    guestId: uuid("guest_id").notNull().references(() => guests.id, { onDelete: "cascade" }),
    status: text("status").notNull(),
    attendeeCount: integer("attendee_count").notNull(),
    dietary: text("dietary"),
    message: text("message"),
    source: text("source").notNull(), // guest | owner
    actorId: uuid("actor_id"),
    createdAt: createdAt(),
  },
  (t) => [index("rsvp_event_idx").on(t.eventId), index("rsvp_guest_idx").on(t.guestId)],
);

export const guestWishes = pgTable(
  "guest_wishes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    eventId: uuid("event_id").notNull().references(() => events.id, { onDelete: "cascade" }),
    guestId: uuid("guest_id").references(() => guests.id, { onDelete: "cascade" }),
    guestName: text("guest_name"),
    message: text("message").notNull(),
    status: text("status").notNull().default("pending"), // pending | approved | hidden
    createdAt: createdAt(),
  },
  (t) => [index("wishes_event_idx").on(t.eventId)],
);

export const checkins = pgTable(
  "checkins",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    eventId: uuid("event_id").notNull().references(() => events.id, { onDelete: "cascade" }),
    guestId: uuid("guest_id").notNull().references(() => guests.id, { onDelete: "cascade" }),
    count: integer("count").notNull(),
    staffId: uuid("staff_id").notNull().references(() => users.id),
    createdAt: createdAt(),
  },
  (t) => [index("checkins_event_idx").on(t.eventId)],
);

/* ---------------- Money (minor units, never floats) ---------------- */

export const giftRecords = pgTable(
  "gift_records",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    eventId: uuid("event_id").notNull().references(() => events.id, { onDelete: "cascade" }),
    guestId: uuid("guest_id").references(() => guests.id, { onDelete: "set null" }),
    kind: text("kind").notNull(), // cash | item
    amountMinor: bigint("amount_minor", { mode: "number" }).notNull().default(0),
    currency: text("currency").notNull().default("USD"), // USD (cents) | KHR (riel, no minor unit)
    description: text("description"),
    receivedOn: text("received_on"),
    notes: text("notes"),
    createdAt: createdAt(),
  },
  (t) => [index("gifts_event_idx").on(t.eventId)],
);

export const expenses = pgTable(
  "expenses",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    eventId: uuid("event_id").notNull().references(() => events.id, { onDelete: "cascade" }),
    category: text("category").notNull(),
    vendor: text("vendor"),
    plannedMinor: bigint("planned_minor", { mode: "number" }).notNull().default(0),
    actualMinor: bigint("actual_minor", { mode: "number" }).notNull().default(0),
    currency: text("currency").notNull().default("USD"),
    paymentStatus: text("payment_status").notNull().default("unpaid"), // unpaid | deposit | paid
    notes: text("notes"),
    createdAt: createdAt(),
  },
  (t) => [index("expenses_event_idx").on(t.eventId)],
);

/* ---------------- Notifications, analytics, audit ---------------- */

export const notificationPrefs = pgTable("notification_prefs", {
  userId: uuid("user_id").primaryKey().references(() => users.id, { onDelete: "cascade" }),
  telegramChatId: text("telegram_chat_id"),
  telegramBotToken: text("telegram_bot_token"),
  telegramLinkCode: text("telegram_link_code"),
  onRsvp: boolean("on_rsvp").notNull().default(true),
  onDecline: boolean("on_decline").notNull().default(true),
  onWish: boolean("on_wish").notNull().default(true),
  updatedAt: updatedAt(),
});

export const notificationJobs = pgTable(
  "notification_jobs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    eventId: uuid("event_id").references(() => events.id, { onDelete: "cascade" }),
    channel: text("channel").notNull(), // telegram | inapp
    kind: text("kind").notNull(),
    idempotencyKey: text("idempotency_key").notNull(),
    payload: jsonb("payload").notNull(),
    status: text("status").notNull().default("queued"), // queued | sent | skipped | failed
    attempts: integer("attempts").notNull().default(0),
    lastError: text("last_error"),
    readAt: ts("read_at"),
    createdAt: createdAt(),
  },
  (t) => [uniqueIndex("notification_jobs_idem_uq").on(t.idempotencyKey), index("notif_user_idx").on(t.userId)],
);

export const analyticsEvents = pgTable(
  "analytics_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    eventId: uuid("event_id").notNull().references(() => events.id, { onDelete: "cascade" }),
    kind: text("kind").notNull(), // invite_view | rsvp
    guestId: uuid("guest_id"), // internal id only; never the token
    createdAt: createdAt(),
  },
  (t) => [index("analytics_event_idx").on(t.eventId, t.kind)],
);

export const auditLogs = pgTable(
  "audit_logs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    actorId: uuid("actor_id"),
    eventId: uuid("event_id"),
    action: text("action").notNull(),
    meta: jsonb("meta"),
    createdAt: createdAt(),
  },
  (t) => [index("audit_event_idx").on(t.eventId), index("audit_created_idx").on(t.createdAt)],
);

export const rateLimits = pgTable("rate_limits", {
  key: text("key").primaryKey(),
  count: integer("count").notNull(),
  windowStart: ts("window_start").notNull(),
});

/* ---------------- Billing (provider-agnostic; "manual" provider needs admin approval) ---------------- */

export const billingTransactions = pgTable(
  "billing_transactions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    planCode: text("plan_code").notNull(),
    amountMinor: bigint("amount_minor", { mode: "number" }).notNull(),
    currency: text("currency").notNull().default("USD"),
    provider: text("provider").notNull().default("manual"),
    providerRef: text("provider_ref"), // e.g. ABA transaction reference entered by the customer
    status: text("status").notNull().default("pending"), // pending | approved | rejected
    reviewedBy: uuid("reviewed_by"),
    reviewedAt: ts("reviewed_at"),
    note: text("note"),
    createdAt: createdAt(),
  },
  (t) => [index("billing_user_idx").on(t.userId), uniqueIndex("billing_provider_ref_uq").on(t.provider, t.providerRef)],
);
