"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Camera, CameraOff, Check, Minus, Plus, Search, UserCheck, AlertTriangle } from "lucide-react";
import { checkInAction, lookupCodeAction, type CheckinGuest } from "@/features/checkin/actions";
import { Badge, Button, Input, Stat } from "@/components/ui";
import { cn } from "@/lib/utils";

type G = CheckinGuest & { latin: string; phone: string };

export function CheckinStation({ eventId, locale, guests: initial, recent }: { eventId: string; locale: "km" | "en"; guests: G[]; recent: { id: string; count: number; at: Date; guest: string; staff: string }[] }) {
  const L = (km: string, en: string) => (locale === "km" ? km : en);
  const router = useRouter();
  const [guests, setGuests] = useState(initial);
  useEffect(() => setGuests(initial), [initial]);
  const [q, setQ] = useState("");
  const [current, setCurrent] = useState<G | null>(null);
  const [count, setCount] = useState(1);
  const [msg, setMsg] = useState<{ tone: "ok" | "warn" | "err"; text: string } | null>(null);
  const [scanning, setScanning] = useState(false);
  const [pending, start] = useTransition();

  const totals = useMemo(() => ({
    arrived: guests.reduce((a, g) => a + g.checkedIn, 0),
    expected: guests.reduce((a, g) => a + (g.rsvp === "attending" ? g.attending : 0), 0),
    parties: guests.filter((g) => g.checkedIn > 0).length,
  }), [guests]);

  const results = q.trim().length >= 1 ? guests.filter((g) => `${g.name} ${g.latin} ${g.phone}`.toLowerCase().includes(q.toLowerCase())).slice(0, 12) : [];

  function open(g: G) {
    setCurrent(g);
    const remaining = g.allowed - g.checkedIn;
    setCount(Math.max(1, Math.min(remaining, g.rsvp === "attending" ? Math.max(1, g.attending - g.checkedIn) : remaining)));
    setMsg(g.checkedIn >= g.allowed ? { tone: "warn", text: L("ភ្ញៀវនេះបាន Check-in គ្រប់ចំនួនរួចហើយ (ស្កេនស្ទួន)", "Already fully checked in (duplicate scan)") } : g.checkedIn > 0 ? { tone: "warn", text: L(`បាន Check-in ${g.checkedIn} នាក់រួចហើយ`, `${g.checkedIn} already checked in`) } : null);
  }

  async function onCode(code: string) {
    const r = await lookupCodeAction(eventId, code);
    if (!r.ok) { setMsg({ tone: "err", text: L("QR មិនត្រឹមត្រូវ ឬមិនមែនសម្រាប់កម្មវិធីនេះ", "Invalid QR or not for this event") }); return; }
    const g = guests.find((x) => x.id === r.guest.id) ?? { ...r.guest, latin: "", phone: "" };
    open({ ...g, ...r.guest });
  }

  function commit(delta: number) {
    if (!current) return;
    start(async () => {
      const r = await checkInAction(eventId, current.id, delta);
      if (!r.ok) { setMsg({ tone: "err", text: r.error === "over" ? L("លើសចំនួនអនុញ្ញាត", "Exceeds allowed guests") : r.error }); return; }
      setGuests((gs) => gs.map((g) => (g.id === current.id ? { ...g, checkedIn: r.checkedIn } : g)));
      setCurrent({ ...current, checkedIn: r.checkedIn });
      setMsg({ tone: "ok", text: delta > 0 ? L(`✓ បាន Check-in ${delta} នាក់`, `✓ Checked in ${delta}`) : L("បានដកវិញ", "Undone") });
      router.refresh();
    });
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
      <div className="space-y-4">
        <div className="grid grid-cols-3 gap-3">
          <Stat label={L("បានមកដល់", "Arrived")} value={totals.arrived} tone="success" />
          <Stat label={L("រំពឹងទុក", "Expected")} value={totals.expected} tone="gold" />
          <Stat label={L("គ្រួសារ/ក្រុម", "Parties")} value={totals.parties} />
        </div>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder={L("ស្វែងរកឈ្មោះ ឬលេខទូរស័ព្ទ", "Search name or phone")} className="h-12 pl-10 text-base" autoFocus />
          </div>
          <Button variant={scanning ? "danger" : "primary"} size="lg" onClick={() => setScanning(!scanning)}>{scanning ? <CameraOff className="h-5 w-5" /> : <Camera className="h-5 w-5" />}<span className="hidden sm:inline">{scanning ? L("បិទ", "Stop") : L("ស្កេន QR", "Scan QR")}</span></Button>
        </div>
        {scanning ? <Scanner onCode={(c) => { setScanning(false); onCode(c); }} L={L} /> : null}
        {results.length ? (
          <ul className="divide-y divide-line overflow-hidden rounded-2xl border border-line bg-white">
            {results.map((g) => (
              <li key={g.id}>
                <button onClick={() => { open(g); setQ(""); }} className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-paper">
                  <span className="flex-1"><span className="font-medium">{g.name}</span><span className="block text-xs text-muted">{[g.group, g.table && `${L("តុ", "Table")} ${g.table}`].filter(Boolean).join(" · ")}</span></span>
                  <Badge tone={g.checkedIn >= g.allowed ? "success" : g.checkedIn ? "warning" : "neutral"}>{g.checkedIn}/{g.allowed}</Badge>
                </button>
              </li>
            ))}
          </ul>
        ) : null}

        {msg ? <p role="status" className={cn("flex items-center gap-2 rounded-2xl px-4 py-3 text-sm", msg.tone === "ok" ? "bg-success/10 text-success" : msg.tone === "warn" ? "bg-warning/15 text-[#8a5a12]" : "bg-danger/10 text-danger")}>{msg.tone === "warn" ? <AlertTriangle className="h-4 w-4" /> : null}{msg.text}</p> : null}

        {current ? (
          <div className="rounded-3xl border border-line bg-white p-6 shadow-soft">
            <div className="flex items-start gap-4">
              <span className="flex h-12 w-12 items-center justify-center rounded-full bg-gold-soft text-gold-2"><UserCheck className="h-6 w-6" /></span>
              <div className="flex-1">
                <p className="text-xl font-semibold">{current.name}</p>
                <p className="text-sm text-muted">{[current.group, current.table ? `${L("តុ", "Table")} ${current.table}` : L("មិនទាន់មានតុ", "No table"), `RSVP: ${current.rsvp}${current.rsvp === "attending" ? ` (${current.attending})` : ""}`].filter(Boolean).join(" · ")}</p>
              </div>
              <Badge tone={current.checkedIn >= current.allowed ? "success" : current.checkedIn ? "warning" : "neutral"} className="text-sm">{current.checkedIn >= current.allowed ? L("បានមកដល់", "Checked in") : current.checkedIn ? L("មកដល់ខ្លះ", "Partial") : L("មិនទាន់មក", "Not arrived")}</Badge>
            </div>
            {current.checkedIn < current.allowed ? (
              <div className="mt-6 flex items-center gap-4">
                <div className="flex items-center gap-3 rounded-full border border-line-2 p-1">
                  <button className="flex h-10 w-10 items-center justify-center rounded-full hover:bg-paper disabled:opacity-30" disabled={count <= 1} onClick={() => setCount(count - 1)} aria-label="-"><Minus className="h-4 w-4" /></button>
                  <span className="num w-6 text-center text-xl font-semibold">{count}</span>
                  <button className="flex h-10 w-10 items-center justify-center rounded-full hover:bg-paper disabled:opacity-30" disabled={count >= current.allowed - current.checkedIn} onClick={() => setCount(count + 1)} aria-label="+"><Plus className="h-4 w-4" /></button>
                </div>
                <Button variant="gold" size="lg" className="flex-1" disabled={pending} onClick={() => commit(count)}><Check className="h-5 w-5" />{L("បញ្ជាក់ Check-in", "Confirm check-in")}</Button>
              </div>
            ) : null}
            {current.checkedIn > 0 ? <button className="mt-4 text-xs text-muted underline" disabled={pending} onClick={() => commit(-1)}>{L("ដក ១ នាក់ (កែកំហុស)", "Undo 1 (correction)")}</button> : null}
          </div>
        ) : null}
      </div>

      <aside>
        <p className="mb-3 text-sm font-semibold">{L("កំណត់ត្រាក្រុមការងារ", "Staff log")}</p>
        <ul className="divide-y divide-line rounded-2xl border border-line bg-white text-sm">
          {recent.length ? recent.map((r) => (
            <li key={r.id} className="px-4 py-2.5">
              <p><b>{r.guest}</b> {r.count > 0 ? `+${r.count}` : r.count}</p>
              <p className="text-xs text-muted">{new Date(r.at).toLocaleTimeString("en-GB", { timeZone: "Asia/Phnom_Penh", hour: "2-digit", minute: "2-digit" })} · {r.staff}</p>
            </li>
          )) : <li className="p-4 text-center text-muted">—</li>}
        </ul>
        <p className="mt-3 text-xs leading-5 text-muted">{L("ត្រូវការអ៊ីនធឺណិត៖ ការ Check-in ទាំងអស់ត្រូវបានផ្ទៀងផ្ទាត់នៅលើម៉ាស៊ីនមេ ដើម្បីការពារការរាប់ស្ទួន។", "Online only: every check-in is validated on the server to prevent double counting.")}</p>
      </aside>
    </div>
  );
}

