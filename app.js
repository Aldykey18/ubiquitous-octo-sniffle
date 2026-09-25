/* ValueBet Radar — prototype UI
 * The snapshot is intentionally local and explicit. A production build should replace
 * the arrays below with a verified pre-match/live provider and re-run every calculation.
 */

const reportDate = "25 septembre 2026";

const picks = [
  {
    id: "rays",
    sport: "MLB",
    league: "MLB · saison régulière",
    teamA: "Tampa Bay Rays",
    teamB: "Philadelphia Phillies",
    pick: "Rays gagnent",
    market: "Moneyline",
    odds: 2.32,
    model: 0.521,
    score: 78,
    risk: "Fort",
    riskClass: "high",
    time: "horaire à confirmer",
    source: "BettingNews · snapshot de marché",
    note: "Le prix affiché crée une value théorique importante, mais l'edge est sensible aux lanceurs confirmés, aux lineups et à la liquidité du marché. C'est l'une des jambes fragiles.",
    fragile: true,
  },
  {
    id: "under-fever-lynx",
    sport: "WNBA",
    league: "WNBA · saison régulière",
    teamA: "Indiana Fever",
    teamB: "Minnesota Lynx",
    pick: "Under 183,5 points",
    market: "Total match",
    odds: 1.96,
    model: 0.563,
    score: 78,
    risk: "Moyen",
    riskClass: "medium",
    time: "horaire à confirmer",
    source: "Dimers / DRatings · modèles divergents",
    note: "Le scénario under ressort dans les estimations disponibles, mais la dispersion des modèles WNBA impose une pénalité de fiabilité. Vérifier rythme, absences et ligne réelle.",
    fragile: false,
  },
  {
    id: "padres",
    sport: "MLB",
    league: "MLB · saison régulière",
    teamA: "Arizona Diamondbacks",
    teamB: "San Diego Padres",
    pick: "Padres gagnent",
    market: "Moneyline",
    odds: 1.70,
    model: 0.669,
    score: 86,
    risk: "Moyen",
    riskClass: "medium",
    time: "horaire à confirmer",
    source: "ESPN · modèle public snapshot",
    note: "Le modèle ESPN disponible plaçait les Padres autour de 66,9 %. C'est le signal le mieux documenté du board, à revalider avec le lanceur et la composition officielle.",
    fragile: false,
  },
  {
    id: "ayr-under",
    sport: "Football",
    league: "League One · Écosse",
    teamA: "Ayr United",
    teamB: "Stenhousemuir",
    pick: "Under 2,5 buts",
    market: "Total buts",
    odds: 1.60,
    model: 0.71,
    score: 78,
    risk: "Moyen",
    riskClass: "medium",
    time: "horaire à confirmer",
    source: "Scores24 · tendance pré-match",
    note: "La tendance de faible total est cohérente avec le signal consulté, mais la source est secondaire. Exclure si la cote se tasse ou si les compositions changent le profil offensif.",
    fragile: false,
  },
  {
    id: "preston",
    sport: "Tennis",
    league: "WTA · Korea Open",
    teamA: "Taylah Preston",
    teamB: "Alina Korneeva",
    pick: "Preston +4,5 jeux",
    market: "Handicap jeux",
    odds: 2.04,
    model: 0.54,
    score: 74,
    risk: "Fort",
    riskClass: "high",
    time: "horaire à confirmer",
    source: "Dimers / Stavka · source secondaire",
    note: "Le handicap peut rester compétitif même avec une victoire de Korneeva, mais la probabilité modèle est plus fragile et dépend fortement de la surface, de la forme et de la disponibilité des joueuses.",
    fragile: true,
  },
  {
    id: "valkyries",
    sport: "WNBA",
    league: "WNBA · saison régulière",
    teamA: "Golden State Valkyries",
    teamB: "Los Angeles Sparks",
    pick: "Valkyries -11,5",
    market: "Handicap points",
    odds: 1.91,
    model: 0.573,
    score: 79,
    risk: "Fort",
    riskClass: "high",
    time: "horaire à confirmer",
    source: "Dimers / DRatings · modèles divergents",
    note: "L'écart projeté soutient le handicap, mais les projections publiques divergent fortement. Ne pas cumuler avec un autre marché fortement corrélé de cette rencontre.",
    fragile: true,
  },
  {
    id: "braves",
    sport: "MLB",
    league: "MLB · saison régulière",
    teamA: "Atlanta Braves",
    teamB: "Adversaire du jour",
    pick: "Braves gagnent",
    market: "Moneyline",
    odds: 1.79,
    model: 0.60,
    score: 80,
    risk: "Moyen",
    riskClass: "medium",
    time: "horaire à confirmer",
    source: "Marché MLB · estimation agrégée",
    note: "Le prix reste légèrement supérieur à la probabilité implicite avec une confiance correcte. Vérifier l'adversaire, le lanceur partant et la composition avant de conserver la jambe.",
    fragile: false,
  },
  {
    id: "arbroath-under",
    sport: "Football",
    league: "Championship · Écosse",
    teamA: "Arbroath",
    teamB: "Queen's Park",
    pick: "Under 2,5 buts",
    market: "Total buts",
    odds: 1.55,
    model: 0.69,
    score: 75,
    risk: "Moyen",
    riskClass: "medium",
    time: "horaire à confirmer",
    source: "Scores24 · tendance pré-match",
    note: "Le scénario under est soutenu par la tendance disponible, mais le niveau de fiabilité reste inférieur aux données ESPN MLB. Vérifier la météo et les titulaires.",
    fragile: false,
  },
  {
    id: "portugal-over",
    sport: "Football",
    league: "International · qualification",
    teamA: "Portugal",
    teamB: "Pays de Galles",
    pick: "Portugal marque +1,5",
    market: "Buts équipe",
    odds: 1.33,
    model: 0.80,
    score: 77,
    risk: "Faible",
    riskClass: "low",
    time: "horaire à confirmer",
    source: "Scores24 · historique annoncé",
    note: "Le seuil de deux buts est soutenu par l'historique consulté, mais un historique seul ne remplace pas la composition et la motivation du jour.",
    fragile: false,
  },
  {
    id: "kopriva",
    sport: "Tennis",
    league: "ATP · Chengdu",
    teamA: "Vit Kopriva",
    teamB: "Denis Shapovalov",
    pick: "Kopriva +5 jeux",
    market: "Handicap jeux",
    odds: 1.65,
    model: 0.64,
    score: 74,
    risk: "Fort",
    riskClass: "high",
    time: "horaire à confirmer",
    source: "Last Word on Sports · angle secondaire",
    note: "Le handicap protège contre une défaite serrée, mais la donnée est moins robuste qu'un marché principal. La surface et la forme du jour sont déterminantes.",
    fragile: false,
  },
  {
    id: "sweden",
    sport: "Football",
    league: "International · qualification",
    teamA: "Suède",
    teamB: "Roumanie",
    pick: "Suède gagnante",
    market: "1X2",
    odds: 1.53,
    model: 0.68,
    score: 74,
    risk: "Moyen",
    riskClass: "medium",
    time: "horaire à confirmer",
    source: "MightyTips · estimation pré-match",
    note: "La Suède est favorite dans le snapshot retenu, mais la value est faible : la sélection ne doit pas être gardée si le prix descend sous l'objectif.",
    fragile: false,
  },
  {
    id: "france",
    sport: "Football",
    league: "International · qualification",
    teamA: "Turquie",
    teamB: "France",
    pick: "France gagnante",
    market: "1X2",
    odds: 1.47,
    model: 0.70,
    score: 72,
    risk: "Moyen",
    riskClass: "medium",
    time: "horaire à confirmer",
    source: "DailySports · estimation pré-match",
    note: "La sélection passe tout juste le filtre grâce au favori et au prix observé, mais son EV est faible. Elle doit être la première à sortir si la cote évolue défavorablement.",
    fragile: false,
  },
];

