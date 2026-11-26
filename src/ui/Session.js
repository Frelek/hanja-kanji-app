// Review session: one card at a time from today's queue, as in Anki.
// Space or Enter shows the answer, 1-4 rate it, U or Ctrl+Z undoes, Escape exits.
import { html, useState, useEffect, useLayoutEffect, useRef } from '../../vendor/htm-preact.mjs';
import { studyQueue, studySettings } from '../state.js';
import { nextItem } from '../engine/queue.js';
import { makeScheduler, newCard, STATE, RATING } from '../engine/fsrs.js';
import { CardFace } from './CardFace.js';
import { go, routeHref } from './route.js';

const RATE_BUTTONS = [
  [RATING.again, 'Again', 'again'],
  [RATING.hard, 'Hard', 'hard'],
  [RATING.good, 'Good', 'good'],
  [RATING.easy, 'Easy', 'easy'],
];
const KIND_LABEL = { new: 'new card', learning: 'learning', review: 'review' };
const ANSWER_ERROR = 'Could not save that answer. Try again.';
const UNDO_ERROR = 'Could not undo. Try again.';
const RECHECK_MS = 15e3; // while waiting on a learning card
const DONE_RETURN_MS = 3e3; // the completion note, then back to Home

const kindOf = (card) => (!card || card.state === STATE.new ? 'new'
  : card.state === STATE.review ? 'review' : 'learning');
const total = (c) => c.new + c.learning + c.review;

const isEditable = (el) => !!el?.closest?.('input, textarea, select, [contenteditable]:not([contenteditable="false"])');
const isControl = (el) => !!el?.closest?.('button, a[href], summary, [role="button"]');

const home = () => go(routeHref('study'));

