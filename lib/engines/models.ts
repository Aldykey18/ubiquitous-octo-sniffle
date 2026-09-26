// ============================================================
// MULTI-MODEL AI — 5 moteurs de probabilité indépendants.
// Chaque modèle produit P(sélection) ∈ [0,1] pour un marché.
// Le Consensus Engine les combine ensuite (moyenne pondérée),
// ce qui évite les prédictions issues d'un seul signal.
// ============================================================

import { SportEvent, Market } from "../types";
import { clamp } from "../utils";
import { poissonCdf, normalCdf, poisson } from "../demo/generator";

const formScore = (form: { label: string; xg: number; xga: number }[]) => {
  if (!form.length) return 0;
  const pts = form.reduce((s, m) => s + (m.label === "W" ? 1 : m.label === "D" ? 0.4 : 0), 0) / form.length;
  const xgDiff = form.reduce((s, m) => s + (m.xg - m.xga), 0) / form.length;
  return (pts - 0.45) * 2 + clamp(xgDiff, -1.5, 1.5) * 0.35;
};

const absenceHit = (abs: { impact: number }[]) => abs.reduce((s, a) => s + a.impact, 0);

// ------------------------------------------------------------
// MODEL 1 — STATISTICAL ENGINE
// Ratings attaque/défense/rythme + expected goals/probabilités
// dérivées (Poisson / normal selon le sport). Ne connaît ni la
// forme récente ni les cotes.
// ------------------------------------------------------------
export function statisticalModel(e: SportEvent, m: Market): number {
  const homeAdv = e.sport === "tennis" || e.sport === "mma" ? 0.8 : 3.2;
  const atk = (e.home.attack + e.away.attack) / 2;
  const def = (e.home.defense + e.away.defense) / 2;
  const delta = e.home.rating - e.away.rating + homeAdv;

  const winProbHome = clamp(1 / (1 + Math.exp(-delta / 5.4)), 0.05, 0.95);

  const totalsLambda = (() => {
    switch (e.sport) {
      case "football": return clamp(2.5 + (atk - def) / 26, 1.5, 4.0);
      case "basketball": return clamp(213 + (atk - def) * 1.05, 197, 231);
      case "tennis": return clamp(22.2 + (atk - def) * 0.05, 19.5, 25.5);
      case "baseball": return clamp(8.6 + (atk - def) / 17, 6.8, 10.7);
      case "hockey": return clamp(5.9 + (atk - def) / 21, 4.7, 7.3);
      case "volleyball": return clamp(181 + (atk - def) * 0.85, 173, 189);
      default: return 0;
    }
  })();

  const isHome = m.selection === e.home.name || m.selection.startsWith(e.home.name);
  const isAway = m.selection === e.away.name || m.selection.startsWith(e.away.name);

  switch (m.type) {
    case "1X2":
      if (m.selection === "Match Nul") {
        return clamp(0.28 - Math.abs(delta) * 0.004 + (totalsLambda < 2.35 ? 0.04 : 0), 0.1, 0.38);
      }
      if (isHome) return winProbHome * 0.72;
      return (1 - winProbHome) * 0.72;
    case "DNB":
      return isHome ? winProbHome : 1 - winProbHome;
    case "MONEYLINE":
      return isHome ? winProbHome : 1 - winProbHome;
    case "OU":
    case "GAMES_OU":
    case "SETS_OU": {
      const line = m.line ?? 2.5;
      const isOver = m.selection.startsWith("Over");
      let pOver: number;
      if (e.sport === "football" || e.sport === "hockey" || e.sport === "baseball") {
        pOver = 1 - poissonCdf(Math.floor(line), totalsLambda);
      } else {
        const sd = e.sport === "basketball" ? 9.5 : e.sport === "volleyball" ? 7 : 2.6;
        pOver = 1 - normalCdf((line - totalsLambda) / sd);
      }
      return clamp(isOver ? pOver : 1 - pOver, 0.05, 0.95);
    }
    case "BTTS": {
      const half = totalsLambda / 2;
      const p = (1 - poisson(0, half)) * (1 - poisson(0, half * 0.92));
      return clamp(m.selection === "Oui" ? p : 1 - p, 0.05, 0.95);
    }
    case "HANDICAP":
    case "RUN_LINE":
    case "PUCK_LINE":
    case "AH": {
      const line = m.line ?? -1.5;
      const favCover = clamp(winProbHome * 0.55 - 0.02 + (Math.abs(delta) > 8 ? 0.05 : 0), 0.05, 0.75);
      if (line < 0) return isHome ? favCover : clamp(winProbHome * 0.42, 0.05, 0.9);
      return isAway ? 1 - favCover : clamp(1 - winProbHome * 0.5, 0.2, 0.95);
    }
    default:
      return isHome ? winProbHome : 1 - winProbHome;
  }
}

// ------------------------------------------------------------
// MODEL 2 — FORM ENGINE
// Dynamique récente : 5 et 10 derniers matchs, xG/xGA.
// ------------------------------------------------------------
export function formModel(e: SportEvent, m: Market): number {
  const fH = formScore(e.contextHome.formLast10);
  const fA = formScore(e.contextAway.formLast10);
  const f5H = formScore(e.contextHome.formLast5);
  const f5A = formScore(e.contextAway.formLast5);
  // La forme très récente pèse 60%
  const dynH = fH * 0.4 + f5H * 0.6;
  const dynA = fA * 0.4 + f5A * 0.6;
  const base = statisticalModel(e, m);
  const isHomeSide = m.selection === e.home.name || m.selection.startsWith(e.home.name);
  const isAwaySide = m.selection === e.away.name || m.selection.startsWith(e.away.name);
  const isOver = m.selection.startsWith("Over") || m.selection === "Oui";

  if (m.type === "OU" || m.type === "GAMES_OU" || m.type === "SETS_OU" || m.type === "BTTS") {
    const xgTrend =
      (e.contextHome.xgPerGame + e.contextAway.xgPerGame) -
      (e.contextHome.xgaPerGame + e.contextAway.xgaPerGame);
    const push = clamp(xgTrend * 0.045, -0.08, 0.08);
    return clamp(base + (isOver ? push : -push), 0.04, 0.96);
  }
  if (m.selection === "Match Nul") return base;

  const push = clamp((isHomeSide ? dynH - dynA : dynA - dynH) * 0.055, -0.09, 0.09);
  return clamp(base + push, 0.03, 0.97);
}

