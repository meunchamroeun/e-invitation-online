import crypto from "node:crypto";

/** 144 bits of CSPRNG entropy, URL-safe. Guest links are bearer credentials. */
export function generateToken(bytes = 18): string {
  return crypto.randomBytes(bytes).toString("base64url");
}

export function sha256(value: string): string {
  return crypto.createHash("sha256").update(value).digest("hex");
}

const TOKEN_RE = /^[A-Za-z0-9_-]{16,64}$/;
export function isWellFormedToken(t: unknown): t is string {
  return typeof t === "string" && TOKEN_RE.test(t);
}

function key(): Buffer {
  const secret = process.env.APP_SECRET;
  if (!secret || secret.length < 16) {
    if (process.env.NODE_ENV === "production") throw new Error("APP_SECRET must be set in production");
    return crypto.createHash("sha256").update("dev-only-insecure-secret").digest();
  }
  return crypto.createHash("sha256").update(secret).digest();
}

/** AES-256-GCM. Output: iv.tag.ciphertext (base64url). */
export function encrypt(plain: string): string {
  const iv = crypto.randomBytes(12);
  const c = crypto.createCipheriv("aes-256-gcm", key(), iv);
  const enc = Buffer.concat([c.update(plain, "utf8"), c.final()]);
  return [iv, c.getAuthTag(), enc].map((b) => b.toString("base64url")).join(".");
}

export function decrypt(payload: string): string | null {
  try {
    const [iv, tag, enc] = payload.split(".").map((p) => Buffer.from(p, "base64url"));
    const d = crypto.createDecipheriv("aes-256-gcm", key(), iv);
    d.setAuthTag(tag);
    return Buffer.concat([d.update(enc), d.final()]).toString("utf8");
  } catch {
    return null;
  }
}
