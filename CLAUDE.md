# WorkDesk PWA — Claude Context File

This file gives Claude full context about the WorkDesk app so any new chat session can pick up exactly where the last one left off. Always read this before making any changes.

---

## Project Overview

**App name:** WorkDesk — Internal Communications Team Task Tracker  
**Team:** MBC-IN / BBM-IN, Bosch Mobility India  
**Live URL:** https://iamharshitb.github.io/workdesk-pwa/  
**Custom domain also works:** https://iamharshit.com/workdesk-pwa/  
**GitHub repo:** https://github.com/iamharshitb/workdesk-pwa  
**Firebase project:** workdesk-ba979  
**Firebase WORKSPACE_ID:** `"harshit-team-2026"`  
**Firebase region:** asia-south1 (Mumbai)  
**Stack:** Vanilla HTML/CSS/JS — no build tools, no frameworks  
**Hosting:** GitHub Pages (main branch, root folder)  
**Auth:** Firebase Anonymous Auth only — no email/password  
**Database:** Firebase Firestore  

---

## Team Members

| Name | Role |
|------|------|
| Harshit | Admin — Assistant Manager, Marketing & Comms |
| Godly | Team member |
| Bhuvan | Team member |
| Sriram | Team member |
| Amrutha | Team member |

**Admin name constant:** `const ADMIN_NAME = 'Harshit'`  
**Delete password:** `workdesk@delete`  

---

## Firebase Authorized Domains

- `iamharshitb.github.io`
- `iamharshit.com`
- `localhost`
- `workdesk-ba979.firebaseapp.com`
- `workdesk-ba979.web.app`

If the app stops loading (spinner never completes), check Firebase Console → Authentication → Settings → Authorized Domains first.

---

## File Structure

```
workdesk-pwa/
├── index.html          — Dashboard (main page)
├── input.html          — Task input with duplicate detection
├── report.html         — Reports (Monthly / Weekly / My Report)
├── calendar.html       — Communications calendar
├── ideas.html          — Ideas management
├── backup.html         — Backup & restore
├── cards.html          — Player Cards (easter egg)
├── snake.html          — Snake game (easter egg)
├── quiz.html           — Comms Trivia Quiz (easter egg)
├── space.html          — Space Defender game (easter egg)
├── CLAUDE.md           — This file
├── manifest.json       — PWA manifest
├── sw.js               — Service worker (pass-through, no caching)
├── css/
│   ├── style.css       — Main design system and variables
│   └── themes.css      — All theme overrides
└── js/
    ├── firebase.js     — All Firestore functions and exports
    ├── theme.js        — Theme management (THEMES array + initTheme)
    └── sounds.js       — Audio functions
```

---

## Design System

**Default theme:** Neumorphism (`theme-neu`) — `#e0e5ec` clay, accent `#2d56d8`. Changed from Light in `js/theme.js`'s `getValidTheme()` — anyone with no `wd_theme` in localStorage (new install, or migrating off the old `'ios'` default) gets Neumorphism. Existing users who already have a saved theme are untouched.  
**Status bar colour:** `applyTheme()` now also calls `syncStatusBarColor()`, which writes the active theme's `bg` (already defined per-theme for the picker swatch) into `<meta name="theme-color">`. Previously this was a static dark value hardcoded in each page's `<head>`, which looked fine for the old dark-default themes but would clash badly with Neumorphism/Light's bright backgrounds. Don't hardcode `theme-color` in new pages — it's now managed at runtime.
**CSS variables (from style.css `:root`):**
- `--bg`, `--bg2`, `--bg3` — background layers
- `--panel` — card/panel background
- `--border`, `--border2` — border colours
- `--neon` — primary accent (blue)
- `--text`, `--text2`, `--text3` — text hierarchy
- `--red`, `--amber`, `--green`, `--purple` — semantic colours
- `--rr` — large border radius (cards), `--r` — small border radius
- `--sans` — Inter, `--mono` — DM Mono

**Fonts:** Inter (body/headings), DM Mono (numbers/timers). Loaded via `@import` at the top of `style.css`. *(Earlier versions of this doc claimed DM Sans / Syne / JetBrains Mono — that was never what the code loaded.)*

### Motion tokens — use these, don't hardcode timings

```
--dur-fast   .15s   colour / opacity only (no travel)
--dur-base   .24s   anything that moves or scales
--dur-slow   .36s   panels, sheets, layout shifts
--ease-out     cubic-bezier(.22,1,.36,1)     default — entrances & most UI
--ease-spring  cubic-bezier(.34,1.56,.64,1)  confirmations & taps (slight overshoot)
--ease-inout   cubic-bezier(.4,0,.2,1)       looping ambient animations
```

Every `transition` in `style.css` and `index.html` now routes through these. Previously 46 transitions were hardcoded `.15s` — snappy but characterless, and the reason the app felt utilitarian rather than polished. **If you add a transition, use a token.**

`@media (prefers-reduced-motion: reduce)` in style.css kills all motion and switches ambient loops off entirely. Any new ambient/looping animation should be added to that block's selector list.

### Glass tokens

```
--glass-bg     surface fill (translucent)
--glass-blur   blur(20px) saturate(180%)
--glass-edge   inset highlight along the top edge
```

**Glass only works if something is behind it.** This was learned the hard way on the old Light theme (`theme-health`, removed — see below): it set `background-image:none` over a flat `#f2f2f7` and made panels `#fff` opaque, so every `backdrop-filter` was a no-op costing a compositing layer for zero visual gain. Glassmorphism avoids this via the aurora blobs on `body::before`. **The general rule stands for any future light/translucent theme: flatten the body background and glass silently dies.**

Glass is applied to: `.nav`, `.bottom-nav`, `.panel`, `.prog-wrap`, `.toast`, `.install-banner`. It is deliberately **not** applied to `.task-card` / `.task-row-compact` — those are plain translucent fills that composite over the panel's frost. Giving each card its own `backdrop-filter` stacks a blur layer per card and gets expensive on mid-range Android past ~20 tasks.

### Alive layer (bottom of style.css)

