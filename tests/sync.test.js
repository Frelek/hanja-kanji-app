import 'fake-indexeddb/auto';
import test from 'node:test';
import assert from 'node:assert/strict';
import { openDb, defaultSettings } from '../src/store/db.js';
import { createStore } from '../src/state.js';
import { RATING } from '../src/engine/fsrs.js';
import { SyncError } from '../src/sync/github.js';
import {
  syncProfile, createSyncManager, syncLabel, clientFromMeta, githubClient, testText,
  DEFAULT_REPO, TOKEN_ERROR,
} from '../src/sync/sync.js';

const fresh = () => openDb('sync-' + Math.random().toString(36).slice(2));
const KEY = 'kacper-1234';
const DIR = `profiles/${KEY}`;
const NOW = new Date('2026-11-26T12:00:00.000Z');
const now = () => NOW;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const entry = (id, at, card = 'ja:日', rating = RATING.good) =>
  ({ id, type: 'review', card, rating, at, ms: 900, dev: id.split('-')[0] });

const profile = (extra = {}) => ({
  key: KEY, name: 'Kacper', tag: '1234', createdAt: '2026-11-20T10:00:00.000Z',
  settings: defaultSettings(), settingsUpdatedAt: {}, ...extra,
});

async function device({ entries = [], ...extra } = {}) {
  const db = await fresh();
  await db.putProfile(profile(extra));
  if (entries.length) await db.addEntries(KEY, entries);
  return db;
}

/**
 * GitHub in memory, behind the client interface: a Map of path -> {sha, json}, shas from a
 * counter, PUTs checked against the sha precondition as the Contents API does, and
 * conflicts that can be injected per path.
 */
function fakeGitHub() {
  const files = new Map();
  const calls = [];
  const forced = new Map();
  let n = 0;
  return {
    files,
    calls,
    puts: (path) => calls.filter((c) => c.op === 'put' && (!path || c.path === path)),
    gets: () => calls.filter((c) => c.op === 'get'),
    conflictNext(path, times = 1) { forced.set(path, (forced.get(path) ?? 0) + times); },
    entriesOf(path) { return files.get(path)?.json.entries.map((e) => e.id); },
    client({ beforePut } = {}) {
      return {
        async listDir(dir) {
          calls.push({ op: 'list', path: dir });
          const prefix = `${dir}/`;
          return [...files]
            .filter(([p]) => p.startsWith(prefix) && !p.slice(prefix.length).includes('/'))
            .map(([p, f]) => ({ name: p.slice(prefix.length), path: p, sha: f.sha }));
        },
        async getJson(path) {
          calls.push({ op: 'get', path });
          const f = files.get(path);
          return f ? { sha: f.sha, json: structuredClone(f.json) } : null;
        },
        async putJson(path, json, sha, message) {
          calls.push({ op: 'put', path, sha, message });
          if (beforePut) await beforePut(path, sha);
          if ((forced.get(path) ?? 0) > 0) {
            forced.set(path, forced.get(path) - 1);
            throw new SyncError('conflict', 409);
          }
          const cur = files.get(path);
          if (cur ? cur.sha !== sha : sha != null) throw new SyncError('conflict', cur ? 409 : 422);
          const next = { sha: `sha${++n}`, json: structuredClone(json) };
          files.set(path, next);
          return { sha: next.sha };
        },
        async test() { return { ok: true }; },
      };
    },
  };
}

const ids = (list) => list.map((e) => e.id).sort();

const DATA = {
  ja: { levels: [{ id: 'N5', count: 2 }], chars: [
    { id: 'ja:日', char: '日', level: 'N5', order: 0, required: [], meanings: [], parts: [], words: [] },
    { id: 'ja:一', char: '一', level: 'N5', order: 1, required: [], meanings: [], parts: [], words: [] },
  ] },
  ko: { levels: [], chars: [] },
};

async function studying(name = 'Kacper', tag = '1234') {
  const db = await fresh();
  const store = createStore({ db, now, data: DATA });
  await store.init();
  await store.actions.addProfile(name, tag);
  return { db, store };
}

const label = (store) => syncLabel(store.get().sync, NOW);

// --- syncProfile ---------------------------------------------------------------------------

