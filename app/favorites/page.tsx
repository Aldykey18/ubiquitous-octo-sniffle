"use client";

// ============================================================
// ⭐ FAVORIS — prédictions épinglées par l'utilisateur
// (stockage local, aucune donnée personnelle envoyée au serveur)
// ============================================================

import { useEffect, useState } from "react";
import { PredictionCard } from "@/components/PredictionCard";
import { useFavorites, useApi } from "@/lib/client";
import type { Prediction } from "@/lib/types";

export default function FavoritesPage() {
  const { favs, toggle } = useFavorites();
  const { data } = useApi<{ predictions: Prediction[] }>("/api/predictions", 30000);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  if (!mounted) return null;

  const list = (data?.predictions ?? []).filter(p => favs.includes(p.id));

  return (
    <div className="space-y-6">
      <header className="fade-up">
        <div className="text-[10px] font-bold tracking-[0.3em] text-slate-500">VOTRE SÉLECTION PERSONNELLE</div>
        <h1 className="font-display mt-1.5 text-3xl font-bold sm:text-4xl">⭐ FAVORIS</h1>
      </header>

      {list.length === 0 ? (
        <div className="glass-strong p-10 text-center">
          <div className="text-4xl">⭐</div>
          <p className="mt-3 text-sm text-slate-400">
            Aucun favori pour l&apos;instant. Touchez l&apos;étoile sur une carte de prédiction pour l&apos;épingler ici.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {list.map((p, i) => <PredictionCard key={p.id} p={p} rank={i + 1} />)}
        </div>
      )}

      {favs.length > 0 && (
        <p className="text-center text-[11px] text-slate-500">
          {favs.length} favori(s) sauvegardé(s) localement sur cet appareil.
        </p>
      )}
    </div>
  );
}
