// "Who's studying?": profiles on this device, plus an inline Add profile form.
import { html, useState, useRef, useEffect } from '../../vendor/htm-preact.mjs';
import { nameError, tagError } from './profile-input.js';
import { Avatar } from './Header.js';
import { go } from './route.js';

const SAVE_ERROR = 'Could not save the profile on this device. Reload the page and try again.';
const OPEN_ERROR = 'Could not open this profile. Reload the page and try again.';

export function ProfilePicker({ store, profiles }) {
  const hasProfiles = profiles.length > 0;
  const [adding, setAdding] = useState(!hasProfiles);
  const [error, setError] = useState(null);

  async function choose(key) {
    setError(null);
    try {
      await store.actions.selectProfile(key);
    } catch {
      setError(OPEN_ERROR);
      return;
    }
    go('#/study');
  }

  return html`
    <main class="picker">
      <h1 class="picker-title">Who's studying?</h1>
      ${hasProfiles
        ? html`
          <ul class="list" aria-label="Profiles on this device">
            ${profiles.map((p) => html`
              <li key=${p.key}>
                <button type="button" class="list-row" aria-label=${`${p.name} #${p.tag}`}
                  onClick=${() => choose(p.key)}>
                  <${Avatar} name=${p.name} />
                  <span class="who-name">${p.name}</span>
                  <span class="who-tag">#${p.tag}</span>
                  <svg class="chevron" viewBox="0 0 16 16" width="16" height="16" aria-hidden="true">
                    <path d="M6 3.5 10.5 8 6 12.5" fill="none" stroke="currentColor" stroke-width="1.6"
                      stroke-linecap="round" stroke-linejoin="round" />
                  </svg>
                </button>
              </li>`)}
          </ul>
          ${error && html`<p class="field-error" role="alert">${error}</p>`}`
        : html`<p class="lede">Choose a name and a 4-digit number. Use the same pair on each of your devices.</p>`}
      ${adding
        ? html`<${AddProfileForm} store=${store} onCancel=${hasProfiles ? () => setAdding(false) : null} />`
        : html`<button type="button" class="btn btn-quiet" onClick=${() => setAdding(true)}>Add profile</button>`}
    </main>`;
}

export function AddProfileForm({ store, onCancel }) {
  const [name, setName] = useState('');
  const [tag, setTag] = useState('');
  const [errors, setErrors] = useState({ name: null, tag: null, form: null });
  const [busy, setBusy] = useState(false);
  const nameRef = useRef(null);
  const tagRef = useRef(null);

  // Opened from the "Add profile" button: put the cursor in the name field.
  useEffect(() => { if (onCancel) nameRef.current?.focus(); }, []);

  async function submit(e) {
    e.preventDefault();
    if (busy) return;
    const next = { name: nameError(name), tag: tagError(tag), form: null };
    setErrors(next);
    if (next.name || next.tag) {
      (next.name ? nameRef : tagRef).current?.focus();
      return;
    }
    setBusy(true);
    try {
      // With sync on, a profile the repo already has comes down first; Study then says
      // "Welcome back" (state.welcome).
      const r = await store.actions.addProfile(name, tag);
      if (r.ok) {
        go('#/study');
        return;
      }
      setErrors({ name: null, tag: null, form: r.error });
      setBusy(false);
    } catch {
      setErrors({ name: null, tag: null, form: SAVE_ERROR });
      setBusy(false);
    }
  }

  const onNameKey = (e) => {
    // Enter in the name field moves on to the number while it is still empty.
    if (e.key === 'Enter' && !e.isComposing && !tag) {
      e.preventDefault();
      tagRef.current?.focus();
    }
  };

  return html`
    <form class="add" onSubmit=${submit} novalidate aria-labelledby="add-title">
      <h2 id="add-title" class="add-title">Add profile</h2>
      <div class="field-row">
        <div class="field field-name">
          <label for="pf-name">Name</label>
          <input id="pf-name" ref=${nameRef} class="input" type="text" value=${name}
            autocomplete="off" autocapitalize="words" autocorrect="off" spellcheck=${false}
            aria-invalid=${errors.name ? 'true' : 'false'}
            aria-describedby=${errors.name ? 'pf-name-err' : null}
            onKeyDown=${onNameKey}
            onInput=${(e) => {
              setName(e.currentTarget.value);
              if (errors.name || errors.form) setErrors({ ...errors, name: null, form: null });
            }} />
        </div>
        <span class="hash" aria-hidden="true">#</span>
        <div class="field field-tag">
          <label for="pf-tag">Number</label>
          <input id="pf-tag" ref=${tagRef} class="input input-tag" type="text" value=${tag}
            inputmode="numeric" pattern="[0-9]*" maxlength="4" autocomplete="off"
            aria-invalid=${errors.tag ? 'true' : 'false'}
            aria-describedby=${errors.tag ? 'pf-tag-err' : null}
            onInput=${(e) => {
              setTag(e.currentTarget.value);
              if (errors.tag || errors.form) setErrors({ ...errors, tag: null, form: null });
            }} />
        </div>
      </div>
      <div class="field-errors" aria-live="polite">
        ${errors.name && html`<p id="pf-name-err" class="field-error">${errors.name}</p>`}
        ${errors.tag && html`<p id="pf-tag-err" class="field-error">${errors.tag}</p>`}
        ${errors.form && html`<p class="field-error">${errors.form}</p>`}
      </div>
      <div class="form-actions">
        <button type="submit" class="btn btn-primary" disabled=${busy}>Add profile</button>
        ${onCancel && html`<button type="button" class="btn btn-text" onClick=${onCancel}>Cancel</button>`}
      </div>
      <p class="add-busy" aria-live="polite">${busy && store.get().sync.status !== 'off'
        ? 'Looking for this profile in the sync repo' : ''}</p>
    </form>`;
}
