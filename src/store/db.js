// IndexedDB store: profiles, append-only review log, device meta.
const LEGACY_PREFIXES = ['hanja_', 'kanji_', 'hk_'];

const req = (r) => new Promise((res, rej) => {
  r.onsuccess = () => res(r.result);
  r.onerror = () => rej(r.error);
});

const done = (tx) => new Promise((res, rej) => {
  tx.oncomplete = () => res();
  tx.onerror = () => rej(tx.error);
  tx.onabort = () => rej(tx.error);
});

const strip = ({ profile, synced, ...entry }) => entry; // eslint-disable-line no-unused-vars

export function defaultSettings() {
  const study = () => ({
    newPerDay: 10,
    maxReviews: 200,
    learningSteps: ['1m', '10m'],
    relearningSteps: ['10m'],
    retention: 0.9,
  });
  return { ja: study(), ko: study(), dayStartHour: 4, appearance: 'auto' };
}

export async function openDb(name = 'hk') {
  const idb = globalThis.indexedDB;
  const open = idb.open(name, 1);
  open.onupgradeneeded = () => {
    const d = open.result;
    d.createObjectStore('profiles', { keyPath: 'key' });
    const log = d.createObjectStore('log', { keyPath: 'id' });
    log.createIndex('profile', 'profile');
    log.createIndex('synced', 'synced');
    d.createObjectStore('meta', { keyPath: 'k' });
  };
  const d = await req(open);

  return {
    async getMeta(k) {
      const row = await req(d.transaction('meta').objectStore('meta').get(k));
      return row ? row.v : undefined;
    },
    async setMeta(k, v) {
      const tx = d.transaction('meta', 'readwrite');
      tx.objectStore('meta').put({ k, v });
      await done(tx);
    },
    listProfiles: () => req(d.transaction('profiles').objectStore('profiles').getAll()),
    getProfile: (key) => req(d.transaction('profiles').objectStore('profiles').get(key)),
    async putProfile(p) {
      const tx = d.transaction('profiles', 'readwrite');
      tx.objectStore('profiles').put(p);
      await done(tx);
    },
    async addEntries(profileKey, entries) {
      const tx = d.transaction('log', 'readwrite');
      const store = tx.objectStore('log');
      let added = 0;
      await Promise.all(entries.map(async (entry) => {
        if (await req(store.getKey(entry.id)) !== undefined) return;
        await req(store.add({ ...entry, profile: profileKey, synced: 0 }));
        added++;
      }));
      await done(tx);
      return added;
    },
    async getEntries(profileKey) {
      const rows = await req(d.transaction('log').objectStore('log').index('profile').getAll(profileKey));
      return rows.map(strip);
    },
    async unsynced(profileKey) {
      const rows = await req(d.transaction('log').objectStore('log').index('profile').getAll(profileKey));
      return rows.filter((r) => r.synced === 0).map(strip);
    },
    async markSynced(ids) {
      const tx = d.transaction('log', 'readwrite');
      const store = tx.objectStore('log');
      await Promise.all(ids.map(async (id) => {
        const row = await req(store.get(id));
        if (row) await req(store.put({ ...row, synced: 1 }));
      }));
      await done(tx);
    },
  };
}

export async function deviceId(db) {
  let id = await db.getMeta('deviceId');
  if (!id) {
    const bytes = globalThis.crypto.getRandomValues(new Uint8Array(8));
    id = Array.from(bytes, (b) => (b % 36).toString(36)).join('');
    await db.setMeta('deviceId', id);
  }
  return id;
}

export function cleanupLegacyStorage(storage) {
  const keys = [];
  for (let i = 0; i < storage.length; i++) {
    const k = storage.key(i);
    if (k !== null && LEGACY_PREFIXES.some((p) => k.startsWith(p))) keys.push(k);
  }
  keys.forEach((k) => storage.removeItem(k));
  return keys;
}
