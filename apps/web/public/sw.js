/* Mastermoshai service worker: makes the site installable and shows a friendly
   page when the phone is offline. Pages are always fetched fresh (no stale
   prices or class times); only the offline page and icons are cached. */
const CACHE = "mm-v1";
const OFFLINE = "/offline.html";

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll([OFFLINE, "/brand/app-icon-192.png", "/brand/logo-horizontal.svg"])));
  self.skipWaiting();
});

self.addEventListener("activate", (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k)))));
  self.clients.claim();
});

self.addEventListener("fetch", (e) => {
  const r = e.request;
  if (r.mode === "navigate") {
    e.respondWith(fetch(r).catch(() => caches.match(OFFLINE)));
  }
});