**Bug that shipped and was fixed:** an earlier version of this section added `.panel { animation: panel-rise ... backwards; }` as a blanket entrance animation. The app already had a working entrance system — `.fi` (`animation: fu ... forwards`), applied per-element with hand-placed `animation-delay` (e.g. `class="panel fi" style="animation-delay:.11s"` on Dashboard's Task Tracker panel and Input's task/summary panels). Both rules have equal specificity (single class) and set the `animation` shorthand on the same elements; `.panel`, being later in the file, won — but its `backwards` fill-mode doesn't persist the end state like `.fi`'s `forwards` does. Once the animation finished, those panels snapped back to `.fi`'s static `opacity:0`, **permanently**. This silently blanked the entire Task Tracker panel (search bar, tabs, My Tasks list, Sprint section) on Dashboard and the task/summary panels on Input — looked exactly like "tasks aren't loading" but was 100% CSS, not a data or Firestore issue.

**Rule going forward:** don't add a competing entrance animation on the bare `.panel` selector — `.fi` already owns that job everywhere it's used. If a new panel needs to fade in and doesn't have `.fi` on it already, add `.fi` to its class list rather than inventing a second entrance system. More generally: before adding an `animation` shorthand to any bare class selector, `grep` for that class combined with `fi` (or any other class that already sets `animation`) — same-specificity shorthand conflicts are cascade-order-dependent and any fill-mode other than `forwards`/`both` will not persist the end state.



Theme-agnostic motion/light effects: progress-bar shine sweep, button sheen on hover (`.send-btn`/`.mark-done-btn`/`.t-go` — these now have `overflow:hidden`, so nothing inside them can poke outside the pill), press-compress physics, stat-pill hover lift, task-detail unfold, nav icon spring, staggered panel entrance, animated gradient on the greeting name (`.g-name`, with `@supports` fallback), sprint 🎯 breathe, and `.just-done` settle (applied by `toggleIndividualDone`, self-removes on animationend). Haptics: `navigator.vibrate` on task-done (12ms) and sprint-add (10ms) — no-ops where unsupported, including all of iOS Safari.

Rules: effects here must only use tokens, white-gradient overlays, and transform/opacity animations (GPU-cheap). Every ambient loop added here must also be switched off in BOTH `prefers-reduced-motion` blocks in style.css. The nav active indicator is `.bn-item.active::after` and carries `translateX(-50%)` — any animation on it must include that transform in its keyframes or the line jumps off-centre.

### Splash screen (index.html only)

Plays once per session on Dashboard load — the app's actual PWA `start_url`, per `manifest.json`. Markup + gating script sit immediately after `<body>`; CSS is in the head `<style>` block (`.splash-screen` etc). Sequence: the existing nav logo (reused from its base64 `<img>`, not redrawn) springs in → a small dot appears → pulses once → **blooms** (`transform:scale(1→120)`) until it fully covers the viewport in the active theme's accent colour → whole overlay fades to reveal the real dashboard, which has been loading/rendering behind it the entire time.

Gating (in the inline script, not CSS, so it never even paints for these cases):
- `prefers-reduced-motion: reduce` → element is removed outright before first paint.
- `sessionStorage.wd_splash_shown` → only plays once per session, not on every bottom-nav tap back to Dashboard.
- Tap anywhere to skip early.

Don't add the splash to other pages — Dashboard is the intentional single entry point. If you touch the nav logo's base64 string, the splash's `<img>` needs updating too (currently duplicated, not derived at runtime).

### Skeleton loading

`.skel-block` (generic shimmer, used inline via `style="width:..;height:.."`) and `.stat-pill.skel` (stat number placeholders) — both in the "SKELETON LOADING" block in index.html's `<style>`. Two call sites:
- Stat pills start with class `skel` in the static HTML; `renderStats()` removes it from all four on its first real call. Safe to call every render — `classList.remove` no-ops once already cleared.
- `#my-tasks-list` ships with 3 static skeleton rows as its initial HTML. Nothing removes them explicitly — `renderMyTasks()`'s `innerHTML = ...` wholesale-replaces the container the first time real data renders, so they're just gone.

If you add a new panel that loads async data, follow the same pattern: static skeleton markup as the initial HTML, let the real render's `innerHTML` assignment replace it — don't write extra removal code.

### Tap targets

A few controls were visually small but functionally fine — extended via an invisible `::before`/`::after` hit-area (`position:absolute; inset:-Npx`) rather than inflating the visible element, which would've looked oversized in a compact row. Done: `.trc-expand` (task row chevron, 28px visual → 44px tappable) and `.ann-perm-toggle` (announcement permission switch, 36×20 visual → 44px tappable). If you find another small interactive control, same pattern: add `position:relative` to the base rule, then a pseudo-element with `content:''; position:absolute; inset:-Npx` sized to reach 44px — don't resize the visible element itself.

### Task notifications (index.html only)

