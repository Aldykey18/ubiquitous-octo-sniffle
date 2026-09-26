"use client";

// ============================================================
// 🛠️ DASHBOARD ADMINISTRATEUR — sources, sync, auto-learning,
// entonnoir de filtrage (combien de marchés exclus et pourquoi).
// ============================================================

import { useState } from "react";
import { useApi } from "@/lib/client";
import { DataBanner, HBar } from "@/components/ui";
import { timeAgo } from "@/lib/utils";

interface AdminData {
  mode: string;
  dateSeed: string;
  syncCount: number;
  lastSync: string;
  events: number;
  markets: number;
  predictions: number;
  noBet: boolean;
  sources: { name: string; type: string; status: string; detail: string; lastCheck: string | null }[];
  learning: {
    version: number;
    resolvedCount: number;
    biasBySport: Record<string, number>;
    modelWeights: Record<string, number>;
    roiHistory: number[];
    notes: string[];
  };
  rejected: { reason: string; count: number }[];
  lastIngest: string | null;
  collectorReports: { league: string; sport: string; ok: boolean; events: number; detail: string }[];
  oddsFeedLive: boolean;
}

export default function AdminPage() {
  const { data, loading, reload } = useApi<AdminData>("/api/admin", 15000);
  const { data: status } = useApi<any>("/api/status", 10000);
  const [busy, setBusy] = useState<string | null>(null);

  const collectNow = () => {
    window.dispatchEvent(new CustomEvent("vbm:collect-now"));
    setTimeout(() => reload(), 25000);
  };

  const action = async (body: any, key: string) => {
    setBusy(key);
    try {
      await fetch("/api/admin", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      await fetch("/api/sync", { method: "POST" }).catch(() => {});
      reload();
    } finally {
      setBusy(null);
    }
  };

  if (loading && !data) return <div className="skeleton h-96" />;
  if (!data) return null;

  const totalWeights = Object.values(data.learning.modelWeights).reduce((a, b) => a + b, 0);

  return (
    <div className="space-y-6">
      <header className="fade-up flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="text-[10px] font-bold tracking-[0.3em] text-slate-500">SUPERVISION DU MOTEUR</div>
          <h1 className="font-display mt-1.5 text-3xl font-bold sm:text-4xl">🛠️ ADMIN <span className="text-gradient">DASHBOARD</span></h1>
        </div>
        <div className="flex flex-wrap gap-2">
          <button className="btn-primary text-xs" onClick={collectNow}>📡 Collecter maintenant (ESPN)</button>
          <button className="btn-ghost text-xs" disabled={busy === "sync"} onClick={() => action({}, "sync")}>
            {busy === "sync" ? "⏳…" : "↻ Forcer une sync"}
          </button>
          <button className="btn-ghost text-xs" disabled={busy === "reset"} onClick={() => action({ action: "reset" }, "reset")}>
            {busy === "reset" ? "⏳…" : "♻ Régénérer"}
          </button>
        </div>
      </header>

      <DataBanner status={status} />

      {/* Rapports du collecteur navigateur */}
      {data.mode === "live" && (
        <section className="glass p-5">
          <h3 className="font-display mb-1 text-sm font-bold tracking-widest text-slate-300">
            📡 COLLECTE NAVIGATEUR (API publique ESPN) {data.lastIngest && <span className="text-slate-500">· dernière {timeAgo(data.lastIngest)}</span>}
          </h3>
          <p className="mb-3 text-[11px] leading-relaxed text-slate-500">
            Le serveur n&apos;a pas d&apos;accès internet sortant : la collecte des matchs réels est exécutée par
            <b> votre navigateur</b> via l&apos;API publique ESPN (gratuite, sans clé, CORS ouverte), puis envoyée au moteur.
            Flashscore / AiScore / SofaScore ne proposent aucune API officielle gratuite et leurs protections ne sont
            jamais contournées.
          </p>
          {data.collectorReports.length === 0 ? (
            <p className="text-xs text-slate-500">Aucune collecte pour l&apos;instant — cliquez « Collecter maintenant ».</p>
          ) : (
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
              {data.collectorReports.map(r => (
                <div key={r.league + r.sport} className="rounded-xl p-2.5 text-[11px]"
                  style={{ background: r.ok ? "rgba(52,211,153,.05)" : "rgba(244,63,94,.05)", border: `1px solid ${r.ok ? "rgba(52,211,153,.2)" : "rgba(244,63,94,.2)"}` }}>
                  <div className="flex items-center justify-between font-bold">
                    <span>{r.league}</span>
                    <span className={r.ok ? "text-emerald-400" : "text-rose-400"}>{r.ok ? `✓ ${r.events}` : "✕"}</span>
                  </div>
                  <div className="mt-0.5 text-slate-500">{r.detail}</div>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {/* KPIs système */}
      <section className="stagger grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Kpi label="SYNC #" value={String(data.syncCount)} sub={timeAgo(data.lastSync)} />
        <Kpi label="ÉVÉNEMENTS" value={String(data.events)} sub={`seed ${data.dateSeed}`} />
        <Kpi label="MARCHÉS ANALYSÉS" value={String(data.markets)} sub={`${data.predictions} retenus`} />
        <Kpi label="STATUT VALUE" value={data.noBet ? "NO BET" : "ACTIF"} sub={data.noBet ? "aucune value suffisante" : "entonnoir actif"} color={data.noBet ? "#f43f5e" : "#34d399"} />
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Sources */}
        <section className="glass p-5">
          <h3 className="font-display mb-4 text-sm font-bold tracking-widest text-slate-300">🌐 SOURCES DE DONNÉES</h3>
          <div className="space-y-2.5">
            {data.sources.map(s => (
              <div key={s.name} className="flex items-center justify-between gap-3 rounded-xl p-3"
                style={{ background: "rgba(148,163,255,.05)", border: "1px solid var(--border)" }}>
                <div>
                  <div className="text-sm font-bold">{s.name}</div>
                  <div className="text-[11px] text-slate-500">{s.detail}</div>
                </div>
                <StatusChip status={s.status} />
              </div>
            ))}
          </div>

          <h3 className="font-display mb-3 mt-6 text-sm font-bold tracking-widest text-slate-300">MODE DE DONNÉES</h3>
          <div className="flex gap-2">
            <button
              className={`chip ${data.mode === "demo" ? "active" : ""}`}
              onClick={() => data.mode !== "demo" && action({ action: "setMode", mode: "demo" }, "mode-demo")}>
              DEMO (fictif, sûr)
            </button>
            <button
              className={`chip ${data.mode === "live" ? "active" : ""}`}
              onClick={() => data.mode !== "live" && action({ action: "setMode", mode: "live" }, "mode-live")}>
              LIVE (connecteurs réels)
            </button>
          </div>
          <p className="mt-2 text-[11px] leading-relaxed text-slate-500">
            En mode LIVE, le serveur interroge l&apos;API publique ESPN. Sans clé The Odds API, les matchs réels
            n&apos;ont pas de cotes → ils sont <b>exclus du classement value</b> (pas de données inventées).
          </p>
        </section>

        {/* Auto-learning */}
        <section className="glass p-5">
          <h3 className="font-display mb-4 text-sm font-bold tracking-widest text-slate-300">
            🧠 AUTO-LEARNING <span className="text-slate-500">v{data.learning.version} · {data.learning.resolvedCount.toLocaleString("fr-FR")} résolus</span>
          </h3>
          <div className="space-y-2.5">
            {Object.entries(data.learning.modelWeights).map(([k, w]) => (
              <HBar key={k} label={`${k} engine`} value={(w / totalWeights) * 100} suffix=" %" color="#8b5cf6" />
            ))}
          </div>
          <div className="mt-4 space-y-1.5">
            {data.learning.notes.map((n, i) => (
              <p key={i} className="rounded-lg px-3 py-2 text-[11px] text-slate-400" style={{ background: "rgba(34,211,238,.05)", border: "1px solid rgba(34,211,238,.15)" }}>
                💡 {n}
              </p>
            ))}
          </div>
          <h4 className="mt-4 text-[10px] font-bold tracking-widest text-slate-500">BIAIS DÉTECTÉS PAR SPORT (proba prédite − réalisée)</h4>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {Object.entries(data.learning.biasBySport).map(([s, b]) => (
              <span key={s} className="tabular rounded-full border px-2.5 py-1 text-[10px] font-bold"
                style={{
                  borderColor: Math.abs(b) > 0.015 ? "rgba(245,158,11,.4)" : "var(--border)",
                  color: b > 0.015 ? "#f59e0b" : b < -0.015 ? "#22d3ee" : "#94a3b8",
                  background: Math.abs(b) > 0.015 ? "rgba(245,158,11,.06)" : "rgba(148,163,255,.05)"
                }}>
                {s} {b > 0 ? "+" : ""}{(b * 100).toFixed(1)} pts
              </span>
            ))}
          </div>
        </section>
      </div>

      {/* Entonnoir de filtrage */}
      <section className="glass p-5">
        <h3 className="font-display mb-1 text-sm font-bold tracking-widest text-slate-300">🚦 ENTONNOIR DE SÉLECTION (temps réel)</h3>
        <p className="mb-4 text-[11px] text-slate-500">
          Combien de marchés le moteur a-t-il écartés au dernier cycle, et pourquoi. La discipline du moteur est visible ici.
        </p>
        {data.rejected.length === 0 ? (
          <p className="text-xs text-slate-500">Aucun rejet ce cycle (tous les marchés passent — rare).</p>
        ) : (
          <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
            {data.rejected.map(r => (
              <div key={r.reason} className="rounded-xl p-3 text-center" style={{ background: "rgba(244,63,94,.05)", border: "1px solid rgba(244,63,94,.18)" }}>
                <div className="tabular font-display text-2xl font-bold text-rose-400">{r.count}</div>
                <div className="mt-1 text-[10px] font-bold tracking-wide text-slate-400">{r.reason}</div>
              </div>
            ))}
          </div>
        )}
        <div className="mt-4 flex flex-wrap items-center gap-2 text-[11px] font-semibold text-slate-400">
          <span className="rounded-lg px-2.5 py-1" style={{ background: "rgba(61,123,255,.1)" }}>{data.markets} marchés entrants</span>
          <span>→</span>
          <span className="rounded-lg px-2.5 py-1" style={{ background: "rgba(139,92,246,.1)" }}>{data.rejected.reduce((a, r) => a + r.count, 0)} rejetés</span>
          <span>→</span>
          <span className="rounded-lg px-2.5 py-1 text-emerald-400" style={{ background: "rgba(52,211,153,.1)" }}>{data.predictions} retenus (max 10)</span>
        </div>
      </section>
    </div>
  );
}

function Kpi({ label, value, sub, color }: { label: string; value: string; sub?: string; color?: string }) {
  return (
    <div className="glass card-hover p-4 text-center">
      <div className="font-display text-xl font-bold" style={{ color: color ?? "#e2e8f0" }}>{value}</div>
      <div className="mt-1 text-[9px] font-bold tracking-[0.16em] text-slate-500">{label}</div>
      {sub && <div className="text-[10px] text-slate-600">{sub}</div>}
    </div>
  );
}

function StatusChip({ status }: { status: string }) {
  const map: Record<string, { c: string; label: string }> = {
    active: { c: "#34d399", label: "ACTIF" },
    ok: { c: "#34d399", label: "OK" },
    error: { c: "#f43f5e", label: "ERREUR" },
    disabled: { c: "#64748b", label: "INACTIF" }
  };
  const m = map[status] ?? map.disabled;
  return (
    <span className="rounded-full px-2.5 py-1 text-[10px] font-bold tracking-wider" style={{ color: m.c, background: `${m.c}15`, border: `1px solid ${m.c}40` }}>
      {m.label}
    </span>
  );
}
