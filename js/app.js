/* Top Pronos — client PWA */
const FLAGS = {
  TR: "🇹🇷", SE: "🇸🇪", DK: "🇩🇰", ES: "🇪🇸", FR: "🇫🇷", IT: "🇮🇹",
  EN: "🏴󠁧󠁢󠁥󠁮󠁧󠁿", GB: "🇬🇧", AR: "🇦🇷", BR: "🇧🇷", MX: "🇲🇽", PL: "🇵🇱",
  RO: "🇷🇴", GR: "🇬🇷", HR: "🇭🇷", BG: "🇧🇬", UA: "🇺🇦", NL: "🇳🇱",
  UY: "🇺🇾", BO: "🇧🇴", CL: "🇨🇱", US: "🇺🇸", CA: "🇨🇦", EG: "🇪🇬",
  DZ: "🇩🇿", SI: "🇸🇮", CY: "🇨🇾", MK: "🇲🇰", DE: "🇩🇪", AZ: "🇦🇿",
  AE: "🇦🇪", QA: "🇶🇦", IR: "🇮🇷", SA: "🇸🇦", IQ: "🇮🇶", HN: "🇭🇳",
  GT: "🇬🇹", PT: "🇵🇹", BE: "🇧🇪", CH: "🇨🇭", AT: "🇦🇹", NO: "🇳🇴",
  FI: "🇫🇮", CZ: "🇨🇿", SK: "🇸🇰", HU: "🇭🇺", RS: "🇷🇸", JP: "🇯🇵",
  KR: "🇰🇷", CN: "🇨🇳", IN: "🇮🇳", AU: "🇦🇺", ZA: "🇿🇦", MA: "🇲🇦",
  TN: "🇹🇳", NG: "🇳🇬", SN: "🇸🇳", CI: "🇨🇮", CM: "🇨🇲", GH: "🇬🇭",
  KE: "🇰🇪", CR: "🇨🇷", PE: "🇵🇪", EC: "🇪🇨", PY: "🇵🇾", VE: "🇻🇪",
  CO: "🇨🇴", JM: "🇯🇲", BA: "🇧🇦", AL: "🇦🇱", GE: "🇬🇪", AD: "🇦🇩", KZ: "🇰🇿", LT: "🇱🇹",
};
const FAV_KEY = "toppronos-favs";
const state = {
  data: null,
  date: null,
  tab: "tip",
  query: "",
  filter: "all",
  favs: new Set(JSON.parse(localStorage.getItem(FAV_KEY) || "[]")),
  datesWithData: [],
};

const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
}[c]));

function fmtOdds(n) {
  if (n == null || n === "") return "n.d.";
  const x = Number(n);
  if (Number.isNaN(x)) return "n.d.";
  return x.toFixed(2).replace(".", ",");
}

function confClass(c) {
  const t = (c || "").toLowerCase();
  if (t.includes("très") || t === "élevée" || t.startsWith("élev")) return "";
  if (t.includes("faible")) return "c-low";
  return "c-mid";
}

function statusLabel(m) {
  if (m.status === "FT") return "Terminé";
  if (m.status === "HT") return "Mi-temps";
  if (m.status === "LIVE") return m.minute != null ? `${m.minute}ʹ` : "En direct";
  if (m.status === "NS" || m.status === "SCHED") {
    return m.kickoffParis ? `${m.kickoffParis.replace("h", ":")} · Paris` : "À venir";
  }
  return m.status || "n.d.";
}

function isLive(m) {
  return m.status === "LIVE" || m.status === "HT";
}

