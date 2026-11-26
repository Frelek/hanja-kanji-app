// Service worker registration and the "Update available" bar.
import { html, useState, useEffect } from '../../vendor/htm-preact.mjs';

let waitingWorker = null;
const listeners = new Set();

function setWaiting(worker) {
  waitingWorker = worker;
  for (const fn of listeners) fn(worker);
}

function canRegister(loc) {
  return loc.protocol === 'https:' || ['localhost', '127.0.0.1', '[::1]'].includes(loc.hostname);
}

// Fire and forget: the app never waits for the worker.
export function registerServiceWorker() {
  if (!('serviceWorker' in navigator) || !canRegister(location)) return;
  navigator.serviceWorker.register('./sw.js', { scope: './' }).then((reg) => {
    // Only an update counts: on the very first install nothing controls the page yet.
    const flagIfUpdate = (worker) => {
      if (worker && navigator.serviceWorker.controller) setWaiting(worker);
    };
    flagIfUpdate(reg.waiting);
    reg.addEventListener('updatefound', () => {
      const worker = reg.installing;
      worker?.addEventListener('statechange', () => {
        if (worker.state === 'installed') flagIfUpdate(worker);
      });
    });
    // An installed app can stay open for days: look for a new version on every return to it.
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') reg.update().catch(() => {});
    });
  }).catch((err) => console.warn('Service worker not registered', err));
}

let reloading = false;
function applyUpdate() {
  if (!waitingWorker) return;
  // Listen only now, so the first-install clients.claim() never triggers a reload.
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (reloading) return;
    reloading = true;
    location.reload();
  });
  waitingWorker.postMessage('SKIP_WAITING');
}

export function UpdateBanner() {
  const [worker, setWorker] = useState(waitingWorker);
  useEffect(() => {
    listeners.add(setWorker);
    setWorker(waitingWorker);
    return () => listeners.delete(setWorker);
  }, []);
  if (!worker) return null;
  return html`<div class="update-banner" role="status">
    <button type="button" class="update-btn" onClick=${applyUpdate}>Update available — Reload</button>
  </div>`;
}
