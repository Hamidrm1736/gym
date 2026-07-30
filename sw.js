/* Offline cache for the two gym trackers — bump CACHE when you upload new files */
const CACHE = 'gym-pwa-v12';
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
  const isPage = e.request.mode === 'navigate' || key.endsWith('.html');

  e.respondWith(
    caches.open(CACHE).then(async c => {
      if (isPage) {
        /* pages: always try the network first so an update shows up immediately;
           fall back to the saved copy when there is no connection */
        try {
          const res = await fetch(e.request);
          if (res && res.ok) c.put(key, res.clone());
          return res;
        } catch (err) {
          return (await c.match(key)) || Response.error();
        }
      }
      /* icons & manifests: cache first (they rarely change), refresh in background */
      const cached = await c.match(key);
      const fresh = fetch(e.request).then(res => {
        if (res && res.ok) c.put(key, res.clone());
        return res;
      }).catch(() => null);
      return cached || (await fresh) || Response.error();
    })
  );
});
