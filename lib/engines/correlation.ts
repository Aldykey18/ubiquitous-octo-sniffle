// ============================================================
// CORRELATION ENGINE
// Détecte les paris qui dépendent du MÊME scénario.
// Exemple à éviter : "Équipe A gagne" + "Équipe A marque" +
// "Over 2.5" + "Équipe A -1" — tout repose sur la même histoire.
// Le moteur favorise : matchs différents, sports différents,
// marchés différents, compétitions différentes.
// ============================================================

import { Prediction, RiskLevel } from "../types";

export function correlationRiskForSelection(candidate: Prediction, alreadySelected: Prediction[]): RiskLevel {
  if (alreadySelected.length === 0) return "LOW";

  const tags = new Set(candidate.market.scenarioTags);
  let overlap = 0;
  let sameLeague = 0;
  let sameSport = 0;

  for (const p of alreadySelected) {
    if (p.event.sport === candidate.event.sport) sameSport++;
    if (p.event.league === candidate.event.league) sameLeague++;
    const shared = p.market.scenarioTags.filter(t => tags.has(t)).length;
    if (shared > 0) overlap++;
  }

  let score = 0;
  if (sameLeague >= 2) score += 2;
  else if (sameLeague >= 1) score += 1;
  if (overlap >= 2) score += 2;
  else if (overlap >= 1) score += 1;
  if (sameSport >= 3) score += 1;

  return score >= 3 ? "HIGH" : score >= 2 ? "MEDIUM" : "LOW";
}

/**
 * Risque de corrélation GLOBAL de la sélection du jour :
 * LOW = sports/scénarios variés, HIGH = tout dépend des mêmes matchs.
 */
export function globalCorrelationRisk(preds: Prediction[]): RiskLevel {
  if (preds.length <= 1) return "LOW";
  const sports = new Set(preds.map(p => p.event.sport));
  const leagues = new Set(preds.map(p => p.event.league));
  const tagMap = new Map<string, number>();
  preds.forEach(p => p.market.scenarioTags.forEach(t => tagMap.set(t, (tagMap.get(t) || 0) + 1)));
  const maxTag = Math.max(...tagMap.values());

  if (sports.size === 1 || maxTag >= 3) return "HIGH";
  if (sports.size <= 2 || leagues.size <= Math.ceil(preds.length / 2) || maxTag >= 2) return "MEDIUM";
  return "LOW";
}
