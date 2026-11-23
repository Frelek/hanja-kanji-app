"""Font subsetting: which characters the app needs, and woff2 subsets."""
from fontTools import subset
from fontTools.ttLib import TTFont

HANGUL_RANGES = ((0x1100, 0x11FF), (0x3130, 0x318F), (0xA960, 0xA97F),
                 (0xAC00, 0xD7AF), (0xD7B0, 0xD7FF))
UI_LABELS = '日本語한국어'


def is_hangul(ch):
    cp = ord(ch)
    return any(a <= cp <= b for a, b in HANGUL_RANGES)


def _strings(obj):
    if isinstance(obj, str):
        yield obj
    elif isinstance(obj, dict):
        for k, v in obj.items():
            yield from _strings(k)
            yield from _strings(v)
    elif isinstance(obj, (list, tuple)):
        for v in obj:
            yield from _strings(v)


def data_chars(*datasets):
    """Every character of every string (and dict key) in the datasets."""
    out = set()
    for ds in datasets:
        for s in _strings(ds):
            out.update(s)
    return out


def needed_text(ja, ko):
    """(cjk set for Klee One, hangul set for Gowun Batang)."""
    data = data_chars(ja, ko) | set(UI_LABELS)
    ascii_ = {chr(c) for c in range(0x20, 0x7F)}
    blocks = set()
    for a, b in ((0x3040, 0x30FF), (0x3000, 0x303F), (0xFF00, 0xFFEF)):
        blocks.update(chr(c) for c in range(a, b + 1))
    blocks.add('・')
    cjk = {c for c in data | blocks | ascii_ if not is_hangul(c)}
    hangul = {c for c in data if is_hangul(c)} | ascii_
    return cjk, hangul


def missing_glyphs(ttf, chars):
    cmap = TTFont(ttf).getBestCmap()
    return {c for c in chars if ord(c) not in cmap}


def subset_woff2(ttf, chars, out):
    opts = subset.Options()
    opts.flavor = 'woff2'
    opts.layout_features = ['*']
    opts.notdef_outline = True
    font = subset.load_font(ttf, opts)
    sub = subset.Subsetter(opts)
    sub.populate(text=''.join(sorted(chars)))
    sub.subset(font)
    subset.save_font(font, out, opts)
    font.close()
