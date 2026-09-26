// ============================================================
// STORE CENTRAL (server-side)
// PIPELINE : COLLECTE → NORMALISATION → ANALYSE → PROBABILITÉ →
// VALUE → RISQUE → CORRÉLATION → CLASSEMENT → MEILLEURES PRÉDICTIONS
//
// MODE LIVE (défaut) :
//   Le navigateur collecte les VRAIES données (API publique ESPN,
//   gratuite et sans clé) puis les POSTe sur /api/ingest.
//   Le moteur calcule ensuite les probabilités réelles (Poisson
//   sur les vrais classements) et la value contre les cotes réelles
//   quand elles existent (ESPN odds intégrés).
// MODE DEMO :
//   Jeu de données 100 % fictif clairement identifié (fallback).
// ============================================================

import fs from "fs";
import path from "path";
import { EngineState, Alert, SportEvent, Market, StatusPayload, CollectorReport, TeamSide } from "./types";
import { buildDemoDay, driftOdds } from "./demo/generator";
import { buildRealMarkets } from "./engines/marketBuilder";
import { runPipeline } from "./engines/pipeline";
import { generateBacktestRecords, computeBacktestReport, learnFromRecords } from "./engines/backtest";
import { oddsApiConfigured } from "./connectors/oddsApi";
import { seededRng, todaySeed } from "./utils";

const RUNTIME_DIR = path.join(process.cwd(), "data", "runtime");
const STATE_FILE = path.join(RUNTIME_DIR, "state.json");
const SYNC_INTERVAL_SEC = Number(process.env.VBM_SYNC_INTERVAL || 45);

type Store = {
  state: EngineState;
  trueProbs: Record<string, number>;
  backtestCache: ReturnType<typeof computeBacktestReport> | null;
  recordsCache: ReturnType<typeof generateBacktestRecords> | null;
  timer: ReturnType<typeof setInterval> | null;
  busy: boolean;
};

declare global {
  // eslint-disable-next-line no-var
  var __vbmStore: Store | undefined;
}

function baseSources() {
  return [
    { name: "ESPN API publique (via navigateur)", type: "connector" as const, status: "disabled" as const, detail: "En attente de la première collecte", lastCheck: null },
    { name: "Cotes réelles ESPN (sports US)", type: "connector" as const, status: "disabled" as const, detail: "Activées dès que disponibles", lastCheck: null },
    { name: "The Odds API", type: "connector" as const, status: (oddsApiConfigured() ? "ok" : "disabled") as any, detail: oddsApiConfigured() ? "Clé configurée (server-side)" : "Sans clé — source de cotes supplémentaire optionnelle", lastCheck: null },
    { name: "Backtest historique", type: "demo" as const, status: "active" as const, detail: "2 600 prédictions résolues (fenêtre 90 jours)", lastCheck: new Date().toISOString() },
    { name: "Demo Engine (fictif)", type: "demo" as const, status: "disabled" as const, detail: "Fallback — activable dans l'admin", lastCheck: null }
  ];
}

export function getStore(): Store {
  if (global.__vbmStore) return global.__vbmStore;

  const records = generateBacktestRecords();
  const learning = learnFromRecords(records);
  const demoMode = (process.env.VBM_DATA_MODE as any) === "demo";
  const day = demoMode ? buildDemoDay() : { events: [] as SportEvent[], markets: [] as Market[], trueProbs: {} };

  const state: EngineState = {
    mode: demoMode ? "demo" : "live",
    dateSeed: todaySeed(),
    lastSync: new Date().toISOString(),
    syncCount: 0,
    events: day.events,
    markets: day.markets,
    predictions: [],
    alerts: [],
    sources: baseSources(),
    learning,
    noBet: false,
    noBetReason: null,
    lastIngest: undefined,
    collectorReports: [],
    oddsFeedLive: false
  };

  const store: Store = {
    state,
    trueProbs: day.trueProbs,
    backtestCache: computeBacktestReport(records),
    recordsCache: records,
    timer: null,
    busy: false
  };

  // Restauration éventuelle (même journée déjà entamée)
  try {
    if (fs.existsSync(STATE_FILE)) {
      const raw = JSON.parse(fs.readFileSync(STATE_FILE, "utf8"));
      if (raw?.dateSeed === todaySeed()) {
        store.state = {
          ...state,
          ...raw,
          sources: baseSources(),
          mode: state.mode,
          collectorReports: raw.collectorReports ?? []
        };
        store.trueProbs = raw.trueProbs ?? day.trueProbs;
      }
    }
  } catch { /* fichier corrompu → on repart à neuf */ }

  if (store.state.events.length) runAnalysis(store);
  global.__vbmStore = store;
  startSyncLoop(store);
  return store;
}

