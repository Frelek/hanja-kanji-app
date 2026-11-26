import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { loadData } from '../src/data/load.js';

const realFetch = globalThis.fetch;
const urls = [];

// Serves ./data/<lang>.json from disk, the way the page fetches it.
async function diskFetch(url) {
  urls.push(String(url));
  const m = /^\.\/data\/(ja|ko)\.json$/.exec(String(url));
  if (!m) return { ok: false, status: 404, json: async () => { throw new Error('404'); } };
  const text = await readFile(new URL(`../data/${m[1]}.json`, import.meta.url), 'utf8');
  return { ok: true, status: 200, json: async () => JSON.parse(text) };
}

test.beforeEach(() => { urls.length = 0; globalThis.fetch = diskFetch; });
test.afterEach(() => { globalThis.fetch = realFetch; });

test('loadData(ja) indexes by char and id', async () => {
  const d = await loadData('ja');
  assert.deepEqual(urls, ['./data/ja.json']);
  assert.equal(d.lang, 'ja');
  assert.equal(d.byChar.get('休').id, 'ja:休');
  assert.equal(d.byId.get('ja:休').char, '休');
  assert.equal(d.byId.size, d.chars.length);
  assert.deepEqual(d.levels.map((l) => l.id), ['N5', 'N4', 'N3']);
  assert.equal(typeof d.parts, 'object');
});

test('loadData(ko) indexes the Korean set', async () => {
  const d = await loadData('ko');
  assert.equal(d.lang, 'ko');
  assert.equal(d.byChar.get('人').id, 'ko:人');
  assert.equal(d.levels[0].id, '8급');
});

test('loadData rejects an unknown language without fetching', async () => {
  await assert.rejects(loadData('zh'), /Unknown language/);
  assert.deepEqual(urls, []);
});

test('loadData rejects when the file is missing', async () => {
  globalThis.fetch = async () => ({ ok: false, status: 404, json: async () => ({}) });
  await assert.rejects(loadData('ja'), /Could not load ja data \(404\)/);
});

test('loadData rejects a file for the other language', async () => {
  globalThis.fetch = async () => ({ ok: true, status: 200, json: async () => ({ lang: 'ko', levels: [], chars: [], parts: {} }) });
  await assert.rejects(loadData('ja'), /not ja/);
});
