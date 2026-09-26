// ============================================================
// MODULE COMBINÉ INTELLIGENT
// Génère des combinés à partir des MEILLEURES prédictions,
// JAMAIS en ajoutant des sélections faibles pour gonfler la cote.
// « 4.37 est préférable à 6.00 obtenu artificiellement. »
// ============================================================

import { CombinerResult, Prediction, RiskLevel } from "../types";
import { globalCorrelationRisk } from "./correlation";
import { clamp, round } from "../utils";

export interface CombinerOptions {
  strategy: "conservative" | "balanced" | "highValue";
  bankroll: number; // FCFA
}

const STRATEGY_RULES = {
  conservative: { minConfidence: 82, minEv: 0.04, maxOdds: 1.90, maxRisk: "LOW" as RiskLevel, maxLegs: 3 },
  balanced:     { minConfidence: 77, minEv: 0.04, maxOdds: 2.40, maxRisk: "MEDIUM" as RiskLevel, maxLegs: 4 },
  highValue:    { minConfidence: 75, minEv: 0.08, maxOdds: 3.50, maxRisk: "MEDIUM" as RiskLevel, maxLegs: 4 }
};

const riskRank: Record<RiskLevel, number> = { LOW: 0, MEDIUM: 1, HIGH: 2 };

export function buildCombiner(predictions: Prediction[], opts: CombinerOptions): CombinerResult {
  const rules = STRATEGY_RULES[opts.strategy];

  // Filtrage strict selon la stratégie choisie
  const pool = predictions.filter(p =>
    p.confidence >= rules.minConfidence &&
    p.ev >= rules.minEv &&
    p.market.odds <= rules.maxOdds &&
    riskRank[p.risk] <= riskRank[rules.maxRisk]
  );

  // Sélection gloutonne : meilleure EV × confiance, événements distincts,
  // corrélation contrôlée, sports variés de préférence.
  const sorted = [...pool].sort(
    (a, b) => b.ev * (b.confidence / 100) - a.ev * (a.confidence / 100)
  );

  const legs: Prediction[] = [];
  for (const p of sorted) {
    if (legs.length >= rules.maxLegs) break;
    if (legs.some(l => l.event.id === p.event.id)) continue;
    const tags = new Set(p.market.scenarioTags);
    const correlated = legs.some(l => l.market.scenarioTags.some(t => tags.has(t)));
    if (correlated && legs.length >= 2) continue;
    legs.push(p);
  }

  const combinedOdds = legs.reduce((o, p) => o * p.market.odds, 1);
  const combinedProb = legs.reduce((o, p) => o * p.modelProb, 1);
  const combinedEv = combinedProb * combinedOdds - 1;

  let status: CombinerResult["status"] = "COMPLETE";
  let note = `${legs.length} sélection(s) retenue(s) sur ${pool.length} éligible(s).`;
  if (pool.length > legs.length) {
    status = "NO_ADDITIONAL_VALUE";
    note += " Aucune autre sélection ne respecte les seuils — le moteur refuse d'ajouter des picks faibles pour gonfler la cote.";
  } else if (legs.length < rules.maxLegs) {
    status = "NO_ADDITIONAL_VALUE";
    note = `Seulement ${legs.length} sélection(s) de qualité suffisante aujourd'hui. Une cote combinée de ${combinedOdds.toFixed(2)} avec de vraies sélections vaut mieux qu'une cote plus haute construite artificiellement.`;
  }

  // Mise recommandée : Kelly fractionné (1/4 Kelly), plafonnée à 1.5 % de la bankroll
  let stakeSuggestion: CombinerResult["stakeSuggestion"] | undefined;
  if (legs.length > 0 && opts.bankroll > 0) {
    const edge = combinedEv;
    const b = combinedOdds - 1;
    const kelly = edge > 0 && b > 0 ? clamp((edge / b) * 0.25, 0, 0.015) : 0;
    stakeSuggestion = {
      fraction: round(kelly * 100, 2),
      amount: Math.max(0, Math.round(opts.bankroll * kelly)),
      bankroll: opts.bankroll
    };
  }

  return {
    strategy: opts.strategy,
    selections: legs,
    combinedOdds: round(combinedOdds, 2),
    combinedProb: round(combinedProb, 3),
    combinedEv: round(combinedEv, 4),
    status,
    note,
    stakeSuggestion
  };
}
