// Profile sync with the progress repo (spec §7.3), the sync manager and the status line.
// The review log is the source of truth: logs merge as a union by entry id, settings merge
// per field by settingsUpdatedAt, and card states always come from replaying the log.
//
// Repo layout: profiles/<key>/profile.json  = { name, tag, createdAt, settings, settingsUpdatedAt }
//              profiles/<key>/log-YYYY-MM.json = { entries: [...] }
// The shas seen at the last sync live in meta `sync:<key>` = { shas: { [file]: sha }, lastSync }.
import { SyncError, createGitHubClient } from './github.js';
import { mergeEntries, mergeProfile, groupByMonth } from './merge.js';
import { defaultSettings } from '../store/db.js';
import { settingError } from '../state.js';

export const DEFAULT_REPO = 'Frelek/hanja-kanji-progress';
export const MAX_RETRIES = 3;
export const TOKEN_ERROR = "That doesn't look like a GitHub token";
export const REPO_ERROR = 'Enter the repo as owner/name';

const TOKEN_RE = /^[\x21-\x7e]+$/;
const REPO_RE = /^[\w.-]+\/[\w.-]+$/;
const PROFILE_FILE = 'profile.json';
const LOG_RE = /^log-\d{4}-\d{2}\.json$/;
const TIMEOUT_MS = 30e3;
const WELCOME_WAIT_MS = 15e3;
const KINDS = new Set(['auth', 'notfound', 'conflict', 'offline', 'http']);

const isPlain = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);
const logFile = (month) => `log-${month}.json`;

/** The pasted token, trimmed; tokens are printable ASCII with no spaces (R32). */
export function checkToken(text) {
  const token = String(text ?? '').trim();
  return TOKEN_RE.test(token) ? { ok: true, token } : { ok: false, error: TOKEN_ERROR };
}

/** The repo as owner/name; an empty field means the default repo. */
export function checkRepo(text) {
  const repo = String(text ?? '').trim() || DEFAULT_REPO;
  const ok = REPO_RE.test(repo) && repo.split('/').every((part) => !/^\.+$/.test(part));
  return ok ? { ok: true, repo } : { ok: false, error: REPO_ERROR };
}

/** The kind of a sync failure. Anything that is not a SyncError counts as 'http' (R32). */
export function errorKind(e) {
  if (!(e instanceof SyncError)) return 'http';
  if (e.status === 404) return 'notfound'; // only an upload gets a 404: no repo, or no access to it
  return KINDS.has(e.kind) ? e.kind : 'http';
}

/** The status line for the store's `sync` state. `now` is the clock the screen shows. */
export function syncLabel(sync, now = new Date()) {
  if (!sync || sync.status === 'off') return 'Sync off';
  switch (sync.error) {
    case null:
    case undefined:
      break;
    case 'offline': {
      const n = sync.waiting ?? 0;
      return `Offline: ${n} ${n === 1 ? 'answer' : 'answers'} waiting`;
    }
    case 'auth':
      return 'Sync problem: token expired, tap to fix';
    case 'notfound':
      return 'Sync problem: repo not found';
    default:
      return 'Sync problem: try again later';
  }
  if (!sync.lastSync) return '';
  const min = Math.floor((now - new Date(sync.lastSync)) / 60e3);
  return min < 1 ? 'Synced just now' : `Synced ${min} min ago`;
}

const TEST_TEXT = {
  ok: 'Connected — the repo is reachable',
  auth: 'The token was rejected',
  notfound: "Repo not found, or the token can't see it",
  offline: 'No internet connection',
};

/** What a connection test found, in plain words. */
export const testText = (kind) => TEST_TEXT[kind] ?? 'Sync problem: try again later';

/** Canonical JSON: the same value always gives the same text, whatever the key order. */
function stable(v) {
  if (Array.isArray(v)) return `[${v.map(stable).join(',')}]`;
  if (isPlain(v)) {
    const keys = Object.keys(v).filter((k) => v[k] !== undefined).sort();
    return `{${keys.map((k) => `${JSON.stringify(k)}:${stable(v[k])}`).join(',')}}`;
  }
  return JSON.stringify(v ?? null);
}

