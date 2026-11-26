// Level practice: the level's studied characters, shuffled, on the same card as a study
// session. Self-check only: nothing is stored, so the schedule never changes.
// Space or Enter shows the answer, 1 is Again, 2 is Got it, Escape exits.
import { html, useState, useEffect, useLayoutEffect, useRef } from '../../vendor/htm-preact.mjs';
import { introducedSet, buildPractice } from '../engine/queue.js';
import { CardFace } from './CardFace.js';
import { LevelName } from './DetailSheet.js';
import { go, routeHref } from './route.js';

const isEditable = (el) => !!el?.closest?.('input, textarea, select, [contenteditable]:not([contenteditable="false"])');
const isControl = (el) => !!el?.closest?.('button, a[href], summary, [role="button"]');

/** Leaves practice for the level's characters, replacing the entry: Back does not reopen it. */
export const exitPractice = (level) => go(routeHref('characters', level), { replace: true });

/** A fresh round: the ids in random order; a card marked Again comes back once at the end. */
const newRound = (ids) => ({ queue: ids, pos: 0, revealed: false, again: new Set(), seq: 0 });

export function Practice({ s, level }) {
  const lang = s.lang;
  const data = s.data[lang];
  // Who counts as studied is fixed when practice starts.
  const [introduced] = useState(() => introducedSet(s.states));
  const [round, setRound] = useState(() => newRound(buildPractice(level, data.chars, introduced)));
  const cardRef = useRef(null);

  const back = () => exitPractice(level);
  const total = new Set(round.queue).size;
  const done = round.pos >= round.queue.length;
  const id = done ? null : round.queue[round.pos];
  const char = id ? data.byId.get(id) : null;

  const reveal = () => setRound((r) => (r.pos < r.queue.length && !r.revealed ? { ...r, revealed: true } : r));
  const mark = (knew) => setRound((r) => {
    if (r.pos >= r.queue.length || !r.revealed) return r;
    const cur = r.queue[r.pos];
    const again = new Set(r.again);
    let queue = r.queue;
    if (!knew && !again.has(cur)) {
      again.add(cur);
      queue = [...queue, cur];
    }
    return { queue, pos: r.pos + 1, revealed: false, again, seq: r.seq + 1 };
  });
  const restart = () => setRound(newRound(buildPractice(level, data.chars, introduced)));

  useLayoutEffect(() => { scrollTo(0, 0); }, []);

  // Keyboard focus follows the card, as in a study session.
  useEffect(() => {
    if (done) return;
    if (!round.revealed) scrollTo(0, 0);
    cardRef.current?.focus({ preventScroll: true });
  }, [round.seq, round.revealed, done]);

  const onKey = useRef(null);
  onKey.current = (e) => {
    if (e.defaultPrevented || e.isComposing || e.altKey || e.ctrlKey || e.metaKey || isEditable(e.target)) return;
    const k = e.key;
    if (k === 'Escape') {
      e.preventDefault();
      back();
    } else if (!done && !round.revealed) {
      if ((k === ' ' || k === 'Enter') && !isControl(e.target)) {
        e.preventDefault();
        reveal();
      }
    } else if (!done && (k === '1' || k === '2')) {
      e.preventDefault();
      if (!e.repeat) mark(k === '2');
    }
  };
  useEffect(() => {
    const handler = (e) => onKey.current(e);
    addEventListener('keydown', handler);
    return () => removeEventListener('keydown', handler);
  }, []);

  const left = round.queue.length - round.pos;
  const pct = round.queue.length > 0 ? (round.pos / round.queue.length) * 100 : 0;
  const firstTry = total - round.again.size;

  return html`
    <main class="session">
      <h1 class="visually-hidden">Practice, <${LevelName} level=${level} lang=${lang} /></h1>
      <header class="session-top">
        <button type="button" class="bar-btn" onClick=${back} aria-keyshortcuts="Escape">Exit</button>
      </header>
      <div class="session-progress">
        <p class="prog-meta">
          <span><${LevelName} level=${level} lang=${lang} /> · practice</span>
          <span>${total === 0 || done ? '' : `${left} left`}</span>
        </p>
        <div class="prog-bar" role="progressbar" aria-label="Practice progress"
          aria-valuemin="0" aria-valuemax="100" aria-valuenow=${Math.round(done ? 100 : pct)}>
          <span class="prog-fill" style=${`width:${done ? 100 : pct}%`}></span>
        </div>
      </div>
      ${total === 0 && html`
        <section class="session-note">
          <h2 class="note-title">Study a few characters first</h2>
          <p class="note-sub">Practice uses the characters of this level you have studied.</p>
          <a class="btn btn-quiet note-action" href=${routeHref('characters', level)}>Back to characters</a>
        </section>`}
      ${char && html`
        <section class=${`study-card${round.revealed ? ' is-revealed' : ''}`} ref=${cardRef} tabindex="-1"
          aria-label=${round.revealed ? 'Answer' : 'Card'} onClick=${round.revealed ? null : reveal}>
          <${CardFace} key=${round.seq} char=${char} lang=${lang} revealed=${round.revealed} />
        </section>
        <div class="answer-bar">
          ${round.revealed
            ? html`
              <div class="check" role="group" aria-label="Did you know it?" key="check">
                <button type="button" class="check-btn check-again" onClick=${() => mark(false)} aria-keyshortcuts="1">Again</button>
                <button type="button" class="check-btn check-got" onClick=${() => mark(true)} aria-keyshortcuts="2">Got it</button>
              </div>`
            : html`<button type="button" key="reveal" class="btn btn-primary" onClick=${reveal}
                aria-keyshortcuts="Space Enter">Show answer</button>`}
        </div>`}
      ${total > 0 && done && html`
        <section class="session-note" aria-live="polite">
          <h2 class="note-title">Practice done — your schedule wasn't changed.</h2>
          <p class="note-sub">${firstTry} of ${total} known the first time.</p>
          <div class="practice-actions">
            <button type="button" class="btn btn-primary note-action" onClick=${restart}>Practice again</button>
            <a class="btn btn-quiet note-action" href=${routeHref('characters', level)}>Back to characters</a>
          </div>
        </section>`}
    </main>`;
}