**"Lighter" version, deliberately** — no backend, no Firebase Cloud Messaging, no Cloud Functions, no Blaze billing plan. Piggybacks on the `onTasksChanged` Firestore listener that's already running, so it only fires while WorkDesk's JS is alive somewhere on that device (foreground, background tab, or an installed PWA that hasn't been fully closed/swiped away). **It will not wake a locked phone or fire from a fully-closed app** — that needs real push (FCM + Cloud Functions), which was scoped out as a separate, heavier build. If that's ever wanted later, the tradeoffs (Blaze plan, Cloud Console access requirements, the iOS Add-to-Home-Screen requirement for push specifically) were already researched — ask before rebuilding from scratch.

**Critical implementation detail:** notifications are shown via `navigator.serviceWorker.ready.then(reg => reg.showNotification(...))`, **not** `new Notification(...)`. MDN is explicit that the plain constructor throws a `TypeError` on nearly all mobile browsers, including Android Chrome — this is the majority platform for this team, so getting this wrong would have meant the feature silently never worked on anyone's phone while appearing to work fine in desktop testing. `sw.js` (v11+) has a `notificationclick` handler that focuses an existing WorkDesk tab or opens a new one at the dashboard.

Two independent "off" states, both checked by `notifEnabled()`:
- Browser-level: `Notification.permission` (`'granted'`/`'denied'`/`'default'`) — can't be programmatically overridden once denied, only by the person via their browser/site settings.
- App-level: `localStorage.wd_notif_enabled` — lets someone who already granted browser permission mute WorkDesk specifically without touching browser settings. Toggled via the 🔔/🔕 nav button (`handleNotifToggle`), which mirrors the existing mute-button pattern (`updateMuteBtn`/`handleMuteToggle`) right next to it.

Fires from inside `onTasksChanged`'s existing `type === 'added'` + `assignedToMe` branch (the same one that already plays a sound and shows a toast) via `maybeShowTaskNotification(task)` — added as one extra call alongside those, not a separate detection path. Skips itself (returns quietly, not an error) if `document.visibilityState === 'visible'`, since the toast already covers "person is currently looking at WorkDesk."

**Scope limitation:** only wired up on `index.html` (Dashboard). If someone has `input.html` or another page open instead, they won't get notified even if `tasks` changes underneath them — Dashboard was judged the natural "left open" tab. Extending to other pages would mean duplicating the permission UI + `maybeShowTaskNotification` there too.

### Haptics

`navigator.vibrate(ms)` — no-op where unsupported (all of iOS Safari, some Android browsers), so no feature-detection branching needed, just call it. Current touchpoints, all short (8–15ms) and reserved for **state changes**, not routine taps: task marked done (12ms, `toggleIndividualDone`), added to sprint (10ms, `toggleSprintTask`), theme switch (8ms, `js/theme.js` — deliberately on the swatch **click** handler, not inside `applyTheme()` itself, since that also runs on every page load via `initTheme()` and would buzz on every app open), and picking your name on the welcome screen (8ms, `selectWelcomeMember`). Keep new haptics this sparing — vibrating on every tap reads as gimmicky and drains battery; reserve it for moments that deserve a confirmation.

### Shadow tokens

`--shadow-card` / `--shadow-elevated` / `--shadow-neon`, layered (contact + ambient) and **tinted to the surface**, not black.

⚠️ **Any light-background theme MUST override `--shadow-elevated`.** The `:root` default is `rgba(0,0,0,.6)` — built for the old near-black Standard theme (removed). This bit the old Light theme (also removed, see below), which only overrode `--shadow-card` and ended up painting a 60%-black shadow on a white page — read as a grey smudge on `.task-card:hover` and `.toast`. `:root` is still a dark palette that no current theme uses; treat it as the fallback layer, and assume anything a theme doesn't override falls through to dark values. Skeuomorphism and Neumorphism both override `--shadow-elevated` correctly — check them for reference before adding another light theme.

---

## Themes (6 total)

| ID | Name | Description |
|----|------|-------------|
| `editorial` | Editorial | Inter font, #F3F3F5 bg, Linear/Notion style |
| `neu` | Neumorphism | **Default.** Soft UI on #e0e5ec clay; `--neu-out`/`--neu-in` shadow pairs define raised vs pressed — no borders anywhere, `--glass-blur:none` (opaque material), body background MUST stay flat or the light model breaks. Contrast is the style's endemic weakness: text alphas (.85/.8) and accent #2d56d8 are measured AA minimums — don't lighten them |
| `neudark` | Neumorphism Dark | Same soft-UI physics as `neu`, on a graphite clay base (`#2a2e37`) instead of light. The "light" shadow direction is a *lighter tint of the same dark base* (`rgba(68,75,90,...)`), not white — the "dark" direction goes toward near-black (`rgba(10,11,14,...)`). Same light-source logic, inverted luminosity. Accent palette is brightened versions of `neu`'s (e.g. `--neon:#6a98ff` vs `neu`'s `#2d56d8`) since dark backgrounds need lighter text/accents to hit AA, the opposite adjustment direction from the light version |
| `glass` | Glassmorphism | Showcase glass: aurora blobs drift on `body::before` (transform-only animation, `position:fixed` for free parallax), panels get a `::after` refraction streak. Task cards deliberately have NO backdrop-filter (per-card blur cost — cards sit ON already-frosted panels, a blur per card stacks up fast on mid-range Android past ~20 tasks) |
| `skeu` | Skeuomorphism | Leather/paper/brass — digital objects that look like their real-world counterparts, the opposite instinct from Neumorphism despite the similar name (see below). Realistic single-direction drop shadows (`--shadow-card`/`--shadow-elevated`), a dog-eared corner (`::after` triangle) on every `.panel`, dashed-double-border "stitching" on the leather nav/bottom-nav, glossy buttons via a permanent `::after` highlight overlay (deliberately `::after` not `::before` — the shared alive-layer hover-sheen in style.css already owns `::before` on `.send-btn`/`.mark-done-btn`, so both effects layer without conflict). `--glass-blur:none` — paper, no blur anywhere. Text alphas (.78/.68) and the accent palette (esp. `--amber:#8f5f19`, darkened from a "true" brass which failed AA at 2.75:1) are measured minimums on the card bg `#fbf3e0` — don't lighten them |
| `industrial` | Industrial | Black-and-white exposed-hardware aesthetic, built from a reference image of a "concept phone" lock screen (dot-matrix speaker grille, monospace GPS-coordinate readout, camera-cutout dot). Palette is near-monochrome on purpose — `--neon` is literal white (`#ffffff`), not a hue; the only colour is muted "indicator-light" accents for semantic status (`--red`/`--amber`/`--neon2`), deliberately desaturated rather than candy-bright, the way real hardware has a few small LEDs in an otherwise monochrome housing. `--purple` (on-hold) is reassigned to a steel blue-grey (`#94a3b8`) rather than an actual purple hue, keeping the monochrome discipline while preserving the variable's functional role. Distinctive decorative details: `.nav::after`/`.bottom-nav` get a repeating dot-matrix `radial-gradient` texture; `.nav::after` also adds a small camera-lens dot centred at the top (safe zone — horizontally centred between the logo and buttons in a `justify-content:space-between` nav, so it never overlaps either); `.panel::before`/`::after` add small screw-dots in the top corners (sits within `.panel-hd`'s own padding, not overlapping title text); `.greeting-bar::after` adds a decorative coordinates readout, deliberately anchored in the bar's own *top padding* (`top:4px`) rather than the bottom — the streak badge is vertically centred via flexbox, so its exact position shifts with how much greeting text/quote renders, but the top padding is empty space regardless of content height. Hard edges (4-6px radius) and monospace/uppercase labels throughout instead of soft shadows, on purpose — the opposite instinct from Neumorphism/Glassmorphism |

