ALTER TABLE "guest_wishes" ALTER COLUMN "guest_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "guest_wishes" ADD COLUMN IF NOT EXISTS "guest_name" text;--> statement-breakpoint
ALTER TABLE "notification_prefs" ADD COLUMN IF NOT EXISTS "telegram_bot_token" text;
