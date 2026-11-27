import "server-only";
import { asc, eq } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { DEFAULT_PLANS } from "@/config/plans";

function defaultPlanRows() {
  return DEFAULT_PLANS.map((p) => ({ ...p, currency: "USD", isActive: true, updatedAt: new Date() }));
}

export async function listPlans() {
  try {
    const rows = await db.select().from(schema.plans).where(eq(schema.plans.isActive, true)).orderBy(asc(schema.plans.sort));
    if (rows.length) return rows;
    const [configured] = await db.select({ code: schema.plans.code }).from(schema.plans).limit(1);
    if (configured) return rows;
  } catch {
    /* DB not migrated yet */
  }
  return defaultPlanRows();
}

export async function getPlan(code: string) {
  const plans = await listPlans();
  return plans.find((p) => p.code === code) ?? plans.find((p) => p.code === "free") ?? defaultPlanRows()[0];
}
