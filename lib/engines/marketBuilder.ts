// ============================================================
// MARKET BUILDER — construit les marchés d'une rencontre RÉELLE.
// - Cotes bookmaker RÉELLES si disponibles (ESPN odds intégrés).
// - Sinon : cotes FAIR = 1 / probabilité modèle (affichées comme
//   telles, jamais de cotes inventées).
// Probabilités calculées par Poisson / logistique sur les VRAIES
// notes d'équipes issues des classements réels.
// ============================================================

import { SportEvent, Market, MarketType } from "../types";
import { clamp } from "../utils";
import { poisson } from "../demo/generator";

let mktSeq = 0;
const mid = () => `rmkt-${Date.now().toString(36)}-${(++mktSeq).toString(36)}`;

const factCache: number[] = [1, 1];
const fact = (n: number): number => {
  while (factCache.length <= n) factCache.push(factCache[factCache.length - 1] * factCache.length);
  return factCache[n];
};
const pois = (k: number, l: number) => (Math.pow(l, k) * Math.exp(-l)) / fact(k);
const logistic = (x: number) => 1 / (1 + Math.exp(-x));
const round2 = (v: number) => Number(v.toFixed(2));

function poissonCdf(k: number, lambda: number): number {
  let s = 0;
  for (let i = 0; i <= k; i++) s += pois(i, lambda);
  return s;
}
function normalCdf(z: number): number {
  const t = 1 / (1 + 0.2316419 * Math.abs(z));
  const d = 0.3989423 * Math.exp((-z * z) / 2);
  let p = d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))));
  if (z > 0) p = 1 - p;
  return p;
}

export interface BuiltMarkets {
  markets: Market[];
  /** probabilités "vraies" du modèle par marché (sert au fair odds) */
  trueProbs: Record<string, number>;
  oddsFeedUsed: boolean;
}

/** Expected goals/buts à partir des vraies notes attaque/défense. */
export function expectedGoals(e: SportEvent): { lambdaHome: number; lambdaAway: number } {
  const avg = 1.32; // moyenne buts/équipe/match des grands championnats
  const atkH = (e.home.attack ?? 70) / 100;
  const defH = (e.home.defense ?? 70) / 100;
  const atkA = (e.away.attack ?? 70) / 100;
  const defA = (e.away.defense ?? 70) / 100;
  const home = avg * (0.55 + atkH * 0.75) * (1.45 - defA * 0.75) * 1.14; // avantage terrain réel
  const away = avg * (0.55 + atkA * 0.75) * (1.45 - defH * 0.75) * 0.92;
  return { lambdaHome: clamp(home, 0.25, 3.4), lambdaAway: clamp(away, 0.2, 3.1) };
}

/** Probabilités 1X2 par grille de Poisson (calcul réel). */
export function outcomeProbs(e: SportEvent): { home: number; draw: number; away: number } {
  const { lambdaHome, lambdaAway } = expectedGoals(e);
  let ph = 0, pd = 0, pa = 0;
  for (let h = 0; h <= 8; h++) {
    for (let a = 0; a <= 8; a++) {
      const p = pois(h, lambdaHome) * pois(a, lambdaAway);
      if (h > a) ph += p;
      else if (h === a) pd += p;
      else pa += p;
    }
  }
  const s = ph + pd + pa;
  return { home: ph / s, draw: pd / s, away: pa / s };
}

