// Stroke-order animator (spec 7.1.5). Each stroke file holds the centre lines ("medians")
// of a character in drawing order, in a 1024 box with y pointing up. Every centre line is
// drawn as a round-capped ink path whose dash offset runs down to zero, like a pen writing.

export const STROKE_MS = 600;
export const GAP_MS = 150;
export const STROKE_WIDTH = 64;
/** Flips the y-up source box into SVG's y-down one. */
export const FLIP = 'scale(1,-1) translate(0,-900)';

const LANGS = new Set(['ja', 'ko']);
const SVG_NS = 'http://www.w3.org/2000/svg';
const EASE = 'cubic-bezier(0.45, 0.05, 0.4, 1)';
const NUM_SIZE = 64;

/** Total length of a polyline given as [[x, y], ...]. */
export function polylineLength(points) {
  let length = 0;
  for (let i = 1; i < points.length; i++) {
    length += Math.hypot(points[i][0] - points[i - 1][0], points[i][1] - points[i - 1][1]);
  }
  return length;
}

/** The path `d` of a polyline. One point gives a zero-length line, which draws a round dot. */
export function pathD(points) {
  if (points.length === 0) return '';
  const [first, ...rest] = points;
  const tail = rest.length > 0 ? rest : [first];
  return `M${first[0]} ${first[1]}${tail.map(([x, y]) => `L${x} ${y}`).join('')}`;
}

/** `./data/strokes/<lang>/<hex>.json`, hex being the lowercase, unpadded code point. */
export function strokeUrl(lang, char) {
  if (!LANGS.has(lang)) throw new Error(`Unknown language: ${lang}`);
  const cp = String(char ?? '').codePointAt(0);
  if (cp === undefined) throw new Error('No character');
  return `./data/strokes/${lang}/${cp.toString(16)}.json`;
}

/** The medians of a stroke file, or null when the file is not the expected shape. */
export function parseStrokes(json) {
  const m = json?.m;
  if (!Array.isArray(m) || m.length === 0) return null;
  for (const stroke of m) {
    if (!Array.isArray(stroke) || stroke.length === 0) return null;
    for (const p of stroke) {
      if (!Array.isArray(p) || p.length !== 2 || !p.every(Number.isFinite)) return null;
    }
  }
  return m;
}

const inBox = ([x, y]) => x >= 40 && x <= 984 && y >= -90 && y <= 860;

/**
 * Where each stroke number goes, in source coordinates: just behind the stroke's start,
 * moved aside when an earlier number already sits there (口's first two strokes share
 * a corner, for one).
 */
export function numberSpots(medians, minGap = 84) {
  const placed = [];
  for (const stroke of medians) {
    const [sx, sy] = stroke[0];
    const next = stroke.find(([x, y]) => Math.hypot(x - sx, y - sy) > 1) ?? [sx + 1, sy];
    const len = Math.hypot(next[0] - sx, next[1] - sy);
    const dx = (next[0] - sx) / len;
    const dy = (next[1] - sy) / len;
    const at = (along, across) => [Math.round(sx + dx * along - dy * across), Math.round(sy + dy * along + dx * across)];
    const candidates = [at(-52, 0), at(-20, 64), at(-20, -64), at(-110, 0), at(40, 76), at(40, -76), [sx, sy]];
    const clearance = (p) => Math.min(Infinity, ...placed.map((q) => Math.hypot(p[0] - q[0], p[1] - q[1])));
    let best = null;
    let bestGap = -1;
    for (const c of candidates) {
      if (!inBox(c)) continue;
      const gap = clearance(c);
      if (gap >= minGap) {
        best = c;
        break;
      }
      if (gap > bestGap) {
        best = c;
        bestGap = gap;
      }
    }
    placed.push(best ?? [sx, sy]);
  }
  return placed;
}

// Parsed stroke files by URL, so reopening a sheet does not fetch again.
const cache = new Map();