const livePicks = [
  {
    id: "live-mystics-sky",
    sport: "WNBA",
    league: "LIVE · WNBA",
    teamA: "Mystics",
    teamB: "Sky",
    scoreA: "31",
    scoreB: "28",
    clock: "Q2 · 06:42",
    pick: "Under 181,5 live",
    market: "Total match",
    odds: 1.88,
    model: 0.60,
    score: 73,
    risk: "Moyen",
    riskClass: "medium",
    note: "Exemple de signal conditionnel : le modèle devrait être alimenté par le rythme, les possessions et les rotations réellement observés.",
  },
  {
    id: "live-fever-lynx",
    sport: "WNBA",
    league: "LIVE · WNBA",
    teamA: "Fever",
    teamB: "Lynx",
    scoreA: "18",
    scoreB: "15",
    clock: "Q1 · 02:18",
    pick: "Fever prochain run",
    market: "Marché spécial",
    odds: 1.74,
    model: 0.58,
    score: 69,
    risk: "Fort",
    riskClass: "high",
    note: "Exemple de format uniquement. Un marché spécial ne peut être autorisé qu'avec une source de prix et une définition de marché vérifiées.",
  },
  {
    id: "live-gsv-sparks",
    sport: "WNBA",
    league: "LIVE · WNBA",
    teamA: "Valkyries",
    teamB: "Sparks",
    scoreA: "62",
    scoreB: "57",
    clock: "Q3 · 04:11",
    pick: "Valkyries -5,5 live",
    market: "Handicap points",
    odds: 2.10,
    model: 0.56,
    score: 71,
    risk: "Fort",
    riskClass: "high",
    note: "Exemple de lecture live : le handicap doit être recalculé après chaque rupture de rythme et invalidé si la ligne s'éloigne du modèle.",
  },
];