function pickBadge(p) {
  if (!p) return "";
  const m = (p.market || "").toUpperCase();
  const label = p.label || "";
  if (m === "1" || m === "X" || m === "2" || m === "1X" || m === "12" || m === "X2") return m;
  if (/plus de\s*([0-9]+[.,][0-9]+)/i.test(label)) return "+" + RegExp.$1.replace(".", ",");
  if (/moins de\s*([0-9]+[.,][0-9]+)/i.test(label)) return "−" + RegExp.$1.replace(".", ",");
  if (m === "BTTS" || /deux équipes/i.test(label)) return "BTTS";
  if (m === "CRN" || /corner/i.test(label)) return "Corners";
  if (m === "OU") return label.replace("buts", "").trim();
  return (p.label || m || "?").slice(0, 18);
}

function settle(market, score, status, pickLabel) {
  if (!score || score.home == null || score.away == null) return "pending";
  const hg = Number(score.home), ag = Number(score.away);
  const tot = hg + ag;
  const ft = status === "FT";
  const raw = String(market || pickLabel || "").toUpperCase().replace(",", ".");
  const over = raw.match(/^(?:O|OVER)\s*([0-9]+(?:\.[0-9]+)?)/) || /PLUS DE\s*([0-9]+(?:[.,][0-9]+)?)/i.exec(String(pickLabel || market || ""));
  const under = raw.match(/^(?:U|UNDER)\s*([0-9]+(?:\.[0-9]+)?)/) || /MOINS DE\s*([0-9]+(?:[.,][0-9]+)?)/i.exec(String(pickLabel || market || ""));

  const win1 = /GAGNANT/.test(String(pickLabel || "").toUpperCase()) && raw === "1";

  if (over) {
    const line = parseFloat(String(over[1]).replace(",", "."));
    if (tot > line) return "won";
    if (ft) return "lost";
    return "pending";
  }
  if (under) {
    const line = parseFloat(String(under[1]).replace(",", "."));
    if (tot > line) return "lost";
    if (ft) return "won";
    return "pending";
  }
  if (raw === "BTTS" || /DEUX ÉQUIPES MARQUENT|LES DEUX ÉQUIPES MARQUENT/i.test(pickLabel || "")) {
    if (hg > 0 && ag > 0) return "won";
    if (ft) return "lost";
    return "pending";
  }
  if (raw === "1X" || /DOUBLE CHANCE 1X/i.test(pickLabel || "")) {
    if (ft) return hg >= ag ? "won" : "lost";
    return "pending";
  }
  if (raw === "X2" || /DOUBLE CHANCE X2/i.test(pickLabel || "")) {
    if (ft) return ag >= hg ? "won" : "lost";
    return "pending";
  }
  if (raw === "12" || /DOUBLE CHANCE 12/i.test(pickLabel || "")) {
    if (ft) return hg !== ag ? "won" : "lost";
    return "pending";
  }
  if (raw === "1" || win1 || /GAGNANT/.test(String(pickLabel || "").toUpperCase()) && !/DOUBLE/.test(String(pickLabel || "").toUpperCase())) {
    // "Hammarby gagnant" is market "1"
    if (raw === "1" || /^1$/.test(raw)) {
      if (ft) return hg > ag ? "won" : "lost";
      return "pending";
    }
  }
  if (raw === "2") {
    if (ft) return ag > hg ? "won" : "lost";
    return "pending";
  }
  if (raw === "X") {
    if (ft) return hg === ag ? "won" : "lost";
    return "pending";
  }
  return "pending";
}

function tagLabel(st) {
  if (st === "won") return "OK";
  if (st === "lost") return "Perdu";
  return "En cours";
}

function saveFavs() {
  localStorage.setItem(FAV_KEY, JSON.stringify([...state.favs]));
}

function toggleFav(id, ev) {
  if (ev) ev.stopPropagation();
  if (state.favs.has(id)) state.favs.delete(id);
  else state.favs.add(id);
  saveFavs();
  render();
}

function matchById(id) {
  return (state.data.matches || []).find((m) => m.id === id);
}


