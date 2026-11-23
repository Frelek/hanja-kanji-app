"""Download pinned build-time sources into sources/ and maintain tools/sources.lock.json.

Build-time only: nothing here is loaded by the app at runtime.
Usage: python tools/fetch_sources.py [--update]
"""
import hashlib
import json
import sys
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SOURCES_DIR = ROOT / 'sources'
LOCK = Path(__file__).resolve().parent / 'sources.lock.json'

_GH = 'https://raw.githubusercontent.com/'
_ANIM = _GH + 'parsimonhi/animCJK/master/'
_FONTS = _GH + 'google/fonts/main/ofl/'

SOURCES = {
    'kanji.json': _GH + 'davidluzgouveia/kanji-data/master/kanji.json',
    'joyo2010.txt': _GH + 'cjkvi/cjkvi-tables/master/joyo2010.txt',
    'ids.txt': _GH + 'cjkvi/cjkvi-ids/master/ids.txt',
    'hanja-grade.csv': _GH + 'rycont/hanja-grade-dataset/main/hanja.csv',
    'kengdic.tsv': _GH + 'garfieldnate/kengdic/master/kengdic.tsv',
    'animcjk-APL.txt': _ANIM + 'licenses/APL/english/ARPHICPL.TXT',
    'animcjk-LGPL.txt': _ANIM + 'licenses/LGPL.txt',
    'KleeOne-SemiBold.ttf': _FONTS + 'kleeone/KleeOne-SemiBold.ttf',
    'GowunBatang-Regular.ttf': _FONTS + 'gowunbatang/GowunBatang-Regular.ttf',
    'GowunBatang-Bold.ttf': _FONTS + 'gowunbatang/GowunBatang-Bold.ttf',
    'htm-preact-standalone.mjs': 'https://unpkg.com/htm@3.1.1/preact/standalone.module.js',
    'ts-fsrs.mjs': 'https://unpkg.com/ts-fsrs@5.4.2/dist/index.mjs',
    'LICENSE-htm': 'https://unpkg.com/htm@3.1.1/LICENSE',
    'LICENSE-ts-fsrs': 'https://unpkg.com/ts-fsrs@5.4.2/LICENSE',
}
for _n in range(1, 6):
    SOURCES[f'jlpt-n{_n}.csv'] = (
        _GH + f'jamsinclair/open-anki-jlpt-decks/main/src/n{_n}.csv')
for _name in ('dictionaryJa', 'dictionaryKo', 'dictionaryZhHant',
              'graphicsJa', 'graphicsKo', 'graphicsZhHant'):
    SOURCES[f'animcjk-{_name}.txt'] = _ANIM + _name + '.txt'


def _download(url: str) -> bytes:
    req = urllib.request.Request(url, headers={'User-Agent': 'hk-fetch/1.0'})
    with urllib.request.urlopen(req, timeout=120) as resp:
        return resp.read()


def main(argv) -> int:
    update = '--update' in argv
    SOURCES_DIR.mkdir(exist_ok=True)
    old = json.loads(LOCK.read_text(encoding='utf-8')) if LOCK.exists() else {}
    lock, changed, failed = {}, [], []
    for name, url in SOURCES.items():
        try:
            data = _download(url)
        except Exception as exc:  # report every failure, then exit non-zero
            failed.append(name)
            print(f'FAIL  {name}: {exc}')
            continue
        digest = hashlib.sha256(data).hexdigest()
        if name in old and old[name]['sha256'] != digest:
            changed.append(name)
            if not update:
                print(f'CHANGED {name}: hash differs from lock')
                continue
        (SOURCES_DIR / name).write_bytes(data)
        lock[name] = {'sha256': digest, 'bytes': len(data)}
        print(f'ok    {name} ({len(data)} bytes)')
    if failed:
        print(f'{len(failed)} download(s) failed')
        return 1
    if changed and not update:
        print('Hash mismatch; rerun with --update to accept.')
        return 1
    LOCK.write_text(json.dumps(lock, indent=2, sort_keys=True) + '\n', encoding='utf-8')
    print(f'{len(lock)} sources fetched; lock written to {LOCK.name}')
    if old and not changed and set(old) == set(lock):
        print('all hashes match')
    return 0


if __name__ == '__main__':
    sys.exit(main(sys.argv[1:]))
