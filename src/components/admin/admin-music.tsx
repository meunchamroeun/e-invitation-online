"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Music, Trash2, Upload } from "lucide-react";
import { Button, Input } from "@/components/ui";

export type AdminTrack = { id: string; title: string; url: string };

export function AdminMusicManager({ initialTracks }: { initialTracks: AdminTrack[] }) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [tracks, setTracks] = useState(initialTracks);
  const [title, setTitle] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

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

  return (
    <div className="space-y-6">
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
        {tracks.length ? (
          <ul className="divide-y divide-line">
            {tracks.map((t) => (
              <li key={t.id} className="flex flex-col gap-3 px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between">
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
                  <Button type="button" variant="ghost" size="sm" onClick={() => void remove(t.id)} aria-label="Delete track" className="text-muted hover:text-danger">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="p-6 text-center text-sm text-muted">No MP3 tracks uploaded yet.</p>
        )}
      </div>
    </div>
  );
}
