# Hanja & Kanji Learner Rebuild — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the current app with a correct, Anki-style, offline PWA. It teaches JLPT N5–N3 kanji (612) and 한국어문회 8급–5급 + 110 4급Ⅱ hanja (610), with `name#1234` profiles synced through a private GitHub repo.

**Architecture:** A Python data pipeline (`tools/`) turns pinned public sources into committed JSON, stroke files and font subsets. The app is static ES modules with no build step:
- Preact + htm for the screens;
- `ts-fsrs` for scheduling;
- an append-only review log in IndexedDB as the source of truth, replayed into card states;
- sync that unions logs through the GitHub Contents API.

A service worker precaches everything for offline use.

**Tech Stack:**
- Python 3.12 (stdlib `unittest`, `fonttools` + `brotli`, `Pillow`).
- Node 24 (`node --test`, dev-only `fake-indexeddb`).
- Vendored `htm@3.1.1/preact/standalone.module.js` and `ts-fsrs@5.4.2/dist/index.mjs`.
- Klee One and Gowun Batang fonts.

**Spec:** `docs/superpowers/specs/2026-11-23-hanja-kanji-rebuild-design.md`. Read §7 before any task.

## Global Constraints

**Paths, hosting and dependencies**
- All paths are relative (`./…`). The site runs from `https://frelekkacper.com/hanja-kanji-app/` (GitHub Pages, `main`, root).
- Nothing loads from a CDN or remote origin at runtime. The only network calls are to `https://api.github.com`, and only for sync.
- No build step for the app. Generated files (`data/`, `assets/fonts/`, `precache.json`) are committed.

**Language and copy**
- The UI is in English. Korean and Japanese appear only as learning content and in the language switch (`日本語 | 한국어`).
- Never use emoji, badge counters, or mixed-language menu labels.
- Every Japanese example word shows its pure kana directly below it.

**Quizzes**
- No quiz or practice button on single characters or inside the detail sheet. Practice exists only at the top of a level.
- Practice and study only ever use introduced cards: cards with at least one counted review.

**Progress storage**
- Progress is separate per profile and per language.
- Card IDs are `"ja:<char>"` / `"ko:<char>"` and never change.

**Study defaults** (Settings can change them)
- New cards per day **10**, max reviews per day **200**.
- Learning steps **1m 10m**, relearning steps **10m**.
- Desired retention **0.90** (allowed range 0.80–0.95). Next day starts at **04:00** local.
- Leech threshold **8** lapses (tag and list in Stats, never suspend).

**Profiles and sync**
- Profile name: 1–20 Unicode letters or digits (`/^[\p{L}\p{N}]{1,20}$/u`). Tag: exactly 4 digits (`/^\d{4}$/`). The key is `${name.toLowerCase()}-${tag}`.
- Default sync repo: `Frelek/hanja-kanji-progress`. Sync after every **20** answers, on open or foreground, at session end, and from "Sync now".
- The sync token is only ever stored in IndexedDB `meta`. Never put it in a log line, a URL or the repo.

**Colours and typography**
- Paper `#f6f1e7`, ink `#1f1b17`, secondary `#776c60`, hairline `#e2d8c8`, card `#fffcf6`, segment `#ebe3d5`.
- Count colours: new `#3d6e9e`, learning `#b4432e`, review `#4f7d4e`.
- Dark theme with the same roles at WCAG AA contrast; tap targets ≥ 44px; honour `prefers-reduced-motion`.
- Fonts: Klee One SemiBold for CJK and kana, Gowun Batang for hangul, the system sans-serif stack for English UI.

**Data rules**
- Every reading, meaning, part and example word comes from the pinned sources through `tools/`. Nothing is typed by hand, except the two small form tables named in Tasks 2 and 4.
- NFC-normalise every string read from a source. The 급수 data uses compatibility code points for 金 車 樂 不 宅.

## Review Focus

1. **The 04:00 day boundary and clock skew between devices.** Answers from a phone whose clock runs ahead, merged with a laptop's, must still replay in `at` order. "Today" must flip at 04:00 local, not at midnight. → Task 8 (boundary) and Task 7 (out-of-order replay).
2. **The same profile created on two devices before either has synced.** Both push `profile.json` (the second gets 422/409). The second device must merge, not fail. → Task 17.
3. **A broken or expired token, or a token without repo access** (401/403, a 404 on the repo). Studying must continue, and the status must say what to fix. → Tasks 16 and 17.
4. **First launch after updating from the old app.** The old `hanja-kanji-learner-v3` cache and the `hanja_*`/`kanji_*`/`hk_*` localStorage keys are present. They must be cleaned without a crash. → Tasks 9 and 15.
5. **Profile names with Polish or Korean letters, spaces or emoji, and a tag like `0042`.** Letters are accepted, spaces and emoji are rejected with a clear message, `0042` stays a string, and `Kacper`/`kacper` are the same profile. → Task 11.

---

## Phase 1 — Data pipeline

### Task 1: Pinned source fetching and Python tooling

**Files:**
- Create: `tools/fetch_sources.py`, `tools/requirements.txt`, `tools/sources.lock.json` (generated), `tools/hk/__init__.py`, `tools/hk/text.py`, `tools/tests/test_text.py`
- Modify: `.gitignore` (add `sources/` and `node_modules/`)

**Interfaces:**
- Produces:
  - `hk.text.nfc(s: str) -> str`
  - `hk.text.is_cjk(ch: str) -> bool` (U+3400–4DBF, U+4E00–9FFF, U+F900–FAFF, U+20000–3FFFF)
  - `hk.text.cp_hex(ch: str) -> str` (lowercase hex, no padding: `'休' -> '4f11'`)
  - `fetch_sources.SOURCES: dict[str, str]` (filename → URL)
  - Running `python tools/fetch_sources.py` fills `sources/` and writes `tools/sources.lock.json` = `{filename: {"sha256", "bytes"}}`. On later runs it fails if a hash changed, unless `--update` is passed.

- [ ] **Step 1:** Install the tools: `python -m pip install fonttools brotli Pillow`. Write `tools/requirements.txt` with those three names pinned to the installed versions (`pip freeze | grep -i -E "fonttools|brotli|pillow"`).
- [ ] **Step 2: Write the failing test** `tools/tests/test_text.py`:
  ```python
  def test_nfc_maps_compat_ideographs(self):
      self.assertEqual(nfc('金'), '金'); self.assertEqual(nfc('樂'), '樂')
  def test_cp_hex(self): self.assertEqual(cp_hex('休'), '4f11'); self.assertEqual(cp_hex('𦥯'), '2696f')
  def test_is_cjk(self): self.assertTrue(is_cjk('學')); self.assertFalse(is_cjk('학')); self.assertTrue(is_cjk('𦥯'))
  ```
