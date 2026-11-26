import "server-only";
import { asc, eq } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { DEFAULT_PLANS } from "@/config/plans";

export async function listPlans() {
  try {
    const rows = await db.select().from(schema.plans).where(eq(schema.plans.isActive, true)).orderBy(asc(schema.plans.sort));
    if (rows.length) return rows;
  } catch {
    /* DB not migrated yet */
  }
  return DEFAULT_PLANS.map((p) => ({ ...p, currency: "USD", isActive: true, updatedAt: new Date() }));
}

export async function getPlan(code: string) {
  const plans = await listPlans();
  return plans.find((p) => p.code === code) ?? plans[0];
}
