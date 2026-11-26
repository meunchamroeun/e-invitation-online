/** Parse an HTTP Range header for a single byte range. Returns null when unsatisfiable. */
export function parseRange(header: string, size: number): { start: number; end: number } | null {
  const m = header.match(/^bytes=(\d*)-(\d*)$/);
  if (!m || (m[1] === "" && m[2] === "") || size === 0) return null;
  let start: number, end: number;
  if (m[1] === "") { start = Math.max(0, size - Number(m[2])); end = size - 1; }
  else { start = Number(m[1]); end = m[2] === "" ? size - 1 : Math.min(Number(m[2]), size - 1); }
  if (start > end || start >= size) return null;
  return { start, end };
}