- [ ] **Step 3: Run it** with `python -m unittest discover -s tools/tests -t tools`. Expected: FAIL (`ModuleNotFoundError: hk.text`).
- [ ] **Step 4: Implement `hk/text.py`.** Then implement `fetch_sources.py` with exactly these entries. Use `urllib.request`, write into `sources/`, and compute sha256.
  ```
  kanji.json        https://raw.githubusercontent.com/davidluzgouveia/kanji-data/master/kanji.json
  jlpt-n1..n5.csv   https://raw.githubusercontent.com/jamsinclair/open-anki-jlpt-decks/main/src/n{1..5}.csv
  joyo2010.txt      https://raw.githubusercontent.com/cjkvi/cjkvi-tables/master/joyo2010.txt
  ids.txt           https://raw.githubusercontent.com/cjkvi/cjkvi-ids/master/ids.txt
  hanja-grade.csv   https://raw.githubusercontent.com/rycont/hanja-grade-dataset/main/hanja.csv
  kengdic.tsv       https://raw.githubusercontent.com/garfieldnate/kengdic/master/kengdic.tsv
  animcjk-{dictionaryJa,dictionaryKo,dictionaryZhHant,graphicsJa,graphicsKo,graphicsZhHant}.txt
                    https://raw.githubusercontent.com/parsimonhi/animCJK/master/<name>.txt
  animcjk-APL.txt, animcjk-LGPL.txt   https://raw.githubusercontent.com/parsimonhi/animCJK/master/licenses/{APL,LGPL.txt}
  KleeOne-SemiBold.ttf      https://raw.githubusercontent.com/google/fonts/main/ofl/kleeone/KleeOne-SemiBold.ttf
  GowunBatang-Regular.ttf   https://raw.githubusercontent.com/google/fonts/main/ofl/gowunbatang/GowunBatang-Regular.ttf
  GowunBatang-Bold.ttf      https://raw.githubusercontent.com/google/fonts/main/ofl/gowunbatang/GowunBatang-Bold.ttf
  htm-preact-standalone.mjs https://unpkg.com/htm@3.1.1/preact/standalone.module.js
  ts-fsrs.mjs               https://unpkg.com/ts-fsrs@5.4.2/dist/index.mjs
  LICENSE-htm, LICENSE-ts-fsrs   https://unpkg.com/htm@3.1.1/LICENSE , https://unpkg.com/ts-fsrs@5.4.2/LICENSE
  ```
  If `licenses/APL` 404s, list the `licenses/` folder through the GitHub API and pin the real file names.
- [ ] **Step 5: Run the tests and the fetch:** `python -m unittest discover -s tools/tests -t tools`, then `python tools/fetch_sources.py`. Expected: tests pass; the fetch reports every `SOURCES` entry fetched and writes the lock file. Run the fetch a second time; expected: "all hashes match".
- [ ] **Step 6: Commit:** `git add .gitignore tools/ && git commit -m "build: pinned data sources and Python tooling"`

### Task 2: Character decomposition and parent finding

**Files:**
- Create: `tools/hk/decompose.py`, `tools/tests/test_decompose.py`

**Interfaces:**
- Consumes: `hk.text.nfc`
- Produces:
  - `VARIANTS: dict[str, str]`, exactly: `亻人 氵水 扌手 忄心 灬火 礻示 衤衣 訁言 飠食 釒金 糹糸 艹艸 ⺾艸 辶辵 ⻌辵 刂刀`. 月, 阝 and 王 are deliberately absent.
  - `load_ids(path: str, region: str) -> dict[str, str]`. `region` is `'J'` or `'K'`. Takes the first alternative whose `[…]` tag contains `region`, otherwise the first alternative, with tags stripped.
  - `direct_parts(ch, ids) -> list[str]`: the IDS operands one level down, without operators (U+2FF0–2FFB) or circled numbers (U+2460–24FF).
  - `components(ch, ids) -> frozenset[str]`: all operands, recursively. Memoised and safe against cycles.
  - `find_parents(ch, ids, study: set[str]) -> list[str]`
  - `pick_primary(parents: list[str], strokes: dict[str, int], radical: str | None) -> str | None`

- [ ] **Step 1: Write the failing tests.** Use an inline fake IDS dict, plus one test that loads the real `sources/ids.txt` (skip it if the file is absent):
  ```python
  IDS = {'休':'⿰亻木','森':'⿱木林','林':'⿰木木','學':'⿱𦥯子','𦥯':'⿰臼爻','河':'⿰氵可','東':'東'}
  find_parents('休', IDS, {'人','木','休'}) == ['人','木']   # 亻 links to 人
  find_parents('森', IDS, {'木','林','森'}) == ['林']       # maximal only
  find_parents('學', IDS, {'子','學'}) == ['子']
  find_parents('東', IDS, {'木','日','東'}) == []           # atomic in source → no guessed link
  find_parents('河', IDS, {'水','河'}) == ['水']
  direct_parts('河', IDS) == ['氵','可']
  pick_primary(['人','木'], {'人':2,'木':4}, None) == '木'  # most strokes
  pick_primary(['人','木'], {'人':4,'木':4}, '人') == '人'  # tie → radical
  # real file: load_ids(..., 'J')['与'] == '⿻②一' and load_ids(..., 'K')['与'] == '⿹②一'
  ```
- [ ] **Step 2: Run them:** `python -m unittest discover -s tools/tests -t tools -p "test_decompose.py"`. Expected: FAIL.
- [ ] **Step 3: Implement it.**
  - `find_parents`: let C = `components(ch)` ∪ `{VARIANTS[x] for x in components(ch) if x in VARIANTS}`. Let P = (C ∩ study) − {ch}. Keep p ∈ P only if no other q ∈ P has p in (`components(q)` ∪ its mapped variants). Return sorted by code point.
  - `pick_primary`: the most strokes, then equal to `radical`, then the lowest code point.
- [ ] **Step 4: Run them again.** Expected: PASS.
- [ ] **Step 5: Commit:** `git commit -m "data: IDS decomposition and maximal in-set parents"`

### Task 3: Japanese dataset builder

**Files:**
- Create: `tools/hk/ja.py`, `tools/tests/test_ja.py`

**Interfaces:**
- Consumes: Task 2 (`load_ids(…, 'J')`, `find_parents`, `direct_parts`, `pick_primary`), `hk.text`
- Produces:
  - `parse_joyo_readings(field: str) -> tuple[list[str], list[str]]`
  - `parse_jlpt_csv(path: str, n: int) -> list[dict]`: `{w, kana, en, n}`
  - `pick_words_ja(ch: str, level_n: int, vocab: list[dict], kanji_level: dict[str, int]) -> list[dict]`: `{w, kana, en, level: "N<n>"}`, up to 3
  - `build_ja(src: str) -> dict`, matching the output shape below

  The output shape is shared with Task 4:
  ```jsonc
  { "lang": "ja",
    "levels": [{"id":"N5","count":79},{"id":"N4","count":166},{"id":"N3","count":367}],
    "chars": [ /* records in study order, spec §7.1 schema plus "required": [ids] */ ],
    "parts": { "亻": "person", ... } }   // meaning for every part char that appears
  ```
  Record fields, exactly:
  - `id, char, level, sublevel(null), order, strokes, meanings, on, kun`
  - `parts:[{char, meaning|null, ref|null}]`
  - `parents, required, primaryParent`
  - `words, hasStrokes` (set by Task 5)

- [ ] **Step 1: Write the failing tests:**
  ```python
  parse_joyo_readings('セイ、ショウ、い-きる、う-まれる、き、なま') == (['セイ','ショウ'], ['い.きる','う.まれる','き','なま'])
  parse_joyo_readings('キン、コン、かね、（かな）') == (['キン','コン'], ['かね','かな'])   # parenthesised → last, parens stripped
  # parse_jlpt_csv on a temp file with the row  川; 河,かわ,river,JLPT_N5,x
  # → two entries: {'w':'川','kana':'かわ',…} and {'w':'河',…}
  # pick_words_ja('休', 5, vocab, levels): an N5-list word using only N5 kanji comes first,
  # a word containing an N2 kanji is excluded, and at most 3 are returned
  # the full build (skip if sources/ is absent): counts 79/166/367, ids unique, '休' has required ['ja:人','ja:木']
  ```
