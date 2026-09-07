/* Service worker — Azimut installable (PWA), style BTP Pro. */
const CACHE = 'azimut-shell-v3';
const PRECACHE = [
  './',
  './telecharger.html',
  './app.html',
  './manifest.webmanifest',
  './icon.png',
  './favicon.png',
  './qr-install.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(PRECACHE)).then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))),
    ).then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  event.respondWith(
    caches.match(req).then((cached) => cached || fetch(req).catch(() => caches.match('./telecharger.html'))),
  );
});