Themes are in `css/themes.css`. The THEMES array is in `js/theme.js`. Applied as body class e.g. `body.theme-editorial`. Default theme is set in `getValidTheme()` in `js/theme.js` (currently `'neu'`) — that function already falls back gracefully to the default for ANY unrecognized/removed theme id in localStorage, so removing a theme from `THEMES` never needs a matching migration branch.

**Neumorphism vs Skeuomorphism — don't confuse these despite the similar names:** Neumorphism is abstract (one continuous material, depth from soft dual shadows only, no literal textures). Skeuomorphism is literal (real textures, real object references — leather, paper, brass). Historically skeuomorphism (~2007–2013, early iOS) came first; flat design killed it; neumorphism (~2019–2020) was a partial reaction back toward physicality/depth without bringing back literal ornamentation. If asked to adjust one, make sure it's the intended one.

**Removed (previously 7 total):** Standard (empty id), iOS Fans (`bigsur`), Dark (`ios-system`), Neon (`neon`), Light (`health`), and Frosted Glass (`frosted`) were removed from the picker and stripped out of `css/themes.css`. A few orphaned/unused theme blocks (`theme-ios`, `theme-ember`, `theme-matrix`) still sit in `css/themes.css` from earlier iterations but are unreachable from the UI — leave alone unless asked to clean up further.

---

## Navigation Structure

**Bottom nav (all pages):** Dashboard / Input / Calendar / Report  
**Ideas:** Accessible via purple 💡 FAB button on dashboard (not in nav)  
**Backup:** Accessible from Report page or direct URL  

---

## Task Status System

4 states in order: `todo` → `inprog` → `onhold` → `done`

- **Todo** — neutral
- **In Progress** — amber
- **On Hold** — purple (clusters in a separate "⏸ On Hold" section)
- **Done** — green (grouped by month, collapsed)

Status cycles via button in expanded task card:  
`▶ Start` → `⏸ On Hold` → `↩ Resume` → back to Todo

---

## Key Features

### Dashboard (index.html)
- World clock strip (IST India + CET/CEST Germany, auto-DST)
- ⏱ Focus Timer — hidden by default, tap icon in clock strip to expand. 30m/45m/custom presets. Persists via localStorage. Auto-expands if timer is running on page load
- Greeting bar (personalised, streak 🔥 badge, quote, due this week / done this month)
- Stats pills: Total / In Prog / Done / Critical (tappable to filter)
- **Weekly Sprint** — "🎯 This Week's Sprint" section at top of My Tasks. Max 10 tasks/week. Resets every Monday. Stored in `localStorage` key `wd_sprint` as `{week:'YYYY-Www', ids:[...]}`. Add via "🎯 This Week" button in expanded task card
- **Filters button** — dropdown with Due Date (Today / This Week / 2 Weeks) and Priority (Critical/High/Medium/Low). Active filter shown as pill next to button. Filter dropdown is `position:fixed` at body level to avoid clipping
- Progress bar (team completion %)
- Task Tracker tabs: My Tasks / By Member / Follow-up
- My Tasks sections: Active → ⏸ On Hold → ✅ Done (by month)
- Inline task edit from dashboard
- Quick Notes (synced to Firestore)
- Announcements overlay
- Reminders (rich overlay, snooze options)
- Welcome screen (replaces browser prompt — shows member chips)
- 💡 Ideas FAB (purple, bottom right, above nav)
- 🎮 hint icon near Quick Notes (focuses search bar)
- Games: type "snake"/"quiz"/"space" in search, or tap logo 5× for Snake

### Input (input.html)
- MBC / Individual task toggle with blue info box explanation
- Project field — smart dropdown with existing projects, type to filter, create new
- Member chips + role per member
- Priority chips: Critical / High / Medium / Low
- Start date + due date pickers
- **Duplicate detection** — fuzzy similarity (token overlap + bigram scoring, threshold 38%). Shows warning bottom sheet with matching tasks before save. `_doSave()` handles actual save. `window.forceSaveTask()` for confirmed save
- Existing task list below form

