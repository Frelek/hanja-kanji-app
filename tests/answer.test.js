import 'fake-indexeddb/auto';
import test from 'node:test';
import assert from 'node:assert/strict';
import { openDb, deviceId } from '../src/store/db.js';
import { createStore, studyQueue } from '../src/state.js';
import { replay, RATING, STATE } from '../src/engine/fsrs.js';

const fresh = () => openDb('answer-' + Math.random().toString(36).slice(2));

// A clock that moves 10 s on every read, as a real study session does.
function clock(start = '2026-11-20T10:00:00.000Z') {
  let t = new Date(start).getTime();
  const now = () => new Date((t += 10e3));
  now.peek = () => new Date(t);
  return now;
}

const mk = (lang, ch, order, level, required = []) =>
  ({ id: `${lang}:${ch}`, char: ch, level, order, required, meanings: [], parts: [], words: [] });
const DATA = {
  ja: { levels: [{ id: 'N5', count: 3 }], chars: [mk('ja', '日', 0, 'N5'), mk('ja', '一', 1, 'N5'), mk('ja', '人', 2, 'N5')] },
  ko: { levels: [{ id: '8급', count: 2 }], chars: [mk('ko', '人', 0, '8급'), mk('ko', '學', 1, '8급')] },
};

async function setup({ wrap } = {}) {
  const db = await fresh();
  const now = clock();
  const store = createStore({ db: wrap ? wrap(db) : db, now, data: DATA });
  await store.init();
  await store.actions.addProfile('Kacper', '1234');
  return { db, store, now };
}

const settingsFor = (store) => (lang) => store.get().profile.settings[lang];

test('answer persists a review entry with the logged shape', async () => {
  const { db, store } = await setup();
  const dev = await deviceId(db);
  const before = Date.now();
  const r = await store.actions.answer('ja:日', RATING.good, 4200);
  assert.equal(r.ok, true);
  assert.equal(r.error, null);

  const stored = await db.getEntries('kacper-1234');
  assert.equal(stored.length, 1);
  const e = stored[0];
  assert.deepEqual(Object.keys(e).sort(), ['at', 'card', 'dev', 'id', 'ms', 'rating', 'type']);
  assert.equal(e.type, 'review');
  assert.equal(e.card, 'ja:日');
  assert.equal(e.rating, 3);
  assert.equal(e.ms, 4200);
  assert.equal(e.dev, dev);
  assert.equal(e.id, r.id);
  const [idDev, idMs, idN] = e.id.split('-');
  assert.equal(idDev, dev);
  assert.ok(Number(idMs) >= before && Number(idMs) <= Date.now());
  assert.match(idN, /^\d+$/);
  assert.ok(!Number.isNaN(new Date(e.at).getTime()));
  assert.equal(new Date(e.at).toISOString(), e.at);
});

test('answer updates the card, prevState and entries in the store', async () => {
  const { store } = await setup();
  const r = await store.actions.answer('ja:日', RATING.good, 1000);
  const s = store.get();
  assert.deepEqual(s.entries.map((e) => e.id), [r.id]);
  const card = s.states.get('ja:日');
  assert.equal(card.reps, 1);
  assert.equal(card.state, STATE.learning);
  assert.equal(s.prevState.get(r.id), STATE.new);
  assert.equal(s.canUndo, true);
});

test('incremental answers match a full replay of the log', async () => {
  const { db, store } = await setup();
  await store.actions.answer('ja:日', RATING.good, 1000);
  await store.actions.answer('ja:一', RATING.again, 1000);
  await store.actions.answer('ja:日', RATING.good, 1000);
  await store.actions.answer('ko:人', RATING.easy, 1000);
  const s = store.get();
  const { states, prevState } = replay(await db.getEntries('kacper-1234'), settingsFor(store));
  assert.deepEqual([...s.states.keys()].sort(), [...states.keys()].sort());
  for (const [id, card] of states) assert.deepEqual(s.states.get(id), card, id);
  assert.deepEqual([...s.prevState].sort(), [...prevState].sort());
  assert.equal(s.states.get('ja:日').reps, 2);
});

test('ids are unique within a session', async () => {
  const { store } = await setup();
  const ids = [];
  for (let i = 0; i < 12; i++) ids.push((await store.actions.answer('ja:日', RATING.good, 500)).id);
  assert.equal(new Set(ids).size, 12);
});

test('a failed write does not advance the card and reports an error', async () => {
  let fail = false;
  const { db, store } = await setup({
    wrap: (d) => ({
      ...d,
      async addEntries(key, entries) {
        if (fail) throw new Error('disk full');
        return d.addEntries(key, entries);
      },
    }),
  });
  await store.actions.answer('ja:日', RATING.good, 1000);
  const before = store.get();
  fail = true;
  const r = await store.actions.answer('ja:日', RATING.easy, 1000);
  assert.equal(r.ok, false);
  assert.equal(typeof r.error, 'string');
  assert.ok(r.error.length > 0);
  const s = store.get();
  assert.equal(s.entries.length, 1);
  assert.deepEqual(s.states.get('ja:日'), before.states.get('ja:日'));
  assert.equal(s.states.get('ja:日').reps, 1);
  assert.equal((await db.getEntries('kacper-1234')).length, 1);

  // Undo still targets the answer that was stored.
  fail = false;
  const u = await store.actions.undo();
  assert.equal(u.ok, true);
  assert.equal(u.card, 'ja:日');
  assert.equal(store.get().states.has('ja:日'), false);
});

