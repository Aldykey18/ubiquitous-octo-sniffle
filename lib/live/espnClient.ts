// ============================================================
// COLLECTEUR ESPN (exécuté dans le NAVIGATEUR de l'utilisateur)
// L'API publique ESPN est gratuite, sans clé et CORS-ouverte.
// Le sandbox serveur n'a pas d'accès internet sortant : c'est
// donc le navigateur qui collecte les VRAIES données réelles,
// puis les envoie au moteur (/api/ingest) pour les calculs.
//
// Aucun contournement : uniquement l'API publique officielle.
// ============================================================

export interface EspnSourceReport {
  league: string;
  sport: string;
  ok: boolean;
  events: number;
  detail: string;
}

export interface EspnOddsInfo {
  provider?: string;
  details?: string;
  overUnder?: number;
  spread?: number;
  homeMoneyLineAmerican?: number;
  awayMoneyLineAmerican?: number;
}

export interface IngestTeam {
  name: string;
  short: string;
  logo?: string;
  record?: string;
  rating?: number;   // calculé depuis les vrais classements
  attack?: number;
  defense?: number;
}

export interface IngestEvent {
  uid: string;
  sport: string;
  league: string;
  leagueName: string;
  home: IngestTeam;
  away: IngestTeam;
  startTime: string; // ISO
  status: "upcoming" | "live" | "finished";
  minute?: number;
  scoreHome?: number;
  scoreAway?: number;
  venue?: string;
  odds?: EspnOddsInfo | null;
}

const ESPN = "https://site.api.espn.com/apis";
const TIMEOUT = 9000;

async function getJson(url: string): Promise<any> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), TIMEOUT);
  try {
    const res = await fetch(url, { signal: ctrl.signal });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } finally {
    clearTimeout(t);
  }
}

// ---------- Config des ligues ----------
export const SOCCER_LEAGUES = [
  { slug: "eng.1", name: "Premier League" },
  { slug: "esp.1", name: "LaLiga" },
  { slug: "ger.1", name: "Bundesliga" },
  { slug: "ita.1", name: "Serie A" },
  { slug: "fra.1", name: "Ligue 1" },
  { slug: "uefa.champions", name: "Ligue des Champions" },
  { slug: "uefa.europa", name: "Europa League" },
  { slug: "por.1", name: "Liga Portugal" },
  { slug: "ned.1", name: "Eredivisie" },
  { slug: "usa.1", name: "MLS" }
];

export const US_LEAGUES = [
  { sport: "basketball", slug: "nba", name: "NBA" },
  { sport: "baseball", slug: "mlb", name: "MLB" },
  { sport: "hockey", slug: "nhl", name: "NHL" }
];

export const OTHER_LEAGUES = [
  { sport: "tennis", slug: "atp", name: "ATP" },
  { sport: "tennis", slug: "wta", name: "WTA" },
  { sport: "mma", slug: "ufc", name: "UFC" }
];

// ---------- Classements réels → vraies notes d'équipes ----------
type TableInfo = {
  games: number;
  wins: number;
  losses: number;
  ties: number;
  pointsFor: number;
  pointsAgainst: number;
  winPct: number;
};

const standingsCache = new Map<string, { at: number; data: Record<string, TableInfo> }>();
const SIX_HOURS = 6 * 3600 * 1000;

function statVal(stats: any[], ...names: string[]): number {
  for (const n of names) {
    const s = stats?.find((x: any) => x.name === n || x.type === n);
    if (s && typeof s.value === "number") return s.value;
  }
  return 0;
}

export async function fetchStandings(sport: string, leagueSlug: string): Promise<Record<string, TableInfo>> {
  const key = `${sport}:${leagueSlug}`;
  const cached = standingsCache.get(key);
  if (cached && Date.now() - cached.at < SIX_HOURS) return cached.data;

  const path = sport === "soccer"
    ? `${ESPN}/v2/sports/soccer/${leagueSlug}/standings`
    : `${ESPN}/v2/sports/${sport}/${leagueSlug}/standings`;

  const data = await getJson(path);
  const out: Record<string, TableInfo> = {};
  const groups = data?.children ?? (data?.standings ? [data] : []);
  for (const g of groups) {
    for (const entry of g?.standings?.entries ?? []) {
      const teamName = entry?.team?.displayName ?? entry?.team?.name;
      if (!teamName) continue;
      const stats = entry.stats ?? [];
      const games = statVal(stats, "gamesPlayed", "games");
      const wins = statVal(stats, "wins");
      const losses = statVal(stats, "losses");
      const ties = statVal(stats, "ties", "draws");
      const pointsFor = statVal(stats, "pointsFor");
      const pointsAgainst = statVal(stats, "pointsAgainst");
      let winPct = statVal(stats, "winPercent");
      if (!winPct && games > 0) winPct = (wins + ties * 0.5) / games;
      out[teamName] = { games, wins, losses, ties, pointsFor, pointsAgainst, winPct };
      if (entry?.team?.abbreviation) out[`abbr:${entry.team.abbreviation}`] = out[teamName];
    }
  }
  standingsCache.set(key, { at: Date.now(), data: out });
  return out;
}