let activeView = "prematch";
let activeFilter = "Tous";
let onlyPremium = true;
let sortBy = "score";
let couponSelection = new Set(picks.map((pick) => pick.id));
let toastTimer;

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function formatOdds(value) {
  return Number(value).toFixed(2).replace(".", ",");
}

function formatPercent(value, decimals = 1) {
  return `${(value * 100).toFixed(decimals).replace(".", ",")} %`;
}

function formatEv(pick) {
  return (pick.model * pick.odds - 1) * 100;
}

function formatEvValue(pick) {
  const ev = formatEv(pick);
  return `${ev >= 0 ? "+" : ""}${ev.toFixed(1).replace(".", ",")} %`;
}

function sportClass(sport) {
  return sport.toLowerCase().replace("football", "football");
}

function filteredPicks() {
  let result = [...picks];
  if (activeFilter !== "Tous") {
    result = result.filter((pick) => pick.sport === activeFilter);
  }
  if (onlyPremium) {
    result = result.filter((pick) => pick.score >= 78);
  }
  result.sort((a, b) => {
    if (sortBy === "ev") return formatEv(b) - formatEv(a);
    if (sortBy === "odds") return b.odds - a.odds;
    return b.score - a.score || formatEv(b) - formatEv(a);
  });
  return result;
}

function renderPickCard(pick, context = "full") {
  const ev = formatEvValue(pick);
  const implicit = formatPercent(1 / pick.odds, 1);
  const cardClass = `pick-card sport-${sportClass(pick.sport)}${pick.fragile ? " is-fragile" : ""}`;
  const selected = couponSelection.has(pick.id);
  const sourceShort = pick.source.replace(" · modèles divergents", "");
  return `
    <article class="${cardClass}" data-pick-card="${escapeHtml(pick.id)}">
      <div class="pick-rail"></div>
      <div class="pick-main">
        <div class="pick-meta"><span class="sport-tag ${sportClass(pick.sport)}">${escapeHtml(pick.sport)}</span><span class="pick-time">${escapeHtml(pick.time)}</span></div>
        <div class="pick-match">${escapeHtml(pick.teamA)} <span>vs</span> ${escapeHtml(pick.teamB)}</div>
        <div class="pick-source">${escapeHtml(sourceShort)}</div>
      </div>
      <div class="pick-market"><div class="market-line"><span class="market-tag">${escapeHtml(pick.market)}</span><strong>${escapeHtml(pick.pick)}</strong></div><div class="pick-metrics"><div class="pick-metric"><span>modèle</span><strong>${formatPercent(pick.model)}</strong></div><div class="pick-metric"><span>implicite</span><strong>${implicit}</strong></div><div class="pick-metric"><span>EV</span><strong class="value-positive">${ev}</strong></div><div class="edge-line"><span style="width:${Math.min(100, Math.max(0, formatEv(pick) * 3.5))}%"></span></div></div></div>
      <div class="pick-score"><span class="score-label">score</span><div class="score-ring" style="--score:${pick.score}"></div><span class="score-value">${pick.score}<small>/100</small></span></div>
      <div class="pick-actions">
        <span class="risk-tag ${escapeHtml(pick.riskClass)}">${escapeHtml(pick.risk)}</span>
        <button class="select-pick-button${selected ? " selected" : ""}" data-pick-toggle="${escapeHtml(pick.id)}" type="button">${selected ? "Coupon" : "Ajouter"}</button>
        <button class="analysis-button" data-detail="${escapeHtml(pick.id)}" type="button">Analyse ↗</button>
      </div>
    </article>`;
}

