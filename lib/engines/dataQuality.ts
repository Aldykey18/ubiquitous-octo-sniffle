// ============================================================
// MODEL 10 — DATA QUALITY SCORE
// Évalue la fiabilité des données disponibles AVANT de laisser
// une prédiction passer les filtres. Une EV élevée avec des
// données pauvres est pénalisée / exclue.
// ============================================================

import { SportEvent } from "../types";
import { clamp, round } from "../utils";

export interface DataQualityResult {
  score: number; // 0-100
  breakdown: {
    sources: number;
    freshness: number;
    consistency: number;
    lineups: number;
    injuries: number;
    sourceReliability: number;
  };
  hasForm: boolean;
}

export function dataQualityScore(e: SportEvent, lastSyncIso: string, syncAgeSec: number): DataQualityResult {
  const hasForm = e.contextHome.formLast10.length > 0;
  const hasAdvanced = e.advancedAvailable;

  const sources = e.dataSource === "demo" ? 62 : 88; // démo = source unique identifiée
  const freshness = clamp(100 - syncAgeSec / 6, 40, 100);
  const hasRealRatings = e.dataSource === "espn" && (e.home.rating ?? 0) > 0;
  const consistency = hasRealRatings ? 82 : hasForm && hasAdvanced ? 90 : hasForm ? 74 : 38;
  const lineups = e.lineupsAvailable ? 92 : 45;
  const injuries = e.contextHome.absences.length || e.contextAway.absences.length ? 88 : hasForm ? 62 : 30;
  const sourceReliability = e.dataSource === "demo" ? 55 : 90;

  const score = clamp(
    sources * 0.18 + freshness * 0.18 + consistency * 0.22 + lineups * 0.14 + injuries * 0.13 + sourceReliability * 0.15,
    0, 100
  );

  return {
    score: round(score, 1),
    breakdown: {
      sources: round(sources), freshness: round(freshness), consistency: round(consistency),
      lineups: round(lineups), injuries: round(injuries), sourceReliability: round(sourceReliability)
    },
    hasForm
  };
}

/** Seuil minimal de qualité des données pour qu'un marché soit éligible. */
export const DATA_QUALITY_MIN = 58;
