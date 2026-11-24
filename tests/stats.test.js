import { test } from 'node:test';
import assert from 'node:assert/strict';
import { replay, RATING, STATE } from '../src/engine/fsrs.js';
import { streak, retention30, forecast, reviewsToday } from '../src/engine/stats.js';

const D = (y, m, d, hh = 0, mm = 0) => new Date(y, m - 1, d, hh, mm);
let n = 0;
const rev = (card, rating, at) => ({ id: 'e' + String(++n).padStart(5, '0'), type: 'review', card, rating, at: at.toISOString(), ms: 1, dev: 'x' });

test('streak: 3 consecutive days to today = 3; gap = 1', () => {
  const now = D(2026, 3, 10, 12);
  const e3 = [D(2026, 3, 8, 9), D(2026, 3, 9, 9), D(2026, 3, 10, 9)].map(d => rev('ja:a', 3, d));
  assert.equal(streak(e3, now, 4), 3);
  const gap = [D(2026, 3, 7, 9), D(2026, 3, 10, 9)].map(d => rev('ja:a', 3, d));
  assert.equal(streak(gap, now, 4), 1);
});

test('streak: starts from yesterday if nothing today; 0 if neither', () => {
  const now = D(2026, 3, 10, 12);
  const e = [D(2026, 3, 8, 9), D(2026, 3, 9, 9)].map(d => rev('ja:a', 3, d));
  assert.equal(streak(e, now, 4), 2);
  assert.equal(streak([rev('ja:a', 3, D(2026, 3, 7, 9))], now, 4), 0);
  assert.equal(streak([], now, 4), 0);
});

test('streak: 04:00 boundary and undone answers', () => {
  const now = D(2026, 3, 10, 12);
  // 02:00 on the 10th belongs to the study day of the 9th
  const e = [rev('ja:a', 3, D(2026, 3, 9, 9)), rev('ja:a', 3, D(2026, 3, 10, 2))];
  assert.equal(streak(e, now, 4), 1);
  const undone = [rev('ja:a', 3, D(2026, 3, 10, 9))];
  const u = { id: 'u1', type: 'undo', target: undone[0].id, at: D(2026, 3, 10, 9, 1).toISOString() };
  assert.equal(streak([...undone, u], now, 4), 0);
});

test('reviewsToday counts counted answers since day start', () => {
  const now = D(2026, 3, 10, 12);
  const e = [rev('ja:a', 3, D(2026, 3, 10, 3)), rev('ja:a', 3, D(2026, 3, 10, 5)), rev('ja:b', 3, D(2026, 3, 10, 6))];
  assert.equal(reviewsToday(e, now, 4), 2);
});

test('forecast buckets by study day, overdue in bucket 0, new cards ignored', () => {
  const now = D(2026, 3, 10, 12);
  const c = (state, due) => ({ state, due });
  const states = new Map([
    ['a', c(STATE.review, D(2026, 3, 9, 8))],
    ['b', c(STATE.review, D(2026, 3, 10, 20))],
    ['c', c(STATE.learning, D(2026, 3, 11, 3, 59))],
    ['d', c(STATE.review, D(2026, 3, 11, 4, 0))],
    ['e', c(STATE.relearning, D(2026, 3, 12, 10))],
    ['f', c(STATE.review, D(2026, 3, 30, 10))],
    ['g', c(STATE.new, D(2026, 3, 10, 10))],
  ]);
  assert.deepEqual(forecast(states, now, 3), [3, 1, 1]);
  assert.equal(forecast(states, now).length, 7);
});

test('retention30: share of review-state answers rated >= 2 in 30 days', () => {
  const now = D(2026, 3, 10, 12);
  assert.equal(retention30([], new Map(), now), null);
  const only = [rev('ja:z', 3, D(2026, 3, 9, 9))];
  assert.equal(retention30(only, new Map([[only[0].id, STATE.new]]), now), null);
  const two = [rev('ja:z', 3, D(2026, 3, 8, 9)), rev('ja:z', 1, D(2026, 3, 9, 9))];
  assert.equal(retention30(two, new Map(two.map(e => [e.id, STATE.review])), now), 0.5);
  // older than 30 days and uncounted entries are ignored
  const old = rev('ja:z', 1, D(2026, 1, 1, 9));
  const ghost = rev('ja:z', 1, D(2026, 3, 9, 9));
  const all = [...two, old, ghost];
  const prev = new Map([...two, old].map(e => [e.id, STATE.review]));
  assert.equal(retention30(all, prev, now), 0.5);
});

test('retention30 works on a real replay log', () => {
  const now = D(2026, 3, 10, 12);
  const settingsFor = () => ({ learningSteps: ['1m'], relearningSteps: ['10m'], retention: 0.9 });
  const entries = [
    rev('ja:a', RATING.easy, D(2026, 3, 1, 9)),
    rev('ja:a', RATING.good, D(2026, 3, 9, 9)),
  ];
  const { prevState } = replay(entries, settingsFor);
  assert.equal(prevState.get(entries[1].id), STATE.review);
  assert.equal(retention30(entries, prevState, now), 1);
});
