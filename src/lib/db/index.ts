import "server-only";
import * as schema from "./schema";
import { drizzle as drizzlePg } from "drizzle-orm/postgres-js";
import { drizzle as drizzleLite } from "drizzle-orm/pglite";
import postgres from "postgres";
import { PGlite } from "@electric-sql/pglite";
import path from "node:path";

type DB = ReturnType<typeof drizzlePg<typeof schema>>;

const g = globalThis as unknown as { __db?: DB; __pglite?: PGlite };

function create(): DB {
  const url = process.env.DATABASE_URL;
  if (url) {
    const client = postgres(url, { max: 10, prepare: false });
    return drizzlePg(client, { schema });
  }
  // Local development: embedded PostgreSQL (WASM). Same SQL dialect as production.
  const dir = path.resolve(process.cwd(), ".data/pglite");
  g.__pglite ??= new PGlite(dir);
  return drizzleLite(g.__pglite, { schema }) as unknown as DB;
}

/** Lazily opened on first use, so importing this module (e.g. during `next build`) never opens a connection. */
export const db: DB = new Proxy({} as DB, {
  get(_t, prop) {
    const real = (g.__db ??= create());
    const v = Reflect.get(real as object, prop, real);
    return typeof v === "function" ? v.bind(real) : v;
  },
});
export { schema };
