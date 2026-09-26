"use client";

// ============================================================
// 🧪 BACKTEST ENGINE — accuracy, ROI, drawdown, Brier,
// calibration, performance par sport & par marché.
// Le taux de réussite n'est JAMAIS la seule métrique.
// ============================================================

import { useApi } from "@/lib/client";
import type { BacktestReport, BacktestRecord } from "@/lib/types";
import { LineChart, BarChart, CalibrationChart } from "@/components/charts";
import { DemoBanner } from "@/components/ui";
import { fmtPct } from "@/lib/utils";

export default function BacktestPage() {
  const { data, loading } = useApi<{ report: BacktestReport; recentRecords: BacktestRecord[] }>("/api/backtest", 0);

  if (loading && !data) {
    return (
      <div className="space-y-4">
        <div className="skeleton h-32" />
        <div className="grid gap-4 lg:grid-cols-2"><div className="skeleton h-72" /><div className="skeleton h-72" /></div>
      </div>
    );
  }
  if (!data) return null;
  const r = data.report;

  return (
    <div className="space-y-6">
      <header className="fade-up">
        <div className="text-[10px] font-bold tracking-[0.3em] text-slate-500">TEST SUR DONNÉES HISTORIQUES RÉSOLUES · FENÊTRE 90 JOURS</div>
        <h1 className="font-display mt-1.5 text-3xl font-bold sm:text-4xl">🧪 BACKTEST <span className="text-gradient">ENGINE</span></h1>
      </header>

      <DemoBanner />

      {/* KPIs */}
      <section className="stagger grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <Kpi label="PREDICTIONS TESTED" value={r.total.toLocaleString("fr-FR")} color="#8fb4ff" />
        <Kpi label="ACCURACY" value={fmtPct(r.accuracy, 1)} color="#22d3ee" />
        <Kpi label="ROI" value={`${r.roi >= 0 ? "+" : ""}${fmtPct(r.roi, 1)}`} color={r.roi >= 0 ? "#34d399" : "#f43f5e"} />
        <Kpi label="AVERAGE EV" value={`+${fmtPct(r.avgEv, 1)}`} color="#a78bfa" />
        <Kpi label="MAX DRAWDOWN" value={fmtPct(r.maxDrawdown, 1)} color="#f59e0b" />
        <Kpi label="BRIER SCORE" value={r.brier.toFixed(3)} color="#fbbf24" />
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <div className="glass p-5">
          <h3 className="font-display mb-3 text-sm font-bold tracking-widest text-slate-300">📈 COURBE DE BANKROLL (mise fixe 1 unité)</h3>
          <LineChart data={r.bankrollCurve} color="#34d399" height={200} label={`Départ 100 → arrivée ${r.bankrollCurve[r.bankrollCurve.length - 1]}`} />
        </div>
        <div className="glass p-5">
          <h3 className="font-display mb-3 text-sm font-bold tracking-widest text-slate-300">🎯 CALIBRATION — prédit vs réalisé</h3>
          <CalibrationChart bins={r.calibration} />
          <p className="mt-3 text-[11px] leading-relaxed text-slate-500">
            Une calibration saine signifie : quand le modèle annonce 60 %, le scénario se réalise ~60 % du temps.
            L&apos;auto-learning corrige en continu les écarts (Brier actuel : <b>{r.brier.toFixed(3)}</b>, plus bas = meilleur).
          </p>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <div className="glass p-5">
          <h3 className="font-display mb-3 text-sm font-bold tracking-widest text-slate-300">🏅 PERFORMANCE PAR SPORT (ROI %)</h3>
          <BarChart data={r.bySport.map(s => ({ label: s.sport, value: s.roi * 100 }))}
            format={v => `${v >= 0 ? "+" : ""}${v.toFixed(1)} %`} height={r.bySport.length * 40} />
        </div>
        <div className="glass p-5">
          <h3 className="font-display mb-3 text-sm font-bold tracking-widest text-slate-300">🧮 PERFORMANCE PAR MARCHÉ (ROI %)</h3>
          <BarChart data={r.byMarket.map(m => ({ label: m.market, value: m.roi * 100 }))} color="#22d3ee"
            format={v => `${v >= 0 ? "+" : ""}${v.toFixed(1)} %`} height={r.byMarket.length * 40} />
        </div>
      </section>

      {/* Auto-learning */}
      <section className="glass p-5">
        <h3 className="font-display mb-3 text-sm font-bold tracking-widest text-slate-300">🧠 AUTO-LEARNING — DERNIERS RÉSULTATS ANALYSÉS</h3>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-xs">
            <thead>
              <tr className="text-[10px] font-bold tracking-widest text-slate-500">
                <th className="pb-2">DATE</th><th className="pb-2">SPORT</th><th className="pb-2">MATCH</th>
                <th className="pb-2">MARCHÉ</th><th className="pb-2">PROBA</th><th className="pb-2">COTE</th>
                <th className="pb-2">EV</th><th className="pb-2 text-right">RÉSULTAT</th>
              </tr>
            </thead>
            <tbody>
              {data.recentRecords.slice(0, 14).map(rec => (
                <tr key={rec.id} className="border-t" style={{ borderColor: "var(--border)" }}>
                  <td className="py-2 text-slate-500">{new Date(rec.date).toLocaleDateString("fr-FR")}</td>
                  <td className="py-2 capitalize">{rec.sport}</td>
                  <td className="py-2">{rec.matchLabel}</td>
                  <td className="py-2 text-slate-400">{rec.market}</td>
                  <td className="tabular py-2 text-cyan-300">{(rec.modelProb * 100).toFixed(0)} %</td>
                  <td className="tabular py-2">{rec.odds.toFixed(2)}</td>
                  <td className={`tabular py-2 ${rec.ev >= 0 ? "text-emerald-400" : "text-rose-400"}`}>{(rec.ev * 100).toFixed(1)} %</td>
                  <td className={`py-2 text-right font-bold ${rec.won ? "text-emerald-400" : "text-rose-400"}`}>{rec.won ? "✓ WIN" : "✕ LOSS"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function Kpi({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="glass card-hover p-4 text-center">
      <div className="font-display tabular text-xl font-bold sm:text-2xl" style={{ color }}>{value}</div>
      <div className="mt-1 text-[9px] font-bold tracking-[0.16em] text-slate-500">{label}</div>
    </div>
  );
}