// --- reading what the server holds -----------------------------------------------------------

/** The entries of a month file that can be merged: objects with an id and a time. */
function rawEntries(json) {
  const list = Array.isArray(json?.entries) ? json.entries : [];
  return list.filter((e) => isPlain(e) && typeof e.id === 'string' && e.id !== '' && typeof e.at === 'string');
}

/** Entries this version can replay. Others stay on the server but are not stored here. */
function usable(e) {
  if (Number.isNaN(Date.parse(e.at))) return false;
  if (e.type === 'review') return typeof e.card === 'string' && e.card.includes(':') && [1, 2, 3, 4].includes(e.rating);
  if (e.type === 'undo') return typeof e.target === 'string';
  if (e.type === 'reset') return typeof e.lang === 'string';
  return false;
}

function leafPaths(obj, prefix = '') {
  return Object.entries(obj).flatMap(([k, v]) => {
    const p = prefix ? `${prefix}.${k}` : k;
    return isPlain(v) ? leafPaths(v, p) : [p];
  });
}

const SETTING_PATHS = leafPaths(defaultSettings());

function getPath(obj, path) {
  let o = obj;
  for (const k of path.split('.')) {
    if (!isPlain(o) || !Object.hasOwn(o, k)) return undefined;
    o = o[k];
  }
  return o;
}

function setPath(obj, path, value) {
  const keys = path.split('.');
  let o = obj;
  for (const k of keys.slice(0, -1)) o = (o[k] ??= {});
  o[keys.at(-1)] = value;
}

/**
 * The server's profile.json as a profile mergeProfile can take. Only known settings with
 * valid values are read, so a damaged file can neither break the scheduler nor reach
 * Object.prototype through a "__proto__" key.
 */
function readRemoteProfile(json, local) {
  const r = isPlain(json) ? json : {};
  const stamps = isPlain(r.settingsUpdatedAt) ? r.settingsUpdatedAt : {};
  const settings = {};
  const settingsUpdatedAt = {};
  for (const path of SETTING_PATHS) {
    const value = getPath(r.settings, path);
    if (value === undefined || settingError(path, value) !== null) continue;
    setPath(settings, path, structuredClone(value));
    if (Object.hasOwn(stamps, path) && typeof stamps[path] === 'string') settingsUpdatedAt[path] = stamps[path];
  }
  return {
    // The first device to create the profile names it; the same key keeps one display name.
    name: typeof r.name === 'string' && r.name.toLowerCase() === local.name.toLowerCase() ? r.name : local.name,
    createdAt: typeof r.createdAt === 'string' ? r.createdAt : local.createdAt,
    settings,
    settingsUpdatedAt,
  };
}

function mergeRemoteProfile(local, json) {
  const remote = readRemoteProfile(json, local);
  return { ...mergeProfile(local, remote), name: remote.name };
}

/** What profile.json holds for a profile (or the same fields of a file read from the server). */
const profileDoc = (p) => {
  const x = isPlain(p) ? p : {};
  return { name: x.name, tag: x.tag, createdAt: x.createdAt, settings: x.settings, settingsUpdatedAt: x.settingsUpdatedAt };
};

// --- one profile ----------------------------------------------------------------------------

/**
 * Syncs one profile with the repo (spec §7.3) and returns
 * { pulled, pushed, created, existed }: entries stored here, entries added to the server,
 * and whether profile.json was created now or was already there.
 *
 * `exclusive(fn)` runs the local writes that must not interleave with the study screens
 * (the store passes its write chain). `stats` is filled as the run goes, so it still tells
 * what changed on this device when the run throws: { pulled, profileChanged }.
 * Throws SyncError when the repo cannot be read or written, or SyncError('conflict') when
 * a file kept changing after MAX_RETRIES retries.
 */