- [ ] **Step 2: Run them.** Expected: FAIL.
- [ ] **Step 3: Implement it.**
  - **Levels:** `jlpt_new` 5/4/3 from `kanji.json`.
  - **Readings:** from `joyo2010.txt`, column 6, split on `、`. Katakana goes to `on`. Hiragana goes to `kun`, with `-` changed to `.`.
  - **Meanings:** the first 3 of `kanji.json` `meanings`, lowercased.
  - **`strokes`:** from `kanji.json`.
  - **`parents`:** `find_parents` against all 612 kanji.
  - **`required`:** the parents whose level number is ≥ the char's (N5 = 5 is the earliest level).
  - **`primaryParent`:** `pick_primary` over `required`; the radical comes from `animcjk-dictionaryJa.txt` `radical`, first char.
  - **Part meanings:** `kanji.json` `meanings[0]`, then the first `;`/`,` sense of animCJK `definition`, otherwise null.
  - **Words (tiers):**
    - T1: list level ≥ the char's level, and every kanji in the word is at a level ≥ the char's level.
    - T2: any list, with every kanji in N5–N3.
    - T3: a word equal to the char itself.

    Within a tier, rank by list level (easier first), then shorter `w`, then file order. `kana` must match `^[぀-ヿ・ー]+$`; drop rows that don't. Use the first `;`-separated sense of `en`.
  - **Order:** Kahn topological sort per level over `required` edges inside the level. Pick the available node with the lowest key, where key = (`freq` with null last, code point). Then concatenate N5, N4, N3. `order` is the global index, starting at 0.
- [ ] **Step 4: Run them again.** Expected: PASS.
- [ ] **Step 5: Commit:** `git commit -m "data: Japanese N5–N3 builder"`

### Task 4: Korean dataset builder

**Files:**
- Create: `tools/hk/ko.py`, `tools/tests/test_ko.py`

**Interfaces:**
- Consumes: Task 2 (`load_ids(…, 'K')` and the rest), `hk.text`
- Produces:
  - `parse_hun_eum(s: str) -> list[dict]` (`{hun, eum}`)
  - `LEVEL_MAP: dict[str, tuple[str, str | None]]`: `8급→(8급,None)`, `7급Ⅱ→(7급,7급Ⅱ)`, `7급→(7급,None)`, `6급Ⅱ→(6급,6급Ⅱ)`, `6급→(6급,None)`, `5급Ⅱ→(5급,5급Ⅱ)`, `5급→(5급,None)`, `4급Ⅱ→(4급Ⅱ,None)`
  - `KO_MATCH_VARIANTS = {'强':'強','畵':'畫'}`. This is the only hand table. Extend it only from the Task 6 report, with a comment naming the source entry.
  - `load_kengdic(path) -> list[dict]`: `{w, hangul, en, lvl}`. Keeps rows where the NFC hanja is ≥ 2 characters, all CJK, and the same length as `surface`. `w` is mapped through `KO_MATCH_VARIANTS`.
  - `select_4ii(chars: list[str], words: list[dict], n: int = 110) -> list[str]`
  - `pick_words_ko(ch: str, rank: dict[str, int], words: list[dict]) -> list[dict]`: `{w, hangul, en}`, up to 3
  - `build_ko(src: str) -> dict`, in the same shape as Task 3. Records carry `hunEum` instead of `on`/`kun`. `levels` = `8급 50, 7급 100, 6급 150, 5급 200, 4급Ⅱ 110`.

- [ ] **Step 1: Write the failing tests:**
  ```python
  parse_hun_eum("[[['쇠'], ['금']], [['성(姓)'], ['김']]]") == [{'hun':'쇠','eum':'금'},{'hun':'성(姓)','eum':'김'}]
  parse_hun_eum("[[['즐길'], ['락']], [['노래'], ['악']], [['좋아할'], ['요']]]")[1] == {'hun':'노래','eum':'악'}
  select_4ii(['甲','乙','丙'], [{'w':'甲乙'},{'w':'甲丙'},{'w':'丙乙'},{'w':'甲丁'}], n=2) == ['甲','丙']  # count desc, then code point; '乙' is 2, '丙' is 2 → 丙 (U+4E19) before 乙 (U+4E59)
  # load_kengdic drops '전원의  행진' (no hanja) and 'ㄷ字관' (mixed), and keeps 學校/학교
  # the full build (skip if sources/ is absent): 610 chars; 500 equal to animCJK's hanja8–5 sets;
  # '金' carries two hunEum; no char contains U+F900–FAFF
  ```
- [ ] **Step 2: Run them.** Expected: FAIL.
- [ ] **Step 3: Implement it.**
  - **Rows:** from `hanja-grade.csv` (columns `main_sound, level, hanja, meaning, radical, strokes, total_strokes`). Use `total_strokes` as `strokes` and `radical` for the primary-parent tie-break.
  - **4급Ⅱ:** `select_4ii` over the 250 4급Ⅱ characters, counting kengdic words that contain each character.
  - **Meanings:** animCJK `dictionaryKo` `definition`, falling back to `dictionaryZhHant`. Split on `;` and `,`, trim, take the first 3.
  - **Words (tiers):**
    - T1: kengdic `lvl` A/B, and every hanja in the word has a rank ≤ the char's rank.
    - T2: every hanja in the 610 set.
    - T3: at most one hanja outside the set.

    Rank by `lvl` (A, B, C, D, empty), then shorter, then file order. Use the first `;` sense of `en`.
  - **Order:**
    - Ⅱ sub-levels first inside a level.
    - Topological sort inside the level, with key = (sublevel index, −word count, code point). This lets a required parent from a later sub-level come first.
    - Levels go in the order `8급, 7급, 6급, 5급, 4급Ⅱ`.
- [ ] **Step 4: Run them again.** Expected: PASS.
- [ ] **Step 5: Commit:** `git commit -m "data: Korean 8급–5급 + 4급Ⅱ subset builder"`

### Task 5: Strokes, font subsets and the build entry point

**Files:**
- Create: `tools/hk/strokes.py`, `tools/hk/fonts.py`, `tools/build_data.py`, `tools/tests/test_strokes_fonts.py`, `data/LICENSES.md`
- Generated (commit): `data/ja.json`, `data/ko.json`, `data/strokes/ja/*.json`, `data/strokes/ko/*.json`, `assets/fonts/klee-one-600.woff2`, `assets/fonts/gowun-batang-400.woff2`, `assets/fonts/gowun-batang-700.woff2` (+ `assets/fonts/fallback-serif.woff2` only if glyphs are missing)
- Delete: `data/hanja.json`, `data/kanji.json`, `generate_all_data.py`, `build_full_database.py`

