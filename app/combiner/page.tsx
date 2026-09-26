"use client";

// ============================================================
// 🧩 GÉNÉRATEUR DE COMBINÉS INTELLIGENT + GESTION DE BANKROLL
// Ne JAMAIS ajouter une sélection faible pour gonfler la cote.
// ============================================================

import { useCallback, useEffect, useState } from "react";
import { useBankroll } from "@/lib/client";
import type { CombinerResult, RiskLevel } from "@/lib/types";
import { SportTag, RiskPill, DemoBanner } from "@/components/ui";
import { fmtOdds, fmtPct, fmtMoney } from "@/lib/utils";

const STRATEGIES = [
  { id: "conservative", icon: "🛡️", name: "Conservative", desc: "Confiance ≥ 85 · cotes ≤ 1.85 · risque LOW" },
  { id: "balanced", icon: "⚖️", name: "Balanced", desc: "Confiance ≥ 80 · cotes ≤ 2.30 · risque ≤ MEDIUM" },
  { id: "highValue", icon: "💎", name: "High Value", desc: "EV ≥ +8 % · confiance ≥ 76 · cotes ≤ 3.20" }
];

export default function CombinerPage() {
  const [strategy, setStrategy] = useState<"conservative" | "balanced" | "highValue">("balanced");
  const { bankroll, save } = useBankroll(100000);
  const [input, setInput] = useState(String(bankroll));
  const [result, setResult] = useState<(CombinerResult & { correlationRisk: RiskLevel }) | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    setLoading(true);
    fetch("/api/combiner", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ strategy, bankroll })
    })
      .then(r => r.json())
      .then(j => { setResult(j); setLoading(false); })
      .catch(() => setLoading(false));
  }, [strategy, bankroll]);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="space-y-6">
      <header className="fade-up">
        <div className="text-[10px] font-bold tracking-[0.3em] text-slate-500">JAMAIS DE SÉLECTION FAIBLE POUR GONFLER LA COTE</div>
        <h1 className="font-display mt-1.5 text-3xl font-bold sm:text-4xl">🧩 COMBINÉS <span className="text-gradient">INTELLIGENTS</span></h1>
      </header>

      <DemoBanner />

      <div className="grid gap-3 sm:grid-cols-3">
        {STRATEGIES.map(s => (
          <button key={s.id} onClick={() => setStrategy(s.id as any)}
            className={`glass card-hover p-4 text-left transition-all ${strategy === s.id ? "gradient-border" : ""}`}>
            <div className="text-xl">{s.icon}</div>
            <div className="font-display mt-1.5 font-bold">{s.name}</div>
            <div className="mt-1 text-[11px] leading-relaxed text-slate-500">{s.desc}</div>
          </button>
        ))}
      </div>

      {/* Bankroll */}
      <div className="glass flex flex-wrap items-center gap-4 p-4">
        <span className="text-xs font-bold tracking-widest text-slate-400">💰 BANKROLL</span>
        <div className="flex items-center gap-2">
          <input
            value={input}
            onChange={e => setInput(e.target.value.replace(/[^\d]/g, ""))}
            onBlur={() => save(Math.max(1000, Number(input) || 100000))}
            className="tabular w-36 rounded-xl border px-3 py-2 text-sm font-bold outline-none focus:border-cyan-400"
            style={{ borderColor: "var(--border-strong)", background: "rgba(148,163,255,.06)" }}
          />
          <span className="text-xs font-bold text-slate-500">FCFA</span>
        </div>
        <span className="text-[11px] text-slate-500">
          Gestion : Kelly fractionné (1/4 Kelly), plafond 1.5 % de la bankroll par combiné. Jamais de martingale.
        </span>
      </div>

      {loading && <div className="skeleton h-72" />}

      {!loading && result && (
        <div className="grid gap-4 lg:grid-cols-[1.2fr_1fr]">
          {/* Sélections */}
          <div className="glass-strong p-5">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-display text-sm font-bold tracking-widest text-slate-300">
                BEST AVAILABLE SELECTIONS ({result.selections.length})
              </h3>
              <RiskPill risk={result.correlationRisk} label="CORR." />
            </div>
            {result.selections.length === 0 && (
              <div className="rounded-xl p-6 text-center text-sm text-slate-400" style={{ background: "rgba(244,63,94,.06)", border: "1px solid rgba(244,63,94,.2)" }}>
                🛑 <b>NO ADDITIONAL VALUE FOUND</b><br />
                Aucune sélection ne respecte les seuils de cette stratégie aujourd&apos;hui.
                Le moteur préfère un combiné vide à un combiné artificiel.
              </div>
            )}
            <div className="space-y-3">
              {result.selections.map((p, i) => (
                <div key={p.id} className="rounded-xl p-3.5" style={{ background: "rgba(148,163,255,.05)", border: "1px solid var(--border)" }}>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <SportTag sport={p.event.sport} />
                    <span className="tabular rounded-lg px-2 py-0.5 text-xs font-bold text-violet-300" style={{ background: "rgba(167,139,250,.1)" }}>
                      @ {fmtOdds(p.market.odds)}
                    </span>
                  </div>
                  <div className="mt-2 text-sm font-bold">{i + 1}. {p.event.home.name} vs {p.event.away.name}</div>
                  <div className="text-[13px] text-cyan-300">{p.market.label} — {p.market.selection}</div>
                  <div className="mt-1.5 flex flex-wrap gap-3 text-[11px] text-slate-500">
                    <span>Proba <b className="text-cyan-300">{fmtPct(p.modelProb, 0)}</b></span>
                    <span>EV <b className="text-emerald-400">+{(p.ev * 100).toFixed(1)} %</b></span>
                    <span>Confiance <b className="text-amber-300">{p.confidence}/100</b></span>
                    <span>Risk <b>{p.risk}</b></span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Résumé */}
          <div className="space-y-4">
            <div className="glass-strong gradient-border p-5 text-center">
              <div className="text-[10px] font-bold tracking-[0.25em] text-slate-500">COMBINED ODDS</div>
              <div className="font-display tabular mt-1 text-4xl font-bold text-gradient">
                {result.combinedOdds > 0 ? fmtOdds(result.combinedOdds) : "—"}
              </div>
              <div className="mt-2 flex items-center justify-center gap-3 text-xs">
                <span className="text-slate-400">Proba combinée <b className="text-cyan-300">{fmtPct(result.combinedProb, 1)}</b></span>
                {result.selections.every(s => s.fairOdds) ? (
                  <span className="text-slate-400">EV <b className="text-slate-500">n/a (cotes fair)</b></span>
                ) : (
                  <span className="text-slate-400">EV <b className={result.combinedEv >= 0 ? "text-emerald-400" : "text-rose-400"}>{(result.combinedEv * 100).toFixed(1)} %</b></span>
                )}
              </div>
              {result.stakeSuggestion && result.stakeSuggestion.amount > 0 && (
                <div className="mt-4 rounded-xl p-3" style={{ background: "rgba(52,211,153,.07)", border: "1px solid rgba(52,211,153,.25)" }}>
                  <div className="text-[10px] font-bold tracking-widest text-slate-500">MISE RECOMMANDÉE ({result.stakeSuggestion.fraction} %)</div>
                  <div className="font-display tabular text-xl font-bold text-emerald-400">{fmtMoney(result.stakeSuggestion.amount)}</div>
                </div>
              )}
              <div className={`mt-4 rounded-lg px-3 py-2 text-[11px] font-bold tracking-wider ${
                result.status === "COMPLETE" ? "text-emerald-400" : "text-amber-400"
              }`} style={{ background: result.status === "COMPLETE" ? "rgba(52,211,153,.08)" : "rgba(245,158,11,.08)" }}>
                {result.status === "COMPLETE" ? "✓ COMBINÉ OPTIMAL COMPLET" : "⚠ NO ADDITIONAL VALUE FOUND"}
              </div>
            </div>
            <div className="glass p-4 text-[12px] leading-relaxed text-slate-400">
              {result.note}
            </div>
            <div className="glass p-4 text-[11px] leading-relaxed text-slate-500">
              ⚖️ Règle du moteur : un combiné à <b className="text-slate-300">{result.combinedOdds > 0 ? fmtOdds(result.combinedOdds) : "0.00"}</b>{" "}
              construit avec de vraies sélections vaut toujours mieux qu&apos;une cote plus élevée obtenue
              artificiellement avec des picks faibles.
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
