"use client";

// ============================================================
// LIVE COLLECTOR — tourne dans le NAVIGATEUR de l'utilisateur.
// Le sandbox serveur n'a pas de sortie internet : c'est ici,
// côté client, que les VRAIES données sont récupérées via l'API
// publique ESPN (gratuite, sans clé, CORS ouverte), puis envoyées
// au moteur (/api/ingest) qui fait les calculs réels.
// ============================================================

import { useCallback, useEffect, useRef, useState } from "react";
import { collectAll } from "@/lib/live/espnClient";

const REFRESH_MS = 5 * 60 * 1000; // re-collecte toutes les 5 minutes
const COLLECT_LS = "vbm:lastCollect";

export type CollectPhase = "idle" | "collecting" | "done" | "error";

export function getCollectPhase(): { phase: CollectPhase; message: string; at: string | null } {
  if (typeof window === "undefined") return { phase: "idle", message: "", at: null };
  try {
    const raw = localStorage.getItem(COLLECT_LS);
    if (!raw) return { phase: "idle", message: "", at: null };
    return JSON.parse(raw);
  } catch {
    return { phase: "idle", message: "", at: null };
  }
}

export function LiveCollector() {
  const [phase, setPhase] = useState<CollectPhase>("idle");
  const [message, setMessage] = useState("");
  const busy = useRef(false);

  const runCollect = useCallback(async (silent = false) => {
    if (busy.current) return;
    busy.current = true;
    setPhase("collecting");
    const save = (p: CollectPhase, msg: string) => {
      setPhase(p);
      setMessage(msg);
      try {
        localStorage.setItem(COLLECT_LS, JSON.stringify({ phase: p, message: msg, at: new Date().toISOString() }));
      } catch {}
      window.dispatchEvent(new CustomEvent("vbm:collect", { detail: { phase: p, message: msg } }));
    };

    try {
      // Mode courant ?
      const st = await fetch("/api/status").then(r => r.json());
      if (st?.mode !== "live") {
        busy.current = false;
        return;
      }
      save("collecting", silent ? "Re-collecte…" : "Collecte des matchs réels (ESPN)…");
      const result = await collectAll(msg => save("collecting", msg));
      const resp = await fetch("/api/ingest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(result)
      }).then(r => r.json());

      const okLeagues = result.reports.filter(r => r.ok).length;
      save(
        "done",
        `✓ ${resp?.accepted ?? result.events.length} matchs réels collectés (${okLeagues}/${result.reports.length} sources) · ${resp?.predictions ?? 0} prédictions du moteur`
      );
    } catch (err: any) {
      save("error", `Collecte impossible : ${String(err?.message ?? err)}`);
    } finally {
      busy.current = false;
    }
  }, []);

  useEffect(() => {
    // Première collecte rapide, puis périodique
    const t0 = setTimeout(() => void runCollect(), 800);
    const loop = setInterval(() => void runCollect(true), REFRESH_MS);

    // Déclenché par le bouton « Collecter maintenant » de l'admin
    const onDemand = () => void runCollect();
    window.addEventListener("vbm:collect-now", onDemand);
    return () => {
      clearTimeout(t0);
      clearInterval(loop);
      window.removeEventListener("vbm:collect-now", onDemand);
    };
  }, [runCollect]);

  // Bandeau discret pendant la collecte
  if (phase !== "collecting") return null;
  return (
    <div className="pointer-events-none fixed bottom-20 left-1/2 z-40 -translate-x-1/2 md:bottom-6">
      <div className="glass-strong flex items-center gap-2.5 rounded-full px-4 py-2 text-[11px] font-bold text-cyan-300 shadow-glow-blue">
        <span className="h-2 w-2 animate-pulse rounded-full bg-cyan-400" />
        <span className="animate-ticker">{message || "Collecte des données réelles…"}</span>
      </div>
    </div>
  );
}

/** Petit hook pour les pages qui veulent afficher l'état de collecte. */
export function useCollectPhase() {
  const [state, setState] = useState(getCollectPhase());
  useEffect(() => {
    const on = () => setState(getCollectPhase());
    window.addEventListener("vbm:collect", on);
    const t = setInterval(on, 4000);
    return () => {
      window.removeEventListener("vbm:collect", on);
      clearInterval(t);
    };
  }, []);
  return state;
}
