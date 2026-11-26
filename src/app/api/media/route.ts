import { NextResponse, type NextRequest } from "next/server";
import crypto from "node:crypto";
import { db, schema } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/session";
import { getEventRole } from "@/lib/auth/event-access";
import { can } from "@/lib/auth/permissions";
import { sniff } from "@/lib/storage/sniff";
import { putObject } from "@/lib/storage/files";
import { rateLimit } from "@/lib/security/rate-limit";
import { audit } from "@/lib/audit";

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  // Same-origin check for this cookie-authenticated endpoint (CSRF defence in depth; cookies are SameSite=Lax too).
  const origin = req.headers.get("origin");
  if (origin && new URL(origin).host !== req.headers.get("host")) return NextResponse.json({ error: "bad origin" }, { status: 403 });
  if (!(await rateLimit(`upload:${user.id}`, 60, 3600))) return NextResponse.json({ error: "rate" }, { status: 429 });

  const form = await req.formData();
  const eventId = String(form.get("eventId") ?? "");
  const purpose = String(form.get("purpose") ?? "image");
  const file = form.get("file");
  if (!(file instanceof File)) return NextResponse.json({ error: "no file" }, { status: 400 });
  const role = /^[0-9a-f-]{36}$/.test(eventId) ? await getEventRole(user.id, eventId) : null;
  if (!can(role, purpose === "qr" ? "giftqr.edit" : "event.edit")) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  if (!["image", "qr", "audio", "video"].includes(purpose)) return NextResponse.json({ error: "purpose" }, { status: 400 });
  const maxMb = purpose === "video" ? Number(process.env.MAX_VIDEO_MB || 60) : Number(process.env.MAX_UPLOAD_MB || 8);
  if (file.size > maxMb * 1024 * 1024) return NextResponse.json({ error: "too_large", maxMb }, { status: 413 });
  let buf: Buffer = Buffer.from(await file.arrayBuffer());
  const type = sniff(buf, purpose as "image");
  if (!type) return NextResponse.json({ error: "unsupported_type" }, { status: 415 });
  const want = purpose === "qr" ? "image" : purpose;
  if (type.kind !== want) return NextResponse.json({ error: "wrong_kind" }, { status: 415 });

  let mime = type.mime;
  // Re-encode photos: strips EXIF/GPS metadata, normalises orientation, caps dimensions. QR images are kept lossless.
  if (type.kind === "image" && type.mime !== "image/gif") {
    try {
      const sharp = (await import("sharp")).default;
      const img = sharp(buf, { failOn: "error" }).rotate();
      buf = purpose === "qr"
        ? await img.resize({ width: 1200, height: 1200, fit: "inside", withoutEnlargement: true }).png().toBuffer()
        : await img.resize({ width: 2000, height: 2000, fit: "inside", withoutEnlargement: true }).webp({ quality: 82 }).toBuffer();
      mime = purpose === "qr" ? "image/png" : "image/webp";
    } catch {
      return NextResponse.json({ error: "invalid_image" }, { status: 415 });
    }
  }

  const key = `${eventId}/${crypto.randomUUID()}`;
  await putObject(key, buf);
  const [row] = await db.insert(schema.mediaAssets).values({
    eventId, ownerId: user.id, kind: purpose === "qr" ? "qr" : type.kind, mime, bytes: buf.length, storageKey: key,
    sha256: crypto.createHash("sha256").update(buf).digest("hex"),
  }).returning({ id: schema.mediaAssets.id });
  if (purpose === "qr") await audit("giftqr.upload", { actorId: user.id, eventId, meta: { mediaId: row.id } });
  return NextResponse.json({ id: row.id, url: `/api/media/${row.id}`, mime, bytes: buf.length });
}
