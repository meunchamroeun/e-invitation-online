import "server-only";
import fs from "node:fs/promises";
import path from "node:path";
import { eq } from "drizzle-orm";
import { db, schema } from "@/lib/db";

/**
 * Storage adapter. Uses Neon/Postgres `media_blobs` when DATABASE_URL is configured (so Vercel
 * serverless functions never fail on read-only local disk), and falls back to `.data/uploads` in local dev.
 */
const root = () => path.resolve(/* turbopackIgnore: true */ process.cwd(), process.env.UPLOAD_DIR || ".data/uploads");

export async function putObject(key: string, data: Buffer) {
  if (!/^[a-z0-9/-]+$/.test(key)) throw new Error("bad key");
  if (process.env.DATABASE_URL) {
    const encoded = data.toString("base64");
    await db
      .insert(schema.mediaBlobs)
      .values({ key, data: encoded })
      .onConflictDoUpdate({ target: schema.mediaBlobs.key, set: { data: encoded } });
    return;
  }
  const p = path.join(/* turbopackIgnore: true */ root(), key);
  await fs.mkdir(path.dirname(p), { recursive: true });
  await fs.writeFile(p, data);
}

export async function getObject(key: string): Promise<Buffer | null> {
  if (!/^[a-z0-9/-]+$/.test(key)) return null;
  if (process.env.DATABASE_URL) {
    const [row] = await db.select({ data: schema.mediaBlobs.data }).from(schema.mediaBlobs).where(eq(schema.mediaBlobs.key, key)).limit(1);
    return row ? Buffer.from(row.data, "base64") : null;
  }
  try {
    return await fs.readFile(path.join(/* turbopackIgnore: true */ root(), key));
  } catch {
    return null;
  }
}

export async function deleteObject(key: string) {
  if (!/^[a-z0-9/-]+$/.test(key)) return;
  if (process.env.DATABASE_URL) {
    await db.delete(schema.mediaBlobs).where(eq(schema.mediaBlobs.key, key));
    return;
  }
  await fs.rm(path.join(/* turbopackIgnore: true */ root(), key), { force: true });
}