**Interfaces:**
- Consumes: `build_ja`, `build_ko`, `cp_hex`
- Produces:
  - `load_graphics(path) -> dict[str, list]` (char → medians)
  - `write_strokes(chars: list[str], sources: list[dict], out_dir: str) -> list[str]`. The `sources` dicts are tried in order. Each file is `{"m": medians}` in compact JSON at `out_dir/<cp_hex>.json`. Returns the chars it couldn't find.
  - `needed_text(ja: dict, ko: dict) -> tuple[set[str], set[str]]` (CJK + kana + Latin + punctuation; hangul)
  - `missing_glyphs(ttf: str, chars: set[str]) -> set[str]`
  - `assets/fonts/coverage.json` = `{"klee-one-600": "<every char in that subset's cmap>", "fallback-serif": "<…or empty>"}`. Task 6 reads it.
  - `subset_woff2(ttf: str, chars: set[str], out: str) -> None`
  - `python tools/build_data.py` writes everything above and prints a report:
    - counts per level;
    - chars with fewer than 2 words;
    - chars missing strokes;
    - missing glyphs.

- [ ] **Step 1: Write the failing tests.**
  - `write_strokes` on two fake sources writes `4f11.json` from the first source that has 休, and returns the missing ones.
  - `needed_text` includes `・`, the hiragana and katakana blocks (U+3040–30FF) and every hangul syllable used in `ko` words.
  - `subset_woff2` on Klee One with `{'休','あ'}` produces a font whose cmap has both.
- [ ] **Step 2: Run them.** Expected: FAIL.
- [ ] **Step 3: Implement it.**
  - **Japanese strokes:** `graphicsJa` only; the build fails if any are missing.
  - **Korean strokes:** `graphicsKo`, then `graphicsZhHant`; the build reports any that are still missing.
  - **Fonts:** subset with `fontTools.subset` (flavor `woff2`, `layout_features='*'`).
    - Klee One gets the CJK+kana+Latin set.
    - Gowun Batang Regular and Bold get hangul + Latin.
    - If `missing_glyphs(Klee One)` is non-empty, also fetch the Noto Serif KR variable TTF from `google/fonts/ofl/notoserifkr/` (add it to `SOURCES` and the lock), and subset it to just those chars as `fallback-serif.woff2`.
  - **JSON:** `json.dumps(obj, ensure_ascii=False, separators=(',', ':'))` + `"\n"`, with records in `order`.
  - **`data/LICENSES.md`:** names every source, its licence and its URL (from `SOURCES`).
- [ ] **Step 4: Run the tests, then the build twice and compare hashes:**
  `python tools/build_data.py && find data assets -type f | sort | xargs sha256sum > "$TMP/h1" && python tools/build_data.py && find data assets -type f | sort | xargs sha256sum | diff - "$TMP/h1"`
  (`$TMP` is the session scratchpad). Expected: the tests pass, and `diff` prints nothing.
- [ ] **Step 5: Commit:** `git add -A data assets tools && git commit -m "data: generate ja/ko datasets, per-language strokes, font subsets"`

### Task 6: Data validation tests (Node)

**Files:**
- Create: `package.json`, `tests/data.test.js`

**Interfaces:**
- Produces: `npm test` runs `node --test "tests/**/*.test.js"`. `package.json` contains `{"type":"module","private":true,"devDependencies":{"fake-indexeddb":"^6"}}`. Run `npm install` once.

- [ ] **Step 1: Write the tests.** One `test()` per spec §7.1.4 rule:
  - **Level counts:** ja is exactly 79/166/367; ko is exactly 50/100/150/200/110 (= 610). Every `char` is unique.
  - **Parents and order:** every `parents` id exists. Each parent's character is in `components(char)`; re-implement it as a tiny IDS walker over `sources/ids.txt` and skip if `sources/` is absent. Every `required` parent has an `order` lower than the char. There are no cycles.
  - **Words:**
    - Every ja word has `kana` matching `/^[぀-ヿ・ー]+$/` and includes its char.
    - Every ko word includes its char, in its `KO_MATCH_VARIANTS`-normalised form.
    - Every char has ≥ 1 word.
  - **Readings:** every ja char has ≥ 1 `on` or `kun`; every ko char has ≥ 1 `hunEum`.
  - **Strokes:** `data/strokes/ja/<hex>.json` exists for all 612. The ko strokes exist for every char except those listed in `tests/known-missing-strokes.json`, which must hold only ko chars. The test prints that list.
  - **Fonts:** every CJK or kana char used in `data/*.json` appears in `assets/fonts/coverage.json` (`klee-one-600` ∪ `fallback-serif`).
  - **Hygiene:** no string anywhere contains U+F900–FAFF.
- [ ] **Step 2: Run them:** `npm test`. Expected: PASS. If a rule fails, fix the builder (Tasks 3–5), not the test.
- [ ] **Step 3: Commit:** `git add package.json package-lock.json tests/ && git commit -m "test: dataset validation"`

## Phase 2 — Engine

### Task 7: Vendored libraries and the FSRS wrapper with log replay

**Files:**
- Create: `vendor/htm-preact.mjs`, `vendor/ts-fsrs.mjs`, `vendor/LICENSES.md` (copied from `sources/`), `src/engine/fsrs.js`, `tests/fsrs.test.js`

**Interfaces:**
- Produces, from `src/engine/fsrs.js`:
  - `RATING = { again: 1, hard: 2, good: 3, easy: 4 }`
  - `makeScheduler(s: { retention: number, learningSteps: string[], relearningSteps: string[] }) -> { preview(card, now: Date): Record<1|2|3|4, {due: Date, label: string}>, next(card, rating, now: Date): Card }`
  - `newCard(now: Date): Card`. This is ts-fsrs `createEmptyCard`, with fields `due, stability, difficulty, elapsed_days, scheduled_days, reps, lapses, learning_steps, state, last_review`.
  - `formatInterval(ms: number) -> string`: `<1m`, `Nm`, `Nh`, `Nd`, `Nmo`, `Ny`. Minutes are rounded; days are rounded; months are days/30 below 365; years are days/365 with one decimal if below 10.
  - `replay(entries: Entry[], settingsFor: (lang) => SchedSettings) -> { states: Map<string, Card>, prevState: Map<string, number> }`
  - Entry types:
    - `{ id, type: 'review', card, rating, at, ms, dev }`
    - `{ id, type: 'reset', lang, at, dev }`
    - `{ id, type: 'undo', target, at, dev }`

- [ ] **Step 1:** Copy `sources/htm-preact-standalone.mjs` → `vendor/htm-preact.mjs` and `sources/ts-fsrs.mjs` → `vendor/ts-fsrs.mjs`. Check that neither has an `import` statement: `grep -c "^import" vendor/*.mjs` should print 0 for both.
- [ ] **Step 2: Write the failing tests:**
  ```js
  const s = { retention: 0.9, learningSteps: ['1m','10m'], relearningSteps: ['10m'] };
  const now = new Date('2026-11-23T08:00:00Z');
  test('new-card previews', () => {
    const p = makeScheduler(s).preview(newCard(now), now);
    assert.deepEqual([1,2,3,4].map(r => p[r].label), ['1m','6m','10m','9d']);   // measured on ts-fsrs 5.4.2
  });
  test('formatInterval', () => { assert.equal(formatInterval(30e3),'<1m'); assert.equal(formatInterval(36e5*5),'5h');
    assert.equal(formatInterval(864e5*45),'2mo'); assert.equal(formatInterval(864e5*800),'2.2y'); });
  test('replay is order-independent and deterministic', () => { /* shuffled input → same states as sorted; two runs equal */ });
  test('reset drops earlier entries of that language only', () => { /* ja reviews before reset gone; ko kept */ });
  test('undo removes its target review', () => { /* states equal those without the target */ });
  test('prevState records the state before each review', () => { /* 2nd Good on a new card → prevState Learning (1) */ });
  ```
