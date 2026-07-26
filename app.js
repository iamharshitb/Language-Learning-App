/* Nerchuko — app logic. Vanilla JS, no build step, no external dependencies.
   Requires languages.js (defines `LANGUAGES`, `LANGUAGE_ORDER`) and each
   data-XX.js curriculum file to be loaded first. */

const CARDS_BY_LANG = {};
for (const code of LANGUAGE_ORDER) {
  CARDS_BY_LANG[code] = LANGUAGES[code].weeks.flatMap((w) =>
    w.cards.map((c, ci) => ({ ...c, id: `w${w.week}-${ci}`, month: w.month, week: w.week, theme: w.theme }))
  );
}

/* ---------- date helpers ---------- */
const pad = (n) => String(n).padStart(2, "0");
function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
function addDays(dateStr, days) {
  const d = new Date(dateStr + "T00:00:00");
  d.setDate(d.getDate() + days);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
function daysBetween(a, b) {
  return Math.round((new Date(b + "T00:00:00") - new Date(a + "T00:00:00")) / 86400000);
}

/* ---------- spaced repetition (leitner) ---------- */
const INTERVALS = [0, 1, 3, 7, 14, 30, 45];

function leitnerUpdate(state, outcome) {
  let box = state?.box ?? 0;
  if (outcome === "again") box = 1;
  else if (outcome === "good") box = Math.min(box + 1, INTERVALS.length - 1);
  else if (outcome === "easy") box = Math.min(box + 2, INTERVALS.length - 1);
  return {
    box,
    dueDate: addDays(todayStr(), INTERVALS[box]),
    correct: (state?.correct ?? 0) + (outcome !== "again" ? 1 : 0),
    wrong: (state?.wrong ?? 0) + (outcome === "again" ? 1 : 0),
    seen: (state?.seen ?? 0) + 1,
  };
}

function updateStreak(streak) {
  const today = todayStr();
  if (streak.lastPracticeDate === today) return streak;
  let current = 1;
  if (streak.lastPracticeDate) {
    const gap = daysBetween(streak.lastPracticeDate, today);
    if (gap === 1) current = streak.current + 1;
  }
  return { current, longest: Math.max(current, streak.longest || 0), lastPracticeDate: today };
}

function cardsForLang() {
  return CARDS_BY_LANG[currentLang];
}

function dueTodayCount() {
  const t = todayStr();
  return cardsForLang().filter((c) => progress.cardStates[c.id] && progress.cardStates[c.id].dueDate <= t).length;
}

function sessionSize() {
  const totalIntroduced = Object.keys(progress.cardStates).length;
  const newAvailable = Math.min(progress.settings.dailyNewLimit, cardsForLang().length - totalIntroduced);
  return dueTodayCount() + newAvailable;
}

function buildQueue() {
  const today = todayStr();
  const cards = cardsForLang();
  const due = cards.filter((c) => progress.cardStates[c.id] && progress.cardStates[c.id].dueDate <= today);
  const fresh = cards.filter((c) => !progress.cardStates[c.id]).slice(0, progress.settings.dailyNewLimit);
  const merged = [];
  const max = Math.max(due.length, fresh.length);
  for (let i = 0; i < max; i++) {
    if (due[i]) merged.push(due[i]);
    if (fresh[i]) merged.push(fresh[i]);
  }
  return merged;
}

function defaultLangProgress() {
  return {
    startDate: todayStr(),
    cardStates: {},
    streak: { current: 0, longest: 0, lastPracticeDate: null },
    settings: { dailyNewLimit: 8 },
    totalReviews: 0,
  };
}

/* ---------- storage ---------- */
/* Reads/writes go through window.NerchukoStorage, installed by
   storage-adapter.js (device-local) and optionally replaced by
   firebase-sync.js (cloud-synced) if Firebase is configured. app.js doesn't
   need to know which one is active. */

async function loadAllProgress() {
  await window.NerchukoStorage.ready;
  return window.NerchukoStorage.get();
}

function saveAllProgress() {
  // Fire-and-forget: the UI already reflects the in-memory update; persisting
  // (local or cloud) happens in the background.
  window.NerchukoStorage.set(allProgress).catch((e) => console.error("save failed", e));
}

function getLangProgress(code) {
  if (!allProgress.languages[code]) {
    allProgress.languages[code] = defaultLangProgress();
  }
  return allProgress.languages[code];
}

/* ---------- speech ---------- */
function speak(text) {
  try {
    if (!("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = LANGUAGES[currentLang].ttsLocale;
    u.rate = 0.85;
    window.speechSynthesis.speak(u);
  } catch {
    /* no-op */
  }
}

/* ---------- state ---------- */
let allProgress = null;
let currentLang = "te";
let progress = null; // convenience alias for allProgress.languages[currentLang]
let queue = [];
let index = 0;
let flipped = false;
let sessionStats = { again: 0, good: 0, easy: 0 };
let expandedWeek = null;
let confirmReset = false;

/* ---------- language switching ---------- */
function switchLanguage(code) {
  currentLang = code;
  progress = getLangProgress(code);
  allProgress.lastActiveLanguage = code;
  saveAllProgress();
  updateScriptFont();
  renderTabs();
  renderHome();
}

function updateScriptFont() {
  document.documentElement.style.setProperty("--script-font", LANGUAGES[currentLang].scriptFont);
}

function renderTabs() {
  document.querySelectorAll(".lang-tab").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.lang === currentLang);
  });
}

