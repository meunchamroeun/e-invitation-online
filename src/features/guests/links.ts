import "server-only";
import { decrypt } from "@/lib/security/tokens";

export function appUrl() {
  return (process.env.APP_URL || "http://localhost:3000").replace(/\/$/, "");
}

/** Decrypts a guest's stored token into a shareable URL (owner-only views). */
export function guestLink(tokenEnc: string | null): string | null {
  if (!tokenEnc) return null;
  const t = decrypt(tokenEnc);
  return t ? `${appUrl()}/i/${t}` : null;
}
