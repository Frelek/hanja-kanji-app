import test from 'node:test';
import assert from 'node:assert/strict';
import { parseRoute, routeHref } from '../src/ui/route.js';

test('tab routes parse', () => {
  for (const name of ['study', 'session', 'stats', 'settings']) {
    assert.deepEqual(parseRoute(`#/${name}`), { name });
    assert.deepEqual(parseRoute(`#/${name}/`), { name });
  }
});

test('characters routes carry the level id', () => {
  assert.deepEqual(parseRoute('#/characters/N5'), { name: 'characters', level: 'N5' });
  assert.deepEqual(parseRoute('#/characters'), { name: 'characters', level: null });
  assert.deepEqual(parseRoute('#/characters/4%EA%B8%89%E2%85%A1'), { name: 'characters', level: '4급Ⅱ' });
  assert.deepEqual(parseRoute('#/characters/8급'), { name: 'characters', level: '8급' });
  assert.deepEqual(parseRoute('#/characters/%E0%A4%A'), { name: 'characters', level: '%E0%A4%A' });
});

test('empty and unknown hashes redirect to study', () => {
  for (const h of ['', '#', '#/', '#/nope', '#/stats/extra', '#/characters/N5/x', undefined]) {
    assert.deepEqual(parseRoute(h), { name: 'study', redirect: true }, String(h));
  }
});

test('routeHref round-trips through parseRoute', () => {
  assert.equal(routeHref('study'), '#/study');
  assert.equal(routeHref('characters', 'N5'), '#/characters/N5');
  for (const level of ['N3', '8급', '4급Ⅱ']) {
    assert.deepEqual(parseRoute(routeHref('characters', level)), { name: 'characters', level });
  }
});

test('practice routes carry the level id, URL-encoded', () => {
  assert.deepEqual(parseRoute('#/practice/N5'), { name: 'practice', level: 'N5' });
  assert.deepEqual(parseRoute('#/practice/8%EA%B8%89'), { name: 'practice', level: '8급' });
  assert.equal(routeHref('practice', '4급Ⅱ'), '#/practice/4%EA%B8%89%E2%85%A1');
  assert.deepEqual(parseRoute(routeHref('practice', '4급Ⅱ')), { name: 'practice', level: '4급Ⅱ' });
  assert.deepEqual(parseRoute('#/practice'), { name: 'study', redirect: true });
  assert.deepEqual(parseRoute('#/practice/N5/x'), { name: 'study', redirect: true });
});

test('an open detail sheet is the ?c= param of a characters route', () => {
  assert.deepEqual(parseRoute('#/characters/N5?c=ja%3A%E4%BC%91'), { name: 'characters', level: 'N5', char: 'ja:休' });
  assert.deepEqual(parseRoute('#/characters/N5?c='), { name: 'characters', level: 'N5' });
  assert.deepEqual(parseRoute('#/characters/N5?x=1'), { name: 'characters', level: 'N5' });
  assert.equal(routeHref('characters', 'N5', 'ja:休'), '#/characters/N5?c=ja%3A%E4%BC%91');
  assert.equal(routeHref('characters', 'N5', null), '#/characters/N5');
  for (const [level, char] of [['8급', 'ko:敎'], ['4급Ⅱ', 'ko:𡥉'], ['N3', 'ja:読']]) {
    assert.deepEqual(parseRoute(routeHref('characters', level, char)), { name: 'characters', level, char });
  }
  // Other routes ignore a query.
  assert.deepEqual(parseRoute('#/study?c=ja%3A%E4%BC%91'), { name: 'study' });
});