// ------------------------------------------------------------
// MODEL 3 — CONTEXT ENGINE
// Blessures/absences, repos, déplacement, enjeu, avantage terrain.
// ------------------------------------------------------------
export function contextModel(e: SportEvent, m: Market): number {
  const base = statisticalModel(e, m);
  const absH = absenceHit(e.contextHome.absences);
  const absA = absenceHit(e.contextAway.absences);
  const restH = clamp((e.contextHome.restDays - 3.5) * 0.012, -0.04, 0.04);
  const restA = clamp((e.contextAway.restDays - 3.5) * 0.012, -0.04, 0.04);
  const travelA = clamp((e.contextAway.travelKm - 300) * 0.00003, 0, 0.02);
  const stakesPush = e.stakes >= 8 ? 0.012 : 0; // l'enjeu resserre les écarts

  const isHomeSide = m.selection === e.home.name || m.selection.startsWith(e.home.name);
  const isAwaySide = m.selection === e.away.name || m.selection.startsWith(e.away.name);
  if (m.selection === "Match Nul") {
    return clamp(base + (e.stakes >= 8 ? 0.02 : 0) + (Math.abs(absH - absA) < 0.3 && e.isDerby ? 0.015 : 0), 0.05, 0.5);
  }
  if (m.type === "OU" || m.type === "GAMES_OU" || m.type === "BTTS") {
    // Absences offensives majeures → léger under
    const offLoss = clamp((absH + absA) * 0.02, 0, 0.05);
    const isOver = m.selection.startsWith("Over") || m.selection === "Oui";
    return clamp(base + (isOver ? -offLoss : offLoss), 0.04, 0.96);
  }

  const adj = isHomeSide
    ? -absH * 0.045 + restH + stakesPush
    : isAwaySide
      ? -absA * 0.045 + restA - travelA
      : 0;
  return clamp(base + adj, 0.03, 0.97);
}

// ------------------------------------------------------------
// MODEL 4 — MATCHUP ENGINE
// Compatibilité tactique : attaque vs défense adverse, rythme,
// historique des confrontations.
// ------------------------------------------------------------
export function matchupModel(e: SportEvent, m: Market): number {
  const base = statisticalModel(e, m);
  // Capacité de chaque équipe à exploiter la défense adverse
  const edgeH = (e.home.attack - e.away.defense) + (e.home.pace - e.away.pace) * 0.25;
  const edgeA = (e.away.attack - e.home.defense) + (e.away.pace - e.home.pace) * 0.25;
  const h2hTotal = e.h2h.homeWins + e.h2h.awayWins + e.h2h.draws;
  const h2hEdge = h2hTotal > 0 ? ((e.h2h.homeWins - e.h2h.awayWins) / h2hTotal) * 2.2 : 0;

  if (m.type === "OU" || m.type === "GAMES_OU" || m.type === "BTTS") {
    // Deux attaques fortes contre deux défenses faibles → over
    const openness = ((e.home.attack + e.away.attack) - (e.home.defense + e.away.defense)) / 10;
    const pacePush = ((e.home.pace + e.away.pace) / 2 - 79) * 0.004;
    const isOver = m.selection.startsWith("Over") || m.selection === "Oui";
    return clamp(base + (isOver ? 1 : -1) * clamp(openness * 0.02 + pacePush, -0.06, 0.06), 0.04, 0.96);
  }

  const isHomeSide = m.selection === e.home.name || m.selection.startsWith(e.home.name);
  const isAwaySide = m.selection === e.away.name || m.selection.startsWith(e.away.name);
  const push = clamp(((isHomeSide ? edgeH - edgeA : isAwaySide ? edgeA - edgeH : 0) + (isHomeSide ? h2hEdge : -h2hEdge)) * 0.008, -0.08, 0.08);
  if (m.selection === "Match Nul") return base;
  return clamp(base + push, 0.03, 0.97);
}

// ------------------------------------------------------------
// MODEL 5 — MARKET ENGINE
// Lecture du marché : probabilité implicite démargée + sens du
// mouvement de cote (steam / drift).
// ------------------------------------------------------------
export function marketModel(e: SportEvent, m: Market): number {
  // Probabilité implicite démargée (normalisation simplifiée)
  const impliedDemargined = clamp(m.impliedProb * 0.955, 0.03, 0.97);
  const hist = m.oddsHistory;
  let trend = 0;
  if (hist.length >= 6) {
    const recent = hist.slice(-4).reduce((a, b) => a + b, 0) / 4;
    const older = hist.slice(0, -8 < 0 ? 0 : hist.length - 8).reduce((a, b) => a + b, 0) / Math.max(1, hist.length - 8);
    const driftPct = (recent - older) / older;
    // Une cote qui baisse = argent sur la sélection → léger soutien
    trend = clamp(-driftPct * 0.9, -0.05, 0.05);
  }
  return clamp(impliedDemargined + trend, 0.03, 0.97);
}

export const ALL_MODELS = {
  statistical: statisticalModel,
  form: formModel,
  context: contextModel,
  matchup: matchupModel,
  market: marketModel
};
