// The service worker must only delete its own caches, never other apps' on the same origin.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

const src = readFileSync(join(dirname(fileURLToPath(import.meta.url)), '..', 'sw.js'), 'utf8');
const self = { registration: { scope: 'https://example.test/app/' }, location: { origin: 'https://example.test' }, addEventListener() {} };
const ctx = vm.createContext({ self, URL, Request, Response, fetch() {}, caches: {} });
vm.runInContext(src, ctx);
const { cacheNamesToDelete } = ctx;

test('deletes old hk-* caches and the legacy cache, keeps the current one and other apps', () => {
  assert.deepEqual(
    cacheNamesToDelete(['hk-old', 'hk-new', 'hanja-kanji-learner-v3', 'other-app-v1'], 'hk-new'),
    ['hk-old', 'hanja-kanji-learner-v3'],
  );
});

test('never deletes foreign caches, even with no kept cache', () => {
  assert.deepEqual(cacheNamesToDelete(['other-app-v1', 'workbox-precache', 'hkx'], null), []);
});