export async function syncProfile({
  db, client, profileKey, now = () => new Date(), exclusive = (fn) => fn(), stats = {},
}) {
  stats.pulled = 0;
  stats.profileChanged = false;
  const at = () => (typeof now === 'function' ? now() : now ?? new Date());
  const folder = `profiles/${profileKey}`;
  const pathOf = (name) => `${folder}/${name}`;
  const metaKey = `sync:${profileKey}`;

  if (!(await db.getProfile(profileKey))) throw new Error(`No profile ${profileKey} on this device`);
  const meta = await db.getMeta(metaKey);
  const known = isPlain(meta?.shas) ? meta.shas : {};
  const shas = new Map(); // file -> sha of a version whose entries this device holds
  const remote = new Map(); // file -> { sha, json } read or written in this run

  // 1. List the folder (a folder that does not exist yet lists as empty).
  const listed = new Map();
  for (const f of await client.listDir(folder)) {
    if (f && typeof f.name === 'string' && typeof f.sha === 'string') listed.set(f.name, f.sha);
  }

  const local = await db.getEntries(profileKey);
  const localIds = new Set(local.map((e) => e.id));

  // 4. Entries of a server file that this device lacks are stored here, already synced.
  async function absorb(json) {
    const fresh = mergeEntries([], rawEntries(json).filter(usable)).filter((e) => !localIds.has(e.id));
    if (!fresh.length) return;
    stats.pulled += await exclusive(() => db.addEntries(profileKey, fresh));
    await db.markSynced(fresh.map((e) => e.id));
    for (const e of fresh) {
      localIds.add(e.id);
      local.push(e);
    }
  }

  async function fetchFile(name) {
    const got = await client.getJson(pathOf(name));
    if (!got) {
      remote.delete(name);
      shas.delete(name);
      return null;
    }
    if (LOG_RE.test(name)) await absorb(got.json);
    remote.set(name, got);
    shas.set(name, got.sha);
    return got;
  }

  // Writes one file with its sha as the precondition. build(current) returns the content
  // for the server's current version, or null when it needs nothing. On a conflict the file
  // is fetched again (pulling its new entries) and rebuilt, at most MAX_RETRIES times.
  async function put(name, build, message) {
    let current = remote.get(name) ?? null;
    for (let retry = 0; ; retry++) {
      const json = await build(current);
      if (json == null) return false;
      try {
        const { sha } = await client.putJson(pathOf(name), json, current?.sha ?? null, message);
        remote.set(name, { sha, json });
        shas.set(name, sha);
        return true;
      } catch (e) {
        if (!(e instanceof SyncError) || e.kind !== 'conflict') throw e;
        if (retry >= MAX_RETRIES) throw new SyncError('conflict', e.status, `${name} kept changing on the server`);
        current = await fetchFile(name);
      }
    }
  }

  // 2–3. Download the months whose sha changed since the last sync, and profile.json.
  for (const [name, sha] of listed) {
    if (name === PROFILE_FILE) await fetchFile(name);
    else if (LOG_RE.test(name)) {
      if (known[name] === sha) shas.set(name, sha);
      else await fetchFile(name);
    }
  }

  // 5. Merge the server's profile into this device's copy. It runs in the write chain, so
  //    a settings change made on this device meanwhile is not overwritten.
  const mergeLocal = (current) => exclusive(async () => {
    const mine = await db.getProfile(profileKey);
    if (!current) return mine;
    const merged = mergeRemoteProfile(mine, current.json);
    if (stable(merged) !== stable(mine)) {
      await db.putProfile(merged);
      stats.profileChanged = true;
    }
    return merged;
  });
  const firstProfile = remote.get(PROFILE_FILE) ?? null;
  const merged = await mergeLocal(firstProfile);

  // 6. Upload every month whose server file lacks some of this device's entries: the new
  //    content is the server's entries plus this device's entries for that month.
  const unsyncedIds = new Set((await db.unsynced(profileKey)).map((e) => e.id));
  let pushed = 0;
  for (const [month, entries] of groupByMonth(local)) {
    const name = logFile(month);
    const pending = entries.filter((e) => unsyncedIds.has(e.id)).map((e) => e.id);
    if (listed.has(name) && !remote.has(name)) {
      // Unchanged since the last sync: it already holds every synced entry of the month.
      if (!pending.length) continue;
      await fetchFile(name);
    }
    let added = 0;
    const wrote = await put(name, (current) => {
      const have = rawEntries(current?.json);
      const onServer = new Set(have.map((e) => e.id));
      added = entries.filter((e) => !onServer.has(e.id)).length;
      return added ? { entries: mergeEntries(have, entries) } : null;
    }, `sync ${profileKey} ${month}`);
    if (wrote) pushed += added;
    // 8. Every entry of this month is now on the server.
    if (pending.length) await db.markSynced(pending);
  }

  // 7. Upload profile.json when it is missing or differs from the merged profile.
  let existed = firstProfile !== null;
  const wrote = await put(PROFILE_FILE, async (current) => {
    if (current) existed = true;
    const doc = profileDoc(current === firstProfile ? merged : await mergeLocal(current));
    return current && stable(doc) === stable(profileDoc(current.json)) ? null : doc;
  }, `sync ${profileKey} profile`);

  // 8. Remember what the server holds now.
  await db.setMeta(metaKey, { shas: Object.fromEntries(shas), lastSync: at().toISOString() });
  return { pulled: stats.pulled, pushed, created: wrote && !existed, existed };
}

