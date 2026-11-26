import 'fake-indexeddb/auto';
import test from 'node:test';
import assert from 'node:assert/strict';
import { openDb, defaultSettings } from '../src/store/db.js';
import { createStore } from '../src/state.js';
import { NAME_ERROR, TAG_ERROR } from '../src/ui/profile-input.js';
import { STATE } from '../src/engine/fsrs.js';

const fresh = () => openDb('store-' + Math.random().toString(36).slice(2));
const NOW = new Date('2026-11-20T10:00:00.000Z');
const now = () => NOW;

test('a fresh device has no profile, Japanese, and sync off', async () => {
  const store = createStore({ db: await fresh(), now });
  await store.init();
  const s = store.get();
  assert.deepEqual(s.profiles, []);
  assert.equal(s.profile, null);
  assert.equal(s.lang, 'ja');
  assert.deepEqual(s.data, { ja: null, ko: null });
  assert.equal(s.sync.status, 'off');
  assert.equal(s.states.size, 0);
});

test('addProfile rejects bad input with the exact errors and stores nothing', async () => {
  const db = await fresh();
  const store = createStore({ db, now });
  await store.init();
  assert.deepEqual(await store.actions.addProfile('Ka cper', '1234'), { ok: false, error: NAME_ERROR });
  assert.deepEqual(await store.actions.addProfile('Kacper', '12a4'), { ok: false, error: TAG_ERROR });
  assert.deepEqual(await db.listProfiles(), []);
  assert.equal(store.get().profile, null);
});

test('addProfile creates, selects and remembers the profile', async () => {
  const db = await fresh();
  const store = createStore({ db, now });
  await store.init();
  const r = await store.actions.addProfile('Kacper', '1234');
  assert.equal(r.ok, true);
  assert.equal(r.key, 'kacper-1234');
  const p = store.get().profile;
  assert.deepEqual(p, {
    key: 'kacper-1234', name: 'Kacper', tag: '1234', createdAt: NOW.toISOString(),
    settings: defaultSettings(), settingsUpdatedAt: {},
  });
  assert.deepEqual(store.get().profiles.map((x) => x.key), ['kacper-1234']);
  assert.equal(await db.getMeta('activeProfile'), 'kacper-1234');

  const again = createStore({ db, now });
  await again.init();
  assert.equal(again.get().profile.key, 'kacper-1234');
});

test('kacper#1234 is the same profile as Kacper#1234 and keeps the first spelling', async () => {
  const db = await fresh();
  const store = createStore({ db, now });
  await store.init();
  await store.actions.addProfile('Kacper', '1234');
  const r = await store.actions.addProfile('kacper', '1234');
  assert.equal(r.ok, true);
  assert.equal(r.existed, true);
  assert.equal(store.get().profile.name, 'Kacper');
  assert.equal((await db.listProfiles()).length, 1);
});

test('a tag like 0042 stays a string', async () => {
  const store = createStore({ db: await fresh(), now });
  await store.init();
  await store.actions.addProfile('Łucja', '0042');
  assert.equal(store.get().profile.tag, '0042');
  assert.equal(store.get().profile.key, 'łucja-0042');
});

test('setLang persists and rejects unknown languages', async () => {
  const db = await fresh();
  const store = createStore({ db, now });
  await store.init();
  await store.actions.setLang('ko');
  assert.equal(store.get().lang, 'ko');
  assert.equal(await db.getMeta('lang'), 'ko');
  await assert.rejects(store.actions.setLang('zh'), /Unknown language/);
  const again = createStore({ db, now });
  await again.init();
  assert.equal(again.get().lang, 'ko');
});

test('selectProfile loads the log and replays it into states', async () => {
  const db = await fresh();
  const store = createStore({ db, now });
  await store.init();
  await store.actions.addProfile('Kim', '0042');
  await store.actions.addProfile('Kacper', '1234');
  const at = '2026-11-19T09:00:00.000Z';
  await db.addEntries('kim-0042', [
    { id: 'e1', type: 'review', card: 'ja:休', rating: 3, at, ms: 900, dev: 'd' },
    { id: 'e2', type: 'review', card: 'ko:人', rating: 3, at, ms: 900, dev: 'd' },
  ]);
  await store.actions.selectProfile('kim-0042');
  const s = store.get();
  assert.equal(s.profile.key, 'kim-0042');
  assert.equal(s.entries.length, 2);
  assert.equal(s.states.get('ja:休').reps, 1);
  assert.equal(s.states.get('ko:人').reps, 1);
  assert.equal(s.prevState.get('e1'), STATE.new);
  assert.equal(await db.getMeta('activeProfile'), 'kim-0042');
  assert.deepEqual(s.profiles.map((p) => p.name), ['Kacper', 'Kim']);
});

test('selectProfile(null) returns to the picker', async () => {
  const db = await fresh();
  const store = createStore({ db, now });
  await store.init();
  await store.actions.addProfile('Kacper', '1234');
  await store.actions.selectProfile(null);
  assert.equal(store.get().profile, null);
  assert.equal(store.get().states.size, 0);
  const again = createStore({ db, now });
  await again.init();
  assert.equal(again.get().profile, null);
});

test('a remembered profile that is gone shows the picker', async () => {
  const db = await fresh();
  await db.setMeta('activeProfile', 'ghost-0000');
  const store = createStore({ db, now });
  await store.init();
  assert.equal(store.get().profile, null);
});

test('subscribe gets each new state until unsubscribed', async () => {
  const store = createStore({ db: await fresh(), now });
  await store.init();
  const seen = [];
  const off = store.subscribe((s) => seen.push(s.lang));
  await store.actions.setLang('ko');
  off();
  await store.actions.setLang('ja');
  assert.deepEqual(seen, ['ko']);
});

test('later-task actions are declared and not implemented yet', async () => {
  const store = createStore({ db: await fresh(), now });
  for (const name of ['answer', 'undo', 'updateSettings', 'resetLang']) {
    assert.equal(typeof store.actions[name], 'function');
    assert.throws(() => store.actions[name](), /not implemented/);
  }
});
