"""Build everything the app loads: data/ja.json, data/ko.json, per-language
stroke files and font subsets. Usage: python tools/build_data.py"""
import json
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)

from hk.fonts import (UI_LABELS, data_chars, is_hangul, missing_glyphs,
                      needed_text, subset_woff2)
from hk.ja import build_ja
from hk.ko import build_ko
from hk.strokes import load_graphics, write_strokes
from hk.text import cp_hex

ROOT = os.path.dirname(HERE)
SRC = os.path.join(ROOT, 'sources')
DATA = os.path.join(ROOT, 'data')
FONTS = os.path.join(ROOT, 'assets', 'fonts')
NOTO = os.path.join(SRC, 'NotoSerifKR[wght].ttf')


def write_json(path, obj):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, 'w', encoding='utf-8', newline='\n') as f:
        f.write(json.dumps(obj, ensure_ascii=False, separators=(',', ':')) + '\n')


def clear_json(d):
    if os.path.isdir(d):
        for n in os.listdir(d):
            if n.endswith('.json'):
                os.remove(os.path.join(d, n))


def cmap_string(path):
    from fontTools.ttLib import TTFont
    font = TTFont(path)
    cmap = font.getBestCmap()
    font.close()
    return ''.join(chr(c) for c in sorted(cmap) if c > 0x20 or c == 0x20)


def pin_noto(out_ttf):
    from fontTools.ttLib import TTFont
    from fontTools.varLib import instancer
    font = TTFont(NOTO)
    pinned = instancer.instantiateVariableFont(font, {'wght': 600})
    pinned.recalcTimestamp = False
    pinned['head'].modified = pinned['head'].created
    pinned.save(out_ttf)


def main():
    sys.stdout.reconfigure(encoding='utf-8')
    ja = build_ja(SRC)
    ko = build_ko(SRC)
    report = []

    for lang, ds in (('ja', ja), ('ko', ko)):
        report.append(f'[{lang}] {len(ds["chars"])} chars; levels: ' +
                      ', '.join(f'{l["id"]}={l["count"]}' for l in ds['levels']))
        few = [r['char'] for r in ds['chars'] if len(r['words']) < 2]
        report.append(f'[{lang}] chars with <2 words: {len(few)} ' + ''.join(few))

    # strokes
    ja_g = load_graphics(os.path.join(SRC, 'animcjk-graphicsJa.txt'))
    ko_g = load_graphics(os.path.join(SRC, 'animcjk-graphicsKo.txt'))
    zh_g = load_graphics(os.path.join(SRC, 'animcjk-graphicsZhHant.txt'))
    miss = {}
    for lang, ds, srcs in (('ja', ja, [ja_g]), ('ko', ko, [ko_g, zh_g])):
        out = os.path.join(DATA, 'strokes', lang)
        clear_json(out)
        chars = [r['char'] for r in ds['chars']]
        miss[lang] = write_strokes(chars, srcs, out)
        gone = set(miss[lang])
        for r in ds['chars']:
            r['hasStrokes'] = r['char'] not in gone
        report.append(f'[{lang}] missing strokes: {len(gone)} ' + ''.join(miss[lang]))
    if miss['ja']:
        print('\n'.join(report))
        print('FATAL: Japanese strokes missing: ' + ''.join(miss['ja']))
        return 1

    write_json(os.path.join(DATA, 'ja.json'), ja)
    write_json(os.path.join(DATA, 'ko.json'), ko)

    # fonts
    os.makedirs(FONTS, exist_ok=True)
    cjk, hangul = needed_text(ja, ko)
    klee = os.path.join(SRC, 'KleeOne-SemiBold.ttf')
    subset_woff2(klee, cjk, os.path.join(FONTS, 'klee-one-600.woff2'))
    for w, name in ((400, 'Regular'), (700, 'Bold')):
        subset_woff2(os.path.join(SRC, f'GowunBatang-{name}.ttf'), hangul,
                     os.path.join(FONTS, f'gowun-batang-{w}.woff2'))
    # glyphs the data really uses (not the speculative blocks)
    used = {c for c in data_chars(ja, ko) | set(UI_LABELS) if not is_hangul(c)}
    missing = missing_glyphs(klee, used)
    coverage = {'klee-one-600': cmap_string(os.path.join(FONTS, 'klee-one-600.woff2')),
                'fallback-serif': ''}
    fb = os.path.join(FONTS, 'fallback-serif.woff2')
    if missing:
        if not os.path.exists(NOTO):
            print('\n'.join(report))
            print('FATAL: Klee One lacks glyphs and Noto Serif KR is not fetched: '
                  + ''.join(sorted(missing)))
            return 1
        tmp = os.path.join(FONTS, '_noto600.ttf')
        pin_noto(tmp)
        try:
            still = missing_glyphs(tmp, missing)
            subset_woff2(tmp, missing - still, fb)
        finally:
            os.remove(tmp)
        coverage['fallback-serif'] = cmap_string(fb)
        missing = still
    elif os.path.exists(fb):
        os.remove(fb)
    write_json(os.path.join(FONTS, 'coverage.json'), coverage)
    report.append('missing glyphs (after fallback): ' + (
        ' '.join(f'{c}(U+{ord(c):04X})' for c in sorted(missing)) or 'none'))
    print('\n'.join(report))
    return 0


if __name__ == '__main__':
    sys.exit(main())
