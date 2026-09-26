// ============================================================
// GÉNÉRATEUR DE DÉMONSTRATION
// Produit un jeu de données 100% fictif mais COHÉRENT :
// les cotes sont construites autour de probabilités "vraies"
// cachées, avec des erreurs de pricing volontaires — c'est ce
// qui permet au Value Engine de démontrer la détection de value
// (et le système NO BET quand rien ne passe les seuils).
// ============================================================

import {
  Sport, SportEvent, Market, TeamSide, SideContext, FormSample, MarketType
} from "../types";
import {
  seededRng, pick, rangeInt, rangeFloat, gauss, clamp, eventTime, todaySeed
} from "../utils";
import {
  DEMO_FOOTBALL, DEMO_BASKETBALL, DEMO_TENNIS, DEMO_BASEBALL,
  DEMO_HOCKEY, DEMO_VOLLEYBALL, DEMO_MMA, ABSENCE_POOL, DemoTeam
} from "./teams";

// ---------- maths ----------
const fact = (n: number): number => (n <= 1 ? 1 : n * fact(n - 1));
export const poisson = (k: number, lambda: number) => (Math.pow(lambda, k) * Math.exp(-lambda)) / fact(k);
export const logistic = (x: number) => 1 / (1 + Math.exp(-x));

function toSide(t: DemoTeam): TeamSide {
  return { name: t.name, short: t.short, attack: t.attack, defense: t.defense, pace: t.pace, rating: (t.attack + t.defense) / 2 };
}

function makeForm(rng: () => number, strength: number, n: number, scoring: number): FormSample[] {
  const out: FormSample[] = [];
  for (let i = 0; i < n; i++) {
    const expected = scoring * (0.75 + strength / 50) * (1 + gauss(rng) * 0.5);
    const conceded = scoring * (1.25 - strength / 55) * (1 + gauss(rng) * 0.5);
    const diff = expected - conceded;
    const label = diff > scoring * 0.12 ? "W" : diff < -scoring * 0.12 ? "L" : "D";
    out.push({
      label,
      scored: Math.max(0, Math.round(expected)),
      conceded: Math.max(0, Math.round(conceded)),
      xg: Math.max(0.2, expected + gauss(rng) * scoring * 0.3),
      xga: Math.max(0.2, conceded + gauss(rng) * scoring * 0.3),
      home: rng() > 0.5
    });
  }
  return out;
}

function makeSideContext(rng: () => number, t: DemoTeam, scoring: number, withAbsences: boolean): SideContext {
  const formLast10 = makeForm(rng, (t.attack + t.defense) / 2 - 78, 10, scoring);
  const absences = withAbsences && rng() < 0.55
    ? Array.from({ length: rangeInt(rng, 1, 2) }, () => {
        const a = pick(rng, ABSENCE_POOL);
        return { name: a.name, role: a.role, impact: rangeFloat(rng, 0.25, 0.85) };
      })
    : [];
  const f10 = formLast10;
  return {
    restDays: rangeInt(rng, 2, 7),
    absences,
    travelKm: rangeInt(rng, 10, 900),
    formLast5: f10.slice(0, 5),
    formLast10,
    avgScored: f10.reduce((s, m) => s + m.scored, 0) / f10.length,
    avgConceded: f10.reduce((s, m) => s + m.conceded, 0) / f10.length,
    xgPerGame: f10.reduce((s, m) => s + m.xg, 0) / f10.length,
    xgaPerGame: f10.reduce((s, m) => s + m.xga, 0) / f10.length,
    shotsPerGame: rangeFloat(rng, 9, 18),
    shotsOnTargetPerGame: rangeFloat(rng, 3, 7.5),
    possession: rangeFloat(rng, 42, 63)
  };
}

// ---------- construction des événements ----------
let idCounter = 0;
const nextId = (p: string) => `${p}-${(++idCounter).toString(36)}${Date.now().toString(36).slice(-4)}`;

