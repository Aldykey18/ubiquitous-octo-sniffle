"use client";

// ============================================================
// CARTE PRÉDICTION — affiche : match, prono, proba modèle,
// cote, EV, confiance, risque + transparence (traçabilité).
// ============================================================

import Link from "next/link";
import { Prediction } from "@/lib/types";
import { SportTag, RiskPill, TierBadge, EvBadge, LabelChips, Gauge } from "./ui";
import { Sparkline } from "./charts";
import { fmtOdds, fmtPct, fmtDayTime } from "@/lib/utils";
import { useFavorites } from "@/lib/client";

export function PredictionCard({
  p, rank, compact = false, showExplanation = true
}: { p: Prediction; rank?: number; compact?: boolean; showExplanation?: boolean }) {
  const { favs, toggle } = useFavorites();
  const isFav = favs.includes(p.id);
  const e = p.event;
  const live = e.status === "live";

  return (
    <article
      className={`glass card-hover fade-up relative overflow-hidden p-5 ${rank === 1 ? "gradient-border" : ""}`}
      style={{ animationDelay: `${(rank ?? 0) * 60}ms` }}
    >
      {/* halo */}
      <div className="pointer-events-none absolute -right-16 -top-16 h-44 w-44 rounded-full opacity-25 blur-3xl"
        style={{ background: rank === 1 ? "radial-gradient(circle,#fbbf24,transparent 70%)" : "radial-gradient(circle,#3d7bff,transparent 70%)" }} />

      <div className="relative flex items-start justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          {rank && (
            <span className={`font-display grid h-8 w-8 place-items-center rounded-xl text-sm font-bold ${
              rank === 1 ? "text-black" : "text-slate-300"
            }`} style={{ background: rank === 1 ? "linear-gradient(135deg,#fbbf24,#f97316)" : "rgba(148,163,255,.1)", border: rank === 1 ? "none" : "1px solid var(--border)" }}>
              #{rank}
            </span>
          )}
          <SportTag sport={e.sport} league={e.league} />
          {live ? (
            <span className="flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-bold text-emerald-400" style={{ background: "rgba(52,211,153,.1)" }}>
              <span className="dot-live" style={{ width: 6, height: 6 }} /> LIVE {e.minute}&apos; · {e.scoreHome}-{e.scoreAway}
            </span>
          ) : (
            <span className="rounded-full px-2 py-0.5 text-[11px] font-bold text-cyan-300" style={{ background: "rgba(34,211,238,.08)", border: "1px solid rgba(34,211,238,.2)" }}>
              🗓 {fmtDayTime(e.startTime)}
            </span>
          )}
          {e.dataSource === "espn" && (
            <span className="rounded-full px-2 py-0.5 text-[9px] font-bold tracking-wider text-emerald-400" style={{ background: "rgba(52,211,153,.08)" }}>
              RÉEL
            </span>
          )}
        </div>
        <button
          onClick={() => toggle(p.id)}
          className={`text-lg transition-transform hover:scale-125 ${isFav ? "" : "opacity-40 grayscale hover:opacity-90"}`}
          aria-label="Favori" title={isFav ? "Retirer des favoris" : "Ajouter aux favoris"}
        >
          ⭐
        </button>
      </div>

      {/* Match */}
      <div className="relative mt-3.5">
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0 flex-1">
            <TeamLine logo={e.home.logo} name={e.home.name} record={e.home.record} />
            <div className="my-0.5 pl-0.5 text-[11px] text-slate-500">vs</div>
            <TeamLine logo={e.away.logo} name={e.away.name} record={e.away.record} />
          </div>
          <div className="shrink-0 text-right">
            <div className="text-[10px] font-bold tracking-widest text-slate-500">PREDICTION</div>
            <div className="mt-1 max-w-[190px] rounded-xl px-3 py-2 text-sm font-extrabold"
              style={{ background: "linear-gradient(120deg, rgba(61,123,255,.18), rgba(139,92,246,.18))", border: "1px solid var(--border-strong)" }}>
              {p.market.label}
              <div className="text-gradient text-[13px]">{p.market.selection}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Métriques principales */}
      <div className="relative mt-4 grid grid-cols-3 gap-2.5">
        <Metric label="MODEL PROB." value={fmtPct(p.modelProb, 0)} color="#22d3ee"
          sub={<Sparkline data={p.market.oddsHistory.slice(-14).map(o => 1 / o)} color="#22d3ee" width={70} height={20} />} />
        <Metric label={p.fairOdds ? "FAIR ODDS" : "ODDS"} value={fmtOdds(p.market.odds)} color="#a78bfa"
          sub={p.market.oddsHistory.length > 1
            ? <Sparkline data={p.market.oddsHistory.slice(-14)} color="#a78bfa" width={70} height={20} />
            : <span className="text-[9px] text-slate-500">{p.fairOdds ? "= 1 / probabilité" : "ouverture"}</span>} />
        {p.fairOdds ? (
          <Metric label="VALUE" value="—" color="#64748b"
            sub={<span className="text-[9px] leading-tight text-slate-500">pas de cote book connectée</span>} />
        ) : (
          <Metric label="VALUE (EV)" value={`${p.ev >= 0 ? "+" : ""}${(p.ev * 100).toFixed(1)} %`} color={p.ev >= 0.08 ? "#34d399" : p.ev >= 0.04 ? "#fbbf24" : "#94a3b8"}
            sub={<span className="text-[10px] text-slate-500">vs implicite {fmtPct(p.market.impliedProb, 0)}</span>} />
        )}
      </div>

      {/* Confiance + badges */}
      <div className="relative mt-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Gauge value={p.confidence} size={compact ? 62 : 74} />
          <div className="space-y-1.5">
            <div className="flex flex-wrap gap-1.5">
              <TierBadge tier={p.confidenceTier} />
              {p.fairOdds ? (
                <span className="rounded-lg px-2 py-1 text-xs font-extrabold text-slate-400"
                  style={{ background: "rgba(148,163,184,.08)", border: "1px solid rgba(148,163,184,.2)" }}>
                  SANS COTE RÉELLE
                </span>
              ) : (
                <EvBadge ev={p.ev} />
              )}
            </div>
            <div className="flex flex-wrap gap-1.5">
              <RiskPill risk={p.risk} />
              <span className="inline-flex items-center gap-1 rounded-full px-2 py-1 text-[10px] font-bold tracking-wider text-slate-400"
                style={{ background: "rgba(148,163,255,.06)", border: "1px solid var(--border)" }}>
                CORR. {p.correlationRisk}
              </span>
            </div>
          </div>
        </div>
        <div className="text-right text-[10px] leading-relaxed text-slate-500">
          <div>DATA QUALITY <b className="text-slate-300">{Math.round(p.dataQuality)} %</b></div>
          <div>CONSENSUS <b className="text-slate-300">{p.consensusCount}</b></div>
          <div>VARIANCE <b className={p.variance === "LOW" ? "text-emerald-400" : p.variance === "MEDIUM" ? "text-amber-400" : "text-rose-400"}>{p.variance}</b></div>
        </div>
      </div>

      {!compact && (
        <div className="relative mt-3.5"><LabelChips labels={p.labels} /></div>
      )}

      {/* Explication IA */}
      {showExplanation && !compact && (
        <div className="relative mt-4 rounded-xl p-3 text-[12px] leading-relaxed text-slate-400"
          style={{ background: "rgba(34,211,238,.05)", border: "1px solid rgba(34,211,238,.15)" }}>
          <span className="font-bold text-cyan-300">Pourquoi cette sélection ?</span>{" "}
          {p.explanation}
        </div>
      )}

      {/* Transparence / traçabilité */}
      <div className="relative mt-3.5 flex flex-wrap items-center justify-between gap-2 border-t pt-3 text-[10px] text-slate-500" style={{ borderColor: "var(--border)" }}>
        <span>⏳ Générée {new Date(p.generatedAt).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })} · Données MAJ {new Date(p.dataUpdatedAt).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}</span>
        <span>Source {e.dataSource === "espn" ? "ESPN (réel)" : "démo"} · Consensus {p.consensusCount} · DQ {Math.round(p.dataQuality)} %</span>
        <Link href={`/match/${e.id}`} className="font-bold text-cyan-400 transition-colors hover:text-cyan-200">
          ANALYSE COMPLÈTE →
        </Link>
      </div>
    </article>
  );
}

function TeamLine({ logo, name, record }: { logo?: string; name: string; record?: string }) {
  return (
    <div className="flex items-center gap-2">
      {logo ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={logo} alt="" width={20} height={20} className="h-5 w-5 shrink-0 object-contain" loading="lazy" />
      ) : (
        <span className="grid h-5 w-5 shrink-0 place-items-center rounded-md text-[9px] font-bold text-slate-400"
          style={{ background: "rgba(148,163,255,.1)" }}>●</span>
      )}
      <span className="truncate font-display text-[15px] font-bold">{name}</span>
      {record && <span className="tabular shrink-0 text-[10px] font-semibold text-slate-500">({record})</span>}
    </div>
  );
}

function Metric({ label, value, color, sub }: { label: string; value: string; color: string; sub?: React.ReactNode }) {
  return (
    <div className="rounded-xl p-2.5 text-center" style={{ background: "rgba(148,163,255,.05)", border: "1px solid var(--border)" }}>
      <div className="text-[9px] font-bold tracking-[0.16em] text-slate-500">{label}</div>
      <div className="tabular font-display mt-0.5 text-lg font-bold" style={{ color }}>{value}</div>
      <div className="mt-1 flex justify-center">{sub}</div>
    </div>
  );
}
