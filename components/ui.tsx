"use client";

// ============================================================
// KIT UI — badges, jauges, panneaux, icônes sports
// ============================================================

import { Sport, RiskLevel } from "@/lib/types";

export const SPORT_META: Record<Sport, { icon: string; label: string; color: string }> = {
  football: { icon: "⚽", label: "FOOTBALL", color: "#34d399" },
  basketball: { icon: "🏀", label: "BASKETBALL", color: "#f59e0b" },
  tennis: { icon: "🎾", label: "TENNIS", color: "#22d3ee" },
  baseball: { icon: "⚾", label: "BASEBALL", color: "#f43f5e" },
  hockey: { icon: "🏒", label: "HOCKEY", color: "#818cf8" },
  volleyball: { icon: "🏐", label: "VOLLEYBALL", color: "#a78bfa" },
  mma: { icon: "🥊", label: "MMA / UFC", color: "#fb7185" }
};

export function SportTag({ sport, league }: { sport: Sport; league?: string }) {
  const m = SPORT_META[sport];
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-bold tracking-wider"
      style={{ background: `${m.color}14`, color: m.color, border: `1px solid ${m.color}33` }}>
      <span>{m.icon}</span> {m.label}
      {league && <span className="font-medium text-slate-500">· {league}</span>}
    </span>
  );
}

export function RiskPill({ risk, label = "RISK" }: { risk: RiskLevel; label?: string }) {
  const cfg = {
    LOW: { c: "#34d399", bg: "rgba(52,211,153,.1)" },
    MEDIUM: { c: "#f59e0b", bg: "rgba(245,158,11,.1)" },
    HIGH: { c: "#f43f5e", bg: "rgba(244,63,94,.12)" }
  }[risk];
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-bold tracking-wider"
      style={{ color: cfg.c, background: cfg.bg, border: `1px solid ${cfg.c}44` }}>
      <span className="h-1.5 w-1.5 rounded-full" style={{ background: cfg.c }} />
      {label} {risk}
    </span>
  );
}

export function TierBadge({ tier }: { tier: string }) {
  const colors: Record<string, string> = {
    PREMIUM: "#fbbf24", EXCELLENTE: "#34d399", FORTE: "#22d3ee", BONNE: "#818cf8"
  };
  const c = colors[tier] ?? "#818cf8";
  return (
    <span className="rounded-lg px-2 py-1 text-[10px] font-extrabold tracking-widest"
      style={{ color: c, background: `${c}14`, border: `1px solid ${c}40` }}>
      {tier === "PREMIUM" ? "👑 " : ""}{tier}
    </span>
  );
}

export function EvBadge({ ev }: { ev: number }) {
  const positive = ev > 0;
  return (
    <span className={`tabular rounded-lg px-2 py-1 text-xs font-extrabold ${positive ? "" : "opacity-70"}`}
      style={{
        color: positive ? "#34d399" : "#94a3b8",
        background: positive ? "rgba(52,211,153,.1)" : "rgba(148,163,184,.08)",
        border: `1px solid ${positive ? "rgba(52,211,153,.35)" : "rgba(148,163,184,.2)"}`
      }}>
      EV {ev >= 0 ? "+" : ""}{(ev * 100).toFixed(1)} %
    </span>
  );
}

export function LabelChips({ labels }: { labels: string[] }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {labels.map(l => (
        <span key={l} className="rounded-full border px-2 py-0.5 text-[10px] font-bold tracking-wide"
          style={{ borderColor: "var(--border-strong)", background: "rgba(148,163,255,.07)", color: "rgb(var(--ink-soft))" }}>
          {l}
        </span>
      ))}
    </div>
  );
}

/** Jauge radiale SVG pour le Confidence Score. */
export function Gauge({ value, size = 92, label = "CONF." }: { value: number; size?: number; label?: string }) {
  const r = size / 2 - 7;
  const c = 2 * Math.PI * r;
  const pct = Math.min(100, Math.max(0, value));
  const color = pct >= 90 ? "#fbbf24" : pct >= 85 ? "#34d399" : pct >= 80 ? "#22d3ee" : "#818cf8";
  return (
    <div className="relative grid place-items-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(148,163,255,.12)" strokeWidth="6" />
        <circle
          cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth="6"
          strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - pct / 100)}
          style={{ transition: "stroke-dashoffset 1.2s cubic-bezier(.22,1,.36,1)", filter: `drop-shadow(0 0 6px ${color}66)` }}
        />
      </svg>
      <div className="absolute text-center">
        <div className="tabular font-display text-xl font-bold" style={{ color }}>{Math.round(pct)}</div>
        <div className="text-[8px] font-bold tracking-[0.18em] text-slate-500">{label}/100</div>
      </div>
    </div>
  );
}

export function HBar({ label, value, max = 100, color = "#3d7bff", suffix = "" }: {
  label: string; value: number; max?: number; color?: string; suffix?: string;
}) {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-[11px]">
        <span className="font-semibold text-slate-400">{label}</span>
        <span className="tabular font-bold" style={{ color }}>{Math.round(value)}{suffix}</span>
      </div>
      <div className="track">
        <span style={{ width: `${Math.min(100, (value / max) * 100)}%`, background: `linear-gradient(90deg, ${color}, ${color}aa)` }} />
      </div>
    </div>
  );
}

