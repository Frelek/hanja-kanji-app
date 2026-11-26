// App shell: picks the profile picker or a tab screen from the store and the hash route.
import { html, useEffect } from '../../vendor/htm-preact.mjs';
import { useStore } from '../state.js';
import { useRoute, routeHref, go } from './route.js';
import { ProfilePicker } from './ProfilePicker.js';
import { Home } from './Home.js';
import { Session } from './Session.js';

const TABS = [
  ['study', 'Study'],
  ['characters', 'Characters'],
  ['stats', 'Stats'],
  ['settings', 'Settings'],
];

// appearance: 'auto' follows the system; 'light' / 'dark' force a theme.
function useAppearance(appearance) {
  useEffect(() => {
    const root = document.documentElement;
    if (appearance === 'light' || appearance === 'dark') root.dataset.theme = appearance;
    else delete root.dataset.theme;
  }, [appearance]);
}

export function App({ store }) {
  const s = useStore(store);
  const route = useRoute();
  useAppearance(s.profile?.settings?.appearance);

  const levels = s.data[s.lang]?.levels ?? [];
  const firstLevel = levels[0]?.id ?? null;
  const levelOk = route.name === 'characters' && levels.some((l) => l.id === route.level);

  useEffect(() => {
    if (!s.profile) return;
    if (route.redirect) go(routeHref('study'), { replace: true });
    else if (route.name === 'characters' && !levelOk && firstLevel) go(routeHref('characters', firstLevel), { replace: true });
  }, [s.profile, route, levelOk, firstLevel]);

  useEffect(() => { scrollTo(0, 0); }, [route.name, route.level]);

  if (!s.profile) return html`<${ProfilePicker} store=${store} profiles=${s.profiles} />`;

  // A study session takes the whole screen; Exit goes back to the tabs.
  if (route.name === 'session') return html`<${Session} store=${store} s=${s} />`;

  const active = route.name;
  return html`
    <div class="shell">
      <main class="screen">${screenFor(route, s, store, levelOk)}</main>
      <nav class="tabs" aria-label="Main">
        <div class="tabs-inner">
          ${TABS.map(([id, label]) => html`
            <a class="tab" href=${id === 'characters' ? routeHref('characters', firstLevel) : routeHref(id)}
              aria-current=${active === id ? 'page' : null}>${label}</a>`)}
        </div>
      </nav>
    </div>`;
}

function screenFor(route, s, store, levelOk) {
  switch (route.name) {
    case 'characters':
      return html`
        <h1 class="screen-title">Characters${levelOk ? html` <span class="screen-title-sub">${route.level}</span>` : ''}</h1>
        <p class="card note">The characters screen comes in a later step.</p>`;
    case 'stats':
      return html`
        <h1 class="screen-title">Stats</h1>
        <p class="card note">Stats come in a later step.</p>`;
    case 'settings':
      return html`
        <h1 class="screen-title">Settings</h1>
        <p class="card note">Settings come in a later step.</p>
        <button type="button" class="btn btn-quiet" onClick=${() => store.actions.selectProfile(null)}>Switch profile</button>`;
    default:
      return html`<${Home} store=${store} s=${s} />`;
  }
}
