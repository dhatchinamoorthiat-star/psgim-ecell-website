// Minimal service worker whose only job is to detect a genuine hard refresh
// (Cmd/Ctrl+Shift+R, or "Empty Cache and Hard Reload"). Browsers attach
// `Cache-Control: no-cache` (and `Pragma: no-cache`) to the navigation
// request only in that case — a normal reload or address-bar reload does
// not set it. That header is only visible to a service worker's fetch
// handler, not to page JS, so we relay it via the Cache Storage API, which
// both sides can read.
const FLAG_CACHE = 'ecell-boot-v1';
const FLAG_KEY = '/__hard-refresh-flag__';

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (event) => {
  if (event.request.mode !== 'navigate') return;

  const cacheControl = event.request.headers.get('cache-control') || '';
  const pragma = event.request.headers.get('pragma') || '';
  const isHardRefresh = cacheControl.includes('no-cache') || pragma.includes('no-cache');

  if (!isHardRefresh) return;

  event.respondWith(
    (async () => {
      const cache = await caches.open(FLAG_CACHE);
      await cache.put(FLAG_KEY, new Response('1'));
      return fetch(event.request);
    })(),
  );
});
