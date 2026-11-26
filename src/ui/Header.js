// Pieces shared by the picker and the Study screen: avatar, profile chip, language switch.
import { html } from '../../vendor/htm-preact.mjs';

// Names are NFC letters and digits only, so the first code point is the first letter.
export const initial = (name) => ([...String(name ?? '')][0] ?? '').toLocaleUpperCase();

export function Avatar({ name }) {
  return html`<span class="avatar" aria-hidden="true">${initial(name)}</span>`;
}

const SYNC_LABEL = { off: 'Sync off' };

export function ProfileBar({ profile, sync }) {
  return html`
    <header class="topbar">
      <p class="who">
        <${Avatar} name=${profile.name} />
        <span class="who-name">${profile.name}</span>
        <span class="who-tag">#${profile.tag}</span>
      </p>
      <p class="sync-status">${SYNC_LABEL[sync.status] ?? ''}</p>
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
