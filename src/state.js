// App state: one store, plain actions, and a Preact hook to read it.
import { useState, useEffect } from '../vendor/htm-preact.mjs';
import { replay } from './engine/fsrs.js';
import { defaultSettings } from './store/db.js';
import { validateProfileInput } from './ui/profile-input.js';

export const LANGS = ['ja', 'ko'];

const byName = (a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' })
  || (a.key < b.key ? -1 : a.key > b.key ? 1 : 0);

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

  async function addProfile(name, tag) {
    const v = validateProfileInput(name, tag);
    if (!v.ok) return { ok: false, error: v.error };
    const existing = await db.getProfile(v.key);
    if (!existing) {
      const profile = {
        key: v.key,
        name: v.name,
        tag: v.tag,
        createdAt: now().toISOString(),
        settings: defaultSettings(),
        settingsUpdatedAt: {},
      };
      await db.putProfile(profile);
      set({ profiles: [...state.profiles, profile].sort(byName) });
    }
    await selectProfile(v.key);
    return { ok: true, error: null, key: v.key, existed: Boolean(existing) };
  }

  async function setLang(lang) {
    if (!LANGS.includes(lang)) throw new Error(`Unknown language: ${lang}`);
    set({ lang });
    await db.setMeta('lang', lang);
  }

  async function init() {
    const [profiles, lang, active] = await Promise.all([
      db.listProfiles(),
      db.getMeta('lang'),
      db.getMeta('activeProfile'),
    ]);
    set({ profiles: [...profiles].sort(byName), lang: LANGS.includes(lang) ? lang : 'ja' });
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
