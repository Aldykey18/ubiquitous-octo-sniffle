// ============================================================
// CONNECTEUR ESPN (API publique, sans clé)
// Récupère les événements réels du jour pour chaque sport.
// Jamais appelé depuis le frontend — uniquement par le serveur.
// Si la source est injoignable, le moteur repasse sur le jeu
// de démonstration et l'état de la source est affiché dans
// l'admin (aucun contournement de restriction, jamais).
// ============================================================

import { Sport, SportEvent, SideContext } from "../types";

const ESPN_LEAGUES: Record<Sport, string[]> = {
  football: ["eng.1", "esp.1", "fra.1", "ger.1", "ita.1", "uefa.champions"],
  basketball: ["nba"],
  tennis: ["atp", "wta"],
  baseball: ["mlb"],
  hockey: ["nhl"],
  volleyball: [],
  mma: ["ufc"]
};

const BASE = "https://site.api.espn.com/apis/site/v2/sports";

const emptyCtx = (): SideContext => ({
  restDays: 3, absences: [], travelKm: 0, formLast5: [], formLast10: [],
  avgScored: 0, avgConceded: 0, xgPerGame: 0, xgaPerGame: 0,
  shotsPerGame: 0, shotsOnTargetPerGame: 0, possession: undefined
});

async function fetchJson(url: string, timeoutMs = 8000): Promise<any> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, { signal: ctrl.signal });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } finally {
    clearTimeout(t);
  }
}

export async function fetchEspnEvents(sport: Sport, now = new Date()): Promise<SportEvent[]> {
  const leagues = ESPN_LEAGUES[sport] ?? [];
  const out: SportEvent[] = [];

  for (const league of leagues) {
    const path = sport === "tennis"
      ? `${BASE}/tennis/${league}/scoreboard`
      : `${BASE}/${sport === "football" ? "soccer" : sport}/${league}/scoreboard`;
    const data = await fetchJson(path);
    const events = data?.events ?? [];

    for (const ev of events) {
      const comp = ev.competitions?.[0];
      if (!comp) continue;
      const competitors = comp.competitors ?? [];
      const home = competitors.find((c: any) => c.homeAway === "home") ?? competitors[0];
      const away = competitors.find((c: any) => c.homeAway === "away") ?? competitors[1];
      if (!home || !away) continue;

      const status: SportEvent["status"] =
        ev.status?.type?.state === "in" ? "live"
        : ev.status?.type?.state === "post" ? "finished"
        : "upcoming";

      const side = (c: any) => ({
        name: c.team?.displayName ?? "?",
        short: c.team?.abbreviation ?? "?",
        attack: 75, defense: 75, pace: 75, rating: 75 // ratings indisponibles côté ESPN → Data Quality abaissé
      });

      out.push({
        id: `espn-${ev.id}`,
        sport,
        league: league.toUpperCase(),
        country: "",
        home: side(home),
        away: side(away),
        startTime: ev.date ?? now.toISOString(),
        status,
        minute: undefined,
        scoreHome: home.score ? Number(home.score) : undefined,
        scoreAway: away.score ? Number(away.score) : undefined,
        stakes: 5,
        isDerby: false,
        contextHome: emptyCtx(),
        contextAway: emptyCtx(),
        h2h: { homeWins: 0, draws: 0, awayWins: 0, lastScores: [] },
        advancedAvailable: false,
        lineupsAvailable: false,
        dataSource: "espn"
      });
    }
  }
  return out;
}

/** Test de connectivité (utilisé par l'admin / le status). */
export async function pingEspn(): Promise<{ ok: boolean; detail: string }> {
  try {
    const data = await fetchJson(`${BASE}/basketball/nba/scoreboard`, 6000);
    return { ok: true, detail: `${data?.events?.length ?? 0} événements NBA visibles` };
  } catch (err: any) {
    return { ok: false, detail: err?.message ?? "inaccessible" };
  }
}