async function loadStrokes(url, signal) {
  if (cache.has(url)) return cache.get(url);
  const res = await fetch(url, { signal });
  if (!res.ok) return null;
  const medians = parseStrokes(await res.json());
  if (medians) cache.set(url, medians);
  return medians;
}

const svgEl = (name, attrs = {}) => {
  const el = document.createElementNS(SVG_NS, name);
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
  return el;
};

function strokePath(points, colour) {
  return svgEl('path', {
    d: pathD(points),
    fill: 'none',
    'stroke-width': String(STROKE_WIDTH),
    'stroke-linecap': 'round',
    'stroke-linejoin': 'round',
    style: `stroke: ${colour}`,
  });
}

function showFallback(el, lang, char) {
  el.textContent = '';
  const box = document.createElement('div');
  box.className = 'strokes-fallback';
  const glyph = document.createElement('span');
  glyph.className = 'strokes-fallback-glyph cjk';
  glyph.lang = lang;
  glyph.style.fontFamily = 'var(--cjk)';
  glyph.textContent = char;
  const note = document.createElement('p');
  note.className = 'strokes-fallback-note';
  note.textContent = 'Stroke order not available';
  box.append(glyph, note);
  el.append(box);
}

/**
 * Draws `char`'s strokes into `el` and returns the controls. Without reduced motion it
 * plays once when loaded; with it, it shows the finished character with stroke numbers.
 * `onState({ ok, total, done, shown, playing, numbers })` reports every change: `done`
 * strokes are drawn in full, `shown` counts the one being drawn too. `ok` is null while
 * loading and false when there is no stroke data.
 */