test('local-only entries are pushed to their month file; a second sync pushes 0 and pulls 0', async () => {
  const gh = fakeGitHub();
  const db = await device({ entries: [
    entry('a-1', '2026-11-25T09:00:00.000Z'),
    entry('a-2', '2026-11-25T09:00:10.000Z', 'ja:一'),
    entry('a-3', '2026-11-25T09:10:00.000Z'),
  ] });
  const client = gh.client();

  const r = await syncProfile({ db, client, profileKey: KEY, now });
  assert.deepEqual(r, { pulled: 0, pushed: 3, created: true, existed: false });
  assert.deepEqual(gh.entriesOf(`${DIR}/log-2026-11.json`), ['a-1', 'a-2', 'a-3']);
  assert.deepEqual(gh.files.get(`${DIR}/profile.json`).json, {
    name: 'Kacper', tag: '1234', createdAt: '2026-11-20T10:00:00.000Z',
    settings: defaultSettings(), settingsUpdatedAt: {},
  });
  assert.deepEqual(gh.puts().map((c) => [c.path, c.sha, c.message]), [
    [`${DIR}/log-2026-11.json`, null, `sync ${KEY} 2026-11`],
    [`${DIR}/profile.json`, null, `sync ${KEY} profile`],
  ]);
  assert.deepEqual(await db.unsynced(KEY), []);
  assert.deepEqual(await db.getMeta(`sync:${KEY}`), {
    shas: {
      'log-2026-11.json': gh.files.get(`${DIR}/log-2026-11.json`).sha,
      'profile.json': gh.files.get(`${DIR}/profile.json`).sha,
    },
    lastSync: NOW.toISOString(),
  });

  const putsBefore = gh.puts().length;
  const getsBefore = gh.gets().length;
  const again = await syncProfile({ db, client, profileKey: KEY, now });
  assert.deepEqual(again, { pulled: 0, pushed: 0, created: false, existed: true });
  assert.equal(gh.puts().length, putsBefore, 'nothing is uploaded');
  // the unchanged month is not downloaded again; profile.json is read to compare settings
  assert.deepEqual(gh.gets().slice(getsBefore).map((c) => c.path), [`${DIR}/profile.json`]);

  // one more answer: only that month is uploaded, with its sha as the precondition
  await db.addEntries(KEY, [entry('a-4', '2026-11-26T08:00:00.000Z')]);
  const sha = gh.files.get(`${DIR}/log-2026-11.json`).sha;
  const third = await syncProfile({ db, client, profileKey: KEY, now });
  assert.deepEqual(third, { pulled: 0, pushed: 1, created: false, existed: true });
  assert.equal(gh.puts().at(-1).sha, sha);
  assert.deepEqual(gh.entriesOf(`${DIR}/log-2026-11.json`), ['a-1', 'a-2', 'a-3', 'a-4']);
});

test('entries either side of a month boundary go to their own month files', async () => {
  const gh = fakeGitHub();
  const db = await device({ entries: [
    entry('a-oct', '2026-10-31T23:59:59.999Z'),
    entry('a-nov', '2026-11-01T00:00:00.000Z'),
  ] });
  const r = await syncProfile({ db, client: gh.client(), profileKey: KEY, now });
  assert.equal(r.pushed, 2);
  assert.deepEqual(gh.entriesOf(`${DIR}/log-2026-10.json`), ['a-oct']);
  assert.deepEqual(gh.entriesOf(`${DIR}/log-2026-11.json`), ['a-nov']);
  assert.deepEqual(gh.puts(`${DIR}/log-2026-10.json`).map((c) => c.message), [`sync ${KEY} 2026-10`]);
  assert.deepEqual(gh.puts(`${DIR}/log-2026-11.json`).map((c) => c.message), [`sync ${KEY} 2026-11`]);
});

test('another device\'s entries are pulled once, stored as already synced', async () => {
  const gh = fakeGitHub();
  const phone = await device({ entries: [entry('p-1', '2026-11-24T07:00:00.000Z'), entry('p-2', '2026-10-02T07:00:00.000Z')] });
  await syncProfile({ db: phone, client: gh.client(), profileKey: KEY, now });

  const laptop = await device({ entries: [entry('l-1', '2026-11-25T20:00:00.000Z')] });
  const r = await syncProfile({ db: laptop, client: gh.client(), profileKey: KEY, now });
  assert.deepEqual(r, { pulled: 2, pushed: 1, created: false, existed: true });
  assert.deepEqual(ids(await laptop.getEntries(KEY)), ['l-1', 'p-1', 'p-2']);
  assert.deepEqual(await laptop.unsynced(KEY), []);

  const back = await syncProfile({ db: phone, client: gh.client(), profileKey: KEY, now });
  assert.deepEqual(back, { pulled: 1, pushed: 0, created: false, existed: true });
  assert.deepEqual(ids(await phone.getEntries(KEY)), ['l-1', 'p-1', 'p-2']);
});