/* ---------- view switching ---------- */
function showView(name) {
  document.querySelectorAll(".view").forEach((v) => v.classList.add("hidden"));
  document.getElementById("view-" + name).classList.remove("hidden");
  window.scrollTo(0, 0);
}

/* ---------- home ---------- */
function computeWeekStatuses() {
  const out = {};
  const cards = cardsForLang();
  for (const w of LANGUAGES[currentLang].weeks) {
    const wc = cards.filter((c) => c.week === w.week);
    const introduced = wc.filter((c) => progress.cardStates[c.id]).length;
    const mastered = wc.filter((c) => progress.cardStates[c.id] && progress.cardStates[c.id].box >= 4).length;
    out[w.week] = introduced === 0 ? "locked" : mastered === wc.length ? "mastered" : "active";
  }
  return out;
}

function renderMala() {
  const weeks = LANGUAGES[currentLang].weeks;
  const statuses = computeWeekStatuses();
  document.getElementById("mala").innerHTML = weeks.map((w) => `<span class="bead ${statuses[w.week]}"></span>`).join("");
  const current =
    weeks.find((w) => statuses[w.week] === "active") ||
    weeks.find((w) => statuses[w.week] === "locked") ||
    weeks[weeks.length - 1];
  document.getElementById("mala-caption").innerHTML = `Week ${current.week} · <b>${current.theme}</b>`;
}

function renderStats() {
  const totalIntroduced = Object.keys(progress.cardStates).length;
  const total = cardsForLang().length;
  document.getElementById("stat-streak").textContent = progress.streak.current;
  document.getElementById("stat-learned").textContent = `${totalIntroduced}/${total}`;
  document.getElementById("stat-due").textContent = dueTodayCount();
  document.getElementById("total-cards").textContent = total;
  document.getElementById("daily-limit").textContent = progress.settings.dailyNewLimit;
}

function renderHomeCTA() {
  const el = document.getElementById("home-cta");
  const n = sessionSize();
  if (n > 0) {
    el.innerHTML = `<button class="btn-primary" data-action="start-session">Start today's practice (${n})</button>`;
  } else {
    el.innerHTML = `
      <div class="caught-up">All caught up for today 🎉</div>
      <button class="btn-secondary" data-action="review-anyway">Review anyway</button>`;
  }
}

function renderResetRow() {
  const el = document.getElementById("reset-row");
  const langName = LANGUAGES[currentLang].name;
  if (!confirmReset) {
    el.innerHTML = `<button data-action="reset-ask">Reset ${langName} progress</button>`;
  } else {
    el.innerHTML = `
      <div class="reset-confirm">
        <span class="label">Erase ${langName} progress and start over?</span>
        <button class="danger" data-action="reset-yes">Yes, reset</button>
        <button data-action="reset-no">Cancel</button>
      </div>`;
  }
}

function renderHome() {
  const lang = LANGUAGES[currentLang];
  document.getElementById("hero-glyph").textContent = lang.heroGlyph;
  document.getElementById("hero-sub").textContent = lang.heroSub;
  document.getElementById("home-day").textContent = `Day ${daysBetween(progress.startDate, todayStr()) + 1} of your 4-month journey`;
  renderMala();
  renderStats();
  renderHomeCTA();
  renderResetRow();
}

/* ---------- session ---------- */
function startSession(fallback) {
  let q = buildQueue();
  if (q.length === 0 && fallback) {
    const cards = cardsForLang();
    const seen = cards.filter((c) => progress.cardStates[c.id]).sort((a, b) =>
      progress.cardStates[a.id].dueDate > progress.cardStates[b.id].dueDate ? 1 : -1
    );
    q = seen.slice(0, 10);
  }
  queue = q;
  index = 0;
  sessionStats = { again: 0, good: 0, easy: 0 };
  showView("session");
  renderSessionCard();
}

