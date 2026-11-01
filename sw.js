// Service worker: precache everything for offline use. Bump VERSION on every release;
// the page then shows "New version ready, tap to refresh" instead of updating silently.
const VERSION = 'v1.3.0';
const CACHE = `romaniac-${VERSION}`;
// On a local dev server, prefer the network so edits show up without bumping VERSION.
const DEV = ['localhost', '127.0.0.1', '[::1]'].includes(location.hostname);

const ASSETS = [
  './',
  'index.html',
  'manifest.webmanifest',
  'css/app.css',
  'fonts/nunito-latin.woff2',
  'fonts/nunito-latin-ext.woff2',
  'icons/icon.svg',
  'icons/icon-192.png',
  'icons/icon-512.png',
  'icons/icon-maskable-512.png',
  'data/vocab.json',
  'data/verbs.json',
  'data/ilr.json',
  'js/main.js',
  'js/answer.js',
  'js/day.js',
  'js/db.js',
  'js/fx.js',
  'js/points.js',
  'js/progress.js',
  'js/srs.js',
  'js/conjugation.js',
  'js/store.js',
  'js/tts.js',
  'js/ui.js',
  'js/screens/grammar.js',
  'js/screens/home.js',
  'js/screens/ilr.js',
  'js/screens/practice.js',
  'js/screens/progress.js',
  'js/screens/settings.js',
  'js/screens/verbs.js',
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE).then(cache => cache.addAll(ASSETS.map(url => new Request(url, { cache: 'reload' })))),
  );
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    for (const key of await caches.keys()) {
      if (key.startsWith('romaniac-') && key !== CACHE) await caches.delete(key);
    }
    await self.clients.claim();
  })());
});

self.addEventListener('message', event => {
  if (event.data?.type === 'SKIP_WAITING') self.skipWaiting();
});

self.addEventListener('fetch', event => {
  const { request } = event;
  if (request.method !== 'GET' || new URL(request.url).origin !== location.origin) return;
  event.respondWith((async () => {
    const cache = await caches.open(CACHE);
    if (DEV) {
      try { return await fetch(request); } catch { /* offline: fall through to the cache */ }
    }
    const cached = await cache.match(request, { ignoreSearch: true });
    if (cached) return cached;
    try {
      return await fetch(request);
    } catch (err) {
      if (request.mode === 'navigate') return cache.match('index.html');
      throw err;
    }
  })());
});
