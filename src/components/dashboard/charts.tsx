/** Dependency-free SVG charts (fast, accessible, no hydration). */
const COLORS = ["#16835D", "#D49A35", "#D84A4A", "#B68A45", "#4B6FA5", "#8A5CC2"];

export function BarTrend({ data, legend }: { data: { label: string; values: number[] }[]; legend: string[] }) {
  const max = Math.max(1, ...data.map((d) => d.values.reduce((a, b) => a + b, 0)));
  return (
    <figure>
      <div className="flex h-40 items-end gap-1.5" role="img" aria-label="RSVP trend">
        {data.map((d) => (
          <div key={d.label} className="flex flex-1 flex-col items-center gap-1">
            <div className="flex w-full max-w-[28px] flex-col-reverse overflow-hidden rounded-md" style={{ height: `${(d.values.reduce((a, b) => a + b, 0) / max) * 140}px` }} title={`${d.label}: ${d.values.join(" / ")}`}>
              {d.values.map((v, i) => <div key={i} style={{ flex: v, background: COLORS[i] }} />)}
            </div>
            <span className="text-[10px] text-muted">{d.label}</span>
          </div>
        ))}
      </div>
      <figcaption className="mt-3 flex flex-wrap gap-3 text-xs text-muted">
        {legend.map((l, i) => <span key={l} className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-sm" style={{ background: COLORS[i] }} />{l}</span>)}
      </figcaption>
    </figure>
  );
}

export function Donut({ parts, center }: { parts: { label: string; value: number; color?: string }[]; center?: React.ReactNode }) {
  const total = parts.reduce((a, p) => a + p.value, 0) || 1;
  let acc = 0;
  const r = 15.9155;
  return (
    <div className="flex items-center gap-5">
      <div className="relative h-32 w-32 shrink-0">
        <svg viewBox="0 0 42 42" className="h-full w-full -rotate-90" role="img" aria-label={parts.map((p) => `${p.label} ${p.value}`).join(", ")}>
          <circle cx="21" cy="21" r={r} fill="none" stroke="#EAE7E1" strokeWidth="5" />
          {parts.map((p, i) => {
            const len = (p.value / total) * 100;
            const el = <circle key={i} cx="21" cy="21" r={r} fill="none" stroke={p.color ?? COLORS[i % COLORS.length]} strokeWidth="5" strokeDasharray={`${len} ${100 - len}`} strokeDashoffset={-acc} />;
            acc += len;
            return el;
          })}
        </svg>
        <div className="absolute inset-0 flex items-center justify-center text-center">{center}</div>
      </div>
      <ul className="space-y-1.5 text-sm">
        {parts.map((p, i) => (
          <li key={p.label} className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-sm" style={{ background: p.color ?? COLORS[i % COLORS.length] }} /><span className="text-ink-2">{p.label}</span><span className="num ml-auto pl-4 font-semibold">{p.value}</span></li>
        ))}
      </ul>
    </div>
  );
}

export function HBars({ rows }: { rows: { label: string; value: number; max?: number; color?: string; display?: string }[] }) {
  const max = Math.max(1, ...rows.map((r) => r.max ?? r.value));
  return (
    <ul className="space-y-3">
      {rows.map((r, i) => (
        <li key={r.label}>
          <div className="mb-1 flex justify-between text-sm"><span className="text-ink-2">{r.label}</span><span className="num font-medium">{r.display ?? r.value}</span></div>
          <div className="h-2 overflow-hidden rounded-full bg-[#EFECE6]"><div className="h-full rounded-full" style={{ width: `${Math.min(100, (r.value / (r.max ?? max)) * 100)}%`, background: r.color ?? COLORS[i % COLORS.length] }} /></div>
        </li>
      ))}
    </ul>
  );
}
