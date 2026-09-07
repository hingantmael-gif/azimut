/* Service worker Azimut — network-first HTML (évite cache cassé / page blanche). */
const CACHE = 'azimut-shell-v6';
const PRECACHE = [
  './telecharger.html',
  './manifest.webmanifest',
  './icon.png',
  './icon-192.png',
  './icon-512.png',
  './favicon.png',
  './qr-install.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) =>
        Promise.all(PRECACHE.map((u) => cache.add(u).catch(function () {}))),
      )
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') self.skipWaiting();
  if (event.data && event.data.type === 'CLEAR_CACHES') {
    event.waitUntil(
      caches.keys().then((keys) => Promise.all(keys.map((k) => caches.delete(k)))),
    );
  }
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  // Ne jamais servir le JS Expo depuis un vieux cache
  if (url.pathname.includes('/_expo/') || url.pathname.endsWith('.js')) return;

  const isHtml =
    req.mode === 'navigate' ||
    url.pathname.endsWith('.html') ||
    url.pathname.endsWith('/') ||
    (req.headers.get('accept') || '').includes('text/html');

  if (isHtml) {
    // Network-first : après désinstall/réinstall, toujours la dernière app
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copy)).catch(function () {});
          return res;
        })
        .catch(() => caches.match(req).then((c) => c || caches.match('./index.html'))),
    );
    return;
  }

  event.respondWith(
    caches.match(req).then((cached) => cached || fetch(req)),
  );
});