/** Camera scanner: native BarcodeDetector when available, jsQR fallback (iOS Safari). */
function Scanner({ onCode, L }: { onCode: (c: string) => void; L: (a: string, b: string) => string }) {
  const video = useRef<HTMLVideoElement>(null);
  const [err, setErr] = useState("");
  const cb = useRef(onCode);
  cb.current = onCode;
  const msg = L("មិនអាចបើកកាមេរ៉ា — សូមអនុញ្ញាតកាមេរ៉ា ឬស្វែងរកតាមឈ្មោះ", "Camera unavailable — allow camera access or search by name");
  useEffect(() => {
    let stream: MediaStream | null = null;
    let raf = 0;
    let stopped = false;
    const canvas = document.createElement("canvas");
    (async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" }, audio: false });
        if (!video.current) return;
        video.current.srcObject = stream;
        await video.current.play();
        type BD = { detect: (s: HTMLVideoElement) => Promise<{ rawValue: string }[]> };
        const W = window as unknown as { BarcodeDetector?: new (o: { formats: string[] }) => BD };
        const detector = W.BarcodeDetector ? new W.BarcodeDetector({ formats: ["qr_code"] }) : null;
        const jsQR = detector ? null : (await import("jsqr")).default;
        const tick = async () => {
          if (stopped || !video.current) return;
          const v = video.current;
          try {
            if (detector) {
              const r = await detector.detect(v);
              if (r[0]?.rawValue) return cb.current(r[0].rawValue);
            } else if (jsQR && v.videoWidth) {
              canvas.width = v.videoWidth; canvas.height = v.videoHeight;
              const ctx = canvas.getContext("2d", { willReadFrequently: true })!;
              ctx.drawImage(v, 0, 0);
              const img = ctx.getImageData(0, 0, canvas.width, canvas.height);
              const r = jsQR(img.data, img.width, img.height);
              if (r?.data) return cb.current(r.data);
            }
          } catch { /* keep scanning */ }
          raf = requestAnimationFrame(tick);
        };
        tick();
      } catch {
        setErr(msg);
      }
    })();
    return () => { stopped = true; cancelAnimationFrame(raf); stream?.getTracks().forEach((t) => t.stop()); };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <div className="relative overflow-hidden rounded-2xl bg-black">
      <video ref={video} playsInline muted className="aspect-[4/3] w-full object-cover" />
      <div className="pointer-events-none absolute inset-[18%] rounded-3xl border-2 border-white/80" />
      {err ? <p className="absolute inset-x-0 bottom-0 bg-black/70 p-3 text-center text-sm text-white">{err}</p> : null}
    </div>
  );
}