/**
 * VRAIES notes calculées depuis le classement réel :
 * attaque = buts marqués/match vs moyenne ligue, défense idem,
 * rating global = points/match + différence de buts.
 */
export function soccerRatings(table: Record<string, TableInfo>) {
  const rows = Object.entries(table).filter(([k]) => !k.startsWith("abbr:"));
  const totGames = rows.reduce((s, [, r]) => s + r.games, 0);
  const totGoals = rows.reduce((s, [, r]) => s + r.pointsFor, 0);
  const leagueAvgG = totGames > 0 ? totGoals / (totGames / 2) : 1.35; // buts/match/équipe
  const clampN = (v: number) => Math.min(96, Math.max(22, v));

  const ratings: Record<string, { attack: number; defense: number; rating: number }> = {};
  for (const [name, r] of rows) {
    if (!r.games) continue;
    const gf = r.pointsFor / r.games;
    const ga = r.pointsAgainst / r.games;
    const ppg = (r.wins * 3 + r.ties) / r.games;
    const attack = clampN(50 + ((gf - leagueAvgG) / Math.max(0.4, leagueAvgG)) * 46);
    const defense = clampN(50 - ((ga - leagueAvgG) / Math.max(0.4, leagueAvgG)) * 46);
    const rating = clampN(42 + ppg * 14 + (gf - ga) * 5.5);
    ratings[name] = { attack: Math.round(attack), defense: Math.round(defense), rating: Math.round(rating) };
  }
  return ratings;
}

/** Note basée sur le % de victoires réel (NBA/MLB/NHL). */
export function winPctRatings(table: Record<string, TableInfo>) {
  const ratings: Record<string, { attack: number; defense: number; rating: number }> = {};
  for (const [name, r] of Object.entries(table)) {
    if (name.startsWith("abbr:") || !r.games) continue;
    const rating = Math.round(Math.min(95, Math.max(25, 30 + r.winPct * 62)));
    ratings[name] = { attack: rating, defense: rating, rating };
  }
  return ratings;
}

// ---------- Normalisation scoreboard ----------
function americanToDecimal(ml?: number): number | undefined {
  if (!ml) return undefined;
  return ml > 0 ? 1 + ml / 100 : 1 + 100 / Math.abs(ml);
}

function normalizeEvent(ev: any, sport: string, leagueName: string): IngestEvent | null {
  const comp = ev?.competitions?.[0];
  if (!comp) return null;
  const competitors = comp.competitors ?? [];
  const homeC = competitors.find((c: any) => c.homeAway === "home") ?? competitors[0];
  const awayC = competitors.find((c: any) => c.homeAway === "away") ?? competitors[1];
  if (!homeC || !awayC) return null;

  const state = ev?.status?.type?.state;
  const status = state === "in" ? "live" : state === "post" ? "finished" : "upcoming";

  const side = (c: any): IngestTeam => ({
    name: c.team?.displayName ?? c.team?.name ?? "?",
    short: c.team?.abbreviation ?? c.team?.shortDisplayName ?? "?",
    logo: c.team?.logo ?? c.team?.logos?.[0]?.href,
    record: c.records?.find((r: any) => r.type === "total" || r.type === "All Splits")?.summary
  });

  const oddsRaw = comp.odds?.[0];
  const odds: EspnOddsInfo | null = oddsRaw
    ? {
        provider: oddsRaw.provider?.name,
        details: oddsRaw.details,
        overUnder: oddsRaw.overUnder,
        spread: oddsRaw.spread,
        homeMoneyLineAmerican: oddsRaw.homeTeamOdds?.moneyLine,
        awayMoneyLineAmerican: oddsRaw.awayTeamOdds?.moneyLine
      }
    : null;

  let minute: number | undefined;
  if (status === "live") {
    const clock = String(ev?.status?.displayClock ?? "");
    const m = clock.match(/(\d+)/);
    if (m) minute = Number(m[1]);
  }

  return {
    uid: `espn-${sport}-${ev.id}`,
    sport,
    league: leagueName,
    leagueName,
    home: side(homeC),
    away: side(awayC),
    startTime: ev.date ?? new Date().toISOString(),
    status,
    minute,
    scoreHome: homeC.score != null ? Number(homeC.score) : undefined,
    scoreAway: awayC.score != null ? Number(awayC.score) : undefined,
    venue: comp.venue?.fullName,
    odds
  };
}

