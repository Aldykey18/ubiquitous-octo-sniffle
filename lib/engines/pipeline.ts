// ============================================================
// PIPELINE PRINCIPAL
// DATA → ANALYSE (5 modèles) → CONSENSUS → VALUE → RISQUE →
// CORRÉLATION → CLASSEMENT → MEILLEURES PRÉDICTIONS (max 10)
//
// RÈGLE ABSOLUE : si rien ne passe les seuils → NO BET.
// On ne remplit JAMAIS la liste avec des prédictions moyennes.
// ============================================================

import {
  SportEvent, Market, Prediction, ModelVotes, ConfidenceBreakdown,
  RiskLevel, LearningState
} from "../types";
import { ALL_MODELS } from "./models";
import { dataQualityScore, DATA_QUALITY_MIN } from "./dataQuality";
import { correlationRiskForSelection } from "./correlation";
import { clamp, round, fmtEv } from "../utils";

// ---------- Seuils du cahier des charges ----------
export const MIN_CONFIDENCE = 75;      // < 75 → EXCLUSION
export const MIN_EV = 0.04;            // EV < +4 % → non retenu
export const MAX_PREDICTIONS = 10;     // maximum affiché
export const VALUE_TIERS = [
  { min: 0.15, label: "EXCEPTIONNELLE" as const },
  { min: 0.08, label: "FORTE" as const },
  { min: 0.04, label: "MODÉRÉE" as const },
  { min: 0.0, label: "FAIBLE" as const }
];

export function valueTier(ev: number): Prediction["valueTier"] | null {
  for (const t of VALUE_TIERS) if (ev >= t.min) return t.label;
  return null;
}

export function confidenceTier(c: number): Prediction["confidenceTier"] | null {
  if (c >= 90) return "PREMIUM";
  if (c >= 85) return "EXCELLENTE";
  if (c >= 80) return "FORTE";
  if (c >= 75) return "BONNE";
  return null;
}

// ---------- Consensus pondéré (poids ajustés par l'auto-learning) ----------
export function consensusProbability(votes: ModelVotes, weights: LearningState["modelWeights"]): number {
  const total = Object.values(weights).reduce((a, b) => a + b, 0) || 1;
  return (
    votes.statistical * (weights.statistical / total) +
    votes.form * (weights.form / total) +
    votes.context * (weights.context / total) +
    votes.matchup * (weights.matchup / total) +
    votes.market * (weights.market / total)
  );
}

function modelAgreement(votes: ModelVotes): number {
  // L'accord se mesure sur les 4 moteurs ANALYTIQUES uniquement.
  // On exclut délibérément le Market Engine : un value bet est par
  // définition un désaccord entre le modèle et le marché. Si le marché
  // comptait dans l'accord, toute vraie value serait rejetée.
  const vals = [votes.statistical, votes.form, votes.context, votes.matchup];
  const mean = vals.reduce((a, b) => a + b, 0) / vals.length;
  const sd = Math.sqrt(vals.reduce((s, v) => s + (v - mean) ** 2, 0) / vals.length);
  // sd typique 0 → 1.0 ; sd 0.12+ → ~0
  return clamp(1 - sd / 0.12, 0, 1);
}

function marketStability(m: Market): number {
  const h = m.oddsHistory;
  if (h.length < 8) return 70;
  const rets: number[] = [];
  for (let i = h.length - 8; i < h.length; i++) rets.push(Math.abs(h[i] - h[i - 1]) / h[i - 1]);
  const vol = rets.reduce((a, b) => a + b, 0) / rets.length;
  return clamp(100 - vol * 900, 20, 100);
}

function riskAssessment(p: {
  odds: number; ev: number; agreement: number; dq: number; stability: number; sport: string; prob: number;
}): { risk: RiskLevel; variance: RiskLevel } {
  let pts = 0;
  if (p.odds >= 2.6) pts += 2; else if (p.odds >= 1.95) pts += 1;
  if (p.agreement < 0.55) pts += 2; else if (p.agreement < 0.75) pts += 1;
  if (p.dq < 70) pts += 1;
  if (p.stability < 55) pts += 1;
  if (["mma", "tennis"].includes(p.sport)) pts += 1; // variance sport
  if (p.prob < 0.45) pts += 1;
  const variance: RiskLevel = p.odds >= 2.8 || p.prob < 0.4 ? "HIGH" : p.odds >= 2.0 ? "MEDIUM" : "LOW";
  const risk: RiskLevel = pts >= 4 ? "HIGH" : pts >= 2 ? "MEDIUM" : "LOW";
  return { risk, variance };
}

