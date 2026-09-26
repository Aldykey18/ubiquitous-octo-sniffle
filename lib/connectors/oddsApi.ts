// ============================================================
// CONNECTEUR THE ODDS API (https://the-odds-api.com)
// Fournit les COTES RÉELLES — indispensable pour le Value Engine.
// La clé est lue côté serveur uniquement (process.env.ODDS_API_KEY),
// jamais exposée au frontend. Sans clé : les événements sans
// cotes réelles sont exclus du classement value (pas d'invention).
// ============================================================

const SPORT_KEYS: Record<string, string> = {
  football: "soccer_epl",
  basketball: "basketball_nba",
  tennis: "tennis_atp",
  baseball: "baseball_mlb",
  hockey: "icehockey_nhl"
};

export interface OddsApiMarket {
  eventName: string;
  homeTeam: string;
  awayTeam: string;
  commenceTime: string;
  selection: string;
  price: number;
}

export function oddsApiConfigured(): boolean {
  return Boolean(process.env.ODDS_API_KEY);
}

export async function fetchOdds(sport: keyof typeof SPORT_KEYS): Promise<OddsApiMarket[]> {
  const key = process.env.ODDS_API_KEY;
  if (!key) throw new Error("ODDS_API_KEY absente");
  const url =
    `https://api.the-odds-api.com/v4/sports/${SPORT_KEYS[sport]}/odds/` +
    `?apiKey=${encodeURIComponent(key)}&regions=eu&markets=h2h,totals&oddsFormat=decimal`;
  const res = await fetch(url, { next: { revalidate: 120 } as any });
  if (!res.ok) throw new Error(`The Odds API HTTP ${res.status}`);
  const data = await res.json();
  const out: OddsApiMarket[] = [];
  for (const ev of data ?? []) {
    for (const bm of ev.bookmakers ?? []) {
      for (const mk of bm.markets ?? []) {
        for (const sel of mk.outcomes ?? []) {
          out.push({
            eventName: ev.sport_title,
            homeTeam: ev.home_team,
            awayTeam: ev.away_team,
            commenceTime: ev.commence_time,
            selection: sel.name,
            price: sel.price
          });
        }
      }
    }
  }
  return out;
}
