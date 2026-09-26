"use client";

// ============================================================
// 🔥 BEST PREDICTIONS TODAY
// UNIQUEMENT les meilleures prédictions du jour (max 10).
// Filtres : statut, sport, risque, confiance, EV.
// ============================================================

import { useMemo, useState } from "react";
import { PredictionCard } from "@/components/PredictionCard";
import { NoBetPanel, AnalyzingLoader, DataBanner, RiskPill } from "@/components/ui";
import { useCollectPhase } from "@/components/LiveCollector";
import { useApi } from "@/lib/client";
import type { Prediction, RiskLevel, StatusPayload } from "@/lib/types";
import { timeAgo } from "@/lib/utils";

const SPORTS = [
  ["all", "ALL SPORTS"], ["football", "⚽ FOOTBALL"], ["basketball", "🏀 BASKETBALL"],
  ["tennis", "🎾 TENNIS"], ["baseball", "⚾ BASEBALL"], ["hockey", "🏒 HOCKEY"], ["volleyball", "🏐 VOLLEYBALL"]
];
const RISKS = [["all", "TOUS RISQUES"], ["low", "LOW RISK"], ["medium", "MEDIUM RISK"], ["highValue", "HIGH VALUE"], ["premium", "👑 PREMIUM"]];

type Resp = {
  predictions: Prediction[];
  noBet: boolean;
  noBetReason: string | null;
  correlationRisk: RiskLevel;
  generatedAt: string;
  max: number;
  totalCandidatesAnalyzed: number;
};

export default function PredictionsPage() {
  const [sport, setSport] = useState("all");
  const [risk, setRisk] = useState("all");
  const [status, setStatus] = useState("today");
  const [minConf, setMinConf] = useState(0);
  const [minEv, setMinEv] = useState(0);

  const qs = useMemo(() => {
    const p = new URLSearchParams();
    if (sport !== "all") p.set("sport", sport);
    if (risk !== "all") p.set("risk", risk);
    if (status !== "today") p.set("status", status);
    if (minConf) p.set("minConf", String(minConf));
    if (minEv) p.set("minEv", String(minEv));
    return p.toString();
  }, [sport, risk, status, minConf, minEv]);

  const { data, loading, reload } = useApi<Resp>(`/api/predictions?${qs}`, 20000);
  const { data: sysStatus } = useApi<StatusPayload>("/api/status", 15000);
  const collect = useCollectPhase();

  return (
    <div className="space-y-6">
      <header className="fade-up">
        <div className="text-[10px] font-bold tracking-[0.3em] text-slate-500">SÉLECTION QUOTIDIENNE · MAX 10 · TRI PAR VALEUR + CONFIANCE</div>
        <h1 className="font-display mt-1.5 text-3xl font-bold sm:text-4xl">
          🔥 BEST PREDICTIONS <span className="text-gradient">TODAY</span>
        </h1>
        {data && (
          <p className="mt-2 text-xs text-slate-500">
            {data.predictions.length} prédiction(s) retenue(s) sur {data.totalCandidatesAnalyzed} marchés analysés ·
            dernière analyse {timeAgo(data.generatedAt)} ·{" "}
            <button onClick={reload} className="font-bold text-cyan-400 hover:text-cyan-200">↻ re-synchroniser</button>
          </p>
        )}
      </header>

      <DataBanner status={sysStatus} collectMsg={collect.phase === "collecting" ? collect.message : undefined} />

      {/* Filtres */}
      <div className="glass space-y-3 p-4">
        <div className="flex flex-wrap items-center gap-2">
          {(["today"] as const).map(() => null)}
          {["today", "live", "upcoming"].map(s => (
            <button key={s} className={`chip ${status === s ? "active" : ""}`} onClick={() => setStatus(s)}>
              {s === "today" ? "📅 TODAY" : s === "live" ? "🟢 LIVE" : "⏱ UPCOMING"}
            </button>
          ))}
          <span className="mx-1 hidden h-5 w-px sm:block" style={{ background: "var(--border)" }} />
          {SPORTS.map(([v, l]) => (
            <button key={v} className={`chip ${sport === v ? "active" : ""}`} onClick={() => setSport(v)}>{l}</button>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {RISKS.map(([v, l]) => (
            <button key={v} className={`chip ${risk === v ? "active" : ""}`} onClick={() => setRisk(v)}>{l}</button>
          ))}
          <span className="mx-1 hidden h-5 w-px sm:block" style={{ background: "var(--border)" }} />
          <label className="flex items-center gap-2 text-[11px] font-semibold text-slate-400">
            Conf. ≥
            <input type="range" min={0} max={95} step={5} value={minConf} onChange={e => setMinConf(Number(e.target.value))}
              className="accent-cyan-400" />
            <span className="tabular w-8 text-cyan-300">{minConf || "—"}</span>
          </label>
          <label className="flex items-center gap-2 text-[11px] font-semibold text-slate-400">
            EV ≥
            <input type="range" min={0} max={20} step={1} value={minEv} onChange={e => setMinEv(Number(e.target.value))}
              className="accent-emerald-400" />
            <span className="tabular w-10 text-emerald-300">{minEv ? `+${minEv} %` : "—"}</span>
          </label>
        </div>
      </div>

      {/* Contenu */}
      {loading && !data && (
        <div className="space-y-4">
          <AnalyzingLoader pct={78} />
          <div className="grid gap-4 lg:grid-cols-2">
            {[1, 2].map(i => <div key={i} className="skeleton h-[420px]" />)}
          </div>
        </div>
      )}

      {!loading && data?.noBet && data.predictions.length === 0 && (
        sysStatus && !sysStatus.demoMode && !sysStatus.lastIngest ? (
          <div className="glass-strong p-10 text-center">
            <div className="mx-auto grid h-16 w-16 animate-pulse place-items-center rounded-2xl text-3xl"
              style={{ background: "rgba(34,211,238,.08)", border: "1px solid rgba(34,211,238,.3)" }}>📡</div>
            <h3 className="font-display mt-4 text-2xl font-bold">COLLECTE DES MATCHS RÉELS…</h3>
            <p className="mx-auto mt-2 max-w-lg text-sm text-slate-400">
              Votre navigateur interroge l&apos;API publique ESPN (gratuite, sans clé) pour récupérer les vraies
              rencontres du jour, puis le moteur lance ses calculs réels. Rafraîchissez la page dans quelques secondes.
            </p>
            {collect.message && <p className="mt-3 text-xs font-bold text-cyan-300">{collect.message}</p>}
            <button onClick={reload} className="btn-ghost mt-4 text-xs">↻ Vérifier maintenant</button>
          </div>
        ) : (
          <NoBetPanel reason={data.noBetReason} />
        )
      )}

      {data && data.predictions.length > 0 && (
        <>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-[11px] font-bold tracking-widest text-slate-500">
              CORRELATION RISK GLOBAL : <RiskPill risk={data.correlationRisk} label="" />
            </div>
            <div className="text-[11px] text-slate-500">{data.predictions.length} / {data.max} max</div>
          </div>
          <div className="grid gap-4 lg:grid-cols-2">
            {data.predictions.map((p, i) => (
              <PredictionCard key={p.id} p={p} rank={i + 1} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