// ---------- Pipeline d'analyse ----------
function oddsFeedActive(store: Store): boolean {
  // Démo : cotes simulées d'un bookmaker → value engine actif.
  // Live : value engine actif seulement si des cotes RÉELLES existent
  // (ESPN odds intégrés ou The Odds API), sinon mode FAIR.
  if (store.state.mode === "demo") return true;
  return Boolean(store.state.oddsFeedLive) || oddsApiConfigured();
}

function runAnalysis(store: Store) {
  const { state } = store;
  const out = runPipeline({
    events: state.events,
    markets: state.markets,
    lastSyncIso: state.lastSync,
    learning: state.learning,
    oddsFeed: oddsFeedActive(store)
  });
  state.predictions = out.predictions;
  state.noBet = out.noBet;
  state.noBetReason = out.noBet
    ? state.mode === "live" && !state.lastIngest
      ? "⏳ En attente de la collecte des matchs réels (le navigateur interroge l'API publique ESPN au chargement de la page, puis le moteur calcule)."
      : state.mode === "live" && !oddsFeedActive(store)
        ? "Aucun scénario nettement dominant (probabilité ≥ 52 %, confiance ≥ 75) sur les matchs réels du jour. Sans cotes bookmaker connectées, le moteur n'affiche que des prédictions à forte probabilité — jamais de value inventée."
        : "Aucun marché ne présente actuellement un avantage statistique suffisamment robuste. Le moteur recommande d'attendre de nouvelles données ou mouvements de marché."
    : null;
  persist(store);
}

// ---------- INGESTION DES DONNÉES RÉELLES (depuis le navigateur) ----------
export function ingestRealEvents(
  rawEvents: any[],
  reports: CollectorReport[],
  oddsFeedAvailable: boolean
): { accepted: number; predictions: number; noBet: boolean } {
  const store = getStore();
  const now = new Date();

  const toSide = (t: any): TeamSide => ({
    name: String(t?.name ?? "?"),
    short: String(t?.short ?? "?"),
    attack: Number(t?.attack ?? 0) || 0,
    defense: Number(t?.defense ?? 0) || 0,
    pace: 75,
    rating: Number(t?.rating ?? 0) || 0,
    record: t?.record,
    logo: t?.logo
  });

  const events: SportEvent[] = [];
  const markets: Market[] = [];
  const trueProbs: Record<string, number> = {};

  for (const r of rawEvents) {
    if (!r?.home?.name || !r?.away?.name || !r?.startTime) continue;
    const e: SportEvent = {
      id: String(r.uid),
      sport: r.sport,
      league: String(r.leagueName ?? r.league ?? ""),
      country: "",
      home: toSide(r.home),
      away: toSide(r.away),
      startTime: String(r.startTime),
      status: r.status === "live" ? "live" : r.status === "finished" ? "finished" : "upcoming",
      minute: r.minute,
      scoreHome: r.scoreHome,
      scoreAway: r.scoreAway,
      stakes: 5,
      isDerby: false,
      contextHome: emptyCtx(),
      contextAway: emptyCtx(),
      h2h: { homeWins: 0, draws: 0, awayWins: 0, lastScores: [] },
      advancedAvailable: false,
      lineupsAvailable: false,
      dataSource: "espn",
      oddsInfo: r.odds ?? null
    };
    events.push(e);

    const built = buildRealMarkets(e);
    markets.push(...built.markets);
    Object.assign(trueProbs, built.trueProbs);
  }

  // On remplace le jeu live (les matchs d'hier disparaissent d'eux-mêmes)
  store.state.events = events;
  store.state.markets = markets;
  store.trueProbs = trueProbs;
  store.state.lastIngest = now.toISOString();
  store.state.lastSync = now.toISOString();
  store.state.collectorReports = reports;
  store.state.oddsFeedLive = Boolean(oddsFeedAvailable);

  // Statut des sources
  const espn = store.state.sources.find(s => s.name.startsWith("ESPN API"));
  if (espn) {
    const okCount = reports.filter(r => r.ok).length;
    espn.status = okCount ? "ok" : "error";
    espn.detail = `${okCount}/${reports.length} ligues OK · ${events.length} matchs réels · ${markets.length} marchés`;
    espn.lastCheck = now.toISOString();
  }
  const oddsSrc = store.state.sources.find(s => s.name.startsWith("Cotes réelles ESPN"));
  if (oddsSrc) {
    oddsSrc.status = oddsFeedAvailable ? "ok" : "disabled";
    oddsSrc.detail = oddsFeedAvailable ? "Moneylines/spreads/totaux ESPN actifs" : "Pas de cotes sur les matchs du jour";
    oddsSrc.lastCheck = now.toISOString();
  }

  const prevIds = new Set(store.state.predictions.map(p => p.id));
  runAnalysis(store);

  // Alerte quand de nouveaux picks réels apparaissent
  for (const p of store.state.predictions) {
    if (!prevIds.has(p.id)) {
      pushAlert(store, {
        kind: "NEW_VALUE",
        title: "🆕 NOUVEAU PICK RÉEL",
        body: `${p.event.home.name} vs ${p.event.away.name} — ${p.market.label} « ${p.market.selection} » · proba ${(p.modelProb * 100).toFixed(0)} % · confiance ${p.confidence}/100.`,
        eventId: p.event.id
      });
    }
  }

  return { accepted: events.length, predictions: store.state.predictions.length, noBet: store.state.noBet };
}

