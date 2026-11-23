// Independent validation of the generated datasets (data/*.json, strokes,
// font coverage). Uses nothing from the Python pipeline except the VARIANTS
// table, which is parsed out of tools/hk/decompose.py as text.
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const p = (...a) => path.join(ROOT, ...a);
const readJson = (...a) => JSON.parse(readFileSync(p(...a), 'utf8'));

const LANGS = ['ja', 'ko'];
const data = Object.fromEntries(LANGS.map((l) => [l, readJson('data', `${l}.json`)]));
const missingStrokes = readJson('tests', 'known-missing-strokes.json');
const fewWords = readJson('tests', 'known-few-words.json');
const coverage = readJson('assets', 'fonts', 'coverage.json');

const EXPECTED_LEVELS = {
  ja: [79, 166, 367],
  ko: [50, 100, 150, 200, 110],
};

const hex = (ch) => ch.codePointAt(0).toString(16);
const strokeFile = (lang, ch) => p('data', 'strokes', lang, `${hex(ch)}.json`);

// ---------------------------------------------------------------- level counts
describe('level counts and uniqueness', () => {
  for (const lang of LANGS) {
    test(`${lang}: level counts are exact`, () => {
      const { levels, chars } = data[lang];
      assert.deepEqual(levels.map((l) => l.count), EXPECTED_LEVELS[lang]);
      for (const lv of levels) {
        assert.equal(chars.filter((c) => c.level === lv.id).length, lv.count, `level ${lv.id}`);
      }
      assert.equal(chars.length, EXPECTED_LEVELS[lang].reduce((a, b) => a + b, 0));
    });
    test(`${lang}: every char and id is unique`, () => {
      const { chars } = data[lang];
      assert.equal(new Set(chars.map((c) => c.char)).size, chars.length);
      assert.equal(new Set(chars.map((c) => c.id)).size, chars.length);
      for (const c of chars) assert.equal(c.id, `${lang}:${c.char}`);
    });
  }
});

// ------------------------------------------------------------ parents and order
const idsPath = p('sources', 'ids.txt');
const haveIds = existsSync(idsPath);
const skipIds = haveIds ? false : 'sources/ids.txt is absent; skipping IDS-based parent checks';

function parseVariants() {
  const src = readFileSync(p('tools', 'hk', 'decompose.py'), 'utf8');
  const m = src.match(/^VARIANTS\s*=\s*\{([\s\S]*?)\}/m);
  assert.ok(m, 'VARIANTS table not found in decompose.py');
  const out = {};
  for (const [, k, v] of m[1].matchAll(/'([^']+)'\s*:\s*'([^']+)'/g)) out[k] = v;
  return out;
}

const TAG = /\[([^\]]*)\]/;
const TAG_G = /\[[^\]]*\]/g;
const isOperator = (c) => {
  const n = c.codePointAt(0);
  return (n >= 0x2ff0 && n <= 0x2ffb) || (n >= 0x2460 && n <= 0x24ff);
};

function loadIds(region) {
  const out = new Map();
  for (const raw of readFileSync(idsPath, 'utf8').split('\n')) {
    if (raw.startsWith('#')) continue;
    const cols = raw.replace(/\r$/, '').normalize('NFC').split('\t');
    if (cols.length < 3 || !cols[1]) continue;
    const alts = cols.slice(2).filter(Boolean);
    if (!alts.length) continue;
    const chosen = alts.find((a) => (TAG.exec(a)?.[1] ?? '').includes(region)) ?? alts[0];
    out.set(cols[1], chosen.replace(TAG_G, '').trim());
  }
  return out;
}

// All operands below ch, recursively; cycle-safe (a char on the stack is skipped).
function components(ch, ids, stack = new Set()) {
  const result = new Set();
  const s = ids.get(ch);
  if (s === undefined || s === ch || stack.has(ch)) return result;
  stack.add(ch);
  for (const c of [...s.replace(TAG_G, '')]) {
    if (isOperator(c) || c === ch) continue;
    result.add(c);
    for (const x of components(c, ids, stack)) result.add(x);
  }
  stack.delete(ch);
  result.delete(ch);
  return result;
}

