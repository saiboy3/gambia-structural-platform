// Service worker — offline support for the platform.
//
// Strategy differs by request type, and that distinction matters:
//
//   Navigations / HTML  → network-first.
//     index.html names the current hashed bundle. Serving it cache-first meant
//     a returning user got the PREVIOUS deploy's HTML, which points at an asset
//     hash the server has since deleted — a 404, and a blank white page until
//     they happened to reload. Always prefer the network here; fall back to
//     cache only when genuinely offline.
//
//   Hashed build assets  → cache-first.
//     /assets/*-<hash>.js|css are immutable: any change produces a new
//     filename, so a cache hit can never be stale and is the fastest path.
//
//   Everything else      → stale-while-revalidate.
const CACHE = 'struct-plat-v2';
const PRECACHE = ['/', '/index.html'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(PRECACHE)));
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

const isHtml = (request, url) =>
  request.mode === 'navigate' ||
  url.pathname === '/' ||
  url.pathname.endsWith('.html');

const isHashedAsset = url =>
  url.pathname.startsWith('/assets/') && /-[A-Za-z0-9_-]{8,}\.(js|css)$/.test(url.pathname);

const putInCache = (request, response) => {
  if (response && response.status === 200 && response.type === 'basic') {
    const clone = response.clone();
    caches.open(CACHE).then(c => c.put(request, clone));
  }
  return response;
};

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;

  let url;
  try { url = new URL(e.request.url); } catch { return; }
  if (url.origin !== self.location.origin) return;

  // HTML: network-first, so a new deploy is picked up immediately.
  if (isHtml(e.request, url)) {
    e.respondWith(
      fetch(e.request)
        .then(res => putInCache(e.request, res))
        .catch(() => caches.match(e.request).then(c => c || caches.match('/index.html')))
    );
    return;
  }

  // Immutable hashed assets: cache-first.
  if (isHashedAsset(url)) {
    e.respondWith(
      caches.match(e.request).then(cached =>
        cached || fetch(e.request).then(res => putInCache(e.request, res))
      )
    );
    return;
  }

  // Everything else: serve cache fast, refresh in the background.
  e.respondWith(
    caches.match(e.request).then(cached => {
      const network = fetch(e.request)
        .then(res => putInCache(e.request, res))
        .catch(() => cached);
      return cached || network;
    })
  );
});