export function Session({ store, s }) {
  const lang = s.lang;
  const [view, setView] = useState(null);
  const [error, setError] = useState(null);
  const [answered, setAnswered] = useState(0);
  const doneSinceNew = useRef(0);
  const history = useRef([]); // doneSinceNew before each answer, restored by undo
  const busy = useRef(false);
  const mounted = useRef(true);
  const seq = useRef(0);
  const cardRef = useRef(null);

  function show(item, left) {
    const kind = kindOf(store.get().states.get(item.id));
    if (kind === 'new') doneSinceNew.current = 0;
    setView({ phase: 'card', seq: ++seq.current, item, kind, left, revealed: false, preview: null, shownAt: Date.now() });
  }

  function pick() {
    const st = store.get();
    const now = new Date();
    const queue = studyQueue(st, now);
    const left = total(queue.counts);
    const { item, waitMs } = nextItem(queue, st.states, now, doneSinceNew.current);
    if (item) show(item, left);
    else if (waitMs != null) setView({ phase: 'wait', seq: ++seq.current, waitMs, left });
    else setView({ phase: 'done', seq: ++seq.current, left: 0 });
  }

  function reveal() {
    if (view?.phase !== 'card' || view.revealed) return;
    const st = store.get();
    const now = new Date();
    const card = st.states.get(view.item.id) ?? newCard(now);
    const preview = makeScheduler(studySettings(st.profile, st.lang)).preview(card, now);
    setView({ ...view, revealed: true, preview });
  }

  async function rate(rating) {
    if (busy.current || view?.phase !== 'card' || !view.revealed) return;
    const current = view;
    busy.current = true;
    setError(null);
    let r;
    try {
      r = await store.actions.answer(current.item.id, rating, Date.now() - current.shownAt);
    } catch {
      r = { ok: false, error: ANSWER_ERROR };
    } finally {
      busy.current = false;
    }
    if (!mounted.current) return;
    if (!r.ok) {
      setError(r.error || ANSWER_ERROR);
      return;
    }
    history.current.push(doneSinceNew.current);
    if (current.kind === 'review') doneSinceNew.current += 1;
    setAnswered((n) => n + 1);
    pick();
  }

  async function undo() {
    if (busy.current || !store.get().canUndo) return;
    busy.current = true;
    setError(null);
    let r;
    try {
      r = await store.actions.undo();
    } catch {
      r = { ok: false, error: UNDO_ERROR };
    } finally {
      busy.current = false;
    }
    if (!mounted.current) return;
    if (!r.ok) {
      if (r.error) setError(r.error);
      return;
    }
    if (history.current.length) doneSinceNew.current = history.current.pop();
    setAnswered((n) => Math.max(0, n - 1));
    // The answer taken back is asked again, front first.
    const st = store.get();
    const char = st.data[st.lang]?.byId?.get(r.card);
    if (!char) {
      pick();
      return;
    }
    show({ id: r.card, char }, total(studyQueue(st, new Date()).counts));
  }

  // Start: earlier answers leave the undo history, and the first card is chosen before paint.
  // Leaving the session, finished or not, sends its answers to the sync repo.
  useLayoutEffect(() => {
    store.actions.startSession();
    pick();
    return () => {
      mounted.current = false;
      store.actions.endSession();
    };
  }, []);

  // Waiting on a learning card: look again when it is due (and every 15 s for the minutes shown).
  useEffect(() => {
    if (view?.phase !== 'wait') return undefined;
    const id = setTimeout(pick, Math.max(250, Math.min(view.waitMs + 100, RECHECK_MS)));
    return () => clearTimeout(id);
  }, [view]);

  useEffect(() => {
    if (view?.phase !== 'done') return undefined;
    const id = setTimeout(home, DONE_RETURN_MS);
    return () => clearTimeout(id);
  }, [view]);

  // A new card starts at the top, and keyboard focus follows the card.
  useEffect(() => {
    if (view?.phase !== 'card') return;
    if (!view.revealed) scrollTo(0, 0);
    cardRef.current?.focus({ preventScroll: true });
  }, [view?.seq, view?.revealed]);

  const onKey = useRef(null);
  onKey.current = (e) => {
    if (e.defaultPrevented || e.isComposing || e.altKey || isEditable(e.target)) return;
    const k = e.key;
    if ((e.ctrlKey || e.metaKey) && !e.shiftKey && (k === 'z' || k === 'Z')) {
      e.preventDefault();
      if (!e.repeat) undo();
      return;
    }
    if (e.ctrlKey || e.metaKey) return;
    if (k === 'Escape') {
      e.preventDefault();
      home();
    } else if (k === 'u' || k === 'U') {
      if (!e.repeat) undo();
    } else if (view?.phase === 'card' && !view.revealed) {
      // On a focused button or link, Space and Enter keep their own meaning.
      if ((k === ' ' || k === 'Enter') && !isControl(e.target)) {
        e.preventDefault();
        reveal();
      }
    } else if (view?.phase === 'card' && /^[1-4]$/.test(k)) {
      e.preventDefault();
      if (!e.repeat) rate(Number(k));
    }
  };
  useEffect(() => {
    const handler = (e) => onKey.current(e);
    addEventListener('keydown', handler);
    return () => removeEventListener('keydown', handler);
  }, []);

  const left = view?.left ?? 0;
  const pct = view?.phase === 'done' ? 100 : answered + left > 0 ? (answered / (answered + left)) * 100 : 0;
  const level = view?.phase === 'card' ? view.item.char.level : null;

  return html`
    <main class="session">
      <h1 class="visually-hidden">Study session</h1>
      <header class="session-top">
        <button type="button" class="bar-btn" onClick=${home} aria-keyshortcuts="Escape">Exit</button>
        <button type="button" class="bar-btn" onClick=${undo} disabled=${!s.canUndo}
          aria-keyshortcuts="U Control+Z">Undo</button>
      </header>
      <div class="session-progress">
        <p class="prog-meta">
          <span>${level != null && html`<span class=${lang === 'ko' ? 'hangul' : ''} lang=${lang}>${level}</span> · ${KIND_LABEL[view.kind]}`}</span>
          <span>${view?.phase === 'done' ? '' : `${left} left`}</span>
        </p>
        <div class="prog-bar" role="progressbar" aria-label="Session progress"
          aria-valuemin="0" aria-valuemax="100" aria-valuenow=${Math.round(pct)}>
          <span class="prog-fill" style=${`width:${pct}%`}></span>
        </div>
      </div>
      ${view?.phase === 'card' && html`
        <section class=${`study-card${view.revealed ? ' is-revealed' : ''}`} ref=${cardRef} tabindex="-1"
          aria-label=${view.revealed ? 'Answer' : 'Card'} onClick=${view.revealed ? null : reveal}>
          <${CardFace} key=${view.seq} char=${view.item.char} lang=${lang} revealed=${view.revealed} />
        </section>
        ${error && html`<p class="session-error" role="alert">${error}</p>`}
        <div class="answer-bar">
          ${view.revealed
            ? html`
              <div class="rate" role="group" aria-label="How well did you know it?" key="rate">
                ${RATE_BUTTONS.map(([r, name, cls]) => html`
                  <button type="button" key=${r} class=${`rate-btn rate-${cls}`} onClick=${() => rate(r)}
                    aria-keyshortcuts=${String(r)}>
                    <span class="rate-name">${name}</span>
                    <span class="rate-ivl">${view.preview[r].label}</span>
                  </button>`)}
              </div>`
            : html`<button type="button" key="reveal" class="btn btn-primary" onClick=${reveal}
                aria-keyshortcuts="Space Enter">Show answer</button>`}
        </div>`}
      ${view?.phase === 'wait' && html`
        <section class="session-note" aria-live="polite">
          <h2 class="note-title">Next card in ${Math.max(1, Math.ceil(view.waitMs / 60e3))} min</h2>
          <p class="note-sub">Cards you are learning come back when their step is up.</p>
          ${error && html`<p class="session-error" role="alert">${error}</p>`}
        </section>`}
      ${view?.phase === 'done' && html`
        <section class="session-note" aria-live="polite">
          <h2 class="note-title">${answered > 0 ? 'All done for today' : 'Nothing to study right now'}</h2>
          <p class="note-sub">${answered > 0
            ? `You answered ${answered} ${answered === 1 ? 'card' : 'cards'}.`
            : 'New cards and reviews come back tomorrow.'}</p>
          ${error && html`<p class="session-error" role="alert">${error}</p>`}
          <a class="btn btn-quiet note-action" href=${routeHref('study')}>Back to Study</a>
        </section>`}
    </main>`;
}
