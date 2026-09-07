/* Service worker Azimut — PWA installable, sans casser le routage Expo. */
const CACHE = 'azimut-shell-v4';
const PRECACHE = [
  './telecharger.html',
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
  const url = new URL(req.url);
  // Ne pas intercepter le JS/CSS Expo ni les routes app (évite page blanche hors ligne incorrecte)
  if (url.pathname.includes('/_expo/') || url.pathname.endsWith('.js')) {
    return;
  }
  event.respondWith(
    caches.match(req).then((cached) => cached || fetch(req)),
  );
});
