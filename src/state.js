// App state: one store, plain actions, and a Preact hook to read it.
import { useState, useEffect } from '../vendor/htm-preact.mjs';
import { replay } from './engine/fsrs.js';
import { defaultSettings } from './store/db.js';
import { validateProfileInput } from './ui/profile-input.js';

export const LANGS = ['ja', 'ko'];

const byName = (a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' })
  || (a.key < b.key ? -1 : a.key > b.key ? 1 : 0);

/** The list with `p` in it once (replacing any profile with the same key), sorted by name. */
const withProfile = (list, p) => [...list.filter((x) => x.key !== p.key), p].sort(byName);

const LANG_ERROR = 'Could not save the language on this device.';

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
    sync: { status: 'off', waiting: 0, lastSync: null, error: null },
  };
  const subscribers = new Set();
  const set = (patch) => {
    state = { ...state, ...patch };
    for (const fn of subscribers) fn(state);
  };

  // The last call wins when profiles are switched quickly.
  let selecting = 0;

  async function selectProfile(key) {
    const ticket = ++selecting;
    if (key == null) {
      await db.setMeta('activeProfile', null);
      if (ticket === selecting) set({ profile: null, entries: [], states: new Map(), prevState: new Map() });
      return;
    }
    const profile = await db.getProfile(key);
    if (!profile) throw new Error(`No profile ${key} on this device`);
    const entries = await db.getEntries(key);
    const { states, prevState } = replay(entries, (lang) => profile.settings[lang]);
    await db.setMeta('activeProfile', key);
    if (ticket === selecting) set({ profile, entries, states, prevState });
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
    subscribe(fn) {
      subscribers.add(fn);
      return () => subscribers.delete(fn);
    },
    init,
    actions: {
      selectProfile,
      addProfile,
      setLang,
      answer: notImplemented, // Task 12
      undo: notImplemented, // Task 12
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