// --- clients ---------------------------------------------------------------------------------

/** fetch with a time limit: a hung connection ends as an error instead of a stuck sync. */
function withTimeout(fetch, ms) {
  return (url, init = {}) => {
    const ctrl = new AbortController();
    const id = setTimeout(() => ctrl.abort(), ms);
    return Promise.resolve(fetch(url, { ...init, signal: ctrl.signal })).finally(() => clearTimeout(id));
  };
}

/** A GitHub client whose requests time out. */
export function githubClient({ token, repo, fetch = globalThis.fetch }) {
  return createGitHubClient({ token, repo, fetch: withTimeout(fetch, TIMEOUT_MS) });
}

/** The client for the token and repo saved on this device, or null when no token is saved. */
export async function clientFromMeta(db, makeClient = githubClient) {
  const token = await db.getMeta('token');
  if (!token) return null;
  const repo = (await db.getMeta('repo')) || DEFAULT_REPO;
  return makeClient({ token, repo });
}

// --- the manager -----------------------------------------------------------------------------

/**
 * Syncs every profile on this device in the background, the active one first. One sync
 * runs at a time; a trigger during a run queues exactly one more run. It never throws:
 * a failure only changes the status line, and studying carries on.
 * Reasons: 'open', 'visible', 'session-end', 'answers' (every 20) and 'manual'.
 */
