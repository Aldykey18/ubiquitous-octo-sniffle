// ============================================================
// Helpers côté client (hooks fetch, favoris, thème, bankroll)
// ============================================================
"use client";

import { useEffect, useState, useCallback } from "react";

/** Fetch JSON avec état de chargement + polling optionnel. */
export function useApi<T>(url: string, pollMs = 0): { data: T | null; error: string | null; loading: boolean; reload: () => void } {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [tick, setTick] = useState(0);

  const reload = useCallback(() => setTick(t => t + 1), []);

  useEffect(() => {
    let alive = true;
    let timer: ReturnType<typeof setInterval> | null = null;

    const load = async () => {
      try {
        const res = await fetch(url, { cache: "no-store" });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();
        if (alive) { setData(json); setError(null); setLoading(false); }
      } catch (e: any) {
        if (alive) { setError(String(e?.message ?? e)); setLoading(false); }
      }
    };

    load();
    if (pollMs > 0) timer = setInterval(load, pollMs);
    return () => {
      alive = false;
      if (timer) clearInterval(timer);
    };
  }, [url, pollMs, tick]);

  return { data, error, loading, reload };
}

// ---------- Favoris (localStorage) ----------
const FAV_KEY = "vbm:favorites";

export function getFavorites(): string[] {
  if (typeof window === "undefined") return [];
  try { return JSON.parse(localStorage.getItem(FAV_KEY) ?? "[]"); } catch { return []; }
}

export function toggleFavorite(id: string): string[] {
  const favs = getFavorites();
  const next = favs.includes(id) ? favs.filter(f => f !== id) : [...favs, id];
  try { localStorage.setItem(FAV_KEY, JSON.stringify(next)); } catch {}
  return next;
}

export function useFavorites() {
  const [favs, setFavs] = useState<string[]>([]);
  useEffect(() => { setFavs(getFavorites()); }, []);
  const toggle = useCallback((id: string) => setFavs(toggleFavorite(id)), []);
  return { favs, toggle };
}

// ---------- Thème ----------
export function useTheme() {
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  useEffect(() => {
    const saved = localStorage.getItem("vbm:theme");
    const t = saved === "light" ? "light" : "dark";
    setTheme(t);
    document.documentElement.setAttribute("data-theme", t);
  }, []);
  const switchTheme = useCallback(() => {
    setTheme(prev => {
      const next = prev === "dark" ? "light" : "dark";
      document.documentElement.setAttribute("data-theme", next);
      try { localStorage.setItem("vbm:theme", next); } catch {}
      return next;
    });
  }, []);
  return { theme, switchTheme };
}

// ---------- Bankroll (localStorage) ----------
export function useBankroll(defaultValue = 100000) {
  const [bankroll, setBankroll] = useState(defaultValue);
  useEffect(() => {
    const v = Number(localStorage.getItem("vbm:bankroll"));
    if (v > 0) setBankroll(v);
  }, []);
  const save = useCallback((v: number) => {
    setBankroll(v);
    try { localStorage.setItem("vbm:bankroll", String(v)); } catch {}
  }, []);
  return { bankroll, save };
}

// ---------- Notifications navigateur ----------
export function useNotifySetting() {
  const [enabled, setEnabled] = useState(false);
  useEffect(() => {
    setEnabled(localStorage.getItem("vbm:notify") === "1");
  }, []);
  const toggle = useCallback(async () => {
    const next = !enabled;
    if (next && typeof Notification !== "undefined" && Notification.permission === "default") {
      try { await Notification.requestPermission(); } catch {}
    }
    setEnabled(next);
    try { localStorage.setItem("vbm:notify", next ? "1" : "0"); } catch {}
  }, [enabled]);
  return { enabled, toggle };
}

export function notifyBrowser(title: string, body: string) {
  try {
    if (typeof Notification !== "undefined" && Notification.permission === "granted" && localStorage.getItem("vbm:notify") === "1") {
      new Notification(title, { body });
    }
  } catch {}
}
