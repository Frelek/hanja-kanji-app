import os
import re
import tempfile
import unittest

from hk.ja import (parse_joyo_readings, parse_jlpt_csv, pick_words_ja,
                   build_ja, nfc_dict, title_case, clean_meanings,
                   part_meaning)

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
                          '来,らい～,next,JLPT_N3,x',
                          '〜(日本) 式,～(にほん) しき,style,JLPT_N2,x',
                          '青,あお,blue,JLPT_N5,x'])
        self.assertEqual([e['w'] for e in got], ['青'])

    def test_trailing_kana_group_stripped_from_reading(self):
        self.assertEqual(self.parse(['勉強,べんきょう (する),study,JLPT_N5,x',
                                     '結婚,けっこん（する）,marriage,JLPT_N5,x']), [
            {'w': '勉強', 'kana': 'べんきょう', 'en': 'study', 'n': 5},
            {'w': '結婚', 'kana': 'けっこん', 'en': 'marriage', 'n': 5}])


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


class AffixWordTests(unittest.TestCase):
    LEVELS = {'敗': 3, '失': 4}

    def test_affix_only_when_nothing_else(self):
        affix = {'w': '～敗', 'kana': 'はい', 'en': 'counter for loss', 'n': 3}
        word = {'w': '失敗', 'kana': 'しっぱい', 'en': 'failure', 'n': 4}
        got = pick_words_ja('敗', 3, [affix, word], self.LEVELS)
        self.assertEqual([w['w'] for w in got], ['失敗'])
        alt = {'w': '〜敗', 'kana': 'はい', 'en': 'x', 'n': 3}
        got = pick_words_ja('敗', 3, [affix, alt], self.LEVELS)
        self.assertEqual([w['w'] for w in got], ['～敗', '〜敗'])


class MeaningTests(unittest.TestCase):
    def test_source_case_kept(self):
        self.assertEqual(clean_meanings(['Day Off', 'Old Japanese Coin', 'Japan', 'I']),
                         ['Day Off', 'Old Japanese Coin', 'Japan'])
        self.assertEqual(clean_meanings(['I', 'Me']), ['I', 'Me'])

    def test_title_case(self):
        self.assertEqual(title_case('roof'), 'Roof')
        self.assertEqual(title_case('according to'), 'According To')
        self.assertEqual(title_case('i'), 'I')
        self.assertEqual(title_case('east-west CJK'), 'East-west CJK')

    def test_radical_items_dropped_then_first_three(self):
        self.assertEqual(clean_meanings(['One', 'One Radical (no.1)']), ['One'])
        self.assertEqual(clean_meanings(
            ['Stream', 'River', 'River Or Three-stroke River Radical (no. 47)']),
            ['Stream', 'River'])
        self.assertEqual(clean_meanings(['Radical Number 9']), [])
        self.assertEqual(clean_meanings(['A', 'RADICAL', 'B', 'C', 'D']), ['A', 'B', 'C'])

    def test_repeats_dropped_ignoring_case_before_first_three(self):
        self.assertEqual(clean_meanings(['Rebel', 'Disobey', 'rebel', 'REBEL', 'Traitor']),
                         ['Rebel', 'Disobey', 'Traitor'])
        self.assertEqual(clean_meanings(['Day', 'Day', 'Sun']), ['Day', 'Sun'])