describe('parents and order', () => {
  for (const lang of LANGS) {
    const { chars } = data[lang];
    const byId = new Map(chars.map((c) => [c.id, c]));

    test(`${lang}: parents and required reference existing ids`, () => {
      const bad = [];
      for (const c of chars) {
        for (const id of c.parents) if (!byId.has(id)) bad.push(`${c.char}->${id}`);
        for (const id of c.required) if (!c.parents.includes(id)) bad.push(`${c.char} required ${id} not in parents`);
        if (c.primaryParent !== null && !c.parents.includes(c.primaryParent)) bad.push(`${c.char} primaryParent`);
        if (c.parents.includes(c.id)) bad.push(`${c.char} is its own parent`);
      }
      assert.deepEqual(bad, []);
    });

    test(`${lang}: required parents have a lower order`, () => {
      const bad = [];
      for (const c of chars) {
        for (const id of c.required) {
          const par = byId.get(id);
          if (!(par.order < c.order)) bad.push(`${c.char}(${c.order}) <- ${par.char}(${par.order})`);
        }
      }
      assert.deepEqual(bad, []);
    });

    test(`${lang}: parent graph has no cycles`, () => {
      const state = new Map(); // 1 = visiting, 2 = done
      const cyc = [];
      const visit = (id) => {
        if (state.get(id) === 2) return;
        if (state.get(id) === 1) { cyc.push(id); return; }
        state.set(id, 1);
        for (const q of byId.get(id).parents) visit(q);
        state.set(id, 2);
      };
      for (const c of chars) visit(c.id);
      assert.deepEqual(cyc, []);
    });

    test(`${lang}: every parent char is a component of the char (IDS walk)`, { skip: skipIds }, () => {
      const variants = parseVariants();
      assert.equal(Object.keys(variants).length, 18);
      const ids = loadIds(lang === 'ja' ? 'J' : 'K');
      const bad = [];
      for (const c of chars) {
        const comps = components(c.char, ids);
        const withVar = new Set([...comps, ...[...comps].filter((x) => variants[x]).map((x) => variants[x])]);
        for (const id of c.parents) {
          const pch = byId.get(id).char;
          if (!withVar.has(pch)) bad.push(`${c.char}: ${pch} not in components`);
        }
      }
      assert.deepEqual(bad, []);
    });
  }
});

// ------------------------------------------------------------------------ words
describe('words', () => {
  for (const lang of LANGS) {
    const { chars } = data[lang];

    test(`${lang}: every word contains its char`, () => {
      const bad = [];
      for (const c of chars) for (const w of c.words) if (!w.w.includes(c.char)) bad.push(`${c.char}: ${w.w}`);
      assert.deepEqual(bad, []);
    });

    test(`${lang}: every char has >= 1 word, >= 2 unless listed`, () => {
      const listed = new Set([...fewWords[lang]]);
      const none = chars.filter((c) => c.words.length < 1).map((c) => c.char);
      assert.deepEqual(none, [], 'chars without any word');
      const few = chars.filter((c) => c.words.length < 2 && !listed.has(c.char)).map((c) => c.char);
      assert.deepEqual(few, [], 'chars with < 2 words not in known-few-words.json');
    });

    test(`${lang}: known-few-words list is not stale`, () => {
      const byChar = new Map(chars.map((c) => [c.char, c]));
      const stale = [];
      for (const ch of fewWords[lang]) {
        const c = byChar.get(ch);
        if (!c) stale.push(`${ch} (not a ${lang} char)`);
        else if (c.words.length >= 2) stale.push(`${ch} (now ${c.words.length} words)`);
      }
      assert.deepEqual(stale, []);
    });
  }

  test('ja: every word kana is kana only', () => {
    const re = /^[぀-ヿ・ー]+$/;
    const bad = [];
    for (const c of data.ja.chars) for (const w of c.words) if (!re.test(w.kana)) bad.push(`${c.char}: ${w.w} ${w.kana}`);
    assert.deepEqual(bad, []);
  });
});

// --------------------------------------------------------------------- readings
describe('readings', () => {
  test('ja: every char has >= 1 on or kun', () => {
    const bad = data.ja.chars.filter((c) => (c.on?.length ?? 0) + (c.kun?.length ?? 0) < 1).map((c) => c.char);
    assert.deepEqual(bad, []);
  });
  test('ko: every char has >= 1 hunEum', () => {
    const bad = data.ko.chars.filter((c) => (c.hunEum?.length ?? 0) < 1).map((c) => c.char);
    assert.deepEqual(bad, []);
  });
});

