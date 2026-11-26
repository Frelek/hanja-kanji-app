// Writes precache.json: the list of files the service worker caches, and a version
// that changes whenever any of their names or bytes change.
//   node tools/gen_precache.mjs
// Re-run it after changing any covered file (index.html, manifest.webmanifest,
// src/, vendor/, assets/, data/). tests/precache.test.js fails when it is stale.
//
// It also stamps the version into sw.js. Browsers only look for a new service worker
// when sw.js itself changes byte for byte, so without the stamp an update to the app
// files would never be noticed by phones that already have the app installed.
import { createHash } from 'node:crypto';
import { readdirSync, readFileSync, writeFileSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const FOLDERS = ['src', 'vendor', 'assets', 'data'];
const TOP = ['index.html', 'manifest.webmanifest'];

function walk(dir, out) {
  for (const e of readdirSync(join(root, dir), { withFileTypes: true })) {
    const rel = `${dir}/${e.name}`;
    if (e.isDirectory()) walk(rel, out);
    else out.push(rel);
  }
}

export function buildPrecache() {
  const files = [...TOP];
  for (const f of FOLDERS) walk(f, files);
  files.sort();
  const h = createHash('sha256');
  let bytes = 0;
  for (const f of files) {
    const buf = readFileSync(join(root, f));
    bytes += buf.length;
    h.update(f);
    h.update('\0');
    h.update(buf);
  }
  // "./" is the directory URL the home-screen app opens; it holds the same bytes as index.html.
  return { precache: { version: h.digest('hex').slice(0, 12), files: ['./', ...files] }, bytes };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const { precache, bytes } = buildPrecache();
  writeFileSync(join(root, 'precache.json'), `${JSON.stringify(precache, null, 1)}\n`, { encoding: 'utf8' });
  const swPath = join(root, 'sw.js');
  const sw = readFileSync(swPath, 'utf8');
  const stamped = sw.replace(/^\/\/ precache-version: .*$/m, `// precache-version: ${precache.version}`);
  if (stamped === sw && !sw.includes(`// precache-version: ${precache.version}`)) throw new Error('sw.js has no "// precache-version:" line');
  writeFileSync(swPath, stamped, 'utf8');
  console.log(`precache.json: version ${precache.version}, ${precache.files.length} entries, ${(bytes / 1048576).toFixed(2)} MiB`);
}
