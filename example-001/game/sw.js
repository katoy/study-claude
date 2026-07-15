const CACHE_NAME = 'otopazu-v1';
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './style.css',
  './manifest.json',
  './icon-192.png',
  './icon-512.png'
];

// インストール時に静的キャッシュを実行
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[Service Worker] Caching app shell');
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
  // 待機状態のサービスワーカーを即座にアクティブにする
  self.skipWaiting();
});

// アクティベート時に古いキャッシュをクリーンアップ
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('[Service Worker] Clearing old cache', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  // アクティブ化されたサービスワーカーが即座に制御を開始できるようにする
  self.clients.claim();
});

// リクエストフェッチのハンドリング
self.addEventListener('fetch', (event) => {
  // http / https プロトコルのみを処理対象とする（chrome-extension や file スキームを除外）
  if (!event.request.url.startsWith('http')) {
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }

      return fetch(event.request).then((response) => {
        // レスポンスが正常かつGETリクエストの場合のみキャッシュに追加
        if (!response || response.status !== 200 || response.type !== 'basic' && !event.request.url.includes('fonts.gstatic.com') && !event.request.url.includes('fonts.googleapis.com')) {
          return response;
        }

        const responseToCache = response.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, responseToCache);
        });

        return response;
      }).catch(() => {
        // オフライン時のフォールバック処理（必要なら記述）
      });
    })
  );
});