function emptyCtx() {
  return {
    restDays: 3, absences: [], travelKm: 0, formLast5: [], formLast10: [],
    avgScored: 0, avgConceded: 0, xgPerGame: 0, xgaPerGame: 0,
    shotsPerGame: 0, shotsOnTargetPerGame: 0, possession: undefined
  };
}

// ---------- Alertes ----------
function pushAlert(store: Store, a: Omit<Alert, "id" | "createdAt" | "read">) {
  const dup = store.state.alerts.some(
    x => x.title === a.title && x.body === a.body && Date.now() - new Date(x.createdAt).getTime() < 600000
  );
  if (dup) return;
  store.state.alerts.unshift({
    ...a,
    id: `al-${Date.now()}-${Math.floor(Math.random() * 1e5)}`,
    createdAt: new Date().toISOString(),
    read: false
  });
  if (store.state.alerts.length > 30) store.state.alerts.pop();
}

// ---------- Synchronisation périodique ----------
async function sync(store: Store, manual = false) {
  if (store.busy) return;
  store.busy = true;
  try {
    const now = new Date();

    if (store.state.mode === "demo") {
      // --- MODE DÉMO : vie simulée du jeu fictif ---
      const rng = seededRng(`sync-${store.state.dateSeed}-${store.state.syncCount}`);
      const prevEv = new Map(store.state.predictions.map(p => [p.market.id, p.ev]));

      if (store.state.dateSeed !== todaySeed(now)) {
        const day = buildDemoDay(now);
        store.state.dateSeed = todaySeed(now);
        store.state.events = day.events;
        store.state.markets = day.markets;
        store.trueProbs = day.trueProbs;
        pushAlert(store, { kind: "SYSTEM", title: "📅 Nouvelle journée (démo)", body: "Le jeu de données fictif du jour a été régénéré." });
      }

      for (const m of store.state.markets) {
        const big = rng() < 0.05;
        const delta = driftOdds(m, rng, big);
        if (Math.abs(delta) >= 0.10) {
          pushAlert(store, {
            kind: "ODDS_MOVE",
            title: "📉 Mouvement de cote détecté",
            body: `${m.label} — « ${m.selection} » : ${delta > 0 ? "+" : ""}${delta.toFixed(2)} → cote ${m.odds.toFixed(2)}`,
            eventId: m.eventId
          });
        }
      }

      for (const e of store.state.events) {
        if (e.status === "live") {
          if (e.sport === "football" || e.sport === "hockey") {
            e.minute = Math.min(90, (e.minute ?? 0) + 1 + Math.floor(rng() * 2));
            if (rng() < 0.05) {
              if (rng() < 0.5) e.scoreHome = (e.scoreHome ?? 0) + 1;
              else e.scoreAway = (e.scoreAway ?? 0) + 1;
            }
            if (e.minute >= 90) e.status = "finished";
          } else if (rng() < 0.02) e.status = "finished";
        } else if (e.status === "upcoming" && new Date(e.startTime) <= now) {
          e.status = "live";
          e.minute = 1;
          e.scoreHome = 0;
          e.scoreAway = 0;
          pushAlert(store, { kind: "MATCH_START", title: "🟢 Coup d'envoi", body: `${e.home.name} vs ${e.away.name} (${e.league}) vient de commencer.`, eventId: e.id });
        }
      }

      store.state.lastSync = now.toISOString();
      store.state.syncCount++;
      runAnalysis(store);

      for (const p of store.state.predictions) {
        const before = prevEv.get(p.market.id);
        if (before !== undefined && p.ev - before >= 0.04 && p.ev >= 0.08) {
          pushAlert(store, {
            kind: "NEW_VALUE",
            title: "🔥 NEW VALUE DETECTED",
            body: `${p.event.home.name} vs ${p.event.away.name} — ${p.market.label} « ${p.market.selection} » : EV ${(before * 100).toFixed(0)} % → ${(p.ev * 100).toFixed(0)} %.`,
            eventId: p.event.id
          });
        }
      }
      if (store.state.noBet && prevEv.size > 0) {
        pushAlert(store, { kind: "NO_BET", title: "🛑 NO BET", body: "Plus aucune sélection ne passe les seuils de qualité." });
      }
    } else {
      // --- MODE LIVE : les données réelles arrivent par /api/ingest ---
      // La sync périodique rafraîchit juste la fraîcheur des calculs.
      store.state.lastSync = now.toISOString();
      store.state.syncCount++;
      if (store.state.events.length) runAnalysis(store);
    }

    if (manual) persist(store);
  } finally {
    store.busy = false;
  }
}