/** Panneau NO BET — quand aucune value suffisante n'existe. */
export function NoBetPanel({ reason, compact = false }: { reason?: string | null; compact?: boolean }) {
  return (
    <div className={`glass-strong gradient-border ${compact ? "p-6" : "p-10"} text-center`}>
      <div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl text-3xl"
        style={{ background: "rgba(244,63,94,.08)", border: "1px solid rgba(244,63,94,.3)" }}>
        🛑
      </div>
      <h3 className="font-display mt-4 text-2xl font-bold tracking-wide">
        NO BET <span className="text-gradient">TODAY</span>
      </h3>
      <p className="mx-auto mt-2 max-w-lg text-sm leading-relaxed text-slate-400">
        {reason ?? "Aucun marché ne présente actuellement un avantage statistique suffisamment robuste. Le moteur recommande d'attendre de nouvelles données ou mouvements de marché."}
      </p>
      <p className="mt-4 text-[11px] font-bold tracking-[0.2em] text-slate-500">
        QUALITÉ &gt; QUANTITÉ — NO BET &gt; MAUVAISE PRÉDICTION
      </p>
    </div>
  );
}

export function DemoBanner() {
  return (
    <div className="glass flex items-center gap-2.5 rounded-xl px-4 py-2.5 text-[11px] font-semibold text-amber-300/90"
      style={{ borderColor: "rgba(245,158,11,.3)", background: "rgba(245,158,11,.06)" }}>
      <span className="text-sm">⚠️</span>
      <span>
        <b>MODE DÉMONSTRATION</b> — équipes, cotes et statistiques 100 % fictives (fallback).
        Revenez en mode LIVE dans l&apos;admin pour les vraies rencontres collectées via l&apos;API publique ESPN.
      </span>
    </div>
  );
}

/** Bandeau d'état des données : LIVE (réel) ou DEMO, avec dernière collecte. */
export function DataBanner({ status, collectMsg }: {
  status: { demoMode: boolean; realEvents: number; lastIngest: string | null; oddsFeedLive: boolean } | null;
  collectMsg?: string;
}) {
  if (!status) return null;
  if (status.demoMode) return <DemoBanner />;

  const waiting = !status.lastIngest;
  return (
    <div className="glass flex flex-wrap items-center gap-x-3 gap-y-1 rounded-xl px-4 py-2.5 text-[11px] font-semibold"
      style={{ borderColor: waiting ? "rgba(34,211,238,.3)" : "rgba(52,211,153,.3)", background: waiting ? "rgba(34,211,238,.06)" : "rgba(52,211,153,.06)" }}>
      <span className="flex items-center gap-1.5 text-emerald-300">
        <span className="dot-live" style={{ width: 7, height: 7 }} />
        <b>DONNÉES RÉELLES</b>
      </span>
      <span className="text-slate-400">
        {waiting
          ? "Collecte des vrais matchs en cours (API publique ESPN, via votre navigateur)…"
          : `${status.realEvents} rencontres réelles · dernière collecte ${timeAgoShort(status.lastIngest)}`}
        {collectMsg ? ` · ${collectMsg}` : ""}
      </span>
      {!status.oddsFeedLive && !waiting && (
        <span className="text-slate-500">
          · cotes bookmaker non disponibles sur ces matchs → prédictions par probabilité réelle (cotes fair), pas de value inventée
        </span>
      )}
      {status.oddsFeedLive && (
        <span className="text-emerald-400">· cotes réelles ESPN actives → Value Engine complet (EV)</span>
      )}
    </div>
  );
}

function timeAgoShort(iso: string): string {
  const s = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
  if (s < 60) return `il y a ${s} s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `il y a ${m} min`;
  return `il y a ${Math.floor(m / 60)} h`;
}

export function SectionTitle({ kicker, title, right }: { kicker?: string; title: React.ReactNode; right?: React.ReactNode }) {
  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
      <div>
        {kicker && <div className="mb-1 text-[10px] font-bold tracking-[0.28em] text-slate-500">{kicker}</div>}
        <h2 className="font-display text-xl font-bold sm:text-2xl">{title}</h2>
      </div>
      {right}
    </div>
  );
}

export function AnalyzingLoader({ pct }: { pct: number }) {
  return (
    <div className="glass-strong mx-auto max-w-md p-8 text-center">
      <div className="text-xs font-bold tracking-[0.3em] text-slate-400">ANALYZING MATCHES…</div>
      <div className="track mt-4">
        <span className="bar-blue" style={{ width: `${pct}%` }} />
      </div>
      <div className="tabular mt-2 font-mono text-xs text-cyan-300">{Math.round(pct)} %</div>
    </div>
  );
}

/** Petite animation de progression pendant les fetchs. */
export function useAnalysisProgress(active: boolean): number {
  // simple hook-free version handled by callers
  return active ? 80 : 100;
}
