/* GREEN SIDE service worker: يجعل التطبيق يفتح بدون إنترنت.
   ملفات التطبيق: الشبكة أولاً (لتصل التحديثات فوراً) ثم النسخة المحفوظة.
   المكتبات والخطوط: النسخة المحفوظة أولاً. بيانات Firestore لا تمر من هنا. */
var CACHE = "greenside-v3-401";
var SHELL = ["./", "index.html", "styles.css?v=3.4.1", "sensors.js?v=3.4.1", "workspace.js?v=3.4.1", "shift.js?v=3.4.1", "board.js?v=3.4.1", "record.js?v=3.4.1", "team.js?v=3.4.1", "app.js?v=3.4.1", "farm.js?v=3.4.1", "cycle.js?v=3.4.1", "config.js", "manifest.webmanifest", "icons/icon-192.png", "icons/icon-512.png"];
self.addEventListener("install", function (e) {
  e.waitUntil(caches.open(CACHE).then(function (c) { return c.addAll(SHELL); }).then(function () { return self.skipWaiting(); }));
});
self.addEventListener("activate", function (e) {
  e.waitUntil(caches.keys().then(function (ks) { return Promise.all(ks.filter(function (k) { return k.indexOf("greenside-") === 0 && k !== CACHE; }).map(function (k) { return caches.delete(k); })); }).then(function () { return self.clients.claim(); }));
});
self.addEventListener("fetch", function (e) {
  var req = e.request; if (req.method !== "GET") return;
  var url = new URL(req.url);
  var lib = /(^|\.)gstatic\.com$|cdnjs\.cloudflare\.com$|fonts\.googleapis\.com$/.test(url.hostname) && !/firestore|identitytoolkit|securetoken/.test(url.hostname);
  if (url.origin === location.origin) {
    /* سؤال التطبيق عن رقم الإصدار (sw.js?t=…) لا يُحفظ: يأتي دائماً من الشبكة */
    if (/\/sw\.js$/.test(url.pathname)) return;
    e.respondWith(fetch(req).then(function (res) {
      if (res.ok) { var copy = res.clone(); caches.open(CACHE).then(function (c) { c.put(req, copy); }); }
      return res;
    }).catch(function () { return caches.match(req, { ignoreSearch: true }).then(function (r) { return r || caches.match("index.html"); }); }));
  } else if (lib) {
    e.respondWith(caches.match(req).then(function (r) {
      return r || fetch(req).then(function (res) { var copy = res.clone(); caches.open(CACHE).then(function (c) { c.put(req, copy); }); return res; });
    }));
  }
});
/* task alarm notification: tapping it opens the app */
self.addEventListener("notificationclick", function (e) {
  e.notification.close();
  e.waitUntil(self.clients.matchAll({ type: "window", includeUncontrolled: true }).then(function (cs) {
    for (var i = 0; i < cs.length; i++) { if ("focus" in cs[i]) return cs[i].focus(); }
    return self.clients.openWindow ? self.clients.openWindow("./") : null;
  }));
});
