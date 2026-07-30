/* Offline cache for the two gym trackers — bump CACHE when you upload new files */
const CACHE = 'gym-pwa-v4';
const ASSETS = ['./male.html', './female.html', './icon-his.png', './icon-hers.png', './manifest-his.webmanifest', './manifest-hers.webmanifest'];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE)
      .then(c => Promise.all(ASSETS.map(a => c.add(a).catch(() => null))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  const url = new URL(e.request.url);
  if (url.origin !== location.origin) return; /* videos etc. go straight to the network */
  const key = url.pathname;
  e.respondWith(
    caches.open(CACHE).then(async c => {
      const cached = await c.match(key);
      /* serve from cache instantly, refresh the cache in the background */
      const fresh = fetch(e.request).then(res => {
        if (res && res.ok) c.put(key, res.clone());
        return res;
      }).catch(() => null);
      return cached || (await fresh) || Response.error();
    })
  );
});
