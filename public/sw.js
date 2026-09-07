/* Service worker Azimut — scope /azimut/ (GitHub Pages). */
const CACHE = 'azimut-shell-v8';
const PRECACHE = [
  '/azimut/telecharger.html',
  '/azimut/manifest.webmanifest',
  '/azimut/icon.png',
  '/azimut/icon-192.png',
  '/azimut/icon-512.png',
  '/azimut/favicon.png',
  '/azimut/qr-install.png',
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
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  if (!url.pathname.startsWith('/azimut/')) return;
  if (url.pathname.includes('/_expo/') || url.pathname.endsWith('.js')) return;

  const isHtml =
    req.mode === 'navigate' ||
    url.pathname.endsWith('.html') ||
    url.pathname === '/azimut/' ||
    url.pathname === '/azimut' ||
    (req.headers.get('accept') || '').includes('text/html');

  if (isHtml) {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copy)).catch(function () {});
          return res;
        })
        .catch(() => caches.match(req).then((c) => c || caches.match('/azimut/index.html'))),
    );
    return;
  }

  event.respondWith(caches.match(req).then((cached) => cached || fetch(req)));
});
