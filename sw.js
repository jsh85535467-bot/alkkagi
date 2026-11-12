/* 오프라인에서도 열리게 하는 서비스 워커
   - 게임 파일: 인터넷이 되면 최신 파일, 안 되면 저장해 둔 파일
   - 글씨체(구글 폰트): 한 번 받으면 따로 저장해 두어, 인터넷이 없어도 같은 글씨체로 보인다 */
var CACHE = 'kioknolit-v22';
var FONT_CACHE = 'alkkagi-fonts-v1';   // 글씨체는 게임 버전이 바뀌어도 지우지 않는다
var FILES = ['./', 'index.html', 'style.css', 'physics.js', 'ai.js', 'seqlogic.js', 'mazelogic.js', 'recordlogic.js', 'proverblogic.js', 'shoplogic.js', 'store.js', 'fanfare.js', 'main.js', 'sequence.js', 'maze.js', 'quiz.js', 'proverb.js', 'shop.js', 'record.js',
  'manifest.json', 'icons/icon.svg', 'icons/icon-180.png', 'icons/icon-192.png', 'icons/icon-512.png'];
var FONT_HOSTS = ['fonts.googleapis.com', 'fonts.gstatic.com'];

self.addEventListener('install', function (e) {
  e.waitUntil(caches.open(CACHE).then(function (c) { return c.addAll(FILES); }).then(function () { return self.skipWaiting(); }));
});

self.addEventListener('activate', function (e) {
  e.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.filter(function (k) { return k !== CACHE && k !== FONT_CACHE; }).map(function (k) { return caches.delete(k); }));
    }).then(function () { return self.clients.claim(); })
  );
});

self.addEventListener('fetch', function (e) {
  if (e.request.method !== 'GET') return;
  var url = new URL(e.request.url);

  if (url.origin !== location.origin) {
    if (FONT_HOSTS.indexOf(url.hostname) === -1) return;
    e.respondWith(
      caches.open(FONT_CACHE).then(function (c) {
        return c.match(e.request).then(function (hit) {
          if (hit) return hit;
          return fetch(e.request).then(function (res) { c.put(e.request, res.clone()); return res; });
        });
      })
    );
    return;
  }

  e.respondWith(
    fetch(e.request).then(function (res) {
      var copy = res.clone();
      caches.open(CACHE).then(function (c) { c.put(e.request, copy); });
      return res;
    }).catch(function () { return caches.match(e.request).then(function (r) { return r || caches.match('index.html'); }); })
  );
});
