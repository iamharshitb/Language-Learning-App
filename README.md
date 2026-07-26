# నేర్చుకో — Nerchuko

A 4-month spaced-repetition flashcard PWA for **Telugu, Kannada, German, and Japanese**, switchable by tab. Vanilla HTML/CSS/JS, no build step. Progress is tracked **separately per language** — each has its own streak, pace, and spaced-repetition schedule — and is stored locally by default, with optional Firebase sync across devices (see below).

## Run locally

```
npx serve .
```

or open `index.html` directly (service worker registration needs `http://`, not `file://`, so `npx serve .` is the more reliable option).

## Deploy to GitHub Pages

```
git init
git add .
git commit -m "Nerchuko: multi-language flashcards PWA"
git branch -M main
git remote add origin https://github.com/iamharshitb/nerchuko-pwa.git
git push -u origin main
```

Then **Settings → Pages → Source: Deploy from a branch → main / (root)**. Live at `https://iamharshitb.github.io/nerchuko-pwa/`. "Add to Home Screen" on your phone to install it.

If you're upgrading an existing single-language (Telugu-only) install: just deploy over it. The app auto-migrates your old progress into the new per-language format on first load — nothing is lost.

## File layout

- `data-te.js`, `data-kn.js`, `data-de.js`, `data-ja.js` — one curriculum per language, each a `WEEKS_XX` array
- `languages.js` — registry tying each language to its data, hero text, script font, and TTS locale
- `storage-adapter.js` — default local (`localStorage`) storage adapter
- `firebase-config.js` — your Firebase project config (edit this to enable sync — see below)
- `firebase-sync.js` — optional cloud sync; if configured, replaces the local adapter with a Firestore-backed one, same interface
- `app.js` — shared app logic (spaced repetition, rendering) — doesn't know or care whether storage is local or cloud
- `index.html` / `style.css` — shell + styling, including the language tab bar

## Adding more cards to a language

Add a card to the relevant week's `cards` array in that language's `data-XX.js`:

```js
{ en: "English prompt", te: "native script / spelling", tr: "phonetic reading", note: "optional usage tip" }
```

## Adding a 5th language

1. Copy `data-te.js` to `data-XX.js`, translate the `en`/`te`/`tr` fields (keep the same week/theme structure if you want it to feel consistent — not required).
2. Add a `<script src="data-XX.js"></script>` line in `index.html`, before `languages.js`.
3. Add an entry to `LANGUAGES` in `languages.js` (hero glyph, TTS locale like `"fr-FR"`, script font if it needs one) and add `"XX"` to `LANGUAGE_ORDER`.
4. Add a tab button in `index.html`'s `#lang-tabs`.

## Syncing across your devices (optional)

By default the app works fully offline, storing progress in `localStorage` on whichever device you use — that's still true even after doing this setup, since Firestore's offline cache means it keeps working with no signal and syncs once you're back online.

This uses the same pattern as WorkDesk: silent anonymous sign-in (no login screen, no password), with all your devices reading and writing one shared Firestore document identified by a private ID you choose.

### 1. Create the Firebase project

1. Go to https://console.firebase.google.com → **Add project**
2. Name it `nerchuko` → continue (Google Analytics: off, not needed)
3. Wait for it to provision → **Continue**

### 2. Enable Firestore

1. Left sidebar → **Build** (or **Databases and storage** in newer UIs) → **Firestore Database**
2. **Create database** → location **asia-south1** (Mumbai) → **Start in test mode** → **Enable**

### 3. Enable Anonymous Authentication

1. Left sidebar → **Build** (or **Security**) → **Authentication** → **Get started**
2. Click **Anonymous** in the provider list → toggle **Enable** → **Save**

This is what lets the app sync silently — you'll never see a login screen, just like WorkDesk.

### 4. Get your config and paste it in

1. Gear icon ⚙ → **Project settings** → scroll to **Your apps** → click **`</>`** (Web)
2. Nickname: `nerchuko-web` → **Register app** (don't enable Hosting)
3. Copy the `firebaseConfig` object shown
4. Open `firebase-config.js` in this project and paste your values into `NERCHUKO_FIREBASE_CONFIG`
5. Change `NERCHUKO_SYNC_ID` to any private string with no spaces (e.g. `harshit-nerchuko-2026`) — this is what ties your devices together, so use the same value everywhere you deploy this app

### 5. Set Firestore security rules

Firestore Database → **Rules** tab → replace with:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /nerchuko/{syncId} {
      allow read, write: if request.auth != null;
    }
  }
}
```

**Publish**.

### 6. Deploy and test

```
git add .
git commit -m "Add Firebase sync"
git push
```

Open the app on your phone, do a few cards, then open it on your laptop (or an incognito tab) — same progress should appear within a couple seconds. If you had existing local-only progress on a device, it gets uploaded automatically the first time that device connects (nothing is lost).

If `firebase-config.js` still has the `PASTE_YOUR_...` placeholders, the app just runs local-only as before — no errors, nothing breaks.



- Each language has its own Leitner-style spaced repetition schedule, streak, and daily new-card pace (default 8/day, adjustable per language from its home screen).
- "Reset [Language] progress" wipes only that language — the others are untouched.
