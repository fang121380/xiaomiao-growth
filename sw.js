/* Service Worker：网络优先 + 本地缓存兜底
 * 策略：
 *   - GET 请求：network-first（永远拿最新），失败时降级到缓存
 *   - HTML/JS/CSS：缓存到 xiaomiao-v1 命名空间
 *   - 照片/IndexedDB 请求：直接走网络，不缓存
 *   - 后台发现新版本时，自动 skipWaiting 并通知所有 client 刷新
 */
const CACHE_NAME = 'xiaomiao-v1';
const ESSENTIAL = [
  '/', '/index.html', '/styles.css', '/app.js', '/breeds.js',
  '/knowledge.js', '/config.js', '/manifest.json', '/version.json',
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then(c => c.addAll(ESSENTIAL).catch(() => {}))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  // 只处理同源 + capacitor scheme
  if (url.origin !== self.location.origin &&
      !url.protocol.startsWith('capacitor')) return;

  e.respondWith(
    fetch(req)
      .then(resp => {
        // 成功：写一份到缓存（异步，不阻塞响应）
        if (resp.ok && (req.destination === 'document' ||
                         req.destination === 'script' ||
                         req.destination === 'style' ||
                         url.pathname.endsWith('.json'))) {
          const clone = resp.clone();
          caches.open(CACHE_NAME).then(c => c.put(req, clone)).catch(() => {});
        }
        return resp;
      })
      .catch(() => caches.match(req).then(c => c || caches.match('/index.html')))
  );
});

// 后台收到 SKIP_WAITING 消息后激活并通知所有 client 刷新
self.addEventListener('message', (e) => {
  if (e.data === 'SKIP_WAITING') self.skipWaiting();
});
