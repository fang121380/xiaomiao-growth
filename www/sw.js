/* Service Worker: 自杀版
 * v2.2.5+: 之前 v2.2.3 的 SW 把 index.html 缓存到 xiaomiao-v1，
 * 覆盖安装新 APK 后 WebView 仍走 cache，导致永远显示旧版。
 *
 * 现在 sw.js 启动后只做两件事：
 *   1. 清掉所有 cache
 *   2. unregister 自己
 *
 * 之后 WebView 直接走 assets 文件，永远不会被 SW 拦截。
 *
 * 文件必须保持字节级变化（哪怕一个空格），让浏览器检测到"新 SW"并触发 install。
 */

/* SW v3 - 自杀版 */

self.addEventListener('install', () => {
  // 立即跳过 waiting，让 activate 尽快跑
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil((async () => {
    // 1. 清掉所有 cache（v1 v2 全部）
    try {
      const keys = await caches.keys();
      await Promise.all(keys.map(k => caches.delete(k)));
    } catch {}
    // 2. unregister 自己，从此 WebView 不再受 SW 控制
    try {
      await self.registration.unregister();
    } catch {}
    // 3. 接管后让所有 client 重新加载一次（确保拿新 assets）
    try {
      const clients = await self.clients.matchAll({ type: 'window' });
      for (const c of clients) {
        try { c.navigate(c.url); } catch {}
      }
    } catch {}
  })());
});

// 不注册 fetch handler——unregister 之后 SW 已不再控制任何请求