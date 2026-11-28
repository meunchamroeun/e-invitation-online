"use client";

import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { Check, Copy, Loader2, Music, Search, Trash2, Upload, X } from "lucide-react";
import { Button, Input } from "@/components/ui";
import { AdminKpiStrip } from "@/components/admin/admin-ui";

export type AdminTrack = { id: string; title: string; url: string };

export function AdminMusicManager({ initialTracks }: { initialTracks: AdminTrack[] }) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [tracks, setTracks] = useState(initialTracks);
  const [title, setTitle] = useState("");
  const [query, setQuery] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLocaleLowerCase();
    if (!q) return tracks;
    return tracks.filter(
      (t) => t.title.toLocaleLowerCase().includes(q) || t.url.toLocaleLowerCase().includes(q),
    );
  }, [tracks, query]);

  async function upload(file: File) {
    if (!file.name.toLowerCase().endsWith(".mp3") && file.type !== "audio/mpeg") {
      setErr("Only .mp3 audio files are supported.");
      return;
    }
    setBusy(true);
    setErr("");
    const fd = new FormData();
    fd.set("file", file);
    if (title.trim()) fd.set("title", title.trim());
    const res = await fetch("/api/music", { method: "POST", body: fd });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) {
      setErr(data.error === "mp3_only" ? "Only .mp3 files are allowed." : "Upload failed.");
      return;
    }
    setTracks((prev) => [data.track, ...prev]);
    setTitle("");
    if (fileRef.current) fileRef.current.value = "";
    router.refresh();
  }

  async function remove(id: string) {
    const res = await fetch(`/api/music?id=${id}`, { method: "DELETE" });
    if (res.ok) {
      setTracks((prev) => prev.filter((t) => t.id !== id));
      router.refresh();
    }
  }

  async function copyUrl(track: AdminTrack) {
    try {
      await navigator.clipboard.writeText(track.url);
      setCopiedId(track.id);
      window.setTimeout(() => setCopiedId((prev) => (prev === track.id ? null : prev)), 1500);
    } catch {
      /* ignore clipboard error */
    }
  }

  return (
    <div className="space-y-5">
      <AdminKpiStrip
        className="lg:grid-cols-2"
        items={[
          { label: "Total MP3 Tracks", value: tracks.length, tone: "gold", hint: "Available in Builder → Design" },
          { label: "Matching Filter", value: filtered.length, tone: "neutral", hint: query ? `Filtered by "${query}"` : "Showing all tracks" },
        ]}
      />

      <div className="rounded-2xl border border-[#e7e1d5] bg-white p-5 shadow-xs">
        <h2 className="text-sm font-semibold text-ink">Upload MP3 to Shared Library</h2>
        <p className="mt-1 text-xs text-muted">Users can pick these songs directly in the Builder → Design tab.</p>
        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Song title (optional — defaults to filename)"
            className="h-10 flex-1"
            maxLength={120}
          />
          <input
            ref={fileRef}
            type="file"
            accept=".mp3,audio/mpeg"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void upload(f);
            }}
          />
          <Button type="button" disabled={busy} onClick={() => fileRef.current?.click()} className="h-10 shrink-0 gap-2">
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
            Upload MP3
          </Button>
        </div>
        {err ? <p className="mt-2 text-xs text-danger">{err}</p> : null}
      </div>

      <div className="overflow-hidden rounded-2xl border border-[#e7e1d5] bg-white shadow-xs">
        <div className="flex items-center justify-between gap-3 border-b border-line p-3.5 sm:px-4">
          <div className="relative flex-1 max-w-md">
            <Search size={15} aria-hidden="true" className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-muted" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search tracks by title or URL..."
              className="h-9 rounded-xl pl-9 pr-8 text-sm"
            />
            {query ? (
              <button
                type="button"
                aria-label="Clear track search"
                onClick={() => setQuery("")}
                className="absolute top-1/2 right-2 -translate-y-1/2 rounded-full p-1 text-muted hover:bg-black/5 hover:text-ink"
              >
                <X size={13} aria-hidden="true" />
              </button>
            ) : null}
          </div>
          <span className="num text-xs text-muted">{filtered.length} tracks</span>
        </div>

        {filtered.length ? (
          <ul className="divide-y divide-line">
            <AnimatePresence initial={false}>
              {filtered.map((t) => (
                <motion.li
                  key={t.id}
                  layout
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.2 }}
                  className="flex flex-col gap-3 px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-gold-soft/50 text-gold-2">
                      <Music className="h-4 w-4" />
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-ink" dir="auto">{t.title}</p>
                      <p className="truncate font-mono text-[11px] text-muted">{t.url}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <audio src={t.url} controls preload="none" className="h-8 max-w-[230px]" />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => void copyUrl(t)}
                      aria-label={`Copy URL for ${t.title}`}
                      className="text-muted hover:text-ink"
                    >
                      {copiedId === t.id ? <Check className="h-4 w-4 text-[#2c6644]" /> : <Copy className="h-4 w-4" />}
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => void remove(t.id)}
                      aria-label={`Delete ${t.title}`}
                      className="text-muted hover:text-danger"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </motion.li>
              ))}
            </AnimatePresence>
          </ul>
        ) : (
          <p className="p-6 text-center text-sm text-muted">
            {tracks.length ? "No matching MP3 tracks." : "No MP3 tracks uploaded yet."}
          </p>
        )}
      </div>
    </div>
  );
}
