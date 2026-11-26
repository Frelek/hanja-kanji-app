// About: the app name and where its data, fonts and libraries come from.
// Static text; keep it in sync with data/LICENSES.md.
import { html } from '../../vendor/htm-preact.mjs';

const SOURCES = [
  ['Klee One', 'SIL Open Font License 1.1'],
  ['Gowun Batang', 'SIL Open Font License 1.1'],
  ['animCJK (stroke order and dictionaries)', 'Arphic Public License and GNU LGPL'],
  ['kanji-data / KANJIDIC (Japanese readings and meanings)', 'CC BY-SA 4.0 (EDRDG)'],
  ['JLPT decks (open-anki-jlpt-decks)', 'MIT'],
  ['한국어문회 lists (hanja grades)', '\u00a9 한국어문회'],
  ['kengdic (Korean words)', 'MPL 2.0 or LGPL 2.0+'],
  ['cjkvi (character parts and Joyo list)', 'GPLv2 / CC BY-SA'],
  ['ts-fsrs (scheduling)', 'MIT'],
  ['htm', 'Apache-2.0'],
  ['Preact', 'MIT'],
];

export function About() {
  return html`
    <section class="card set-section" aria-labelledby="about-title">
      <h2 id="about-title" class="set-title">About</h2>
      <p class="about-name">Hanja and Kanji</p>
      <p class="note">Learn Japanese kanji and Korean hanja with spaced repetition. Everything runs on this device.</p>
      <h3 class="set-sub">Data, fonts and libraries</h3>
      <ul class="credits">
        ${SOURCES.map(([name, licence]) => html`
          <li key=${name}><span class="credit-name">${name}</span><span class="credit-licence">${licence}</span></li>`)}
      </ul>
    </section>`;
}
