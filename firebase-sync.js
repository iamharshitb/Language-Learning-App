/* Nerchuko — Firebase sync (optional). Loads only if firebase-config.js has
   real values in it; otherwise the app keeps using the local-only adapter
   from storage-adapter.js. Same auth pattern as WorkDesk: silent anonymous
   sign-in, no login screen, all your devices read/write one shared document
   identified by NERCHUKO_SYNC_ID.

   Uses dynamic import() (rather than static imports) so the SDK is only
   fetched over the network when Firebase is actually configured, and so a
   failed fetch (e.g. offline on first load) is a catchable error rather than
   one that prevents this whole file from running. */

const SDK_BASE = "https://www.gstatic.com/firebasejs/10.13.0";

const config = window.NERCHUKO_FIREBASE_CONFIG || {};
const syncId = window.NERCHUKO_SYNC_ID || "default";
const isConfigured = !!(config.apiKey && !config.apiKey.startsWith("PASTE_"));

const localAdapter = window.NerchukoStorage; // installed by storage-adapter.js, used as a fallback

let resolveReady;
const readyPromise = new Promise((res) => { resolveReady = res; });

if (!isConfigured) {
  // No Firebase project set up yet — stay on the local-only adapter, no network call made.
  resolveReady();
} else {
  runFirebaseSetup();
}

async function runFirebaseSetup() {
  // Don't let a slow/absent network hang the app forever on first load.
  const safetyTimeout = setTimeout(resolveReady, 4000);

  try {
    const [{ initializeApp }, authMod, firestoreMod] = await Promise.all([
      import(`${SDK_BASE}/firebase-app.js`),
      import(`${SDK_BASE}/firebase-auth.js`),
      import(`${SDK_BASE}/firebase-firestore.js`),
    ]);
    const { getAuth, signInAnonymously, onAuthStateChanged } = authMod;
    const {
      initializeFirestore, doc, getDoc, setDoc, onSnapshot,
      persistentLocalCache, persistentSingleTabManager,
    } = firestoreMod;

    const app = initializeApp(config);
    const auth = getAuth(app);
    const db = initializeFirestore(app, {
      localCache: persistentLocalCache({ tabManager: persistentSingleTabManager() }),
    });
    const docRef = doc(db, "nerchuko", syncId);

    let remoteChangeCallback = null;
    let sawFirstSnapshot = false;

    window.NerchukoStorage = {
      ready: readyPromise,
      async get() {
        try {
          const snap = await getDoc(docRef);
          return snap.exists() ? snap.data().progress : null;
        } catch (e) {
          console.error("Nerchuko cloud read failed, using local copy:", e);
          return localAdapter.get();
        }
      },
      async set(progress) {
        localAdapter.set(progress); // keep an offline-safe local mirror too
        try {
          await setDoc(docRef, { progress, updatedAt: Date.now() });
        } catch (e) {
          console.error("Nerchuko cloud write failed (Firestore will retry once back online):", e);
        }
      },
      onRemoteChange(callback) {
        remoteChangeCallback = callback;
      },
    };

    // Live updates from other devices while this tab is open.
    onSnapshot(docRef, (snap) => {
      if (!sawFirstSnapshot) { sawFirstSnapshot = true; return; } // skip the initial read-back of our own data
      if (snap.exists() && remoteChangeCallback) remoteChangeCallback(snap.data().progress);
    });

    onAuthStateChanged(auth, async (user) => {
      if (!user) return;
      try {
        // One-time migration: if the cloud has nothing yet but this device
        // has local progress, seed the cloud with it instead of starting blank.
        const snap = await getDoc(docRef);
        if (!snap.exists()) {
          const local = await localAdapter.get();
          if (local) await setDoc(docRef, { progress: local, updatedAt: Date.now() });
        }
      } catch (e) {
        console.error("Nerchuko migration check failed:", e);
      }
      clearTimeout(safetyTimeout);
      resolveReady();
    });

    signInAnonymously(auth).catch((e) => {
      console.error("Nerchuko sign-in failed, using local-only:", e);
      window.NerchukoStorage = localAdapter;
      clearTimeout(safetyTimeout);
      resolveReady();
    });
  } catch (e) {
    console.error("Nerchuko Firebase SDK load/init failed, using local-only:", e);
    window.NerchukoStorage = localAdapter;
    clearTimeout(safetyTimeout);
    resolveReady();
  }
}
