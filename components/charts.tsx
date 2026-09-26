"use client";

// ============================================================
// GRAPHIQUES SVG maison — légers, animés, responsives.
// (aucune dépendance externe : performance mobile maximale)
// ============================================================

import { useMemo, useState } from "react";

const W = 560;

export function LineChart({
  data, height = 160, color = "#3d7bff", label = "", invert = false, suffix = ""
}: { data: number[]; height?: number; color?: string; label?: string; invert?: boolean; suffix?: string }) {
  const [hover, setHover] = useState<number | null>(null);
  const { path, area, points } = useMemo(() => {
    if (!data.length) return { path: "", area: "", points: [] as { x: number; y: number; v: number }[] };
    const min = Math.min(...data);
    const max = Math.max(...data);
    const span = max - min || 1;
    const pad = 14;
    const pts = data.map((v, i) => ({
      x: pad + (i / Math.max(1, data.length - 1)) * (W - pad * 2),
      y: pad + (1 - (v - min) / span) * (height - pad * 2),
      v
    }));
    const d = pts.map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");
    const a = `${d} L${pts[pts.length - 1].x},${height - 4} L${pts[0].x},${height - 4} Z`;
    return { path: d, area: a, points: pts };
  }, [data, height]);

  const gid = useMemo(() => `g${Math.random().toString(36).slice(2, 8)}`, []);
  if (!data.length) return <div className="text-xs text-slate-500">Pas de données.</div>;

  return (
    <div className="relative">
      <svg
        viewBox={`0 0 ${W} ${height}`} className="w-full" style={{ height }}
        onMouseLeave={() => setHover(null)}
        onMouseMove={e => {
          const rect = (e.currentTarget as SVGSVGElement).getBoundingClientRect();
          const x = ((e.clientX - rect.left) / rect.width) * W;
          let best = 0, bd = Infinity;
          points.forEach((p, i) => { const d = Math.abs(p.x - x); if (d < bd) { bd = d; best = i; } });
          setHover(best);
        }}
      >
        <defs>
          <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity=".32" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>
        {[0.25, 0.5, 0.75].map(f => (
          <line key={f} x1="10" x2={W - 10} y1={height * f} y2={height * f} stroke="rgba(148,163,255,.08)" strokeWidth="1" />
        ))}
        <path d={area} fill={`url(#${gid})`} />
        <path d={path} fill="none" stroke={color} strokeWidth="2.4" strokeLinecap="round"
          style={{ filter: `drop-shadow(0 2px 8px ${color}55)` }} />
        {hover !== null && points[hover] && (
          <>
            <line x1={points[hover].x} x2={points[hover].x} y1="8" y2={height - 8} stroke={color} strokeOpacity=".35" strokeDasharray="3 3" />
            <circle cx={points[hover].x} cy={points[hover].y} r="4.5" fill={color} stroke="#fff" strokeWidth="1.5" />
          </>
        )}
      </svg>
      {hover !== null && points[hover] && (
        <div className="tabular pointer-events-none absolute -top-1 rounded-lg border px-2 py-1 text-[11px] font-bold"
          style={{
            left: `${(points[hover].x / W) * 100}%`, transform: "translateX(-50%)",
            borderColor: "var(--border-strong)", background: "var(--card-solid)", color
          }}>
          {(invert ? points[hover].v : points[hover].v).toFixed(2)}{suffix}
        </div>
      )}
      {label && <div className="mt-1 text-center text-[10px] font-semibold tracking-widest text-slate-500">{label}</div>}
    </div>
  );
}

export function BarChart({ data, color = "#8b5cf6", height = 150, format }: {
  data: { label: string; value: number; color?: string }[];
  color?: string; height?: number; format?: (v: number) => string;
}) {
  const max = Math.max(...data.map(d => Math.abs(d.value)), 0.001);
  return (
    <div className="space-y-2.5" style={{ minHeight: height }}>
      {data.map(d => {
        const neg = d.value < 0;
        return (
          <div key={d.label} className="flex items-center gap-2.5">
            <span className="w-24 shrink-0 truncate text-right text-[11px] font-semibold text-slate-400">{d.label}</span>
            <div className="track flex-1">
              <span style={{
                width: `${(Math.abs(d.value) / max) * 100}%`,
                background: d.color ?? (neg ? "linear-gradient(90deg,#f43f5e,#fb7185)" : `linear-gradient(90deg, ${color}, ${color}99)`)
              }} />
            </div>
            <span className="tabular w-14 shrink-0 text-[11px] font-bold" style={{ color: neg ? "#f43f5e" : "#34d399" }}>
              {format ? format(d.value) : d.value.toFixed(2)}
            </span>
          </div>
        );
      })}
    </div>
  );
}

