// One study card: the character in a practice-grid box on the front; readings,
// meanings, parts and example words on the back. Study and Practice both use it.
import { html } from '../../vendor/htm-preact.mjs';
import { kunLabel, hunEumLabel } from './format.js';

/** The character inside a 田字格 box: a square with dashed centre guides. */
export function GridBox({ char, lang, size = 'md' }) {
  return html`
    <div class=${`grid-box grid-box-${size}`}>
      <span class="grid-glyph cjk" lang=${lang}>${char}</span>
    </div>`;
}

/** The first reading large, any others smaller beneath it; a line breaks only between readings. */
function ReadingList({ items, cls, lang }) {
  const [first, ...rest] = items;
  const sep = lang === 'ja' ? '、' : ', ';
  return html`
    <span class=${`reading-main ${cls}`} lang=${lang}>${first}</span>
    ${rest.length > 0 && html`
      <span class=${`reading-more ${cls}`} lang=${lang}>
        ${rest.map((r, i) => html`${i > 0 && sep}<span class="reading-item">${r}</span>`)}
      </span>`}`;
}

function JaReadings({ char }) {
  const rows = [
    ['On', char.on ?? []],
    ['Kun', (char.kun ?? []).map(kunLabel)],
  ].filter(([, list]) => list.length > 0);
  return html`
    <dl class="readings">
      ${rows.map(([label, list]) => html`
        <div class="reading-row" key=${label}>
          <dt class="reading-label">${label}</dt>
          <dd class="reading-values"><${ReadingList} items=${list} cls="cjk" lang="ja" /></dd>
        </div>`)}
    </dl>`;
}

function KoReadings({ char }) {
  const list = (char.hunEum ?? []).map(hunEumLabel);
  if (list.length === 0) return null;
  return html`
    <div class="readings">
      <p class="reading-values"><${ReadingList} items=${list} cls="hangul" lang="ko" /></p>
    </div>`;
}

/** The readings block for either language, laid out as on the card back. */
export function Readings({ char, lang }) {
  return lang === 'ja' ? html`<${JaReadings} char=${char} />` : html`<${KoReadings} char=${char} />`;
}

/**
 * The parts a character is drawn from. `linkFor(part)` may return `{ onOpen, note }` to make
 * a part a button that opens that character (the detail sheet uses it); `note` is shown
 * after it, e.g. "comes in N4".
 */
export function Parts({ parts, lang, label = 'Parts', joined = true, linkFor }) {
  if (!parts?.length) return null;
  return html`
    <p class="parts">
      <span class="parts-label">${label}</span>
      ${parts.map((p, i) => {
        const link = linkFor?.(p) ?? null;
        const body = html`
          <span class="part-char cjk" lang=${lang}>${p.char}</span>
          ${p.meaning && html` <span class="part-meaning">${p.meaning}</span>`}`;
        // The "+" travels with the part after it, so a wrapped line never ends on one.
        const plus = joined && i > 0 && html`<span class="parts-plus" aria-hidden="true">+</span>`;
        return link
          ? html`<span class="part">
              ${plus}<button type="button" class="part-link" onClick=${link.onOpen}>${body}</button>
              ${link.note && html`<span class="part-note">${link.note}</span>`}
            </span>`
          : html`<span class="part">${plus}${body}</span>`;
      })}
    </p>`;
}

export function Words({ words, lang }) {
  const list = (words ?? []).slice(0, 3);
  if (list.length === 0) return null;
  return html`
    <ul class="words" aria-label="Example words">
      ${list.map((w, i) => html`
        <li class="word" key=${i}>
          <span class="word-w cjk" lang=${lang}>${w.w}</span>
          ${lang === 'ja'
            ? html`<span class="word-reading cjk" lang="ja">${w.kana}</span>`
            : html`<span class="word-reading hangul" lang="ko">${w.hangul}</span>`}
          <span class="word-en">${w.en}</span>
        </li>`)}
    </ul>`;
}

/** Up to three meanings, as the card back shows them. */
export const meaningText = (char) => (char.meanings ?? []).slice(0, 3).join(', ');

export function CardBack({ char, lang }) {
  const meanings = meaningText(char);
  return html`
    <div class="face face-back">
      <div class="face-head">
        <${GridBox} char=${char.char} lang=${lang} size="md" />
        <${Readings} char=${char} lang=${lang} />
      </div>
      ${meanings && html`<p class="meanings">${meanings}</p>`}
      <${Parts} parts=${char.parts} lang=${lang} />
      <${Words} words=${char.words} lang=${lang} />
    </div>`;
}

export function CardFront({ char, lang }) {
  return html`
    <div class="face face-front">
      <${GridBox} char=${char.char} lang=${lang} size="lg" />
    </div>`;
}

/** Front until `revealed`, then the back. `char` is a dataset record. */
export function CardFace({ char, lang, revealed }) {
  return revealed
    ? html`<${CardBack} char=${char} lang=${lang} />`
    : html`<${CardFront} char=${char} lang=${lang} />`;
}
