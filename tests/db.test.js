import 'fake-indexeddb/auto';
import test from 'node:test';
import assert from 'node:assert/strict';
import { openDb, defaultSettings, deviceId, cleanupLegacyStorage } from '../src/store/db.js';

const fresh = () => openDb('test-' + Math.random().toString(36).slice(2));
const e = (id, extra = {}) => ({ id, type: 'review', card: 'ja:休', rating: 3, at: '2026-01-01T00:00:00.000Z', ms: 900, dev: 'd', ...extra });

test('addEntries ignores existing ids and returns inserted count', async () => {
  const db = await fresh();
  assert.equal(await db.addEntries('a-0001', [e('x1'), e('x2')]), 2);
  assert.equal(await db.addEntries('a-0001', [e('x1', { rating: 1 }), e('x3')]), 1);
  const all = await db.getEntries('a-0001');
  assert.equal(all.length, 3);
  assert.equal(all.find((x) => x.id === 'x1').rating, 3);
  assert.ok(!('profile' in all[0]) && !('synced' in all[0]));
});

test('entries are scoped per profile', async () => {
  const db = await fresh();
  await db.addEntries('a-0001', [e('x1')]);
  await db.addEntries('b-0002', [e('y1')]);
  assert.deepEqual((await db.getEntries('b-0002')).map((x) => x.id), ['y1']);
});

test('unsynced then markSynced yields empty', async () => {
  const db = await fresh();
  await db.addEntries('a-0001', [e('x1'), e('x2')]);
  const u = await db.unsynced('a-0001');
  assert.equal(u.length, 2);
  assert.ok(!('synced' in u[0]));
  await db.markSynced(['x1', 'x2']);
  assert.deepEqual(await db.unsynced('a-0001'), []);
  assert.equal((await db.getEntries('a-0001')).length, 2);
});

test('profiles round-trip', async () => {
  const db = await fresh();
  const p = { key: 'kim-0042', name: 'Kim', tag: '0042', createdAt: 'x', settings: defaultSettings(), settingsUpdatedAt: {} };
  await db.putProfile(p);
  assert.deepEqual(await db.getProfile('kim-0042'), p);
  assert.equal((await db.listProfiles()).length, 1);
  assert.equal(await db.getProfile('nope'), undefined);
});

test('meta round-trip and defaultSettings shape', async () => {
  const db = await fresh();
  await db.setMeta('k', { a: 1 });
  assert.deepEqual(await db.getMeta('k'), { a: 1 });
  const s = defaultSettings();
  assert.equal(s.dayStartHour, 4);
  assert.equal(s.appearance, 'auto');
  assert.deepEqual(s.ja, { newPerDay: 10, maxReviews: 200, learningSteps: ['1m', '10m'], relearningSteps: ['10m'], retention: 0.9 });
  assert.deepEqual(s.ko, s.ja);
  assert.notEqual(s.ja, s.ko);
});

test('deviceId is stable, 8 base36 chars', async () => {
  const db = await fresh();
  const a = await deviceId(db);
  assert.match(a, /^[0-9a-z]{8}$/);
  assert.equal(await deviceId(db), a);
});

test('cleanupLegacyStorage removes legacy prefixes only', () => {
  const m = new Map([['hanja_learned', '1'], ['kanji_srs_cards', '2'], ['hk_active_mode', '3'], ['other', '4']]);
  const storage = {
    get length() { return m.size; },
    key: (i) => [...m.keys()][i] ?? null,
    removeItem: (k) => m.delete(k),
  };
  const removed = cleanupLegacyStorage(storage);
  assert.deepEqual(removed.sort(), ['hanja_learned', 'hk_active_mode', 'kanji_srs_cards']);
  assert.deepEqual([...m.keys()], ['other']);
});
