import 'fake-indexeddb/auto';
import test from 'node:test';
import assert from 'node:assert/strict';
import { openDb } from '../src/store/db.js';
import { createStore } from '../src/state.js';
import { RATING } from '../src/engine/fsrs.js';

const fresh = () => openDb('state-' + Math.random().toString(36).slice(2));

function clock(start = '2026-11-20T10:00:00.000Z') {
  let t = new Date(start).getTime();
  return () => new Date((t += 10e3));
}

const mk = (lang, ch, order, level) =>
  ({ id: `${lang}:${ch}`, char: ch, level, order, required: [], meanings: [], parts: [], words: [] });
const DATA = {
  ja: { levels: [{ id: 'N5', count: 2 }], chars: [mk('ja', '日', 0, 'N5'), mk('ja', '一', 1, 'N5')] },
  ko: { levels: [{ id: '8급', count: 1 }], chars: [mk('ko', '人', 0, '8급')] },
};

async function setup() {
  const db = await fresh();
  const store = createStore({ db, now: clock(), data: DATA });
  await store.init();
  await store.actions.addProfile('Kacper', '1234');
  return { db, store };
}

test('updateSettings stores the value and stamps settingsUpdatedAt', async () => {
  const { db, store } = await setup();
  const r = await store.actions.updateSettings('ja.newPerDay', 15);
  assert.deepEqual(r, { ok: true, error: null });
  const p = store.get().profile;
  assert.equal(p.settings.ja.newPerDay, 15);
  assert.equal(p.settings.ko.newPerDay, 10);
  assert.ok(!Number.isNaN(new Date(p.settingsUpdatedAt['ja.newPerDay']).getTime()));
  const stored = await db.getProfile('kacper-1234');
  assert.equal(stored.settings.ja.newPerDay, 15);
  assert.equal(stored.settingsUpdatedAt['ja.newPerDay'], p.settingsUpdatedAt['ja.newPerDay']);
});

test('updateSettings handles shared and top-level paths', async () => {
  const { store } = await setup();
  assert.equal((await store.actions.updateSettings('dayStartHour', 0)).ok, true);
  assert.equal((await store.actions.updateSettings('appearance', 'dark')).ok, true);
  assert.equal((await store.actions.updateSettings('ko.learningSteps', ['2m', '1h'])).ok, true);
  const p = store.get().profile;
  assert.equal(p.settings.dayStartHour, 0);
  assert.equal(p.settings.appearance, 'dark');
  assert.deepEqual(p.settings.ko.learningSteps, ['2m', '1h']);
});

test('invalid values are rejected and nothing is written', async () => {
  const { db, store } = await setup();
  const before = await db.getProfile('kacper-1234');
  const bad = [
    ['ja.newPerDay', 101], ['ja.newPerDay', -1], ['ja.newPerDay', 1.5], ['ja.newPerDay', '5'],
    ['ja.maxReviews', 10000], ['ja.retention', 0.79], ['ja.retention', 0.96],
    ['ja.learningSteps', []], ['ja.learningSteps', ['0m']], ['ja.learningSteps', ['10x']],
    ['ja.relearningSteps', 'abc'], ['dayStartHour', 24], ['dayStartHour', 1.5],
    ['appearance', 'sepia'], ['ja.nope', 1], ['bogus', 1], ['ja', 1],
  ];
  for (const [path, value] of bad) {
    const r = await store.actions.updateSettings(path, value);
    assert.equal(r.ok, false, `${path}=${JSON.stringify(value)}`);
    assert.equal(typeof r.error, 'string');
    assert.ok(r.error.length > 0);
  }
  assert.deepEqual(await db.getProfile('kacper-1234'), before);
  assert.deepEqual(store.get().profile, before);
});

test('a failed write returns ok:false and leaves state unchanged', async () => {
  const db = await fresh();
  let fail = false;
  const wrapped = new Proxy(db, {
    get: (t, k) => (k === 'putProfile' && fail ? async () => { throw new Error('disk'); } : t[k]),
  });
  const store = createStore({ db: wrapped, now: clock(), data: DATA });
  await store.init();
  await store.actions.addProfile('Kacper', '1234');
  const before = store.get().profile;
  fail = true;
  const r = await store.actions.updateSettings('ja.newPerDay', 20);
  assert.equal(r.ok, false);
  assert.equal(store.get().profile, before);
  assert.equal(store.get().profile.settings.ja.newPerDay, 10);
});

test('a retention change re-replays so due dates differ', async () => {
  const { store } = await setup();
  await store.actions.answer('ja:日', RATING.good, 1000);
  await store.actions.answer('ja:日', RATING.good, 1000);
  await store.actions.answer('ja:日', RATING.good, 1000);
  const due = () => store.get().states.get('ja:日').due.getTime();
  const d1 = due();
  assert.equal((await store.actions.updateSettings('ja.retention', 0.8)).ok, true);
  const d2 = due();
  assert.notEqual(d1, d2);
  assert.ok(d2 > d1, 'lower retention means longer intervals');
});

test('resetLang drops that language and keeps the other', async () => {
  const { db, store } = await setup();
  await store.actions.answer('ja:日', RATING.good, 1000);
  await store.actions.answer('ko:人', RATING.good, 1000);
  assert.ok(store.get().canUndo);
  const r = await store.actions.resetLang('ja');
  assert.deepEqual(r, { ok: true, error: null });
  const keys = [...store.get().states.keys()];
  assert.ok(!keys.some((k) => k.startsWith('ja:')));
  assert.ok(keys.some((k) => k.startsWith('ko:')));
  const stored = await db.getEntries('kacper-1234');
  const reset = stored.find((e) => e.type === 'reset');
  assert.equal(reset.lang, 'ja');
  assert.deepEqual(Object.keys(reset).sort(), ['at', 'dev', 'id', 'lang', 'type']);
  // The ja answer can no longer be undone; the ko one still can.
  assert.ok(store.get().canUndo);
  assert.equal((await store.actions.undo()).card, 'ko:人');
  assert.equal((await store.actions.undo()).ok, false);
});

test('resetLang with no prior reviews still works', async () => {
  const { store } = await setup();
  const r = await store.actions.resetLang('ko');
  assert.equal(r.ok, true);
  assert.equal(store.get().states.size, 0);
  assert.equal(store.get().entries.filter((e) => e.type === 'reset').length, 1);
});

test('resetLang rejects an unknown language', async () => {
  const { store } = await setup();
  const r = await store.actions.resetLang('zh');
  assert.equal(r.ok, false);
  assert.equal(store.get().entries.length, 0);
});
