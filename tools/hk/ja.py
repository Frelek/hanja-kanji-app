"""Japanese dataset: JLPT N5-N3 kanji built purely from the pinned sources.

kanji.json (kanji-data / KANJIDIC) gives levels, strokes, meanings, frequency;
joyo2010.txt gives the Joyo readings; the JLPT vocabulary CSVs give example
words; cjkvi-ids gives the decomposition; animCJK gives radicals and fallback
part meanings.
"""
import csv
import heapq
import json
import os
import re

from hk.decompose import (VARIANTS, load_ids, direct_parts, find_parents,
                          pick_primary, drop_deep_single_strokes)
from hk.text import nfc, is_cjk

LEVELS = (5, 4, 3)                      # study order: N5 first
_KANA_RANGE = chr(0x3040) + '-' + chr(0x30FF)          # all kana, incl. ・ and ー
_KANA = re.compile('^[' + _KANA_RANGE + ']+$')
_KANA_GROUP = re.compile(r'\s*[(（][' + _KANA_RANGE + r']+[)）]$')   # " (する)"
_PARENS = '（）()'
_XREF = re.compile(r'\b(form|same as|variant|interchangeable)\b', re.I)
_RADICAL = re.compile('radical', re.I)
_AFFIX = '～〜'
_KANJI_MARKS = ('grade', 'jlpt_new', 'jlpt_old', 'freq')


def nfc_dict(pairs):
    """Dict keyed by NFC(key). A key that is already NFC wins over a
    compatibility form that normalises onto it; otherwise the first wins."""
    out, exact = {}, set()
    for key, value in pairs:
        k = nfc(key)
        if k == key and k not in exact:
            out[k] = value
            exact.add(k)
        elif k not in out:
            out[k] = value
    return out


def _is_katakana(s):
    return bool(s) and all(0x30A0 <= ord(c) <= 0x30FF for c in s)


def _is_hiragana(s):
    return bool(s) and all(0x3040 <= ord(c) <= 0x309F or c == '-' for c in s)


def parse_joyo_readings(field):
    """Joyo reading column -> (on, kun). Katakana is on; hiragana is kun with
    '-' (okurigana) changed to '.'. Parenthesised (limited-use) readings go
    last in their list, parentheses stripped."""
    on, kun, on_ltd, kun_ltd = [], [], [], []
    for r in nfc(field).split('、'):
        r = r.strip()
        if not r:
            continue
        limited = r[0] in _PARENS
        if limited:
            r = r.strip(_PARENS).strip()
        if _is_katakana(r):
            (on_ltd if limited else on).append(r)
        elif _is_hiragana(r):
            (kun_ltd if limited else kun).append(r.replace('-', '.'))
        else:
            raise ValueError(f'unrecognised Joyo reading {r!r} in {field!r}')
    return on + on_ltd, kun + kun_ltd


def _kana_edges(w):
    """Leading and trailing kana runs of an expression."""
    def run(s):
        out = ''
        for c in s:
            if not _KANA.match(c):
                break
            out += c
        return out
    return run(w), run(w[::-1])[::-1]


def _reading_for(i, w, readings, paired):
    """Reading for the i-th expression alternative: the index-paired one when
    counts match, else the first whose kana fits the expression's leading and
    trailing kana (お金持ち -> おかねもち, not かねもち); else the first."""
    order = ([readings[i]] if paired else []) + readings
    head, tail = _kana_edges(w)
    for r in order:
        if r.startswith(head) and r.endswith(tail):
            return r
    return order[0]


def parse_jlpt_csv(path, n):
    """One JLPT vocabulary file -> [{w, kana, en, n}] in file order.

    Expressions listed as alternatives ("川; 河") become one entry each. A
    trailing parenthesised kana group is cut from a reading ("べんきょう (する)"
    -> "べんきょう"); rows whose kana is still not pure kana are dropped. `en`
    is the first ';' sense.
    """
    out = []
    with open(path, encoding='utf-8', newline='') as f:
        for row in csv.DictReader(f):
            exprs = [nfc(e).strip() for e in row['expression'].split(';')]
            exprs = [e for e in exprs if e]
            reads = [_KANA_GROUP.sub('', nfc(r).strip()).strip()
                     for r in row['reading'].split(';')]
            reads = [r for r in reads if r]
            if not exprs or not reads:
                continue
            en = nfc(row['meaning']).split(';')[0].strip()
            paired = len(exprs) == len(reads)
            for i, w in enumerate(exprs):
                kana = _reading_for(i, w, reads, paired)
                if _KANA.match(kana):
                    out.append({'w': w, 'kana': kana, 'en': en, 'n': n})
    return out