function renderPickLists() {
  const dashboardItems = [...picks]
    .filter((pick) => pick.score >= 78)
    .sort((a, b) => b.score - a.score || formatEv(b) - formatEv(a));
  const dashboardTarget = $("#dashboardPicks");
  if (dashboardTarget) {
    dashboardTarget.innerHTML = dashboardItems.map((pick) => renderPickCard(pick, "dashboard")).join("");
  }

  const target = $("#prematchPicks");
  if (target) {
    const items = filteredPicks();
    target.innerHTML = items.length
      ? items.map((pick) => renderPickCard(pick, "full")).join("")
      : `<div class="empty-state"><span>⌁</span><strong>Aucun signal dans ce filtre.</strong><p>Élargissez le sport ou désactivez le filtre premium.</p></div>`;
    const title = $("#prematchListTitle");
    if (title) title.textContent = `${items.length} signal${items.length > 1 ? "s" : ""} dans la shortlist actuelle.`;
  }
}

function couponStats(ids, source = picks) {
  const selected = source.filter((item) => ids.has(item.id));
  const totalOdds = selected.reduce((total, item) => total * item.odds, 1);
  const modelProbability = selected.reduce((total, item) => total * item.model, 1);
  return {
    selected,
    totalOdds,
    modelProbability,
    implied: totalOdds ? 1 / totalOdds : 0,
  };
}

function couponLegMarkup(item, index) {
  return `<div class="coupon-leg"><span class="leg-index">${String(index + 1).padStart(2, "0")}</span><div><div class="leg-name">${escapeHtml(item.pick)}</div><div class="leg-market">${escapeHtml(item.teamA)} · ${escapeHtml(item.sport)}</div></div><strong class="leg-odds">${formatOdds(item.odds)}</strong><button class="remove-leg" data-remove-leg="${escapeHtml(item.id)}" type="button" aria-label="Retirer ${escapeHtml(item.pick)}">×</button></div>`;
}

function renderCoupon(container, compact = false) {
  if (!container) return;
  const stats = couponStats(couponSelection);
  const visible = compact ? stats.selected.slice(0, 5) : stats.selected;
  const hiddenCount = Math.max(0, stats.selected.length - visible.length);
  const productLabel = stats.selected.length ? `${stats.totalOdds.toFixed(1).replace(".", ",")}×` : "—";
  const probabilityLabel = stats.selected.length ? formatPercent(stats.modelProbability, 3) : "—";
  const legs = visible.map((item, index) => couponLegMarkup(item, index)).join("");
  const snapshotNote = stats.selected.length === picks.length ? "Le rapport de référence affichait ≈689,7× selon d'autres snapshots ; la grille visible est recalculée." : "Revalider chaque prix réel avant de conserver la jambe.";

  container.innerHTML = `
    <div class="coupon-topline"><span class="section-kicker">COUPON MAÎTRE</span><span class="coupon-count">${stats.selected.length} sélection${stats.selected.length > 1 ? "s" : ""}</span></div>
    <div class="coupon-summary"><div class="coupon-total"><strong>${productLabel}<small>cote</small></strong><span>recalculée sur la grille affichée</span></div><div class="coupon-probability"><strong>${probabilityLabel}</strong><span>proba. indépendante</span></div></div>
    <div class="coupon-legs">${legs || `<div class="empty-coupon">Ajoutez des sélections depuis la shortlist.</div>`}${hiddenCount ? `<div class="coupon-more">+ ${hiddenCount} autre${hiddenCount > 1 ? "s" : ""} sélection${hiddenCount > 1 ? "s" : ""} dans le coupon complet</div>` : ""}</div>
    <div class="coupon-stats"><span>Implicite <strong>${stats.selected.length ? formatPercent(stats.implied, 3) : "—"}</strong></span><span>Mise max. <strong>0,10 %</strong></span></div>
    <div class="coupon-warning"><span>!</span><div><strong>Très forte variance.</strong> ${snapshotNote} Stopper si le prix réel n'est plus disponible.</div></div>
    <div class="coupon-actions"><button class="coupon-action" data-coupon-action="trim" type="button">Retirer 3 fragiles</button><button class="coupon-action primary" data-coupon-action="copy" type="button">Copier le coupon ↗</button></div>`;
}

