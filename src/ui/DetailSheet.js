// Detail sheet for one character: stroke order, readings, meanings, parts, words, status.
// A modal <dialog> rising from the bottom edge. It never offers a quiz or a study button.
import { html, useState, useEffect, useLayoutEffect, useRef } from '../../vendor/htm-preact.mjs';
import { isAvailable } from '../engine/queue.js';
import { mountStrokes } from './strokes.js';
import { Readings, Parts, Words, meaningText } from './CardFace.js';
import { reviewLabel } from './format.js';

const reducedMotion = () => globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;

/** A level id as text, in Korean type when it is a 급수 level. */
export function LevelName({ level, lang }) {
  return lang === 'ko' ? html`<span class="hangul" lang="ko">${level}</span>` : level;
}

function StrokePlayer({ char, lang }) {
  const box = useRef(null);
  const player = useRef(null);
  const [st, setSt] = useState({ ok: null, total: 0, done: 0, shown: 0, playing: false, numbers: false });

  useEffect(() => {
    const p = mountStrokes(box.current, lang, char.char, {
      reducedMotion: reducedMotion(),
      hasStrokes: char.hasStrokes !== false,
      onState: setSt,
    });
    player.current = p;
    return () => {
      p.destroy();
      player.current = null;
    };
  }, [lang, char.id]);

  const ready = st.ok === true;
  const count = !ready ? ''
    : st.shown >= st.total ? `${st.total} ${st.total === 1 ? 'stroke' : 'strokes'}`
    : `${st.shown} of ${st.total} strokes`;
  return html`
    <div class="sheet-strokes">
      <div class="grid-box stroke-box" ref=${box}></div>
      <p class="stroke-count">${count}</p>
      ${st.ok !== false && html`
        <div class="stroke-controls" role="group" aria-label="Stroke order">
          <button type="button" class="pill-btn" disabled=${!ready} onClick=${() => player.current?.replay()}>Replay</button>
          <button type="button" class="pill-btn" disabled=${!ready} onClick=${() => player.current?.step()}>Step</button>
          <button type="button" class="pill-btn" disabled=${!ready} aria-pressed=${st.numbers}
            onClick=${() => player.current?.toggleNumbers()}>Numbers</button>
        </div>`}
    </div>`;
}

function CharLink({ id, data, lang, onOpen }) {
  const c = data.byId.get(id);
  if (!c) return null;
  return html`<button type="button" class="char-link cjk" lang=${lang} onClick=${() => onOpen(id)}
    aria-label=${`${c.char}, ${c.meanings?.[0] ?? ''}`}>${c.char}</button>`;
}

function Status({ char, s, data, introduced, onOpen }) {
  const lang = s.lang;
  let cls = 'sheet-status';
  let body;
  if (introduced.has(char.id)) {
    const card = s.states.get(char.id);
    cls += ' sheet-status-studied';
    body = html`<span class="sheet-status-text">
      ${reviewLabel(card.due, new Date(), s.profile?.settings?.dayStartHour ?? 4)}</span>`;
  } else if (isAvailable(char, introduced)) {
    body = html`<span class="sheet-status-text">Not studied yet</span>`;
  } else {
    const needs = (char.required ?? []).filter((id) => !introduced.has(id));
    body = html`<span class="sheet-status-text">Unlocks after</span>
      ${needs.map((id) => html`<${CharLink} key=${id} id=${id} data=${data} lang=${lang} onOpen=${onOpen} />`)}`;
  }
  return html`
    <p class=${cls}>
      <span class=${`level-tag${lang === 'ko' ? ' hangul' : ''}`} lang=${lang === 'ko' ? 'ko' : null}>${char.level}</span>
      ${body}
    </p>`;
}

/**
 * The sheet for `char` (a dataset record). `onOpen(id)` shows another character in it;
 * `onClose()` closes it. Escape, a tap on the backdrop and the Close button all close it.
 */
export function DetailSheet({ char, s, introduced, onOpen, onClose }) {
  const lang = s.lang;
  const data = s.data[lang];
  const dialog = useRef(null);
  const scroller = useRef(null);
  const closeBtn = useRef(null);
  const downOnBackdrop = useRef(false);

  useLayoutEffect(() => {
    const d = dialog.current;
    if (!d.open) d.showModal();
    return () => { if (d.open) d.close(); };
  }, []);

  // A new character starts at the top, with focus on Close (the part that opened it is gone).
  useLayoutEffect(() => {
    scroller.current?.scrollTo?.(0, 0);
    closeBtn.current?.focus({ preventScroll: true });
  }, [char.id]);

  const levelIndex = new Map(data.levels.map((l, i) => [l.id, i]));
  const isLater = (c) => (levelIndex.get(c.level) ?? 0) > (levelIndex.get(char.level) ?? 0);
  const linkTo = (id) => {
    const c = data.byId.get(id);
    if (!c) return null;
    return {
      onOpen: () => onOpen(id),
      note: isLater(c) ? html`comes in <${LevelName} level=${c.level} lang=${lang} />` : null,
    };
  };

  // Parents found deeper than the listed parts (今 holds 人 inside 亼) show as "Contains".
  const partRefs = new Set((char.parts ?? []).map((p) => p.ref).filter(Boolean));
  const contained = (char.parents ?? [])
    .filter((id) => !partRefs.has(id) && data.byId.has(id))
    .map((id) => {
      const c = data.byId.get(id);
      return { char: c.char, meaning: c.meanings?.[0] ?? null, ref: id };
    });

  const meanings = meaningText(char);
  return html`
    <dialog class="sheet" ref=${dialog} aria-labelledby="sheet-title"
      onCancel=${(e) => { e.preventDefault(); onClose(); }}
      onPointerDown=${(e) => { downOnBackdrop.current = e.target === dialog.current; }}
      onClick=${(e) => {
        if (e.target === dialog.current && downOnBackdrop.current) onClose();
        downOnBackdrop.current = false;
      }}>
      <div class="sheet-scroll" ref=${scroller}>
        <div class="sheet-top">
          <${Status} char=${char} s=${s} data=${data} introduced=${introduced} onOpen=${onOpen} />
          <button type="button" class="bar-btn" ref=${closeBtn} onClick=${onClose}
            aria-keyshortcuts="Escape">Close</button>
        </div>
        <${StrokePlayer} key=${char.id} char=${char} lang=${lang} />
        <div class="sheet-readings"><${Readings} char=${char} lang=${lang} /></div>
        <h2 id="sheet-title" class="meanings sheet-title">
          <span class="visually-hidden">${char.char}, </span>${meanings}
        </h2>
        <${Parts} parts=${char.parts} lang=${lang} linkFor=${(p) => (p.ref ? linkTo(p.ref) : null)} />
        <${Parts} parts=${contained} lang=${lang} label="Contains" joined=${false} linkFor=${(p) => linkTo(p.ref)} />
        <${Words} words=${char.words} lang=${lang} />
      </div>
    </dialog>`;
}
