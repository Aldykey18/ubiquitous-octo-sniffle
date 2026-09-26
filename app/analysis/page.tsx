"use client";

// ============================================================
// 📊 ANALYSE — liste de toutes les rencontres du jour, avec
// indication de celles qui ont un BEST BET validé par le moteur.
// ============================================================

import Link from "next/link";
import { useState } from "react";
import { SPORT_META, SportTag, DataBanner } from "@/components/ui";
import { useApi } from "@/lib/client";
import type { SportEvent, StatusPayload } from "@/lib/types";
import { fmtDayTime, timeAgo } from "@/lib/utils";

export default function AnalysisPage() {
  const [sport, setSport] = useState("all");
  const { data, loading } = useApi<{ events: (SportEvent & { hasBestBet: boolean; marketCount: number })[]; lastSync: string }>(
    `/api/matches?sport=${sport}`, 20000
  );
  const { data: status } = useApi<StatusPayload>("/api/status", 15000);

  return (
    <div className="space-y-6">
      <header className="fade-up">
        <div className="text-[10px] font-bold tracking-[0.3em] text-slate-500">TOUTES LES RENCONTRES DU JOUR</div>
        <h1 className="font-display mt-1.5 text-3xl font-bold sm:text-4xl">📊 ANALYSE <span className="text-gradient">DES MATCHS</span></h1>
        {data && <p className="mt-2 text-xs text-slate-500">{data.events.length} rencontres · données MAJ {timeAgo(data.lastSync)}</p>}
      </header>

      <DataBanner status={status} />

      <div className="flex flex-wrap gap-2">
        <button className={`chip ${sport === "all" ? "active" : ""}`} onClick={() => setSport("all")}>ALL</button>
        {Object.entries(SPORT_META).map(([k, m]) => (
          <button key={k} className={`chip ${sport === k ? "active" : ""}`} onClick={() => setSport(k)}>
            {m.icon} {m.label}
          </button>
        ))}
      </div>

      {loading && !data && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => <div key={i} className="skeleton h-36" />)}
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {(data?.events ?? []).map(e => (
          <Link key={e.id} href={`/match/${e.id}`}
            className={`glass card-hover relative p-4 ${e.status === "finished" ? "opacity-55" : ""}`}>
            <div className="flex items-center justify-between gap-2">
              <SportTag sport={e.sport} league={e.league} />
              {e.status === "live" && (
                <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-400">
                  <span className="dot-live" style={{ width: 6, height: 6 }} /> LIVE {e.minute}&apos;
                </span>
              )}
              {e.status === "upcoming" && (
                <span className="rounded-full px-2 py-0.5 text-[10px] font-bold text-cyan-300" style={{ background: "rgba(34,211,238,.08)" }}>
                  🗓 {fmtDayTime(e.startTime)}
                </span>
              )}
              {e.status === "finished" && <span className="text-[10px] font-bold text-slate-500">✔ TERMINÉ</span>}
            </div>
            <div className="mt-3 flex items-center justify-between">
              <div className="min-w-0">
                <TeamRow logo={e.home.logo} name={e.home.name} record={e.home.record} />
                <TeamRow logo={e.away.logo} name={e.away.name} record={e.away.record} />
              </div>
              {e.status !== "upcoming" && (
                <div className="font-display text-xl font-bold text-cyan-300">
                  {e.scoreHome ?? 0}–{e.scoreAway ?? 0}
                </div>
              )}
            </div>
            <div className="mt-3 flex items-center justify-between border-t pt-2.5 text-[10px] font-semibold" style={{ borderColor: "var(--border)" }}>
              <span className="text-slate-500">{e.marketCount} marchés analysés {e.dataSource === "espn" ? "· RÉEL" : ""}</span>
              {e.hasBestBet ? (
                <span className="rounded-full px-2 py-0.5 font-bold text-emerald-400" style={{ background: "rgba(52,211,153,.1)" }}>
                  ✓ PICK VALIDÉ
                </span>
              ) : (
                <span className="text-slate-600">Pas de sélection suffisante</span>
              )}
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

function TeamRow({ logo, name, record }: { logo?: string; name: string; record?: string }) {
  return (
    <div className="flex items-center gap-1.5">
      {logo && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={logo} alt="" width={16} height={16} className="h-4 w-4 shrink-0 object-contain" loading="lazy" />
      )}
      <span className="truncate text-sm font-bold">{name}</span>
      {record && <span className="tabular shrink-0 text-[9px] text-slate-500">({record})</span>}
    </div>
  );
}