function renderAllCoupons() {
  renderCoupon($("#dashboardCoupon"), true);
  renderCoupon($("#prematchCoupon"), false);
  renderLiveCoupon();
}

function renderLiveCard(item) {
  const ev = (item.model * item.odds - 1) * 100;
  return `<article class="live-pick-card" data-detail-live="${escapeHtml(item.id)}"><div class="live-rail"></div><div class="live-match"><div class="pick-meta"><span class="sport-tag wnba">${escapeHtml(item.sport)}</span><span class="live-clock"><i></i>${escapeHtml(item.clock)}</span></div><div class="live-scoreboard"><div class="live-team-score"><strong>${escapeHtml(item.scoreA)}</strong><span>${escapeHtml(item.teamA)}</span></div><span class="live-vs">—</span><div class="live-team-score"><strong>${escapeHtml(item.scoreB)}</strong><span>${escapeHtml(item.teamB)}</span></div></div></div><div class="live-market"><div class="live-market-label">${escapeHtml(item.market)} · conditionnel</div><div class="live-market-name">${escapeHtml(item.pick)}</div><div class="live-market-edge">EV démo +${ev.toFixed(1).replace(".", ",")} %</div></div><div class="live-card-side"><strong class="live-card-odds">${formatOdds(item.odds)}</strong><span class="risk-tag ${escapeHtml(item.riskClass)}">${escapeHtml(item.risk)}</span><small>score ${item.score}/100</small></div></article>`;
}

function renderLivePicks() {
  const target = $("#livePicks");
  if (target) target.innerHTML = livePicks.map(renderLiveCard).join("");
}

function renderLiveCoupon() {
  const container = $("#liveCoupon");
  if (!container) return;
  const totalOdds = livePicks.reduce((total, item) => total * item.odds, 1);
  const modelProbability = livePicks.reduce((total, item) => total * item.model, 1);
  container.innerHTML = `
    <div class="coupon-topline"><span class="section-kicker">COUPON LIVE · DÉMO</span><span class="coupon-count">3 jambes</span></div>
    <div class="coupon-summary"><div class="coupon-total"><strong>${totalOdds.toFixed(1).replace(".", ",")}<small>cote</small></strong><span>conditionnel · non activé</span></div><div class="coupon-probability"><strong>${formatPercent(modelProbability, 2)}</strong><span>proba. brute</span></div></div>
    <div class="coupon-legs">${livePicks.map((item, index) => `<div class="coupon-leg"><span class="leg-index">${String(index + 1).padStart(2, "0")}</span><div><div class="leg-name">${escapeHtml(item.pick)}</div><div class="leg-market">${escapeHtml(item.teamA)} · LIVE démo</div></div><strong class="leg-odds">${formatOdds(item.odds)}</strong><span class="live-leg-marker">•</span></div>`).join("")}</div>
    <div class="coupon-stats"><span>Implicite <strong>${formatPercent(1 / totalOdds, 2)}</strong></span><span>Mise <strong>à définir</strong></span></div>
    <div class="coupon-warning"><span>!</span><div><strong>Pas un conseil actif.</strong> Le flux live réel doit fournir score, horloge, contexte et prix avant activation.</div></div>
    <div class="coupon-actions"><button class="coupon-action" data-coupon-action="live-info" type="button">Règles live</button><button class="coupon-action primary" data-coupon-action="connect" type="button">Connecter le flux</button></div>`;
}

function setActiveFilter(filter) {
  activeFilter = filter;
  $$(`[data-filter]`).forEach((button) => button.classList.toggle("active", button.dataset.filter === filter));
  renderPickLists();
}