function consensusClass(label) {
  const t = (label || "").toLowerCase();
  if (t.includes("fort") && !t.includes("non")) return "fort";
  if (t.includes("moyen +") || t.includes("moyenne +")) return "moyenplus";
  if (t.includes("divergent")) return "divergent";
  if (t.includes("moyen")) return "moyen";
  return "";
}

function fmtProbs(p) {
  if (!p) return "";
  const bits = [];
  if (p.home != null) bits.push("1 " + p.home + " %");
  if (p.draw != null) bits.push("N " + p.draw + " %");
  if (p.away != null) bits.push("2 " + p.away + " %");
  return bits.join(" · ");
}

function sourceRow(s) {
  if (s.status !== "ok") {
    return `<tr><td>${esc(s.name || s.id)}</td><td class="src-no" colspan="2">${esc(s.reason || "Non disponible")}</td></tr>`;
  }
  const pred = [s.pred1x2 ? ("1N2 : " + s.pred1x2) : "", s.correctScore ? ("score " + s.correctScore) : "", s.doubleChance ? ("DC " + s.doubleChance) : "", s.tip && s.tip !== s.pred1x2 ? ("tip " + s.tip) : ""].filter(Boolean).join(" · ");
  const extra = [];
  if (s.probs) extra.push(fmtProbs(s.probs));
  if (s.over25 && s.over25.pred) extra.push((s.over25.pred === "Over" ? "Plus" : "Moins") + " de 2,5" + (s.over25.over != null ? " (" + s.over25.over + " % / " + s.over25.under + " %)" : ""));
  if (s.btts && s.btts.pred) extra.push("BTTS " + (s.btts.pred === "Yes" ? "oui" : "non") + (s.btts.yes != null ? " (" + s.btts.yes + " %)" : ""));
  const link = s.url ? ` <a href="${esc(s.url)}" target="_blank" rel="noopener">source</a>` : "";
  return `<tr><td>${esc(s.name || s.id)}${link}</td><td class="src-ok">${esc(pred || "—")}</td><td>${esc(extra.join(" · ") || "")}</td></tr>`;
}

function consensusChip(c) {
  if (!c) return "";
  if (c.score == null && (c.label === "non disponible" || !c.label)) {
    return `<div class="consensus">Consensus : non disponible</div>`;
  }
  return `<div class="consensus ${consensusClass(c.label)}">Consensus ${c.score != null ? c.score + " · " : ""}${esc(c.label || "")}</div>`;
}

function sourcesBlock(m) {
  const srcs = m.externalSources || [];
  if (!srcs.length && !m.consensus) return "";
  const rows = srcs.map(sourceRow).join("");
  const sum = m.consensus && m.consensus.summary ? `<p class="muted" style="font-size:.75rem;margin:6px 0 0">${esc(m.consensus.summary)}</p>` : "";
  return `${consensusChip(m.consensus)}
    <dt>Modèles IA (sources publiques)</dt>
    <dd><table class="sources"><thead><tr><th>Source</th><th>Pronostic</th><th>Probabilités</th></tr></thead><tbody>${rows}</tbody></table>${sum}</dd>`;
}

