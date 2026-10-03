/*
 * Service worker d'Africa Live (UX-504) — volontairement minimal.
 * Il ne met en cache QUE l'écran « hors antenne » et ses deux images locales.
 * Aucune vidéo, aucune réponse d'API, aucune image distante n'est jamais stockée : seules les navigations
 * sont interceptées, réseau d'abord ; sans connexion, l'écran hors-ligne s'affiche.
 */
const CACHE = 'al-offline-v1';
const OFFLINE_URL = '/offline.html';
const PRECACHE = [OFFLINE_URL, '/africa-live-logo.webp', '/africa-live-icon-192.png'];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(PRECACHE)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (request.mode === 'navigate') {
    event.respondWith(fetch(request).catch(() => caches.match(OFFLINE_URL)));
    return;
  }
  // Images de l'écran hors-ligne seulement (jamais d'autre ressource).
  if (PRECACHE.includes(url.pathname) && url.pathname !== OFFLINE_URL) {
    event.respondWith(fetch(request).catch(() => caches.match(url.pathname)));
  }
});
