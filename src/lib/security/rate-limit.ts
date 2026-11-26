import "server-only";
import { db, schema } from "@/lib/db";
import { sql } from "drizzle-orm";

/**
 * Fixed-window rate limiter backed by Postgres (works across serverless instances).
 * Returns true when the request is allowed.
 */
export async function rateLimit(key: string, limit: number, windowSec: number): Promise<boolean> {
  const rows = await db.execute<{ count: number }>(sql`
    insert into ${schema.rateLimits} (key, count, window_start)
    values (${key}, 1, now())
    on conflict (key) do update set
      count = case when ${schema.rateLimits.windowStart} < now() - make_interval(secs => ${windowSec}) then 1 else ${schema.rateLimits.count} + 1 end,
      window_start = case when ${schema.rateLimits.windowStart} < now() - make_interval(secs => ${windowSec}) then now() else ${schema.rateLimits.windowStart} end
    returning count
  `);
  const list = Array.isArray(rows) ? rows : (rows as unknown as { rows: { count: number }[] }).rows;
  return Number(list[0]?.count ?? 0) <= limit;
}
