"""Korean dataset: 한국어문회 8급–5급 (500) plus the 110 most common 4급Ⅱ
characters, built purely from the pinned sources.

hanja-grade.csv (rycont/hanja-grade-dataset) gives levels, 훈음, radicals and
stroke counts; kengdic gives example words (gloss-cleaned rows, minus the
audited wrong-gloss words in tools/data/ko_word_exclusions.json) and how
many words use each character (all hanja rows, whatever the gloss: the 4급Ⅱ
selection and the in-level order); cjkvi-ids gives the
decomposition; animCJK gives meanings (dictionaryKo, then ZhHant, then Ja)
and the 8급–5급 cross-check; kanji.json gives part meanings.
"""
import ast
import csv
import json
import os
from collections import Counter

from hk.common import (load_kanji, load_animcjk, anim_senses, part_meaning,
                       radical_full_form, study_order)
from hk.decompose import (VARIANTS, load_ids, direct_parts, find_parents,
                          pick_primary, drop_deep_single_strokes)
from hk.text import nfc, is_cjk

# hanja-grade.csv level -> (level, sublevel)
LEVEL_MAP = {
    '8급': ('8급', None),
    '7급Ⅱ': ('7급', '7급Ⅱ'),
    '7급': ('7급', None),
    '6급Ⅱ': ('6급', '6급Ⅱ'),
    '6급': ('6급', None),
    '5급Ⅱ': ('5급', '5급Ⅱ'),
    '5급': ('5급', None),
    '4급Ⅱ': ('4급Ⅱ', None),
}
LEVELS = ('8급', '7급', '6급', '5급', '4급Ⅱ')      # study order
RANK = {lv: i for i, lv in enumerate(LEVELS)}

# kengdic form -> hanja-grade.csv form, so the learned character appears in
# its words. The only hand table: extend it only from the Task 6 report, with
# a comment naming the source entry.
KO_MATCH_VARIANTS = {
    '强': '強',   # hanja-grade.csv 強 (6급); kengdic writes 强 (e.g. 强國), never 強
    '畵': '畫',   # hanja-grade.csv 畫 (6급); kengdic writes 畵 (e.g. 畵家), never 畫
}

N_4II = 110
_LVL_ORDER = {'A': 0, 'B': 1, 'C': 2, 'D': 3, '': 4}     # kengdic learner level

# kengdic rows whose gloss is wrong for the word (Task 6b audit): never picked
# as example words. Only excludes; a gloss is never written or edited.
EXCLUSIONS = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
                          'data', 'ko_word_exclusions.json')
_ANIMCJK = ('animcjk-dictionaryKo.txt', 'animcjk-dictionaryZhHant.txt',
            'animcjk-dictionaryJa.txt')


def parse_hun_eum(s):
    """hanja-grade.csv `meaning` cell -> [{hun, eum}], official order.

    The cell is a Python literal: one [[hun, ...], [eum, ...]] per reading.
    A reading with several 훈 for one 음 (經 지날/글 경) becomes one pair per
    훈, in order."""
    out = []
    for huns, eums in ast.literal_eval(nfc(s)):
        for hun in huns:
            for eum in eums:
                out.append({'hun': hun.strip(), 'eum': eum.strip()})
    return out


# Hangul jamo, compatibility jamo, jamo extended A, syllables, jamo extended B
_HANGUL_RANGES = ((0x1100, 0x11FF), (0x3130, 0x318F), (0xA960, 0xA97F),
                  (0xAC00, 0xD7AF), (0xD7B0, 0xD7FF))


def _is_hangul(s):
    return bool(s) and all(0xAC00 <= ord(c) <= 0xD7A3 for c in s)


def _has_hangul_or_cjk(s):
    return any(is_cjk(c) or any(a <= ord(c) <= b for a, b in _HANGUL_RANGES)
               for c in s)


def _kengdic_rows(path):
    """(row, w, hangul) for each kengdic row, in file order, whose NFC hanja
    is >= 2 characters, all CJK, as long as the surface, and whose surface
    is all hangul syllables (drops "4중주" for 四重奏). `w` is the hanja
    mapped through KO_MATCH_VARIANTS."""
    with open(path, encoding='utf-8', newline='') as f:
        for row in csv.DictReader(f, delimiter='\t', quoting=csv.QUOTE_NONE):
            hanja = nfc(row['hanja']).strip()
            surface = nfc(row['surface']).strip()
            if (len(hanja) < 2 or not all(is_cjk(c) for c in hanja)
                    or len(hanja) != len(surface) or not _is_hangul(surface)):
                continue
            yield row, ''.join(KO_MATCH_VARIANTS.get(c, c) for c in hanja), surface


