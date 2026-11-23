import os
import re
import tempfile
import unittest

from hk.ja import (parse_joyo_readings, parse_jlpt_csv, pick_words_ja,
                   build_ja, nfc_dict)

SRC = os.path.join(os.path.dirname(__file__), '..', '..', 'sources')
NEEDED = ['kanji.json', 'joyo2010.txt', 'ids.txt', 'animcjk-dictionaryJa.txt'] + [
    f'jlpt-n{n}.csv' for n in range(1, 6)]
HAVE_SOURCES = all(os.path.exists(os.path.join(SRC, f)) for f in NEEDED)
HEADER = 'expression,reading,meaning,tags,guid\n'


def _csv(rows):
    fd, path = tempfile.mkstemp(suffix='.csv')
    with os.fdopen(fd, 'w', encoding='utf-8', newline='') as f:
        f.write(HEADER + ''.join(r + '\n' for r in rows))
    return path


class JoyoReadingTests(unittest.TestCase):
    def test_on_kun_split(self):
        self.assertEqual(parse_joyo_readings('セイ、ショウ、い-きる、う-まれる、き、なま'),
                         (['セイ', 'ショウ'], ['い.きる', 'う.まれる', 'き', 'なま']))

    def test_parenthesised_go_last(self):
        self.assertEqual(parse_joyo_readings('キン、コン、かね、（かな）'),
                         (['キン', 'コン'], ['かね', 'かな']))
        self.assertEqual(parse_joyo_readings('ジョウ、（ショウ）、うえ、（うわ）、かみ'),
                         (['ジョウ', 'ショウ'], ['うえ', 'かみ', 'うわ']))

    def test_unknown_script_rejected(self):
        with self.assertRaises(ValueError):
            parse_joyo_readings('キン、gold')
        with self.assertRaises(ValueError):
            parse_joyo_readings('キン、（）')


class JlptCsvTests(unittest.TestCase):
    def setUp(self):
        self.paths = []

    def tearDown(self):
        for p in self.paths:
            os.remove(p)

    def parse(self, rows, n=5):
        path = _csv(rows)
        self.paths.append(path)
        return parse_jlpt_csv(path, n)

    def test_split_alternatives(self):
        self.assertEqual(self.parse(['川; 河,かわ,river,JLPT_N5,x']), [
            {'w': '川', 'kana': 'かわ', 'en': 'river', 'n': 5},
            {'w': '河', 'kana': 'かわ', 'en': 'river', 'n': 5}])

    def test_paired_readings_and_first_sense(self):
        got = self.parse(['高校; 高等学校,こうこう; こうとうがっこう,'
                          '"high school; senior high school",JLPT_N4,x'], 4)
        self.assertEqual(got, [
            {'w': '高校', 'kana': 'こうこう', 'en': 'high school', 'n': 4},
            {'w': '高等学校', 'kana': 'こうとうがっこう', 'en': 'high school', 'n': 4}])

    def test_reading_must_fit_expression_kana(self):
        got = self.parse(['お金持ち,かねもち; おかねもち,rich person,JLPT_N4,x',
                          '行く,いく; ゆく,to go,JLPT_N5,x'])
        self.assertEqual([(e['w'], e['kana']) for e in got],
                         [('お金持ち', 'おかねもち'), ('行く', 'いく')])

    def test_non_kana_readings_dropped(self):
        got = self.parse(['～円,～えん,yen,JLPT_N5,x',
                          '結婚,けっこん (する),marriage,JLPT_N5,x',
                          '青,あお,blue,JLPT_N5,x'])
        self.assertEqual([e['w'] for e in got], ['青'])


