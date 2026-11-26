import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mergeEntries, mergeProfile, weekOf, groupByWeek } from '../src/sync/merge.js';

const rv = (id, at, card = 'c1') => ({ id, type: 'review', card, rating: 3, at, ms: 900, dev: 'd' });
const A = [rv('a1', '2026-11-01T10:00:00Z'), rv('a2', '2026-11-03T10:00:00Z')];
const B = [rv('b1', '2026-11-02T10:00:00Z'), rv('a2', '2026-11-03T10:00:00Z')];
const C = [rv('c1', '2026-11-03T10:00:00Z'), { id: 'u1', type: 'undo', target: 'a1', at: '2026-12-01T00:00:00Z', dev: 'd' }];

test('mergeEntries commutative, idempotent, associative', () => {
  assert.deepEqual(mergeEntries(A, B), mergeEntries(B, A));
  assert.deepEqual(mergeEntries(A, A), A);
  assert.deepEqual(mergeEntries(mergeEntries(A, B), C), mergeEntries(A, mergeEntries(B, C)));
});

test('mergeEntries unions by id, sorts by (at, id), does not mutate', () => {
  const a = structuredClone(A), b = structuredClone(B);
  const m = mergeEntries(a, b);
  assert.deepEqual(m.map(e => e.id), ['a1', 'b1', 'a2']);
  assert.deepEqual(a, A);
  assert.deepEqual(b, B);
  assert.deepEqual(mergeEntries(B, C).map(e => e.id), ['b1', 'a2', 'c1', 'u1']);
});

const prof = (settings, upd, extra = {}) => ({ key: 'k1', name: 'Local', tag: 't', createdAt: '2026-01-05T00:00:00Z', settings, settingsUpdatedAt: upd, ...extra });

test('mergeProfile per-field last write wins', () => {
  const local = prof(
    { ja: { retention: 0.9, newPerDay: 10, learningSteps: ['1m'] }, ko: { retention: 0.9, newPerDay: 10 }, dayStartHour: 4, appearance: 'light' },
    { 'ja.retention': '2026-11-01T00:00:00Z', 'ko.newPerDay': '2026-11-05T00:00:00Z', appearance: '2026-11-01T00:00:00Z' });
  const remote = prof(
    { ja: { retention: 0.95, newPerDay: 20, learningSteps: ['1m', '5m'] }, ko: { retention: 0.9, newPerDay: 5 }, dayStartHour: 3, appearance: 'dark' },
    { 'ja.retention': '2026-11-02T00:00:00Z', 'ko.newPerDay': '2026-11-04T00:00:00Z', 'ja.learningSteps': '2026-11-02T00:00:00Z', appearance: '2026-11-01T00:00:00Z' },
    { name: 'Remote', createdAt: '2026-01-01T00:00:00Z' });
  const l0 = structuredClone(local), r0 = structuredClone(remote);
  const m = mergeProfile(local, remote);
  assert.equal(m.settings.ja.retention, 0.95);
  assert.equal(m.settings.ko.newPerDay, 10);
  assert.deepEqual(m.settings.ja.learningSteps, ['1m', '5m']);
  assert.equal(m.settings.ja.newPerDay, 20); // both unstamped: tie, greater JSON value wins
  assert.equal(m.settings.appearance, 'light'); // equal stamps: '"light"' > '"dark"'
  assert.equal(m.settings.dayStartHour, 4);
  assert.equal(m.settingsUpdatedAt['ja.retention'], '2026-11-02T00:00:00Z');
  assert.equal(m.settingsUpdatedAt['ko.newPerDay'], '2026-11-05T00:00:00Z');
  assert.equal(m.createdAt, '2026-01-01T00:00:00Z');
  assert.equal(m.name, 'Local');
  assert.equal(m.key, 'k1');
  assert.deepEqual(local, l0);
  assert.deepEqual(remote, r0);
  m.settings.ja.learningSteps.push('x');
  assert.deepEqual(remote, r0);
});

