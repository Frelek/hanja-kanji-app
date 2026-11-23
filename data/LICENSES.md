# Data, font and library attributions

The files in `data/` and `assets/fonts/` are generated at build time
(`python tools/build_data.py`) from the third-party sources below. The sources
are pinned by hash in `tools/sources.lock.json` and fetched by
`tools/fetch_sources.py`. Where GitHub reports no licence for an upstream
repository, the entry says so; check the upstream repository before
redistributing.

## Data sources

| Source file | Upstream | Licence |
| --- | --- | --- |
| kanji.json | https://raw.githubusercontent.com/davidluzgouveia/kanji-data/master/kanji.json | MIT (kanji-data; meanings derive from KANJIDIC, CC BY-SA 4.0, EDRDG) |
| joyo2010.txt | https://raw.githubusercontent.com/cjkvi/cjkvi-tables/master/joyo2010.txt | No licence declared upstream |
| ids.txt | https://raw.githubusercontent.com/cjkvi/cjkvi-ids/master/ids.txt | No SPDX licence declared upstream (the project README states GPL) |
| hanja-grade.csv | https://raw.githubusercontent.com/rycont/hanja-grade-dataset/main/hanja.csv | No licence declared upstream |
| kengdic.tsv | https://raw.githubusercontent.com/garfieldnate/kengdic/master/kengdic.tsv | No SPDX licence declared upstream; see the kengdic README |
| jlpt-n1.csv to jlpt-n5.csv | https://raw.githubusercontent.com/jamsinclair/open-anki-jlpt-decks/main/src/n1.csv (n2 to n5 alike) | MIT |
| animcjk-dictionaryJa.txt, -dictionaryKo.txt, -dictionaryZhHant.txt | https://raw.githubusercontent.com/parsimonhi/animCJK/master/ (dictionaryJa.txt, dictionaryKo.txt, dictionaryZhHant.txt) | Arphic Public License (animcjk-APL.txt) and GNU LGPL (animcjk-LGPL.txt) |
| animcjk-graphicsJa.txt, -graphicsKo.txt, -graphicsZhHant.txt | https://raw.githubusercontent.com/parsimonhi/animCJK/master/ (graphicsJa.txt, graphicsKo.txt, graphicsZhHant.txt) | Arphic Public License and GNU LGPL; only stroke medians are kept in `data/strokes/` |
| animcjk-APL.txt | https://raw.githubusercontent.com/parsimonhi/animCJK/master/licenses/APL/english/ARPHICPL.TXT | Licence text |
| animcjk-LGPL.txt | https://raw.githubusercontent.com/parsimonhi/animCJK/master/licenses/LGPL.txt | Licence text |

## Fonts (SIL Open Font License 1.1)

| Font | Upstream | Licence |
| --- | --- | --- |
| Klee One SemiBold (KleeOne-SemiBold.ttf) | https://raw.githubusercontent.com/google/fonts/main/ofl/kleeone/KleeOne-SemiBold.ttf | OFL 1.1 |
| Gowun Batang Regular and Bold | https://raw.githubusercontent.com/google/fonts/main/ofl/gowunbatang/ | OFL 1.1 |
| Noto Serif KR (variable, pinned to wght 600 for the fallback subset) | https://raw.githubusercontent.com/google/fonts/main/ofl/notoserifkr/NotoSerifKR%5Bwght%5D.ttf | OFL 1.1 |

The shipped `assets/fonts/*.woff2` files are subsets of these fonts, made with
fontTools. Subsetting keeps the original licence.

## Runtime libraries

| Library | Upstream | Licence |
| --- | --- | --- |
| htm (preact standalone build) | https://unpkg.com/htm@3.1.1/preact/standalone.module.js | Apache-2.0 (LICENSE-htm) |
| ts-fsrs | https://unpkg.com/ts-fsrs@5.4.2/dist/index.mjs | MIT (LICENSE-ts-fsrs) |
