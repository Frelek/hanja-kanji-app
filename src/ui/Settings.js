// Settings: profile, sync, study (for the current language), appearance, about, reset.
import { html, useState, useEffect, useRef } from '../../vendor/htm-preact.mjs';
import { LangSwitch } from './Header.js';
import { AddProfileForm } from './ProfilePicker.js';
import { About } from './About.js';
import { SyncSettings } from './SyncSettings.js';

const LANG_NAME = { ja: 'Japanese', ko: 'Korean' };
const APPEARANCE = [['auto', 'Auto'], ['light', 'Light'], ['dark', 'Dark']];

/**
 * A labelled text input that commits on blur or Enter. `onCommit(text)` returns
 * {ok, error}; on an error the message shows under the field and the old value returns.
 */
function Field({ id, label, hint, value, onCommit, inputMode }) {
  const [draft, setDraft] = useState(value);
  const [error, setError] = useState(null);
  useEffect(() => { setDraft(value); }, [value]);

  async function commit() {
    if (draft === value) { setError(null); return; }
    const r = await onCommit(draft);
    if (r.ok) setError(null);
    else { setError(r.error); setDraft(value); }
  }

  return html`
    <div class="field set-field">
      <label for=${id}>${label}</label>
      <input id=${id} class="input" type="text" value=${draft} inputmode=${inputMode}
        autocomplete="off" autocapitalize="off" autocorrect="off" spellcheck=${false}
        aria-invalid=${error ? 'true' : 'false'}
        aria-describedby=${error ? `${id}-err` : hint ? `${id}-hint` : null}
        onInput=${(e) => { setDraft(e.currentTarget.value); if (error) setError(null); }}
        onBlur=${commit}
        onKeyDown=${(e) => { if (e.key === 'Enter' && !e.isComposing) { e.preventDefault(); e.currentTarget.blur(); } }} />
      ${hint && !error && html`<p id=${`${id}-hint`} class="set-hint">${hint}</p>`}
      ${error && html`<p id=${`${id}-err`} class="field-error" role="alert">${error}</p>`}
    </div>`;
}

const toNumber = (t) => (String(t).trim() === '' ? NaN : Number(t));
const toSteps = (t) => String(t).trim().split(/\s+/);

function ProfileSection({ store, profile }) {
  const [adding, setAdding] = useState(false);
  return html`
    <section class="card set-section" aria-labelledby="prof-title">
      <h2 id="prof-title" class="set-title">Profile</h2>
      <p class="who set-who"><span class="who-name">${profile.name}</span><span class="who-tag">#${profile.tag}</span></p>
      <div class="set-actions">
        <button type="button" class="btn btn-quiet" onClick=${() => store.actions.selectProfile(null)}>Switch profile</button>
        ${!adding && html`<button type="button" class="btn btn-quiet" onClick=${() => setAdding(true)}>Add profile</button>`}
      </div>
      ${adding && html`<${AddProfileForm} store=${store} onCancel=${() => setAdding(false)} />`}
    </section>`;
}

function StudySection({ store, s }) {
  const { lang, profile } = s;
  const st = profile.settings[lang];
  const set = (path, conv) => (text) => store.actions.updateSettings(path, conv(text));
  const name = LANG_NAME[lang];
  const [pct, setPct] = useState(st.retention);
  const [rErr, setRErr] = useState(null);
  useEffect(() => { setPct(st.retention); }, [st.retention, lang]);

  async function commitRetention(v) {
    const r = await store.actions.updateSettings(`${lang}.retention`, v);
    if (r.ok) setRErr(null);
    else { setRErr(r.error); setPct(st.retention); }
  }

  return html`
    <section class="card set-section" aria-labelledby="study-title">
      <h2 id="study-title" class="set-title">Study: ${name}</h2>
      <${LangSwitch} lang=${lang} onChange=${store.actions.setLang} />
      <${Field} key=${`${lang}-new`} id="st-new" label="New cards per day" inputMode="numeric"
        value=${String(st.newPerDay)} onCommit=${set(`${lang}.newPerDay`, toNumber)} />
      <${Field} key=${`${lang}-max`} id="st-max" label="Max reviews per day" inputMode="numeric"
        value=${String(st.maxReviews)} onCommit=${set(`${lang}.maxReviews`, toNumber)} />
      <${Field} key=${`${lang}-learn`} id="st-learn" label="Learning steps" hint="For example 1m 10m"
        value=${st.learningSteps.join(' ')} onCommit=${set(`${lang}.learningSteps`, toSteps)} />
      <${Field} key=${`${lang}-relearn`} id="st-relearn" label="Relearning steps" hint="For example 10m"
        value=${st.relearningSteps.join(' ')} onCommit=${set(`${lang}.relearningSteps`, toSteps)} />
      <div class="field set-field">
        <label for="st-ret">Desired retention: <span class="set-pct">${Math.round(pct * 100)}%</span></label>
        <input id="st-ret" class="range" type="range" min="0.8" max="0.95" step="0.01" value=${pct}
          aria-valuetext=${`${Math.round(pct * 100)} percent`}
          onInput=${(e) => { setPct(Number(e.currentTarget.value)); setRErr(null); }}
          onChange=${(e) => commitRetention(Math.round(Number(e.currentTarget.value) * 100) / 100)} />
        <div class="range-ends" aria-hidden="true"><span>80%</span><span>95%</span></div>
        ${rErr && html`<p class="field-error" role="alert">${rErr}</p>`}
      </div>
      <${Field} id="st-hour" label="Day starts at (hour, 0 to 23)" inputMode="numeric"
        hint="Shared by both languages"
        value=${String(profile.settings.dayStartHour)} onCommit=${set('dayStartHour', toNumber)} />
    </section>`;
}

