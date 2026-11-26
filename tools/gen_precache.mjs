// Writes precache.json: the list of files the service worker caches, and a version
// that changes whenever any of their names or bytes change, or sw.js itself changes.
//   node tools/gen_precache.mjs
// Re-run it after changing any covered file (index.html, manifest.webmanifest,
// src/, vendor/, assets/, data/) or sw.js. tests/precache.test.js fails when it is stale.
// Only files git tracks are covered, so `git add` a new file first.
//
// It also stamps the version into sw.js. Browsers only look for a new service worker
// when sw.js itself changes byte for byte, so without the stamp an update to the app
// files would never be noticed by phones that already have the app installed. The
// version hashes sw.js with that stamp line blanked, so it never depends on itself.
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const FOLDERS = ['src', 'vendor', 'assets', 'data'];
const TOP = ['index.html', 'manifest.webmanifest'];
const SW = 'sw.js';
const STAMP_RE = /^\/\/ precache-version: .*$/m;

const readFile = (f) => readFileSync(join(root, f));

/** sw.js as the version hashes it: the stamp line blanked. */
export const blankStamp = (text) => text.replace(STAMP_RE, '');

/**
 * The version for a list of precached files (without "./"): a hash of their names and
 * bytes, in sorted order, then of sw.js with its stamp blanked. `read(path)` gives bytes.
 */
export function precacheVersion(files, read = readFile) {
  const h = createHash('sha256');
  for (const f of [...files].sort()) {
    h.update(f);
    h.update('\0');
    h.update(read(f));
  }
  h.update(SW);
  h.update('\0');
  h.update(blankStamp(String(read(SW))));
  return h.digest('hex').slice(0, 12);
}

/**
 * The covered files git tracks and that are on disk, sorted: what GitHub Pages serves.
 * An untracked file (a scratch file, a build leftover) is never precached; `git add` a
 * new app file before running this.
 */
export function trackedFiles() {
  const out = execFileSync('git', ['ls-files', '-z', '--', ...TOP, ...FOLDERS], { cwd: root, encoding: 'utf8' });
  return out.split('\0').filter((f) => f && existsSync(join(root, f))).sort();
}

export function buildPrecache() {
  const files = trackedFiles();
  let bytes = 0;
  for (const f of files) bytes += readFile(f).length;
  // "./" is the directory URL the home-screen app opens; it holds the same bytes as index.html.
  return { precache: { version: precacheVersion(files), files: ['./', ...files] }, bytes };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const { precache, bytes } = buildPrecache();
  writeFileSync(join(root, 'precache.json'), `${JSON.stringify(precache, null, 1)}\n`, { encoding: 'utf8' });
  const swPath = join(root, SW);
  const sw = readFileSync(swPath, 'utf8');
  if (!STAMP_RE.test(sw)) throw new Error('sw.js has no "// precache-version:" line');
  writeFileSync(swPath, sw.replace(STAMP_RE, `// precache-version: ${precache.version}`), 'utf8');
  console.log(`precache.json: version ${precache.version}, ${precache.files.length} entries, ${(bytes / 1048576).toFixed(2)} MiB`);
}
