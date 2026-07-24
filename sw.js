const CACHE_NAME = "stng-incorpo-v1";

// Arquivos principais que serão guardados em cache
const FILES_TO_CACHE = [
  "/",
  "/home",
  "/manifest.json",
  "/icon-192.png",
  "/icon-512.png"
];

// Instala o Service Worker e guarda os arquivos essenciais
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        return cache.addAll(FILES_TO_CACHE);
      })
      .then(() => {
        return self.skipWaiting();
      })
  );
});

// Ativa o novo Service Worker
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames
            .filter((cacheName) => cacheName !== CACHE_NAME)
            .map((cacheName) => caches.delete(cacheName))
        );
      })
      .then(() => {
        return self.clients.claim();
      })
  );
});

// Intercepta as requisições
self.addEventListener("fetch", (event) => {
  event.respondWith(
    caches.match(event.request)
      .then((cachedResponse) => {
        // Se existir no cache, usa o cache
        if (cachedResponse) {
          return cachedResponse;
        }

        // Caso contrário, busca na internet
        return fetch(event.request)
          .then((networkResponse) => {

            // Guarda uma cópia da resposta no cache
            if (
              networkResponse &&
              networkResponse.status === 200 &&
              networkResponse.type === "basic"
            ) {
              const responseClone = networkResponse.clone();

              caches.open(CACHE_NAME)
                .then((cache) => {
                  cache.put(event.request, responseClone);
                });
            }

            return networkResponse;
          })
          .catch(() => {
            // Se estiver offline e não houver cache,
            // tenta mostrar a página inicial
            return caches.match("/home");
          });
      })
  );
});