function setView(view) {
  activeView = view;
  $$(`[data-view-panel]`).forEach((panel) => panel.classList.toggle("active", panel.dataset.viewPanel === view));
  $$(`[data-view]`).forEach((button) => button.classList.toggle("active", button.dataset.view === view));
  const context = view === "live" ? "LIVE RADAR" : view === "prematch" ? "PRE-MATCH SHORTLIST" : "TODAY'S BOARD";
  const title = view === "live" ? "Le match bouge. Le modèle aussi." : view === "prematch" ? "Les prix qui ont passé le filtre." : "Seuls les écarts qui comptent.";
  const subtitle = view === "live" ? "Un format prêt pour un flux vérifié de scores, chronomètre et cotes live." : view === "prematch" ? "Une shortlist resserrée sur les signaux qui ont encore une value défendable." : "Le board du jour, filtré par value, fiabilité et stabilité du marché.";
  $("#topbarContext").textContent = context;
  $("#pageTitle").textContent = title;
  $("#pageSubtitle").textContent = subtitle;
  if (view === "live") {
    $("#pageKicker").textContent = "LIVE RADAR · FLUX NON CONNECTÉ";
  } else if (view === "prematch") {
    $("#pageKicker").textContent = "PRÉ-MATCH ENGINE · 25 SEPTEMBRE 2026";
  } else {
    $("#pageKicker").textContent = "NEURAL PICK ENGINE · 25 SEPTEMBRE 2026";
  }
  $("#sidebar").classList.remove("is-open");
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function togglePick(id) {
  if (couponSelection.has(id)) {
    couponSelection.delete(id);
    showToast("Sélection retirée du coupon maître.");
  } else {
    couponSelection.add(id);
    showToast("Sélection ajoutée au coupon maître.");
  }
  renderPickLists();
  renderAllCoupons();
}

function removeLeg(id) {
  couponSelection.delete(id);
  renderPickLists();
  renderAllCoupons();
  showToast("Jambe retirée. La cote a été recalculée.");
}

function trimFragileLegs() {
  const fragileIds = picks.filter((pick) => pick.fragile).map((pick) => pick.id);
  const count = fragileIds.filter((id) => couponSelection.has(id)).length;
  fragileIds.forEach((id) => couponSelection.delete(id));
  renderPickLists();
  renderAllCoupons();
  showToast(count ? `${count} jambe${count > 1 ? "s" : ""} fragile${count > 1 ? "s" : ""} retirée${count > 1 ? "s" : ""}.` : "Aucune jambe fragile n'était dans le coupon.");
}

function copyCoupon() {
  const stats = couponStats(couponSelection);
  if (!stats.selected.length) {
    showToast("Le coupon est vide.");
    return;
  }
  const text = [
    `VALUEBET — coupon pré-match ${reportDate}`,
    ...stats.selected.map((item, index) => `${index + 1}. ${item.teamA} vs ${item.teamB} — ${item.pick} @ ${formatOdds(item.odds)}`),
    `Cote indicative recalculée: ${stats.totalOdds.toFixed(2)}`,
    `Probabilité indépendante brute: ${formatPercent(stats.modelProbability, 3)}`,
    "Revalider compositions, statut des matchs et prix. Aucune garantie.",
  ].join("\n");
  if (navigator.clipboard && window.isSecureContext) {
    navigator.clipboard.writeText(text).then(() => showToast("Coupon copié dans le presse-papiers.")).catch(() => showToast("Copie impossible dans cet environnement."));
  } else {
    const area = document.createElement("textarea");
    area.value = text;
    area.style.position = "fixed";
    area.style.opacity = "0";
    document.body.appendChild(area);
    area.select();
    try {
      document.execCommand("copy");
      showToast("Coupon copié dans le presse-papiers.");
    } catch {
      showToast("Copie impossible dans cet environnement.");
    }
    area.remove();
  }
}

function showToast(message) {
  const toast = $("#toast");
  if (!toast) return;
  clearTimeout(toastTimer);
  toast.textContent = message;
  toast.classList.add("visible");
  toastTimer = setTimeout(() => toast.classList.remove("visible"), 2800);
}

function openDetails(id) {
  const pick = picks.find((item) => item.id === id);
  if (!pick) return;
  const modal = $("#detailModal");
  const backdrop = $("#modalBackdrop");
  $("#modalContent").innerHTML = `<div class="modal-kicker"><span class="status-dot ${pick.fragile ? "amber" : "green"}"></span>${escapeHtml(pick.sport)} · ${escapeHtml(pick.league)}</div><h2 class="modal-title" id="modalTitle">${escapeHtml(pick.teamA)} <span>vs</span> ${escapeHtml(pick.teamB)}</h2><div class="modal-market">${escapeHtml(pick.pick)} · cote ${formatOdds(pick.odds)}</div><div class="modal-grid"><div class="modal-stat"><span>Prob. modèle</span><strong>${formatPercent(pick.model)}</strong></div><div class="modal-stat"><span>Implicite</span><strong>${formatPercent(1 / pick.odds)}</strong></div><div class="modal-stat"><span>EV recalculée</span><strong class="green">${formatEvValue(pick)}</strong></div><div class="modal-stat"><span>Score expert</span><strong>${pick.score}<small>/100</small></strong></div><div class="modal-stat"><span>Risque</span><strong>${escapeHtml(pick.risk)}</strong></div><div class="modal-stat"><span>Coupon</span><strong>${couponSelection.has(pick.id) ? "Inclus" : "Hors coupon"}</strong></div></div><div class="modal-analysis"><strong>Lecture :</strong> ${escapeHtml(pick.note)}</div><div class="modal-source"><span>Source / qualité de donnée</span><strong>${escapeHtml(pick.source)}</strong></div><div class="modal-footnote"><b>!</b><span>La cote et les informations de composition doivent être revalidées juste avant toute prise de pari. Ce module ne place aucun pari.</span></div>`;
  modal.classList.add("open");
  backdrop.classList.add("open");
  modal.setAttribute("aria-hidden", "false");
}

function closeDetails() {
  $("#detailModal").classList.remove("open");
  $("#modalBackdrop").classList.remove("open");
  $("#detailModal").setAttribute("aria-hidden", "true");
}

function refreshSnapshot() {
  const button = $("#refreshButton");
  button.classList.add("is-refreshing");
  showToast("Snapshot local rafraîchi. Aucune nouvelle source n'est connectée.");
  setTimeout(() => button.classList.remove("is-refreshing"), 560);
}

function bindEvents() {
  document.addEventListener("click", (event) => {
    const viewButton = event.target.closest("[data-view]");
    if (viewButton) {
      setView(viewButton.dataset.view);
      return;
    }

    const filterButton = event.target.closest("[data-filter]");
    if (filterButton) {
      setActiveFilter(filterButton.dataset.filter);
      return;
    }

    const toggleButton = event.target.closest("[data-pick-toggle]");
    if (toggleButton) {
      togglePick(toggleButton.dataset.pickToggle);
      return;
    }

    const removeButton = event.target.closest("[data-remove-leg]");
    if (removeButton) {
      removeLeg(removeButton.dataset.removeLeg);
      return;
    }

    const detailButton = event.target.closest("[data-detail]");
    if (detailButton) {
      openDetails(detailButton.dataset.detail);
      return;
    }

    const couponAction = event.target.closest("[data-coupon-action]");
    if (couponAction) {
      const action = couponAction.dataset.couponAction;
      if (action === "trim") trimFragileLegs();
      if (action === "copy") copyCoupon();
      if (action === "connect" || action === "live-info") {
        setView("live");
        showToast("Le mode live reste en attente d'une source vérifiée.");
      }
      return;
    }

    if (event.target.closest("#modalClose") || event.target.id === "modalBackdrop") {
      closeDetails();
    }

    if (event.target.closest("#menuToggle")) {
      $("#sidebar").classList.toggle("is-open");
    }

    if (event.target.closest("#connectFeedButton")) {
      showToast("Point d'intégration prêt : branchez votre fournisseur de scores et de cotes.");
    }
  });

  $("#premiumToggle").addEventListener("change", (event) => {
    onlyPremium = event.target.checked;
    renderPickLists();
  });

  $("#sortSelect").addEventListener("change", (event) => {
    sortBy = event.target.value;
    renderPickLists();
  });

  $("#refreshButton").addEventListener("click", refreshSnapshot);
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") closeDetails();
  });
}

function init() {
  renderPickLists();
  renderAllCoupons();
  renderLivePicks();
  bindEvents();
  setView("prematch");
}

document.addEventListener("DOMContentLoaded", init);
