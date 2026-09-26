// ============================================================
// UNIVERS DE DÉMONSTRATION — 100% fictif.
// Ces équipes/joueurs N'EXISTENT PAS : ils servent uniquement à
// développer et illustrer le moteur tant qu'aucune API réelle
// n'est connectée (voir lib/connectors/*).
// ============================================================

export interface DemoTeam {
  name: string;
  short: string;
  attack: number;
  defense: number;
  pace: number;
}

function team(name: string, short: string, attack: number, defense: number, pace: number): DemoTeam {
  return { name, short, attack, defense, pace };
}

export const DEMO_FOOTBALL: { league: string; country: string; teams: DemoTeam[] }[] = [
  {
    league: "Premier Division",
    country: "Angleterre",
    teams: [
      team("Northbridge FC", "NOR", 88, 84, 82),
      team("Azur United", "AZU", 85, 78, 86),
      team("Redstone Rovers", "RED", 79, 81, 74),
      team("Silvergate City", "SIL", 82, 74, 88),
      team("Ironhaven SC", "IRO", 72, 85, 68),
      team("Westbay Albion", "WES", 76, 72, 79)
    ]
  },
  {
    league: "Liga Nacional",
    country: "Espagne",
    teams: [
      team("Real Dorado", "DOR", 90, 82, 84),
      team("Atlético Miraflores", "MIR", 81, 86, 76),
      team("CD Lucero", "LUC", 77, 75, 80),
      team("Racing Vandeverde", "VAN", 74, 71, 82)
    ]
  },
  {
    league: "Ligue Atlantique",
    country: "France",
    teams: [
      team("Olympique Rivage", "RIV", 84, 80, 83),
      team("FC Montclair", "MON", 78, 83, 72),
      team("Stade Vermillon", "VER", 80, 76, 81),
      team("AS Boréal", "BOR", 71, 74, 77)
    ]
  }
];

export const DEMO_BASKETBALL = [
  team("Harbor City Hawks", "HAW", 86, 79, 90),
  team("Summit Peaks", "SUM", 83, 84, 82),
  team("Delta Lightning", "DEL", 88, 74, 93),
  team("Granite Bay Bears", "GRA", 77, 82, 76),
  team("Crimson Valley", "CRI", 80, 77, 85),
  team("Ironwood Wolves", "IRW", 74, 80, 78)
];

export const DEMO_TENNIS = [
  team("A. Kessler", "KES", 85, 82, 80),
  team("M. Duarte", "DUA", 88, 78, 84),
  team("T. Nakamura", "NAK", 82, 84, 79),
  team("R. Fontaine", "FON", 79, 80, 83),
  team("L. Bergström", "BER", 84, 81, 77),
  team("D. Okonkwo", "OKO", 86, 76, 87)
];

export const DEMO_BASEBALL = [
  team("Bayside Mariners", "BAY", 83, 80, 78),
  team("Prairie Stars", "PRA", 80, 83, 74),
  team("Copperfield Miners", "COP", 78, 77, 80),
  team("Lakeview Kings", "LAK", 84, 78, 77)
];

export const DEMO_HOCKEY = [
  team("Polar Bay Blizzard", "POL", 84, 82, 81),
  team("Timber Ridge Wolves", "TIM", 79, 84, 77),
  team("Aurora City Storm", "AUR", 82, 78, 85),
  team("Fjordland Vikings", "FJO", 76, 80, 79)
];

export const DEMO_VOLLEYBALL = [
  team("Coastal Titans", "COA", 83, 81, 80),
  team("Zenith Volley", "ZEN", 80, 84, 78),
  team("Solaris Club", "SOL", 78, 77, 82),
  team("Meridian Spike", "MER", 81, 79, 81)
];

export const DEMO_MMA = [
  team("V. Almeida", "ALM", 82, 80, 84),
  team("K. Volkov", "VOL", 84, 78, 80)
];

export const ABSENCE_POOL = [
  { name: "L. Moreau", role: "Attaquant titulaire" },
  { name: "S. Kaya", role: "Défenseur central" },
  { name: "J. Bennett", role: "Milieu créatif" },
  { name: "A. Duarte", role: "Ailier droit" },
  { name: "M. Osei", role: "Gardien titulaire" },
  { name: "P. Lindqvist", role: "Pivot" },
  { name: "R. Tanaka", role: "Latéral gauche" },
  { name: "C. Abadi", role: "Capitaine / milieu" }
];