function cardHTML(m) {

  const flag = FLAGS[m.countryCode] || "🏳️";
  const fav = state.favs.has(m.id);
  const live = isLive(m);
  const hasScore = m.score && m.score.home != null;
  const scoreCls = live ? "score live" : "score";
  const scoreTxt = hasScore ? `${m.score.home}–${m.score.away}` : (m.kickoffParis ? m.kickoffParis : "—");
  const ht = m.htScore && m.htScore.home != null ? `MT ${m.htScore.home}–${m.htScore.away}` : (m.status === "FT" || m.status === "HT" ? "MT n.d." : "");
  const p = m.prediction;
  const league = [m.country, m.league, m.round].filter(Boolean).join(" · ");
  let pickBlock = `<p class="no-pick">Pronostic : non disponible</p>`;
  if (p) {
    pickBlock = `
      <div class="pick-row">
        <span class="badge">${esc(pickBadge(p))}</span>
        <span class="odds">${esc(fmtOdds(p.odds))}</span>
        <span class="conf ${confClass(p.confidence)}">${esc(p.confidence || "")}</span>
      </div>
      <p class="explain">${esc(p.explanation || "")}</p>`;
  }
  const details = [];
  if (m.venue) details.push(`<dt>Lieu</dt><dd>${esc(m.venue)}${m.referee ? " · Arbitre : " + esc(m.referee) : ""}</dd>`);
  if (m.scorerNote) details.push(`<dt>Buteurs</dt><dd>${esc(m.scorerNote)}</dd>`);
  if (p && m.otherPicks && m.otherPicks.length) {
    details.push(`<dt>Autres sélections</dt><dd>${m.otherPicks.map((x) => `${esc(x.label)} @ ${esc(fmtOdds(x.odds))} (${esc(x.confidence)}) — ${esc(x.explanation)}`).join("<br>")}</dd>`);
  }
  if (m.odds1x2) details.push(`<dt>Cotes 1N2</dt><dd>1 : ${esc(fmtOdds(m.odds1x2.home))} · N : ${esc(fmtOdds(m.odds1x2.draw))} · 2 : ${esc(fmtOdds(m.odds1x2.away))}</dd>`);
  if (m.form) details.push(`<dt>Forme</dt><dd>${esc(m.form)}</dd>`);
  if (m.absences) details.push(`<dt>Absents</dt><dd>${esc(m.absences)}</dd>`);
  if (m.h2h) details.push(`<dt>Confrontations</dt><dd>${esc(m.h2h)}</dd>`);
  if (m.stats) details.push(`<dt>Stats</dt><dd>${esc(m.stats)}</dd>`);
  if (m.sources || m.scoreSource) details.push(`<dt>Sources</dt><dd>${esc(m.sources || m.scoreSource)}</dd>`);
  if (m.externalSources || m.consensus) details.push(sourcesBlock(m));
  const detailsBtn = details.length
    ? `<button class="details-btn" data-open="${esc(m.id)}">Voir le détail</button><dl class="details" id="d-${esc(m.id)}">${details.join("")}</dl>`
    : "";

  return `<article class="card" data-id="${esc(m.id)}">
    <div class="card-head">
      <span class="flag">${flag}</span>
      <span class="league">${esc(league)}</span>
      <button class="star ${fav ? "on" : ""}" aria-label="Favori" data-fav="${esc(m.id)}">${fav ? "★" : "☆"}</button>
    </div>
    <div class="teams">
      <div class="team">${esc(m.home)}</div>
      <div class="score-box">
        <div class="${hasScore ? scoreCls : "score"}">${esc(String(scoreTxt))}</div>
        <div class="meta-score">${esc(ht)}</div>
        <div class="status ${live ? "live" : (m.status === "FT" ? "ft" : "")}">${esc(statusLabel(m))}</div>
      </div>
      <div class="team away">${esc(m.away)}</div>
    </div>
    ${pickBlock}
    ${m.consensus ? consensusChip(m.consensus) : ""}
    ${detailsBtn}
  </article>`;
}

function ticketHTML(t) {
  const legs = t.legs.map((leg) => {
    const match = matchById(leg.matchId);
    const st = match ? settle(leg.market, match.score, match.status, leg.pick) : "pending";
    return { ...leg, st, match };
  });
  const lost = legs.some((l) => l.st === "lost");
  const won = legs.every((l) => l.st === "won");
  const overall = lost ? "lost" : won ? "won" : "pending";
  const rows = legs.map((l) => `
    <div class="leg">
      <span class="time">${esc(l.time)}</span>
      <span><strong>${esc(l.label)}</strong><br><span class="pick">${esc(l.pick)}</span></span>
      <span class="odds">${esc(fmtOdds(l.odds))}</span>
      <span class="tag ${l.st}">${tagLabel(l.st)}</span>
    </div>`).join("");
  return `<article class="card ticket">
    <div class="ticket-top">
      <div>
        <h3>${esc(t.title)}</h3>
        <p class="muted" style="margin:0;font-size:.8rem">${esc(t.subtitle || "")} · Confiance : ${esc(t.confidence || "n.d.")}</p>
      </div>
      <div style="text-align:right">
        <div class="tot">${esc(fmtOdds(t.totalOdds))}</div>
        <span class="tag ${overall}">${tagLabel(overall)}</span>
      </div>
    </div>
    ${rows}
    <p class="muted" style="font-size:.75rem;margin:8px 0 0">${esc(t.note || "")}</p>
  </article>`;
}