function renderSessionCard() {
  const card = queue[index];
  flipped = false;
  document.getElementById("session-count").textContent = `${index + 1} / ${queue.length}`;
  document.getElementById("progress-fill").style.width = Math.round((index / queue.length) * 100) + "%";
  document.getElementById("card-theme").textContent = card.theme;
  document.getElementById("card-en").textContent = card.en;
  document.getElementById("card-te").textContent = card.te;
  document.getElementById("card-tr").textContent = card.tr;
  document.getElementById("card-note").textContent = card.note || "";
  document.getElementById("flip-card").classList.remove("flipped");
  document.getElementById("btn-show-answer").classList.remove("hidden");
  document.getElementById("grade-controls").classList.add("hidden");
}

function toggleFlip() {
  flipped = !flipped;
  document.getElementById("flip-card").classList.toggle("flipped", flipped);
  document.getElementById("btn-show-answer").classList.toggle("hidden", flipped);
  document.getElementById("grade-controls").classList.toggle("hidden", !flipped);
}

function grade(outcome) {
  const card = queue[index];
  progress.cardStates[card.id] = leitnerUpdate(progress.cardStates[card.id], outcome);
  progress.streak = updateStreak(progress.streak);
  progress.totalReviews = (progress.totalReviews || 0) + 1;
  saveAllProgress();
  sessionStats[outcome]++;
  if (index + 1 < queue.length) {
    index++;
    renderSessionCard();
  } else {
    showView("summary");
    renderSummary();
  }
}

/* ---------- summary ---------- */
function renderSummary() {
  const total = sessionStats.again + sessionStats.good + sessionStats.easy;
  document.getElementById("summary-count").textContent = `${total} cards reviewed`;
  document.getElementById("summary-stats").innerHTML = `
    <div class="stat-pill"><span>✕</span><span class="value">${sessionStats.again}</span><span class="label">Again</span></div>
    <div class="stat-pill"><span>✓</span><span class="value">${sessionStats.good}</span><span class="label">Good</span></div>
    <div class="stat-pill"><span>✨</span><span class="value">${sessionStats.easy}</span><span class="label">Easy</span></div>`;
  const msg =
    progress.streak.current >= 30 ? "A month of showing up. Remarkable." :
    progress.streak.current >= 7 ? "A full week strong. Keep it going." :
    "Every day adds up.";
  document.getElementById("streak-banner").innerHTML = `🔥&nbsp; ${progress.streak.current}-day streak — ${msg}`;
}

/* ---------- browse ---------- */
function renderBrowse() {
  document.getElementById("browse-title").textContent = `All phrases · ${LANGUAGES[currentLang].name}`;
  const statuses = computeWeekStatuses();
  const cards = cardsForLang();
  let html = "";
  for (const m of [1, 2, 3, 4]) {
    html += `<div class="month-label">Month ${m}</div>`;
    for (const w of LANGUAGES[currentLang].weeks.filter((w) => w.month === m)) {
      const isOpen = expandedWeek === w.week;
      const status = statuses[w.week];
      const badge = status === "locked" ? "🔒 " : status === "mastered" ? "✅ " : "";
      const weekCards = cards.filter((c) => c.week === w.week);
      html += `
        <div class="week-card">
          <button class="week-header" data-action="toggle-week" data-week="${w.week}">
            <span class="left">${badge}Week ${w.week} · ${w.theme}</span>
            <span class="chevron ${isOpen ? "open" : ""}">▾</span>
          </button>
          ${isOpen ? `<div class="week-body">${weekCards.map((c) => `
            <div class="card-row">
              <div>
                <div class="en">${c.en}</div>
                <div class="te">${c.te}</div>
                <div class="tr">${c.tr}</div>
              </div>
              <button class="mini-speak" data-action="speak" data-card-id="${c.id}">🔊</button>
            </div>`).join("")}</div>` : ""}
        </div>`;
    }
  }
  document.getElementById("browse-list").innerHTML = html;
}

/* ---------- reset ---------- */
function doReset() {
  allProgress.languages[currentLang] = defaultLangProgress();
  progress = allProgress.languages[currentLang];
  saveAllProgress();
  confirmReset = false;
  showView("home");
  renderHome();
}

function adjustLimit(delta) {
  const val = Math.max(4, Math.min(16, progress.settings.dailyNewLimit + delta));
  progress.settings.dailyNewLimit = val;
  saveAllProgress();
  renderStats();
  renderHomeCTA();
}

