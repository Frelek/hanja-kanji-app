// Hash routes: #/study, #/session, #/characters/<levelId>[?c=<cardId>], #/practice/<levelId>,
// #/stats, #/settings. Level ids and card ids are URL-encoded; ?c= names the open detail sheet.
import { useState, useEffect, useMemo } from '../../vendor/htm-preact.mjs';

const PLAIN = new Set(['study', 'session', 'stats', 'settings']);

const decode = (s) => {
  try { return decodeURIComponent(s); } catch { return s; }
};

/** The ?c= value of a query string, or null. */
function sheetParam(query) {
  if (query == null) return null;
  for (const pair of query.split('&')) {
    const eq = pair.indexOf('=');
    if (eq > 0 && pair.slice(0, eq) === 'c') return decode(pair.slice(eq + 1)) || null;
  }
  return null;
}

export function parseRoute(hash) {
  const raw = String(hash ?? '').replace(/^#/, '');
  const q = raw.indexOf('?');
  const path = q < 0 ? raw : raw.slice(0, q);
  const [name, level, ...rest] = path.split('/').filter(Boolean);
  if (PLAIN.has(name) && level === undefined) return { name };
  if (name === 'characters' && rest.length === 0) {
    const route = { name, level: level === undefined ? null : decode(level) };
    const char = sheetParam(q < 0 ? null : raw.slice(q + 1));
    if (char) route.char = char;
    return route;
  }
  if (name === 'practice' && level !== undefined && rest.length === 0) return { name, level: decode(level) };
  return { name: 'study', redirect: true };
}

export function routeHref(name, level, char) {
  if (name === 'practice' && level) return `#/practice/${encodeURIComponent(level)}`;
  if (name !== 'characters' || !level) return `#/${name}`;
  const base = `#/characters/${encodeURIComponent(level)}`;
  return char ? `${base}?c=${encodeURIComponent(char)}` : base;
}

// useRoute listeners, told synchronously by go(): 'hashchange' fires a task later, which
// would let one frame of the old route paint after a store change.
const listeners = new Set();

/**
 * Navigates to a hash; `replace` swaps the history entry instead of adding one.
 * `state` is stored on the new entry (history.state).
 */
export function go(hash, { replace = false, state } = {}) {
  if (location.hash === hash) return;
  if (state !== undefined) {
    // pushState/replaceState do not fire 'hashchange'; the listeners below cover it.
    const url = `${location.pathname}${location.search}${hash}`;
    if (replace) history.replaceState(state, '', url);
    else history.pushState(state, '', url);
  } else if (replace) location.replace(hash);
  else location.hash = hash;
  for (const fn of listeners) fn();
}

export function useRoute() {
  const [hash, setHash] = useState(() => location.hash);
  useEffect(() => {
    const sync = () => setHash(location.hash);
    addEventListener('hashchange', sync);
    // Back/forward over entries made by pushState fire only 'popstate'.
    addEventListener('popstate', sync);
    listeners.add(sync);
    return () => {
      removeEventListener('hashchange', sync);
      removeEventListener('popstate', sync);
      listeners.delete(sync);
    };
  }, []);
  return useMemo(() => parseRoute(hash), [hash]);
}
