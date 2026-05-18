const CACHE_NAME = 'pantrylist-shell-v1';
const SHELL_URLS = ['/', '/login', '/favicon.ico', '/manifest.webmanifest'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(SHELL_URLS))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key !== CACHE_NAME)
            .map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const request = event.request;

  if (request.method !== 'GET') {
    return;
  }

  const url = new URL(request.url);

  if (url.origin !== self.location.origin || url.pathname.startsWith('/api/')) {
    return;
  }

  const isPublicShell =
    url.pathname === '/' ||
    url.pathname === '/login' ||
    url.pathname === '/favicon.ico' ||
    url.pathname === '/manifest.webmanifest';
  const isStaticAsset = ['script', 'style', 'image', 'font'].includes(
    request.destination,
  );

  if (!isPublicShell && !isStaticAsset) {
    return;
  }

  event.respondWith(
    fetch(request)
      .then((response) => {
        const copy = response.clone();

        caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));

        return response;
      })
      .catch(() => caches.match(request).then((cached) => cached ?? caches.match('/'))),
  );
});