test('Review Focus 2: the same profile created offline on two devices merges, not fails', async () => {
  const gh = fakeGitHub();
  const laptop = await device({
    createdAt: '2026-11-20T10:00:00.000Z',
    entries: [entry('l-1', '2026-11-20T10:01:00.000Z'), entry('l-2', '2026-11-20T10:02:00.000Z')],
  });
  const phone = await device({
    createdAt: '2026-11-20T09:00:00.000Z',
    settings: { ...defaultSettings(), ja: { ...defaultSettings().ja, newPerDay: 15 } },
    settingsUpdatedAt: { 'ja.newPerDay': '2026-11-20T09:30:00.000Z' },
    entries: [entry('p-1', '2026-11-20T09:31:00.000Z')],
  });

  // The phone lists the empty folder; just before it creates profile.json, the laptop
  // finishes a whole sync of its own and creates it first.
  let laptopFirst = null;
  const phoneClient = gh.client({
    async beforePut(path, sha) {
      if (path === `${DIR}/profile.json` && sha === null && !laptopFirst) {
        laptopFirst = await syncProfile({ db: laptop, client: gh.client(), profileKey: KEY, now });
      }
    },
  });
  const phoneFirst = await syncProfile({ db: phone, client: phoneClient, profileKey: KEY, now });

  assert.deepEqual(laptopFirst, { pulled: 1, pushed: 2, created: true, existed: false });
  assert.deepEqual(phoneFirst, { pulled: 0, pushed: 1, created: false, existed: true });
  const profilePuts = gh.puts(`${DIR}/profile.json`);
  assert.equal(profilePuts.filter((c) => c.sha === null).length, 2, 'both devices tried to create it');
  assert.ok(profilePuts.at(-1).sha !== null, 'the phone retried with the sha it fetched');

  const laptopAgain = await syncProfile({ db: laptop, client: gh.client(), profileKey: KEY, now });
  const phoneAgain = await syncProfile({ db: phone, client: gh.client(), profileKey: KEY, now });
  assert.equal(laptopAgain.existed, true);
  assert.equal(phoneAgain.existed, true);

  const all = ['l-1', 'l-2', 'p-1'];
  assert.deepEqual(gh.entriesOf(`${DIR}/log-2026-11.json`), ['p-1', 'l-1', 'l-2'], 'in time order');
  assert.deepEqual(ids(await laptop.getEntries(KEY)), all);
  assert.deepEqual(ids(await phone.getEntries(KEY)), all);
  assert.deepEqual(await laptop.unsynced(KEY), []);
  assert.deepEqual(await phone.unsynced(KEY), []);

  // settings and createdAt agree everywhere: the earlier creation, the phone's newer setting
  const a = await laptop.getProfile(KEY);
  const b = await phone.getProfile(KEY);
  assert.deepEqual(a, b);
  assert.equal(a.createdAt, '2026-11-20T09:00:00.000Z');
  assert.equal(a.settings.ja.newPerDay, 15);
  const remote = gh.files.get(`${DIR}/profile.json`).json;
  assert.equal(remote.createdAt, a.createdAt);
  assert.deepEqual(remote.settings, a.settings);
});

test('a conflict on a month file is retried up to 3 times, then SyncError conflict', async () => {
  const gh = fakeGitHub();
  const db = await device({ entries: [entry('a-1', '2026-11-25T09:00:00.000Z')] });
  gh.conflictNext(`${DIR}/log-2026-11.json`, 3);
  const r = await syncProfile({ db, client: gh.client(), profileKey: KEY, now });
  assert.equal(r.pushed, 1);
  assert.equal(gh.puts(`${DIR}/log-2026-11.json`).length, 4);

  const gh2 = fakeGitHub();
  const db2 = await device({ entries: [entry('a-1', '2026-11-25T09:00:00.000Z')] });
  gh2.conflictNext(`${DIR}/log-2026-11.json`, 4);
  await assert.rejects(
    syncProfile({ db: db2, client: gh2.client(), profileKey: KEY, now }),
    (e) => e instanceof SyncError && e.kind === 'conflict',
  );
  assert.equal(gh2.puts(`${DIR}/log-2026-11.json`).length, 4);
  assert.deepEqual(ids(await db2.unsynced(KEY)), ['a-1'], 'nothing is marked synced');
});