def load_kengdic_hanja(path):
    """kengdic.tsv -> [{w, hangul}]: every row that passes the hanja/surface
    filters, whatever its gloss (empty, hangul, anything). R19: this list
    measures how common a character is in Sino-Korean vocabulary, so it
    drives the 4급Ⅱ selection and the in-level order."""
    return [{'w': w, 'hangul': hangul} for _, w, hangul in _kengdic_rows(path)]


def load_kengdic(path):
    """kengdic.tsv -> [{w, hangul, en, lvl}] in file order, for picking words.

    The rows of load_kengdic_hanja whose gloss has no hangul or CJK
    character anywhere and a non-empty first ';' sense (R18: a word must be
    explainable in plain English). `en` is that first sense with whitespace
    runs collapsed and trimmed (R18); `lvl` is A/B/C/D or ''.
    """
    out = []
    for row, w, hangul in _kengdic_rows(path):
        gloss = nfc(row['gloss'])
        en = ' '.join(gloss.split(';')[0].split())
        if not en or _has_hangul_or_cjk(gloss):
            continue
        lvl = nfc(row['level']).strip()
        if lvl not in _LVL_ORDER:
            raise ValueError(f'unknown kengdic level {lvl!r} in row {row["id"]}')
        out.append({'w': w, 'hangul': hangul, 'en': en, 'lvl': lvl})
    return out


def load_exclusions(path):
    """ko_word_exclusions.json -> {(hanja, hangul)}, NFC. The file is a list
    of {hanja, hangul, gloss, reason}; gloss and reason document the audit."""
    with open(path, encoding='utf-8') as f:
        rows = json.load(f)
    return {(nfc(r['hanja']).strip(), nfc(r['hangul']).strip()) for r in rows}


def word_counts(words):
    """Character -> number of words that contain it."""
    count = Counter()
    for e in words:
        count.update(set(e['w']))
    return count


def select_4ii(chars, words, n=N_4II):
    """The n characters used in the most words; ties by code point."""
    count = word_counts(words)
    return sorted(chars, key=lambda c: (-count[c], ord(c)))[:n]


def _tier(ch, entry, rank):
    w = entry['w']
    if ch not in w:
        return None
    han = [c for c in w if is_cjk(c)]
    if entry['lvl'] in ('A', 'B') and all(
            rank.get(c) is not None and rank[c] <= rank[ch] for c in han):
        return 1
    outside = sum(1 for c in han if c not in rank)
    if outside == 0:
        return 2
    if outside == 1:
        return 3
    return None


def pick_words_ko(ch, rank, words, exclude=frozenset()):
    """Up to 3 example words for ch, best first.

    rank: character -> level index (8급 0 ... 4급Ⅱ 4) for the 610.
    exclude: (w, hangul) pairs never picked, whatever their gloss (every row
    of such a pair is skipped, so the next candidate takes its place).
    T1: kengdic level A/B and every hanja at a level <= ch's.
    T2: every hanja in the 610.  T3: at most one hanja outside them.
    Within a tier: level A, B, C, D, none; then shorter; then file order.
    """
    ranked = []
    for i, e in enumerate(words):
        if (e['w'], e['hangul']) in exclude:
            continue
        t = _tier(ch, e, rank)
        if t is not None:
            ranked.append(((t, _LVL_ORDER[e['lvl']], len(e['w']), i), e))
    ranked.sort(key=lambda x: x[0])
    out, seen = [], set()
    for _, e in ranked:
        if e['w'] in seen:
            continue
        seen.add(e['w'])
        out.append({'w': e['w'], 'hangul': e['hangul'], 'en': e['en']})
        if len(out) == 3:
            break
    return out


def char_meanings(ch, *animcjk):
    """First 3 senses from the first animCJK dictionary (in the order given)
    whose definition of ch has any; [] if none does."""
    for d in animcjk:
        senses = anim_senses(d.get(ch))
        if senses:
            return senses[:3]
    return []


def ko_study_order(chars, level, sublevel, required, count):
    """Levels 8급 ... 4급Ⅱ; inside a level a topological sort over required
    parents with key (Ⅱ sub-level first, more words first, code point), so a
    required parent from a later sub-level still comes first."""
    unknown = sorted(c for c in chars if level[c] not in RANK)
    if unknown:
        raise ValueError(f'characters outside {LEVELS}: {unknown}')

    def key(c):
        return (0 if sublevel[c] else 1, -count.get(c, 0), ord(c))

    groups = [(lv, [c for c in chars if level[c] == lv]) for lv in LEVELS]
    return study_order(groups, required, key)


