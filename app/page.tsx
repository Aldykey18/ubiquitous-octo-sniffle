"use client";

// ============================================================
// PAGE D'ACCUEIL — Hero 3D + top 3 du jour + philosophie moteur
// ============================================================

import Link from "next/link";
import { Hero3D } from "@/components/Hero3D";
import { PredictionCard } from "@/components/PredictionCard";
import { NoBetPanel, SectionTitle, DataBanner } from "@/components/ui";
import { useCollectPhase } from "@/components/LiveCollector";
import { useApi } from "@/lib/client";
import type { StatusPayload, Prediction } from "@/lib/types";

export default function HomePage() {
  const { data: status } = useApi<StatusPayload>("/api/status", 10000);
  const { data: preds, loading } = useApi<{ predictions: Prediction[]; noBet: boolean; noBetReason: string | null }>("/api/predictions", 30000);
  const collect = useCollectPhase();
  const top = (preds?.predictions ?? []).slice(0, 3);

  return (
    <div className="space-y-14">
      <Hero3D />

      <div className="mx-auto max-w-4xl">
        <DataBanner status={status} collectMsg={collect.phase === "collecting" ? collect.message : undefined} />
      </div>

      {/* Bandeau de stats */}
      <section className="stagger mx-auto grid max-w-4xl grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard icon="📅" label="ÉVÉNEMENTS AUJOURD'HUI" value={status ? String(status.eventsToday) : "—"} />
        <StatCard icon="🟢" label="EN LIVE" value={status ? String(status.liveNow) : "—"} />
        <StatCard icon="🎯" label="PRÉDICTIONS RETENUES" value={preds ? String(preds.predictions.length) : "—"} hint={preds?.noBet ? "NO BET" : undefined} />
        <StatCard icon="🤖" label="MOTEURS IA" value="7" hint="+ consensus" />
      </section>

      {/* Top 3 */}
      <section className="mx-auto max-w-5xl">
        <SectionTitle
          kicker="LE MOTEUR A TRANCHÉ"
          title={<>🔥 LES MEILLEURES PRÉDICTIONS <span className="text-gradient">DU JOUR</span></>}
          right={<Link href="/predictions" className="btn-ghost text-xs">Tout voir →</Link>}
        />
        {loading && (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map(i => <div key={i} className="skeleton h-[360px]" />)}
          </div>
        )}
        {!loading && preds?.noBet && <NoBetPanel reason={preds.noBetReason} compact />}
        {!loading && !preds?.noBet && (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {top.map((p, i) => <PredictionCard key={p.id} p={p} rank={i + 1} compact />)}
          </div>
        )}
      </section>

      {/* Philosophie du moteur */}
      <section className="mx-auto max-w-5xl">
        <SectionTitle kicker="DISCIPLINE ALGORITHMIQUE" title="La hiérarchie suprême du moteur" />
        <div className="glass grid gap-6 p-6 sm:p-8 lg:grid-cols-[1.1fr_1fr]">
          <div className="space-y-2.5">
            {[
              ["1", "QUALITÉ DES DONNÉES", "Data Quality Score ≥ seuil, sinon exclusion", "#3d7bff"],
              ["2", "ANALYSE MULTIDIMENSIONNELLE", "Stats, forme, contexte, matchup, marché", "#22d3ee"],
              ["3", "PROBABILITÉ → VALUE", "EV = proba modèle × cote − 1", "#8b5cf6"],
              ["4", "RISQUE & CORRÉLATION", "Variance, scénarios redondants filtrés", "#f59e0b"],
              ["5", "CLASSEMENT → TOP DU JOUR", "Max 10 prédictions, ou NO BET", "#34d399"]
            ].map(([n, title, sub, c]) => (
              <div key={n} className="flex items-center gap-3.5 rounded-xl p-3 transition-colors"
                style={{ background: `${c}0d`, border: `1px solid ${c}26` }}>
                <span className="font-display grid h-9 w-9 shrink-0 place-items-center rounded-xl text-sm font-bold"
                  style={{ background: `${c}22`, color: c }}>{n}</span>
                <div>
                  <div className="text-[13px] font-bold tracking-wide">{title}</div>
                  <div className="text-[11px] text-slate-500">{sub}</div>
                </div>
              </div>
            ))}
          </div>
          <div className="flex flex-col justify-center gap-4">
            <blockquote className="rounded-2xl p-5 text-sm leading-relaxed text-slate-300"
              style={{ background: "rgba(61,123,255,.07)", border: "1px solid rgba(61,123,255,.2)" }}>
              « Si le moteur ne trouve que 3 excellentes prédictions, il affiche 3 prédictions.
              S&apos;il n&apos;en trouve aucune, il affiche <b>NO BET</b>. Jamais il ne remplit la liste
              avec des pronostics moyens. »
            </blockquote>
            <div className="grid grid-cols-2 gap-2.5 text-[11px] font-bold tracking-wider text-slate-400">
              <Rule>QUALITÉ &gt; QUANTITÉ</Rule>
              <Rule>VALUE &gt; COTE</Rule>
              <Rule>DONNÉES &gt; INTUITION</Rule>
              <Rule>PROBABILITÉ &gt; POPULARITÉ</Rule>
              <Rule>DISCIPLINE &gt; VOLUME</Rule>
              <Rule>NO BET &gt; MAUVAISE PRÉDICTION</Rule>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

function StatCard({ icon, label, value, hint }: { icon: string; label: string; value: string; hint?: string }) {
  return (
    <div className="glass card-hover p-4 text-center">
      <div className="text-xl">{icon}</div>
      <div className="font-display tabular mt-1.5 text-2xl font-bold">{value}</div>
      <div className="mt-0.5 text-[9px] font-bold tracking-[0.16em] text-slate-500">{label}</div>
      {hint && <div className="text-[10px] font-bold text-amber-400">{hint}</div>}
    </div>
  );
}

function Rule({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-lg px-3 py-2" style={{ background: "rgba(148,163,255,.06)", border: "1px solid var(--border)" }}>
      {children}
    </div>
  );
}