- [ ] **Step 3: Implement it.** Use `fsrs(generatorParameters({request_retention, enable_fuzz: true, learning_steps, relearning_steps}))`.
  - Replay sorts by `(at, id)`, then applies the resets per language.
  - Undo targets are skipped.
  - The ts-fsrs scheduler is cached per language.
- [ ] **Step 4: Run** `npm test`. Expected: PASS.
- [ ] **Step 5: Commit:** `git commit -m "engine: vendored ts-fsrs/preact, scheduler wrapper and log replay"`

### Task 8: Daily queue, unlock rules, practice, stats helpers

**Files:**
- Create: `src/engine/queue.js`, `src/engine/stats.js`, `tests/queue.test.js`, `tests/stats.test.js`

**Interfaces:**
- Consumes: `replay`, `RATING`, `State` values from Task 7 (New 0, Learning 1, Review 2, Relearning 3)
- Produces:
  - `dayStart(now: Date, startHour = 4) -> Date`: the local-time start of the current study day.
  - `introducedSet(states: Map) -> Set<string>`: card ids with `reps > 0`.
  - `isAvailable(char, introduced: Set) -> boolean`: every id in `char.required` is introduced.
  - `buildQueue({ chars, states, entries, settings, now })`, where `settings` = that language's `StudySettings` plus `dayStartHour`, returning `{ learning: Item[], review: Item[], fresh: Item[], counts: { new, learning, review } }`. An item is `{ id, char }`.
    - `fresh` = the first (`newPerDay` − new cards introduced since `dayStart`) available, not-yet-introduced chars, in `order`.
    - `review` = Review-state cards due before the next day start, capped at `maxReviews` minus the reviews done today, sorted by `due`.
    - `learning` = Learning or Relearning cards due before the next day start.
  - `nextItem(queue, states, now, doneSinceNew: number) -> { item, waitMs }`, in priority order:
    1. a learning card due now;
    2. a new card if `doneSinceNew >= NEW_EVERY` (NEW_EVERY = 4) or there are no reviews left;
    3. a review;
    4. a new card;
    5. otherwise `{item: null, waitMs: ms until the earliest learning card is due}`.
  - `buildPractice(levelId, chars, introduced: Set) -> string[]`: shuffled ids. It never writes entries.
  - `isLeech(card) -> boolean`: `lapses >= 8`.
  - From `stats.js`:
    - `streak(entries, now, startHour) -> number`
    - `retention30(entries, prevState, now) -> number | null`: the share of answers rated ≥ 2 on cards that were in Review state, over the last 30 days.
    - `forecast(states, now, days = 7) -> number[]`
    - `reviewsToday(entries, now, startHour) -> number`

- [ ] **Step 1: Write the failing tests.**
  - `dayStart`: at 03:59 local it returns yesterday 04:00; at 04:00 it returns today 04:00. Build the dates with the local `Date` constructor, not UTC.
  - New-card limit: 10 new cards introduced today give `fresh` = 0. A new day restores 10.
  - Max reviews: 200 done today gives `review` = [].
  - Unlock: `休` (required 人, 木) is not in `fresh` until both are introduced.
  - `nextItem`: a due learning card beats everything. After 4 reviews, a new card comes next. With only a learning card due in 3 minutes, it returns `{item: null, waitMs: 180000}`.
  - `buildPractice` returns only introduced ids, and `entries` is unchanged.
  - `isLeech({lapses: 8})` is true.
  - `streak`: answers on 3 consecutive study days counting to today give 3; a gap gives 1.
  - `forecast`: buckets by study day.
- [ ] **Step 2: Run them.** Expected: FAIL.
- [ ] **Step 3: Implement it.**
- [ ] **Step 4: Run them again.** Expected: PASS.
- [ ] **Step 5: Commit:** `git commit -m "engine: Anki-style daily queue, unlock rules, practice, stats"`

### Task 9: IndexedDB store and legacy cleanup

**Files:**
- Create: `src/store/db.js`, `tests/db.test.js`

**Interfaces:**
- Produces:
  - `openDb(name = 'hk') -> Promise<Db>`. Object stores:
    - `profiles` (key `key`)
    - `log` (key `id`; indexes `profile`, `synced`)
    - `meta` (key `k`)
  - `Db` methods:
    - `getMeta(k)`, `setMeta(k, v)`
    - `listProfiles()`, `getProfile(key)`, `putProfile(p)`
    - `addEntries(profileKey, entries[]) -> number` (the count actually inserted; existing ids are ignored)
    - `getEntries(profileKey) -> Entry[]`
    - `unsynced(profileKey) -> Entry[]`
    - `markSynced(ids[])`
  - Profile shape:
    ```
    { key, name, tag, createdAt,
      settings: { ja: StudySettings, ko: StudySettings, dayStartHour: 4, appearance: 'auto' },
      settingsUpdatedAt: { [path]: iso } }
    ```
    `StudySettings` = `{ newPerDay: 10, maxReviews: 200, learningSteps: ['1m','10m'], relearningSteps: ['10m'], retention: 0.9 }`.
  - `defaultSettings() -> object` (the values above)
  - `deviceId(db) -> Promise<string>`: 8 base36 characters, created once.
  - `cleanupLegacyStorage(storage: Storage) -> string[]`: removes keys that start with `hanja_`, `kanji_` or `hk_`, and returns the removed keys.

- [ ] **Step 1: Write the failing tests.** Use `import 'fake-indexeddb/auto'`.
  - `addEntries` twice with the same ids inserts once.
  - `unsynced` → `markSynced` → empty.
  - Profiles round-trip.
  - `deviceId` is stable across two calls.
  - `cleanupLegacyStorage` on a Map-backed fake removes `hanja_learned`, `kanji_srs_cards` and `hk_active_mode`, and keeps `other`.
- [ ] **Step 2: Run them.** Expected: FAIL.
- [ ] **Step 3: Implement it.**
- [ ] **Step 4: Run them again.** Expected: PASS.
- [ ] **Step 5: Commit:** `git commit -m "store: IndexedDB profiles, review log, meta; legacy cleanup"`

### Task 10: Log and settings merge

**Files:**
- Create: `src/sync/merge.js`, `tests/merge.test.js`

**Interfaces:**
- Produces:
  - `mergeEntries(a: Entry[], b: Entry[]) -> Entry[]`: the union by `id`, sorted by `(at, id)`.
  - `mergeProfile(local, remote) -> profile`: per-field last-write-wins using `settingsUpdatedAt[path]`, where `path` is like `'ja.newPerDay'` or `'appearance'`. `createdAt` is the earliest; `name` keeps local.
  - `monthOf(at: string) -> 'YYYY-MM'`: the UTC month.
  - `groupByMonth(entries) -> Map<string, Entry[]>`

- [ ] **Step 1: Write the failing tests.**
  - `merge(a, b)` equals `merge(b, a)`.
  - `merge(a, a)` equals `a`.
  - `merge(merge(a, b), c)` equals `merge(a, merge(b, c))`.
  - A remote `ja.retention` newer than the local one wins, while an older remote `ko.newPerDay` loses.
  - `monthOf('2026-12-31T23:59:59Z')` is `'2026-12'`.