function AppearanceSection({ store, profile }) {
  const [error, setError] = useState(null);
  const current = profile.settings.appearance;
  async function choose(v) {
    if (v === current) return;
    const r = await store.actions.updateSettings('appearance', v);
    setError(r.ok ? null : r.error);
  }
  return html`
    <section class="card set-section" aria-labelledby="app-title">
      <h2 id="app-title" class="set-title">Appearance</h2>
      <div class="seg set-seg" role="group" aria-label="Appearance">
        ${APPEARANCE.map(([v, label]) => html`
          <button type="button" key=${v} aria-pressed=${current === v} onClick=${() => choose(v)}>${label}</button>`)}
      </div>
      ${error && html`<p class="field-error" role="alert">${error}</p>`}
    </section>`;
}

function ResetSection({ store }) {
  const [lang, setLang] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [done, setDone] = useState(null);
  const dialog = useRef(null);

  useEffect(() => {
    const d = dialog.current;
    if (lang && d && !d.open) d.showModal();
  }, [lang]);

  const close = () => { dialog.current?.close(); };

  async function confirm() {
    if (busy) return;
    setBusy(true);
    const r = await store.actions.resetLang(lang);
    setBusy(false);
    if (r.ok) { setDone(`${LANG_NAME[lang]} progress was reset.`); setError(null); }
    else { setError(r.error); setDone(null); }
    close();
  }

  const name = lang ? LANG_NAME[lang] : '';
  return html`
    <section class="card set-section" aria-labelledby="reset-title">
      <h2 id="reset-title" class="set-title">Reset</h2>
      <div class="set-actions">
        ${Object.entries(LANG_NAME).map(([l, n]) => html`
          <button type="button" key=${l} class="btn btn-quiet btn-danger"
            onClick=${() => { setDone(null); setError(null); setLang(l); }}>Reset ${n} progress</button>`)}
      </div>
      <div aria-live="polite">
        ${done && html`<p class="note set-note">${done}</p>`}
        ${error && html`<p class="field-error" role="alert">${error}</p>`}
      </div>
      <dialog class="confirm" ref=${dialog} aria-labelledby="confirm-text"
        onClose=${() => setLang(null)}>
        <p id="confirm-text" class="confirm-text">${lang && `Reset ${name} progress on all devices? Your history stays in the sync repo.`}</p>
        <div class="confirm-actions">
          <button type="button" class="btn btn-quiet" onClick=${close}>Cancel</button>
          <button type="button" class="btn btn-primary btn-danger-solid" disabled=${busy} onClick=${confirm}>Reset</button>
        </div>
      </dialog>
    </section>`;
}

export function Settings({ store, s }) {
  return html`
    <h1 class="screen-title">Settings</h1>
    <${ProfileSection} store=${store} profile=${s.profile} />
    <${SyncSettings} store=${store} s=${s} />
    <${StudySection} store=${store} s=${s} />
    <${AppearanceSection} store=${store} profile=${s.profile} />
    <${About} />
    <${ResetSection} store=${store} />`;
}
