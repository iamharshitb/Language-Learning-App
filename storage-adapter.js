/* Nerchuko — default storage adapter (device-local, no sync).
   This is the fallback used until firebase-sync.js (if configured) replaces
   window.NerchukoStorage with a cloud-backed version. Keeping the same
   {ready, get, set, onRemoteChange} shape means app.js never needs to know
   which one it's talking to. */

const LOCAL_KEY = "nerchuko-progress-v2";
const LEGACY_KEY = "nerchuko-progress-v1"; // pre-multi-language, Telugu-only format

window.NerchukoStorage = {
  ready: Promise.resolve(),

  async get() {
    try {
      const raw = localStorage.getItem(LOCAL_KEY);
      if (raw) return JSON.parse(raw);
    } catch {
      /* fall through to legacy check */
    }
    // migrate a pre-existing single-language (Telugu-only) install so old progress isn't lost
    try {
      const old = localStorage.getItem(LEGACY_KEY);
      if (old) {
        const oldProgress = JSON.parse(old);
        return { languages: { te: oldProgress }, lastActiveLanguage: "te" };
      }
    } catch {
      /* ignore corrupt legacy data */
    }
    return null;
  },

  async set(progress) {
    try {
      localStorage.setItem(LOCAL_KEY, JSON.stringify(progress));
    } catch (e) {
      console.error("Nerchuko local save failed", e);
    }
  },

  onRemoteChange() {
    /* no-op — a single device has nothing to receive updates from */
  },
};
