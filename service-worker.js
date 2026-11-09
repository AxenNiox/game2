const CACHE_NAME = 'nebula-core-shell-v6';
const APP_FILES = [
  './', './index.html', './manifest.json', './css/style.css',
  './js/storage.js', './js/audio.js', './js/assets.js', './js/main.js',
  './assets/icons/app-192.png', './assets/icons/app-512.png',
  './assets/icons/app-192.svg', './assets/icons/app-512.svg',
  './assets/images/characters/hanamori-sheet.svg',
  './assets/images/enemies/fox-spirit.svg', './assets/images/enemies/moon-kitsune-boss.svg',
  './assets/images/backgrounds/stage1-far.svg', './assets/images/backgrounds/stage1-middle.svg', './assets/images/backgrounds/stage1-foreground.svg',
  './assets/images/backgrounds/ise-approach.svg', './assets/images/backgrounds/ise-forest-path.svg',
  './assets/images/backgrounds/ise-sky-shrine.svg', './assets/images/backgrounds/yokai-boss-realm.svg',
  './assets/images/bullets/player-spirit-shot.svg', './assets/images/bullets/enemy-pink-orb.svg',
  './assets/images/bullets/enemy-violet-orb.svg', './assets/images/bullets/enemy-gold-orb.svg',
  './assets/images/effects/sakura-burst.svg', './assets/images/effects/mystic-ring.svg', './assets/images/effects/muzzle-glow.svg',
];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_FILES)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(caches.keys().then((names) => Promise.all(
    names.filter((name) => name.startsWith('nebula-core-') && name !== CACHE_NAME).map((name) => caches.delete(name)),
  )).then(() => self.clients.claim()));
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET' || new URL(event.request.url).origin !== self.location.origin) return;
  event.respondWith(caches.match(event.request).then((cached) => cached || fetch(event.request).then((response) => {
    if (response.ok) {
      const copy = response.clone();
      caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
    }
    return response;
  }).catch(() => event.request.mode === 'navigate' ? caches.match('./index.html') : Response.error())));
});

