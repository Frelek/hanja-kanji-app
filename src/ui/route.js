// Hash routes: #/study, #/session, #/characters/<levelId>, #/stats, #/settings.
import { useState, useEffect } from '../../vendor/htm-preact.mjs';

const PLAIN = new Set(['study', 'session', 'stats', 'settings']);

const decode = (s) => {
  try { return decodeURIComponent(s); } catch { return s; }
};

export function parseRoute(hash) {
  const [name, level, ...rest] = String(hash ?? '').replace(/^#/, '').split('/').filter(Boolean);
  if (PLAIN.has(name) && level === undefined) return { name };
  if (name === 'characters' && rest.length === 0) return { name, level: level === undefined ? null : decode(level) };
  return { name: 'study', redirect: true };
}

export const routeHref = (name, level) =>
  (name === 'characters' && level ? `#/characters/${encodeURIComponent(level)}` : `#/${name}`);

/** Navigates to a hash; `replace` swaps the history entry instead of adding one. */
export function go(hash, { replace = false } = {}) {
  if (location.hash === hash) return;
  if (replace) location.replace(hash);
  else location.hash = hash;
}

export function useRoute() {
  const [route, setRoute] = useState(() => parseRoute(location.hash));
  useEffect(() => {
    const onChange = () => setRoute(parseRoute(location.hash));
    addEventListener('hashchange', onChange);
    return () => removeEventListener('hashchange', onChange);
  }, []);
  return route;
}