function buildLabels(p: Prediction): string[] {
  const labels: string[] = [];
  if (p.fairOdds) {
    labels.push(p.confidence >= 85 ? "🔥 PREMIUM PICK" : "📊 FAIR PICK");
  } else if (p.confidence >= 90) labels.push("🔥 PREMIUM VALUE");
  else if (p.ev >= 0.08) labels.push("🟢 STRONG VALUE");
  else labels.push("🟡 MODERATE VALUE");
  if (p.variance === "HIGH") labels.push("⚠️ HIGH VARIANCE");
  if (p.consensusAgreement >= 0.8) labels.push("🤖 AI CONSENSUS");
  if (p.dataQuality >= 85) labels.push("📊 DATA CONFIRMED");
  return labels;
}

function buildExplanation(
  e: SportEvent, p: Prediction, votes: ModelVotes
): string {
  const favSide = votes.statistical >= 0.5 ? e.home : e.away;
  const pct = (v: number) => `${Math.round(v * 100)} %`;
  const parts: string[] = [];

  if (p.market.type === "OU" || p.market.type === "GAMES_OU" || p.market.type === "BTTS") {
    const over = p.market.selection.startsWith("Over") || p.market.selection === "Oui";
    parts.push(
      over
        ? `Les dynamiques offensives récentes (${e.home.short} ${e.contextHome.xgPerGame.toFixed(1)} xG/m, ${e.away.short} ${e.contextAway.xgPerGame.toFixed(1)} xG/m) et le rythme du matchup poussent le scénario haut.`
        : `Les défenses tiennent mieux que leurs attaques ne créent (${e.home.short} ${e.contextHome.xgaPerGame.toFixed(1)} xGA/m, ${e.away.short} ${e.contextAway.xgaPerGame.toFixed(1)}), ce qui soutient le scénario bas.`
    );
  } else {
    parts.push(
      `${favSide.name} présente un avantage structurel (rating ${Math.round(favSide.rating)} vs ${Math.round(favSide === e.home ? e.away.rating : e.home.rating)})` +
      (e.contextAway.absences.length && favSide === e.home
        ? ` alors que l'adversaire déplore ${e.contextAway.absences.length} absence(s) clé(s).`
        : e.contextHome.absences.length && favSide === e.away
          ? ` alors que ${e.home.short} est affaibli par ${e.contextHome.absences.length} absence(s).`
          : ".")
    );
  }
  if (p.fairOdds) {
    parts.push(
      `Le consensus des 5 moteurs estime ${pct(p.modelProb)} de probabilité — cote fair ${p.market.odds.toFixed(2)} (= 1/probabilité). Aucune cote bookmaker n'est connectée : pas de value calculée, uniquement la prédiction la plus probable.`
    );
  } else {
    parts.push(
      `Le consensus des 5 moteurs estime ${pct(p.modelProb)} contre ${pct(p.market.impliedProb)} implicite dans la cote — soit un avantage de ${fmtEv(p.ev)}.`
    );
  }
  if (p.consensusAgreement < 0.7) parts.push("À noter : les modèles sont modérément alignés sur ce marché.");
  return parts.join(" ");
}

export interface PipelineInput {
  events: SportEvent[];
  markets: Market[];
  lastSyncIso: string;
  learning: LearningState;
  /**
   * true = cotes bookmaker RÉELLES connectées → Value Engine complet (EV).
   * false = aucune cote réelle → mode FAIR : on retient les scénarios les
   * plus probables (confiance + probabilité), sans jamais inventer de value.
   */
  oddsFeed: boolean;
}

export interface PipelineOutput {
  predictions: Prediction[];
  noBet: boolean;
  noBetReason: string | null;
  rejected: { reason: string; count: number }[];
}

