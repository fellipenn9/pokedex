// =============================================================================
// Service Worker — PokéDex Collector
// =============================================================================
// Estrategia:
//  - HTML / navegacao  -> NETWORK-FIRST (deploy novo aparece na hora; cache so
//                         e usado como fallback offline). Evita o classico
//                         "usuario preso em versao antiga" de PWA.
//  - Assets estaticos  -> CACHE-FIRST (icones, manifest e os JSONs pesados,
//    e JSONs versionados   versionados via ?v=DATA_VERSION). Carrega instantaneo
//                         e funciona offline depois do 1o load.
//  - Cross-origin       -> PASSTHROUGH (Firebase/Firestore, Google Auth,
//    (Firebase/API)        api.pokemontcg.io NUNCA sao interceptados).
//
// IMPORTANTE: ao publicar mudancas no app OU regerar os JSONs, BUMP o
// CACHE_VERSION abaixo (e o DATA_VERSION no index.html). Isso descarta os
// caches antigos no 'activate'.
// =============================================================================

const CACHE_VERSION = 'v1-2026-06-25b';
const CACHE_NAME = 'pokedex-' + CACHE_VERSION;

// Assets do "app shell" pre-cacheados na instalacao.
// Os JSONs grandes NAO entram aqui (sao cacheados sob demanda no 1o fetch)
// para nao atrasar a instalacao do SW.
const PRECACHE_URLS = [
  './',
  './index.html',
  './manifest.json',
  './icon.svg',
  './icon-192.png',
  './icon-512.png',
];

self.addEventListener('install', (event) => {
  self.skipWaiting(); // ativa o novo SW imediatamente
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_URLS)).catch(() => {})
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((k) => k.startsWith('pokedex-') && k !== CACHE_NAME)
            .map((k) => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;

  // So lida com GET same-origin; o resto passa direto (Firebase/API/etc.)
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  const isNavigation =
    req.mode === 'navigate' ||
    (req.headers.get('accept') || '').includes('text/html');

  if (isNavigation) {
    // NETWORK-FIRST para HTML
    event.respondWith(
      fetch(req)
        .then((resp) => {
          const copy = resp.clone();
          caches.open(CACHE_NAME).then((c) => c.put('./index.html', copy)).catch(() => {});
          return resp;
        })
        .catch(() => caches.match(req).then((r) => r || caches.match('./index.html')))
    );
    return;
  }

  // CACHE-FIRST para assets estaticos e JSONs (versionados)
  event.respondWith(
    caches.match(req).then((cached) => {
      if (cached) return cached;
      return fetch(req).then((resp) => {
        // So cacheia respostas validas same-origin
        if (resp && resp.ok && resp.type === 'basic') {
          const copy = resp.clone();
          caches.open(CACHE_NAME).then((c) => c.put(req, copy)).catch(() => {});
        }
        return resp;
      });
    })
  );
});
