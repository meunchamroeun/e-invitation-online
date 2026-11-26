import { describe, expect, it } from "vitest";
import { decrypt, encrypt, generateToken, isWellFormedToken, sha256 } from "@/lib/security/tokens";
import { hashPassword, verifyPassword } from "@/lib/security/password";
import { can } from "@/lib/auth/permissions";
import { sniff } from "@/lib/storage/sniff";
import { parseRange } from "@/lib/storage/range";

describe("guest tokens", () => {
  it("are URL-safe, long and unique", () => {
    const set = new Set(Array.from({ length: 2000 }, () => generateToken()));
    expect(set.size).toBe(2000);
    for (const t of set) { expect(t).toMatch(/^[A-Za-z0-9_-]{24}$/); expect(isWellFormedToken(t)).toBe(true); }
  });
  it("rejects malformed/injected tokens", () => {
    for (const bad of ["", "short", "../../etc/passwd", "a'; drop table guests;--aaaaaaaa", "x".repeat(200), 123]) expect(isWellFormedToken(bad)).toBe(false);
  });
  it("hash is deterministic and differs from token", () => {
    const t = generateToken();
    expect(sha256(t)).toBe(sha256(t));
    expect(sha256(t)).not.toContain(t);
  });
  it("encrypts round-trip and detects tampering", () => {
    const c = encrypt("secret-token");
    expect(decrypt(c)).toBe("secret-token");
    const parts = c.split(".");
    parts[2] = Buffer.from("tampered").toString("base64url");
    expect(decrypt(parts.join("."))).toBeNull();
  });
});

describe("passwords", () => {
  it("hash + verify", async () => {
    const h = await hashPassword("correct horse");
    expect(h.startsWith("scrypt$")).toBe(true);
    expect(await verifyPassword("correct horse", h)).toBe(true);
    expect(await verifyPassword("wrong", h)).toBe(false);
  });
});

describe("permissions", () => {
  it("owner can do everything; staff only check-in", () => {
    expect(can("owner", "giftqr.edit")).toBe(true);
    expect(can("staff", "checkin.perform")).toBe(true);
    expect(can("staff", "guests.edit")).toBe(false);
    expect(can("staff", "finance.view")).toBe(false);
    expect(can("editor", "giftqr.edit")).toBe(false);
    expect(can("editor", "event.publish")).toBe(false);
    expect(can("viewer", "event.edit")).toBe(false);
    expect(can(null, "event.view")).toBe(false);
  });
});

describe("upload sniffing", () => {
  it("detects by magic bytes, rejects SVG/HTML", () => {
    expect(sniff(new Uint8Array([0xff, 0xd8, 0xff, 0xe0]))?.mime).toBe("image/jpeg");
    expect(sniff(new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0, 0, 0, 0]))?.mime).toBe("image/png");
    expect(sniff(new TextEncoder().encode("<svg onload=alert(1)>"))).toBeNull();
    expect(sniff(new TextEncoder().encode("<html><script>"))).toBeNull();
  });
});

describe("video uploads & streaming", () => {
  const ftyp = (brand: string) => new Uint8Array([0, 0, 0, 0x20, ...new TextEncoder().encode("ftyp" + brand)]);
  it("sniffs MP4 / MOV / WebM as video and M4A as audio", () => {
    expect(sniff(ftyp("isom"), "video")).toEqual({ mime: "video/mp4", kind: "video" });
    expect(sniff(ftyp("qt  "), "video")).toEqual({ mime: "video/quicktime", kind: "video" });
    expect(sniff(new Uint8Array([0x1a, 0x45, 0xdf, 0xa3]), "video")?.kind).toBe("video");
    expect(sniff(ftyp("M4A "), "audio")).toEqual({ mime: "audio/mp4", kind: "audio" });
  });
  it("parses Range headers like Safari sends", () => {
    expect(parseRange("bytes=0-1", 1000)).toEqual({ start: 0, end: 1 }); // WebKit's probe
    expect(parseRange("bytes=500-", 1000)).toEqual({ start: 500, end: 999 });
    expect(parseRange("bytes=-100", 1000)).toEqual({ start: 900, end: 999 });
    expect(parseRange("bytes=900-5000", 1000)).toEqual({ start: 900, end: 999 });
    expect(parseRange("bytes=1000-", 1000)).toBeNull();
    expect(parseRange("bytes=5-2", 1000)).toBeNull();
    expect(parseRange("items=0-1", 1000)).toBeNull();
  });
});
