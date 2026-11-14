// Network-first for app files, falling back to cache when offline.
// User data lives in IndexedDB and is never touched here.

const CACHE = 'pamietam-shell-v3';
const SHELL = [
  './',
  './index.html',
  './manifest.webmanifest',
  './icons/icon.svg',
  './icons/icon-180.png',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './styles/app.css',
  './src/main.js',
  './src/core/model.js',
  './src/core/text.js',
  './src/core/timeline.js',
  './src/data/db.js',
  './src/data/entryRepository.js',
  './src/data/audioRepository.js',
  './src/services/entryService.js',
  './src/search/textSearch.js',
  './src/audio/recorder.js',
  './src/ai/transcription/provider.js',
  './src/ai/transcription/webSpeechProvider.js',
  './src/ui/dom.js',
  './src/ui/router.js',
  './src/ui/components/entryForm.js',
  './src/ui/components/entryCard.js',
  './src/ui/components/audioPlayer.js',
  './src/ui/views/home.js',
  './src/ui/views/editor.js',
  './src/ui/views/say.js',
  './src/ui/views/entry.js',
  './src/ui/views/search.js',
];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  if (event.request.method !== 'GET' || url.origin !== location.origin || url.pathname.includes('/tests/')) return;
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        if (response.ok) {
          const copy = response.clone();
          caches.open(CACHE).then((c) => c.put(event.request, copy));
        }
        return response;
      })
      .catch(() => caches.match(event.request, { ignoreSearch: true })),
  );
});
