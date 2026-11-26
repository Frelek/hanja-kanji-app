// App state: one store, plain actions, and a Preact hook to read it.
import { useState, useEffect } from '../vendor/htm-preact.mjs';
import { replay, newCard, makeScheduler, RATING } from './engine/fsrs.js';
import { buildQueue } from './engine/queue.js';
import { defaultSettings, deviceId } from './store/db.js';
import { validateProfileInput } from './ui/profile-input.js';

export const LANGS = ['ja', 'ko'];

const byName = (a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' })
  || (a.key < b.key ? -1 : a.key > b.key ? 1 : 0);

/** The list with `p` in it once (replacing any profile with the same key), sorted by name. */
const withProfile = (list, p) => [...list.filter((x) => x.key !== p.key), p].sort(byName);

const LANG_ERROR = 'Could not save the language on this device.';
const ANSWER_ERROR = 'Could not save that answer on this device. Try again.';
const UNDO_ERROR = 'Could not undo on this device. Try again.';

const RATINGS = new Set(Object.values(RATING));
const langOf = (cardId) => cardId.slice(0, cardId.indexOf(':'));

/** Study settings for one language, as buildQueue and the scheduler take them. */
export const studySettings = (profile, lang) =>
  ({ ...profile.settings[lang], dayStartHour: profile.settings.dayStartHour });

const EMPTY_QUEUE = { learning: [], review: [], fresh: [], counts: { new: 0, learning: 0, review: 0 } };

/**
 * Today's queue for the current profile and language. Only that language's answers
 * count against its daily limits: each language has its own new-card and review caps.
 */
export function studyQueue(state, now) {
  const { profile, lang } = state;
  const chars = state.data[lang]?.chars;
  if (!profile || !chars) return EMPTY_QUEUE;
  const prefix = `${lang}:`;
  return buildQueue({
    chars,
    states: state.states,
    prevState: state.prevState,
    entries: state.entries.filter((e) => e.type === 'review' && e.card.startsWith(prefix)),
    settings: studySettings(profile, lang),
    now,
  });
}

const STEP_RE = /^\d+[mhd]$/;
const isInt = (v, lo, hi) => Number.isInteger(v) && v >= lo && v <= hi;
const stepsOk = (v) => Array.isArray(v) && v.length > 0
  && v.every((t) => typeof t === 'string' && STEP_RE.test(t) && parseInt(t, 10) >= 1);

// Per-language study settings, then the shared ones. Each checker returns an error or null.
const STUDY_CHECKS = {
  newPerDay: (v) => (isInt(v, 0, 100) ? null : 'Enter a whole number from 0 to 100.'),
  maxReviews: (v) => (isInt(v, 0, 9999) ? null : 'Enter a whole number from 0 to 9999.'),
  retention: (v) => (typeof v === 'number' && v >= 0.8 && v <= 0.95 ? null : 'Enter a value from 0.80 to 0.95.'),
  learningSteps: (v) => (stepsOk(v) ? null : 'Use steps like 1m 10m (m, h or d, at least 1m).'),
  relearningSteps: (v) => (stepsOk(v) ? null : 'Use steps like 10m (m, h or d, at least 1m).'),
};
const SHARED_CHECKS = {
  dayStartHour: (v) => (isInt(v, 0, 23) ? null : 'Enter a whole hour from 0 to 23.'),
  appearance: (v) => (['auto', 'light', 'dark'].includes(v) ? null : 'Choose Auto, Light or Dark.'),
};

/** The error for setting `path` to `value`, or null when it is allowed. */
export function settingError(path, value) {
  const parts = String(path).split('.');
  if (parts.length === 1 && SHARED_CHECKS[parts[0]]) return SHARED_CHECKS[parts[0]](value);
  if (parts.length === 2 && LANGS.includes(parts[0]) && STUDY_CHECKS[parts[1]]) return STUDY_CHECKS[parts[1]](value);
  return `Unknown setting: ${path}`;
}

const SETTINGS_ERROR = 'Could not save the setting on this device. Try again.';
const RESET_ERROR = 'Could not reset on this device. Try again.';

/** A sync runs after this many answers. */
export const ANSWERS_PER_SYNC = 20;

export function createStore({ db, now = () => new Date(), data = { ja: null, ko: null } }) {
  let state = {
    profiles: [],
    profile: null,
    lang: 'ja',
    data,
    entries: [],
    states: new Map(),
    prevState: new Map(),
    canUndo: false,
    // status: 'off' (no token) | 'idle' | 'syncing'. error: the last sync's problem
    // (a SyncError kind) or null. waiting: unsynced entries of the active profile.
    // lastSync: when the active profile last synced. repo: the saved repo, or null.
    sync: { status: 'off', waiting: 0, lastSync: null, error: null, repo: null },
    // The name to greet with "Welcome back" after a profile came down from the repo.
    welcome: null,
  };
  const subscribers = new Set();
  const set = (patch) => {
    state = { ...state, ...patch };
    for (const fn of subscribers) fn(state);
  };
  const setSync = (patch) => set({ sync: { ...state.sync, ...patch } });
  // One more unsynced entry for the active profile, merged into a set() patch.
  const oneMoreWaiting = () => ({ sync: { ...state.sync, waiting: state.sync.waiting + 1 } });

  // The sync manager (src/sync/sync.js) attaches itself; without one, sync is off.
  let syncer = null;
  let answersSinceSync = 0;

  // Answers of the current study session, newest last: what undo can reach.
  let undoStack = [];

  // The last call wins when profiles are switched quickly.
  let selecting = 0;

  async function selectProfile(key) {
    const ticket = ++selecting;
    if (key == null) {
      await db.setMeta('activeProfile', null);
      if (ticket === selecting) {
        undoStack = [];
        set({
          profile: null, entries: [], states: new Map(), prevState: new Map(), canUndo: false,
          welcome: null, sync: { ...state.sync, waiting: 0, lastSync: null },
        });
      }
      return;
    }
    const profile = await db.getProfile(key);
    if (!profile) throw new Error(`No profile ${key} on this device`);
    const entries = await db.getEntries(key);
    const { states, prevState } = replay(entries, (lang) => profile.settings[lang]);
    await db.setMeta('activeProfile', key);
    if (ticket === selecting) {
      undoStack = [];
      set({ profile, entries, states, prevState, canUndo: false, welcome: null });
      await refreshSyncInfo();
    }
  }

  // Profiles being created, by key: a second add of the same key waits for the first
  // instead of racing it through getProfile/putProfile.
  const creating = new Map();

  async function createIfMissing(v) {
    if (await db.getProfile(v.key)) return true;
    const profile = {
      key: v.key,
      name: v.name,
      tag: v.tag,
      createdAt: now().toISOString(),
      settings: defaultSettings(),
      settingsUpdatedAt: {},
    };
    await db.putProfile(profile);
    set({ profiles: withProfile(state.profiles, profile) });
    return false;
  }

  /**
   * Adds a profile on this device and selects it. A profile new to this device that the
   * sync repo already has is synced first and greeted: `welcome` is its name, else null.
   */
  async function addProfile(name, tag) {
    const v = validateProfileInput(name, tag);
    if (!v.ok) return { ok: false, error: v.error };
    let existed;
    const pending = creating.get(v.key);
    if (pending) {
      await pending;
      existed = true;
    } else {
      const job = createIfMissing(v);
      creating.set(v.key, job);
      try {
        existed = await job;
      } finally {
        creating.delete(v.key);
      }
    }
    let welcome = null;
    if (!existed && syncer) {
      try {
        welcome = (await syncer.welcome(v.key)) ?? null;
      } catch {
        welcome = null; // offline or a sync problem: the next sync merges it
      }
    }
    await selectProfile(v.key);
    if (welcome && state.profile?.key === v.key) set({ welcome });
    return { ok: true, error: null, key: v.key, existed, welcome };
  }

  // Language writes run one after another, and the state shows what was stored,
  // so a failed write or two quick taps cannot leave the screen and the db disagreeing.
  let langTicket = 0;
  let langWrites = Promise.resolve();
  let storedLang = state.lang;

  async function setLang(lang) {
    if (!LANGS.includes(lang)) throw new Error(`Unknown language: ${lang}`);
    const ticket = ++langTicket;
    const write = langWrites.then(() => db.setMeta('lang', lang));
    langWrites = write.catch(() => {});
    let ok = true;
    try {
      await write;
      storedLang = lang;
    } catch {
      ok = false;
    }
    if (ticket === langTicket && state.lang !== storedLang) set({ lang: storedLang });
    return ok ? { ok: true, error: null } : { ok: false, error: LANG_ERROR };
  }

  // Answers and undos are written one after another, in call order, so an undo
  // pressed straight after an answer targets that answer.
  let logWrites = Promise.resolve();
  const serial = (job) => {
    const run = logWrites.then(job);
    logWrites = run.catch(() => {});
    return run;
  };

  let dev = null;
  const getDevice = async () => (dev ??= await deviceId(db));

  // Entry ids are `${deviceId}-${ms}-${n}`; n counts up for the life of this store.
  let seq = 0;
  const entryId = (d) => `${d}-${Date.now()}-${++seq}`;

  /**
   * Logs one answer and moves that card on. The card only advances once the entry is
   * stored; a failed write leaves everything as it was and returns the error to show.
   */
  function answer(cardId, rating, ms) {
    if (!RATINGS.has(rating)) return Promise.reject(new Error(`Unknown rating: ${rating}`));
    const profile = state.profile;
    if (!profile) return Promise.reject(new Error('No profile selected'));
    return serial(async () => {
      if (state.profile?.key !== profile.key) return { ok: false, error: ANSWER_ERROR };
      let entry;
      try {
        const d = await getDevice();
        entry = {
          id: entryId(d), type: 'review', card: cardId, rating,
          at: now().toISOString(), ms: Math.max(0, Math.round(ms) || 0), dev: d,
        };
        await db.addEntries(profile.key, [entry]);
      } catch {
        return { ok: false, error: ANSWER_ERROR };
      }
      // Stored, but the profile changed meanwhile: its next load replays the entry.
      if (state.profile?.key !== profile.key) return { ok: true, error: null, id: entry.id };

      const entries = [...state.entries, entry];
      let derived;
      if (state.entries.some((e) => e.at > entry.at)) {
        // Stamped before an entry already in the log (the clock was set back):
        // only a replay puts it in its place.
        derived = replay(entries, (lang) => profile.settings[lang]);
      } else {
        const at = new Date(entry.at);
        const card = state.states.get(cardId) ?? newCard(at);
        const states = new Map(state.states);
        states.set(cardId, makeScheduler(profile.settings[langOf(cardId)]).next(card, rating, at));
        const prevState = new Map(state.prevState);
        prevState.set(entry.id, card.state);
        derived = { states, prevState };
      }
      undoStack = [...undoStack, { id: entry.id, card: cardId }];
      set({ entries, ...derived, canUndo: true, ...oneMoreWaiting() });
      return { ok: true, error: null, id: entry.id };
    }).then((r) => {
      if (r.ok && ++answersSinceSync >= ANSWERS_PER_SYNC) {
        answersSinceSync = 0;
        syncer?.trigger('answers');
      }
      return r;
    });
  }

  /** Takes back the newest answer of this session: logs an undo entry, then replays. */
  function undo() {
    return serial(async () => {
      const profile = state.profile;
      const last = undoStack[undoStack.length - 1];
      if (!profile || !last) return { ok: false, error: null, card: null };
      let entry;
      try {
        const d = await getDevice();
        entry = { id: entryId(d), type: 'undo', target: last.id, at: now().toISOString(), dev: d };
        await db.addEntries(profile.key, [entry]);
      } catch {
        return { ok: false, error: UNDO_ERROR, card: null };
      }
      if (state.profile?.key !== profile.key) return { ok: true, error: null, card: last.card };
      undoStack = undoStack.slice(0, -1);
      const entries = [...state.entries, entry];
      set({
        entries, ...replay(entries, (lang) => profile.settings[lang]), canUndo: undoStack.length > 0,
        ...oneMoreWaiting(),
      });
      return { ok: true, error: null, card: last.card };
    });
  }

  /** A new study session starts: earlier answers can no longer be undone. */
  function startSession() {
    undoStack = [];
    if (state.canUndo) set({ canUndo: false });
  }

  /** A study session finished or was left: its answers go to the repo. */
  function endSession() {
    syncer?.trigger('session-end');
  }

  /** The Sync now button. Resolves when the sync is done; never rejects. */
  function syncNow() {
    return syncer ? syncer.trigger('manual') : Promise.resolve();
  }

  function clearWelcome() {
    if (state.welcome) set({ welcome: null });
  }

  /**
   * Sets one setting, stamps it for sync, stores the profile, then replays with the new values.
   * It starts from the stored profile, not state.profile: a sync may have merged newer remote
   * settings into the db that the state does not show yet, and they must not be reverted.
   */
  async function updateSettings(path, value) {
    const error = settingError(path, value);
    if (error) return { ok: false, error };
    return serial(async () => {
      const key = state.profile?.key;
      if (!key) return { ok: false, error: SETTINGS_ERROR };
      let next;
      try {
        const profile = (await db.getProfile(key)) ?? state.profile;
        const parts = path.split('.');
        const settings = { ...profile.settings };
        if (parts.length === 2) settings[parts[0]] = { ...settings[parts[0]], [parts[1]]: value };
        else settings[parts[0]] = value;
        next = {
          ...profile,
          settings,
          settingsUpdatedAt: { ...profile.settingsUpdatedAt, [path]: now().toISOString() },
        };
        await db.putProfile(next);
      } catch {
        return { ok: false, error: SETTINGS_ERROR };
      }
      if (state.profile?.key !== key) return { ok: true, error: null };
      set({
        profile: next,
        profiles: withProfile(state.profiles, next),
        ...replay(state.entries, (lang) => next.settings[lang]),
      });
      return { ok: true, error: null };
    });
  }

  /** Logs a reset of one language, then replays: that language starts over, the other is kept. */
  function resetLang(lang) {
    if (!LANGS.includes(lang)) return Promise.resolve({ ok: false, error: `Unknown language: ${lang}` });
    return serial(async () => {
      const profile = state.profile;
      if (!profile) return { ok: false, error: RESET_ERROR };
      let entry;
      try {
        const d = await getDevice();
        entry = { id: entryId(d), type: 'reset', lang, at: now().toISOString(), dev: d };
        await db.addEntries(profile.key, [entry]);
      } catch {
        return { ok: false, error: RESET_ERROR };
      }
      if (state.profile?.key !== profile.key) return { ok: true, error: null };
      undoStack = undoStack.filter((u) => langOf(u.card) !== lang);
      const entries = [...state.entries, entry];
      set({
        entries, ...replay(entries, (l) => profile.settings[l]), canUndo: undoStack.length > 0,
        ...oneMoreWaiting(),
      });
      return { ok: true, error: null };
    });
  }

  /**
   * After a sync changed a profile's entries or settings in the db: the profile list shows
   * the stored name, and the active profile is loaded and replayed again. It runs in the
   * write chain, so it never lands between an answer's write and its state update.
   * Resolves to true when the active state was reloaded.
   */
  function reloadProfile(key) {
    return serial(async () => {
      const profile = await db.getProfile(key);
      if (!profile) return false;
      const listed = state.profiles.find((p) => p.key === key);
      if (state.profile?.key !== key) {
        if (listed && listed.name !== profile.name) set({ profiles: withProfile(state.profiles, profile) });
        return false;
      }
      const entries = await db.getEntries(key);
      if (state.profile?.key !== key) return false;
      set({
        profile,
        profiles: withProfile(state.profiles, profile),
        entries,
        ...replay(entries, (lang) => profile.settings[lang]),
      });
      return true;
    });
  }

  /** Reads the active profile's unsynced count and last sync time into `sync`. Never rejects. */
  function refreshSyncInfo() {
    return serial(async () => {
      const key = state.profile?.key ?? null;
      let waiting = 0;
      let lastSync = null;
      if (key) {
        const [pending, meta] = await Promise.all([db.unsynced(key), db.getMeta(`sync:${key}`)]);
        waiting = pending.length;
        lastSync = meta?.lastSync ?? null;
      }
      if ((state.profile?.key ?? null) === key) setSync({ waiting, lastSync });
    }).catch(() => {});
  }

  async function init() {
    const ticket = langTicket;
    const [profiles, lang, active, token, repo] = await Promise.all([
      db.listProfiles(),
      db.getMeta('lang'),
      db.getMeta('activeProfile'),
      db.getMeta('token'),
      db.getMeta('repo'),
    ]);
    // Only whether a token is saved: the token itself never enters the state.
    const patch = {
      profiles: profiles.reduce(withProfile, state.profiles),
      sync: { ...state.sync, status: token ? 'idle' : 'off', repo: typeof repo === 'string' && repo ? repo : null },
    };
    // A language chosen while init was reading wins over the value it read.
    if (ticket === langTicket) {
      storedLang = LANGS.includes(lang) ? lang : 'ja';
      patch.lang = storedLang;
    }
    set(patch);
    if (active && profiles.some((p) => p.key === active)) await selectProfile(active);
  }

  return {
    get: () => state,
    subscribe(fn) {
      subscribers.add(fn);
      return () => subscribers.delete(fn);
    },
    init,
    actions: {
      selectProfile,
      addProfile,
      setLang,
      answer,
      undo,
      startSession,
      endSession,
      syncNow,
      clearWelcome,
      updateSettings,
      resetLang,
    },
    // For the sync manager.
    attachSync(manager) { syncer = manager; },
    get syncer() { return syncer; },
    setSync,
    exclusive: serial,
    reloadProfile,
    refreshSyncInfo,
  };
}

/** Re-renders the calling component whenever the store changes. */
export function useStore(store) {
  const [state, setState] = useState(() => store.get());
  useEffect(() => {
    setState(store.get());
    return store.subscribe(setState);
  }, [store]);
  return state;
}
