// Settings → Sync: connect this device to the progress repo with a GitHub token, test it,
// sync now, see the last sync, disconnect. A saved token is never shown again.
import { html, useState, useRef } from '../../vendor/htm-preact.mjs';
import {
  syncLabel, checkToken, checkRepo, testText, DEFAULT_REPO, TOKEN_ERROR, REPO_ERROR,
} from '../sync/sync.js';
import { useMinuteClock } from './Home.js';

const WHEN = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
const SAVE_ERROR = 'Could not save on this device. Try again.';

/** The token and repo form. With a token already saved, an empty token field keeps it. */
function ConnectForm({ sync, connected, connect, onDone, onCancel }) {
  const [token, setToken] = useState('');
  const [repo, setRepo] = useState(connected ? (sync.repo ?? DEFAULT_REPO) : DEFAULT_REPO);
  const [errors, setErrors] = useState({ token: null, repo: null });
  const [busy, setBusy] = useState(false);
  const tokenRef = useRef(null);
  const repoRef = useRef(null);

  async function submit(e) {
    e.preventDefault();
    if (busy) return;
    const keep = connected && token.trim() === '';
    const t = keep ? { ok: true, token: null } : checkToken(token);
    const r = checkRepo(repo);
    setErrors({ token: t.ok ? null : t.error, repo: r.ok ? null : r.error });
    if (!t.ok || !r.ok) {
      (t.ok ? repoRef : tokenRef).current?.focus();
      return;
    }
    setBusy(true);
    let res;
    try {
      res = await connect({ token: t.token, repo: r.repo });
    } catch {
      res = { ok: false, saved: false, kind: null, error: SAVE_ERROR };
    }
    setBusy(false);
    if (res.error === TOKEN_ERROR || res.error === REPO_ERROR) {
      setErrors(res.error === TOKEN_ERROR ? { token: res.error, repo: null } : { token: null, repo: res.error });
      return;
    }
    // Whatever the test said, the pasted token leaves the page.
    setToken('');
    onDone(res.error ? { text: res.error, ok: false } : { text: testText(res.kind), ok: res.kind === 'ok' }, res.saved);
  }

  return html`
    <form class="sync-form" onSubmit=${submit} novalidate aria-label="Sync token and repo">
      <div class="field set-field">
        <label for="sy-token">${connected ? 'New token' : 'GitHub token'}</label>
        <input id="sy-token" ref=${tokenRef} class="input" type="password" value=${token}
          autocomplete="off" autocapitalize="off" autocorrect="off" spellcheck=${false}
          placeholder=${connected ? 'Leave empty to keep the saved one' : ''}
          aria-invalid=${errors.token ? 'true' : 'false'}
          aria-describedby=${errors.token ? 'sy-token-err' : 'sy-token-hint'}
          onInput=${(e) => { setToken(e.currentTarget.value); if (errors.token) setErrors({ ...errors, token: null }); }} />
        ${errors.token
          ? html`<p id="sy-token-err" class="field-error" role="alert">${errors.token}</p>`
          : html`<p id="sy-token-hint" class="set-hint">A fine-grained token with Contents: Read and write on the repo. One token covers every profile on this device.</p>`}
      </div>
      <div class="field set-field">
        <label for="sy-repo">Repo</label>
        <input id="sy-repo" ref=${repoRef} class="input" type="text" value=${repo}
          autocomplete="off" autocapitalize="off" autocorrect="off" spellcheck=${false}
          aria-invalid=${errors.repo ? 'true' : 'false'}
          aria-describedby=${errors.repo ? 'sy-repo-err' : null}
          onInput=${(e) => { setRepo(e.currentTarget.value); if (errors.repo) setErrors({ ...errors, repo: null }); }} />
        ${errors.repo && html`<p id="sy-repo-err" class="field-error" role="alert">${errors.repo}</p>`}
      </div>
      <div class="set-actions">
        <button type="submit" class="btn btn-primary" disabled=${busy}>${connected ? 'Save' : 'Connect'}</button>
        ${onCancel && html`<button type="button" class="btn btn-text" onClick=${onCancel}>Cancel</button>`}
      </div>
    </form>`;
}

export function SyncSettings({ store, s }) {
  const sync = s.sync;
  const api = store.syncer;
  const now = useMinuteClock();
  const connected = sync.status !== 'off';
  const [editing, setEditing] = useState(false);
  const [result, setResult] = useState(null); // { text, ok }
  const [testing, setTesting] = useState(false);
  const showForm = !connected || editing || sync.error === 'auth';

  const connect = (args) => (api ? api.connect(args) : Promise.resolve({ ok: false, saved: false, kind: 'http' }));
  const onDone = (r, saved) => {
    setResult(r);
    if (saved) setEditing(false);
  };

  async function test() {
    if (!api || testing) return;
    setTesting(true);
    setResult(null);
    const r = await api.test();
    setTesting(false);
    setResult({ text: testText(r.kind), ok: r.ok });
  }

  async function disconnect() {
    if (!api) return;
    setResult(null);
    setEditing(false);
    try {
      await api.disconnect();
    } catch {
      setResult({ text: SAVE_ERROR, ok: false });
    }
  }

  return html`
    <section class="card set-section" aria-labelledby="sync-title">
      <h2 id="sync-title" class="set-title">Sync</h2>
      ${connected
        ? html`
          <p class="set-status">Connected to ${sync.repo ?? DEFAULT_REPO}</p>
          <p class="sync-now-line">${syncLabel(sync, now)}</p>
          <p class="set-hint sync-last">${sync.lastSync
            ? `Last sync ${WHEN.format(new Date(sync.lastSync))}`
            : 'Not synced yet'}</p>
          <div class="set-actions sync-actions">
            <button type="button" class="btn btn-primary" disabled=${!api || sync.status === 'syncing'}
              onClick=${() => { setResult(null); store.actions.syncNow(); }}>Sync now</button>
            <button type="button" class="btn btn-quiet" disabled=${!api || testing} onClick=${test}>Test connection</button>
          </div>`
        : html`
          <p class="set-status">Sync off</p>
          <p class="set-hint sync-intro">Keep progress the same on all your devices through a private GitHub repo.</p>`}
      <div class="sync-result" aria-live="polite">
        ${result && html`<p class=${result.ok ? 'note set-note' : 'field-error'}>${result.text}</p>`}
      </div>
      ${showForm && html`<${ConnectForm} key=${connected ? 'change' : 'connect'} sync=${sync} connected=${connected}
        connect=${connect} onDone=${onDone} onCancel=${connected && editing && sync.error !== 'auth' ? () => setEditing(false) : null} />`}
      ${connected && html`
        <div class="set-actions sync-actions">
          ${!showForm && html`<button type="button" class="btn btn-quiet" onClick=${() => { setResult(null); setEditing(true); }}>Change token or repo</button>`}
          <button type="button" class="btn btn-quiet btn-danger" onClick=${disconnect}>Disconnect</button>
        </div>`}
    </section>`;
}
