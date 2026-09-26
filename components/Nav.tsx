"use client";

// ============================================================
// NAVIGATION — topbar desktop + barre mobile + alertes + thème
// ============================================================

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useApi, useTheme, notifyBrowser } from "@/lib/client";
import type { StatusPayload, Alert } from "@/lib/types";
import { timeAgo } from "@/lib/utils";

const LINKS = [
  { href: "/", label: "Accueil", icon: "🏠" },
  { href: "/predictions", label: "Predictions", icon: "🔥" },
  { href: "/analysis", label: "Analyse", icon: "📊" },
  { href: "/combiner", label: "Combinés", icon: "🧩" },
  { href: "/backtest", label: "Backtest", icon: "🧪" },
  { href: "/admin", label: "Admin", icon: "🛠️" }
];

export function Nav() {
  const pathname = usePathname();
  const { theme, switchTheme } = useTheme();
  const { data: status } = useApi<StatusPayload>("/api/status", 8000);
  const [bellOpen, setBellOpen] = useState(false);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [unread, setUnread] = useState(0);
  const lastTopAlert = useRef<string>("");

  useEffect(() => {
    if (!bellOpen) return;
    fetch("/api/alerts").then(r => r.json()).then(j => {
      setAlerts(j.alerts ?? []);
      setUnread(j.unread ?? 0);
    }).catch(() => {});
  }, [bellOpen]);

  // Toast navigateur pour la dernière alerte NEW_VALUE
  useEffect(() => {
    if (!status?.alertsUnread) return;
    fetch("/api/alerts").then(r => r.json()).then(j => {
      const latest = (j.alerts ?? [])[0];
      if (latest && !latest.read && latest.id !== lastTopAlert.current) {
        lastTopAlert.current = latest.id;
        notifyBrowser(latest.title, latest.body);
      }
    }).catch(() => {});
  }, [status?.alertsUnread]);

  const markRead = () => {
    fetch("/api/alerts", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ readAll: true }) })
      .then(() => { setUnread(0); setAlerts(a => a.map(x => ({ ...x, read: true }))); })
      .catch(() => {});
  };

  return (
    <>
      {/* ---------- TOPBAR ---------- */}
      <header className="nav-blur fixed inset-x-0 top-0 z-50 border-b" style={{ borderColor: "var(--border)", background: "color-mix(in srgb, var(--bg) 78%, transparent)" }}>
        <div className="mx-auto flex h-16 max-w-[1400px] items-center gap-3 px-4 sm:px-6">
          <Link href="/" className="flex items-center gap-2.5">
            <span className="relative grid h-9 w-9 place-items-center rounded-xl"
              style={{ background: "linear-gradient(135deg,#2f6bff,#7c3aed)" }}>
              <span className="absolute inset-0 rounded-xl opacity-60 blur-md" style={{ background: "linear-gradient(135deg,#2f6bff,#7c3aed)" }} />
              <svg viewBox="0 0 24 24" className="relative h-5 w-5 text-white" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="8" />
                <circle cx="12" cy="12" r="2.6" fill="currentColor" stroke="none" />
                <path d="M12 4v3M12 17v3M4 12h3M17 12h3" strokeLinecap="round" />
              </svg>
            </span>
            <span className="hidden sm:block">
              <span className="font-display block text-sm font-bold leading-none tracking-wide">
                VALUE BET <span className="text-gradient">MASTER AI</span>
              </span>
              <span className="text-[10px] font-medium tracking-[0.22em] text-slate-500">PREDICTION ENGINE 3D</span>
            </span>
          </Link>

          <nav className="ml-6 hidden items-center gap-1 md:flex">
            {LINKS.map(l => (
              <Link key={l.href} href={l.href}
                className={`rounded-xl px-3 py-2 text-[13px] font-semibold transition-all ${
                  pathname === l.href
                    ? "text-white shadow-glow-blue"
                    : "text-slate-400 hover:text-white"
                }`}
                style={pathname === l.href ? { background: "linear-gradient(120deg, rgba(61,123,255,.25), rgba(139,92,246,.25))", border: "1px solid var(--border-strong)" } : undefined}
              >
                {l.label}
              </Link>
            ))}
          </nav>

          <div className="ml-auto flex items-center gap-2.5">
            {/* LIVE DATA indicator */}
            <div className="glass hidden items-center gap-2 rounded-full px-3 py-1.5 text-[11px] font-semibold text-slate-300 lg:flex" title="Synchronisation automatique">
              <span className="dot-live" />
              <span>LIVE DATA</span>
              <span className="text-slate-500">
                {status ? `· MAJ ${timeAgo(status.lastSync, new Date(status.serverNow))}` : "…"}
              </span>
            </div>

            {status?.demoMode ? (
              <span className="hidden rounded-full border px-2.5 py-1 text-[10px] font-bold tracking-wider text-amber-400 sm:block"
                style={{ borderColor: "rgba(245,158,11,.4)", background: "rgba(245,158,11,.08)" }}>
                DEMO DATA
              </span>
            ) : (
              <span className="hidden items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-bold tracking-wider text-emerald-400 sm:flex"
                style={{ borderColor: "rgba(52,211,153,.4)", background: "rgba(52,211,153,.08)" }}
                title="Matchs réels collectés via l'API publique ESPN (navigateur)">
                <span className="dot-live" style={{ width: 6, height: 6 }} />
                DONNÉES RÉELLES
              </span>
            )}

            {/* Bell */}
            <div className="relative">
              <button onClick={() => { setBellOpen(o => !o); if (!bellOpen && unread) setTimeout(markRead, 1500); }}
                className="glass relative grid h-10 w-10 place-items-center rounded-xl transition-all hover:border-slate-400/40"
                aria-label="Alertes">
                <svg viewBox="0 0 24 24" className="h-[18px] w-[18px] text-slate-300" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <path d="M18 8a6 6 0 10-12 0c0 7-3 9-3 9h18s-3-2-3-9M13.7 21a2 2 0 01-3.4 0" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                {(unread > 0 || (status?.alertsUnread ?? 0) > 0) && (
                  <span className="absolute -right-1 -top-1 grid h-4.5 min-w-[18px] place-items-center rounded-full bg-gradient-to-r from-rose-500 to-orange-500 px-1 text-[10px] font-bold text-white" style={{ height: 18 }}>
                    {unread || status?.alertsUnread}
                  </span>
                )}
              </button>
              {bellOpen && <AlertsDropdown alerts={alerts} onClose={() => setBellOpen(false)} />}
            </div>

            <button onClick={switchTheme} className="glass grid h-10 w-10 place-items-center rounded-xl text-slate-300 transition-all hover:border-slate-400/40"
              aria-label="Changer de thème">
              {theme === "dark" ? "🌙" : "☀️"}
            </button>
          </div>
        </div>
      </header>

      {/* ---------- BOTTOM NAV MOBILE ---------- */}
      <nav className="nav-blur fixed inset-x-0 bottom-0 z-50 border-t md:hidden"
        style={{ borderColor: "var(--border)", background: "color-mix(in srgb, var(--bg) 86%, transparent)" }}>
        <div className="grid grid-cols-5">
          {[
            { href: "/", label: "Accueil", icon: "🏠" },
            { href: "/predictions", label: "Predictions", icon: "🔥" },
            { href: "/analysis", label: "Analyse", icon: "📊" },
            { href: "/favorites", label: "Favoris", icon: "⭐" },
            { href: "/settings", label: "Réglages", icon: "⚙️" }
          ].map(l => {
            const active = pathname === l.href;
            return (
              <Link key={l.href} href={l.href}
                className={`flex flex-col items-center gap-0.5 py-2.5 text-[10px] font-semibold transition-colors ${
                  active ? "text-white" : "text-slate-500"
                }`}>
                <span className={`text-lg leading-none ${active ? "" : "opacity-70"}`}>{l.icon}</span>
                {l.label}
                {active && <span className="mt-0.5 h-1 w-6 rounded-full" style={{ background: "linear-gradient(90deg,#3d7bff,#8b5cf6)" }} />}
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}

function AlertsDropdown({ alerts, onClose }: { alerts: Alert[]; onClose: () => void }) {
  return (
    <>
      <div className="fixed inset-0 z-40" onClick={onClose} />
      <div className="glass-strong fade-up absolute right-0 top-12 z-50 w-[320px] overflow-hidden rounded-2xl p-0 sm:w-[380px]">
        <div className="flex items-center justify-between border-b px-4 py-3" style={{ borderColor: "var(--border)" }}>
          <span className="text-xs font-bold tracking-widest text-slate-300">🔔 ALERTES INTELLIGENTES</span>
          <button onClick={onClose} className="text-slate-500 hover:text-white">✕</button>
        </div>
        <div className="max-h-[340px] overflow-y-auto">
          {alerts.length === 0 && (
            <p className="px-4 py-8 text-center text-xs text-slate-500">Aucune alerte pour l&apos;instant.</p>
          )}
          {alerts.map(a => (
            <div key={a.id} className="border-b px-4 py-3 last:border-0" style={{ borderColor: "var(--border)" }}>
              <div className="flex items-center justify-between gap-2">
                <span className="text-[13px] font-bold">{a.title}</span>
                <span className="shrink-0 text-[10px] text-slate-500">{timeAgo(a.createdAt)}</span>
              </div>
              <p className="mt-1 text-xs leading-relaxed text-slate-400">{a.body}</p>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