def title_case(s):
    """Upper-case the first character of each space-separated word, leaving
    the rest as is (kanji-data style): "according to" -> "According To"."""
    return ' '.join(w[:1].upper() + w[1:] for w in s.strip().split(' '))


def clean_meanings(raw):
    """kanji.json meanings in source (Title) case, radical labels dropped,
    first 3."""
    out = [nfc(m).strip() for m in raw or []
           if m.strip() and not _RADICAL.search(m)]
    return out[:3]


def _tier(ch, level_n, entry, kanji_level):
    if ch not in entry['w']:
        return None
    lvs = [kanji_level.get(c) for c in entry['w'] if is_cjk(c)]
    if entry['n'] >= level_n and all(v is not None and v >= level_n for v in lvs):
        return 1
    if all(v is not None and v in LEVELS for v in lvs):
        return 2
    if entry['w'] == ch:
        return 3
    return None


def pick_words_ja(ch, level_n, vocab, kanji_level):
    """Up to 3 example words for ch, best first.

    T1: list level >= the char's level and every kanji at a level >= it.
    T2: any list, every kanji in N5-N3.  T3: the word equal to the char.
    Within a tier: easier list first, then shorter, then file order.
    Affix entries (an expression with ～/〜) are used only when the char
    would otherwise have no words at all.
    """
    ranked = []
    for i, e in enumerate(vocab):
        t = _tier(ch, level_n, e, kanji_level)
        if t is not None:
            ranked.append(((t, -e['n'], len(e['w']), i), e))
    ranked.sort(key=lambda x: x[0])
    plain = [x for x in ranked if not any(a in x[1]['w'] for a in _AFFIX)]
    out, seen = [], set()
    for _, e in plain or ranked:
        if e['w'] in seen:
            continue
        seen.add(e['w'])
        out.append({'w': e['w'], 'kana': e['kana'], 'en': e['en'],
                    'level': f"N{e['n']}"})
        if len(out) == 3:
            break
    return out


# ---------------------------------------------------------------- loaders

def _load_kanji(src):
    with open(os.path.join(src, 'kanji.json'), encoding='utf-8') as f:
        return nfc_dict(json.load(f).items())


def _load_joyo(src):
    pairs = []
    with open(os.path.join(src, 'joyo2010.txt'), encoding='utf-8') as f:
        for line in f:
            if line.startswith('#') or not line.strip():
                continue
            cols = line.rstrip('\r\n').split('\t')
            pairs.append((cols[0], cols[5] if len(cols) > 5 else ''))
    return nfc_dict(pairs)


def _load_animcjk(src):
    pairs = []
    with open(os.path.join(src, 'animcjk-dictionaryJa.txt'), encoding='utf-8') as f:
        for line in f:
            if line.strip():
                d = json.loads(line)
                pairs.append((d['character'], d))
    return nfc_dict(pairs)


def _split_outside_parens(s, sep):
    """Split s on sep, except inside (...) or （...）."""
    out, cur, depth = [], '', 0
    for c in s:
        if c in '(（':
            depth += 1
        elif c in ')）':
            depth = max(depth - 1, 0)
        if c == sep and depth == 0:
            out.append(cur)
            cur = ''
        else:
            cur += c
    out.append(cur)
    return out


_LEAD_PAREN = re.compile(r'\s*[(（]([^()（）]*)[)）]')


def _strip_xref(s):
    """Drop leading cross-references: "(ancient form of 得) to get" -> "to get",
    "(variant of 羊), sheep" -> "sheep"."""
    while True:
        m = _LEAD_PAREN.match(s)
        if not m or not _XREF.search(m.group(1)):
            return s.strip()
        s = s[m.end():].lstrip(' ,')


def _anim_sense(entry):
    """First usable sense of an animCJK definition: split on ';' and then ','
    (outside parentheses), skipping radical labels and leading
    cross-references; Title-Cased."""
    definition = nfc((entry or {}).get('definition') or '')
    for sense in _split_outside_parens(definition, ';'):
        sense = sense.strip()
        if not sense or _RADICAL.search(sense):
            continue
        first = _split_outside_parens(_strip_xref(sense), ',')[0].strip()
        if first:
            return title_case(first)
    return None


def _kanji_sense(entry):
    """First non-radical kanji.json meaning, used only for kanji that are used
    in Japanese: entries with a grade, JLPT level or frequency."""
    if not entry or all(entry.get(f) is None for f in _KANJI_MARKS):
        return None
    m = clean_meanings(entry.get('meanings'))
    return m[0] if m else None


