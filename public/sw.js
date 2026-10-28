// 練起來 Service Worker
// 作用：讓 APP 可「加入主畫面」、離線也能開啟。
// 更新網站時，請把下面的 VERSION 改一個數字（例如 v0.1.1），手機才會抓到新版本。
const VERSION = 'v0.4.0';
const CACHE = 'fitness-app-' + VERSION;
const ASSETS = [
  './',
  './index.html',
  './app.js',
  './style.css',
  './manifest.webmanifest',
  './icon.svg',
  './apple-touch-icon.png',
  './icon-192.png',
  './icon-512.png',
  './icon-maskable-512.png',
];

self.addEventListener('install', (event) => {
  // 個別加入快取：其中一個檔案不存在也不會讓整個安裝失敗
  event.waitUntil(caches.open(CACHE).then((c) => Promise.allSettled(ASSETS.map((a) => c.add(a)))));
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))),
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return;

  // 頁面：先走網路（拿最新版），沒網路時用快取
  if (req.mode === 'navigate') {
    event.respondWith(fetch(req).catch(() => caches.match('./index.html')));
    return;
  }

  // 靜態檔：先用快取，背景再更新
  event.respondWith(
    caches.match(req).then((hit) => {
      const net = fetch(req)
        .then((res) => {
          if (res.ok) {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(req, copy));
          }
          return res;
        })
        .catch(() => hit);
      return hit || net;
    }),
  );
});