function baseEvent(
  rng: () => number, sport: Sport, league: string, country: string,
  home: DemoTeam, away: DemoTeam, startIso: string, scoring: number
): SportEvent {
  return {
    id: nextId("evt"),
    sport, league, country,
    home: toSide(home),
    away: toSide(away),
    startTime: startIso,
    status: "upcoming",
    stakes: rangeInt(rng, 3, 9),
    isDerby: rng() < 0.15,
    contextHome: makeSideContext(rng, home, scoring, true),
    contextAway: makeSideContext(rng, away, scoring, true),
    h2h: {
      homeWins: rangeInt(rng, 0, 5),
      draws: rangeInt(rng, 0, 3),
      awayWins: rangeInt(rng, 0, 5),
      lastScores: Array.from({ length: rangeInt(rng, 2, 4) }, () => `${rangeInt(rng, 0, 3)}-${rangeInt(rng, 0, 3)}`)
    },
    advancedAvailable: rng() < 0.85,
    lineupsAvailable: rng() < 0.6,
    dataSource: "demo"
  };
}

export function buildDemoDay(now = new Date()): {
  events: SportEvent[];
  markets: Market[];
  trueProbs: Record<string, number>;
} {
  idCounter = 0;
  const seed = todaySeed(now);
  const rng = seededRng(`vbm-day-${seed}`);
  const events: SportEvent[] = [];
  const markets: Market[] = [];
  const trueProbs: Record<string, number> = {};
  const nowMs = now.getTime();

  const add = (e: SportEvent, status: SportEvent["status"], offsetMin: number) => {
    e.status = status;
    e.startTime = new Date(nowMs + offsetMin * 60000).toISOString();
    events.push(e);
  };

  // ⚽ Football (6 matchs)
  DEMO_FOOTBALL.forEach((grp, gi) => {
    for (let i = 0; i < grp.teams.length - 1 && i < 2; i++) {
      const home = grp.teams[i * 2];
      const away = grp.teams[i * 2 + 1];
      const e = baseEvent(rng, "football", grp.league, grp.country, home, away, "", 1.35);
      add(e, i === 0 && gi === 0 ? "live" : "upcoming", rangeInt(rng, 30, 540));
    }
  });

  // 🏀 Basketball (3)
  for (let i = 0; i < 6; i += 2) {
    const e = baseEvent(rng, "basketball", "Pro Basketball Circuit", "USA", DEMO_BASKETBALL[i], DEMO_BASKETBALL[i + 1], "", 108);
    add(e, i === 2 ? "live" : "upcoming", rangeInt(rng, 45, 600));
  }

  // 🎾 Tennis (3)
  for (let i = 0; i < 6; i += 2) {
    const e = baseEvent(rng, "tennis", "Grand Circuit Masters", "International", DEMO_TENNIS[i], DEMO_TENNIS[i + 1], "", 10);
    add(e, "upcoming", rangeInt(rng, 60, 640));
  }

  // ⚾ Baseball (2)
  for (let i = 0; i < 4; i += 2) {
    const e = baseEvent(rng, "baseball", "National Diamond League", "USA", DEMO_BASEBALL[i], DEMO_BASEBALL[i + 1], "", 4.6);
    add(e, "upcoming", rangeInt(rng, 90, 620));
  }

  // 🏒 Hockey (2)
  for (let i = 0; i < 4; i += 2) {
    const e = baseEvent(rng, "hockey", "Ice Elite League", "Canada", DEMO_HOCKEY[i], DEMO_HOCKEY[i + 1], "", 3.0);
    add(e, i === 0 ? "finished" : "upcoming", i === 0 ? -360 : rangeInt(rng, 120, 600));
  }

  // 🏐 Volleyball (2)
  for (let i = 0; i < 4; i += 2) {
    const e = baseEvent(rng, "volleyball", "Volley Pro Series", "Italie", DEMO_VOLLEYBALL[i], DEMO_VOLLEYBALL[i + 1], "", 76);
    add(e, "upcoming", rangeInt(rng, 80, 560));
  }

  // 🥊 MMA (1) — données volontairement pauvres → exclu par le Data Quality Score
  {
    const e = baseEvent(rng, "mma", "Fight Series 88", "International", DEMO_MMA[0], DEMO_MMA[1], "", 0);
    e.advancedAvailable = false;
    e.lineupsAvailable = false;
    e.contextHome = { ...e.contextHome, formLast5: [], formLast10: [], absences: [], xgPerGame: 0, xgaPerGame: 0, shotsPerGame: 0, shotsOnTargetPerGame: 0, possession: undefined };
    e.contextAway = { ...e.contextAway, formLast5: [], formLast10: [], absences: [], xgPerGame: 0, xgaPerGame: 0, shotsPerGame: 0, shotsOnTargetPerGame: 0, possession: undefined };
    add(e, "upcoming", rangeInt(rng, 240, 480));
  }

  // Match terminé (football) → alimente l'auto-learning
  {
    const grp = DEMO_FOOTBALL[0];
    const e = baseEvent(rng, "football", grp.league, grp.country, grp.teams[4], grp.teams[5], "", 1.35);
    e.status = "finished";
    e.startTime = new Date(nowMs - 5 * 3600 * 1000).toISOString();
    e.scoreHome = rangeInt(rng, 0, 3);
    e.scoreAway = rangeInt(rng, 0, 2);
    events.push(e);
  }

  // Scores live
  events.filter(e => e.status === "live").forEach(e => {
    e.minute = rangeInt(rng, 12, 84);
    e.scoreHome = rangeInt(rng, 0, 2);
    e.scoreAway = rangeInt(rng, 0, 2);
  });

  // ---------- marchés + probabilités cachées ----------
  events.forEach(e => {
    const { mkts, probs } = buildMarketsForEvent(e, rng);
    mkts.forEach(m => {
      markets.push(m);
      trueProbs[m.id] = probs[m.id];
    });
  });

  return { events, markets, trueProbs };
}