/* ---------- event wiring ---------- */
function bindStaticEvents() {
  document.querySelectorAll(".lang-tab").forEach((btn) => {
    btn.addEventListener("click", () => {
      if (btn.dataset.lang === currentLang) return;
      confirmReset = false;
      switchLanguage(btn.dataset.lang);
    });
  });

  document.getElementById("btn-browse").addEventListener("click", () => {
    expandedWeek = null;
    showView("browse");
    renderBrowse();
  });
  document.getElementById("btn-limit-down").addEventListener("click", () => adjustLimit(-2));
  document.getElementById("btn-limit-up").addEventListener("click", () => adjustLimit(2));
  document.getElementById("btn-session-back").addEventListener("click", () => {
    showView("home");
    renderHome();
  });
  document.getElementById("btn-browse-back").addEventListener("click", () => {
    showView("home");
    renderHome();
  });
  document.getElementById("btn-summary-home").addEventListener("click", () => {
    showView("home");
    renderHome();
  });
  document.getElementById("flip-scene").addEventListener("click", toggleFlip);
  document.getElementById("btn-show-answer").addEventListener("click", () => {
    if (!flipped) toggleFlip();
  });
  document.getElementById("btn-speak").addEventListener("click", (e) => {
    e.stopPropagation();
    const card = queue[index];
    if (card) speak(card.te);
  });
  document.getElementById("btn-again").addEventListener("click", () => grade("again"));
  document.getElementById("btn-good").addEventListener("click", () => grade("good"));
  document.getElementById("btn-easy").addEventListener("click", () => grade("easy"));

  // delegated events for dynamically-rendered content
  document.body.addEventListener("click", (e) => {
    const el = e.target.closest("[data-action]");
    if (!el) return;
    const action = el.dataset.action;
    if (action === "start-session") startSession(false);
    else if (action === "review-anyway") startSession(true);
    else if (action === "reset-ask") { confirmReset = true; renderResetRow(); }
    else if (action === "reset-yes") doReset();
    else if (action === "reset-no") { confirmReset = false; renderResetRow(); }
    else if (action === "toggle-week") {
      const wk = parseInt(el.dataset.week, 10);
      expandedWeek = expandedWeek === wk ? null : wk;
      renderBrowse();
    } else if (action === "speak") {
      const card = cardsForLang().find((c) => c.id === el.dataset.cardId);
      if (card) speak(card.te);
    }
  });
}

function initStaticIcons() {
  document.getElementById("icon-streak").textContent = "🔥";
  document.getElementById("icon-learned").textContent = "✅";
  document.getElementById("icon-due").textContent = "📖";
  document.getElementById("btn-session-back").textContent = "←";
  document.getElementById("btn-browse-back").textContent = "←";
  document.getElementById("btn-speak").textContent = "🔊";
  document.getElementById("btn-again").innerHTML = `<span>✕</span><span>Again</span>`;
  document.getElementById("btn-good").innerHTML = `<span>✓</span><span>Good</span>`;
  document.getElementById("btn-easy").innerHTML = `<span>✨</span><span>Easy</span>`;
}

/* ---------- init ---------- */
async function init() {
  allProgress = (await loadAllProgress()) || { languages: {}, lastActiveLanguage: "te" };
  if (!allProgress.languages) allProgress.languages = {};
  currentLang = LANGUAGE_ORDER.includes(allProgress.lastActiveLanguage) ? allProgress.lastActiveLanguage : "te";
  progress = getLangProgress(currentLang);
  allProgress.lastActiveLanguage = currentLang;
  saveAllProgress();

  updateScriptFont();
  initStaticIcons();
  renderTabs();
  bindStaticEvents();
  renderHome();

  window.NerchukoStorage.onRemoteChange(handleRemoteUpdate);

  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("sw.js").catch(() => {});
  }
}

function handleRemoteUpdate(remoteProgress) {
  if (!remoteProgress || !remoteProgress.languages) return;
  allProgress = remoteProgress;
  currentLang = LANGUAGE_ORDER.includes(allProgress.lastActiveLanguage) ? allProgress.lastActiveLanguage : currentLang;
  progress = getLangProgress(currentLang);
  // Only refresh visible UI if we're not mid-session (don't yank the card
  // out from under an in-progress review).
  const midSession = !document.getElementById("view-session").classList.contains("hidden");
  if (!midSession) {
    renderTabs();
    updateScriptFont();
    const onBrowse = !document.getElementById("view-browse").classList.contains("hidden");
    if (onBrowse) renderBrowse();
    else renderHome();
  }
}

document.addEventListener("DOMContentLoaded", init);