test('a conflict re-fetches the month, keeps the other device\'s entries and pulls them', async () => {
  const gh = fakeGitHub();
  const laptop = await device({ entries: [entry('l-1', '2026-11-25T09:00:00.000Z')] });
  const phone = await device({ entries: [entry('p-1', '2026-11-25T08:00:00.000Z')] });
  let once = false;
  const client = gh.client({
    async beforePut(path) {
      if (path.endsWith('log-2026-11.json') && !once) {
        once = true;
        await syncProfile({ db: phone, client: gh.client(), profileKey: KEY, now });
      }
    },
  });
  const r = await syncProfile({ db: laptop, client, profileKey: KEY, now });
  assert.equal(r.pulled, 1);
  assert.equal(r.pushed, 1);
  assert.deepEqual(gh.entriesOf(`${DIR}/log-2026-11.json`), ['p-1', 'l-1']);
  assert.deepEqual(ids(await laptop.getEntries(KEY)), ['l-1', 'p-1']);
});

test('settings merge per field: the newer stamp wins on both sides', async () => {
  const gh = fakeGitHub();
  const s = defaultSettings();
  const phone = await device({
    settings: { ...s, ja: { ...s.ja, newPerDay: 25 } },
    settingsUpdatedAt: { 'ja.newPerDay': '2026-11-22T00:00:00.000Z' },
  });
  await syncProfile({ db: phone, client: gh.client(), profileKey: KEY, now });

  const laptop = await device({
    settings: { ...s, ja: { ...s.ja, newPerDay: 15 }, ko: { ...s.ko, maxReviews: 150 } },
    settingsUpdatedAt: { 'ja.newPerDay': '2026-11-21T00:00:00.000Z', 'ko.maxReviews': '2026-11-23T00:00:00.000Z' },
  });
  await syncProfile({ db: laptop, client: gh.client(), profileKey: KEY, now });
  const merged = await laptop.getProfile(KEY);
  assert.equal(merged.settings.ja.newPerDay, 25);
  assert.equal(merged.settings.ko.maxReviews, 150);
  assert.deepEqual(merged.settingsUpdatedAt, {
    'ja.newPerDay': '2026-11-22T00:00:00.000Z', 'ko.maxReviews': '2026-11-23T00:00:00.000Z',
  });

  await syncProfile({ db: phone, client: gh.client(), profileKey: KEY, now });
  assert.deepEqual(await phone.getProfile(KEY), merged);
});

test('malformed remote settings and entries are skipped; unknown entries stay on the server', async () => {
  const gh = fakeGitHub();
  gh.files.set(`${DIR}/profile.json`, {
    sha: 'x1',
    json: JSON.parse(`{"name":"Kacper","tag":"1234","createdAt":"2026-01-01T00:00:00.000Z",
      "settings":{"ja":{"newPerDay":"lots","learningSteps":"1m"},"dayStartHour":5,"__proto__":{"polluted":true}},
      "settingsUpdatedAt":{"ja.newPerDay":"2099-01-01T00:00:00.000Z","dayStartHour":"2099-01-01T00:00:00.000Z"}}`),
  });
  gh.files.set(`${DIR}/log-2026-11.json`, {
    sha: 'x2',
    json: { entries: [
      null, 'junk',
      { id: 'ok-1', type: 'review', card: 'ja:日', rating: 3, at: '2026-11-02T00:00:00.000Z', ms: 1, dev: 'ok' },
      { id: 'bad-1', type: 'review', at: '2026-11-02T00:00:01.000Z' },
      { id: 'later-1', type: 'note', at: '2026-11-02T00:00:02.000Z' },
    ] },
  });
  const db = await device({ entries: [entry('a-1', '2026-11-25T09:00:00.000Z')] });
  const r = await syncProfile({ db, client: gh.client(), profileKey: KEY, now });
  assert.equal(r.pulled, 1);
  assert.deepEqual(ids(await db.getEntries(KEY)), ['a-1', 'ok-1']);
  const p = await db.getProfile(KEY);
  assert.equal(p.settings.ja.newPerDay, 10);
  assert.deepEqual(p.settings.ja.learningSteps, ['1m', '10m']);
  assert.equal(p.settings.dayStartHour, 5);
  assert.equal(p.createdAt, '2026-01-01T00:00:00.000Z');
  assert.equal({}.polluted, undefined);
  // the server keeps entries this version cannot read, and gets a valid profile back
  assert.deepEqual(gh.entriesOf(`${DIR}/log-2026-11.json`), ['ok-1', 'bad-1', 'later-1', 'a-1']);
  assert.equal(gh.files.get(`${DIR}/profile.json`).json.settings.ja.newPerDay, 10);
});

// --- status strings ------------------------------------------------------------------------