export function buildRealMarkets(e: SportEvent): BuiltMarkets {
  const markets: Market[] = [];
  const trueProbs: Record<string, number> = {};
  let oddsFeedUsed = false;

  const push = (
    type: MarketType, label: string, selection: string, prob: number,
    realOdds: number | undefined, tags: string[], line?: number
  ) => {
    const p = clamp(prob, 0.02, 0.98);
    const hasReal = Boolean(realOdds && realOdds > 1.01);
    const odds = hasReal ? round2(realOdds as number) : round2(clamp(1 / p, 1.05, 25));
    if (hasReal) oddsFeedUsed = true;
    const id = mid();
    markets.push({
      id, eventId: e.id, type, label, selection, line,
      fair: !hasReal,
      odds,
      oddsHistory: [odds],
      impliedProb: 1 / odds,
      scenarioTags: tags
    });
    trueProbs[id] = p;
  };

  const homeTag = `win:${e.home.short}`;
  const awayTag = `win:${e.away.short}`;
  const hasRatings = Boolean(e.home.rating && e.away.rating);

  // ---------------- ⚽ FOOTBALL (Poisson réel) ----------------
  if (e.sport === "football" && hasRatings) {
    const { home: ph, draw: pd, away: pa } = outcomeProbs(e);
    const { lambdaHome, lambdaAway } = expectedGoals(e);
    const lambda = lambdaHome + lambdaAway;

    push("1X2", "Résultat final — 1X2", e.home.name, ph, undefined, [homeTag, "match-result"]);
    push("1X2", "Résultat final — 1X2", "Match Nul", pd, undefined, ["draw", "low-scoring"]);
    push("1X2", "Résultat final — 1X2", e.away.name, pa, undefined, [awayTag, "match-result"]);

    const over = 1 - poissonCdf(2, lambda);
    push("OU", "Over/Under 2.5 buts", "Over 2.5", over, undefined, ["goals", "over"], 2.5);
    push("OU", "Over/Under 2.5 buts", "Under 2.5", 1 - over, undefined, ["low-scoring", "under"], 2.5);

    const btts = clamp((1 - pois(0, lambdaHome)) * (1 - pois(0, lambdaAway)), 0.05, 0.95);
    push("BTTS", "Les deux équipes marquent", "Oui", btts, undefined, ["goals"], 0);

    push("DNB", "Draw No Bet", e.home.name, ph / (ph + pa), undefined, [homeTag, "match-result"]);
    if (ph > 0.5) push("HANDICAP", "Handicap -1", `${e.home.name} -1`, clamp(ph * 0.5, 0.05, 0.72), undefined, [homeTag, "goals"], -1);
    if (pa > 0.5) push("HANDICAP", "Handicap -1", `${e.away.name} -1`, clamp(pa * 0.5, 0.05, 0.72), undefined, [awayTag, "goals"], -1);
  }

  // ---------------- 🏀⚾🏒 Sports US (cotes réelles ESPN si dispo) ----------------
  if (["basketball", "baseball", "hockey"].includes(e.sport) && hasRatings) {
    const rH = e.home.rating ?? 70;
    const rA = e.away.rating ?? 70;
    const homeAdv = e.sport === "baseball" ? 2.6 : 3.2;
    // Échelle adoucie : évite les probabilités saturées (99 %) sur de
    // gros écarts de classement — les upsets existent dans la réalité.
    const scale = e.sport === "basketball" ? 11 : 9;
    const pHome = clamp(logistic((rH + homeAdv - rA) / scale), 0.06, 0.94);

    const americanToDec = (ml?: number) => (ml == null ? undefined : ml > 0 ? round2(1 + ml / 100) : round2(1 + 100 / Math.abs(ml)));
    const homeMl = americanToDec(e.oddsInfo?.homeMoneyLineAmerican);
    const awayMl = americanToDec(e.oddsInfo?.awayMoneyLineAmerican);

    push("MONEYLINE", "Vainqueur (Moneyline)", e.home.name, pHome, homeMl, [homeTag, "match-result"]);
    push("MONEYLINE", "Vainqueur (Moneyline)", e.away.name, 1 - pHome, awayMl, [awayTag, "match-result"]);

    // Totaux : ligne réelle ESPN si fournie
    const totals = e.sport === "basketball" ? { base: 224, sd: 10 } : e.sport === "baseball" ? { base: 8.6, sd: 1.6 } : { base: 6.0, sd: 1.1 };
    const paceFactor = ((rH + rA) / 2 - 60) * (e.sport === "basketball" ? 0.28 : 0.03);
    const lambdaTotal = totals.base + paceFactor;
    const line = e.oddsInfo?.overUnder ?? totals.base + 0.5;
    const pOver = 1 - normalCdf((line - lambdaTotal) / totals.sd);
    push("OU", `Over/Under ${line} ${e.sport === "basketball" ? "points" : "buts/runs"}`, `Over ${line}`, clamp(pOver, 0.05, 0.95), undefined, ["high-scoring", "over"], line);
    push("OU", `Over/Under ${line} ${e.sport === "basketball" ? "points" : "buts/runs"}`, `Under ${line}`, clamp(1 - pOver, 0.05, 0.95), undefined, ["under"], line);

    // Handicap / spread : ligne réelle ESPN si fournie
    const spread = e.oddsInfo?.spread;
    if (spread != null && Math.abs(spread) > 0.5) {
      const sdMargin = e.sport === "basketball" ? 12.5 : 2.1;
      const expMargin = (rH + homeAdv - rA) * (e.sport === "basketball" ? 0.62 : 0.28);
      const pCoverHome = 1 - normalCdf((-spread - expMargin) / sdMargin);
      const lbl = e.sport === "baseball" ? "Run Line" : e.sport === "hockey" ? "Puck Line" : "Handicap";
      push("HANDICAP", `${lbl} ${spread > 0 ? "+" : ""}${spread}`, `${e.home.name} ${spread > 0 ? "+" : ""}${spread}`, clamp(pCoverHome, 0.05, 0.95), undefined, [homeTag], spread);
    }
  }

  return { markets, trueProbs, oddsFeedUsed };
}
