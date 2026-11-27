ALTER TABLE "events" ADD COLUMN "published_template_slug" text;
--> statement-breakpoint
UPDATE "events" SET "published_template_slug" = "template_slug" WHERE "published" IS NOT NULL;
