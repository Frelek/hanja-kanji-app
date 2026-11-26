// Characters: level chips, practice for the level, and the level's family forest.
// Tapping a row opens its detail sheet; the open sheet is the route's ?c= param, so the
// browser's back button closes it.
import { html, useMemo, useRef, useEffect } from '../../vendor/htm-preact.mjs';
import { introducedSet, isAvailable } from '../engine/queue.js';
import { buildForest, familyGroups } from '../engine/tree.js';
import { kunLabel, hunEumLabel } from './format.js';
import { DetailSheet, LevelName } from './DetailSheet.js';
import { go, routeHref } from './route.js';

const STATUS_WORD = { studied: 'studied', new: 'new', later: 'later' };
const SHEET_STATE = { sheet: true };

const statusOf = (c, introduced) => (introduced.has(c.id) ? 'studied' : isAvailable(c, introduced) ? 'new' : 'later');

/** The first kun and on reading (or the first 훈음), as text. */
function readingsList(c, lang) {
  if (lang === 'ko') return c.hunEum?.[0] ? [hunEumLabel(c.hunEum[0])] : [];
  return [c.kun?.[0] && kunLabel(c.kun[0]), c.on?.[0]].filter(Boolean);
}

// Kun and on sit apart with a gap, not a dot: kun readings already use ・ for okurigana.
function readingsDetail(c, lang) {
  const list = readingsList(c, lang);
  return {
    text: list.join(', '),
    view: list.map((r) => html`<span class=${`node-reading ${lang === 'ko' ? 'hangul' : 'cjk'}`} lang=${lang}>${r}</span>`),
  };
}

const glyphs = (list, lang, mark = () => '') =>
  list.map((g, i) => html`${i > 0 && ', '}<span class="cjk" lang=${lang}>${g}</span>${mark(g)}`);

/** The detail line under a row's meaning, as text for the label and as markup. */
function detailOf(node, { lang, data, introduced, levelIndex }) {
  const c = node.char;
  const needs = node.status === 'later' ? node.needs : [];
  // Parents besides the one the row hangs under; those already in "needs" are not repeated.
  const also = c.primaryParent ? node.alsoParents.filter((g) => !needs.includes(g)) : [];
  if (needs.length === 0 && also.length === 0) return readingsDetail(c, lang);

  const info = new Map(also.map((g) => {
    const p = data.byChar.get(g);
    const later = p && (levelIndex.get(p.level) ?? 0) > (levelIndex.get(c.level) ?? 0) ? p.level : null;
    return [g, { known: !!p && introduced.has(p.id), later }];
  }));
  const alsoText = (g) => {
    const it = info.get(g);
    return `${g}${it.known ? ' studied' : it.later ? ` comes in ${it.later}` : ''}`;
  };
  const alsoMark = (g) => {
    const it = info.get(g);
    return it.known ? ' ✓' : it.later ? html` <${LevelName} level=${it.later} lang=${lang} />` : '';
  };
  const text = [
    needs.length > 0 && `needs ${needs.join(', ')}`,
    also.length > 0 && `also ${also.map(alsoText).join(', ')}`,
  ].filter(Boolean).join('; ');
  const view = html`${needs.length > 0 && html`needs ${glyphs(needs, lang)}`}${
    needs.length > 0 && also.length > 0 && html`<span class="node-sep" aria-hidden="true"> · </span>`}${
    also.length > 0 && html`also ${glyphs(also, lang, alsoMark)}`}`;
  return { text, view };
}

function Row({ node, ctx, origin = false }) {
  const c = node.char;
  const { lang } = ctx;
  const meaning = c.meanings?.[0] ?? '';
  const detail = origin ? readingsDetail(c, lang) : detailOf(node, ctx);
  const label = [c.char, meaning, origin ? `from ${c.level}` : null, STATUS_WORD[node.status], detail.text || null]
    .filter(Boolean).join(', ');
  const cls = `node node-${node.status}${origin ? ' node-origin' : ''}`;
  return html`
    <button type="button" class=${cls} data-id=${c.id} aria-label=${label} onClick=${() => ctx.open(c.id)}>
      <span class="node-glyph cjk" lang=${lang}>${c.char}</span>
      <span class="node-text">
        <span class="node-meaning">${meaning}</span>
        ${detail.text && html`<span class="node-sub">${detail.view}</span>`}
      </span>
      <span class="node-status" aria-hidden="true">
        ${origin
          ? html`<span class=${`level-tag${lang === 'ko' ? ' hangul' : ''}`}>${c.level}</span>${node.status === 'studied' ? ' ✓' : ''}`
          : node.status === 'studied' ? '✓' : node.status}
      </span>
    </button>`;
}