function startSyncLoop(store: Store) {
  if (store.timer) clearInterval(store.timer);
  store.timer = setInterval(() => { void sync(store); }, SYNC_INTERVAL_SEC * 1000);
  const t: any = store.timer;
  if (t && typeof t.unref === "function") t.unref();
}

export async function forceSync() {
  const store = getStore();
  await sync(store, true);
}

// ---------- Persistance ----------
function persist(store: Store) {
  try {
    fs.mkdirSync(RUNTIME_DIR, { recursive: true });
    const s = store.state;
    fs.writeFileSync(STATE_FILE, JSON.stringify({
      dateSeed: s.dateSeed, lastSync: s.lastSync, syncCount: s.syncCount,
      events: s.events, markets: s.markets,
      alerts: s.alerts.slice(0, 30), learning: s.learning,
      noBet: s.noBet, noBetReason: s.noBetReason,
      trueProbs: store.trueProbs,
      lastIngest: s.lastIngest, collectorReports: s.collectorReports,
      oddsFeedLive: s.oddsFeedLive, mode: s.mode
    }));
  } catch { /* non bloquant */ }
}

// ---------- API publiques du store ----------
export function getStatus(): StatusPayload {
  const store = getStore();
  const s = store.state;
  return {
    mode: s.mode,
    lastSync: s.lastSync,
    serverNow: new Date().toISOString(),
    eventsToday: s.events.length,
    liveNow: s.events.filter(e => e.status === "live").length,
    predictionsCount: s.predictions.length,
    noBet: s.noBet,
    sources: s.sources,
    alertsUnread: s.alerts.filter(a => !a.read).length,
    learningVersion: s.learning.version,
    demoMode: s.mode === "demo",
    lastIngest: s.lastIngest ?? null,
    realEvents: s.events.filter(e => e.dataSource === "espn").length,
    oddsFeedLive: Boolean(s.oddsFeedLive)
  };
}

export function markAlertsRead() {
  const store = getStore();
  store.state.alerts.forEach(a => (a.read = true));
  persist(store);
}

export function getBacktestReport() {
  const store = getStore();
  return store.backtestCache ?? computeBacktestReport(generateBacktestRecords());
}

export function getBacktestRecords(limit = 40) {
  const store = getStore();
  const records = store.recordsCache ?? generateBacktestRecords();
  return records.slice(0, limit);
}

export function setMode(mode: "demo" | "live") {
  const store = getStore();
  store.state.mode = mode;
  if (mode === "demo") {
    const day = buildDemoDay();
    store.state.events = day.events;
    store.state.markets = day.markets;
    store.trueProbs = day.trueProbs;
    const demo = store.state.sources.find(s => s.name.startsWith("Demo Engine"));
    if (demo) demo.status = "active";
  } else {
    // Live : on repart sur les données réelles (re-collecte par le navigateur)
    store.state.events = [];
    store.state.markets = [];
    store.state.predictions = [];
    store.trueProbs = {};
    store.state.lastIngest = undefined;
    const demo = store.state.sources.find(s => s.name.startsWith("Demo Engine"));
    if (demo) demo.status = "disabled";
  }
  runAnalysis(store);
  persist(store);
}

export function resetData() {
  try { fs.rmSync(STATE_FILE, { force: true }); } catch {}
  const store = getStore();
  store.state.dateSeed = todaySeed();
  store.state.alerts = [];
  store.state.syncCount = 0;
  store.state.lastSync = new Date().toISOString();
  if (store.state.mode === "demo") {
    const day = buildDemoDay();
    store.state.events = day.events;
    store.state.markets = day.markets;
    store.trueProbs = day.trueProbs;
    runAnalysis(store);
  } else {
    store.state.events = [];
    store.state.markets = [];
    store.state.predictions = [];
    store.trueProbs = {};
    store.state.lastIngest = undefined;
    runAnalysis(store);
  }
}

export function getRejectedStats() {
  const store = getStore();
  return runPipeline({
    events: store.state.events,
    markets: store.state.markets,
    lastSyncIso: store.state.lastSync,
    learning: store.state.learning,
    oddsFeed: oddsFeedActive(store)
  }).rejected;
}