test('undo appends an undo entry and restores the previous state', async () => {
  const { db, store } = await setup();
  await store.actions.answer('ja:日', RATING.good, 1000);
  const afterFirst = store.get().states.get('ja:日');
  const second = await store.actions.answer('ja:日', RATING.easy, 1000);
  assert.equal(store.get().states.get('ja:日').state, STATE.review);

  const r = await store.actions.undo();
  assert.deepEqual(r, { ok: true, error: null, card: 'ja:日' });
  const s = store.get();
  assert.deepEqual(s.states.get('ja:日'), afterFirst);
  assert.equal(s.prevState.has(second.id), false);

  const stored = await db.getEntries('kacper-1234');
  assert.equal(stored.length, 3);
  const u = stored.find((e) => e.type === 'undo');
  assert.deepEqual(Object.keys(u).sort(), ['at', 'dev', 'id', 'target', 'type']);
  assert.equal(u.target, second.id);
  assert.equal(u.dev, await deviceId(db));
  assert.deepEqual(s.entries.map((e) => e.id).sort(), stored.map((e) => e.id).sort());
});

test('undo walks back through the session, then has nothing left', async () => {
  const { db, store } = await setup();
  await store.actions.answer('ja:日', RATING.good, 1000);
  await store.actions.answer('ja:一', RATING.again, 1000);
  assert.equal((await store.actions.undo()).card, 'ja:一');
  assert.equal(store.get().states.has('ja:一'), false);
  assert.equal((await store.actions.undo()).card, 'ja:日');
  assert.equal(store.get().states.size, 0);
  assert.equal(store.get().canUndo, false);
  const none = await store.actions.undo();
  assert.deepEqual(none, { ok: false, error: null, card: null });
  assert.equal((await db.getEntries('kacper-1234')).length, 4);
});

test('undo only reaches answers given in the current session', async () => {
  const { db, store, now } = await setup();
  await store.actions.answer('ja:日', RATING.good, 1000);
  store.actions.startSession();
  assert.equal(store.get().canUndo, false);
  assert.equal((await store.actions.undo()).ok, false);

  // A new store on the same device (a reload) cannot undo the old answer either.
  const again = createStore({ db, now, data: DATA });
  await again.init();
  assert.equal(again.get().states.get('ja:日').reps, 1);
  assert.equal((await again.actions.undo()).ok, false);
  assert.equal((await db.getEntries('kacper-1234')).length, 1);
});

test('a failed undo write keeps the answer and lets undo be tried again', async () => {
  let fail = false;
  const { db, store } = await setup({
    wrap: (d) => ({
      ...d,
      async addEntries(key, entries) {
        if (fail) throw new Error('disk full');
        return d.addEntries(key, entries);
      },
    }),
  });
  await store.actions.answer('ja:日', RATING.good, 1000);
  fail = true;
  const r = await store.actions.undo();
  assert.equal(r.ok, false);
  assert.equal(typeof r.error, 'string');
  assert.equal(store.get().states.get('ja:日').reps, 1);
  assert.equal(store.get().canUndo, true);
  fail = false;
  assert.equal((await store.actions.undo()).ok, true);
  assert.equal(store.get().states.has('ja:日'), false);
  assert.equal((await db.getEntries('kacper-1234')).length, 2);
});

test('switching profile clears the undo history', async () => {
  const { store } = await setup();
  await store.actions.answer('ja:日', RATING.good, 1000);
  await store.actions.addProfile('Kim', '0042');
  assert.equal(store.get().canUndo, false);
  assert.equal((await store.actions.undo()).ok, false);
});

test('answer and undo run in call order', async () => {
  const { store } = await setup();
  const [a, u] = await Promise.all([
    store.actions.answer('ja:日', RATING.good, 1000),
    store.actions.undo(),
  ]);
  assert.equal(a.ok, true);
  assert.equal(u.card, 'ja:日');
  assert.equal(store.get().states.has('ja:日'), false);
});

test('answer rejects an unknown rating and needs a profile', async () => {
  const { store } = await setup();
  await assert.rejects(store.actions.answer('ja:日', 5, 1000), /rating/i);
  await store.actions.selectProfile(null);
  await assert.rejects(store.actions.answer('ja:日', 3, 1000), /profile/i);
});

test('studyQueue counts one language and ignores the other language’s answers', async () => {
  const { db, store, now } = await setup();
  let q = studyQueue(store.get(), now.peek());
  assert.deepEqual(q.counts, { new: 3, learning: 0, review: 0 });

  // A Japanese limit of 2 new cards a day; Korean answers today must not use it up.
  const p = await db.getProfile('kacper-1234');
  await db.putProfile({ ...p, settings: { ...p.settings, ja: { ...p.settings.ja, newPerDay: 2 } } });
  await store.actions.selectProfile('kacper-1234');
  await store.actions.answer('ko:人', RATING.good, 1000);
  await store.actions.answer('ko:學', RATING.good, 1000);
  q = studyQueue(store.get(), now.peek());
  assert.deepEqual(q.counts, { new: 2, learning: 0, review: 0 });

  await store.actions.answer('ja:日', RATING.again, 1000);
  q = studyQueue(store.get(), now.peek());
  assert.deepEqual(q.counts, { new: 1, learning: 1, review: 0 });
  assert.equal(q.learning[0].id, 'ja:日');
  assert.equal(q.learning[0].char, DATA.ja.chars[0]);

  await store.actions.setLang('ko');
  q = studyQueue(store.get(), now.peek());
  assert.deepEqual(q.counts, { new: 0, learning: 2, review: 0 });
});
