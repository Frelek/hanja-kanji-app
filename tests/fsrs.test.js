import { test } from 'node:test';
import assert from 'node:assert/strict';
import { makeScheduler, newCard, formatInterval, replay, countedIds, RATING, STATE } from '../src/engine/fsrs.js';

const s = { retention: 0.9, learningSteps: ['1m', '10m'], relearningSteps: ['10m'] };
const settingsFor = () => s;
const now = new Date('2026-11-23T08:00:00Z');

test('new-card previews', () => {
  const p = makeScheduler(s).preview(newCard(now), now);
  assert.deepEqual([1, 2, 3, 4].map(r => p[r].label), ['1m', '6m', '10m', '9d']);
});

test('formatInterval', () => {
  assert.equal(formatInterval(30e3), '<1m');
  assert.equal(formatInterval(36e5 * 5), '5h');
  assert.equal(formatInterval(864e5 * 45), '2mo');
  assert.equal(formatInterval(864e5 * 800), '2.2y');
  assert.equal(formatInterval(864e5 * 365 * 12), '12y');
  assert.equal(formatInterval(6e4 * 10), '10m');
  assert.equal(formatInterval(864e5 * 9), '9d');
});

const rev = (id, card, rating, mins) => ({
  id, type: 'review', card, rating,
  at: new Date(now.getTime() + mins * 6e4).toISOString(), ms: 1000, dev: 'a',
});
const log = [
  rev('e01', 'ja:日', 3, 0), rev('e02', 'ja:日', 3, 20), rev('e03', 'ja:月', 1, 5),
  rev('e04', 'ko:日', 4, 7), rev('e05', 'ja:日', 2, 60 * 24 * 3), rev('e06', 'ko:日', 3, 60 * 24 * 9),
];
const snap = r => JSON.stringify([...r.states].sort());

test('replay is order-independent and deterministic', () => {
  const shuffled = [log[3], log[5], log[0], log[4], log[2], log[1]];
  const copy = shuffled.slice();
  const a = replay(log, settingsFor), b = replay(shuffled, settingsFor), c = replay(log, settingsFor);
  assert.equal(snap(a), snap(b));
  assert.equal(snap(a), snap(c));
  assert.deepEqual(shuffled, copy);
  assert.equal(a.states.size, 3);
});

test('reset drops earlier entries of that language only', () => {
  const reset = { id: 'e035', type: 'reset', lang: 'ja', at: new Date(now.getTime() + 30 * 6e4).toISOString(), dev: 'a' };
  const r = replay([...log, reset], settingsFor);
  assert.equal(r.states.has('ja:月'), false);
  assert.equal(r.states.get('ja:日').reps, 1);
  assert.equal(r.states.get('ko:日').reps, 2);
  assert.equal(replay([...log], settingsFor).states.get('ja:日').reps, 3);
});

test('undo removes its target review', () => {
  const undo = { id: 'e99', type: 'undo', target: 'e02', at: new Date(now.getTime() + 1e9).toISOString(), dev: 'a' };
  const r = replay([...log, undo], settingsFor);
  const without = replay(log.filter(e => e.id !== 'e02'), settingsFor);
  assert.equal(snap(r), snap(without));
  assert.equal(r.prevState.has('e02'), false);
});

test('prevState records the state before each review', () => {
  const r = replay(log, settingsFor);
  assert.equal(r.prevState.get('e01'), STATE.new);
  assert.equal(r.prevState.get('e02'), STATE.learning);
  assert.equal(RATING.good, 3);
});

test('countedIds equals the prevState key set, incl. undo and same-timestamp reset', () => {
  const t = m => new Date(now.getTime() + m * 6e4).toISOString();
  const R = (id, card, at) => ({ id, type: 'review', card, rating: 3, at, ms: 1, dev: 'a' });
  const resetAt = t(10);
  const entries = [
    R('a01', 'ja:a', t(0)), R('a02', 'ja:a', t(1)), R('a03', 'ko:a', t(2)),
    { id: 'u1', type: 'undo', target: 'a02', at: t(3), dev: 'a' },
    R('a04', 'ja:b', resetAt), // sorts before the reset: wiped
    { id: 'b05', type: 'reset', lang: 'ja', at: resetAt, dev: 'a' },
    R('c06', 'ja:c', resetAt), // sorts after the reset: survives
    R('a07', 'ja:d', t(11)),
  ];
  const ids = countedIds(entries);
  assert.deepEqual([...ids].sort(), [...replay(entries, settingsFor).prevState.keys()].sort());
  assert.deepEqual([...ids].sort(), ['a03', 'a07', 'c06']);
});
