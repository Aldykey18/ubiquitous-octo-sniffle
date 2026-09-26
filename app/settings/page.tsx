"use client";

// ============================================================
// ⚙️ PARAMÈTRES — thème, notifications, bankroll, mode données
// ============================================================

import { useState } from "react";
import { useTheme, useBankroll, useNotifySetting } from "@/lib/client";
import { useApi } from "@/lib/client";
import type { StatusPayload } from "@/lib/types";

export default function SettingsPage() {
  const { theme, switchTheme } = useTheme();
  const { bankroll, save } = useBankroll(100000);
  const [input, setInput] = useState(String(bankroll));
  const { enabled: notify, toggle: toggleNotify } = useNotifySetting();
  const { data: status, reload } = useApi<StatusPayload>("/api/status", 0);

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <header className="fade-up">
        <div className="text-[10px] font-bold tracking-[0.3em] text-slate-500">PRÉFÉRENCES LOCALES</div>
        <h1 className="font-display mt-1.5 text-3xl font-bold sm:text-4xl">⚙️ PARAMÈTRES</h1>
      </header>

      <div className="glass space-y-4 p-5">
        <Row title="🌙 Thème" desc="Le DARK MODE est le thème principal du produit.">
          <button className="btn-ghost text-xs" onClick={switchTheme}>
            {theme === "dark" ? "Passer en LIGHT" : "Passer en DARK"}
          </button>
        </Row>
        <Row title="🔔 Notifications" desc="Alertes navigateur quand une nouvelle value est détectée (EV ≥ +8 %).">
          <button className={`btn-ghost text-xs ${notify ? "text-emerald-400" : ""}`} onClick={toggleNotify}>
            {notify ? "✓ Activées" : "Désactivées"}
          </button>
        </Row>
        <Row title="💰 Bankroll" desc="Utilisée pour les mises recommandées (Kelly fractionné, plafond 1.5 %).">
          <div className="flex items-center gap-2">
            <input
              value={input}
              onChange={e => setInput(e.target.value.replace(/[^\d]/g, ""))}
              onBlur={() => save(Math.max(1000, Number(input) || 100000))}
              className="tabular w-32 rounded-xl border px-3 py-2 text-sm font-bold outline-none focus:border-cyan-400"
              style={{ borderColor: "var(--border-strong)", background: "rgba(148,163,255,.06)" }}
            />
            <span className="text-xs font-bold text-slate-500">FCFA</span>
          </div>
        </Row>
        <Row title="📡 Données" desc={status?.demoMode
          ? "MODE DÉMONSTRATION : données fictives clairement identifiées. Le mode LIVE collecte les vraies rencontres via l'API publique ESPN (depuis votre navigateur)."
          : "MODE LIVE : vraies rencontres ESPN collectées par votre navigateur, calculs réels côté serveur. Détails dans l'admin."}>
          <span className={`rounded-full px-3 py-1 text-[11px] font-bold ${status?.demoMode ? "text-amber-400" : "text-emerald-400"}`}
            style={{ background: status?.demoMode ? "rgba(245,158,11,.1)" : "rgba(52,211,153,.1)" }}>
            {status ? status.mode.toUpperCase() : "…"}
          </span>
        </Row>
      </div>

      <div className="glass p-5 text-[12px] leading-relaxed text-slate-500">
        🔐 <b className="text-slate-300">Sécurité :</b> vos réglages restent dans le stockage local de votre navigateur.
        Les clés API (The Odds API, etc.) ne transitent que par le serveur et ne sont jamais exposées au frontend.
        Cette plateforme est un outil d&apos;aide à la décision : aucune prédiction n&apos;est garantie, jouez avec discipline.
      </div>
    </div>
  );
}

function Row({ title, desc, children }: { title: string; desc: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-b pb-4 last:border-0 last:pb-0" style={{ borderColor: "var(--border)" }}>
      <div className="max-w-xs">
        <div className="text-sm font-bold">{title}</div>
        <div className="mt-0.5 text-[11px] leading-relaxed text-slate-500">{desc}</div>
      </div>
      {children}
    </div>
  );
}