- [ ] **Step 2: Run them.** Expected: FAIL.
- [ ] **Step 3: Implement it.**
- [ ] **Step 4: Run them again.** Expected: PASS.
- [ ] **Step 5: Commit:** `git commit -m "sync: commutative log merge and per-field settings merge"`

## Phase 3 — Screens and offline

> For every UI task: verify in the built-in browser with a 375×812 viewport and in dark mode (`resize_window` with `colorScheme`). Serve the site with `python -m http.server 8080` from the repo root, set up as a `.claude/launch.json` entry named `site`. Before writing UI code, load the `impeccable:impeccable` skill and follow its guidance within the approved Paper & ink direction.

### Task 11: App shell, styles, data loading, profile picker

**Files:**
- Create: `index.html` (replaces the old one), `src/main.js`, `src/state.js`, `src/data/load.js`, `src/ui/styles.css`, `src/ui/ProfilePicker.js`, `src/ui/profile-input.js`, `tests/load.test.js`, `tests/profile-input.test.js`, `.claude/launch.json`
- Delete: `js/`, `css/`, `make_icons.py`, `test_app.js`, `apple-touch-icon.png`, `icons/`

**Interfaces:**
- Consumes: Tasks 7–9
- Produces:
  - `loadData(lang) -> Promise<Dataset>`. A `Dataset` is `{ lang, levels, chars, parts, byId: Map, byChar: Map }`.
  - `validateProfileInput(name: string, tag: string) -> { ok: true, key, name, tag } | { ok: false, error: string }`
  - `createStore({ db, now = () => new Date() }) -> Store`
  - `Store` = `{ get(), subscribe(fn) -> unsubscribe, actions }`. The state is `{ profiles, profile, lang, data: {ja, ko}, entries, states, prevState, sync: { status, waiting, lastSync, error } }`.
  - Store actions:
    - `selectProfile(key)`
    - `addProfile(name, tag)` (validates; returns `{ok, error}`)
    - `setLang('ja' | 'ko')`
    - `answer(cardId, rating, ms)`
    - `undo()`
    - `updateSettings(path, value)`
    - `resetLang(lang)`
  - `useStore(store) -> state`: a Preact hook.
  - Routes are hash-based: `#/study`, `#/session`, `#/characters/<levelId>`, `#/stats`, `#/settings`. The profile picker shows whenever no profile is active.
  - Error text, exactly:
    - `"Name: letters and numbers only, up to 20."`
    - `"Number: exactly 4 digits."`

- [ ] **Step 1: Write the failing tests.**
  - `validateProfileInput`:
    - `('Kacper','1234')` is ok with key `kacper-1234`.
    - `('Łucja','0042')` is ok with tag `'0042'`.
    - `('한별','7777')` is ok.
    - `('Ka cper','1234')`, `('Kacper🙂','1234')` and `('','1234')` fail with the name error.
    - `('Kacper','12a4')` and `('Kacper','12345')` fail with the number error.
  - `loadData` with a stubbed `fetch`: `byChar.get('休').id === 'ja:休'`.
- [ ] **Step 2: Run them.** Expected: FAIL.
- [ ] **Step 3: Implement it.**
  - **`index.html`:**
    - `<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">`;
    - Apple web-app meta tags;
    - `<link rel="manifest" href="./manifest.webmanifest">`;
    - `<script type="module" src="./src/main.js">`.
  - **`styles.css`:**
    - the tokens from Global Constraints on `:root`;
    - a dark set under `@media (prefers-color-scheme: dark)` and `[data-theme=dark]` (suggested: bg `#171512`, ink `#ece6da`, secondary `#a39a8c`, hairline `#2e2a24`, card `#1f1c18`, segment `#2a2621`);
    - `@font-face` for the three woff2 files with `font-display: block`;
    - `--cjk: 'Klee One', 'HK Fallback Serif', serif;`;
    - safe-area padding.
  - **`main.js`:**
    - calls `cleanupLegacyStorage(localStorage)` once;
    - opens the db;
    - loads both datasets;
    - renders the app.
  - **ProfilePicker** follows the approved mockup style: a list of profiles on the device, plus an "Add profile" form with name, `#` and a 4-digit field (`inputmode="numeric"`).
- [ ] **Step 4: Run** `npm test` (expected: PASS). Then check in the browser: on first load the picker shows; adding `Kacper#1234` lands on `#/study`; a reload remembers the profile; the console has no errors.
- [ ] **Step 5: Commit:** `git add -A && git commit -m "ui: app shell, Paper & ink styles, data loading, profile picker"`

### Task 12: Study home and review session

**Files:**
- Create: `src/ui/Home.js`, `src/ui/Session.js`, `src/ui/CardFace.js`, `src/ui/format.js`, `tests/format.test.js`
- Modify: `src/state.js` (implement `answer` and `undo` against the db and queue)

**Interfaces:**
- Consumes: `buildQueue`, `nextItem`, `makeScheduler().preview`, the store
- Produces, from `format.js`:
  - `kunLabel('やす.む') -> 'やす・む'`
  - `hunEumLabel({hun:'쉴',eum:'휴'}) -> '쉴 휴'`
  - `estimateMinutes(counts) -> number`: (new × 20s + learning × 10s + review × 8s), rounded up to whole minutes.

- [ ] **Step 1: Write the failing tests** for the three `format.js` functions, with those exact values plus `estimateMinutes({new:10, learning:5, review:34}) === 9`.
- [ ] **Step 2: Run them.** Expected: FAIL.
- [ ] **Step 3: Implement it.**
  - **Home:** as in the mockup.
    - Profile chip + sync status.
    - Language segment.
    - A Today card with the New/Learning/Review counts in the count colours, a **Study now** button (disabled with "All done for today" at zero) and "about N min".
    - A progress row per level (introduced / total).
  - **Session:** shows the front (the character inside a 田字格 box, CSS dashed guides). Tap or Space reveals.
    - **Back, Japanese:** On readings (katakana) and Kun readings via `kunLabel`, the first ones large; up to 3 meanings; parts (`亻 person + 木 tree`); word tiles with a kana pill under each word.
    - **Back, Korean:** `hunEum` (first large, others small), meanings, parts, word tiles showing `w`, then `hangul`, then `en`.
    - Then the four buttons, with `preview` labels. Keys 1–4 rate.
    - Undo in the top bar, plus a progress bar and the count left.
    - When `nextItem` returns `waitMs`, show "Next card in N min".
    - On exit or when finished, return to Home.
  - **`answer`:** appends a review entry (`id = ${deviceId}-${Date.now()}-${n}`), updates that card's state incrementally with `next`, and rebuilds the queue.
  - **`undo`:** appends `{type:'undo', target}` and replays.
- [ ] **Step 4: Run** `npm test` (expected: PASS). Then check in the browser: study 3 new cards (Good, Again, Easy); the counts update; "Again" brings the card back after about 1 minute (wait it out); undo restores the previous card; it works in dark mode.
- [ ] **Step 5: Commit:** `git commit -am "ui: study home and Anki-style review session"`

### Task 13: Characters tab, detail sheet, stroke animator, practice

**Files:**
- Create: `src/ui/Characters.js`, `src/ui/DetailSheet.js`, `src/ui/Practice.js`, `src/ui/strokes.js`, `src/engine/tree.js`, `tests/tree.test.js`

