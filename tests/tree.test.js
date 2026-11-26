import test from 'node:test';
import assert from 'node:assert/strict';
import { buildForest, familyGroups } from '../src/engine/tree.js';

// The spec mockup: 木 studied with 本 (studied), 休 (new, also 人) and 東 (later, needs 日)
// under it; 日 a root of its own. 林 is N4 and grows from N5's 木; 森 grows from 林 in N4.
const mk = (char, level, order, { parents = [], required = parents, primary = null } = {}) => ({
  id: `ja:${char}`,
  char,
  level,
  order,
  meanings: [char],
  parents: parents.map((p) => `ja:${p}`),
  required: required.map((p) => `ja:${p}`),
  primaryParent: primary ? `ja:${primary}` : null,
});

const CHARS = [
  mk('東', 'N5', 5, { parents: ['日', '木'], primary: '木' }),
  mk('日', 'N5', 0),
  mk('木', 'N5', 2),
  mk('休', 'N5', 4, { parents: ['人', '木'], primary: '木' }),
  mk('人', 'N5', 1),
  mk('本', 'N5', 3, { parents: ['木'], primary: '木' }),
  mk('森', 'N4', 1, { parents: ['林'], primary: '林' }),
  mk('林', 'N4', 0, { parents: ['木'], primary: '木' }),
];
const INTRODUCED = new Set(['ja:木', 'ja:人', 'ja:本']);

const glyphs = (nodes) => nodes.map((n) => n.char.char);
const find = (nodes, ch) => {
  for (const n of nodes) {
    if (n.char.char === ch) return n;
    const hit = find(n.children, ch);
    if (hit) return hit;
  }
  return null;
};

test('roots are the level chars without an in-level primary parent, in study order', () => {
  const forest = buildForest(CHARS, 'N5', INTRODUCED);
  assert.deepEqual(glyphs(forest), ['日', '人', '木']);
  for (const n of forest) assert.equal(n.fromLevel, null);
});

test('children hang under their primary parent, ordered by order', () => {
  const forest = buildForest(CHARS, 'N5', INTRODUCED);
  const tree = find(forest, '木');
  assert.deepEqual(glyphs(tree.children), ['本', '休', '東']);
  assert.deepEqual(find(forest, '人').children, []);
  assert.deepEqual(find(forest, '日').children, []);
});

test('本 is studied under 木', () => {
  const hon = find(buildForest(CHARS, 'N5', INTRODUCED), '本');
  assert.equal(hon.status, 'studied');
  assert.deepEqual(hon.needs, []);
  assert.deepEqual(hon.alsoParents, []);
  assert.equal(hon.fromLevel, null);
  assert.equal(hon.char.id, 'ja:本');
});

test('休 is new under 木, also 人', () => {
  const kyu = find(buildForest(CHARS, 'N5', INTRODUCED), '休');
  assert.equal(kyu.status, 'new');
  assert.deepEqual(kyu.alsoParents, ['人']);
  assert.deepEqual(kyu.needs, []);
  assert.deepEqual(kyu.children, []);
});

test('東 is later while 日 is not introduced, and needs 日', () => {
  const higashi = find(buildForest(CHARS, 'N5', INTRODUCED), '東');
  assert.equal(higashi.status, 'later');
  assert.deepEqual(higashi.needs, ['日']);
  assert.deepEqual(higashi.alsoParents, ['日']);
  const after = find(buildForest(CHARS, 'N5', new Set([...INTRODUCED, 'ja:日'])), '東');
  assert.equal(after.status, 'new');
  assert.deepEqual(after.needs, []);
});

test('a char whose primary parent is in N5 is an N4 root with fromLevel N5', () => {
  const forest = buildForest(CHARS, 'N4', INTRODUCED);
  assert.deepEqual(glyphs(forest), ['林']);
  assert.equal(forest[0].fromLevel, 'N5');
  assert.equal(forest[0].status, 'new');
  assert.deepEqual(glyphs(forest[0].children), ['森']);
  assert.equal(forest[0].children[0].fromLevel, null);
  assert.equal(forest[0].children[0].status, 'later');
  assert.deepEqual(forest[0].children[0].needs, ['林']);
});

test('a later-level parent is listed in alsoParents but never in needs', () => {
  // 読 (N5) is built from 言 and 売, both N4: they are parents, not requirements.
  const chars = [
    mk('読', 'N5', 0, { parents: ['売', '言'], required: [] }),
    mk('言', 'N4', 0),
    mk('売', 'N4', 1),
  ];
  const [yomu] = buildForest(chars, 'N5', new Set());
  assert.equal(yomu.status, 'new');
  assert.equal(yomu.fromLevel, null);
  assert.deepEqual(yomu.alsoParents, ['売', '言']);
  assert.deepEqual(yomu.needs, []);
});

test('a primary parent missing from the set makes a plain root; nothing is written', () => {
  const chars = [mk('休', 'N5', 0, { parents: ['人'], primary: '人' })];
  const frozen = structuredClone(chars);
  const [kyu] = buildForest(chars, 'N5', new Set());
  assert.equal(kyu.fromLevel, null);
  assert.equal(kyu.status, 'later');
  assert.deepEqual(kyu.needs, ['人']);
  assert.deepEqual(chars, frozen);
});

test('an empty or unknown level gives an empty forest', () => {
  assert.deepEqual(buildForest(CHARS, 'N3', INTRODUCED), []);
  assert.deepEqual(buildForest([], 'N5', INTRODUCED), []);
});

test('familyGroups gathers roots that grow from the same earlier-level parent', () => {
  const chars = [
    mk('木', 'N5', 0),
    mk('人', 'N5', 1),
    mk('林', 'N4', 0, { parents: ['木'], primary: '木' }),
    mk('話', 'N4', 1),
    mk('体', 'N4', 2, { parents: ['人', '本'], primary: '人' }),
    mk('村', 'N4', 3, { parents: ['木'], primary: '木' }),
  ];
  const groups = familyGroups(buildForest(chars, 'N4', new Set()));
  assert.deepEqual(groups.map((g) => [g.parent, g.fromLevel, glyphs(g.nodes)]), [
    ['ja:木', 'N5', ['林', '村']],
    [null, null, ['話']],
    ['ja:人', 'N5', ['体']],
  ]);
});