# ---------------------------------------------------------------- loaders

def _load_grade(src):
    """hanja-grade.csv rows at 8급 ... 4급Ⅱ, keyed by NFC character."""
    rows = {}
    with open(os.path.join(src, 'hanja-grade.csv'), encoding='utf-8', newline='') as f:
        for row in csv.DictReader(f):
            lv = nfc(row['level']).strip()
            if lv not in LEVEL_MAP:
                continue
            c = nfc(row['hanja']).strip()
            if c in rows:
                raise ValueError(f'hanja-grade.csv lists {c} twice')
            rows[c] = {'level': LEVEL_MAP[lv][0], 'sublevel': LEVEL_MAP[lv][1],
                       'hunEum': parse_hun_eum(row['meaning']),
                       'radical': radical_full_form(row['radical']),
                       'strokes': int(row['total_strokes'])}
    return rows


def _check_animcjk_sets(rows, ko):
    """The 8급–5급 characters must equal animCJK dictionaryKo's hanja8–5."""
    for n in (8, 7, 6, 5):
        lv = f'{n}급'
        want = {c for c, d in ko.items() if f'hanja{n}' in d.get('set', ())}
        got = {c for c, r in rows.items() if r['level'] == lv}
        if want != got:
            raise ValueError(f'{lv} differs from animCJK hanja{n}: '
                             f'only csv {sorted(got - want)}, only animCJK {sorted(want - got)}')


# ---------------------------------------------------------------- build

def build_ko(src, exclusions=EXCLUSIONS):
    """Build the Korean dataset dict from the sources folder `src`.
    `exclusions`: the audited wrong-gloss word list (Task 6b)."""
    rows = _load_grade(src)
    anims = tuple(load_animcjk(os.path.join(src, name)) for name in _ANIMCJK)
    kanji = load_kanji(os.path.join(src, 'kanji.json'))
    ids = load_ids(os.path.join(src, 'ids.txt'), 'K')
    kengdic = os.path.join(src, 'kengdic.tsv')
    words = load_kengdic(kengdic)              # gloss-cleaned: for picking words
    excluded = load_exclusions(exclusions)     # wrong glosses: never picked
    vocab = load_kengdic_hanja(kengdic)        # any gloss: for how common (R19)
    count = word_counts(vocab)
    _check_animcjk_sets(rows, anims[0])

    pool = sorted(c for c, r in rows.items() if r['level'] == '4급Ⅱ')
    picked = set(select_4ii(pool, vocab))
    chars = sorted(c for c, r in rows.items() if r['level'] != '4급Ⅱ' or c in picked)
    study = set(chars)
    level = {c: rows[c]['level'] for c in chars}
    sublevel = {c: rows[c]['sublevel'] for c in chars}
    strokes = {c: rows[c]['strokes'] for c in chars}
    rank = {c: RANK[level[c]] for c in chars}

    missing = [c for c in chars if c not in ids]
    if missing:
        raise ValueError(f'hanja missing from ids.txt: {missing}')

    parents = {c: drop_deep_single_strokes(c, find_parents(c, ids, study), ids, strokes)
               for c in chars}
    required = {c: [p for p in parents[c] if rank[p] <= rank[c]] for c in chars}
    order = ko_study_order(chars, level, sublevel, required, count)

    def ref(c):
        return f'ko:{c}'

    part_meanings = {}
    records = []
    for i, c in enumerate(order):
        parts = []
        for p in direct_parts(c, ids):
            if p not in part_meanings:
                part_meanings[p] = part_meaning(p, kanji, *anims)
            base = p if p in study else VARIANTS.get(p)
            parts.append({'char': p, 'meaning': part_meanings[p],
                          'ref': ref(base) if base in study else None})
        primary = pick_primary(required[c], strokes, rows[c]['radical'])
        records.append({
            'id': ref(c),
            'char': c,
            'level': level[c],
            'sublevel': sublevel[c],
            'order': i,
            'strokes': strokes[c],
            'meanings': char_meanings(c, *anims),
            'hunEum': rows[c]['hunEum'],
            'parts': parts,
            'parents': [ref(p) for p in parents[c]],
            'required': [ref(p) for p in required[c]],
            'primaryParent': ref(primary) if primary else None,
            'words': pick_words_ko(c, rank, words, excluded),
        })

    return {
        'lang': 'ko',
        'levels': [{'id': lv, 'count': sum(1 for c in chars if level[c] == lv)}
                   for lv in LEVELS],
        'chars': records,
        'parts': {p: part_meanings[p] for p in sorted(part_meanings)},
    }
