// ============================================
// STNG INCORPO - SERVICE WORKER
// Estratégia: Network First para conteúdo
// ============================================

const CACHE_NAME = "stng-incorpo-cache";

// Arquivos essenciais para funcionamento offline
const OFFLINE_FILES = [
  "/",
  "/home",
  "/manifest.json",
  "/icon-192.png",
  "/icon-512.png"
];


// ============================================
// INSTALAÇÃO
// ============================================

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        return cache.addAll(OFFLINE_FILES);
      })
      .then(() => {
        // Ativa imediatamente a nova versão
        return self.skipWaiting();
      })
  );
});


// ============================================
// ATIVAÇÃO
// ============================================

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
        // Assume o controle das páginas imediatamente
        return self.clients.claim();
      })
  );
});


// ============================================
// INTERCEPTAÇÃO DAS REQUISIÇÕES
// ============================================

self.addEventListener("fetch", (event) => {

  // Apenas requisições GET
  if (event.request.method !== "GET") {
    return;
  }

  const requestURL = new URL(event.request.url);

  // Ignora requisições externas
  if (requestURL.origin !== self.location.origin) {
    return;
  }

  event.respondWith(

    // Primeiro tenta buscar a versão mais recente
    fetch(event.request)
      .then((networkResponse) => {

        // Se a resposta for válida,
        // guarda uma cópia atualizada no cache
        if (
          networkResponse &&
          networkResponse.status === 200
        ) {

          const responseClone = networkResponse.clone();

          caches.open(CACHE_NAME)
            .then((cache) => {
              cache.put(event.request, responseClone);
            });
        }

        // Entrega a versão mais recente ao usuário
        return networkResponse;
      })

      // Se não houver internet
      .catch(() => {

        // Procura a versão guardada no cache
        return caches.match(event.request)
          .then((cachedResponse) => {

            // Se existir no cache, usa ela
            if (cachedResponse) {
              return cachedResponse;
            }

            // Se não encontrar,
            // tenta abrir a página inicial
            return caches.match("/home");
          });
      })
  );
});


// ============================================
// DETECTA ATUALIZAÇÃO DO SERVICE WORKER
// ============================================

self.addEventListener("message", (event) => {

  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }

});