class PickWordsTests(unittest.TestCase):
    LEVELS = {'休': 5, '日': 5, '講': 4, '憩': 2}
    VOCAB = [
        {'w': '休講', 'kana': 'きゅうこう', 'en': 'cancelled lecture', 'n': 3},
        {'w': '休憩', 'kana': 'きゅうけい', 'en': 'break', 'n': 4},
        {'w': '休む', 'kana': 'やすむ', 'en': 'to rest', 'n': 4},
        {'w': '休日', 'kana': 'きゅうじつ', 'en': 'holiday', 'n': 5},
        {'w': '休み', 'kana': 'やすみ', 'en': 'rest', 'n': 5},
        {'w': '日本', 'kana': 'にほん', 'en': 'Japan', 'n': 5},
    ]

    def test_tiers_and_cap(self):
        got = pick_words_ja('休', 5, self.VOCAB, self.LEVELS)
        self.assertEqual([w['w'] for w in got], ['休日', '休み', '休む'])
        self.assertEqual(got[0], {'w': '休日', 'kana': 'きゅうじつ',
                                  'en': 'holiday', 'level': 'N5'})
        self.assertNotIn('休憩', [w['w'] for w in got])   # N2 kanji
        self.assertLessEqual(len(got), 3)

    def test_tier2_ranks_easier_list_then_shorter(self):
        vocab = [{'w': '休講日', 'kana': 'きゅうこうび', 'en': 'x', 'n': 4},
                 {'w': '休講', 'kana': 'きゅうこう', 'en': 'x', 'n': 3},
                 {'w': '休む', 'kana': 'やすむ', 'en': 'x', 'n': 4}]
        got = pick_words_ja('休', 5, vocab, self.LEVELS)
        self.assertEqual([w['w'] for w in got], ['休む', '休講日', '休講'])

    def test_duplicate_word_listed_once(self):
        vocab = [{'w': '休み', 'kana': 'やすみ', 'en': 'rest', 'n': 4},
                 {'w': '休み', 'kana': 'やすみ', 'en': 'rest', 'n': 5}]
        got = pick_words_ja('休', 5, vocab, self.LEVELS)
        self.assertEqual(got, [{'w': '休み', 'kana': 'やすみ', 'en': 'rest',
                                'level': 'N5'}])


class NfcDictTests(unittest.TestCase):
    def test_unified_key_wins_over_compatibility_form(self):
        compat = '勤'   # CJK COMPATIBILITY IDEOGRAPH for 勤
        self.assertEqual(nfc_dict([(compat, 'compat'), ('勤', 'unified')]),
                         {'勤': 'unified'})
        self.assertEqual(nfc_dict([('勤', 'unified'), (compat, 'compat')]),
                         {'勤': 'unified'})
        self.assertEqual(nfc_dict([(compat, 'only')]), {'勤': 'only'})


@unittest.skipUnless(HAVE_SOURCES, 'sources/ absent')
class FullBuildTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.data = build_ja(SRC)
        cls.by_id = {r['id']: r for r in cls.data['chars']}

    def test_counts(self):
        self.assertEqual(self.data['lang'], 'ja')
        self.assertEqual(self.data['levels'], [{'id': 'N5', 'count': 79},
                                               {'id': 'N4', 'count': 166},
                                               {'id': 'N3', 'count': 367}])
        self.assertEqual(len(self.data['chars']), 612)

    def test_ids_unique(self):
        ids = [r['id'] for r in self.data['chars']]
        self.assertEqual(len(ids), len(set(ids)))

    def test_kyuu_required(self):
        self.assertEqual(self.by_id['ja:休']['required'], ['ja:人', 'ja:木'])

    def test_record_fields(self):
        keys = ['id', 'char', 'level', 'sublevel', 'order', 'strokes', 'meanings',
                'on', 'kun', 'parts', 'parents', 'required', 'primaryParent', 'words']
        for r in self.data['chars']:
            self.assertEqual(list(r), keys)
        r = self.by_id['ja:休']
        self.assertEqual(r['on'], ['キュウ'])
        self.assertEqual(r['kun'], ['やす.む', 'やす.まる', 'やす.める'])
        self.assertEqual(r['parts'][0], {'char': '亻', 'meaning': r['parts'][0]['meaning'],
                                         'ref': 'ja:人'})

    def test_order_levels_then_topological(self):
        chars = self.data['chars']
        self.assertEqual([r['order'] for r in chars], list(range(612)))
        lv = [int(r['level'][1]) for r in chars]
        self.assertEqual(lv, sorted(lv, reverse=True))
        for r in chars:
            self.assertTrue(set(r['required']) <= set(r['parents']))
            if r['primaryParent'] is not None:
                self.assertIn(r['primaryParent'], r['required'])
            for p in r['required']:
                self.assertLess(self.by_id[p]['order'], r['order'])

    def test_words_valid(self):
        kana = re.compile(r'^[぀-ヿ・ー]+$')
        for r in self.data['chars']:
            self.assertLessEqual(len(r['words']), 3)
            for w in r['words']:
                self.assertIn(r['char'], w['w'])
                self.assertRegex(w['kana'], kana)

    def test_parts_dict_covers_every_part(self):
        used = {p['char'] for r in self.data['chars'] for p in r['parts']}
        self.assertEqual(set(self.data['parts']), used)

    def test_deterministic(self):
        self.assertEqual(build_ja(SRC), self.data)


if __name__ == '__main__':
    unittest.main()
