import { sql } from "drizzle-orm";
import { db } from "./index";

let ensured: Promise<void> | null = null;

export function ensureUserAvatarColumn() {
  if (!ensured) {
    ensured = db
      .execute(sql`ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "avatar_url" text`)
      .then(() => undefined)
      .catch(() => {
        ensured = null;
      });
  }
  return ensured;
}
