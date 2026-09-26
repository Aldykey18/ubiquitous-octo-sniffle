// ============================================================
// VALUE BET MASTER AI — Types partagés du moteur
// Hiérarchie absolue :
// QUALITÉ DES DONNÉES → ANALYSE → PROBABILITÉ → VALUE → RISQUE
// → CORRÉLATION → CLASSEMENT → MEILLEURES PRÉDICTIONS
// ============================================================

export type Sport =
  | "football"
  | "basketball"
  | "tennis"
  | "baseball"
  | "hockey"
  | "volleyball"
  | "mma";

export type EventStatus = "upcoming" | "live" | "finished";

export type MarketType =
  | "1X2"
  | "DOUBLE_CHANCE"
  | "DNB" // Draw No Bet
  | "AH" // Asian Handicap
  | "OU" // Over/Under total
  | "BTTS" // Both Teams To Score
  | "TEAM_TOTAL"
  | "FIRST_HALF_GOALS"
  | "CORNERS"
  | "CARDS"
  | "HANDICAP" // handicap générique (jeux, sets, points)
  | "MONEYLINE"
  | "RUN_LINE"
  | "PUCK_LINE"
  | "SETS_OU"
  | "GAMES_OU"
  | "PLAYER"
  | "QUARTER";

export interface TeamSide {
  name: string;
  short: string;
  /** Note d'attaque 0-100 (réelle : issue des classements ESPN en mode live) */
  attack: number;
  /** Note de défense 0-100 (plus haut = plus solide) */
  defense: number;
  /** Rythme / intensité 0-100 */
  pace: number;
  /** Rating global (réel : classement/points en mode live) */
  rating: number;
  /** Bilan réel affiché, ex: "5V-1N-2D" ou "10-4" */
  record?: string;
  logo?: string;
}

/** Cotes RÉELLES intégrées par ESPN (sports US) — argent américain. */
export interface RealOddsInfo {
  provider?: string;
  details?: string;
  overUnder?: number;
  spread?: number;
  homeMoneyLineAmerican?: number;
  awayMoneyLineAmerican?: number;
}

export interface FormSample {
  label: string; // "W" | "D" | "L"
  scored: number;
  conceded: number;
  xg: number;
  xga: number;
  home: boolean;
}

export interface SideContext {
  restDays: number;
  absences: { name: string; role: string; impact: number }[]; // impact 0-1
  travelKm: number;
  formLast5: FormSample[];
  formLast10: FormSample[];
  avgScored: number;
  avgConceded: number;
  xgPerGame: number;
  xgaPerGame: number;
  shotsPerGame: number;
  shotsOnTargetPerGame: number;
  possession?: number; // football uniquement
}

export interface SportEvent {
  id: string;
  sport: Sport;
  league: string;
  country: string;
  home: TeamSide;
  away: TeamSide;
  /** ISO UTC */
  startTime: string;
  status: EventStatus;
  minute?: number;
  scoreHome?: number;
  scoreAway?: number;
  stakes: number; // 1-10 enjeu
  isDerby: boolean;
  contextHome: SideContext;
  contextAway: SideContext;
  h2h: { homeWins: number; draws: number; awayWins: number; lastScores: string[] };
  /** Données avancées disponibles (xG, etc.) */
  advancedAvailable: boolean;
  /** Compos probables disponibles */
  lineupsAvailable: boolean;
  dataSource: "demo" | "espn";
  /** Cotes réelles bookmaker (ESPN) quand disponibles */
  oddsInfo?: RealOddsInfo | null;
}

export interface Market {
  id: string;
  eventId: string;
  type: MarketType;
  /** Libellé complet du marché, ex: "Over 2.5 buts" */
  label: string;
  /** Sélection retenue, ex: "Over", "Northbridge FC", "+5.5" */
  selection: string;
  line?: number;
  /** true = cote FAIR (= 1/probabilité modèle), aucune cote bookmaker réelle sur ce marché */
  fair?: boolean;
  odds: number;
  oddsHistory: number[]; // du plus ancien au plus récent
  /** Probabilité implicite sans marge: 1/cote après normalisation */
  impliedProb: number;
  /** Groupe de scénario pour le Correlation Engine */
  scenarioTags: string[];
}

export interface ModelVotes {
  statistical: number; // probabilité estimée 0-1
  form: number;
  context: number;
  matchup: number;
  market: number;
}

export interface ConfidenceBreakdown {
  statisticalQuality: number; // /100 — 20%
  form: number; // /100 — 15%
  matchup: number; // /100 — 15%
  context: number; // /100 — 15%
  value: number; // /100 — 15%
  dataQuality: number; // /100 — 10%
  marketStability: number; // /100 — 10%
}