function parisTime(t) {
  if (!t || t === "n.d.") return "Heure : non disponible";
  return String(t).replace(":", "h") + " · Paris";
}

function tipHTML(tip) {
  if (!tip || !(tip.legs || []).length) {
    return `<div class="empty"><strong>Pas de Top Tip IA</strong>Aucune sélection avec une cote relevée n'était disponible pour aujourd'hui. Aucun chiffre n'a été inventé.</div>`;
  }
  const legs = tip.legs.map((leg) => {
    const match = matchById(leg.matchId);
    const st = match ? settle(leg.market, match.score, match.status, leg.pick) : "pending";
    const flag = FLAGS[(match && match.countryCode) || leg.countryCode] || "🏳️";
    const league = [leg.country || (match && match.country), leg.league || (match && match.league)].filter(Boolean).join(" · ");
    let scoreBit = "";
    if (match && match.score && match.score.home != null) {
      const live = isLive(match);
      scoreBit = `<span class="${live ? "score live" : "score"}" style="font-size:1rem;margin-left:6px">${esc(match.score.home)}–${esc(match.score.away)}</span>
        <span class="status ${live ? "live" : (match.status === "FT" ? "ft" : "")}">${esc(statusLabel(match))}</span>`;
    }
    return `<article class="card tip-leg">
      <p class="when">${esc(parisTime(leg.time))}</p>
      <p class="teams-line">${esc(leg.home)} – ${esc(leg.away)} ${scoreBit}</p>
      <p class="comp"><span class="flag">${flag}</span> ${esc(league)}</p>
      <div class="pick-row">
        <span class="badge">${esc(pickBadge({ market: leg.market, label: leg.pick }))}</span>
        <span class="odds">${esc(fmtOdds(leg.odds))}</span>
        <span class="conf ${confClass(leg.confidence)}">${esc(leg.confidence || "")}</span>
        <span class="tag ${st}">${tagLabel(st)}</span>
      </div>
      <p class="explain">${esc(leg.explanation || "Justification non disponible.")}</p>
      ${leg.consensusScore != null ? `<div class="consensus">Consensus ${esc(String(leg.consensusScore))}</div>` : ""}
    </article>`;
  }).join("");
  const lost = (tip.legs || []).some((leg) => {
    const match = matchById(leg.matchId);
    return match && settle(leg.market, match.score, match.status, leg.pick) === "lost";
  });
  const won = (tip.legs || []).every((leg) => {
    const match = matchById(leg.matchId);
    return match && settle(leg.market, match.score, match.status, leg.pick) === "won";
  });
  const overall = lost ? "lost" : won ? "won" : "pending";
  return `<section class="tip-hero">
      <p class="tip-kicker">Analyse IA</p>
      <h2>${esc(tip.title || "Top Tip IA du jour")}</h2>
      <div class="tip-total-row">
        <div class="tip-total"><span>Cote totale</span>${esc(fmtOdds(tip.totalOdds))}</div>
        <div class="tip-pill">${esc(tip.subtitle || "")}<br>Confiance : ${esc(tip.confidence || "n.d.")}<br><span class="tag ${overall}">${tagLabel(overall)}</span></div>
      </div>
      <p class="tip-method">${esc(tip.method || "")}</p>
    </section>
    ${legs}`;
}

