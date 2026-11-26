import { NextResponse, type NextRequest } from "next/server";
import { eq } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { getObject } from "@/lib/storage/files";
import { parseRange } from "@/lib/storage/range";

/**
 * Assets are addressed by unguessable UUIDs and served with nosniff + a fixed, sniffed content type.
 * Supports HTTP Range (206 Partial Content) — iOS/macOS Safari will not play video without it.
 */
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/.test(id)) return new NextResponse(null, { status: 404 });
  const [a] = await db.select().from(schema.mediaAssets).where(eq(schema.mediaAssets.id, id));
  if (!a) return new NextResponse(null, { status: 404 });
  const data = await getObject(a.storageKey);
  if (!data) return new NextResponse(null, { status: 404 });
  const size = data.length;
  const base: Record<string, string> = {
    "Content-Type": a.mime,
    "Accept-Ranges": "bytes",
    "Cache-Control": "public, max-age=31536000, immutable",
    ETag: `"${a.sha256.slice(0, 32)}"`,
    "X-Content-Type-Options": "nosniff",
    "Content-Security-Policy": "default-src 'none'; sandbox",
    ...(a.kind === "qr" ? { "Content-Disposition": `inline; filename="gift-qr.png"` } : {}),
  };
  const range = req.headers.get("range");
  if (range) {
    const r = parseRange(range, size);
    if (!r) return new NextResponse(null, { status: 416, headers: { "Content-Range": `bytes */${size}` } });
    const { start, end } = r;
    return new NextResponse(new Uint8Array(data.subarray(start, end + 1)), {
      status: 206,
      headers: { ...base, "Content-Range": `bytes ${start}-${end}/${size}`, "Content-Length": String(end - start + 1) },
    });
  }
  return new NextResponse(new Uint8Array(data), { headers: { ...base, "Content-Length": String(size) } });
}
