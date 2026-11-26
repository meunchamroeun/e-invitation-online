import * as schema from "../src/lib/db/schema";
import { drizzle as drizzlePg } from "drizzle-orm/postgres-js";
import { drizzle as drizzleLite } from "drizzle-orm/pglite";
import { migrate as migratePg } from "drizzle-orm/postgres-js/migrator";
import { migrate as migrateLite } from "drizzle-orm/pglite/migrator";
import postgres from "postgres";
import { PGlite } from "@electric-sql/pglite";
import fs from "node:fs";
import path from "node:path";

// Load .env / .env.local for scripts (Next loads them automatically for the app).
for (const f of [".env", ".env.local"]) {
  const p = path.resolve(f);
  if (!fs.existsSync(p)) continue;
  for (const line of fs.readFileSync(p, "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
}

export async function openDb() {
  const url = process.env.DATABASE_URL;
  if (url) {
    const client = postgres(url, { max: 1 });
    const db = drizzlePg(client, { schema });
    return { db, migrate: () => migratePg(db, { migrationsFolder: "drizzle" }), close: () => client.end() };
  }
  fs.mkdirSync(".data", { recursive: true });
  const lite = new PGlite(path.resolve(".data/pglite"));
  const db = drizzleLite(lite, { schema });
  return {
    db: db as unknown as ReturnType<typeof drizzlePg<typeof schema>>,
    migrate: () => migrateLite(db, { migrationsFolder: "drizzle" }),
    close: () => lite.close(),
  };
}