export function mountStrokes(el, lang, char, { reducedMotion = false, hasStrokes = true, onState } = {}) {
  const abort = new AbortController();
  let destroyed = false;
  let ok = null;
  let strokes = []; // { path, num, length, hidden }
  let numbers = reducedMotion;
  let done = 0; // strokes drawn in full
  let active = null; // { index, anim } while a stroke is being drawn
  let timer = 0;
  let playing = false;
  let wantPlay = false; // play() or replay() pressed while loading

  const report = () => {
    if (destroyed) return;
    const shown = active ? active.index + 1 : done;
    onState?.({ ok, total: strokes.length, done, shown, playing, numbers });
  };

  const setShown = (s, shown) => {
    s.path.style.visibility = shown ? 'visible' : 'hidden';
    s.num.style.visibility = shown && numbers ? 'visible' : 'hidden';
  };

  function halt() {
    clearTimeout(timer);
    timer = 0;
    playing = false;
    if (active) {
      const { index, anim } = active;
      active = null;
      anim.onfinish = null;
      anim.cancel(); // the inline offset is already 0: the stroke shows in full
      done = index + 1;
    }
  }

  function reset() {
    halt();
    for (const s of strokes) setShown(s, false);
    done = 0;
  }

  function drawStroke(i, after) {
    const s = strokes[i];
    s.path.style.strokeDashoffset = '0px';
    setShown(s, true);
    if (reducedMotion || s.hidden === 0 || typeof s.path.animate !== 'function') {
      done = i + 1;
      after();
      return;
    }
    const anim = s.path.animate(
      [{ strokeDashoffset: `${s.hidden}px` }, { strokeDashoffset: '0px' }],
      { duration: STROKE_MS, easing: EASE },
    );
    active = { index: i, anim };
    anim.onfinish = () => {
      active = null;
      done = i + 1;
      after();
    };
  }

  function runFrom(i) {
    playing = true;
    const next = (k) => {
      if (destroyed) return;
      if (k >= strokes.length) {
        playing = false;
        report();
        return;
      }
      drawStroke(k, () => {
        report();
        if (k + 1 >= strokes.length) {
          playing = false;
          report();
        } else {
          timer = setTimeout(() => next(k + 1), reducedMotion ? STROKE_MS + GAP_MS : GAP_MS);
        }
      });
    };
    next(i);
    report();
  }

  function build(medians) {
    el.textContent = '';
    const svg = svgEl('svg', {
      viewBox: '0 0 1024 1024',
      class: 'strokes-svg',
      role: 'img',
      'aria-label': `Stroke order of ${char}, ${medians.length} ${medians.length === 1 ? 'stroke' : 'strokes'}`,
    });
    const flip = svgEl('g', { transform: FLIP });
    const ghost = svgEl('g', { class: 'strokes-ghost', 'aria-hidden': 'true' });
    const ink = svgEl('g', { class: 'strokes-ink', 'aria-hidden': 'true' });
    const nums = svgEl('g', { class: 'strokes-nums', 'aria-hidden': 'true' });
    flip.append(ghost, ink, nums);
    svg.append(flip);
    el.append(svg);

    const spots = numberSpots(medians);
    strokes = medians.map((points, i) => {
      ghost.append(strokePath(points, 'var(--stroke-ghost, var(--line))'));
      const path = strokePath(points, 'var(--ink)');
      ink.append(path);
      let measured = 0;
      try {
        measured = typeof path.getTotalLength === 'function' ? path.getTotalLength() : 0;
      } catch {
        // Not measurable here (no layout): the polyline's own length is the same number.
      }
      const length = measured > 0 ? measured : polylineLength(points);
      // A dash as long as the stroke, then a longer gap; at offset length + 1 the whole
      // dash (and its round caps) sits before the start, so nothing shows.
      const hidden = length >= 1 ? Math.ceil(length) + 1 : 0;
      if (hidden > 0) path.style.strokeDasharray = `${Math.ceil(length)}px ${Math.ceil(length) + STROKE_WIDTH}px`;
      const [x, y] = spots[i];
      // Counter-flipped so the numeral reads upright inside the flipped group.
      const num = svgEl('text', {
        transform: `translate(${x} ${y}) scale(1 -1)`,
        'text-anchor': 'middle',
        'dominant-baseline': 'central',
        'font-size': String(NUM_SIZE),
        style: 'fill: var(--stroke-num, var(--ink)); stroke: var(--card); stroke-width: 18px; paint-order: stroke; font-family: var(--ui); font-weight: 700',
      });
      num.textContent = String(i + 1);
      nums.append(num);
      const s = { path, num, length, hidden };
      setShown(s, false);
      return s;
    });
  }

  async function start() {
    let medians = null;
    if (hasStrokes) {
      try {
        medians = await loadStrokes(strokeUrl(lang, char), abort.signal);
      } catch {
        medians = null;
      }
    }
    if (destroyed) return;
    if (!medians) {
      ok = false;
      showFallback(el, lang, char);
      report();
      return;
    }
    ok = true;
    build(medians);
    if (reducedMotion && !wantPlay) {
      for (const s of strokes) setShown(s, true);
      done = strokes.length;
      report();
    } else {
      runFrom(0);
    }
  }

  start();
  report();

  return {
    play() {
      if (ok === null) {
        wantPlay = true;
        return;
      }
      if (!ok || playing) return;
      if (done >= strokes.length) reset();
      runFrom(done);
    },
    replay() {
      if (ok === null) {
        wantPlay = true;
        return;
      }
      if (!ok) return;
      reset();
      runFrom(0);
    },
    step() {
      if (!ok) return;
      const snapping = active !== null;
      halt();
      if (!snapping) {
        if (done >= strokes.length) reset();
        drawStroke(done, report);
      }
      report();
    },
    toggleNumbers() {
      numbers = !numbers;
      strokes.forEach((s, i) => {
        s.num.style.visibility = numbers && (i < done || active?.index === i) ? 'visible' : 'hidden';
      });
      report();
      return numbers;
    },
    destroy() {
      destroyed = true;
      abort.abort();
      halt();
      el.textContent = '';
    },
  };
}