// ---------------------------------------------------------------------- strokes
describe('strokes', () => {
  test('ja: a stroke file exists for every char', () => {
    const bad = data.ja.chars.filter((c) => !existsSync(strokeFile('ja', c.char))).map((c) => c.char);
    assert.deepEqual(bad, []);
  });

  test('ko: stroke files exist except known-missing (ko only)', () => {
    assert.ok(Array.isArray(missingStrokes));
    const koSet = new Set(data.ko.chars.map((c) => c.char));
    const notKo = missingStrokes.filter((ch) => !koSet.has(ch));
    assert.deepEqual(notKo, [], 'known-missing-strokes.json must hold only Korean chars');
    const listed = new Set(missingStrokes);
    console.log(`known-missing-strokes (${missingStrokes.length}): ${missingStrokes.join('') || '(none)'}`);
    const bad = data.ko.chars.filter((c) => !listed.has(c.char) && !existsSync(strokeFile('ko', c.char))).map((c) => c.char);
    assert.deepEqual(bad, []);
    const stale = missingStrokes.filter((ch) => existsSync(strokeFile('ko', ch)));
    assert.deepEqual(stale, [], 'listed chars that now have strokes');
  });

  for (const lang of LANGS) {
    test(`${lang}: hasStrokes agrees with the files`, () => {
      const bad = data[lang].chars.filter((c) => c.hasStrokes !== existsSync(strokeFile(lang, c.char))).map((c) => c.char);
      assert.deepEqual(bad, []);
    });
    test(`${lang}: no orphan stroke files`, () => {
      const want = new Set(data[lang].chars.map((c) => `${hex(c.char)}.json`));
      const orphans = readdirSync(p('data', 'strokes', lang)).filter((f) => !want.has(f));
      assert.deepEqual(orphans, []);
    });
  }
});

// ------------------------------------------------------------------------ fonts
// CJK ideographs (incl. extensions and compatibility) and kana only.
const CHECKED = /[぀-ヿ㐀-䶿一-鿿豈-﫿\u{20000}-\u{323af}]/u;

function* contentStrings(lang, c) {
  yield c.char;
  if (lang === 'ja') {
    for (const r of [...(c.on ?? []), ...(c.kun ?? [])]) yield r;
    for (const w of c.words) { yield w.w; yield w.kana; }
  } else {
    for (const h of c.hunEum ?? []) { yield h.hun; yield h.eum; }
    for (const w of c.words) { yield w.w; yield w.hangul; }
  }
  for (const m of c.meanings ?? []) yield m;
  for (const w of c.words) if (w.en) yield w.en;
}

describe('font coverage', () => {
  test('every CJK ideograph and kana in content is covered', () => {
    const covered = new Set([...coverage['klee-one-600'], ...coverage['fallback-serif']]);
    const bad = new Set();
    for (const lang of LANGS) {
      for (const c of data[lang].chars) {
        for (const s of contentStrings(lang, c)) {
          for (const ch of s) if (CHECKED.test(ch) && !covered.has(ch)) bad.add(ch);
        }
      }
    }
    assert.deepEqual([...bad], []);
  });
});

// ---------------------------------------------------------------------- hygiene
describe('hygiene', () => {
  const COMPAT = /[豈-﫿]/;
  function* walk(v, where) {
    if (typeof v === 'string') yield [where, v];
    else if (Array.isArray(v)) for (let i = 0; i < v.length; i++) yield* walk(v[i], `${where}[${i}]`);
    else if (v && typeof v === 'object') for (const [k, x] of Object.entries(v)) { yield [`${where}.${k}(key)`, k]; yield* walk(x, `${where}.${k}`); }
  }
  for (const lang of LANGS) {
    test(`${lang}: no CJK compatibility ideographs (U+F900-FAFF) in any string`, () => {
      const bad = [];
      for (const [where, s] of walk(data[lang], lang)) if (COMPAT.test(s)) bad.push(`${where}: ${s}`);
      assert.deepEqual(bad.slice(0, 20), []);
    });
  }
  test('no compatibility ideographs in font coverage', () => {
    for (const k of Object.keys(coverage)) assert.ok(!COMPAT.test(coverage[k]), k);
  });
});