class PartMeaningTests(unittest.TestCase):
    # Bare radical-form entries (no grade, JLPT level or frequency) are not
    # treated as kanji, which is what makes 宀 "Roof" and 礻 "Show".
    BARE = {'grade': None, 'jlpt_new': None, 'jlpt_old': None, 'freq': None}
    KANJI = {
        '人': {'grade': 1, 'meanings': ['Person']},
        '水': {'grade': 1, 'meanings': ['Water']},
        '示': {'grade': 5, 'meanings': ['Show', 'Indicate']},
        '言': {'grade': 2, 'meanings': ['Say', 'Word']},
        '寺': {'grade': 2, 'meanings': ['Buddhist Temple']},
        '一': {'grade': 1, 'meanings': ['One', 'One Radical (no.1)']},
        '亻': dict(BARE, meanings=['Radical Number 9']),
        '氵': dict(BARE, meanings=['Water', 'Water Radical (no. 85)']),
        '礻': dict(BARE, meanings=['Cult', 'Showing Radical (no. 113)']),
        '宀': dict(BARE, meanings=['Shaped Crown', 'Katakana U Radical (no. 40)']),
        '罒': dict(BARE, meanings=['Net Radical Variant (no. 122)']),
        '㝵': dict(BARE, meanings=['To Get', 'Complacent']),
        '乂': dict(BARE, meanings=['Mow', 'Cut Grass']),
        '丿': dict(BARE, meanings=['Katakana No Radical (no. 4)', 'Slash']),
    }
    ANIM = {'言': {'definition': 'speach, words; Kangxi radical 149'},
            '寺': {'definition': 'court, office; temple, monastery'},
            '礻': {'definition': 'cult; radical number 113'},
            '宀': {'definition': 'roof; Kangxi radical 40'},
            '罒': {'definition': 'Radical 122'},
            '⺀': {'definition': 'CJK radical repeat; dots; variant of Kangxi radical 3'},
            '吾': {'definition': 'i, my, our; resist, impede'},
            '㝵': {'definition': '(ancient form of 得) to get, complacent, (same as 礙) '
                                 'to obstruct, to hinder'},
            '丷': {'definition': '“ears-out” component used in some Chinese characters '
                                 '(for example, 兑); archaic form of 八; kwukyel'},
            '𦍌': {'definition': '(variant of 羊), sheep'},
            '㔾': {'definition': '(same as 筄) last name; Kangxi radical 26'},
            '㐅': {'definition': '(ancient form of 五) five'},
            '龷': {'definition': '(variant of 廿); twenty'},
            '丿': {'definition': 'Kangxi radical 4'}}

    def pm(self, p):
        return part_meaning(p, self.KANJI, self.ANIM)

    def test_kanji_first_non_radical_meaning(self):
        self.assertEqual(self.pm('言'), 'Say')
        self.assertEqual(self.pm('寺'), 'Buddhist Temple')
        self.assertEqual(self.pm('一'), 'One')

    def test_variant_takes_full_form_meaning(self):
        self.assertEqual(self.pm('亻'), 'Person')
        self.assertEqual(self.pm('氵'), 'Water')
        self.assertEqual(self.pm('礻'), 'Show')

    def test_animcjk_sense_title_cased(self):
        self.assertEqual(self.pm('宀'), 'Roof')
        self.assertEqual(self.pm('⺀'), 'Dots')
        self.assertEqual(self.pm('吾'), 'I')

    def test_cross_reference_prefix_stripped(self):
        self.assertEqual(self.pm('㝵'), 'To Get')
        self.assertEqual(self.pm('𦍌'), 'Sheep')
        self.assertEqual(self.pm('㔾'), 'Last Name')
        self.assertEqual(self.pm('㐅'), 'Five')
        self.assertEqual(self.pm('龷'), 'Twenty')      # empty sense -> next sense

    def test_comma_inside_parentheses_not_split(self):
        m = self.pm('丷')
        self.assertEqual(m.count('('), m.count(')'))
        self.assertEqual(m, '“ears-out” Component Used In Some Chinese Characters '
                            '(for Example, 兑)')

    def test_kanji_json_fallback_after_animcjk(self):
        self.assertEqual(self.pm('乂'), 'Mow')          # bare entry, no animCJK
        self.assertEqual(self.pm('丿'), 'Slash')        # animCJK only a radical label

    def test_null(self):
        self.assertIsNone(self.pm('罒'))
        self.assertIsNone(self.pm('𠂉'))


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
        self.assertEqual(r['meanings'], ['Rest', 'Day Off', 'Retire'])
        self.assertEqual(r['parts'][0], {'char': '亻', 'meaning': 'Person', 'ref': 'ja:人'})

    def test_meanings_cleaned(self):
        self.assertEqual(self.by_id['ja:一']['meanings'], ['One'])
        self.assertEqual(self.by_id['ja:川']['meanings'], ['Stream', 'River'])
        for r in self.data['chars']:
            self.assertTrue(r['meanings'])
            for m in r['meanings']:
                self.assertNotRegex(m, re.compile('radical', re.I))
        parts = self.data['parts']
        for p, m in {'氵': 'Water', '宀': 'Roof', '亻': 'Person', '礻': 'Show', '言': 'Say',
                     '寺': 'Buddhist Temple', '日': 'Day', '㝵': 'To Get'}.items():
            self.assertEqual(parts[p], m, p)
        xref = re.compile(r'^\(.*\b(form|same as|variant|interchangeable)\b', re.I)
        for p, m in parts.items():
            if m is not None:
                self.assertEqual(m.count('('), m.count(')'), (p, m))
                self.assertNotRegex(m, xref)

    def test_compatibility_form_keys_do_not_clobber(self):
        # kanji.json also holds U+FA34 (compat 勤) with no level and no meanings
        r = self.by_id['ja:勤']
        self.assertEqual(r['level'], 'N3')
        self.assertTrue(r['meanings'])

    def test_radical_variant_tie_break(self):
        self.assertEqual(self.by_id['ja:済']['primaryParent'], 'ja:水')
        self.assertEqual(self.by_id['ja:神']['primaryParent'], 'ja:示')
        self.assertEqual(self.by_id['ja:会']['primaryParent'], 'ja:人')   # 𠆢 -> 人

    def test_deep_single_stroke_parents_dropped(self):
        self.assertNotIn('ja:一', self.by_id['ja:気']['parents'])
        self.assertEqual(self.by_id['ja:二']['parents'], ['ja:一'])
        self.assertIn('ja:一', self.by_id['ja:百']['parents'])

    def test_variant_form_component_keeps_parents_maximal(self):
        self.assertNotIn('ja:八', self.by_id['ja:求']['parents'])
        self.assertIn('ja:水', self.by_id['ja:求']['parents'])

    def test_suru_reading_kept(self):
        words = self.by_id['ja:勉']['words']
        self.assertIn({'w': '勉強', 'kana': 'べんきょう', 'en': 'study', 'level': 'N5'}, words)

    def test_affix_words_not_used_when_others_exist(self):
        self.assertTrue(all('～' not in w['w'] and '〜' not in w['w']
                            for w in self.by_id['ja:敗']['words']))

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
