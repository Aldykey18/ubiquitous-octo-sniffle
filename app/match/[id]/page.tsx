"use client";

// ============================================================
// 🔬 ANALYSE D'UNE RENCONTRE — BEST BET, votes des 5 modèles,
// forme, matchup, contexte, historique des cotes, transparence.
// ============================================================

import { useParams } from "next/navigation";
import Link from "next/link";
import { useApi } from "@/lib/client";
import type { SportEvent, Prediction, Market, RiskLevel } from "@/lib/types";
import { SPORT_META, RiskPill, TierBadge, EvBadge, Gauge, HBar, LabelChips, DataBanner } from "@/components/ui";
import { LineChart, RadarChart, BarChart } from "@/components/charts";
import { fmtOdds, fmtPct, fmtTime, fmtDayTime } from "@/lib/utils";
import type { StatusPayload } from "@/lib/types";

interface MatchData {
  event: SportEvent;
  prediction: Prediction | null;
  analysis: {
    market: Market;
    votes: Record<string, number>;
    modelProb: number;
    ev: number;
    isBest: boolean;
  }[];
  learning: { modelWeights: Record<string, number>; biasBySport: number };
}

export default function MatchPage() {
  const { id } = useParams<{ id: string }>();
  const { data, loading } = useApi<MatchData>(`/api/match/${id}`, 15000);
  const { data: status } = useApi<StatusPayload>("/api/status", 0);

  if (loading && !data) {
    return (
      <div className="mx-auto max-w-5xl space-y-4">
        <div className="skeleton h-40" />
        <div className="grid gap-4 lg:grid-cols-2"><div className="skeleton h-80" /><div className="skeleton h-80" /></div>
      </div>
    );
  }
  if (!data) return <p className="text-center text-slate-500">Événement introuvable.</p>;

  const { event: e, prediction: p, analysis } = data;
  const meta = SPORT_META[e.sport];
  const best = analysis.find(a => a.isBest) ?? analysis[0];

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <Link href="/analysis" className="text-xs font-bold text-cyan-400 hover:text-cyan-200">← Retour à l&apos;analyse</Link>

      {/* En-tête rencontre */}
      <header className="glass-strong fade-up relative overflow-hidden p-6 text-center sm:p-8">
        <div className="pointer-events-none absolute -top-24 left-1/2 h-56 w-56 -translate-x-1/2 rounded-full opacity-30 blur-3xl"
          style={{ background: `radial-gradient(circle, ${meta.color}, transparent 70%)` }} />
        <div className="relative">
          <div className="mx-auto w-fit"><span className="text-[11px] font-bold tracking-[0.25em] text-slate-500">{meta.icon} {e.league} · 🗓 {fmtDayTime(e.startTime)} · {e.status === "live" ? `🟢 LIVE ${e.minute}'` : e.status === "finished" ? "TERMINÉ" : "À VENIR"}{e.dataSource === "espn" ? " · RÉEL (ESPN)" : ""}</span></div>
          <div className="mt-4 grid grid-cols-[1fr_auto_1fr] items-center gap-3">
            <div>
              <div className="font-display text-lg font-bold sm:text-2xl">{e.home.name}</div>
              <div className="text-[11px] text-slate-500">Domicile</div>
            </div>
            <div className="font-display px-2 text-2xl font-bold text-slate-500">
              {e.status !== "upcoming" ? <span className="text-cyan-300">{e.scoreHome ?? 0} – {e.scoreAway ?? 0}</span> : "VS"}
            </div>
            <div>
              <div className="font-display text-lg font-bold sm:text-2xl">{e.away.name}</div>
              <div className="text-[11px] text-slate-500">Extérieur</div>
            </div>
          </div>
        </div>
      </header>

      <DataBanner status={status} />

      {/* BEST BET */}
      <section className="glass-strong gradient-border fade-up p-6">
        <div className="grid items-center gap-6 md:grid-cols-[1fr_auto]">
          <div>
            <div className="text-[10px] font-bold tracking-[0.3em] text-amber-400">💎 BEST BET DU MOTEUR</div>
            {p ? (
              <>
                <div className="font-display mt-2 text-2xl font-bold">
                  {p.market.label} — <span className="text-gradient">{p.market.selection}</span>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
                  <KV k="MODEL PROBABILITY" v={fmtPct(p.modelProb, 0)} c="#22d3ee" />
                  <KV k="ODDS" v={fmtOdds(p.market.odds)} c="#a78bfa" />
                  <KV k="EV" v={`${p.ev >= 0 ? "+" : ""}${(p.ev * 100).toFixed(1)} %`} c="#34d399" />
                  <KV k="RISK" v={p.risk} c={p.risk === "LOW" ? "#34d399" : p.risk === "MEDIUM" ? "#f59e0b" : "#f43f5e"} />
                </div>
                <div className="mt-3.5"><LabelChips labels={p.labels} /></div>
                <p className="mt-4 rounded-xl p-3.5 text-[13px] leading-relaxed text-slate-400"
                  style={{ background: "rgba(34,211,238,.05)", border: "1px solid rgba(34,211,238,.15)" }}>
                  <b className="text-cyan-300">Pourquoi ?</b> {p.explanation}
                </p>
              </>
            ) : (
              <div className="mt-3 rounded-xl p-4 text-sm text-slate-400" style={{ background: "rgba(244,63,94,.06)", border: "1px solid rgba(244,63,94,.2)" }}>
                🛑 <b>NO BET sur cette rencontre.</b> Aucun marché ne passe les seuils :{" "}
                confiance ≥ 75, EV ≥ +4 %, qualité de données suffisante. Le moteur ne force jamais une sélection.
              </div>
            )}
          </div>
          {p && (
            <div className="flex flex-col items-center gap-2">
              <Gauge value={p.confidence} size={110} label="CONFIDENCE" />
              <TierBadge tier={p.confidenceTier} />
              <RiskPill risk={p.risk} />
            </div>
          )}
        </div>
      </section>

      {/* Votes des modèles */}
      <section className="grid gap-4 lg:grid-cols-2">
        <div className="glass p-5">
          <h3 className="font-display mb-4 text-sm font-bold tracking-widest text-slate-300">🤖 CONSENSUS DES 5 MODÈLES {best ? `— ${best.market.label}` : ""}</h3>
          {best ? (
            <>
              <RadarChart
                axes={["STATS", "FORME", "CONTEXTE", "MATCHUP", "MARCHÉ"]}
                series={[{ name: "modèles", values: [best.votes.statistical, best.votes.form, best.votes.context, best.votes.matchup, best.votes.market], color: "#3d7bff", max: 1 }]}
              />
              <div className="mt-2 text-center text-xs text-slate-400">
                Consensus : <b className="text-cyan-300">{fmtPct(best.modelProb, 1)}</b> · Cote {fmtOdds(best.market.odds)} →{" "}
                <b className={best.ev >= 0 ? "text-emerald-400" : "text-rose-400"}>EV {(best.ev * 100).toFixed(1)} %</b>
              </div>
            </>
          ) : <p className="text-xs text-slate-500">Aucun marché disponible.</p>}
        </div>

        <div className="glass p-5">
          <h3 className="font-display mb-4 text-sm font-bold tracking-widest text-slate-300">📈 MOUVEMENT DE COTE {best ? `— ${best.market.selection}` : ""}</h3>
          {best && (
            <LineChart data={best.market.oddsHistory} color="#a78bfa" label="ODDS (24 dernières observations)" height={190} />
          )}
          <div className="mt-4 space-y-2.5">
            <HBar label="Statistical Engine" value={(best?.votes.statistical ?? 0) * 100} color="#3d7bff" suffix=" %" />
            <HBar label="Form Engine" value={(best?.votes.form ?? 0) * 100} color="#22d3ee" suffix=" %" />
            <HBar label="Context Engine" value={(best?.votes.context ?? 0) * 100} color="#8b5cf6" suffix=" %" />
            <HBar label="Matchup Engine" value={(best?.votes.matchup ?? 0) * 100} color="#f59e0b" suffix=" %" />
            <HBar label="Market Engine" value={(best?.votes.market ?? 0) * 100} color="#34d399" suffix=" %" />
          </div>
        </div>
      </section>

      {/* Forme & matchup */}
      <section className="grid gap-4 lg:grid-cols-2">
        <div className="glass p-5">
          <h3 className="font-display mb-4 text-sm font-bold tracking-widest text-slate-300">⚡ FORME RÉCENTE (5 derniers)</h3>
          <div className="grid grid-cols-2 gap-4">
            {[{ side: e.home, ctx: e.contextHome }, { side: e.away, ctx: e.contextAway }].map(({ side, ctx }) => (
              <div key={side.name}>
                <div className="mb-2 truncate text-xs font-bold">{side.name}</div>
                <div className="flex gap-1.5">
                  {ctx.formLast5.length ? ctx.formLast5.map((m, i) => (
                    <span key={i} className="grid h-7 w-7 place-items-center rounded-lg text-[11px] font-bold text-white"
                      style={{ background: m.label === "W" ? "#10b981" : m.label === "D" ? "#64748b" : "#f43f5e" }}>
                      {m.label}
                    </span>
                  )) : <span className="text-[11px] text-slate-500">Données indisponibles</span>}
                </div>
                <div className="mt-3 space-y-2">
                  <HBar label="Attaque" value={side.attack} color="#3d7bff" />
                  <HBar label="Défense" value={side.defense} color="#34d399" />
                  <HBar label="Rythme" value={side.pace} color="#a78bfa" />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="glass p-5">
          <h3 className="font-display mb-4 text-sm font-bold tracking-widest text-slate-300">🧠 CONTEXTE & ABSENCES</h3>
          <div className="space-y-3 text-[13px]">
            {[{ side: e.home, ctx: e.contextHome, tag: "Domicile" }, { side: e.away, ctx: e.contextAway, tag: "Extérieur" }].map(({ side, ctx, tag }) => (
              <div key={side.name} className="rounded-xl p-3" style={{ background: "rgba(148,163,255,.05)", border: "1px solid var(--border)" }}>
                <div className="flex items-center justify-between">
                  <span className="font-bold">{side.name}</span>
                  <span className="text-[10px] text-slate-500">{tag} · repos {ctx.restDays} j · {ctx.travelKm} km</span>
                </div>
                {ctx.absences.length ? (
                  <ul className="mt-1.5 space-y-1">
                    {ctx.absences.map(a => (
                      <li key={a.name} className="text-xs text-rose-300">✕ {a.name} — {a.role} <span className="text-slate-500">(impact {(a.impact * 100).toFixed(0)} %)</span></li>
                    ))}
                  </ul>
                ) : <p className="mt-1.5 text-xs text-slate-500">Aucune absence majeure signalée.</p>}
              </div>
            ))}
            <div className="flex flex-wrap gap-2 text-[11px] font-semibold text-slate-400">
              <span className="chip pointer-events-none">Enjeu {e.stakes}/10</span>
              {e.isDerby && <span className="chip pointer-events-none">🔥 Derby</span>}
              <span className="chip pointer-events-none">H2H : {e.h2h.homeWins}V · {e.h2h.draws}N · {e.h2h.awayWins}D</span>
              <span className="chip pointer-events-none">xG/m : {e.contextHome.xgPerGame.toFixed(1)} vs {e.contextAway.xgPerGame.toFixed(1)}</span>
            </div>
          </div>
        </div>
      </section>

      {/* Tous les marchés du match */}
      <section className="glass p-5">
        <h3 className="font-display mb-4 text-sm font-bold tracking-widest text-slate-300">🧮 TOUS LES MARCHÉS — PROBABILITÉ MODÈLE vs COTE</h3>
        <BarChart
          data={analysis.map(a => ({
            label: `${a.market.selection} @${a.market.odds.toFixed(2)}`,
            value: a.ev * 100,
            color: a.isBest ? "#fbbf24" : undefined
          }))}
          format={v => `${v >= 0 ? "+" : ""}${v.toFixed(1)} %`}
          height={analysis.length * 38}
        />
        <p className="mt-3 text-[11px] text-slate-500">
          Barre = EV (%) — Probabilité implicite = 1/cote. Seules les barres positives ET au-dessus des seuils de
          confiance/qualité deviennent des prédictions. Le reste est <b>exclu</b>, jamais repêché.
        </p>
      </section>

      {/* Transparence */}
      {p && (
        <section className="glass p-5 text-center text-[11px] text-slate-500">
          Prediction generated {fmtTime(p.generatedAt)} · Last data update {fmtTime(p.dataUpdatedAt)} · Sources {p.sourcesCount} ·
          Model consensus {p.consensusCount} · Data quality {Math.round(p.dataQuality)} % · Biais auto-learning sport : {(data.learning.biasBySport * 100).toFixed(1)} pts
        </section>
      )}
    </div>
  );
}

function KV({ k, v, c }: { k: string; v: string; c: string }) {
  return (
    <div className="rounded-xl p-3 text-center" style={{ background: "rgba(148,163,255,.05)", border: "1px solid var(--border)" }}>
      <div className="text-[9px] font-bold tracking-[0.16em] text-slate-500">{k}</div>
      <div className="tabular font-display mt-0.5 text-lg font-bold" style={{ color: c }}>{v}</div>
    </div>
  );
}
