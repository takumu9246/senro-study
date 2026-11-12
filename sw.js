// オフライン対応：ネットワーク優先、失敗時はキャッシュ
const CACHE = 'senro-study-v1';
const FILES = ['./', 'index.html', 'style.css', 'manifest.json', 'icon.svg', 'icon-192.png',
  'js/questions.js', 'js/notes.js', 'js/plan.js', 'js/calc.js', 'js/app.js'];
self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(FILES)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  e.respondWith(
    fetch(e.request).then((res) => {
      const copy = res.clone();
      caches.open(CACHE).then((c) => c.put(e.request, copy));
      return res;
    }).catch(() => caches.match(e.request).then((r) => r || caches.match('index.html')))
  );
});
