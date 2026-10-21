const V = 'mi-espanol-v3-2';
const CORE = ['./v3.html', './manifest.webmanifest', './icon-192.png', './icon-512.png', './apple-touch-icon.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(V).then(c => c.addAll(CORE)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== V).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const r = e.request;
  if (r.method !== 'GET') return;
  const u = new URL(r.url);
  const same = u.origin === location.origin;
  // Strony: najpierw sieć (świeża wersja), bez internetu zapisana kopia.
  if (r.mode === 'navigate' && same) {
    e.respondWith(
      fetch(r)
        .then(res => { const cp = res.clone(); caches.open(V).then(c => c.put(r, cp)); return res; })
        .catch(() => caches.match(r).then(m => m || caches.match('./v3.html')))
    );
    return;
  }
  // Ikony, manifest i czcionki: z pamięci podręcznej, odświeżane w tle.
  if (same || /^fonts\.(googleapis|gstatic)\.com$/.test(u.hostname)) {
    e.respondWith(
      caches.match(r).then(m => {
        const net = fetch(r)
          .then(res => {
            if (res && (res.ok || res.type === 'opaque')) { const cp = res.clone(); caches.open(V).then(c => c.put(r, cp)); }
            return res;
          })
          .catch(() => m);
        return m || net;
      })
    );
  }
});