function filteredMatches() {

  let list = state.data.matches || [];
  if (state.tab === "top") list = list.filter((m) => m.isTop && m.prediction);
  else if (state.tab === "live") list = list.filter(isLive);
  else if (state.tab === "fav") list = list.filter((m) => state.favs.has(m.id));
  if (state.filter && state.filter !== "all") {
    list = list.filter((m) => `${m.country} · ${m.league}` === state.filter || m.country === state.filter || m.league === state.filter);
  }
  const q = state.query.trim().toLowerCase();
  if (q) {
    list = list.filter((m) =>
      [m.home, m.away, m.league, m.country, m.round, m.prediction && m.prediction.label]
        .filter(Boolean).join(" ").toLowerCase().includes(q)
    );
  }
  const order = { LIVE: 0, HT: 1, NS: 2, SCHED: 2, FT: 3 };
  return [...list].sort((a, b) => {
    const pa = a.prediction ? 0 : 1;
    const pb = b.prediction ? 0 : 1;
    if (pa !== pb) return pa - pb;
    const da = order[a.status] ?? 9;
    const db = order[b.status] ?? 9;
    if (da !== db) return da - db;
    return String(a.kickoffIso || a.kickoffParis || "").localeCompare(String(b.kickoffIso || b.kickoffParis || ""));
  });
}

function uniqueFilters() {
  const set = new Map();
  for (const m of state.data.matches || []) {
    const key = m.league ? `${m.country} · ${m.league}` : m.country;
    if (!set.has(key)) set.set(key, (FLAGS[m.countryCode] || "") + " " + key);
  }
  return [...set.entries()].sort((a, b) => a[0].localeCompare(b[0], "fr"));
}

function renderFilters() {
  const box = $("#filter-chips");
  const items = [["all", "Tous"], ...uniqueFilters()];
  box.innerHTML = items.map(([k, lab]) =>
    `<button class="chip ${state.filter === k ? "active" : ""}" data-filter="${esc(k)}">${esc(lab)}</button>`
  ).join("");
}

function rgHTML() {
  const r = state.data.responsibleGambling || {};
  return `<aside class="rg"><strong>${esc(r.title || "18+ uniquement.")}</strong> ${esc(r.text || "")} ${esc(r.help || "")}</aside>`;
}

function bannerHTML() {
  const n = state.data;
  const long = [n.scoresNote, n.sourcesNote, n.context].filter(Boolean).join("\n\n");
  return `<aside class="banner">Scores figés à l'heure de relève indiquée · cotes du matin, non inventées.
    <button class="method-toggle" id="toggle-sources" type="button">Sources et méthode</button>
    <div class="details" id="sources-box">${esc(long).replace(/\n/g, "<br>")}</div>
  </aside>`;
}

