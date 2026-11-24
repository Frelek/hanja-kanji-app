"""Task 6b: Korean example words whose kengdic gloss is wrong are excluded
(tools/data/ko_word_exclusions.json); the next valid candidate is picked.
R24: an exclusion is one kengdic row, keyed (hanja, hangul, gloss), so a
correct row of the same word stays available."""
import json
import os
import tempfile
import unittest
import unicodedata

from hk.ko import (EXCLUSIONS, load_exclusions, load_kengdic, load_kengdic_hanja,
                   pick_words_ko, build_ko)

SRC = os.path.join(os.path.dirname(__file__), '..', '..', 'sources')
NEEDED = ['hanja-grade.csv', 'kengdic.tsv', 'ids.txt', 'kanji.json',
          'animcjk-dictionaryKo.txt', 'animcjk-dictionaryZhHant.txt',
          'animcjk-dictionaryJa.txt']
HAVE_SOURCES = all(os.path.exists(os.path.join(SRC, f)) for f in NEEDED)
FIELDS = ['hanja', 'hangul', 'gloss', 'reason']


def _json(obj):
    fd, path = tempfile.mkstemp(suffix='.json')
    with os.fdopen(fd, 'w', encoding='utf-8', newline='') as f:
        json.dump(obj, f, ensure_ascii=False)
    return path


class LoadExclusionsTests(unittest.TestCase):
    def test_reads_hanja_hangul_gloss_triples(self):
        path = _json([
            {'hanja': '敎會', 'hangul': '교회', 'gloss': 'Preach or moral instruction',
             'reason': '敎會 means church; the gloss describes preaching.'},
            {'hanja': '圖章', 'hangul': '대장', 'gloss': 'A seal, a stamp',
             'reason': '圖章 is read 도장.'},
            {'hanja': '精米', 'hangul': '정미', 'gloss': 'cool', 'reason': '精米 x.'},
            {'hanja': '精米', 'hangul': '정미', 'gloss': 'net', 'reason': '精米 y.'},
        ])
        try:
            self.assertEqual(load_exclusions(path), {
                ('敎會', '교회', 'Preach or moral instruction'),
                ('圖章', '대장', 'A seal, a stamp'),
                ('精米', '정미', 'cool'), ('精米', '정미', 'net')})
        finally:
            os.remove(path)

    def test_nfc(self):
        path = _json([{'hanja': '金庫', 'hangul': '금고',
                       'gloss': 'x', 'reason': 'y'}])   # U+F90A compat 金; 금 as jamo
        try:
            self.assertEqual(load_exclusions(path), {('金庫', '금고', 'x')})
        finally:
            os.remove(path)

    def test_empty_list(self):
        path = _json([])
        try:
            self.assertEqual(load_exclusions(path), set())
        finally:
            os.remove(path)


class PickSkipsExcludedTests(unittest.TestCase):
    RANK = {'敎': 0, '會': 1, '室': 0, '育': 1, '圖': 1, '章': 1, '植': 1, '物': 1}

    def w(self, w, hangul, lvl, en='x'):
        return {'w': w, 'hangul': hangul, 'en': en, 'lvl': lvl}

    def test_excluded_row_skipped_next_candidate_picked(self):
        words = [self.w('敎會', '교회', 'A', 'Preach or moral instruction'),
                 self.w('敎室', '교실', 'A', 'Classroom'),
                 self.w('敎育', '교육', 'B', 'Education'),
                 self.w('敎育室', '교육실', 'C', 'education room')]
        got = pick_words_ko('敎', self.RANK, words,
                            exclude={('敎會', '교회', 'Preach or moral instruction')})
        self.assertEqual([x['w'] for x in got], ['敎室', '敎育', '敎育室'])
        # without the exclusion the wrong row is picked and 敎育室 is not
        self.assertEqual([x['w'] for x in pick_words_ko('敎', self.RANK, words)],
                         ['敎室', '敎會', '敎育'])

    def test_exclusion_needs_hanja_and_hangul(self):
        words = [self.w('圖章', '대장', 'A', 'A seal, a stamp'),
                 self.w('圖章', '도장', 'C', 'seal, stamp')]
        got = pick_words_ko('章', self.RANK, words,
                            exclude={('圖章', '대장', 'A seal, a stamp')})
        self.assertEqual(got, [{'w': '圖章', 'hangul': '도장', 'en': 'seal, stamp'}])

    def test_correct_row_of_partly_excluded_pair_still_picked(self):   # R24
        words = [self.w('植物', '식물', 'B', 'food,provisions'),
                 self.w('植物', '식물', '', 'a plant')]
        exclude = {('植物', '식물', 'food,provisions')}
        self.assertEqual(pick_words_ko('植', self.RANK, words, exclude),
                         [{'w': '植物', 'hangul': '식물', 'en': 'a plant'}])
        # without it the wrong row wins (level B before none) and hides the right one
        self.assertEqual(pick_words_ko('植', self.RANK, words),
                         [{'w': '植物', 'hangul': '식물', 'en': 'food,provisions'}])

    def test_pair_with_every_row_excluded_is_dropped(self):
        words = [self.w('精米', '정미', '', 'cool'), self.w('精米', '정미', '', 'net')]
        exclude = {('精米', '정미', 'cool'), ('精米', '정미', 'net')}
        self.assertEqual(pick_words_ko('米', {'精': 1, '米': 1}, words, exclude), [])
        self.assertEqual(pick_words_ko('米', {'精': 1, '米': 1}, words,
                                       {('精米', '정미', 'cool')}),
                         [{'w': '精米', 'hangul': '정미', 'en': 'net'}])


