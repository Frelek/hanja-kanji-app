// Pure merge functions for sync: no storage, no network, no clock.

const cmpStr = (x, y) => (x < y ? -1 : x > y ? 1 : 0);
const byAtId = (x, y) => cmpStr(x.at, y.at) || cmpStr(x.id, y.id);

/** Union by entry id, sorted by (at, id). Inputs are not mutated. */
export function mergeEntries(a, b) {
  const seen = new Map();
  for (const e of a) if (!seen.has(e.id)) seen.set(e.id, e);
  for (const e of b) if (!seen.has(e.id)) seen.set(e.id, e);
  return [...seen.values()].sort(byAtId);
}

const DAY = 864e5;

/**
 * The ISO-8601 week of a time, in UTC, as 'YYYY-Www'. The year is the week-based year:
 * a week belongs to the year of its Thursday, so 2027-01-01 falls in '2026-W53'.
 */
export function weekOf(at) {
  const d = new Date(at);
  const monday0 = (d.getUTCDay() + 6) % 7; // Monday 0 ... Sunday 6
  const thursday = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() - monday0 + 3);
  const year = new Date(thursday).getUTCFullYear();
  const week = 1 + Math.floor((thursday - Date.UTC(year, 0, 1)) / (7 * DAY));
  return `${String(year).padStart(4, '0')}-W${String(week).padStart(2, '0')}`;
}

/** Map of 'YYYY-Www' -> entries, weeks ascending, entries sorted by (at, id). */
export function groupByWeek(entries) {
  const sorted = [...entries].sort(byAtId);
  const out = new Map();
  for (const e of sorted) {
    const w = weekOf(e.at);
    if (!out.has(w)) out.set(w, []);
    out.get(w).push(e);
  }
  return out;
}

const isPlain = v => v !== null && typeof v === 'object' && !Array.isArray(v);

function leaves(obj, prefix, out) {
  for (const [k, v] of Object.entries(obj ?? {})) {
    const p = prefix ? `${prefix}.${k}` : k;
    if (isPlain(v)) leaves(v, p, out);
    else out.set(p, v);
  }
  return out;
}

function setPath(obj, path, value) {
  const keys = path.split('.');
  let o = obj;
  for (const k of keys.slice(0, -1)) {
    if (!isPlain(o[k])) o[k] = {};
    o = o[k];
  }
  o[keys.at(-1)] = value;
}

/** Per-field last-write-wins by settingsUpdatedAt[path]; missing stamp is oldest; tie picks the lexically greater JSON value (commutative). */
export function mergeProfile(local, remote) {
  const lLeaves = leaves(local.settings, '', new Map());
  const rLeaves = leaves(remote.settings, '', new Map());
  const lUpd = local.settingsUpdatedAt ?? {};
  const rUpd = remote.settingsUpdatedAt ?? {};
  const settings = {};
  const settingsUpdatedAt = {};
  for (const path of new Set([...lLeaves.keys(), ...rLeaves.keys()])) {
    const inL = lLeaves.has(path), inR = rLeaves.has(path);
    const lt = lUpd[path], rt = rUpd[path];
    let takeRemote;
    if (!inL) takeRemote = true;
    else if (!inR) takeRemote = false;
    else if (lt === rt) takeRemote = JSON.stringify(rLeaves.get(path)) > JSON.stringify(lLeaves.get(path));
    else takeRemote = rt !== undefined && (lt === undefined || rt > lt);
    const winner = takeRemote ? rLeaves.get(path) : lLeaves.get(path);
    setPath(settings, path, structuredClone(winner));
    const t = takeRemote ? rt : lt;
    if (t !== undefined) settingsUpdatedAt[path] = t;
  }
  // stamps for paths not present in either settings tree are preserved (newest wins)
  for (const path of new Set([...Object.keys(lUpd), ...Object.keys(rUpd)])) {
    if (path in settingsUpdatedAt || lLeaves.has(path) || rLeaves.has(path)) continue;
    const lt = lUpd[path], rt = rUpd[path];
    settingsUpdatedAt[path] = lt === undefined ? rt : rt === undefined ? lt : (rt > lt ? rt : lt);
  }
  const out = structuredClone(local);
  out.settings = settings;
  out.settingsUpdatedAt = settingsUpdatedAt;
  out.createdAt = local.createdAt <= remote.createdAt ? local.createdAt : remote.createdAt;
  return out;
}
