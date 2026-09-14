/* Service Worker：仅用于在 APP 启动时清理旧版留下的缓存
 * 本地 APP 不再需要离线缓存，避免覆盖安装后看到旧版本
 */
self.addEventListener('install', (e) => {
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    Promise.all([
      // 清空所有旧缓存
      caches.keys().then(keys => Promise.all(keys.map(k => caches.delete(k)))),
      // 注销自身（不再做任何缓存）
      self.registration.unregister().then(() => self.clients.matchAll({ type: 'window' }))
        .then(clients => clients.forEach(c => c.navigate(c.url))),
    ])
  );
});

// fetch 不做任何事，让请求直接走网络（实际上 webview 永远命中本地 assets/）
self.addEventListener('fetch', () => {});