export type RiskLevel = "LOW" | "MEDIUM" | "HIGH";

export interface Prediction {
  id: string;
  market: Market;
  event: SportEvent;
  /** Probabilité consensus du modèle (0-1) */
  modelProb: number;
  /** EV = proba modèle × cote − 1 */
  ev: number;
  confidence: number; // 0-100
  confidenceBreakdown: ConfidenceBreakdown;
  confidenceTier: "PREMIUM" | "EXCELLENTE" | "FORTE" | "BONNE";
  valueTier: "EXCEPTIONNELLE" | "FORTE" | "MODÉRÉE" | "FAIBLE" | "SANS COTE";
  /** true quand aucune cote bookmaker n'est connectée (cote affichée = fair odds du modèle) */
  fairOdds?: boolean;
  risk: RiskLevel;
  variance: RiskLevel;
  dataQuality: number; // 0-100
  dataQualityBreakdown: {
    sources: number;
    freshness: number;
    consistency: number;
    lineups: number;
    injuries: number;
    sourceReliability: number;
  };
  correlationRisk: RiskLevel;
  consensus: ModelVotes;
  consensusAgreement: number; // 0-1, dispersion inverse
  labels: string[]; // badges ("🔥 PREMIUM VALUE", …)
  explanation: string; // justification courte générée par l'IA
  generatedAt: string;
  dataUpdatedAt: string;
  sourcesCount: number;
  consensusCount: string; // "5/5"
  rankScore: number;
}

export interface Alert {
  id: string;
  kind: "NEW_VALUE" | "ODDS_MOVE" | "TEAM_NEWS" | "MATCH_START" | "NO_BET" | "SYSTEM";
  title: string;
  body: string;
  createdAt: string;
  read: boolean;
  eventId?: string;
}

export interface SourceStatus {
  name: string;
  type: "demo" | "connector";
  status: "active" | "ok" | "error" | "disabled";
  detail: string;
  lastCheck: string | null;
}

export interface CollectorReport {
  league: string;
  sport: string;
  ok: boolean;
  events: number;
  detail: string;
}

export interface EngineState {
  mode: "demo" | "live";
  dateSeed: string;
  lastSync: string;
  syncCount: number;
  events: SportEvent[];
  markets: Market[];
  predictions: Prediction[];
  alerts: Alert[];
  sources: SourceStatus[];
  learning: LearningState;
  noBet: boolean;
  noBetReason: string | null;
  /** Dernière collecte de données RÉELLES (navigateur → ESPN) */
  lastIngest?: string;
  collectorReports?: CollectorReport[];
  oddsFeedLive?: boolean;
}

export interface LearningState {
  version: number;
  resolvedCount: number;
  /** biais moyen (proba prédite − fréquence réalisée) par sport */
  biasBySport: Record<string, number>;
  /** biais moyen par type de marché */
  biasByMarket: Record<string, number>;
  /** pondérations actuelles des 5 moteurs de probabilité */
  modelWeights: { statistical: number; form: number; context: number; matchup: number; market: number };
  roiHistory: number[]; // ROI cumulé par bloc de 100 prédictions résolues
  notes: string[];
}

export interface BacktestRecord {
  id: string;
  date: string;
  sport: Sport;
  market: string;
  selection: string;
  matchLabel: string;
  modelProb: number;
  odds: number;
  ev: number;
  won: boolean;
}

export interface BacktestReport {
  total: number;
  accuracy: number;
  roi: number;
  avgEv: number;
  maxDrawdown: number;
  brier: number;
  calibration: { bin: string; predicted: number; realized: number; n: number }[];
  bankrollCurve: number[];
  bySport: { sport: Sport; n: number; accuracy: number; roi: number }[];
  byMarket: { market: string; n: number; accuracy: number; roi: number }[];
}

export interface CombinerResult {
  strategy: "conservative" | "balanced" | "highValue";
  selections: Prediction[];
  combinedOdds: number;
  combinedProb: number;
  combinedEv: number;
  status: "COMPLETE" | "NO_ADDITIONAL_VALUE";
  note: string;
  stakeSuggestion?: { fraction: number; amount: number; bankroll: number };
}

export interface StatusPayload {
  mode: "demo" | "live";
  lastSync: string;
  serverNow: string;
  eventsToday: number;
  liveNow: number;
  predictionsCount: number;
  noBet: boolean;
  sources: SourceStatus[];
  alertsUnread: number;
  learningVersion: number;
  demoMode: boolean;
  lastIngest: string | null;
  realEvents: number;
  oddsFeedLive: boolean;
}
