// 不快取筆記、登入回應或私人頁面；網路中斷時不提供離線資料。
self.addEventListener('install',()=>self.skipWaiting());
self.addEventListener('activate',event=>event.waitUntil(self.clients.claim()));
self.addEventListener('fetch',()=>{});