test('mergeProfile: stamped side beats unstamped side', () => {
  const local = prof({ ja: { retention: 0.9 } }, {});
  const remote = prof({ ja: { retention: 0.8 } }, { 'ja.retention': '2026-11-02T00:00:00Z' });
  assert.equal(mergeProfile(local, remote).settings.ja.retention, 0.8);
  assert.equal(mergeProfile(remote, local).settings.ja.retention, 0.8);
});

test('weekOf is the ISO-8601 week of the UTC time, with the week-based year', () => {
  assert.equal(weekOf('2026-11-23T08:00:00Z'), '2026-W48');
  assert.equal(weekOf('2026-11-22T23:59:59.999Z'), '2026-W47'); // Sunday ends a week
  assert.equal(weekOf('2026-11-23T00:00:00.000Z'), '2026-W48'); // Monday starts one
  assert.equal(weekOf('2026-01-01T00:00:00Z'), '2026-W01'); // a Thursday
  assert.equal(weekOf('2026-12-31T23:59:59Z'), '2026-W53'); // 2026 has 53 weeks
  assert.equal(weekOf('2027-01-03T12:00:00Z'), '2026-W53'); // still 2026's last week
  assert.equal(weekOf('2027-01-04T00:00:00Z'), '2027-W01');
  assert.equal(weekOf('2024-12-30T00:00:00Z'), '2025-W01'); // Monday of 2025's first week
  assert.equal(weekOf('2021-01-03T23:00:00Z'), '2020-W53');
  assert.equal(weekOf('2026-03-02T00:00:00Z'), '2026-W10');
  assert.equal(weekOf('2025-12-28T23:59:59Z'), '2025-W52');
  // the UTC date counts, whatever the offset written in the stamp
  assert.equal(weekOf('2026-11-23T01:00:00+02:00'), '2026-W47');
});

test('groupByWeek', () => {
  const g = groupByWeek([
    rv('z', '2027-01-01T00:00:00Z'), rv('b', '2026-11-24T00:00:00Z'), rv('a', '2026-11-24T00:00:00Z'),
    rv('c', '2026-11-22T23:00:00Z'), rv('d', '2026-11-29T23:59:59Z'),
  ]);
  assert.deepEqual([...g.keys()], ['2026-W47', '2026-W48', '2026-W53']);
  assert.deepEqual(g.get('2026-W48').map(e => e.id), ['a', 'b', 'd']);
  assert.deepEqual(g.get('2026-W53').map(e => e.id), ['z']);
});

const mk = (name, settings, upd) => prof(settings, upd, { name });
const P1 = mk('p1', { ja: { newPerDay: 10, retention: 0.9, learningSteps: ['1m'] }, dayStartHour: 4, appearance: 'light' },
  { 'ja.retention': '2026-11-05T00:00:00Z', 'ja.newPerDay': '2026-11-01T00:00:00Z', appearance: '2026-11-02T00:00:00Z' });
const P2 = mk('p2', { ja: { newPerDay: 20, retention: 0.95, learningSteps: ['1m', '5m'] }, ko: { newPerDay: 7 }, dayStartHour: 3, appearance: 'dark' },
  { 'ja.retention': '2026-11-03T00:00:00Z', 'ja.newPerDay': '2026-11-01T00:00:00Z', 'ko.newPerDay': '2026-11-09T00:00:00Z', appearance: '2026-11-02T00:00:00Z' });
const P3 = mk('p3', { ja: { newPerDay: 15, retention: 0.8 }, ko: { newPerDay: 9 }, dayStartHour: 5, appearance: 'sepia' },
  { 'ja.retention': '2026-11-07T00:00:00Z', 'ko.newPerDay': '2026-11-09T00:00:00Z' });
const view = p => ({ settings: p.settings, settingsUpdatedAt: p.settingsUpdatedAt });

test('mergeProfile is commutative on settings and stamps', () => {
  for (const [x, y] of [[P1, P2], [P1, P3], [P2, P3]]) {
    assert.deepEqual(view(mergeProfile(x, y)), view(mergeProfile(y, x)));
  }
});

test('mergeProfile is associative', () => {
  const l = mergeProfile(mergeProfile(P1, P2), P3);
  const r = mergeProfile(P1, mergeProfile(P2, P3));
  assert.deepEqual(view(l), view(r));
});