test('the status line strings', () => {
  const base = { status: 'idle', waiting: 0, lastSync: null, error: null };
  assert.equal(syncLabel({ ...base, status: 'off' }, NOW), 'Sync off');
  assert.equal(syncLabel({ ...base, status: 'off', error: 'auth' }, NOW), 'Sync off');
  assert.equal(syncLabel({ ...base, lastSync: '2026-11-26T11:59:30.000Z' }, NOW), 'Synced just now');
  assert.equal(syncLabel({ ...base, lastSync: '2026-11-26T12:00:30.000Z' }, NOW), 'Synced just now');
  assert.equal(syncLabel({ ...base, lastSync: '2026-11-26T11:58:00.000Z' }, NOW), 'Synced 2 min ago');
  assert.equal(syncLabel({ ...base, status: 'syncing', lastSync: '2026-11-26T11:58:00.000Z' }, NOW), 'Synced 2 min ago');
  assert.equal(syncLabel({ ...base, error: 'offline', waiting: 23 }, NOW), 'Offline: 23 answers waiting');
  assert.equal(syncLabel({ ...base, error: 'offline', waiting: 1 }, NOW), 'Offline: 1 answer waiting');
  assert.equal(syncLabel({ ...base, error: 'auth' }, NOW), 'Sync problem: token expired, tap to fix');
  assert.equal(syncLabel({ ...base, error: 'notfound' }, NOW), 'Sync problem: repo not found');
  assert.equal(syncLabel({ ...base, error: 'http' }, NOW), 'Sync problem: try again later');
  assert.equal(syncLabel({ ...base, error: 'conflict' }, NOW), 'Sync problem: try again later');
});

test('test results read in plain words', () => {
  assert.equal(testText('ok'), 'Connected — the repo is reachable');
  assert.equal(testText('auth'), 'The token was rejected');
  assert.equal(testText('notfound'), "Repo not found, or the token can't see it");
  assert.equal(testText('offline'), 'No internet connection');
  assert.equal(testText('http'), 'Sync problem: try again later');
});

// --- the manager and the store --------------------------------------------------------------

test('without a token the status is Sync off', async () => {
  const { db, store } = await studying();
  assert.equal(label(store), 'Sync off');
  const sync = createSyncManager({ store, db, getClient: async () => null, now });
  await sync.trigger('open');
  assert.equal(store.get().sync.status, 'off');
  assert.equal(label(store), 'Sync off');
});

test('pulled entries change the active profile\'s states', async () => {
  const gh = fakeGitHub();
  const phone = await device({ entries: [entry('p-1', '2026-11-25T09:00:00.000Z')] });
  await syncProfile({ db: phone, client: gh.client(), profileKey: KEY, now });

  const { db, store } = await studying();
  await store.actions.answer('ja:一', RATING.good, 800);
  assert.equal(store.get().states.has('ja:日'), false);
  assert.equal(store.get().sync.waiting, 1);

  const sync = createSyncManager({ store, db, getClient: async () => gh.client(), now });
  await sync.trigger('manual');
  const s = store.get();
  assert.equal(s.states.get('ja:日').reps, 1);
  assert.equal(s.states.get('ja:一').reps, 1);
  assert.equal(s.entries.length, 2);
  assert.equal(s.sync.waiting, 0);
  assert.equal(s.sync.error, null);
  assert.equal(s.sync.lastSync, NOW.toISOString());
  assert.equal(label(store), 'Synced just now');
  assert.deepEqual(gh.entriesOf(`${DIR}/log-2026-11.json`).length, 2);
});

test('a sync for a profile that is not active leaves the active state alone', async () => {
  const gh = fakeGitHub();
  const olaDir = 'profiles/ola-0001';
  gh.files.set(`${olaDir}/log-2026-11.json`, { sha: 'o1', json: { entries: [entry('o-1', '2026-11-25T09:00:00.000Z')] } });

  const { db, store } = await studying('Ola', '0001');
  await store.actions.addProfile('Kacper', '1234');
  await store.actions.answer('ja:日', RATING.good, 800);
  const before = store.get();

  const sync = createSyncManager({ store, db, getClient: async () => gh.client(), now });
  await sync.trigger('manual');
  assert.deepEqual(ids(await db.getEntries('ola-0001')), ['o-1']);
  const after = store.get();
  assert.equal(after.profile, before.profile);
  assert.equal(after.entries, before.entries);
  assert.equal(after.states, before.states);

  assert.equal(await store.reloadProfile('ola-0001'), false);
  assert.equal(store.get().entries, before.entries);

  await store.actions.selectProfile('ola-0001');
  assert.equal(store.get().states.get('ja:日').reps, 1);
});