function render() {
  if (!state.data) return;
  $("#date-label").textContent = state.data.dateLabel || state.data.date;
  const liveN = (state.data.matches || []).filter(isLive).length;
  const chip = $("#live-count");
  if (liveN) {
    chip.hidden = false;
    $("#live-count-txt").textContent = `${liveN} en direct`;
  } else chip.hidden = true;

  renderFilters();

  const main = $("#main");
  if (state.tab === "tip") {
    main.innerHTML = tipHTML(state.data.topTip) + rgHTML();
    return;
  }
  if (state.tab === "tickets") {
    const tickets = state.data.tickets || [];
    main.innerHTML = (tickets.length ? tickets.map(ticketHTML).join("") : `<div class="empty"><strong>Pas de ticket</strong>Aucun ticket pour cette date.</div>`)
      + rgHTML();
    return;
  }

  const list = filteredMatches();
  let title = "Tous les pronostics";
  if (state.tab === "tip") title = "Top Tip IA";
  if (state.tab === "live") title = "En direct";
  if (state.tab === "fav") title = "Favoris";
  const emptyMsg = {
    live: ["Aucun match en direct", "Les scores sont figés à l’heure de relève indiquée."],
    fav: ["Pas encore de favori", "Touchez l’étoile sur une carte pour l’enregistrer sur cet appareil."],
    tip: ["Pas de Top Tip IA", "Aucune sélection avec cote relevée."],
    all: ["Aucun match", "Pas de donnée pour ce filtre."],
  }[state.tab] || ["Aucun match", ""];

  const install = `<div class="install" id="install-box">
    <strong>Installer l’appli</strong>
    <p class="muted" style="margin:4px 0 0">Sur Android : « Ajouter à l’écran d’accueil ». Sur iPhone : bouton Partager, puis « Sur l’écran d’accueil ».</p>
    <button class="primary" id="btn-install" hidden>Installer</button>
  </div>`;

  main.innerHTML = (state.tab === "all" ? install : "")
    + (state.tab === "all" ? bannerHTML() : "")
    + `<p class="section-title">${esc(title)} · ${list.length}</p>`
    + (list.length ? list.map(cardHTML).join("") : `<div class="empty"><strong>${esc(emptyMsg[0])}</strong>${esc(emptyMsg[1])}</div>`)
    + rgHTML();

  maybeShowInstall();
}

function maybeShowInstall() {
  const box = $("#install-box");
  if (!box) return;
  const standalone = window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone;
  if (!standalone) box.classList.add("open");
  if (window._deferredPrompt) {
    const btn = $("#btn-install");
    if (btn) {
      btn.hidden = false;
      btn.onclick = async () => {
        window._deferredPrompt.prompt();
        await window._deferredPrompt.userChoice;
        window._deferredPrompt = null;
        btn.hidden = true;
      };
    }
  }
}

async function loadDate(date) {
  const url = date ? `data/predictions-${date}.json` : "data/latest.json";
  const res = await fetch(url, { cache: "no-cache" });
  if (!res.ok) throw new Error("Impossible de charger " + url);
  state.data = await res.json();
  state.date = state.data.date;
  document.title = `Top Pronos — ${state.data.dateLabel || state.data.date}`;
  render();
}

function dataUrlFor(d) { return `data/predictions-${d}.json`; }

async function discoverDates() {
  const known = new Set();
  if (state.data && state.data.date) known.add(state.data.date);
  // Probe a small window around today (Paris).
  const base = state.data && state.data.date ? new Date(state.data.date + "T12:00:00Z") : new Date();
  const tries = [];
  for (let i = -10; i <= 2; i++) {
    const x = new Date(base);
    x.setUTCDate(x.getUTCDate() + i);
    const iso = x.toISOString().slice(0, 10);
    if (iso !== state.data?.date) tries.push(iso);
  }
  await Promise.all(tries.map(async (iso) => {
    try {
      const r = await fetch(dataUrlFor(iso), { method: "HEAD", cache: "no-cache" });
      if (r.ok) known.add(iso);
    } catch (_) { /* ignore */ }
  }));
  state.datesWithData = [...known].sort();
}

