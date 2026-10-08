// 後付け小黒板: オフライン用の Service Worker
const VER = 'kokuban-v1';
const CORE = ['/', '/index.html', '/manifest.webmanifest', '/icon-192.png', '/icon-512.png', '/apple-touch-icon.png', '/favicon.ico'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(VER).then((c) => c.addAll(CORE)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== VER).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});
self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.pathname.startsWith('/api/')) return; // 保存APIは常にネットワーク
  const fontHost = url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com';
  if (url.origin !== location.origin && !fontHost) return;
  if (req.mode === 'navigate' || url.pathname === '/index.html') {
    // 画面は、つながるときは最新・つながらないときは保存済みを使う
    e.respondWith(
      fetch(req).then((r) => { const c = r.clone(); caches.open(VER).then((x) => x.put('/index.html', c)); return r; })
        .catch(() => caches.match('/index.html'))
    );
    return;
  }
  // そのほか（アイコン・フォント）は保存済みを先に使い、裏で更新
  e.respondWith(
    caches.match(req).then((hit) => {
      const net = fetch(req).then((r) => {
        if (r && (r.ok || r.type === 'opaque')) { const c = r.clone(); caches.open(VER).then((x) => x.put(req, c)); }
        return r;
      }).catch(() => hit);
      return hit || net;
    })
  );
});