// ---------- probabilités "vraies" par type de match ----------
function ratingDelta(e: SportEvent): number {
  const homeAdv = e.sport === "tennis" || e.sport === "mma" ? 1.2 : 4.5;
  const formH = formBoost(e.contextHome.formLast10);
  const formA = formBoost(e.contextAway.formLast10);
  const absH = absencePenalty(e.contextHome.absences);
  const absA = absencePenalty(e.contextAway.absences);
  const restH = (e.contextHome.restDays - 3.5) * 0.6;
  const restA = (e.contextAway.restDays - 3.5) * 0.6;
  return (e.home.rating + formH - absH + restH + homeAdv + (e.isDerby ? 1 : 0))
       - (e.away.rating + formA - absA + restA);
}

function formBoost(form: FormSample[]): number {
  if (!form.length) return 0;
  const pts = form.reduce((s, m) => s + (m.label === "W" ? 1 : m.label === "D" ? 0.35 : 0), 0);
  return (pts / form.length - 0.45) * 10;
}

function absencePenalty(abs: { impact: number }[]): number {
  return abs.reduce((s, a) => s + a.impact * 4, 0);
}

export function moneylineTrueProb(e: SportEvent): { home: number; away: number } {
  const d = ratingDelta(e);
  const scale = e.sport === "basketball" ? 5.5 : e.sport === "baseball" ? 6.5 : e.sport === "tennis" ? 5 : e.sport === "mma" ? 6 : 5.2;
  const pHome = clamp(logistic(d / scale), 0.08, 0.92);
  return { home: pHome, away: 1 - pHome };
}

function expectedTotals(e: SportEvent): { lambda: number; base: number } {
  const atk = (e.home.attack + e.away.attack) / 2;
  const def = (e.home.defense + e.away.defense) / 2;
  const pace = (e.home.pace + e.away.pace) / 2 / 100;
  switch (e.sport) {
    case "football": return { lambda: clamp(2.55 + (atk - def) / 26 + (pace - 0.78) * 1.6, 1.5, 4.1), base: 2.5 };
    case "basketball": return { lambda: clamp(213 + (atk - def) * 1.1 + (pace - 0.83) * 40, 196, 232), base: 214.5 };
    case "tennis": return { lambda: clamp(22.2 + (atk - def) * 0.06 + (pace - 0.8) * 3, 19.5, 25.5), base: 22.5 };
    case "baseball": return { lambda: clamp(8.6 + (atk - def) / 16 + (pace - 0.77) * 3, 6.8, 10.8), base: 8.5 };
    case "hockey": return { lambda: clamp(5.9 + (atk - def) / 20 + (pace - 0.8) * 2, 4.6, 7.4), base: 6.0 };
    case "volleyball": return { lambda: clamp(181 + (atk - def) * 0.9, 172, 190), base: 181.5 };
    default: return { lambda: 0, base: 0 };
  }
}