export function runPipeline(input: PipelineInput): PipelineOutput {
  const { events, markets, lastSyncIso, learning, oddsFeed } = input;
  const now = new Date();
  const syncAgeSec = Math.max(0, (now.getTime() - new Date(lastSyncIso).getTime()) / 1000);
  const byId = new Map(events.map(e => [e.id, e]));
  const rejected: Record<string, number> = {};
  const bump = (r: string) => (rejected[r] = (rejected[r] || 0) + 1);

  const candidates: Prediction[] = [];

  for (const m of markets) {
    const e = byId.get(m.eventId);
    if (!e || e.status === "finished") continue;

    // 0) GARDE-FOU VARIANCE : jamais de ticket de loterie.
    // Une cote > 4.0 = trop d'incertitude, quel que soit l'EV affiché.
    if (m.odds > 4.0) { bump("Cote > 4.0 (variance excessive)"); continue; }

    // 1) QUALITÉ DES DONNÉES d'abord (hiérarchie suprême)
    const dq = dataQualityScore(e, lastSyncIso, syncAgeSec);
    if (dq.score < DATA_QUALITY_MIN) { bump("Données insuffisantes (Data Quality)"); continue; }

    // 2) ANALYSE : 5 modèles
    const votes: ModelVotes = {
      statistical: ALL_MODELS.statistical(e, m),
      form: dq.hasForm ? ALL_MODELS.form(e, m) : ALL_MODELS.statistical(e, m),
      context: ALL_MODELS.context(e, m),
      matchup: ALL_MODELS.matchup(e, m),
      market: ALL_MODELS.market(e, m)
    };

    // Correction d'auto-learning (biais observés par sport/marché)
    const biasSport = learning.biasBySport[e.sport] ?? 0;
    const biasMarket = learning.biasByMarket[m.type] ?? 0;
    const biasCorrection = -(biasSport * 0.5 + biasMarket * 0.5);

    // 3) PROBABILITÉ : consensus pondéré
    const modelProb = clamp(consensusProbability(votes, learning.modelWeights) + biasCorrection, 0.02, 0.98);
    const agreement = modelAgreement(votes);

    // 4) VALUE : EV = proba modèle × cote − 1
    // Un marché "fair" n'a pas de cote bookmaker réelle → pas d'EV calculée,
    // on retient uniquement les scénarios nettement dominants.
    const fairMarket = m.fair === true;
    const ev = fairMarket ? 0 : modelProb * m.odds - 1;
    let tier: Prediction["valueTier"] | null;
    if (fairMarket) {
      tier = "SANS COTE";
      if (modelProb < 0.52) { bump("Probabilité non dominante (< 52 %)"); continue; }
    } else {
      tier = valueTier(ev);
      if (!tier || ev < MIN_EV) { bump("EV insuffisante (< +4 %)"); continue; }
    }

    // 5) RISQUE
    const stability = marketStability(m);
    const { risk, variance } = riskAssessment({
      odds: m.odds, ev, agreement, dq: dq.score, stability, sport: e.sport, prob: modelProb
    });

    // 6) CONFIDENCE SCORE /100
    const real = e.dataSource === "espn";
    const breakdown: ConfidenceBreakdown = {
      statisticalQuality: real && e.home.rating > 0 ? 80 : round(clamp((e.advancedAvailable ? 62 : 40) + dq.breakdown.consistency * 0.4, 0, 100)),
      form: real && !dq.hasForm
        ? round(clamp(58 + Math.abs(votes.form - 0.5) * 60, 0, 100)) // pas d'historique mais données réelles fiables
        : round(clamp(50 + (dq.hasForm ? 35 : -20) + Math.abs(votes.form - 0.5) * 60, 0, 100)),
      matchup: round(clamp(55 + Math.abs(votes.matchup - 0.5) * 70 + (e.h2h.homeWins + e.h2h.awayWins > 4 ? 8 : 0), 0, 100)),
      context: real ? 60 : round(clamp(55 + (e.lineupsAvailable ? 18 : 0) + (e.contextHome.absences.length + e.contextAway.absences.length ? 10 : 0), 0, 100)),
      value: fairMarket
        ? round(clamp((modelProb - 0.5) * 420 + 30, 25, 100)) // fair : clarté du scénario
        : round(clamp(35 + ev * 450, 20, 100)),
      dataQuality: round(dq.score),
      marketStability: round(stability)
    };
    let confidence =
      breakdown.statisticalQuality * 0.20 + breakdown.form * 0.15 + breakdown.matchup * 0.15 +
      breakdown.context * 0.15 + breakdown.value * 0.15 + breakdown.dataQuality * 0.10 +
      breakdown.marketStability * 0.10;
    if (!fairMarket) {
      // Pénalité longshot : plus la cote bookmaker est haute, plus l'exigence monte.
      if (m.odds > 2.4) confidence -= (m.odds - 2.4) * 7;
      // EV délirante = souvent anomalie de marché ou de données → méfiance.
      if (ev > 0.35) confidence -= 8;
    }
    confidence = round(clamp(confidence, 0, 100), 1);

    const cTier = confidenceTier(confidence);
    if (!cTier || confidence < MIN_CONFIDENCE) { bump(`Confiance < ${MIN_CONFIDENCE}`); continue; }
    if (agreement < 0.35) { bump("Consensus trop divergent"); continue; }

    const prediction: Prediction = {
      id: `pred-${m.id}`,
      market: m,
      event: e,
      modelProb: round(modelProb, 3),
      ev: round(ev, 4),
      fairOdds: fairMarket,
      confidence,
      confidenceBreakdown: breakdown,
      confidenceTier: cTier,
      valueTier: tier,
      risk,
      variance,
      dataQuality: dq.score,
      dataQualityBreakdown: dq.breakdown,
      correlationRisk: "LOW", // recalculé après sélection (voir correlation.ts)
      consensus: votes,
      consensusAgreement: round(agreement, 2),
      labels: [],
      explanation: "",
      generatedAt: now.toISOString(),
      dataUpdatedAt: lastSyncIso,
      sourcesCount: e.dataSource === "demo" ? 1 : 3,
      consensusCount: `${dq.hasForm ? 5 : 4}/5`,
      rankScore: 0
    };
    prediction.labels = buildLabels(prediction);
    prediction.explanation = buildExplanation(e, prediction, votes);
    candidates.push(prediction);
  }

  // 7) CORRÉLATION + diversité : 1 pick par événement, sports variés
  candidates.sort((a, b) => rankScoreOf(b) - rankScoreOf(a));
  const selected: Prediction[] = [];
  const usedEvents = new Set<string>();
  for (const c of candidates) {
    if (selected.length >= MAX_PREDICTIONS) break;
    if (usedEvents.has(c.event.id)) { bump("Corrélation même match"); continue; }
    c.correlationRisk = correlationRiskForSelection(c, selected);
    if (c.correlationRisk === "HIGH") { bump("Corrélation scénario HIGH"); continue; }
    usedEvents.add(c.event.id);
    selected.push(c);
  }

  // 8) CLASSEMENT final
  selected.forEach(p => (p.rankScore = round(rankScoreOf(p), 2)));
  selected.sort((a, b) => b.rankScore - a.rankScore);
  if (selected.length >= 1) selected[0].labels = ["💎 BEST PICK", ...selected[0].labels.filter(l => !l.includes("BEST"))];

  return {
    predictions: selected,
    noBet: selected.length === 0,
    noBetReason: selected.length === 0
      ? "Aucun marché ne présente actuellement un avantage statistique suffisamment robuste (confiance ≥ 75, EV ≥ +4 %, qualité de données suffisante). Le moteur recommande d'attendre de nouvelles données ou un mouvement de marché."
      : null,
    rejected: Object.entries(rejected).map(([reason, count]) => ({ reason, count }))
  };
}