class ExclusionFileTests(unittest.TestCase):
    """tools/data/ko_word_exclusions.json itself (no sources needed)."""

    @classmethod
    def setUpClass(cls):
        with open(EXCLUSIONS, encoding='utf-8') as f:
            cls.rows = json.load(f)

    def test_shape(self):
        self.assertIsInstance(self.rows, list)
        self.assertTrue(self.rows)
        for r in self.rows:
            self.assertEqual(list(r), FIELDS, r)
            for k in FIELDS:
                self.assertIsInstance(r[k], str, r)
                self.assertTrue(r[k].strip(), r)
                self.assertEqual(r[k], unicodedata.normalize('NFC', r[k]), r)

    def test_sorted_by_hanja_hangul_gloss_and_unique(self):
        keys = [(r['hanja'], r['hangul'], r['gloss']) for r in self.rows]
        self.assertEqual(keys, sorted(keys))
        self.assertEqual(len(keys), len(set(keys)))

    def test_reason_is_one_sentence_naming_the_word(self):
        for r in self.rows:
            self.assertTrue(r['reason'].endswith('.'), r)
            self.assertEqual(r['reason'], ' '.join(r['reason'].split()), r)
            self.assertTrue(r['hanja'] in r['reason'] or r['hangul'] in r['reason'], r)

    def test_loader_matches_file(self):
        self.assertEqual(load_exclusions(EXCLUSIONS),
                         {(r['hanja'], r['hangul'], r['gloss']) for r in self.rows})


@unittest.skipUnless(HAVE_SOURCES, 'sources/ absent')
class FullBuildExclusionTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.data = build_ko(SRC)
        cls.by_char = {r['char']: r for r in cls.data['chars']}
        cls.excluded = load_exclusions(EXCLUSIONS)
        with open(EXCLUSIONS, encoding='utf-8') as f:
            cls.rows = json.load(f)
        kengdic = os.path.join(SRC, 'kengdic.tsv')
        cls.words = load_kengdic(kengdic)
        cls.vocab = load_kengdic_hanja(kengdic)

    def test_no_chosen_word_is_excluded(self):
        hits = [(r['char'], w['w'], w['hangul'], w['en'])
                for r in self.data['chars'] for w in r['words']
                if (w['w'], w['hangul'], w['en']) in self.excluded]
        self.assertEqual(hits, [])

    def test_offensive_and_misleading_rows_not_chosen(self):          # R25
        chosen = {(w['w'], w['en']) for r in self.data['chars'] for w in r['words']}
        for row in [('黑人', 'A Negro'), ('寸數', 'remove'), ('虛空', 'inane'),
                    ('歌曲', 'lied'), ('工兵', 'pioneer'), ('家庭', 'Famly'),
                    ('米飮', 'rece water')]:
            self.assertNotIn(row, chosen)

    def test_correct_rows_of_partly_excluded_pairs_still_available(self):   # R24
        cand = {(e['w'], e['hangul'], e['en']) for e in self.words} - self.excluded
        for row in [('植物', '식물', 'a plant'), ('洋食', '양식', 'bread, crust, Western food'),
                    ('永遠', '영원', 'eternity, forever'), ('兩極', '양극', 'the 2 extremities'),
                    ('歌曲', '가곡', 'song'), ('工兵', '공병', 'sapper'),
                    ('米飮', '미음', 'water gruel')]:
            self.assertIn(row, cand)
        self.assertIn({'w': '植物', 'hangul': '식물', 'en': 'a plant'},
                      self.by_char['植']['words'])

    def test_church_not_taught_as_preaching(self):
        self.assertNotIn({'w': '敎會', 'hangul': '교회', 'en': 'Preach or moral instruction'},
                         self.by_char['敎']['words'])
        self.assertNotIn('敎會', [w['w'] for w in self.by_char['敎']['words']])
        self.assertEqual(len(self.by_char['敎']['words']), 3)

    def test_every_exclusion_is_a_real_kengdic_row(self):
        rows = {(e['w'], e['hangul'], e['en']) for e in self.words}
        stale = [r for r in self.rows if (r['hanja'], r['hangul'], r['gloss']) not in rows]
        self.assertEqual(stale, [])

    def test_counting_list_keeps_excluded_rows(self):        # R19 unaffected
        counted = {(e['w'], e['hangul']) for e in self.vocab}
        self.assertEqual({(h, g) for h, g, _ in self.excluded} - counted, set())

    def test_seal_keeps_its_correct_reading(self):
        self.assertIn({'w': '圖章', 'hangul': '도장', 'en': 'seal, stamp'},
                      self.by_char['章']['words'])


if __name__ == '__main__':
    unittest.main()
