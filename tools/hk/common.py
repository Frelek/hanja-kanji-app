"""Helpers shared by the Japanese and Korean builders: NFC-keyed loading,
meaning cleanup (kanji.json and animCJK), part meanings, the radical's full
form, and the per-level topological study order."""
import heapq
import json
import re

from hk.decompose import VARIANTS
from hk.text import nfc

XREF = re.compile(r'\b(form|same as|variant|interchangeable)\b', re.I)
RADICAL = re.compile('radical', re.I)
KANJI_MARKS = ('grade', 'jlpt_new', 'jlpt_old', 'freq')
_LEAD_PAREN = re.compile(r'\s*[(（]([^()（）]*)[)）]')


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


def load_kanji(path):
    """kanji.json (kanji-data) keyed by NFC character."""
    with open(path, encoding='utf-8') as f:
        return nfc_dict(json.load(f).items())


def load_animcjk(path):
    """An animCJK dictionary*.txt (JSON lines) keyed by NFC character."""
    pairs = []
    with open(path, encoding='utf-8') as f:
        for line in f:
            if line.strip():
                d = json.loads(line)
                pairs.append((d['character'], d))
    return nfc_dict(pairs)


def title_case(s):
    """Upper-case the first character of each space-separated word, leaving
    the rest as is (kanji-data style): "according to" -> "According To"."""
    return ' '.join(w[:1].upper() + w[1:] for w in s.strip().split(' '))


def clean_meanings(raw):
    """kanji.json meanings in source (Title) case, radical labels dropped,
    first 3."""
    out = [nfc(m).strip() for m in raw or []
           if m.strip() and not RADICAL.search(m)]
    return out[:3]


def split_outside_parens(s, sep):
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


def strip_xref(s):
    """Drop leading cross-references: "(ancient form of 得) to get" -> "to get",
    "(variant of 羊), sheep" -> "sheep"."""
    while True:
        m = _LEAD_PAREN.match(s)
        if not m or not XREF.search(m.group(1)):
            return s.strip()
        s = s[m.end():].lstrip(' ,')


def anim_senses(entry):
    """Every usable sense of an animCJK definition, in order: split on ';'
    and then ',' (outside parentheses), skipping ';'-senses that are radical
    labels and stripping leading cross-references; Title-Cased."""
    definition = nfc((entry or {}).get('definition') or '')
    out = []
    for sense in split_outside_parens(definition, ';'):
        sense = sense.strip()
        if not sense or RADICAL.search(sense):
            continue
        for piece in split_outside_parens(strip_xref(sense), ','):
            piece = strip_xref(piece)
            if piece:
                out.append(title_case(piece))
    return out


def anim_sense(entry):
    """First usable sense of an animCJK definition (see anim_senses)."""
    senses = anim_senses(entry)
    return senses[0] if senses else None


def kanji_sense(entry):
    """First non-radical kanji.json meaning, used only for kanji that are used
    in Japanese: entries with a grade, JLPT level or frequency."""
    if not entry or all(entry.get(f) is None for f in KANJI_MARKS):
        return None
    m = clean_meanings(entry.get('meanings'))
    return m[0] if m else None


def part_meaning(p, kanji, *animcjk):
    """Meaning shown for a part: (1) its kanji.json meaning if it is a kanji
    used in Japanese (言 "Say"); (2) for a radical variant, the full form's
    (亻 "Person", 礻 "Show"); (3) its animCJK sense (宀 "Roof"), from the first
    of the given animCJK dictionaries that has one; (4) its own kanji.json
    meaning anyway (乂 "Mow"); (5) None."""
    m = kanji_sense(kanji.get(p))
    if m is None and p in VARIANTS:
        m = kanji_sense(kanji.get(VARIANTS[p]))
    for d in animcjk:
        if m is None:
            m = anim_sense(d.get(p))
    if m is None:
        own = clean_meanings((kanji.get(p) or {}).get('meanings'))
        m = own[0] if own else None
    return m


def radical_full_form(r):
    """First character of a radical field, mapped to its full form (亻 -> 人,
    "亻 (人)" -> 人) so it can match a parent; None when empty."""
    r = nfc(r or '').strip()
    return VARIANTS.get(r[0], r[0]) if r else None


def study_order(groups, required, key):
    """Concatenated Kahn topological sorts, one per group.

    groups: [(label, [chars])] in study order. Inside a group only required
    edges between members count (parents in earlier groups already come
    first); the available char with the lowest key(c) goes next. Raises
    ValueError naming the group on a cycle.
    """
    order = []
    for label, nodes in groups:
        members = set(nodes)
        indeg = {c: 0 for c in nodes}
        children = {c: [] for c in nodes}
        for c in nodes:
            for p in required[c]:
                if p in members:
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
            stuck = sorted(members - set(done))
            raise ValueError(f'cycle in required parents at {label}: {stuck}')
        order += done
    return order
