const CACHE_NAME = "laoniu-pwa-static-v31-save-baseline";
const APP_SCOPE = new URL(self.registration.scope).pathname;
const CORE_ASSETS = [
  APP_SCOPE,
  `${APP_SCOPE}index.html`,
  `${APP_SCOPE}manifest.webmanifest`,
  `${APP_SCOPE}icon-192.png`,
  `${APP_SCOPE}icon-512.png`,
  `${APP_SCOPE}apple-touch-icon.png`,
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(CORE_ASSETS))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
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

function isStaticRequest(request) {
  return (
    request.method === "GET" &&
    new URL(request.url).origin === self.location.origin &&
    ["document", "script", "style", "image", "font", "manifest"].includes(
      request.destination,
    )
  );
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  if (
    !url.pathname.startsWith(APP_SCOPE) ||
    url.pathname.startsWith(`${APP_SCOPE}api/`) ||
    !isStaticRequest(request)
  ) {
    return;
  }

  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request).catch(() => caches.match(`${APP_SCOPE}index.html`)),
    );
    return;
  }

  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;
      return fetch(request).then((response) => {
        const copy = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
        return response;
      });
    }),
  );
});