test('Review Focus 3: a 401 says the token expired, and studying goes on', async () => {
  const { db, store } = await studying();
  let open;
  const gate = new Promise((r) => { open = r; });
  const client = {
    async listDir() { await gate; throw new SyncError('auth', 401); },
    async getJson() { throw new SyncError('auth', 401); },
    async putJson() { throw new SyncError('auth', 401); },
    async test() { return { ok: false, kind: 'auth' }; },
  };
  const sync = createSyncManager({ store, db, getClient: async () => client, now });
  const run = sync.trigger('manual');
  await sleep(5);
  assert.equal(store.get().sync.status, 'syncing');
  // the sync is still waiting on the network: answering is not held up
  const first = await store.actions.answer('ja:日', RATING.good, 900);
  assert.equal(first.ok, true);
  open();
  await run;
  assert.equal(store.get().sync.error, 'auth');
  assert.equal(label(store), 'Sync problem: token expired, tap to fix');
  const second = await store.actions.answer('ja:一', RATING.good, 900);
  assert.equal(second.ok, true);
  assert.equal(store.get().sync.waiting, 2);
  assert.equal((await db.unsynced(KEY)).length, 2);
});

test('Review Focus 3: a missing repo says repo not found', async () => {
  const { db, store } = await studying();
  // the real client lists a missing repo as empty; the first upload then gets a 404
  const missing = {
    async listDir() { return []; },
    async getJson() { return null; },
    async putJson() { throw new SyncError('http', 404); },
    async test() { return { ok: false, kind: 'notfound' }; },
  };
  let client = missing;
  const sync = createSyncManager({ store, db, getClient: async () => client, now });
  await sync.trigger('manual');
  assert.equal(label(store), 'Sync problem: repo not found');

  client = { ...missing, async listDir() { throw new SyncError('notfound', 404); } };
  await sync.trigger('manual');
  assert.equal(label(store), 'Sync problem: repo not found');

  // and the Test button
  client = { ...missing, async test() { return { ok: false, kind: 'notfound' }; } };
  store.setSync({ error: null });
  const r = await sync.test();
  assert.deepEqual(r, { ok: false, kind: 'notfound' });
  assert.equal(testText(r.kind), "Repo not found, or the token can't see it");
  assert.equal(label(store), 'Sync problem: repo not found');
});

test('offline: the status counts the answers waiting', async () => {
  const { db, store } = await studying();
  const offline = async () => { throw new SyncError('offline'); };
  const client = { listDir: offline, getJson: offline, putJson: offline, test: async () => ({ ok: false, kind: 'offline' }) };
  const sync = createSyncManager({ store, db, getClient: async () => client, now });
  await store.actions.answer('ja:日', RATING.good, 900);
  await store.actions.answer('ja:一', RATING.again, 900);
  await sync.trigger('manual');
  assert.equal(label(store), 'Offline: 2 answers waiting');
  await store.actions.answer('ja:一', RATING.good, 900);
  assert.equal(label(store), 'Offline: 3 answers waiting');
});

test('any other exception counts as an http problem, never offline, and never rejects', async () => {
  const { db, store } = await studying();
  let getClient = async () => ({
    async listDir() { throw new TypeError('Failed to fetch'); },
  });
  const sync = createSyncManager({ store, db, getClient: () => getClient(), now });
  await sync.trigger('manual');
  assert.equal(store.get().sync.error, 'http');
  assert.equal(label(store), 'Sync problem: try again later');

  getClient = async () => { throw new Error('broken'); };
  await sync.trigger('manual');
  assert.equal(store.get().sync.error, 'http');
  assert.notEqual(store.get().sync.status, 'off');

  getClient = async () => ({ async listDir() { return [{ name: 'log-2026-11.json', path: 'x', sha: 's' }]; }, async getJson() { return { sha: 's', json: { entries: 7 } }; }, async putJson() { throw new RangeError('odd'); } });
  await sync.trigger('manual');
  assert.equal(store.get().sync.error, 'http');
});

test('the manager runs one sync at a time: 3 rapid triggers make at most 2 runs', async () => {
  const gh = fakeGitHub();
  const { db, store } = await studying();
  let runs = 0;
  let active = 0;
  let overlap = false;
  const getClient = async () => {
    runs++;
    const c = gh.client();
    return {
      ...c,
      async listDir(dir) {
        active++;
        if (active > 1) overlap = true;
        await sleep(10);
        active--;
        return c.listDir(dir);
      },
    };
  };
  const sync = createSyncManager({ store, db, getClient, now });
  await Promise.all([sync.trigger('open'), sync.trigger('visible'), sync.trigger('manual')]);
  assert.equal(runs, 2);
  assert.equal(overlap, false);
  await sync.trigger('manual');
  assert.equal(runs, 3);
  sync.stop();
  await sync.trigger('manual');
  assert.equal(runs, 3, 'a stopped manager does nothing');
});

