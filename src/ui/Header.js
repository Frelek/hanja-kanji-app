// Pieces shared by the picker and the Study screen: avatar, profile chip, language switch.
import { html } from '../../vendor/htm-preact.mjs';
import { syncLabel } from '../sync/sync.js';
import { routeHref } from './route.js';

// Names are NFC letters and digits only, so the first code point is the first letter.
export const initial = (name) => ([...String(name ?? '')][0] ?? '').toLocaleUpperCase();

export function Avatar({ name }) {
  return html`<span class="avatar" aria-hidden="true">${initial(name)}</span>`;
}

/** The live sync status. A token problem links to Settings, where it is fixed. */
export function SyncStatus({ sync, now }) {
  const text = syncLabel(sync, now);
  if (sync.status !== 'off' && sync.error === 'auth') {
    return html`<a class="sync-status sync-fix" href=${routeHref('settings')}>${text}</a>`;
  }
  return html`<p class="sync-status">${text}</p>`;
}

export function ProfileBar({ profile, sync, now }) {
  return html`
    <header class="topbar">
      <p class="who">
        <${Avatar} name=${profile.name} />
        <span class="who-name">${profile.name}</span>
        <span class="who-tag">#${profile.tag}</span>
      </p>
      <${SyncStatus} sync=${sync} now=${now} />
    </header>`;
}

export function LangSwitch({ lang, onChange }) {
  return html`
    <div class="seg" role="group" aria-label="Language">
      <button type="button" class="cjk" lang="ja" aria-pressed=${lang === 'ja'}
        onClick=${() => lang !== 'ja' && onChange('ja')}>日本語</button>
      <button type="button" class="hangul" lang="ko" aria-pressed=${lang === 'ko'}
        onClick=${() => lang !== 'ko' && onChange('ko')}>한국어</button>
    </div>`;
}