export function createSyncManager({ store, db, getClient, makeClient = githubClient, now = () => new Date() }) {
  let running = null;
  let again = false;
  let stopped = false;
  let generation = 0; // bumped by connect and disconnect: an older run's outcome is dropped

  const report = (patch) => {
    if (!stopped) store.setSync(patch);
  };

  // Whenever the run changed this profile on the device, even if it then failed (say the
  // connection dropped at an upload), the store loads it again: through the write chain,
  // and only when it is the active profile.
  async function syncOne(client, key) {
    const stats = {};
    try {
      return await syncProfile({ db, client, profileKey: key, now, exclusive: store.exclusive, stats });
    } finally {
      if (stats.pulled > 0 || stats.profileChanged) {
        await store.reloadProfile(key).catch(() => {}); // the sync's own error, if any, is the one to report
      }
    }
  }

  async function runOnce() {
    const gen = generation;
    let status = 'idle';
    let error = null;
    try {
      const client = await getClient();
      if (!client) status = 'off';
      else {
        // Connected or disconnected meanwhile: the newer status stands.
        if (gen === generation) report({ status: 'syncing' });
        const active = store.get().profile?.key ?? null;
        const keys = (await db.listProfiles()).map((p) => p.key)
          .sort((a, b) => (b === active) - (a === active));
        for (const key of keys) await syncOne(client, key);
      }
    } catch (e) {
      error = errorKind(e);
    }
    try {
      if (gen === generation) report({ status, error: status === 'off' ? null : error });
      await store.refreshSyncInfo();
    } catch {
      // the status line is best effort
    }
  }

  function trigger(reason) { // eslint-disable-line no-unused-vars
    if (stopped) return Promise.resolve();
    if (running) {
      again = true;
      return running;
    }
    running = (async () => {
      try {
        do {
          again = false;
          await runOnce();
        } while (again && !stopped);
      } finally {
        running = null;
      }
    })();
    return running;
  }

  async function testClient(client) {
    try {
      const r = await client.test();
      return r?.ok ? 'ok' : KINDS.has(r?.kind) ? r.kind : 'http';
    } catch (e) {
      return errorKind(e);
    }
  }

  /**
   * Saves a token (or, with token null, keeps the saved one) and a repo, after testing them.
   * A token the repo rejects is not saved; one that cannot be checked now (offline) is.
   * Returns { ok, saved, kind } with kind for testText(), or { ok: false, error } for bad input.
   */
  async function connect({ token = null, repo = '' } = {}) {
    let t = null;
    if (token != null) {
      const c = checkToken(token);
      if (!c.ok) return { ok: false, saved: false, kind: null, error: c.error };
      t = c.token;
    }
    const r = checkRepo(repo);
    if (!r.ok) return { ok: false, saved: false, kind: null, error: r.error };
    if (t == null) t = await db.getMeta('token');
    if (!t) return { ok: false, saved: false, kind: null, error: TOKEN_ERROR };

    let kind;
    try {
      kind = await testClient(makeClient({ token: t, repo: r.repo }));
    } catch (e) {
      kind = errorKind(e);
    }
    if (kind === 'auth' || kind === 'notfound') return { ok: false, saved: false, kind };
    await db.setMeta('token', t);
    await db.setMeta('repo', r.repo);
    generation++;
    report({ status: 'idle', repo: r.repo, error: null });
    trigger('manual');
    return { ok: kind === 'ok', saved: true, kind };
  }

  /** Tests the saved connection; a problem shows in the status line, success syncs. */
  async function test() {
    let kind;
    try {
      const client = await getClient();
      if (!client) return { ok: false, kind: 'off' };
      kind = await testClient(client);
    } catch (e) {
      kind = errorKind(e);
    }
    if (kind === 'ok') trigger('manual');
    else report({ error: kind });
    return { ok: kind === 'ok', kind };
  }

  /** Forgets the token on this device. Progress and the repo name stay. */
  async function disconnect() {
    await db.setMeta('token', null);
    generation++;
    report({ status: 'off', error: null });
  }

  /**
   * For a profile just added on this device: when the repo already has it, syncs it now and
   * returns its name for "Welcome back". Returns null when it is new, when sync is off,
   * on any problem (the next sync merges), or when the repo takes too long to answer.
   */
  async function welcome(key) {
    const work = (async () => {
      const client = await getClient();
      if (!client) return null;
      if (!(await client.getJson(`profiles/${key}/profile.json`))) return null;
      await syncOne(client, key);
      report({ error: null });
      return (await db.getProfile(key))?.name ?? null;
    })().catch((e) => {
      report({ error: errorKind(e) });
      return null;
    });
    let timer;
    const late = new Promise((resolve) => { timer = setTimeout(() => resolve(null), WELCOME_WAIT_MS); });
    try {
      return await Promise.race([work, late]);
    } finally {
      clearTimeout(timer);
    }
  }

  function stop() {
    stopped = true;
    if (store.syncer === manager) store.attachSync(null);
  }

  const manager = { trigger, stop, connect, test, disconnect, welcome };
  store.attachSync(manager);
  return manager;
}
