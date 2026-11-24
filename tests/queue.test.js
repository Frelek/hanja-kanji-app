import { test } from 'node:test';
import assert from 'node:assert/strict';
import { replay, RATING, STATE } from '../src/engine/fsrs.js';
import {
  dayStart, introducedSet, isAvailable, buildQueue, nextItem, buildPractice, isLeech, NEW_EVERY,
} from '../src/engine/queue.js';

const SET = { newPerDay: 10, maxReviews: 200, learningSteps: ['1m', '10m'], relearningSteps: ['10m'], retention: 0.9, dayStartHour: 4 };
const settingsFor = () => SET;
const D = (y, m, d, hh = 0, mm = 0) => new Date(y, m - 1, d, hh, mm);
let n = 0;
const rev = (card, rating, at) => ({ id: 'e' + String(++n).padStart(5, '0'), type: 'review', card, rating, at: at.toISOString(), ms: 1000, dev: 'x' });
const mk = (id, order, required = [], level = 'N5') => ({ id, char: id.slice(3), level, order, required });
const run = (entries, chars, now, settings = SET) => {
  const { states, prevState } = replay(entries, settingsFor);
  return buildQueue({ chars, states, prevState, entries, settings, now });
};

test('dayStart: before 04:00 gives yesterday 04:00, at 04:00 gives today', () => {
  assert.equal(dayStart(D(2026, 3, 10, 3, 59)).getTime(), D(2026, 3, 9, 4).getTime());
  assert.equal(dayStart(D(2026, 3, 10, 4, 0)).getTime(), D(2026, 3, 10, 4).getTime());
  assert.equal(dayStart(D(2026, 3, 1, 2, 0), 4).getTime(), D(2026, 2, 28, 4).getTime());
});

test('introducedSet and isAvailable', () => {
  const states = new Map([['ja:a', { reps: 1 }], ['ja:b', { reps: 0 }]]);
  const set = introducedSet(states);
  assert.deepEqual([...set], ['ja:a']);
  assert.equal(isAvailable({ required: ['ja:a'] }, set), true);
  assert.equal(isAvailable({ required: ['ja:a', 'ja:b'] }, set), false);
  assert.equal(isAvailable({ required: [] }, set), true);
});

test('new-card limit: 10 introduced today leave fresh empty; a new day restores 10', () => {
  const chars = Array.from({ length: 25 }, (_, i) => mk('ja:c' + String(i).padStart(2, '0'), i));
  const t0 = D(2026, 3, 10, 9);
  const entries = chars.slice(0, 10).map((c, i) => rev(c.id, RATING.good, new Date(t0.getTime() + i * 1000)));
  const same = run(entries, chars, D(2026, 3, 10, 12));
  assert.equal(same.fresh.length, 0);
  assert.equal(same.counts.new, 0);
  const next = run(entries, chars, D(2026, 3, 11, 9));
  assert.equal(next.fresh.length, 10);
  assert.equal(next.fresh[0].id, 'ja:c10');
  assert.deepEqual(Object.keys(next.fresh[0]).sort(), ['char', 'id']);
});

test('new cards answered after midnight but before 04:00 count for the previous day', () => {
  const chars = Array.from({ length: 25 }, (_, i) => mk('ja:c' + String(i).padStart(2, '0'), i));
  const entries = chars.slice(0, 10).map((c, i) => rev(c.id, RATING.good, D(2026, 3, 11, 1, i)));
  assert.equal(run(entries, chars, D(2026, 3, 11, 3, 30)).fresh.length, 0);
  assert.equal(run(entries, chars, D(2026, 3, 11, 4, 30)).fresh.length, 10);
});

test('max reviews: 200 done today leaves review empty', () => {
  const now = D(2026, 3, 10, 12);
  const chars = Array.from({ length: 5 }, (_, i) => mk('ja:r' + i, i));
  const states = new Map(chars.map(c => [c.id, { state: STATE.review, reps: 4, lapses: 0, due: new Date(now.getTime() - 3600e3) }]));
  const entries = [], prevState = new Map();
  for (let i = 0; i < 200; i++) {
    const e = rev('ja:other' + i, 3, D(2026, 3, 10, 6));
    entries.push(e); prevState.set(e.id, STATE.review);
  }
  const q = buildQueue({ chars, states, prevState, entries, settings: SET, now });
  assert.deepEqual(q.review, []);
  const q2 = buildQueue({ chars, states, prevState, entries: entries.slice(0, 198), settings: SET, now });
  assert.equal(q2.review.length, 2);
});

test('reviews of earlier days and non-counted entries do not eat the review cap', () => {
  const now = D(2026, 3, 10, 12);
  const chars = [mk('ja:r0', 0)];
  const states = new Map([['ja:r0', { state: STATE.review, reps: 4, lapses: 0, due: new Date(now.getTime() - 1000) }]]);
  const old = rev('ja:x', 3, D(2026, 3, 9, 12));
  const ghost = rev('ja:y', 3, D(2026, 3, 10, 6));
  const prevState = new Map([[old.id, STATE.review]]);
  const q = buildQueue({ chars, states, prevState, entries: [old, ghost], settings: { ...SET, maxReviews: 1 }, now });
  assert.equal(q.review.length, 1);
});

