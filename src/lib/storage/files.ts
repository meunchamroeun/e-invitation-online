import "server-only";
import fs from "node:fs/promises";
import path from "node:path";

/**
 * Storage adapter. Local disk by default (outside /public, so nothing is served without going through
 * the media route). Swap for S3/R2/Supabase Storage by re-implementing these three functions.
 */
const root = () => path.resolve(/* turbopackIgnore: true */ process.cwd(), process.env.UPLOAD_DIR || ".data/uploads");

export async function putObject(key: string, data: Buffer) {
  if (!/^[a-z0-9/-]+$/.test(key)) throw new Error("bad key");
  const p = path.join(/* turbopackIgnore: true */ root(), key);
  await fs.mkdir(path.dirname(p), { recursive: true });
  await fs.writeFile(p, data);
}

export async function getObject(key: string): Promise<Buffer | null> {
  if (!/^[a-z0-9/-]+$/.test(key)) return null;
  try {
    return await fs.readFile(path.join(/* turbopackIgnore: true */ root(), key));
  } catch {
    return null;
  }
}

export async function deleteObject(key: string) {
  if (!/^[a-z0-9/-]+$/.test(key)) return;
  await fs.rm(path.join(/* turbopackIgnore: true */ root(), key), { force: true });
}
