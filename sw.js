// مواهب داري: عامل الخدمة (Service Worker) لتشغيل التطبيق دون اتصال
// الواجهة والمكتبات تُحفظ في الجهاز، وبيانات Firebase لا تُخزَّن هنا (تبقى مباشرة وآمنة).
// غيّر الرقم مع ?v= في index.html عند كل تحديث
const CACHE = 'mawaheb-dari-2026110505';
const SHELL = [
  './', './index.html', './manifest.webmanifest',
  './css/features.css?v=2026110505', './js/talents.js?v=2026110505', './js/stars.js?v=2026110505', './js/messenger.js?v=2026110505',
  './js/ai-brain.js?v=2026110505', './js/ai.js?v=2026110505', './js/dashboard.js?v=2026110505', './js/app.js?v=2026110505',
  './icons/icon.svg', './icons/icon-192.png', './icons/icon-512.png', './icons/apple-touch-icon.png'
];
const LIVE = /firebaseio\.com|firebasedatabase\.app|identitytoolkit|securetoken|firebasevertexai|firebaseinstallations|googleapis\.com\/(?!css)|firebasestorage|tile\.openstreetmap|arcgisonline/;

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET' || LIVE.test(req.url)) return;
  // الصفحة: من الشبكة أولاً، ومن النسخة المحفوظة عند انقطاع الاتصال
  if (req.mode === 'navigate') {
    e.respondWith(fetch(req).then(res => {
      const copy = res.clone();
      caches.open(CACHE).then(c => c.put('./index.html', copy));
      return res;
    }).catch(() => caches.match('./index.html')));
    return;
  }
  // الملفات والمكتبات: النسخة المحفوظة فوراً مع تحديثها في الخلفية
  e.respondWith(caches.match(req).then(hit => {
    const net = fetch(req).then(res => {
      if (res && (res.ok || res.type === 'opaque')) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)); }
      return res;
    }).catch(() => hit);
    return hit || net;
  }));
});