// ---------- Collecte complète ----------
export interface CollectResult {
  events: IngestEvent[];
  reports: EspnSourceReport[];
  oddsFeedAvailable: boolean;
}

export async function collectAll(onProgress?: (msg: string) => void): Promise<CollectResult> {
  const events: IngestEvent[] = [];
  const reports: EspnSourceReport[] = [];
  const today = new Date();
  const ymd = today.toISOString().slice(0, 10).replace(/-/g, "");

  // ⚽ Football : scoreboard + vrais classements → vraies notes
  const soccerRatingsByLeague = new Map<string, ReturnType<typeof soccerRatings>>();
  for (const lg of SOCCER_LEAGUES) {
    try {
      onProgress?.(`Football — ${lg.name}…`);
      const [sb, table] = await Promise.all([
        getJson(`${ESPN}/site/v2/sports/soccer/${lg.slug}/scoreboard`),
        fetchStandings("soccer", lg.slug).catch(() => ({}))
      ]);
      const ratings = soccerRatings(table);
      soccerRatingsByLeague.set(lg.slug, ratings);
      const evs = (sb?.events ?? [])
        .map((ev: any) => normalizeEvent(ev, "football", lg.name))
        .filter(Boolean) as IngestEvent[];
      for (const e of evs) {
        const rh = ratings[e.home.name];
        const ra = ratings[e.away.name];
        if (rh) { e.home.attack = rh.attack; e.home.defense = rh.defense; e.home.rating = rh.rating; }
        if (ra) { e.away.attack = ra.attack; e.away.defense = ra.defense; e.away.rating = ra.rating; }
      }
      events.push(...evs);
      reports.push({ league: lg.name, sport: "football", ok: true, events: evs.length, detail: Object.keys(ratings).length ? "classement OK" : "classement vide" });
    } catch (err: any) {
      reports.push({ league: lg.name, sport: "football", ok: false, events: 0, detail: String(err?.message ?? err) });
    }
  }

  // 🏀⚾🏒 Ligues US : scoreboard (avec VRAIES cotes ESPN intégrées) + classements
  for (const lg of US_LEAGUES) {
    try {
      onProgress?.(`${lg.name}…`);
      const [sb, table] = await Promise.all([
        getJson(`${ESPN}/site/v2/sports/${lg.sport}/${lg.slug}/scoreboard`),
        fetchStandings(lg.sport, lg.slug).catch(() => ({}))
      ]);
      const ratings = winPctRatings(table);
      const evs = (sb?.events ?? [])
        .map((ev: any) => normalizeEvent(ev, lg.sport, lg.name))
        .filter(Boolean) as IngestEvent[];
      for (const e of evs) {
        const rh = ratings[e.home.name];
        const ra = ratings[e.away.name];
        if (rh) { e.home.attack = rh.attack; e.home.defense = rh.defense; e.home.rating = rh.rating; }
        if (ra) { e.away.attack = ra.attack; e.away.defense = ra.defense; e.away.rating = ra.rating; }
      }
      events.push(...evs);
      reports.push({
        league: lg.name, sport: lg.sport, ok: true, events: evs.length,
        detail: evs.some(e => e.odds) ? "cotes réelles ESPN ✓" : "sans cotes"
      });
    } catch (err: any) {
      reports.push({ league: lg.name, sport: lg.sport, ok: false, events: 0, detail: String(err?.message ?? err) });
    }
  }

  // 🎾🥊 Tennis / MMA : événements uniquement (pas de classement fiable)
  for (const lg of OTHER_LEAGUES) {
    try {
      onProgress?.(`${lg.name}…`);
      const path = lg.sport === "tennis"
        ? `${ESPN}/site/v2/sports/tennis/${lg.slug}/scoreboard?dates=${ymd}`
        : `${ESPN}/site/v2/sports/mma/${lg.slug}/scoreboard`;
      const sb = await getJson(path);
      const evs = (sb?.events ?? [])
        .map((ev: any) => normalizeEvent(ev, lg.sport, lg.name))
        .filter(Boolean) as IngestEvent[];
      events.push(...evs);
      reports.push({ league: lg.name, sport: lg.sport, ok: true, events: evs.length, detail: "événements seuls (stats limitées)" });
    } catch (err: any) {
      reports.push({ league: lg.name, sport: lg.sport, ok: false, events: 0, detail: String(err?.message ?? err) });
    }
  }

  const oddsFeedAvailable = events.some(e => e.odds?.homeMoneyLineAmerican || e.odds?.awayMoneyLineAmerican);
  return { events, reports, oddsFeedAvailable };
}

export { americanToDecimal };