def part_meaning(p, kanji, animcjk):
    """Meaning shown for a part: (1) its kanji.json meaning if it is a kanji
    used in Japanese (言 "Say"); (2) for a radical variant, the full form's
    (亻 "Person", 礻 "Show"); (3) its animCJK sense (宀 "Roof"); (4) its own
    kanji.json meaning anyway (乂 "Mow"); (5) None."""
    m = _kanji_sense(kanji.get(p))
    if m is None and p in VARIANTS:
        m = _kanji_sense(kanji.get(VARIANTS[p]))
    if m is None:
        m = _anim_sense(animcjk.get(p))
    if m is None:
        own = clean_meanings((kanji.get(p) or {}).get('meanings'))
        m = own[0] if own else None
    return m


def _radical(entry):
    """animCJK radical, first character, mapped to its full form (亻 -> 人)
    so it can match a parent."""
    r = nfc((entry or {}).get('radical') or '').strip()
    return VARIANTS.get(r[0], r[0]) if r else None


def _study_order(chars, level, required, freq):
    """Kahn topological sort per level over same-level required edges; the
    available node with the lowest (freq, null last; code point) goes next."""
    def key(c):
        f = freq.get(c)
        return (f is None, f if f is not None else 0, ord(c))

    order = []
    for n in LEVELS:
        nodes = [c for c in chars if level[c] == n]
        indeg = {c: 0 for c in nodes}
        children = {c: [] for c in nodes}
        for c in nodes:
            for p in required[c]:
                if level[p] == n:
                    indeg[c] += 1
                    children[p].append(c)
        heap = [(key(c), c) for c in nodes if indeg[c] == 0]
        heapq.heapify(heap)
        done = []
        while heap:
            _, c = heapq.heappop(heap)
            done.append(c)
            for k in children[c]:
                indeg[k] -= 1
                if indeg[k] == 0:
                    heapq.heappush(heap, (key(k), k))
        if len(done) != len(nodes):
            stuck = sorted(set(nodes) - set(done))
            raise ValueError(f'cycle in required parents at N{n}: {stuck}')
        order += done
    return order


# ---------------------------------------------------------------- build

def build_ja(src):
    """Build the Japanese dataset dict from the sources folder `src`."""
    kanji = _load_kanji(src)
    joyo = _load_joyo(src)
    animcjk = _load_animcjk(src)
    ids = load_ids(os.path.join(src, 'ids.txt'), 'J')
    vocab = []
    for n in LEVELS + (2, 1):
        vocab += parse_jlpt_csv(os.path.join(src, f'jlpt-n{n}.csv'), n)

    level = {c: v['jlpt_new'] for c, v in kanji.items() if v.get('jlpt_new') in LEVELS}
    chars = sorted(level)
    study = set(chars)
    strokes = {c: kanji[c]['strokes'] for c in chars}
    freq = {c: kanji[c].get('freq') for c in chars}

    for name, table in (('joyo2010.txt', joyo), ('ids.txt', ids)):
        missing = [c for c in chars if c not in table]
        if missing:
            raise ValueError(f'kanji missing from {name}: {missing}')

    parents = {c: drop_deep_single_strokes(c, find_parents(c, ids, study), ids, strokes)
               for c in chars}
    required = {c: [p for p in parents[c] if level[p] >= level[c]] for c in chars}
    order = _study_order(chars, level, required, freq)

    def ref(c):
        return f'ja:{c}'

    part_meanings = {}
    records = []
    for i, c in enumerate(order):
        on, kun = parse_joyo_readings(joyo[c])
        parts = []
        for p in direct_parts(c, ids):
            if p not in part_meanings:
                part_meanings[p] = part_meaning(p, kanji, animcjk)
            base = p if p in study else VARIANTS.get(p)
            parts.append({'char': p, 'meaning': part_meanings[p],
                          'ref': ref(base) if base in study else None})
        primary = pick_primary(required[c], strokes, _radical(animcjk.get(c)))
        records.append({
            'id': ref(c),
            'char': c,
            'level': f'N{level[c]}',
            'sublevel': None,
            'order': i,
            'strokes': strokes[c],
            'meanings': clean_meanings(kanji[c]['meanings']),
            'on': on,
            'kun': kun,
            'parts': parts,
            'parents': [ref(p) for p in parents[c]],
            'required': [ref(p) for p in required[c]],
            'primaryParent': ref(primary) if primary else None,
            'words': pick_words_ja(c, level[c], vocab, level),
        })

    return {
        'lang': 'ja',
        'levels': [{'id': f'N{n}', 'count': sum(1 for c in chars if level[c] == n)}
                   for n in LEVELS],
        'chars': records,
        'parts': {p: part_meanings[p] for p in sorted(part_meanings)},
    }
