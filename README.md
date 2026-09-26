# 🧠 VALUE BET MASTER AI — PREDICTION ENGINE 3D

Plateforme web professionnelle d'**aide à la décision** pour les paris sportifs, basée sur
l'analyse statistique, probabiliste et comparative des marchés.

> **L'objectif absolu : identifier UNIQUEMENT les meilleures prédictions du jour, tous sports
> confondus, après une analyse multidimensionnelle. Qualité > Quantité.**

Si le moteur ne trouve que 3 excellentes prédictions → il en affiche 3.
S'il n'en trouve aucune → il affiche **NO BET / AUCUNE VALUE SUFFISANTE**.
Jamais il ne remplit la liste avec des pronostics moyens.

---

## 🔥 Règle suprême

```
QUALITÉ DES DONNÉES → ANALYSE → PROBABILITÉ → VALUE → RISQUE
→ CORRÉLATION → CLASSEMENT → MEILLEURES PRÉDICTIONS
```

Et **jamais** : `cote élevée → ajout de paris → combiné artificiel`.

| Principe | |
|---|---|
| QUALITÉ | > QUANTITÉ |
| VALUE | > COTE |
| DONNÉES | > INTUITION |
| PROBABILITÉ | > POPULARITÉ |
| DISCIPLINE | > VOLUME |
| NO BET | > MAUVAISE PRÉDICTION |

---

## 🚀 Installation

Prérequis : **Node.js ≥ 18** et npm.

```bash
npm install
cp .env.example .env.local   # facultatif : valeurs par défaut fonctionnelles
npm run dev                  # → http://localhost:3000
```

Production :

```bash
npm run build && npm start
```

## 🔐 Configuration (.env.local)

