// Offline service worker. Every app file is precached (see precache.json, made by
// tools/gen_precache.mjs) into a cache named for the content version, so the app,
// the stroke animations and the fonts all work with no network.
// precache-version: d23bef4c85ea
// (stamped by tools/gen_precache.mjs so this file changes with every release)
const PREFIX = 'hk-';
const LEGACY = 'hanja-kanji-learner-v3';
const BATCH = 50;
const MARKER = new URL('./__hk_complete', self.registration.scope).href;
const ROOT = new URL('./', self.registration.scope).href;
const INDEX = new URL('./index.html', self.registration.scope).href;

// Caches are shared by the whole origin: only ever touch our own hk-* names and the old app's cache.
function cacheNamesToDelete(names, keep) {
  return names.filter((n) => n === LEGACY || (n.startsWith(PREFIX) && n !== keep));
}

let ownCache = null; // set when this worker instance installed; lost if the worker is restarted

async function precache() {
  const res = await fetch('./precache.json', { cache: 'no-cache' });
  if (!res.ok) throw new Error(`precache.json: ${res.status}`);
  const { version, files } = await res.json();
  const name = `${PREFIX}${version}`;
  const cache = await caches.open(name);
  try {
    for (let i = 0; i < files.length; i += BATCH) {
      // 'reload' skips the HTTP cache, so a stale copy can never land under a new version.
      await cache.addAll(files.slice(i, i + BATCH).map((f) => new Request(f, { cache: 'reload' })));
    }
    // Written last: a cache without it is a half-filled one and is never used or kept.
    await cache.put(MARKER, new Response(String(Date.now())));
  } catch (err) {
    await caches.delete(name);
    throw err; // fail the install; the browser retries later
  }
  ownCache = name;
}

self.addEventListener('install', (event) => {
  event.waitUntil(precache());
});

// The completed cache with the newest marker is this worker's own, even after a restart.
async function newestComplete() {
  let best = null;
  let bestTime = -1;
  for (const name of await caches.keys()) {
    if (!name.startsWith(PREFIX)) continue;
    const marker = await (await caches.open(name)).match(MARKER);
    const t = marker ? Number(await marker.text()) : NaN;
    if (Number.isFinite(t) && t > bestTime) { best = name; bestTime = t; }
  }
  return best;
}

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keep = ownCache ?? (await newestComplete());
    for (const name of cacheNamesToDelete(await caches.keys(), keep)) await caches.delete(name);
    await self.clients.claim();
  })());
});

self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') self.skipWaiting();
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return; // api.github.com and anything cross-origin
  event.respondWith(respond(req));
});

async function respond(req) {
  if (req.mode === 'navigate') {
    // The home-screen app opens the directory URL, often with a query string; serve the shell.
    const shell = (await caches.match(ROOT, { ignoreSearch: true })) ?? (await caches.match(INDEX, { ignoreSearch: true }));
    if (shell) return shell;
    return fetch(req);
  }
  // With several caches (an update is waiting) match() searches the oldest first, which is
  // the cache the still-active worker was installed with.
  const hit = await caches.match(req);
  if (hit) return hit;
  const res = await fetch(req);
  if (res.status === 200 && res.type === 'basic' && ownCache) {
    const copy = res.clone();
    caches.open(ownCache).then((c) => c.put(req, copy)).catch(() => {});
  }
  return res;
}
