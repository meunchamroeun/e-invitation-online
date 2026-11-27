ALTER TABLE "events" ADD COLUMN IF NOT EXISTS "archived_from" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "suspended_at" timestamp with time zone;