| Variable | Rôle |
|---|---|
| `VBM_DATA_MODE` | `demo` (défaut) ou `live`. Le mode live active les connecteurs réels. |
| `ODDS_API_KEY` | Clé [The Odds API](https://the-odds-api.com) — **seule source de cotes réelles**. Sans clé, les matchs sans cotes sont exclus du classement value (aucune cote inventée). |
| `VBM_SYNC_INTERVAL` | Intervalle de synchronisation automatique (secondes, défaut 45). |

> **Sécurité** : les clés API ne sont lues que côté serveur (`/api/*`), jamais exposées au
> frontend. Aucun contournement de restriction ou CAPTCHA d'un site tiers, jamais.

### Sources de données — MODE LIVE PAR DÉFAUT

| Source | Rôle |
|---|---|
| **ESPN API publique** ⭐ | **Vraies rencontres du jour** (Premier League, LaLiga, Bundesliga, Serie A, Ligue 1, Champions League, Europa League, MLS, NBA, MLB, NHL, ATP/WTA, UFC). Gratuite, sans clé, CORS ouverte — collectée **depuis le navigateur de l'utilisateur** (`lib/live/espnClient.ts`) puis envoyée au moteur via `POST /api/ingest`. |
| **Vrais classements ESPN** | Les standings réelles (points, buts pour/contre, % victoires) servent à calculer les **vraies notes d'équipes** (attaque/défense/rating), base des probabilités Poisson. |
| **Cotes réelles ESPN** | Pour NBA/MLB/NHL, ESPN intègre les moneylines/spreads/totaux d'un bookmaker → le **Value Engine calcule l'EV contre de vraies cotes**. |
| **The Odds API** | Source de cotes supplémentaire optionnelle (`ODDS_API_KEY`, server-side uniquement). |
| **Demo Engine** | Fallback **100 % fictif clairement identifié**, activable dans l'admin. |
| **Backtest historique** | 2 600 prédictions résolues (90 jours) pour les métriques et l'auto-learning. |

**Pourquoi la collecte passe par le navigateur :** l'environnement serveur n'a pas
d'accès internet sortant ; le navigateur de l'utilisateur, lui, interroge directement
l'API publique ESPN (aucune clé, aucun contournement). Les calculs restent côté serveur.

**Flashscore / AiScore / SofaScore :** ces sites ne proposent **aucune API officielle
gratuite** et leurs conditions d'utilisation interdisent le scraping. Leurs protections
ne sont **jamais contournées** (exigence du cahier des charges). L'architecture en
connecteurs (`lib/connectors/`, `lib/live/`) permet d'ajouter légalement toute future
source disposant d'un accès gratuit officiel.

**Sans cotes bookmaker** sur un match : le moteur affiche la probabilité réelle et la
**cote fair** (= 1/probabilité) — jamais de cote inventée, jamais de value fictive.

---

## 🏗️ Architecture

```
DATA SOURCES
  ├─ ESPN API publique (collectée par le NAVIGATEUR, lib/live/espnClient.ts)
  ├─ ESPN standings réelles → vraies notes d'équipes
  ├─ ESPN odds réelles (sports US) / The Odds API (option)
  └─ Demo Engine (fallback fictif)
        ↓
COLLECTOR / INGEST        POST /api/ingest → lib/store.ts
        ↓
NORMALISATION             lib/types.ts
        ↓
MARKET BUILDER            lib/engines/marketBuilder.ts (cotes réelles ou fair)
        ↓
BASE / STORE              lib/store.ts  (sync auto 45 s, persistance JSON data/runtime/)
        ↓
ANALYTICS — 5 moteurs     lib/engines/models.ts
        ↓
CONSENSUS ENGINE          lib/engines/pipeline.ts (pondéré, ajusté par auto-learning)
        ↓
VALUE ENGINE              EV = proba modèle × cote − 1, paliers +4/+8/+15 %
        ↓
RISK ENGINE               variance, cote, désaccord des modèles
        ↓
DATA QUALITY SCORE        lib/engines/dataQuality.ts (seuil 58, sinon exclusion)
        ↓
CORRELATION ENGINE        lib/engines/correlation.ts (scénarios redondants filtrés)
        ↓
RANKING ENGINE            EV + confiance + DQ + risque + consensus + stabilité
        ↓
API REST (server-side)    app/api/*
        ↓
INTERFACE                 Next.js App Router (dark mode premium, responsive)
```

### Structure du projet

```
app/                    pages (Accueil, Predictions, Analyse, Match, Backtest,
                        Combiner, Favoris, Réglages, Admin) + routes API
                        (/api/ingest = réception des données réelles)
components/             Nav, Hero3D, PredictionCard, LiveCollector, charts SVG, kit UI
lib/
  live/espnClient.ts    collecte navigateur des VRAIES données ESPN
  engines/              models (×5), pipeline, marketBuilder, dataQuality,
                        correlation, combiner, backtest, learning
  connectors/           espn.ts, oddsApi.ts (server-side)
  demo/                 générateur du jeu fictif (fallback)
  store.ts              orchestration : ingest, sync loop, alertes, persistance
legacy/                 ancien prototype statique "ValueBet Radar" (conservé)
```

**Police** : Tahoma Regular (police système, aucune webfont externe).
**Affichage** : jour de la semaine + date + heure locale de chaque rencontre.

## 🤖 Multi-Model AI (7 moteurs)

1. **STATISTICAL ENGINE** — ratings attaque/défense/rythme, Poisson/normal selon le sport.
2. **FORM ENGINE** — 5 et 10 derniers matchs, xG/xGA.
3. **CONTEXT ENGINE** — absences, repos, déplacement, enjeu, avantage terrain.
4. **MATCHUP ENGINE** — attaque vs défense adverse, rythme, H2H.
5. **MARKET ENGINE** — probabilité implicite démargée + mouvement de cote.
6. **VALUE ENGINE** — divergence probabilité/prix (EV), paliers EXCEPTIONNELLE/FORTE/MODÉRÉE/FAIBLE.
7. **RISK ENGINE** — variance, niveau de cote, désaccord des modèles.

Le **CONSENSUS ENGINE** combine les modèles 1–5 (moyenne pondérée ajustée par
l'auto-learning) : une prédiction issue d'un seul signal ne passe pas.

## 📊 Scores propriétaires

- **PREDICTION CONFIDENCE /100** = 20 % qualité statistique + 15 % forme + 15 % matchup
  + 15 % contexte + 15 % value + 10 % qualité des données + 10 % stabilité du marché.
  Seuils : 90+ PREMIUM · 85+ EXCELLENTE · 80+ FORTE · 75+ BONNE · **<75 EXCLUSION**.
- **DATA QUALITY /100** — sources, fraîcheur, cohérence, compos, blessures, fiabilité.
  Sous le seuil → pénalité ou exclusion (une EV énorme sur données pauvres est écartée).
- **EV** = probabilité modèle × cote − 1. Paliers : ≥ +15 % EXCEPTIONNELLE, +8/+15 % FORTE,
  +4/+8 % MODÉRÉE, 0/+4 % FAIBLE, **< 0 EXCLUSION**.
- Garde-fous supplémentaires : cote > 4.0 exclue (variance), pénalité longshot sur la
  confiance, EV délirante (> +35 %) = suspicion d'anomalie.

## 🧪 Backtest & auto-learning

Le backtest mesure : accuracy, **ROI**, EV moyen, **drawdown max**, **Brier score**,
**calibration** (prédit vs réalisé), performance **par sport et par marché** —
jamais le seul taux de réussite.

L'**auto-learning** déduit les biais de calibration (surestimation/sous-estimation) par
sport et par marché depuis l'historique résolu, puis les réinjecte comme correction dans
le pipeline live. Visible dans l'admin.

## 🧩 Combinés & bankroll

Le générateur de combinés (Conservative / Balanced / High Value) sélectionne les
meilleures prédictions **indépendantes** (Correlation Engine) et refuse d'ajouter une
sélection faible pour gonfler la cote → statut `NO ADDITIONAL VALUE FOUND` si besoin.

Bankroll : mise recommandée par **Kelly fractionné** (1/4 Kelly), plafonnée à 1.5 % de la
bankroll par combiné. **Jamais de martingale.**

## ⏱️ Temps réel & alertes

- Synchronisation automatique toutes les 45 s (dérive des cotes, scores live, coups d'envoi).
- Indicateur `🟢 LIVE DATA · Updated il y a X s` dans la barre de navigation.
- Alertes intelligentes : 🔥 NEW VALUE DETECTED (saut d'EV), mouvements de cote,
  team news, coup d'envoi, passage en NO BET. Notifications navigateur optionnelles.

## 🛡️ Honnêteté du produit

- Aucune garantie de gain, aucun « 100 % sûr », aucun « pari garanti ».
- Données de démonstration **clairement identifiées** (bannière permanente) tant que les
  connecteurs réels ne sont pas alimentés.
- Chaque prédiction est traçable : heure de génération, dernière MAJ des données, nombre
  de sources, consensus, data quality, explication courte (« Pourquoi cette sélection ? »).

---

**Stack** : Next.js 14 (App Router) · TypeScript · Tailwind CSS · graphiques SVG maison ·
animations CSS 3D + canvas (zéro dépendance graphique lourde, performance mobile maximale).

*L'ancien prototype statique (« ValueBet Radar ») est conservé dans `legacy/`.*
