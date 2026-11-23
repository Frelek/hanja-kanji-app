"""IDS decomposition and parent finding.

A "parent" of a character is the largest study-set character that genuinely
appears inside it according to the IDS data. Never guesses: a character that
is atomic in the source has no parents.
"""
import re

from hk.text import nfc

# Radical/component forms that stand for a full character. 月, 阝 and 王 are
# deliberately absent: they are ambiguous (meat/moon, hill/town, jade/king).
VARIANTS = {
    '亻': '人', '氵': '水', '扌': '手', '忄': '心', '灬': '火', '礻': '示',
    '衤': '衣', '訁': '言', '飠': '食', '釒': '金', '糹': '糸', '艹': '艸',
    '⺾': '艸', '辶': '辵', '⻌': '辵', '刂': '刀',
}

_TAG = re.compile(r'\[([^\]]*)\]')


def _is_operator(c):
    return 0x2FF0 <= ord(c) <= 0x2FFB or 0x2460 <= ord(c) <= 0x24FF


def load_ids(path, region):
    """Map character -> IDS string for region 'J' or 'K'.

    Takes the first alternative whose [tag] contains the region, otherwise
    the first alternative; tags are stripped.
    """
    out = {}
    with open(path, encoding='utf-8') as f:
        for line in f:
            if line.startswith('#'):
                continue
            cols = nfc(line.rstrip('\r\n')).split('\t')
            if len(cols) < 3 or not cols[1]:
                continue
            alts = [c for c in cols[2:] if c]
            if not alts:
                continue
            chosen = alts[0]
            for alt in alts:
                m = _TAG.search(alt)
                if m and region in m.group(1):
                    chosen = alt
                    break
            out[cols[1]] = _TAG.sub('', chosen).strip()
    return out


def direct_parts(ch, ids):
    """IDS operands one level down, without operators or circled numbers."""
    s = ids.get(ch)
    if s is None or s == ch:
        return []
    return [c for c in _TAG.sub('', s) if not _is_operator(c)]


_cache = {}


def components(ch, ids):
    """All operands, recursively (excluding ch itself). Cycle-safe, memoised."""
    memo = _cache.setdefault(id(ids), (ids, {}))
    if memo[0] is not ids:  # id reused by a different dict
        memo = _cache[id(ids)] = (ids, {})
    return _components(ch, ids, memo[1], frozenset())[0]


def _components(ch, ids, memo, stack):
    """Return (components, cut); cut means a cycle truncated the result."""
    if ch in memo:
        return memo[ch], False
    if ch in stack:
        return frozenset(), True
    stack = stack | {ch}
    result, cut = set(), False
    for p in direct_parts(ch, ids):
        if p == ch:
            continue
        result.add(p)
        sub, c = _components(p, ids, memo, stack)
        result |= sub
        cut = cut or c
    result.discard(ch)
    fz = frozenset(result)
    if not cut:
        memo[ch] = fz
    return fz, cut


def _with_variants(chars):
    return set(chars) | {VARIANTS[x] for x in chars if x in VARIANTS}


def find_parents(ch, ids, study):
    """Maximal study-set characters that appear inside ch, by code point."""
    p_set = (_with_variants(components(ch, ids)) & set(study)) - {ch}
    keep = []
    for p in p_set:
        if not any(q != p and p in _with_variants(components(q, ids))
                   for q in p_set):
            keep.append(p)
    return sorted(keep)


def drop_deep_single_strokes(ch, parents, ids, strokes):
    """Keep a one-stroke parent (一, 丨...) only if it is a direct IDS part of
    ch: 二 = ⿱一一 keeps 一, but 気 does not get 一 from deep inside 气.
    Parents with more strokes, or unknown strokes, are always kept."""
    direct = _with_variants(direct_parts(ch, ids))
    return [p for p in parents if strokes.get(p) != 1 or p in direct]


def pick_primary(parents, strokes, radical):
    """Most strokes, then equal to radical, then lowest code point."""
    if not parents:
        return None
    return min(parents, key=lambda p: (-strokes.get(p, 0), p != radical, p))
