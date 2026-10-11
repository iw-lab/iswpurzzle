// 옛 크로마폴 서비스 워커를 끄는 «자폭» 워커 — 받자마자 캐시를 지우고 스스로 등록을 푼 뒤 열린 창을 새로 고친다.
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => {
  e.waitUntil((async () => {
    for (const k of await caches.keys()) await caches.delete(k);
    await self.registration.unregister();
    for (const c of await self.clients.matchAll({ type: 'window' })) c.navigate(c.url);
  })());
});
