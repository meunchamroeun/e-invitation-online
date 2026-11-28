import { NextResponse, type NextRequest } from "next/server";
import crypto from "node:crypto";
import { desc, eq } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { getCurrentUser, requireAdmin } from "@/lib/auth/session";
import { sniff } from "@/lib/storage/sniff";
import { putObject } from "@/lib/storage/files";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const rows = await db
    .select({ id: schema.musicTracks.id, title: schema.musicTracks.title, url: schema.musicTracks.url })
    .from(schema.musicTracks)
    .orderBy(desc(schema.musicTracks.createdAt));
  return NextResponse.json({ tracks: rows });
}

export async function POST(req: NextRequest) {
  const admin = await requireAdmin();
  const form = await req.formData();
  const file = form.get("file");
  const title = String(form.get("title") ?? "").trim().slice(0, 120);
  if (!(file instanceof File)) return NextResponse.json({ error: "no_file" }, { status: 400 });

  const buf = Buffer.from(await file.arrayBuffer());
  const type = sniff(buf, "audio");
  if (!type || type.kind !== "audio" || (type.mime !== "audio/mpeg" && !file.name.toLowerCase().endsWith(".mp3"))) {
    return NextResponse.json({ error: "mp3_only" }, { status: 415 });
  }

  const assetId = crypto.randomUUID();
  const key = `admin/${assetId}`;
  await putObject(key, buf);
  await db.insert(schema.mediaAssets).values({
    id: assetId,
    eventId: null,
    ownerId: admin.id,
    kind: "audio",
    mime: "audio/mpeg",
    bytes: buf.length,
    storageKey: key,
    sha256: crypto.createHash("sha256").update(buf).digest("hex"),
  });

  const trackTitle = title || file.name.replace(/\.mp3$/i, "").slice(0, 120) || "Wedding Music";
  const [track] = await db
    .insert(schema.musicTracks)
    .values({ title: trackTitle, url: `/api/media/${assetId}`, createdBy: admin.id })
    .returning({ id: schema.musicTracks.id, title: schema.musicTracks.title, url: schema.musicTracks.url });

  return NextResponse.json({ track });
}

export async function DELETE(req: NextRequest) {
  await requireAdmin();
  const id = req.nextUrl.searchParams.get("id") ?? "";
  if (!/^[0-9a-f-]{36}$/.test(id)) return NextResponse.json({ error: "bad_id" }, { status: 400 });
  await db.delete(schema.musicTracks).where(eq(schema.musicTracks.id, id));
  return NextResponse.json({ ok: true });
}
