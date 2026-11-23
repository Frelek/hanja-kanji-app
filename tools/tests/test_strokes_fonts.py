import json
import os
import tempfile
import unittest

from fontTools.ttLib import TTFont

from hk.strokes import load_graphics, write_strokes
from hk.fonts import needed_text, missing_glyphs, subset_woff2

SRC = os.path.join(os.path.dirname(__file__), '..', '..', 'sources')
KLEE = os.path.join(SRC, 'KleeOne-SemiBold.ttf')


def _rec(char, words=(), **kw):
    r = {'char': char, 'meanings': [], 'parts': [], 'words': list(words)}
    r.update(kw)
    return r


class StrokesTests(unittest.TestCase):
    def test_write_strokes_first_source_wins_and_reports_missing(self):
        s1 = {'休': [[[1, 2]]]}
        s2 = {'休': [[[9, 9]]], '木': [[[3, 4], [5, 6]]]}
        with tempfile.TemporaryDirectory() as d:
            missing = write_strokes(['休', '木', '林'], [s1, s2], d)
            self.assertEqual(missing, ['林'])
            with open(os.path.join(d, '4f11.json'), encoding='utf-8') as f:
                raw = f.read()
            self.assertEqual(json.loads(raw), {'m': [[[1, 2]]]})
            self.assertEqual(raw, '{"m":[[[1,2]]]}')
            self.assertTrue(os.path.exists(os.path.join(d, '6728.json')))
            self.assertFalse(os.path.exists(os.path.join(d, '6797.json')))

    def test_three_source_fallback_order(self):
        ko, zh, ja = {'休': [[[1, 1]]]}, {'休': [[[2, 2]]], '木': [[[3, 3]]]},             {'休': [[[4, 4]]], '木': [[[5, 5]]], '黨': [[[6, 6]]]}
        with tempfile.TemporaryDirectory() as d:
            self.assertEqual(write_strokes(['休', '木', '黨', '林'], [ko, zh, ja], d), ['林'])
            got = {n: json.load(open(os.path.join(d, n), encoding='utf-8'))['m'][0][0][0]
                   for n in os.listdir(d)}
            self.assertEqual(got, {'4f11.json': 1, '6728.json': 3, '9ee8.json': 6})

    def test_load_graphics_keeps_only_medians(self):
        with tempfile.TemporaryDirectory() as d:
            p = os.path.join(d, 'g.txt')
            with open(p, 'w', encoding='utf-8') as f:
                f.write(json.dumps({'character': '休', 'strokes': ['M0'],
                                    'medians': [[[1, 2]]]}) + '\n\n')
            self.assertEqual(load_graphics(p), {'休': [[[1, 2]]]})


class FontTests(unittest.TestCase):
    def test_needed_text(self):
        ja = {'chars': [_rec('休', words=[{'w': '休日', 'kana': 'きゅうじつ', 'en': 'holiday'}],
                             on=['キュウ'], kun=['やす.む'])],
              'parts': {'亻': 'person'}}
        ko = {'chars': [_rec('休', words=[{'w': '휴식', 'hangul': '휴식', 'en': 'rest'}],
                             hunEum=[{'hun': '쉴', 'eum': '휴'}])],
              'parts': {}}
        cjk, hangul = needed_text(ja, ko)
        self.assertIn('・', cjk)
        for cp in range(0x3040, 0x3100):
            self.assertIn(chr(cp), cjk)
        for c in '日本語':
            self.assertIn(c, cjk)
        for c in '휴식쉴한국어':
            self.assertIn(c, hangul)
        self.assertIn('A', cjk)
        self.assertIn('A', hangul)
        self.assertIn('亻', cjk)

    @unittest.skipUnless(os.path.exists(KLEE), 'font source missing')
    def test_subset_woff2(self):
        with tempfile.TemporaryDirectory() as d:
            out = os.path.join(d, 'k.woff2')
            subset_woff2(KLEE, {'休', 'あ'}, out)
            cmap = TTFont(out).getBestCmap()
            self.assertIn(ord('休'), cmap)
            self.assertIn(ord('あ'), cmap)
            self.assertEqual(missing_glyphs(KLEE, {'休', '\U0001F600'}), {'\U0001F600'})


if __name__ == '__main__':
    unittest.main()