/**
 * Classement : EV + Confiance + Data Quality + Risque + Consensus + Stabilité.
 * Une cote 1.80 avec excellente value passe devant une cote 5.00 incertaine.
 */
function rankScoreOf(p: Prediction): number {
  if (p.fairOdds) {
    // Mode fair : classement par probabilité réelle + confiance + données
    const probScore = clamp((p.modelProb - 0.5) / 0.45, 0, 1) * 30;
    const confScore = (p.confidence / 100) * 26;
    const dqScore = (p.dataQuality / 100) * 14;
    const riskScore = (p.risk === "LOW" ? 1 : p.risk === "MEDIUM" ? 0.55 : 0.22) * 12;
    const consensusScore = p.consensusAgreement * 12;
    const stabilityScore = p.confidenceBreakdown.marketStability / 100 * 6;
    return probScore + confScore + dqScore + riskScore + consensusScore + stabilityScore;
  }
  const evScore = clamp(p.ev / 0.22, 0, 1) * 26;
  const confScore = (p.confidence / 100) * 25;
  const dqScore = (p.dataQuality / 100) * 14;
  const riskScore = (p.risk === "LOW" ? 1 : p.risk === "MEDIUM" ? 0.55 : 0.22) * 15;
  const consensusScore = p.consensusAgreement * 12;
  const stabilityScore = p.confidenceBreakdown.marketStability / 100 * 8;
  // Une cote 1.80 avec excellente value passe devant une cote 3.50 incertaine :
  const oddsPenalty = p.market.odds > 2.8 ? (p.market.odds - 2.8) * 4 : 0;
  return evScore + confScore + dqScore + riskScore + consensusScore + stabilityScore - oddsPenalty;
}