**Interfaces:**
- Consumes: `Dataset`, `introducedSet`, `isAvailable`, `buildPractice`
- Produces:
  - `buildForest(chars, levelId, introduced) -> Node[]`. A node is `{ char, status: 'studied'|'new'|'later', needs: string[], alsoParents: string[], fromLevel: string|null, children: Node[] }`.
    - The roots are the level's chars whose `primaryParent` is null or in another level. `fromLevel` names that level.
    - `needs` = the required parents that haven't been introduced, as characters.
  - `mountStrokes(el: HTMLElement, lang, char, { reducedMotion }) -> { play(), replay(), step(), toggleNumbers(), destroy() }`
    - It fetches `./data/strokes/<lang>/<hex>.json`.
    - It renders `<svg viewBox="0 0 1024 1024"><g transform="scale(1,-1) translate(0,-900)">`. Each median is a `<path>` with `stroke-linecap:round`, `stroke-width:64`, colour `var(--ink)`, animated through `stroke-dashoffset` at about 600 ms per stroke with a 150 ms gap.
    - With reduced motion, it draws the final state with numbers.
    - Without stroke data, it shows the glyph in `--cjk` and the text "Stroke order not available".

- [ ] **Step 1: Write the failing tests** for `buildForest` on a fixture of 木/本/休/人/日/東, using the spec mockup states:
  - 本 is studied, under 木;
  - 休 is `new`, under 木, with `alsoParents` ['人'];
  - a char whose required 日 isn't introduced is `later`, with needs ['日'];
  - a char whose primary parent is in N5, viewed in N4, is a root with `fromLevel` 'N5'.
- [ ] **Step 2: Run them.** Expected: FAIL.
- [ ] **Step 3: Implement it.**
  - **Characters:** level chips, the **Practice this level** button (disabled, with the hint "Study a few characters first" when there are 0 introduced), then the forest with the hairline connectors from the mockup.
  - **Tap a node** to open the DetailSheet:
    - the large stroke animation with Replay, Step and Numbers controls;
    - readings, meanings, parts (in-set refs are links that open their sheet; later-level refs say "comes in N4");
    - words;
    - the status "Next review in 12 days", or "Not studied yet", or "Unlocks after 日".
  - **The sheet** never has quiz or study buttons.
  - **Practice:** the same card UI as the Session, but answers are not stored. It ends with "Practice done — your schedule wasn't changed."
- [ ] **Step 4: Run** `npm test` (expected: PASS). Then check in the browser:
  - the N5 forest shows real families (森 sits under 林, not under a topic);
  - a later node's sheet opens and says "Unlocks after…";
  - strokes for 読 (ja) and 敎 (ko) animate;
  - reduced motion shows the numbered final state.
- [ ] **Step 5: Commit:** `git commit -m "ui: characters forest, detail sheet with stroke animator, level practice"`

### Task 14: Stats and Settings

**Files:**
- Create: `src/ui/Stats.js`, `src/ui/Settings.js`, `src/ui/About.js`, `tests/state.test.js`
- Modify: `src/state.js` (`updateSettings` writes `settingsUpdatedAt[path]`; `resetLang` appends a reset entry and replays)

**Interfaces:**
- Consumes: the `stats.js` helpers, `isLeech`, `mergeProfile` paths, the store

- [ ] **Step 1: Write the failing test** in `tests/state.test.js` (fake-indexeddb):
  - `updateSettings('ja.newPerDay', 15)` stores 15 and sets `settingsUpdatedAt['ja.newPerDay']`.
  - `resetLang('ja')` leaves no `ja:` states and keeps `ko:` states.
- [ ] **Step 2: Run it.** Expected: FAIL.
- [ ] **Step 3: Implement it.**
  - **Stats:** reviews today, streak, 30-day retention (or "Not enough reviews yet"), a 7-day forecast as a simple bar row, progress per level, and the leech list (the character, its lapse count, and a tap to open the sheet).
  - **Settings sections:**
    - Profile: the current profile, Switch, Add.
    - Sync: the Task 17 placeholder.
    - Study: new per day, max reviews, learning steps, relearning steps, retention slider 0.80–0.95, day start hour.
    - Appearance: Auto/Light/Dark.
    - About: renders the source list matching `data/LICENSES.md`, with credits for Klee One, Gowun Batang, animCJK, kanji-data/KANJIDIC, the JLPT decks, 한국어문회 lists, kengdic, cjkvi, ts-fsrs and htm/Preact.
    - Reset: per language, with a confirm dialog whose text is exactly "Reset Japanese progress on all devices? Your history stays in the sync repo." (or "Korean").
- [ ] **Step 4: Run** `npm test` (expected: PASS). Then check in the browser: changing new cards per day changes Home's New count; dark mode toggles; reset empties the progress for that language only.
- [ ] **Step 5: Commit:** `git commit -am "ui: stats and settings"`

### Task 15: Offline service worker, manifest, icons

**Files:**
- Create: `sw.js` (replaces the old one), `manifest.webmanifest`, `tools/gen_precache.mjs`, `precache.json` (generated), `tools/make_icons.py`, `assets/icons/icon-192.png`, `icon-512.png`, `icon-maskable-512.png`, `apple-touch-icon.png` (generated), `src/ui/UpdateBanner.js`, `tests/precache.test.js`
- Delete: `manifest.json`

**Interfaces:**
- Produces:
  - `node tools/gen_precache.mjs` writes `precache.json` = `{ version: <sha256 of all listed files' contents, first 12 hex>, files: [sorted relative paths] }`.
    - It covers `index.html`, `manifest.webmanifest`, and everything under `src/`, `vendor/`, `assets/` and `data/`.
    - It excludes `tests/`, `tools/`, `docs/` and `sources/`.
  - `sw.js`:
    - **install:** fetch `./precache.json`, then `cache.addAll(files)` into `hk-<version>`.
    - **activate:** delete every other cache, including `hanja-kanji-learner-v3`.
    - **fetch:** cache-first for same-origin GET, with a network fallback for navigation; never cache `api.github.com`.
    - **message:** `'SKIP_WAITING'` calls `skipWaiting()`.
  - `UpdateBanner` shows "Update available — Reload" when a waiting worker exists. Reload posts `SKIP_WAITING`, then reloads on `controllerchange`.

- [ ] **Step 1: Write the failing test** `tests/precache.test.js`:
  - every file in the covered folders is listed;
  - no listed file is missing;
  - `version` equals a fresh recomputation, so the test fails when `precache.json` is stale.
- [ ] **Step 2: Run it.** Expected: FAIL.
- [ ] **Step 3: Implement it.**
  - **`manifest.webmanifest`:** `start_url: "./"`, `scope: "./"`, `display: "standalone"`, `background_color: "#f6f1e7"`, `theme_color: "#f6f1e7"`, plus the icons (with a maskable one).
  - **`make_icons.py`:** Pillow draws 字 in `sources/KleeOne-SemiBold.ttf`, ink `#1f1b17` on paper `#f6f1e7`. The maskable version keeps the glyph inside the central 80%.
  - Register the SW in `main.js` (https or localhost only).
  - Run `node tools/gen_precache.mjs`.
