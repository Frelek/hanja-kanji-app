// Bootstrap: clear the old app's storage, open the db, load both datasets, render, sync.
import { html, render } from '../vendor/htm-preact.mjs';
import { openDb, cleanupLegacyStorage } from './store/db.js';
import { loadData } from './data/load.js';
import { createStore } from './state.js';
import { createSyncManager, clientFromMeta, watchSyncTriggers, SYNC_PROFILES } from './sync/sync.js';
import { App } from './ui/App.js';
import { UpdateBanner, registerServiceWorker } from './ui/UpdateBanner.js';

const root = document.getElementById('app');

// The update bar lives outside the app tree so it survives a boot error and every screen change.
const bannerRoot = document.createElement('div');
document.body.append(bannerRoot);
render(html`<${UpdateBanner} />`, bannerRoot);
registerServiceWorker();

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
  const sync = createSyncManager({ store, db, getClient: () => clientFromMeta(db), syncKeys: SYNC_PROFILES });
  root.textContent = '';
  render(html`<${App} store=${store} />`, root);
  // Sync runs in the background on open, on every return to the foreground, on leaving
  // the app (best effort) and when the connection comes back.
  sync.trigger('open');
  watchSyncTriggers(sync);
}

boot().catch((error) => {
  console.error(error);
  root.textContent = '';
  render(html`<${BootError} error=${error} />`, root);
});