// ---------- construction des marchés ----------
function buildMarketsForEvent(e: SportEvent, rng: () => number) {
  const mkts: Market[] = [];
  const probs: Record<string, number> = {};
  const ml = moneylineTrueProb(e);
  const { lambda, base } = expectedTotals(e);

  const add = (
    type: MarketType, label: string, selection: string, trueProb: number,
    scenarioTags: string[], line?: number
  ) => {
    trueProb = clamp(trueProb, 0.02, 0.98);
    // Le bookmaker se trompe : ~16% des marchés sont mal pricés en notre
    // faveur (value), ~10% en notre défaveur, le reste est proche du fair.
    // L'erreur est bornée par la probabilité vraie : un marché réaliste ne
    // diverge jamais de plus de ~50% de sa vraie probabilité.
    const roll = rng();
    let bookError = gauss(rng) * 0.035; // bruit normal ±3.5 pts
    if (roll < 0.16) bookError -= rangeFloat(rng, 0.05, Math.min(0.16, Math.max(0.05, trueProb * 0.5))); // cote trop généreuse
    else if (roll < 0.26) bookError += rangeFloat(rng, 0.05, Math.min(0.12, Math.max(0.05, trueProb * 0.4)));
    const margin = rangeFloat(rng, 0.035, 0.065);
    const implied = clamp(trueProb + bookError + margin * trueProb, 0.05, 0.96);
    const odds = clamp(1 / implied, 1.12, 8.5);
    const history: number[] = [];
    let o = odds * (1 + gauss(rng) * 0.06);
    for (let i = 0; i < 22; i++) {
      o = clamp(o * (1 + gauss(rng) * 0.014), 1.1, 13);
      history.push(Number(o.toFixed(2)));
    }
    history.push(Number(odds.toFixed(2)));
    const id = nextId("mkt");
    mkts.push({
      id, eventId: e.id, type, label, selection, line,
      odds: Number(odds.toFixed(2)),
      oddsHistory: history,
      impliedProb: implied,
      scenarioTags
    });
    probs[id] = trueProb;
  };

  const homeTag = `win:${e.home.short}`;
  const awayTag = `win:${e.away.short}`;

  if (e.sport === "football") {
    const drawProb = clamp(0.275 - Math.abs(ratingDelta(e)) * 0.004 + (lambda < 2.3 ? 0.045 : 0), 0.12, 0.36);
    const rest = 1 - drawProb;
    const pHome = ml.home * rest;
    const pAway = ml.away * rest;
    add("1X2", "Résultat final — 1X2", e.home.name, pHome, [homeTag, "match-result"], );
    add("1X2", "Résultat final — 1X2", "Match Nul", drawProb, ["draw", "low-scoring"]);
    add("1X2", "Résultat final — 1X2", e.away.name, pAway, [awayTag, "match-result"]);
    const over = 1 - poissonCdf(2, lambda);
    add("OU", "Over/Under 2.5 buts", "Over 2.5", over, ["goals", "over"], 2.5);
    add("OU", "Over/Under 2.5 buts", "Under 2.5", 1 - over, ["low-scoring", "under"], 2.5);
    const btts = (1 - poisson(0, lambda / 2)) * (1 - poisson(0, lambda / 2.2)) * 1.06;
    add("BTTS", "Les deux équipes marquent", "Oui", clamp(btts, 0.15, 0.85), ["goals", homeTag + ":scores", awayTag + ":scores"]);
    add("DNB", "Draw No Bet", e.home.name, pHome / (pHome + pAway), [homeTag, "match-result"]);
    if (pHome > 0.42) add("HANDICAP", "Handicap -1", `${e.home.name} -1`, clamp(pHome * 0.52 - 0.04, 0.08, 0.6), [homeTag, "goals"], -1);
  } else if (e.sport === "basketball") {
    add("MONEYLINE", "Vainqueur (Moneyline)", e.home.name, ml.home, [homeTag, "match-result"]);
    add("MONEYLINE", "Vainqueur (Moneyline)", e.away.name, ml.away, [awayTag, "match-result"]);
    const marginMean = ratingDelta(e) * 0.55;
    const spread = 11.5;
    const cover = 1 - normalCdf((5.5 - marginMean) / spread);
    add("HANDICAP", "Handicap +5.5 / -5.5", `${e.home.name} -5.5`, clamp(cover, 0.1, 0.9), [homeTag], -5.5);
    add("HANDICAP", "Handicap +5.5 / -5.5", `${e.away.name} +5.5`, clamp(1 - cover, 0.1, 0.9), [awayTag], 5.5);
    const over = 1 - normalCdf((base - lambda) / 9.5);
    add("OU", `Over/Under ${base} points`, `Over ${base}`, clamp(over, 0.1, 0.9), ["high-scoring", "over"], base);
    add("OU", `Over/Under ${base} points`, `Under ${base}`, clamp(1 - over, 0.1, 0.9), ["under"], base);
  } else if (e.sport === "tennis") {
    add("MONEYLINE", "Vainqueur du match", e.home.name, ml.home, [homeTag, "match-result"]);
    add("MONEYLINE", "Vainqueur du match", e.away.name, ml.away, [awayTag, "match-result"]);
    const over = 1 - normalCdf((base - lambda) / 2.6);
    add("GAMES_OU", "Over/Under jeux", `Over ${base} jeux`, clamp(over, 0.1, 0.9), ["long-match", "over"], base);
    add("HANDICAP", "Handicap sets", `${e.home.name} -1.5 sets`, clamp(ml.home * 0.55 - 0.05, 0.06, 0.7), [homeTag, "domination"], -1.5);
  } else if (e.sport === "baseball") {
    add("MONEYLINE", "Vainqueur (Moneyline)", e.home.name, ml.home, [homeTag, "match-result"]);
    add("MONEYLINE", "Vainqueur (Moneyline)", e.away.name, ml.away, [awayTag, "match-result"]);
    add("RUN_LINE", "Run Line -1.5", `${e.home.name} -1.5`, clamp(ml.home * 0.58 - 0.06, 0.07, 0.65), [homeTag, "domination"], -1.5);
    const over = 1 - poissonCdf(Math.floor(base), lambda);
    add("OU", `Total runs ${base}`, `Over ${base}`, clamp(over, 0.1, 0.9), ["high-scoring", "over"], base);
  } else if (e.sport === "hockey") {
    add("MONEYLINE", "Vainqueur (Moneyline)", e.home.name, ml.home, [homeTag, "match-result"]);
    add("MONEYLINE", "Vainqueur (Moneyline)", e.away.name, ml.away, [awayTag, "match-result"]);
    add("PUCK_LINE", "Puck Line -1.5", `${e.home.name} -1.5`, clamp(ml.home * 0.5 - 0.03, 0.06, 0.6), [homeTag, "domination"], -1.5);
    const over = 1 - poissonCdf(5, lambda);
    add("OU", "Total buts 5.5", "Over 5.5", clamp(over, 0.1, 0.9), ["high-scoring", "over"], 5.5);
  } else if (e.sport === "volleyball") {
    add("MONEYLINE", "Vainqueur (Moneyline)", e.home.name, ml.home, [homeTag, "match-result"]);
    add("MONEYLINE", "Vainqueur (Moneyline)", e.away.name, ml.away, [awayTag, "match-result"]);
    add("HANDICAP", "Handicap sets", `${e.home.name} -1.5 sets`, clamp(ml.home * 0.52 - 0.04, 0.06, 0.65), [homeTag, "domination"], -1.5);
    const over = 1 - normalCdf((base - lambda) / 7);
    add("OU", `Total points ${base}`, `Over ${base}`, clamp(over, 0.1, 0.9), ["long-match", "over"], base);
  } else if (e.sport === "mma") {
    add("MONEYLINE", "Vainqueur du combat", e.home.name, ml.home, [homeTag, "match-result"]);
    add("MONEYLINE", "Vainqueur du combat", e.away.name, ml.away, [awayTag, "match-result"]);
  }

  return { mkts, probs };
}

export function poissonCdf(k: number, lambda: number): number {
  let s = 0;
  for (let i = 0; i <= k; i++) s += poisson(i, lambda);
  return s;
}

export function normalCdf(z: number): number {
  const t = 1 / (1 + 0.2316419 * Math.abs(z));
  const d = 0.3989423 * Math.exp((-z * z) / 2);
  let p = d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))));
  if (z > 0) p = 1 - p;
  return p;
}

/** Fait légèrement dériver les cotes à chaque synchronisation. */
export function driftOdds(m: Market, rng: () => number, bigMove: boolean): number {
  const before = m.odds;
  const shock = bigMove ? (rng() < 0.5 ? -1 : 1) * rangeFloat(rng, 0.045, 0.11) : gauss(rng) * 0.012;
  m.odds = clamp(Number((m.odds * (1 + shock)).toFixed(2)), 1.08, 14);
  m.oddsHistory.push(m.odds);
  if (m.oddsHistory.length > 32) m.oddsHistory.shift();
  m.impliedProb = 1 / m.odds;
  return m.odds - before;
}