test('every 20 answers and the end of a session trigger a sync', async () => {
  const { db, store } = await studying();
  const sync = createSyncManager({ store, db, getClient: async () => null, now });
  const reasons = [];
  store.attachSync({ ...sync, trigger: (r) => { reasons.push(r); return sync.trigger(r); } });
  for (let i = 0; i < 19; i++) await store.actions.answer('ja:日', RATING.good, 500);
  assert.deepEqual(reasons, []);
  await store.actions.answer('ja:日', RATING.good, 500);
  assert.deepEqual(reasons, ['answers']);
  for (let i = 0; i < 20; i++) await store.actions.answer('ja:一', RATING.good, 500);
  assert.deepEqual(reasons, ['answers', 'answers']);
  store.actions.endSession();
  await store.actions.syncNow();
  assert.deepEqual(reasons, ['answers', 'answers', 'session-end', 'manual']);
});

test('adding a profile that is in the repo says Welcome back and lands with its progress', async () => {
  const gh = fakeGitHub();
  const phone = await device({
    createdAt: '2026-11-01T08:00:00.000Z',
    entries: [entry('p-1', '2026-11-25T09:00:00.000Z'), entry('p-2', '2026-11-25T09:01:00.000Z', 'ja:一')],
  });
  await syncProfile({ db: phone, client: gh.client(), profileKey: KEY, now });

  const db = await fresh();
  const store = createStore({ db, now, data: DATA });
  await store.init();
  createSyncManager({ store, db, getClient: async () => gh.client(), now });
  const r = await store.actions.addProfile('kacper', '1234');
  assert.equal(r.ok, true);
  assert.equal(r.existed, false);
  assert.equal(r.welcome, 'Kacper');
  const s = store.get();
  assert.equal(s.welcome, 'Kacper');
  assert.equal(s.profile.name, 'Kacper');
  assert.equal(s.profile.createdAt, '2026-11-01T08:00:00.000Z');
  assert.deepEqual(ids(s.entries), ['p-1', 'p-2']);
  assert.equal(s.states.get('ja:日').reps, 1);
  assert.equal(s.sync.waiting, 0);
  assert.deepEqual(s.profiles.map((p) => p.name), ['Kacper']);

  store.actions.clearWelcome();
  assert.equal(store.get().welcome, null);
});

test('a profile that is not in the repo, or added offline, is created here and merged later', async () => {
  const gh = fakeGitHub();
  const { db, store } = await studying('Ola', '0001');
  createSyncManager({ store, db, getClient: async () => gh.client(), now });
  const ola = await store.actions.addProfile('Ola', '0002');
  assert.equal(ola.welcome, null);
  assert.equal(store.get().welcome, null);

  const phone = await device({ entries: [entry('p-1', '2026-11-25T09:00:00.000Z')] });
  await syncProfile({ db: phone, client: gh.client(), profileKey: KEY, now });

  const db2 = await fresh();
  const store2 = createStore({ db: db2, now, data: DATA });
  await store2.init();
  const offline = async () => { throw new SyncError('offline'); };
  let client = { listDir: offline, getJson: offline, putJson: offline };
  const sync = createSyncManager({ store: store2, db: db2, getClient: async () => client, now });
  const r = await store2.actions.addProfile('Kacper', '1234');
  assert.equal(r.ok, true);
  assert.equal(r.welcome, null);
  assert.equal(store2.get().profile.key, KEY);
  assert.equal(store2.get().sync.error, 'offline');
  assert.deepEqual(store2.get().entries, []);

  client = gh.client();
  await sync.trigger('visible');
  assert.deepEqual(ids(store2.get().entries), ['p-1']);
  assert.equal(label(store2), 'Synced just now');
});