function Branch({ node, ctx }) {
  return html`
    <li>
      <${Row} node=${node} ctx=${ctx} />
      ${node.children.length > 0 && html`
        <ul class="kids">
          ${node.children.map((k) => html`<${Branch} key=${k.char.id} node=${k} ctx=${ctx} />`)}
        </ul>`}
    </li>`;
}

/** A family that starts from an earlier level's character: that parent heads it. */
function OriginFamily({ group, ctx }) {
  const parent = ctx.data.byId.get(group.parent);
  const head = { char: parent, status: statusOf(parent, ctx.introduced) };
  return html`
    <li>
      <${Row} node=${head} ctx=${ctx} origin />
      <ul class="kids">
        ${group.nodes.map((n) => html`<${Branch} key=${n.char.id} node=${n} ctx=${ctx} />`)}
      </ul>
    </li>`;
}

function LevelChips({ levels, current, lang }) {
  return html`
    <nav class="chips" aria-label="Levels">
      ${levels.map((l) => html`
        <a key=${l.id} class=${lang === 'ko' ? 'chip hangul' : 'chip'} lang=${lang === 'ko' ? 'ko' : null}
          href=${routeHref('characters', l.id)} aria-current=${l.id === current ? 'page' : null}>${l.id}</a>`)}
    </nav>`;
}

function PracticeEntry({ level, count }) {
  if (count === 0) {
    return html`
      <div class="practice">
        <button type="button" class="btn btn-quiet" disabled aria-describedby="practice-hint">Practice this level</button>
        <p id="practice-hint" class="practice-hint">Study a few characters first</p>
      </div>`;
  }
  return html`
    <div class="practice">
      <a class="btn btn-quiet" href=${routeHref('practice', level)} aria-describedby="practice-hint">Practice this level</a>
      <p id="practice-hint" class="practice-hint">
        The ${count} ${count === 1 ? 'character' : 'characters'} you have studied, shuffled. Your schedule stays as it is.
      </p>
    </div>`;
}

export function Characters({ s, level, sheetId }) {
  const lang = s.lang;
  const data = s.data[lang];
  const introduced = useMemo(() => introducedSet(s.states), [s.states]);
  const forest = useMemo(() => buildForest(data.chars, level, introduced), [data, level, introduced]);
  const groups = useMemo(() => familyGroups(forest), [forest]);
  const levelIndex = useMemo(() => new Map(data.levels.map((l, i) => [l.id, i])), [data]);
  const studiedHere = useMemo(
    () => data.chars.reduce((n, c) => n + (c.level === level && introduced.has(c.id) ? 1 : 0), 0),
    [data, level, introduced],
  );

  const sheetChar = sheetId ? data.byId.get(sheetId) ?? null : null;
  const listRef = useRef(null);
  const opener = useRef(null); // the row the sheet was opened from
  const closing = useRef(false);

  // A ?c= that names no character of this language is dropped.
  useEffect(() => {
    if (sheetId && !sheetChar) go(routeHref('characters', level), { replace: true });
  }, [sheetId, sheetChar, level]);

  // When the sheet closes, focus goes back to the row that opened it.
  const wasOpen = useRef(sheetId);
  useEffect(() => {
    const prev = wasOpen.current;
    wasOpen.current = sheetId;
    closing.current = false;
    if (prev && !sheetId) {
      const id = opener.current ?? prev;
      opener.current = null;
      const row = [...(listRef.current?.querySelectorAll('[data-id]') ?? [])].find((el) => el.dataset.id === id);
      row?.focus();
    }
  }, [sheetId]);

  const ctx = {
    lang,
    data,
    introduced,
    levelIndex,
    open(id) {
      opener.current = id;
      go(routeHref('characters', level, id), { state: SHEET_STATE });
    },
  };

  const showInSheet = (id) => go(routeHref('characters', level, id), { replace: true, state: history.state });
  const closeSheet = () => {
    if (closing.current) return;
    closing.current = true;
    setTimeout(() => { closing.current = false; }, 1000); // in case no route change follows
    // Opened from a row: step back over the entry it added. Opened from a link: replace it.
    if (history.state?.sheet) history.back();
    else go(routeHref('characters', level), { replace: true });
  };

  return html`
    <h1 class="visually-hidden">Characters, <${LevelName} level=${level} lang=${lang} /></h1>
    <${LevelChips} levels=${data.levels} current=${level} lang=${lang} />
    <${PracticeEntry} level=${level} count=${studiedHere} />
    <ul class="forest" ref=${listRef} aria-label="Characters by family">
      ${groups.map((g) => (g.parent
        ? html`<${OriginFamily} key=${g.parent} group=${g} ctx=${ctx} />`
        : html`<${Branch} key=${g.nodes[0].char.id} node=${g.nodes[0]} ctx=${ctx} />`))}
    </ul>
    ${sheetChar && html`
      <${DetailSheet} char=${sheetChar} s=${s} introduced=${introduced}
        onOpen=${showInSheet} onClose=${closeSheet} />`}`;
}
