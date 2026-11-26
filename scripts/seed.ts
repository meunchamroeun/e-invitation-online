import { openDb } from "./db";
import * as schema from "../src/lib/db/schema";
import { TEMPLATES } from "../src/features/templates/registry";
import { DEFAULT_PLANS } from "../src/config/plans";
import { hashPassword } from "../src/lib/security/password";
import { eq } from "drizzle-orm";

const { db, close } = await openDb();

for (const p of DEFAULT_PLANS) {
  await db.insert(schema.plans).values(p).onConflictDoNothing();
}

for (const [i, t] of TEMPLATES.entries()) {
  const [row] = await db
    .insert(schema.templates)
    .values({
      slug: t.slug, nameKm: t.name.km, nameEn: t.name.en, category: t.category, style: t.style, color: t.color,
      tier: t.tier, isFeatured: !!t.featured, popularity: (TEMPLATES.length - i) * 10, currentVersion: t.version,
    })
    .onConflictDoUpdate({ target: schema.templates.slug, set: { nameKm: t.name.km, nameEn: t.name.en, currentVersion: t.version } })
    .returning({ id: schema.templates.id });
  await db.insert(schema.templateVersions).values({ templateId: row.id, version: t.version, definition: t }).onConflictDoNothing();
}

const email = process.env.SEED_ADMIN_EMAIL?.toLowerCase();
const password = process.env.SEED_ADMIN_PASSWORD;
if (email && password) {
  const existing = await db.select().from(schema.users).where(eq(schema.users.email, email));
  if (!existing.length) {
    await db.insert(schema.users).values({ email, name: "Admin", passwordHash: await hashPassword(password), role: "super_admin", planCode: "business" });
    console.log(`✓ super admin created: ${email}`);
  }
} else {
  console.log("ℹ SEED_ADMIN_EMAIL / SEED_ADMIN_PASSWORD not set — no admin user created.");
}

await close();
console.log(`✓ seeded ${DEFAULT_PLANS.length} plans and ${TEMPLATES.length} templates`);
