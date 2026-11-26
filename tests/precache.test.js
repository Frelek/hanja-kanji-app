// precache.json must list every covered file and carry a version that matches their bytes.
// If this fails after editing a covered file, run: node tools/gen_precache.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readdirSync, readFileSync, existsSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const FOLDERS = ['src', 'vendor', 'assets', 'data'];
const TOP = ['index.html', 'manifest.webmanifest'];

function walk(dir, out = []) {
  for (const e of readdirSync(join(root, dir), { withFileTypes: true })) {
    const rel = `${dir}/${e.name}`;
    if (e.isDirectory()) walk(rel, out);
    else out.push(rel);
  }
  return out;
}

function expectedFiles() {
  const files = [...TOP];
  for (const f of FOLDERS) walk(f, files);
  return files.sort();
}

const pre = JSON.parse(readFileSync(join(root, 'precache.json'), 'utf8'));

test('precache.json lists every covered file', () => {
  const listed = new Set(pre.files);
  const missing = expectedFiles().filter((f) => !listed.has(f));
  assert.deepEqual(missing, [], 'covered files missing from precache.json; run node tools/gen_precache.mjs');
});

test('every listed file exists, and nothing outside the covered set is listed', () => {
  const expected = new Set(expectedFiles());
  for (const f of pre.files) {
    if (f === './') continue;
    assert.ok(existsSync(join(root, f)) && statSync(join(root, f)).isFile(), `${f} is listed but missing`);
    assert.ok(expected.has(f), `${f} is listed but not a covered file`);
  }
  assert.ok(pre.files.includes('./'), 'the directory URL "./" must be listed');
  assert.ok(pre.files.includes('index.html'));
  assert.ok(!pre.files.some((f) => f.startsWith('./') && f !== './') && !pre.files.some((f) => f.includes(String.fromCharCode(92))));
});

test('files are sorted', () => {
  const sorted = [...pre.files].sort();
  assert.deepEqual(pre.files, sorted);
});

test('version equals a fresh hash of the listed files', () => {
  const h = createHash('sha256');
  for (const f of [...pre.files].filter((x) => x !== './').sort()) {
    h.update(f);
    h.update('\0');
    h.update(readFileSync(join(root, f)));
  }
  assert.equal(pre.version, h.digest('hex').slice(0, 12), 'precache.json is stale; run node tools/gen_precache.mjs');
});

test('the service worker file is not listed and legacy manifest is gone', () => {
  assert.ok(!pre.files.includes('sw.js'));
  assert.ok(!existsSync(join(root, 'manifest.json')));
});

test('sw.js carries the current version stamp, so browsers see it change', () => {
  const sw = readFileSync(join(root, 'sw.js'), 'utf8');
  assert.ok(sw.includes(`// precache-version: ${pre.version}
`), 'sw.js stamp is stale; run node tools/gen_precache.mjs');
});