test('review and learning buckets: due before next day start, sorted by due', () => {
  const now = D(2026, 3, 10, 12);
  const chars = ['a', 'b', 'c', 'd'].map((x, i) => mk('ja:' + x, i));
  const h = x => new Date(now.getTime() + x * 3600e3);
  const states = new Map([
    ['ja:a', { state: STATE.review, reps: 3, lapses: 0, due: h(5) }],
    ['ja:b', { state: STATE.review, reps: 3, lapses: 0, due: h(-30) }],
    ['ja:c', { state: STATE.review, reps: 3, lapses: 0, due: D(2026, 3, 11, 4, 0) }],
    ['ja:d', { state: STATE.relearning, reps: 3, lapses: 1, due: h(1) }],
  ]);
  const q = buildQueue({ chars, states, prevState: new Map(), entries: [], settings: SET, now });
  assert.deepEqual(q.review.map(i => i.id), ['ja:b', 'ja:a']);
  assert.deepEqual(q.learning.map(i => i.id), ['ja:d']);
  assert.deepEqual(q.counts, { new: 0, learning: 1, review: 2 });
});

test('unlock: 休 not in fresh until both 人 and 木 introduced', () => {
  const chars = [mk('ja:人', 0), mk('ja:木', 1), mk('ja:休', 2, ['ja:人', 'ja:木'])];
  const now = D(2026, 3, 10, 9);
  assert.deepEqual(run([], chars, now).fresh.map(i => i.id), ['ja:人', 'ja:木']);
  const one = [rev('ja:人', 3, D(2026, 3, 10, 8))];
  assert.ok(!run(one, chars, now, { ...SET, newPerDay: 99 }).fresh.some(i => i.id === 'ja:休'));
  const both = [...one, rev('ja:木', 3, D(2026, 3, 10, 8, 1))];
  assert.ok(run(both, chars, now, { ...SET, newPerDay: 99 }).fresh.some(i => i.id === 'ja:休'));
});

test('nextItem priority', () => {
  const now = D(2026, 3, 10, 12);
  const it = id => ({ id, char: id.slice(3) });
  const states = new Map([
    ['ja:L', { state: STATE.learning, due: new Date(now.getTime() - 1000) }],
    ['ja:W', { state: STATE.learning, due: new Date(now.getTime() + 180000) }],
  ]);
  const q = { learning: [it('ja:L'), it('ja:W')], review: [it('ja:r1'), it('ja:r2')], fresh: [it('ja:n1')], counts: {} };
  assert.equal(nextItem(q, states, now, 0).item.id, 'ja:L');
  const q2 = { ...q, learning: [it('ja:W')] };
  assert.equal(nextItem(q2, states, now, 0).item.id, 'ja:r1');
  assert.equal(NEW_EVERY, 4);
  assert.equal(nextItem(q2, states, now, 4).item.id, 'ja:n1');
  assert.equal(nextItem({ ...q2, review: [] }, states, now, 0).item.id, 'ja:n1');
  assert.equal(nextItem({ ...q2, fresh: [] }, states, now, 9).item.id, 'ja:r1');
});

test('nextItem waits for the earliest learning card, or null when empty', () => {
  const now = D(2026, 3, 10, 12);
  const states = new Map([
    ['ja:W', { state: STATE.learning, due: new Date(now.getTime() + 180000) }],
    ['ja:X', { state: STATE.learning, due: new Date(now.getTime() + 600000) }],
  ]);
  const q = { learning: [{ id: 'ja:X', char: 'X' }, { id: 'ja:W', char: 'W' }], review: [], fresh: [], counts: {} };
  assert.deepEqual(nextItem(q, states, now, 0), { item: null, waitMs: 180000 });
  assert.deepEqual(nextItem({ learning: [], review: [], fresh: [] }, states, now, 0), { item: null, waitMs: null });
});

function seeded(seed) { let s = seed; return () => { s = (s * 1664525 + 1013904223) % 4294967296; return s / 4294967296; }; }

test('buildPractice: only introduced ids of the level, deterministic, no writes', () => {
  const chars = [mk('ja:a', 0), mk('ja:b', 1), mk('ja:c', 2), mk('ja:d', 3, [], 'N4'), mk('ja:e', 4)];
  const introduced = new Set(['ja:a', 'ja:b', 'ja:d']);
  const entries = [rev('ja:a', 3, D(2026, 3, 10, 8))];
  const snapshot = JSON.stringify(entries);
  const out = buildPractice('N5', chars, introduced, seeded(7));
  assert.deepEqual([...out].sort(), ['ja:a', 'ja:b']);
  assert.deepEqual(buildPractice('N5', chars, introduced, seeded(7)), out);
  assert.equal(JSON.stringify(entries), snapshot);
  assert.deepEqual(buildPractice('N3', chars, introduced), []);
});

test('isLeech', () => {
  assert.equal(isLeech({ lapses: 8 }), true);
  assert.equal(isLeech({ lapses: 7 }), false);
});
