// Bootstrap: clear the old app's storage, open the db, load both datasets, render.
import { html, render } from '../vendor/htm-preact.mjs';
import { openDb, cleanupLegacyStorage } from './store/db.js';
import { loadData } from './data/load.js';
import { createStore } from './state.js';
import { App } from './ui/App.js';

const root = document.getElementById('app');

function BootError({ error }) {
  return html`
    <main class="picker">
      <h1 class="picker-title">The app could not start</h1>
      <p class="lede">Check your connection, then reload. Your progress on this device is kept.</p>
      <p class="boot-detail">${String(error?.message ?? error)}</p>
      <button type="button" class="btn btn-primary" onClick=${() => location.reload()}>Reload</button>
    </main>`;
}

async function boot() {
  try {
    cleanupLegacyStorage(localStorage);
  } catch {
    // localStorage can be blocked; there is then nothing of the old app to clear.
  }
  const [db, ja, ko] = await Promise.all([openDb(), loadData('ja'), loadData('ko')]);
  const store = createStore({ db, data: { ja, ko } });
  await store.init();
  root.textContent = '';
  render(html`<${App} store=${store} />`, root);
}

boot().catch((error) => {
  console.error(error);
  root.textContent = '';
  render(html`<${BootError} error=${error} />`, root);
});
