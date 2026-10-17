/* 小满 · Service Worker
   策略：网络优先，缓存兜底。保证用户看到最新版，离线也能用。 */

var CACHE = "xiaoman-shell-v4";

self.addEventListener("install", function(event){
  // 不预缓存，避免某个文件加载失败导致 SW 无法激活
  event.waitUntil(self.skipWaiting());
});

self.addEventListener("activate", function(event){
  event.waitUntil(
    caches.keys().then(function(keys){
      return Promise.all(keys.map(function(k){
        if(k !== CACHE) return caches.delete(k);
      }));
    }).then(function(){
      return self.clients.claim();
    })
  );
});

self.addEventListener("fetch", function(event){
  var req = event.request;
  if(req.method !== "GET") return;

  var url;
  try{ url = new URL(req.url); }catch(e){ return; }
  if(url.origin !== self.location.origin) return;

  // 导航请求（打开页面）：优先网络，失败用缓存
  if(req.mode === "navigate"){
    event.respondWith(
      fetch(req).then(function(res){
        if(res && res.status === 200){
          var copy = res.clone();
          caches.open(CACHE).then(function(cache){ cache.put(req, copy); });
        }
        return res;
      }).catch(function(){
        return caches.match(req).then(function(hit){
          return hit || caches.match("./index.html");
        });
      })
    );
    return;
  }

  // 静态资源：缓存优先，网络更新
  event.respondWith(
    caches.match(req).then(function(hit){
      var network = fetch(req).then(function(res){
        if(res && res.status === 200){
          var copy = res.clone();
          caches.open(CACHE).then(function(cache){ cache.put(req, copy); });
        }
        return res;
      }).catch(function(){ return hit; });
      return hit || network;
    })
  );
});
