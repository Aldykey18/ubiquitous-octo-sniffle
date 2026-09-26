// ============================================================
// Utilitaires généraux (formatage, clamp, RNG déterministe)
// ============================================================

export const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));

export const round = (v: number, d = 2) => {
  const p = Math.pow(10, d);
  return Math.round(v * p) / p;
};

export const fmtPct = (v: number, d = 0) => `${(v * 100).toFixed(d)} %`;

export const fmtEv = (ev: number) => `${ev >= 0 ? "+" : ""}${(ev * 100).toFixed(1)} %`;

export const fmtOdds = (o: number) => o.toFixed(2);

export function fmtMoney(v: number): string {
  const r = Math.round(v);
  return `${r.toLocaleString("fr-FR").replace(/\u202f/g, " ")} FCFA`;
}

export function timeAgo(iso: string, now = new Date()): string {
  const s = Math.max(0, Math.floor((now.getTime() - new Date(iso).getTime()) / 1000));
  if (s < 5) return "à l'instant";
  if (s < 60) return `il y a ${s} s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `il y a ${m} min`;
  const h = Math.floor(m / 60);
  return `il y a ${h} h`;
}

export function fmtTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
}

/** Jour de la semaine + date + heure locale, ex: "ven. 26 sept. · 03:30" */
export function fmtDayTime(iso: string): string {
  const d = new Date(iso);
  const day = d.toLocaleDateString("fr-FR", { weekday: "short", day: "2-digit", month: "short" });
  const time = d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
  return `${day}. · ${time}`;
}

export function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString("fr-FR", { day: "2-digit", month: "short" });
}

// ---------- RNG déterministe (mulberry32) ----------

export function hashString(str: string): number {
  let h = 1779033703 ^ str.length;
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return (h ^= h >>> 16) >>> 0;
}

export function mulberry32(seed: number) {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function seededRng(key: string) {
  return mulberry32(hashString(key));
}

export const pick = <T,>(rng: () => number, arr: T[]): T => arr[Math.floor(rng() * arr.length)];

export const rangeInt = (rng: () => number, min: number, max: number) =>
  min + Math.floor(rng() * (max - min + 1));

export const rangeFloat = (rng: () => number, min: number, max: number) =>
  min + rng() * (max - min);

/** Bruit gaussien approx (somme de 3 uniformes) */
export const gauss = (rng: () => number) => (rng() + rng() + rng()) / 3 - 0.5;

export function todaySeed(now = new Date()): string {
  return now.toISOString().slice(0, 10);
}

/** Répartition normale des heures d'événements sur la journée (UTC). */
export function eventTime(daySeed: string, hourUtc: number, minute: number): string {
  return `${daySeed}T${String(hourUtc).padStart(2, "0")}:${String(minute).padStart(2, "0")}:00.000Z`;
}
