/** Detect file type from magic bytes — never trust the client-supplied MIME or extension. */
export type Sniffed = { mime: string; kind: "image" | "audio" | "video" };

export function sniff(buf: Uint8Array, purpose: "image" | "qr" | "audio" | "video" = "image"): Sniffed | null {
  const b = (i: number) => buf[i];
  const ascii = (s: number, e: number) => String.fromCharCode(...buf.slice(s, e));
  if (b(0) === 0xff && b(1) === 0xd8 && b(2) === 0xff) return { mime: "image/jpeg", kind: "image" };
  if (b(0) === 0x89 && ascii(1, 4) === "PNG") return { mime: "image/png", kind: "image" };
  if (ascii(0, 4) === "RIFF" && ascii(8, 12) === "WEBP") return { mime: "image/webp", kind: "image" };
  if (ascii(0, 3) === "GIF") return { mime: "image/gif", kind: "image" };
  if (ascii(0, 3) === "ID3" || (b(0) === 0xff && (b(1) & 0xe0) === 0xe0)) return { mime: "audio/mpeg", kind: "audio" };
  if (ascii(0, 4) === "OggS") return { mime: "audio/ogg", kind: "audio" };
  // ISO-BMFF ("ftyp" box): the same container family is used for MP4 video, MOV and M4A audio.
  if (ascii(4, 8) === "ftyp") {
    const brand = ascii(8, 12);
    if (/^M4A|^M4B/.test(brand)) return { mime: "audio/mp4", kind: "audio" };
    if (purpose === "audio") return { mime: "audio/mp4", kind: "audio" };
    if (brand === "qt  ") return { mime: "video/quicktime", kind: "video" };
    return { mime: "video/mp4", kind: "video" };
  }
  if (b(0) === 0x1a && b(1) === 0x45 && b(2) === 0xdf && b(3) === 0xa3) return { mime: "video/webm", kind: "video" };
  return null; // SVG, HTML and everything else are rejected (SVG can carry script).
}