/** Radar 5 axes (votes des modèles ou comparaison d'équipes). */
export function RadarChart({ axes, series, size = 260 }: {
  axes: string[];
  series: { name: string; values: number[]; color: string; max?: number }[];
  size?: number;
}) {
  const cx = size / 2, cy = size / 2, R = size / 2 - 34;
  const angle = (i: number) => (Math.PI * 2 * i) / axes.length - Math.PI / 2;
  const pt = (i: number, r: number) => `${cx + Math.cos(angle(i)) * r},${cy + Math.sin(angle(i)) * r}`;

  return (
    <svg viewBox={`0 0 ${size} ${size}`} className="mx-auto w-full max-w-[300px]">
      {[0.25, 0.5, 0.75, 1].map(f => (
        <polygon key={f} points={axes.map((_, i) => pt(i, R * f)).join(" ")}
          fill="none" stroke="rgba(148,163,255,.12)" strokeWidth="1" />
      ))}
      {axes.map((a, i) => (
        <g key={a}>
          <line x1={cx} y1={cy} x2={cx + Math.cos(angle(i)) * R} y2={cy + Math.sin(angle(i)) * R}
            stroke="rgba(148,163,255,.1)" />
          <text x={cx + Math.cos(angle(i)) * (R + 18)} y={cy + Math.sin(angle(i)) * (R + 16)}
            textAnchor="middle" dominantBaseline="middle"
            className="fill-slate-400 text-[9px] font-bold tracking-wider">{a}</text>
        </g>
      ))}
      {series.map(s => {
        const max = s.max ?? 1;
        const pts = s.values.map((v, i) => pt(i, Math.min(1, v / max) * R)).join(" ");
        return (
          <g key={s.name}>
            <polygon points={pts} fill={`${s.color}22`} stroke={s.color} strokeWidth="2"
              style={{ filter: `drop-shadow(0 0 6px ${s.color}55)` }} />
            {s.values.map((v, i) => (
              <circle key={i} cx={cx + Math.cos(angle(i)) * Math.min(1, v / max) * R}
                cy={cy + Math.sin(angle(i)) * Math.min(1, v / max) * R}
                r="3" fill={s.color} />
            ))}
          </g>
        );
      })}
    </svg>
  );
}

export function Sparkline({ data, color = "#22d3ee", width = 90, height = 26 }: {
  data: number[]; color?: string; width?: number; height?: number;
}) {
  if (data.length < 2) return null;
  const min = Math.min(...data), max = Math.max(...data), span = max - min || 1;
  const d = data.map((v, i) =>
    `${i === 0 ? "M" : "L"}${((i / (data.length - 1)) * (width - 4) + 2).toFixed(1)},${(height - 3 - ((v - min) / span) * (height - 6)).toFixed(1)}`
  ).join(" ");
  return (
    <svg width={width} height={height} className="overflow-visible">
      <path d={d} fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

/** Calibration : probabilité prédite vs fréquence réalisée. */
export function CalibrationChart({ bins }: { bins: { bin: string; predicted: number; realized: number; n: number }[] }) {
  const h = 170;
  return (
    <div>
      <div className="flex items-end justify-between gap-2" style={{ height: h }}>
        {bins.map(b => (
          <div key={b.bin} className="relative flex flex-1 items-end justify-center gap-1">
            <div className="w-1/3 rounded-t-md" style={{ height: `${b.predicted * h * 0.92}px`, background: "linear-gradient(180deg,#3d7bff,#22d3ee)", opacity: .85 }} title={`Prédit ${(b.predicted * 100).toFixed(0)} %`} />
            <div className="w-1/3 rounded-t-md" style={{ height: `${b.realized * h * 0.92}px`, background: "linear-gradient(180deg,#34d399,#10b981)" }} title={`Réalisé ${(b.realized * 100).toFixed(0)} %`} />
          </div>
        ))}
      </div>
      <div className="mt-1 flex justify-between gap-2">
        {bins.map(b => (
          <div key={b.bin} className="flex-1 text-center text-[9px] font-semibold text-slate-500">{b.bin}</div>
        ))}
      </div>
      <div className="mt-3 flex items-center justify-center gap-5 text-[11px] font-semibold">
        <span className="flex items-center gap-1.5 text-slate-400"><span className="h-2.5 w-2.5 rounded-sm" style={{ background: "#3d7bff" }} /> Probabilité prédite</span>
        <span className="flex items-center gap-1.5 text-slate-400"><span className="h-2.5 w-2.5 rounded-sm" style={{ background: "#34d399" }} /> Fréquence réalisée</span>
      </div>
    </div>
  );
}