- [ ] **Step 4: Run** `npm test` (expected: PASS). Then check in the browser: after the first load, set the browser offline (DevTools or the pane's network off) and reload; the app works, including stroke animations and fonts. Bump a file, regenerate, and reload; the update banner appears.
- [ ] **Step 5: Commit:** `git add -A && git commit -m "pwa: precache manifest, offline service worker, manifest and icons"`

## Phase 4 — Profiles sync

### Task 16: GitHub Contents API client

**Files:**
- Create: `src/sync/github.js`, `tests/github.test.js`

**Interfaces:**
- Produces:
  - `createGitHubClient({ token, repo, fetch = globalThis.fetch }) -> client`
  - `client.listDir(path) -> Promise<{name, path, sha}[]>`: `[]` on 404.
  - `client.getJson(path) -> Promise<{sha, json} | null>`
  - `client.putJson(path, json, sha | null, message) -> Promise<{sha}>`
  - `client.test() -> Promise<{ ok: true } | { ok: false, kind }>`
  - `class SyncError extends Error { kind: 'auth'|'notfound'|'conflict'|'offline'|'http'; status?: number }`
    - 401/403 → `auth`
    - 404 on the repo itself → `notfound`
    - 409/422 → `conflict`
    - a `TypeError` from fetch → `offline`
    - anything else → `http`
  - Requests:
    - URL `https://api.github.com/repos/${repo}/contents/${path}`;
    - headers `Authorization: Bearer <token>`, `Accept: application/vnd.github+json`, `X-GitHub-Api-Version: 2022-11-28`;
    - content is base64 of UTF-8 JSON, using `TextEncoder`/`TextDecoder`, not plain `btoa` of the string.

- [ ] **Step 1: Write the failing tests** with a mocked `fetch` that records requests:
  - `putJson` then `getJson` round-trips `{"w":"學校","kana":"がっこう"}` exactly.
  - Each status maps to its `kind`.
  - A `TypeError` maps to `offline`.
  - The token appears only in the `Authorization` header, never in a URL.
  - `test()` returns `{ok:false, kind:'auth'}` on 401.
- [ ] **Step 2: Run them.** Expected: FAIL.
- [ ] **Step 3: Implement it.**
- [ ] **Step 4: Run them again.** Expected: PASS.
- [ ] **Step 5: Commit:** `git commit -m "sync: GitHub Contents API client"`

### Task 17: Sync procedure, triggers and Sync settings

**Files:**
- Create: `src/sync/sync.js`, `tests/sync.test.js`, `src/ui/SyncSettings.js`
- Modify: `src/state.js` (sync status and triggers), `src/ui/Settings.js`, `src/ui/Home.js` (status line), `src/ui/ProfilePicker.js` ("Welcome back")

**Interfaces:**
- Consumes: Tasks 9, 10, 16
- Produces:
  - `syncProfile({ db, client, profileKey, now }) -> Promise<{ pulled: number, pushed: number, created: boolean, existed: boolean }>`, following spec §7.3 steps 1–7. Details:
    - The folder is `profiles/<key>/`.
    - `profile.json` = `{ name, tag, createdAt, settings, settingsUpdatedAt }`.
    - `log-YYYY-MM.json` = `{ entries: [...] }`.
    - Last synced shas live in meta `sync:<key>` = `{ shas: { file: sha }, lastSync }`.
    - On a conflict, re-fetch, merge and retry, at most 3 times; after that, throw `SyncError('conflict')`.
  - `createSyncManager({ store, db, getClient }) -> { trigger(reason), stop() }`
    - It runs one sync at a time; a trigger during a sync queues a single follow-up.
    - The reasons are `'open'`, `'visible'`, `'session-end'`, `'answers'` (every 20) and `'manual'`.
  - Status strings, exactly:
    - "Sync off"
    - "Synced just now"
    - "Synced N min ago"
    - "Offline: N answers waiting"
    - "Sync problem: token expired, tap to fix"
    - "Sync problem: repo not found"

- [ ] **Step 1: Write the failing tests.** Use an in-memory fake GitHub (a Map of path → {sha, json}) behind the client interface, plus fake-indexeddb.
  - Local-only entries are pushed into the right month files. A second sync pushes 0 and pulls 0.
  - A remote device's entries are pulled and merged, and the states change.
  - **Review Focus 2:** two devices create the same profile offline. The second `putJson('profile.json', …, null)` gets a conflict. It retries, merges, and both end with the union of entries and `existed: true`.
  - **Review Focus 3:** a 401 → status "Sync problem: token expired, tap to fix", and studying still works (`answer` succeeds while sync fails). A 404 on the repo → "Sync problem: repo not found".
  - The manager runs only one sync at a time: 3 rapid triggers cause at most 2 runs.
- [ ] **Step 2: Run them.** Expected: FAIL.
- [ ] **Step 3: Implement it.**
  - **SyncSettings:**
    - a token field (`type=password`, never echoed after saving; show "Connected as <repo>");
    - the repo field (default `Frelek/hanja-kanji-progress`);
    - a **Test** button with plain-language results;
    - Sync now;
    - the last sync time;
    - Disconnect (clears the token).
  - **Status line** on Home.
  - **"Welcome back"** in the picker when adding a profile that already exists remotely.
  - **Triggers:** wire them in `main.js` (`visibilitychange`, open) and in the store (every 20 answers, session end).
- [ ] **Step 4: Run** `npm test` (expected: PASS). Then check by hand: the user creates the private repo and a fine-grained token (*Contents: Read and write* on that repo only) and pastes it. Study 3 cards on the laptop and press Sync now; `profiles/kacper-1234/log-2026-11.json` appears in the repo. A second browser profile adding `Kacper#1234` shows "Welcome back" with the same counts.
- [ ] **Step 5: Commit:** `git commit -am "sync: profile sync procedure, triggers, settings and status"`

## Phase 5 — Finish

### Task 18: Documentation and full verification

**Files:**
- Modify: `README.md`, `APP_SPECIFICATION_AND_SUMMARY.txt` (rewrite both for the new app)

- [ ] **Step 1: Rewrite the docs.**
  - **README:** what the app is; the install-to-home-screen steps; how to connect sync (create the private repo, create the token, paste it); how to rebuild the data (`python tools/fetch_sources.py && python tools/build_data.py && node tools/gen_precache.mjs`); how to run the tests (`python -m unittest discover -s tools/tests -t tools` and `npm test`).
  - **The spec file:** replace it with a short summary that points to `docs/superpowers/specs/…`. Keep the still-valid invariants from Global Constraints. Drop the old instructions about embedding a token in the git remote URL.
- [ ] **Step 2: Run everything:**
  - `python -m unittest discover -s tools/tests -t tools`
  - `npm test`
  - `node tools/gen_precache.mjs && git diff --exit-code precache.json`

  Expected: all pass, and precache.json is unchanged.
- [ ] **Step 3: Do the end-to-end manual pass** at 375×812, light and dark:
  - picker → study a session in each language → characters → detail sheet → practice → stats → settings → offline reload → sync.
  - Review Focus 4: `git worktree add ../hk-old 112cd57`. Serve `../hk-old` on port 8080, open it, and mark a character learned (this creates the old SW cache and `hanja_*` keys). Stop it, serve the new build on the same port 8080, and reload. The old cache and keys are gone, and nothing crashes. Then `git worktree remove ../hk-old`.
- [ ] **Step 4: Commit:** `git commit -am "docs: describe the rebuilt app"`

### Task 19 (optional, last): Example sentences

Do this only if the user asks after Task 18. It needs the Tatoeba per-language exports and `fugashi` + `unidic-lite`. Pick one short sentence per character that contains one of its example words. Japanese sentences get a kana reading from the tokenizer. Validation: every sentence contains its char, and every ja sentence has a reading. Scope it as its own small plan when it's requested.
