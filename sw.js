/**
 * Minimal offline cache for the static app shell only. Audio files are
 * deliberately excluded: <audio> elements issue HTTP range requests to
 * seek/buffer, and the Cache API doesn't handle partial responses the way
 * a real HTTP range request does — caching them here would risk breaking
 * playback/seeking instead of helping it. They're left to the network
 * (and the browser's own HTTP cache) as normal.
 */
const CACHE_VERSION = 'for-you-v2';

const APP_SHELL = [
  './',
  'index.html',
  'css/style.css',
  'js/app.js',
  'js/audioEngine.js',
  'js/scratchCanvas.js',
  'js/confettiEffect.js',
  'js/pullToRefresh.js',
  'js/vendor/confetti.browser.min.js',
  'manifest.json',
  'assets/images/photo1.webp',
  'assets/images/loving.webp',
  'assets/images/us.webp',
  'assets/images/photo1.jpg',
  'assets/images/loving.jpeg',
  'assets/images/us.jpeg',
  'assets/images/icon-192.png',
  'assets/images/icon-512.png',
  'assets/images/apple-touch-icon.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION).then((cache) => cache.addAll(APP_SHELL))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((key) => key !== CACHE_VERSION).map((key) => caches.delete(key)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  if (url.origin !== location.origin) return; // leave the Google Fonts CDN alone
  if (url.pathname.includes('/assets/audio/')) return; // let range requests hit the network

  event.respondWith(
    caches.match(req).then((cached) => {
      if (cached) return cached;
      return fetch(req)
        .then((response) => {
          if (response.ok) {
            const copy = response.clone();
            caches.open(CACHE_VERSION).then((cache) => cache.put(req, copy));
          }
          return response;
        })
        .catch(() => cached);
    })
  );
});
