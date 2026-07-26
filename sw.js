const CACHE_NAME = "nerchuko-v4";
const PRECACHE = [
  "./",
  "./index.html",
  "./style.css",
  "./data-te.js",
  "./data-kn.js",
  "./data-de.js",
  "./data-ja.js",
  "./languages.js",
  "./storage-adapter.js",
  "./firebase-config.js",
  "./firebase-sync.js",
  "./app.js",
  "./install-prompt.js",
  "./manifest.json",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// Cache-first for same-origin app shell files. Cross-origin requests (e.g.
// the Firebase SDK loaded from gstatic.com) are left to the browser's own
// HTTP cache — simpler and avoids opaque-response edge cases.
self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;
  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request)
        .then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          }
          return response;
        })
        .catch(() => cached);
    })
  );
});