### Report (report.html)
- Tabs, in display order: **Quarterly** (first, and the default tab on open) / Monthly / Weekly / Performance (formerly "My Report")
- Default state lives in 3 places that all had to move together when Quarterly became first/default: `activeRptTab='quarterly'` (JS), `tab-quarterly`/`panel-quarterly` carry the static `active` class in the HTML (not `tab-monthly`/`panel-monthly` anymore), and tab button order in the `.rpt-tabs` markup. `renderActiveTab()` branches on `activeRptTab` and is called at bootstrap (both the top-level call and inside `onUserReady`), so it picks up whichever tab is marked default automatically — no separate "load quarterly on start" call needed. Verified the quarter/year `<select>`s populate before that first render fires: `initQuarterSelectors()` is a synchronous IIFE, `onUserReady`'s callback only fires later via Firebase's async `onAuthStateChanged`, so ordering is safe by construction, not by luck.
- Monthly: ⚙ Filters button (hidden by default), progress ring, 4 Chart.js charts, project sections, Mark Complete, PDF export
- Weekly: digest + Copy for WhatsApp
- **Performance** — gauges either a member's or a project's completion, across Week / Month / Quarter / Overall:
  - `perfMode` state ('member'|'project') toggled via `.perf-mode-btn` → `setPerfMode()`. Swaps the dropdown between members and projects (project mode uses the project **name** as the select value, not an id — projects don't have ids the way members do).
  - `getMyReportTasks(id)` and `renderMyReport()` both branch on `perfMode`. Member mode is unchanged from before; project mode filters `t.project===id` instead of member assignment, and groups results by **contributor** instead of by project (there's only one project in that view).
  - `isDoneForMember(t, memberName)` — extracted helper, respects per-member status on shared tasks (`t.memberStatus[memberId]`) when present, falling back to `t.status`. **This is reliable in real data** — `js/firebase.js` (`addTask`) always initializes `memberStatus[m.id]='todo'` for every assigned member on creation, and `index.html`'s status-cycling functions keep it in sync — so don't skip populating it if you ever add a new task-creation path.
  - `exportMyReportPDF()` also branches on `perfMode` via a shared template (`doneCheck`, `byGroup`, `entityName`/`entityIcon`) rather than duplicating the whole function.
  - Non-admins can only select their own name in member mode (unchanged). Project mode has no such restriction — project completion isn't private the way an individual's performance is, and everyone already sees all tasks/projects on the dashboard.
- **Quarterly** — the flagship, management-facing report. On-screen magazine-style preview (`.qr-*` CSS classes) plus a separate **Share Report** export.
  - Convention: a task "belongs" to quarter Q of year Y if its `.month` (YYYY-MM) falls in that quarter's 3 months (`getQuarterMonths`). Only `taskType 'mbc'` counts, matching Monthly/Performance.
  - `computeQuarterStats(tasks, year, q)` returns: completion %, on-time delivery rate (of *done* tasks that had a due date — tasks with no due date are excluded from that specific rate, not counted against it), critical resolved/open, project count, **leaderboard** (sorted by tasks *done*, not raw %, so a 1/1 person doesn't outrank a 40/45 person), **project spotlight** (completed projects first, via `projectsData[btoa(name)].completedMonth` falling inside the quarter), and a 3-month trend for the bar chart.
  - `generateHeadline()` auto-writes the magazine's opening sentence by comparing to `getPrevQuarter()` (handles the Q1→Q4-of-previous-year wraparound).
  - **Share Report** (`exportQuarterlyPDF`) reuses the same `window.open + document.write + window.print()` pattern as the existing Monthly/Performance PDF exports — a fully self-contained inline-styled HTML document (no access to this page's stylesheet, no Chart.js canvas — the trend is hand-drawn as CSS bar divs instead) that the person can Print → Save as PDF and send directly to management.
  - **Copy Summary** (`copyQuarterlySummary`) writes a short WhatsApp/Slack-ready text blurb via `navigator.clipboard.writeText`, falling back to `window.prompt()` if clipboard access is denied.
  - report.html has its own local `toast()` (it has no access to index.html's) — reuses the shared `.toast` CSS class from `css/style.css`, which is already linked.

### Calendar (calendar.html)
- Fixed monthly grid, 7 event types colour-coded
- Auto-task checkbox (assigns Harshit + Godly)

### Ideas (ideas.html)
- Quick capture bar at top (type + Enter → instant Ideation status)
- Status tabs: All / 🌱 Ideation / 🔄 In Progress / ✅ Implemented / 🅿 Parked
- 7 categories: Content / Campaign / Process / Tool / Event / Brand / Other
- Threaded notes per idea (real-time Firestore sync)
- Imports `getDb()` and `WORKSPACE_ID` from firebase.js

---

## firebase.js — All Exports

```javascript
export const WORKSPACE_ID
export function getDb()           // returns Firestore db instance
export function onUserReady(cb)   // Firebase anonymous auth ready callback
export function getMembers()
export function addMember(name)
export function deleteMember(id)
export function getTasks()
export function onTasksChanged(callback)
export function addTask(data)
export function updateTask(id, data)
export function deleteTask(id)
export function getUserData(userName)
export function saveUserData(userName, data)
export function onUserDataChanged(userName, cb)
export function getStreak(userName)
export function recordTaskCompletion(completedBy)
export function addComment(taskId, text, author)
export function updateComment(taskId, commentId, text)
export function deleteComment(taskId, commentId)
export function onCommentsChanged(taskId, cb)
export function setReminder(taskId, date, time, setBy)
export function snoozeReminder(taskId, minutes)
export function dismissReminder(taskId)
export function saveCalendarData(data)
export function onCalendarDataChanged(cb)
export function getCalendarEvents()
export function onCalendarChanged(cb)
export function postAnnouncement(text, by)
export function getAnnouncementHistory()
export function clearAnnouncement()
export function onAnnouncementChanged(cb)
export function exportBackup()
export function restoreBackup(data)
export function getProjects()
export function setProjectComplete(projectName)
export function reopenProject(projectName)
```

---

## Firestore Collections

```
workspaces/
  harshit-team-2026/
    tasks/              — All tasks
    members/            — Team members
    calendar/           — Calendar events (single doc)
    announcements/      — Broadcast announcements
    userData/           — Per-user data (streaks, prefs)
```

**Deprecated:** `timeline_projects/` (and its `tasks/`/`notes/` subcollections) is orphaned data left over from the removed Timeline page. Nothing in the app reads or writes it anymore — safe to ignore, or delete manually in the Firebase Console if you want to tidy up.

---

## Gamification

- **Streak** — daily completion streak, weekend-aware. 🔥 badge on greeting bar
- **Hall of Fame** — top 3 streaks. Access: tap streak badge 5×
- **Player Cards** — holographic cards, 13 badges, rarity tiers. Access: cards.html
- **Konami Code** — confetti cannon
- **Snake** — type "snake" in search or tap logo 5×
- **Comms Quiz** — 36 questions, type "quiz" in search
- **Space Defender** — auto-fire shooter, type "space" in search

---

## Weekly Sprint Details

**Per-user, synced via Firestore** (changed from localStorage — see below). Each person's "This Week" list lives on their own Firestore user doc, the same doc used for Quick Notes and `broadcastEnabled`:

```
workspaces/{WORKSPACE_ID}/users/{userNameLowercase}
  { notes, broadcastEnabled, sprint: { week: 'YYYY-Www', ids: ['taskId1', ...] } }
```

Because it's keyed by lowercase name (not device), the same person's sprint syncs across all their devices, while staying completely separate from every other team member's list — nobody sees anyone else's "This Week" selections.

**Sort order:** in-progress tasks bubble to the top of the sprint list (`renderMyTasks()`, right after `sprintTasks` is built, before the search/filter predicate runs). Stable sort — everything else keeps its existing relative order, only `status==='inprog'` tasks get pulled to the front. This runs on the *unfiltered* `sprintTasks`, before `sprintTasksVisible` is derived, so it applies regardless of any active search/filter.

```javascript
// Key functions
getWeekKey()           // returns 'YYYY-Www' based on Monday
initSprint()           // call once MY_NAME is confirmed — loads from Firestore
                       // + wires onUserDataChanged live listener (guarded by
                       // _sprintInitialized so it only wires once, even though
                       // the surrounding onTasksChanged block re-fires on every
                       // task update — see "loader re-fire" note below)
saveSprint()           // writes { sprint: {week, ids} } to this user's Firestore doc
window.toggleSprintTask(taskId)  // add/remove task from sprint
window.toggleSprintPanel()       // collapse/expand sprint section (local UI state only)

// Constants
const SPRINT_MAX = 10
let sprintTaskIds = new Set()
let sprintOpen = true
```

**"Loader re-fire" gotcha:** the block that calls `initNotes()` / `initSprint()` lives inside the `onTasksChanged` callback, gated by `if (loader) {...}` — but `loader.style.display='none'` never actually removes the element, so that whole block (including `initNotes()` and `onAnnouncementChanged(...)`) re-runs on **every** task snapshot, not just once. `initNotes()` already re-attaches its textarea listener each time (pre-existing, harmless-ish). `initSprint()` is explicitly guarded with `_sprintInitialized` so it only calls `getUserData`/`onUserDataChanged` once per session — don't remove that guard, or sprint sync will pile up duplicate Firestore listeners over a long session.

**Previously (until [this session]):** sprint data was stored in `localStorage` under `wd_sprint` — per-device, not per-person, and never synced. Migrated to Firestore because tasks marked "This Week" on one device weren't showing up on the same person's other devices.

### Admin control of teammates' sprints

The manager (`ADMIN_NAME`, currently `'Harshit'`) can add/remove tasks from **any** teammate's "This Week" list, not just their own — from the **By Member** tab, on a task-by-task basis. Teammates keep the ability to manage their own sprint themselves (unchanged, via `toggleSprintTask` above).

**This is admin-only, not peer-to-peer** — a non-admin teammate cannot do this for anyone but themselves. Gating is `canAct = isMyCard || isAdmin` in `memberTaskCard()`: `isMyCard` lets anyone act on their own card, `isAdmin` (hardcoded to `ADMIN_NAME`) is what additionally unlocks every *other* card. If asked to open this up to all teammates acting on each other, that's a real change (remove/alter the `isAdmin` check), not a config toggle — confirm before making it, since it changes who can see/edit whose sprint.

The core challenge: sprint data lives in each person's own Firestore doc (async to fetch), but `memberTaskCard()` needs to know **synchronously** whether a given task is already in a teammate's sprint, to render the button's correct state. Solved the same way `cachedBadges` solves an analogous problem — fetch once, cache, let the render that's already happening on every task change (`renderAll()` → `renderByMember()`) pick up the resolved data:

```javascript
let memberSprintCache = {};           // { [lowercaseName]: Set(taskIds) }
let _memberSprintCacheLoaded = false; // guards it to load once, same pattern as _sprintInitialized

loadMemberSprintCache()               // admin-only, called from renderByMember() the
                                      // first time it runs; Promise.all over every
                                      // member's getUserData(), then re-renders itself
window.toggleMemberSprintTask(memberId, taskId)
                                      // memberId, not memberName — names can contain
                                      // apostrophes and would break the inline onclick
                                      // string; resolves the name internally via
                                      // members.find(), matching how
                                      // setMemberStatusWindow() already does this
```

`toggleMemberSprintTask` special-cases the admin acting on **their own** card: it detects `memberName.toLowerCase() === MY_NAME.toLowerCase()` and delegates straight to the existing `toggleSprintTask()` instead of the generic cache-based path — that one already owns the live `sprintTaskIds`/`expandedTasks`/listener state correctly, and running both paths for the same person would risk them drifting out of sync with each other.

Writes are optimistic (cache updates immediately, UI re-renders, *then* `saveUserData` fires) with a rollback path if the write actually fails — matches the pattern used elsewhere in this app rather than blocking the UI on the network round-trip.

Verified via the jsdom harness end-to-end: admin toggling a teammate's task writes to *that teammate's* mock Firestore doc (not the admin's), the button state flips correctly after re-render, and the admin's own card correctly routes through the pre-existing sprint path instead of the generic one.

### Done This Week — full sub-section inside the Sprint widget

**Superseded the "This Week" stat approach below (kept for history — don't reintroduce it, it was explicitly removed).** ~~The Done section header showed `✅ Done (N) · 🎯 X/Y This Week` as a count-only stat.~~ Replaced with a proper collapsible sub-section, showing full task cards, nested inside the Sprint widget itself rather than referenced from the bottom Done section:

```
🎯 This Week's Sprint
  [progress bar — X/Y done, unchanged, pre-existing]
  [active sprint tasks — sprintTasksVisible, in-progress sorted first]
  ✅ Done This Week (N)          ← collapsible, collapsed by default
    [full task cards — sprintDoneTasksVisible]
  Resets {date}
```

- `sprintDoneTasks` (full array, not a count) = `tasks.filter(t => sprintTaskIds.has(t.id) && t.status==='done')`; `sprintDoneTasksVisible` applies the same `matchesRefineFilters` predicate the active list and the main task list both use, so search stays consistent here too. `sprintDone`/`sprintCount` are still kept as plain numbers (`sprintDoneTasks.length` / `sprintTaskIds.size`) since the header's progress bar wants counts, not arrays.
- Toggle (`toggleSprintDoneSection`) mirrors `toggleDoneSection`'s exact pattern — a lightweight DOM class-toggle on `#sprint-done-body`/`#sprint-done-arrow`, not a full re-render.
- **A completed sprint task now renders in *two* places** — this sub-section, and the main bottom Done section (which was never filtered to exclude sprint tasks, matching how *active* sprint tasks already double-render in both Sprint and Active/On Hold). This is intentional, consistent with the rest of the app's "Sprint is a pinned overlay, not an exclusive move" design — but it does mean every completed-and-pinned task hits the duplicate-id situation documented earlier (`toggleTaskExpand` syncing all copies via `querySelectorAll`). Verified via the jsdom harness: completing a sprint task correctly produces exactly 2 card instances (not more), and clicking either copy opens both.
- Empty-state logic has 3 distinct cases, not 2 — worth preserving the exact branching if you touch this: truly empty sprint (no active, no done) → "add tasks" prompt; sprint has items but *all* are done (active list would otherwise be empty) → render nothing in the active area, since a misleading "no tasks match this filter" would show even with zero filters active; active items exist but search/filter hides all of them → the actual "no match" message.

### (Removed) Done section "This Week" completion stat

The Done section header (`renderMyTasks()`, where `doneHTML` is built) briefly showed `✅ Done (N) · 🎯 X/Y This Week` — reused `sprintDone`/`sprintCount` computed for the Sprint section's own header. Explicitly removed one turn later in favour of the full sub-section above, which shows the actual tasks rather than just a count. `.done-week-stat` CSS was removed along with it — don't re-add it without checking this isn't wanted back in stat form specifically.

---

## Known Issues & Lessons Learned

1. **Firebase auth** — if page loads but shows all zeros, check Authorized Domains in Firebase Console
2. **Service worker caching** — if changes don't appear after upload, clear browser cache + cookies. The sw.js uses pass-through (no caching) with `self.skipWaiting()`
3. **Filter dropdown z-index** — the dropdown is at body level (not inside .filter-wrap) using `position:fixed` to avoid being clipped by parent containers
4. **Sprint variable order** — `sprintTaskIds` must be declared before `loadSprint()` call
5. **ideas.html Firebase** — uses `getDb()` from firebase.js + direct Firestore CDN imports. Does NOT re-initialise Firebase app
6. **_doSave function** — in input.html, handles actual task save. Called directly for new tasks, or via `window.forceSaveTask()` after duplicate confirmation
7. **Python str_replace failures** — exact string matching is sensitive to whitespace. Always read the exact content with sed/grep before replacing
8. **iamharshit.com** — this is Harshit's personal portfolio domain. WorkDesk is at iamharshitb.github.io/workdesk-pwa. Both resolve but GitHub Pages is the source of truth
9. **Sprint duplicate-render glitch (fixed, narrowly — see #15 for the full fix)** — a task added to "This Week" renders a second time inside the Sprint section via the same `myTaskCard()` function, producing duplicate DOM ids (`trc-`, `trx-`, `trd-` + taskId). `toggleSprintTask()` calls `expandedTasks.delete(taskId)` before re-rendering so the card collapses instead of staying stuck open. This only handled the one interaction (adding to sprint); the general problem (any duplicated task, clicked from its non-first copy) wasn't fixed until #15.
10. **PWA install prompt** — index.html now has custom install-banner logic (`#install-banner` + script near the bottom) instead of relying on the browser's automatic mini-infobar. iOS Safari never fires `beforeinstallprompt` — the banner shows manual "Add to Home Screen" instructions there instead. Android/desktop Chrome shows a real Install button via the captured `beforeinstallprompt` event. Dismissal is remembered in localStorage (`wd_install_dismissed_at`) for 14 days
11. **`toast()` scope** — `toast()` is defined inside the `<script type="module">` block in index.html and is explicitly assigned to `window.toast` so plain (non-module) `<script>` blocks lower on the page can call it. Any future module-scoped helper that needs to be called from a plain script must be exposed on `window` the same way
12. **Re-render cascade (fixed)** — `renderMyTasks()` rebuilds the entire list with `el.innerHTML = ...` and is reached from `renderAll()`, which fires on **every task change by any teammate** via `onTasksChanged`. Two consequences were fixed:
    - Every card replayed its `.fi` staggered fade-up on each sync, so a colleague marking a task done made your whole screen flicker. Cards now animate only on first mount, gated by `_animatedCards`; the stagger itself is gated by `_firstPaintDone` so later arrivals appear immediately.
    - The inline edit panel's open state lived only in the DOM (`classList.toggle('open')`) and inputs rendered from the task object, so a background sync closed the editor and **discarded unsaved typing**. Open state is now `_openEditId`, keystrokes go to `_editDraft`, priority to `_editPriority`, and `_captureEditFocus()`/`_restoreEditFocus()` preserve caret position across the rebuild.

    If you touch `renderMyTasks`, keep all four (`_animatedCards`, `_firstPaintDone`, `_openEditId`, `_editDraft`) intact — they're the only thing making live sync non-destructive. The real long-term fix is keyed DOM reconciliation instead of `innerHTML`.
13. **CSS load order** — `style.css` no longer `@import`s `themes.css`. Every page already has its own `<link>` for both, so importing it too loaded 56KB twice and made the cascade ambiguous (which is likely why themes accumulated ~100 `!important` overrides). Order is now: `style.css` (base + tokens) → `themes.css` (overrides). **Don't re-add the `@import`.** Note `quiz.html`, `snake.html`, `space.html` load neither stylesheet — they're standalone.
14. **Backticks inside template literals** — `myTaskCard()` is one big template literal. An HTML comment inside it containing a backtick (e.g. writing `` `t` ``) silently terminates the string and throws a confusing `Unexpected identifier` at a line number far from the real problem. Always `node --check` the extracted module script after editing that function.
15. **Duplicate-id click/search bugs (fixed properly this time)** — reported as "on-hold tasks don't show up when searched, and clicking them doesn't expand." Root cause was the general case #9 only partially fixed: **any task in both the sprint list and its normal status section (Active or On Hold) renders twice**, sharing `trc-`/`trx-`/`trd-` ids, because `sprintTasks` is filtered from `tasks` independently of `activeTasks`/`onholdTasks` and nothing excludes overlap. Two distinct bugs came from this, both fixed:
    - **Click-to-expand silently hit the wrong copy.** `toggleTaskExpand()` used `getElementById`, which always resolves to the *first* matching id in the document (the Sprint copy, since that section renders first) — so clicking a task's On Hold copy expanded/collapsed the Sprint copy instead, and nothing visibly happened where the person clicked. Fixed by switching to `querySelectorAll('[id="trd-"+id]')` and syncing **every** copy to the same open/closed state, not just one — this also prevents two copies of the same task ending up visually disagreeing with each other (e.g. open the Sprint copy, then click the On Hold copy — both should reflect the same `expandedTasks` boolean, and now do).
    - **The Sprint section completely ignored search and all other filters.** `sprintTasks` was built straight from `sprintTaskIds` with zero filtering, so it always showed every sprint task regardless of what was being searched — while the *real* search-filtered copy in Active/On Hold correctly hid or matched. This made it look like on-hold tasks "weren't showing up" in search: the one visible copy was sitting unfiltered up in Sprint, not down in On Hold where the person was looking. Fixed via a new shared predicate, `matchesRefineFilters(t)` (priority/status/due/search, all in one place) — used by both the Sprint section (`sprintTasksVisible`) and the main list, so they can't drift out of sync again. Sprint's header stats (`X/10`, done count) intentionally still reflect the *unfiltered* full sprint list — only which cards are drawn is filtered, since "6/10 this week" shouldn't change just because you're searching.
    - **Bonus find while debugging this (unrelated root cause, same symptoms neighborhood):** the status-tag maps (`stTag`/`stLbl` — appears 4 places: twice in `myTaskCard`/`memberTaskCard` in index.html, twice in `taskCard` in input.html) never had an `'onhold'` entry, and no `.t-onhold` CSS class existed in `style.css` — so every on-hold task has *always* rendered a literal `<span class="tag undefined">undefined</span>` status tag, in every theme, since this app was built. Fixed all 4 map sites plus added the missing `.t-onhold` rule to `css/style.css` (using `var(--purple)`, matching the on-hold accent already used elsewhere). Interestingly, `body.theme-editorial .t-onhold` already existed in `css/themes.css` with the right colors — someone (an earlier session) had already anticipated this class and built its override, it just never fired because the JS never emitted the class. Neu/Glass/Skeu need no per-theme override — they inherit the base rule via their own `--purple`.
    - **How this was actually found:** reading the code suggested it *should* work — the bug only reproduces when a task is simultaneously on-hold and sprint-pinned. Installed `jsdom`, stubbed `firebase.js`/`theme.js`/`sounds.js`, loaded the real extracted module script into a real DOM, and ran the actual render + click functions against realistic mock data (including dispatching genuine click events, not calling functions directly) — don't trust a code read alone for rendering-order-dependent bugs like this one; simulate it.
16. **In-progress/due-today pulse strengthened** — the edge-accent indicators (added when the flat colour washes were removed — see the theme-health/Due-Today-In-Progress redesign history above) were judged too subtle to notice without deliberately looking. Widened the bar (3px→4px), widened the opacity swing (was ~.45–1, now ~.45–.5 trough to 1 peak), and switched from a static `box-shadow` to one that animates in the same keyframe (small glow at the trough, wide glow at the peak) so the *glow itself* pulses, not just the bar's opacity. Sped up slightly too (1.8s/1.6s → 1.4s/1.3s). Same treatment applied to `.due-today-badge`'s `pulse-badge` (added a `scale(1.08)` at the peak, not just opacity) and to `.task-card.status-inprog::before` (the shimmer bar used where `.task-card` renders instead of `.task-row-compact`). **`input.html` had its own separate, outdated copy** of `.task-row-compact.status-inprog` still using the old flat background-wash style from before that redesign — it was never migrated when index.html's was. Brought it in line with the same accent-edge treatment (own local `inprog-pulse` keyframe + reduced-motion guard, since input.html doesn't share index.html's `<style>` block). If a future prominence request comes in for `due-soon-badge` too, note it currently has **no animation at all** (unlike `due-today-badge`) — that was a deliberate original distinction between due-today urgency and due-soon awareness, not an oversight.
17. **Sprint sort — in-progress bubbles to top** — `renderMyTasks()` sorts `sprintTasks` (stable sort, `status==='inprog'` first) immediately after building it and before `sprintTasksVisible` is derived from it via `matchesRefineFilters`. Verified via the jsdom harness with a real status change through `onTasksChanged`, not just the sort call in isolation.
18. **Quarterly is now the default/first Report tab** — see the Report section above for the 3 places this required changing in lockstep (`activeRptTab`, the static `active` class on `tab-quarterly`/`panel-quarterly`, and tab button order).
19. **Industrial theme's decorative pseudo-elements — collision reasoning, not verified in a real browser.** jsdom (used for all the render/click testing elsewhere in this doc) does **not** do real CSS layout — it can't confirm actual pixel positions, only DOM/CSSOM structure. Three absolutely-positioned decorative touches were reasoned through analytically instead:
    - `.greeting-bar::after` (coordinates readout) is anchored at `top:4px`, not `bottom:6px` — the streak badge sibling is vertically centred via flexbox, so its exact position shifts with how much greeting text/quote renders that day, but the bar's own top padding (14px) is empty space regardless of content height. Don't move this back to the bottom edge without re-checking against the tallest realistic case (greeting + subtitle + quote line).
    - `.nav::after` (camera-lens dot) is horizontally centred — safe because `.nav` uses `justify-content:space-between` with just the logo (left) and action buttons (right), leaving the true centre empty in the current layout. If a third nav element ever gets added in the middle, re-check this.
    - `.panel::before`/`::after` (screw-dots) sit at `top:7px` on a panel that itself has zero padding (padding lives on the child `.panel-hd`, which starts its own content 11px in) — reasoned as safe but tighter than the other two; if a panel's header ever has content flush against its own top-right corner, this is the one most likely to need adjusting.

    If asked to touch the Industrial theme's layout, sanity-check these three specifically rather than assuming jsdom-verified — this doc is explicit above about which changes were actually simulated (render + real click events) versus reasoned through, and these are in the latter category.

---

## Developer Preferences

- **Single-file deliverables** — never split into multiple files unless absolutely necessary
- **No build tools** — no webpack, no npm, no bundlers
- **Always syntax check** before sharing files using `node --check`
- **Preserve all existing functionality** when adding new features
- **Firebase CDN version:** `10.12.0` — use consistently across all files
- **Git workflow:** Upload files via GitHub web UI (Add file → Upload files). No VS Code access on this system currently
- **Test URL:** https://iamharshitb.github.io/workdesk-pwa/
- **Harshit's GitHub username:** iamharshitb

---

## How to Start a New Chat

1. Share this file with Claude at the start of the conversation
2. Upload the specific HTML/JS/CSS file you want to modify
3. Describe what you want to change
4. Claude will read the file, make the change, syntax check it, and share it back

Example opener:
> "I'm continuing development on WorkDesk PWA. Here is the CLAUDE.md with full context [attach file]. I want to modify [filename] to [description of change]. Here is the current file [attach file]."
