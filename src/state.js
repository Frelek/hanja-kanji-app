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

const notImplemented = () => { throw new Error('not implemented'); };

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
    sync: { status: 'off', waiting: 0, lastSync: null, error: null },
  };
  const subscribers = new Set();
  const set = (patch) => {
    state = { ...state, ...patch };
    for (const fn of subscribers) fn(state);
  };

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
        set({ profile: null, entries: [], states: new Map(), prevState: new Map(), canUndo: false });
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
      set({ profile, entries, states, prevState, canUndo: false });
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
    await selectProfile(v.key);
    return { ok: true, error: null, key: v.key, existed };
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
      set({ entries, ...derived, canUndo: true });
      return { ok: true, error: null, id: entry.id };
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
      set({ entries, ...replay(entries, (lang) => profile.settings[lang]), canUndo: undoStack.length > 0 });
      return { ok: true, error: null, card: last.card };
    });
  }

  /** A new study session starts: earlier answers can no longer be undone. */
  function startSession() {
    undoStack = [];
    if (state.canUndo) set({ canUndo: false });
  }

  async function init() {
    const ticket = langTicket;
    const [profiles, lang, active] = await Promise.all([
      db.listProfiles(),
      db.getMeta('lang'),
      db.getMeta('activeProfile'),
    ]);
    const patch = { profiles: profiles.reduce(withProfile, state.profiles) };
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
    now,
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
      updateSettings: notImplemented, // Task 14
      resetLang: notImplemented, // Task 14
    },
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