function openCalendar() {
  const modal = $("#cal-modal");
  const body = $("#cal-body");
  const date = state.date || "2026-11-23";
  const [y, mo] = date.split("-").map(Number);
  const first = new Date(Date.UTC(y, mo - 1, 1));
  const startDow = first.getUTCDay(); // 0 Sun
  const daysIn = new Date(Date.UTC(y, mo, 0)).getUTCDate();
  const months = "janvier,février,mars,avril,mai,juin,juillet,août,septembre,octobre,novembre,décembre".split(",");
  const dows = ["L", "M", "M", "J", "V", "S", "D"];
  let html = `<p class="muted" style="margin:0 0 8px">${months[mo - 1]} ${y} · heure de Paris</p><div class="cal-grid">`;
  html += dows.map((d) => `<div class="dow">${d}</div>`).join("");
  const offset = (startDow + 6) % 7; // Monday first
  for (let i = 0; i < offset; i++) html += `<div></div>`;
  for (let d = 1; d <= daysIn; d++) {
    const iso = `${y}-${String(mo).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    const has = state.datesWithData.includes(iso);
    const cls = ["cal-day", has ? "has" : "", iso === date ? "active" : "", iso === state.data?.date ? "today" : ""].filter(Boolean).join(" ");
    html += `<button class="${cls}" data-iso="${iso}" ${has ? "" : "disabled"}>${d}</button>`;
  }
  html += `</div><p class="muted" style="font-size:.75rem;margin:12px 0 0">Les jours en vert ont un fichier de pronostics.</p>`;
  body.innerHTML = html;
  modal.hidden = false;
  modal.classList.add("open");
}

function closeCalendar() {
  const modal = $("#cal-modal");
  modal.classList.remove("open");
  modal.hidden = true;
}

function bind() {
  $$(".nav-item").forEach((btn) => {
    btn.addEventListener("click", () => {
      state.tab = btn.dataset.tab;
      $$(".nav-item").forEach((b) => b.classList.toggle("active", b === btn));
      render();
      window.scrollTo(0, 0);
    });
  });
  $("#btn-search").addEventListener("click", () => {
    const bar = $("#search-bar");
    bar.classList.toggle("open");
    $("#filter-bar").classList.remove("open");
    if (bar.classList.contains("open")) $("#search-input").focus();
  });
  $("#btn-filter").addEventListener("click", () => {
    $("#filter-bar").classList.toggle("open");
    $("#search-bar").classList.remove("open");
  });
  $("#search-input").addEventListener("input", (e) => {
    state.query = e.target.value;
    render();
  });
  $("#filter-chips").addEventListener("click", (e) => {
    const b = e.target.closest("[data-filter]");
    if (!b) return;
    state.filter = b.dataset.filter;
    render();
  });
  $("#main").addEventListener("click", (e) => {
    const fav = e.target.closest("[data-fav]");
    if (fav) return toggleFav(fav.dataset.fav, e);
    if (e.target.id === "toggle-sources") {
      const box = document.getElementById("sources-box");
      if (box) {
        box.classList.toggle("open");
        e.target.textContent = box.classList.contains("open") ? "Masquer les sources" : "Sources et méthode";
      }
      return;
    }
    const open = e.target.closest("[data-open]");
    if (open) {
      const dl = document.getElementById("d-" + open.dataset.open);
      if (dl) {
        dl.classList.toggle("open");
        open.textContent = dl.classList.contains("open") ? "Masquer le détail" : "Voir le détail";
      }
    }
  });
  $("#btn-cal").addEventListener("click", async () => {
    if (!state.datesWithData.length) await discoverDates();
    else await discoverDates();
    openCalendar();
  });
  $("#cal-close").addEventListener("click", closeCalendar);
  $("#cal-modal").addEventListener("click", (e) => {
    if (e.target.id === "cal-modal") closeCalendar();
    const day = e.target.closest("[data-iso]");
    if (day && !day.disabled) {
      closeCalendar();
      loadDate(day.dataset.iso).catch((err) => alert(err.message));
    }
  });
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    window._deferredPrompt = e;
    maybeShowInstall();
  });
}

async function main() {
  bind();
  const params = new URLSearchParams(location.search);
  try {
    await loadDate(params.get("date"));
  } catch (err) {
    $("#date-label").textContent = "Données indisponibles";
    $("#main").innerHTML = `<div class="empty"><strong>Chargement impossible</strong>${esc(err.message)}</div>`;
  }
  if ("serviceWorker" in navigator) {
    try { await navigator.serviceWorker.register("sw.js"); } catch (_) { /* offline first later */ }
  }
}

main();