test('connect trims and checks the token, keeps it out of the state, and disconnect clears it', async () => {
  const gh = fakeGitHub();
  const { db, store } = await studying();
  const seen = [];
  const makeClient = ({ token, repo }) => { seen.push({ token, repo }); return gh.client(); };
  const sync = createSyncManager({ store, db, getClient: () => clientFromMeta(db, makeClient), makeClient, now });

  for (const bad of ['', '   ', 'github pat', 'tökén', 'abc def']) {
    const r = await sync.connect({ token: bad, repo: '' });
    assert.equal(r.ok, false, JSON.stringify(bad));
    assert.equal(r.error, TOKEN_ERROR);
  }
  assert.equal(await db.getMeta('token'), undefined);
  assert.deepEqual(seen, []);

  const r = await sync.connect({ token: '  github_pat_ABC123  ', repo: '' });
  assert.deepEqual(r, { ok: true, saved: true, kind: 'ok' });
  assert.equal(await db.getMeta('token'), 'github_pat_ABC123');
  assert.equal(await db.getMeta('repo'), DEFAULT_REPO);
  assert.deepEqual(seen[0], { token: 'github_pat_ABC123', repo: DEFAULT_REPO });
  await sync.trigger('manual');
  const s = store.get();
  assert.equal(s.sync.repo, DEFAULT_REPO);
  assert.equal(label(store), 'Synced just now');
  assert.ok(!JSON.stringify(s.sync).includes('ABC123'));
  assert.ok(!JSON.stringify(s.profile).includes('ABC123'));
  assert.ok(gh.files.has(`${DIR}/profile.json`));
  assert.ok(!JSON.stringify([...gh.files.values()]).includes('ABC123'));

  // a new repo with the stored token
  assert.equal((await sync.connect({ token: null, repo: 'Frelek/other' })).saved, true);
  assert.equal(await db.getMeta('repo'), 'Frelek/other');
  assert.equal(await db.getMeta('token'), 'github_pat_ABC123');
  assert.equal((await sync.connect({ token: null, repo: 'not a repo' })).ok, false);

  await sync.disconnect();
  assert.equal(await db.getMeta('token'), null);
  assert.equal(store.get().sync.status, 'off');
  assert.equal(label(store), 'Sync off');
  assert.equal(await clientFromMeta(db, makeClient), null);
});

test('disconnecting while a sync is starting leaves the status on Sync off', async () => {
  const gh = fakeGitHub();
  const { db, store } = await studying();
  await db.setMeta('token', 'github_pat_X');
  let open;
  const gate = new Promise((r) => { open = r; });
  const sync = createSyncManager({ store, db, getClient: async () => { await gate; return gh.client(); }, now });
  store.setSync({ status: 'idle' });
  const run = sync.trigger('manual');
  await sync.disconnect();
  open();
  await run;
  assert.equal(store.get().sync.status, 'off');
  assert.equal(label(store), 'Sync off');
});

test('connect does not save a token that is rejected or cannot see the repo', async () => {
  const { db, store } = await studying();
  let kind = 'auth';
  const makeClient = () => ({ async test() { return { ok: false, kind }; } });
  const sync = createSyncManager({ store, db, getClient: () => clientFromMeta(db, makeClient), makeClient, now });
  assert.deepEqual(await sync.connect({ token: 'github_pat_X', repo: '' }), { ok: false, saved: false, kind: 'auth' });
  kind = 'notfound';
  assert.deepEqual(await sync.connect({ token: 'github_pat_X', repo: '' }), { ok: false, saved: false, kind: 'notfound' });
  assert.equal(await db.getMeta('token'), undefined);
  assert.equal(store.get().sync.status, 'off');

  // offline: kept, so the next sync can use it
  kind = 'offline';
  assert.deepEqual(await sync.connect({ token: 'github_pat_X', repo: '' }), { ok: false, saved: true, kind: 'offline' });
  assert.equal(await db.getMeta('token'), 'github_pat_X');
  await sync.trigger('manual');
});

test('the store starts with the saved connection, and the client keeps the token out of the URL', async () => {
  const db = await fresh();
  const store = createStore({ db, now });
  await store.init();
  assert.equal(store.get().sync.status, 'off');
  assert.equal(await clientFromMeta(db), null);

  await db.setMeta('token', 'github_pat_SECRET');
  const again = createStore({ db, now });
  await again.init();
  assert.equal(again.get().sync.status, 'idle');
  assert.equal(again.get().sync.repo, null);
  assert.ok(!JSON.stringify(again.get().sync).includes('SECRET'));

  const calls = [];
  const fetch = async (url, init) => {
    calls.push({ url, init });
    return { status: 200, ok: true, json: async () => ({}) };
  };
  const client = await clientFromMeta(db, (o) => githubClient({ ...o, fetch }));
  assert.deepEqual(await client.test(), { ok: true });
  assert.equal(calls[0].url, `https://api.github.com/repos/${DEFAULT_REPO}`);
  assert.equal(calls[0].init.headers.Authorization, 'Bearer github_pat_SECRET');
  assert.ok(calls[0].init.signal, 'requests can time out');

  await db.setMeta('repo', 'Frelek/other');
  const other = await clientFromMeta(db, (o) => githubClient({ ...o, fetch }));
  await other.test();
  assert.equal(calls[1].url, 'https://api.github.com/repos/Frelek/other');
});
