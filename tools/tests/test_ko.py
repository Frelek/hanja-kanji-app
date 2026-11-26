import json
import os
import re
import tempfile
import unittest

from hk.ko import (parse_hun_eum, LEVEL_MAP, KO_MATCH_VARIANTS, load_kengdic,
                   load_kengdic_hanja, select_4ii, pick_words_ko, char_meanings,
                   ko_study_order, build_ko)
from hk.text import is_cjk

SRC = os.path.join(os.path.dirname(__file__), '..', '..', 'sources')
NEEDED = ['hanja-grade.csv', 'kengdic.tsv', 'ids.txt', 'kanji.json',
          'animcjk-dictionaryKo.txt', 'animcjk-dictionaryZhHant.txt',
          'animcjk-dictionaryJa.txt']
HAVE_SOURCES = all(os.path.exists(os.path.join(SRC, f)) for f in NEEDED)
HANGUL_RANGES = ((0x1100, 0x11FF), (0x3130, 0x318F), (0xA960, 0xA97F),
                 (0xAC00, 0xD7AF), (0xD7B0, 0xD7FF))


def _hangul(c):
    return any(a <= ord(c) <= b for a, b in HANGUL_RANGES)


HEADER = 'id\tsurface\thanja\tgloss\tlevel\tcreated\tsource\n'


def _tsv(rows):
    fd, path = tempfile.mkstemp(suffix='.tsv')
    with os.fdopen(fd, 'w', encoding='utf-8', newline='') as f:
        f.write(HEADER)
        for i, (surface, hanja, gloss, lvl) in enumerate(rows, 1):
            f.write(f'{i}\t{surface}\t{hanja}\t{gloss}\t{lvl}\t2009-01-01T00:00:00Z\tx\n')
    return path


class HunEumTests(unittest.TestCase):
    def test_two_readings(self):
        self.assertEqual(parse_hun_eum("[[['쇠'], ['금']], [['성(姓)'], ['김']]]"),
                         [{'hun': '쇠', 'eum': '금'}, {'hun': '성(姓)', 'eum': '김'}])

    def test_three_readings(self):
        got = parse_hun_eum("[[['즐길'], ['락']], [['노래'], ['악']], [['좋아할'], ['요']]]")
        self.assertEqual(got[1], {'hun': '노래', 'eum': '악'})
        self.assertEqual(len(got), 3)

    def test_several_hun_for_one_eum_become_pairs_in_order(self):
        self.assertEqual(parse_hun_eum("[[['지날', '글'], ['경']]]"),
                         [{'hun': '지날', 'eum': '경'}, {'hun': '글', 'eum': '경'}])

    def test_nfc(self):
        decomposed = '\u1100\u1173\u11b7'     # 금 as conjoining jamo
        self.assertEqual(parse_hun_eum(f"[[['쇠'], ['{decomposed}']]]"),
                         [{'hun': '쇠', 'eum': '금'}])


class TableTests(unittest.TestCase):
    def test_level_map(self):
        self.assertEqual(LEVEL_MAP, {
            '8급': ('8급', None), '7급Ⅱ': ('7급', '7급Ⅱ'), '7급': ('7급', None),
            '6급Ⅱ': ('6급', '6급Ⅱ'), '6급': ('6급', None), '5급Ⅱ': ('5급', '5급Ⅱ'),
            '5급': ('5급', None), '4급Ⅱ': ('4급Ⅱ', None)})

    def test_match_variants(self):
        self.assertEqual(KO_MATCH_VARIANTS, {'强': '強', '畵': '畫'})


class KengdicTests(unittest.TestCase):
    def setUp(self):
        self.paths = []

    def tearDown(self):
        for p in self.paths:
            os.remove(p)

    def load(self, rows):
        path = _tsv(rows)
        self.paths.append(path)
        return load_kengdic(path)

    def test_filters(self):
        got = self.load([
            ('전원의  행진', '', 'promenade', ''),        # no hanja
            ('ㄷ字관', 'ㄷ字관', 'x', ''),                 # mixed script
            ('학교', '學校', 'School', 'A'),
            ('10월', '十月', 'October', ''),             # length differs from surface
            ('4중주', '四重奏', 'quartet', ''),          # surface not all hangul
            ('산', '山', 'mountain', 'A'),               # single hanja
            ('학생', '學生', '', 'A'),                    # empty gloss
            ('학생', '學生', '  ', 'A'),                  # blank gloss
        ])
        self.assertEqual(got, [{'w': '學校', 'hangul': '학교', 'en': 'School', 'lvl': 'A'}])

    def test_first_sense_variants_and_nfc(self):
        got = self.load([
            ('강국', '强國', 'powerful nation; great power', 'B'),
            ('금고', '\uf90a庫', ' safe, strongbox ', 'C'),    # U+F90A compat 金
            ('화가', '畵家', 'painter', ''),
            ('축복', '祝福', '"bless you!"; x', 'D'),
        ])
        self.assertEqual(got, [
            {'w': '強國', 'hangul': '강국', 'en': 'powerful nation', 'lvl': 'B'},
            {'w': '金庫', 'hangul': '금고', 'en': 'safe, strongbox', 'lvl': 'C'},
            {'w': '畫家', 'hangul': '화가', 'en': 'painter', 'lvl': ''},
            {'w': '祝福', 'hangul': '축복', 'en': '"bless you!"', 'lvl': 'D'},
        ])

    def test_whitespace_collapsed_and_trimmed(self):   # R18 (a)
        got = self.load([
            ('교회', '敎會', 'Preach or  moral instruction', ''),
            ('국민', '國民', '  The people\u00a0or \u3000 a nationality ; x', 'A'),
        ])
        self.assertEqual([e['en'] for e in got],
                         ['Preach or moral instruction', 'The people or a nationality'])

    def test_gloss_with_hangul_or_cjk_dropped(self):    # R18 (b)
        got = self.load([
            ('수동', '樹洞', '큰 나무의 밑동이 패어 생긴 굴', ''),
            ('시각', '視角', 'angle/point of view.  관점.', ''),
            ('동반', '東班', 'a kind of 兩班', ''),
            ('삼촌', '三寸', 'An uncle; (외삼촌 a brother of the wife)', 'A'),   # later sense
            ('관동', '關東', 'an area of \u1100\u1161ngwon', ''),          # conjoining jamo
            ('학교', '學校', 'School', 'A'),
        ])
        self.assertEqual([e['w'] for e in got], ['學校'])

    def test_selection_counts_rows_whatever_their_gloss(self):   # R19
        path = _tsv([
            ('강국', '强國', '', ''),                            # empty gloss
            ('국가', '國家', '나라', ''),                        # hangul gloss
            ('국어', '國語', 'Korean language; 한국어', 'A'),    # hangul in a later sense
            ('가정', '家庭', 'home', 'A'),
            ('정원', '庭園', 'garden', 'B'),
            ('4중주', '四重奏', 'quartet', ''),                  # surface not all hangul
            ('10월', '十月', 'October', ''),                     # length differs
            ('산', '山', '', ''),                                # single hanja
        ])
        self.paths.append(path)
        counted = load_kengdic_hanja(path)
        self.assertEqual(counted, [{'w': '強國', 'hangul': '강국'},
                                   {'w': '國家', 'hangul': '국가'},
                                   {'w': '國語', 'hangul': '국어'},
                                   {'w': '家庭', 'hangul': '가정'},
                                   {'w': '庭園', 'hangul': '정원'}])
        self.assertEqual(select_4ii(['國', '庭'], counted, n=1), ['國'])
        # the gloss-cleaned list (used for picking words) would say the opposite
        self.assertEqual(select_4ii(['國', '庭'], load_kengdic(path), n=1), ['庭'])


class Select4iiTests(unittest.TestCase):
    def test_count_desc_then_code_point(self):
        words = [{'w': '甲乙'}, {'w': '甲丙'}, {'w': '丙乙'}, {'w': '甲丁'}]
        self.assertEqual(select_4ii(['甲', '乙', '丙'], words, n=2), ['甲', '丙'])

    def test_default_n_and_zero_counts(self):
        chars = [chr(0x4E00 + i) for i in range(120)]
        got = select_4ii(chars, [{'w': chars[119] + chars[0]}])
        self.assertEqual(len(got), 110)
        self.assertEqual(got[:2], [chars[0], chars[119]])
        self.assertEqual(got[2:], chars[1:109])


class PickWordsTests(unittest.TestCase):
    RANK = {'休': 1, '日': 0, '學': 0, '息': 3, '公': 2}

    def w(self, w, lvl, en='x'):
        return {'w': w, 'hangul': 'h' + w, 'en': en, 'lvl': lvl}

    def test_tiers_and_cap(self):
        words = [self.w('休學', 'C'),        # T2: level C
                 self.w('休日', 'B', 'holiday'),  # T1
                 self.w('休息', 'A'),        # T2: 息 is a later level
                 self.w('休憩', 'A'),        # T3: 憩 outside the set
                 self.w('公休日', ''),       # T2
                 self.w('日本', 'A')]        # no 休
        got = pick_words_ko('休', self.RANK, words)
        self.assertEqual([x['w'] for x in got], ['休日', '休息', '休學'])
        self.assertEqual(got[0], {'w': '休日', 'hangul': 'h休日', 'en': 'holiday'})

    def test_tier3_at_most_one_outside(self):
        words = [self.w('休憩所', 'A'), self.w('休憩', 'C'), self.w('休暇', 'B')]
        got = pick_words_ko('休', self.RANK, words)
        self.assertEqual([x['w'] for x in got], ['休暇', '休憩'])

    def test_rank_lvl_then_shorter_then_file_order(self):
        words = [self.w('公休日', 'A'), self.w('休息', 'D'), self.w('休學', 'A'),
                 self.w('休日休', 'A'), self.w('學休', 'A')]
        # T1 needs rank <= 1: 休學, 休日休 and 學休 qualify (A); the rest are T2
        got = pick_words_ko('休', self.RANK, words)
        self.assertEqual([x['w'] for x in got], ['休學', '學休', '休日休'])
        got = pick_words_ko('休', self.RANK, [words[1], words[0]])
        self.assertEqual([x['w'] for x in got], ['公休日', '休息'])

    def test_duplicate_word_listed_once(self):
        words = [self.w('休日', 'C', 'day off'), self.w('休日', 'A', 'holiday')]
        self.assertEqual(pick_words_ko('休', self.RANK, words),
                         [{'w': '休日', 'hangul': 'h休日', 'en': 'holiday'}])


class CharMeaningTests(unittest.TestCase):
    KO = {'金': {'definition': 'gold; metals in general; money; Kangxi radical 167'},
          '學': {'definition': 'learning, knowledge; school'},
          '丿': {'definition': 'Kangxi radical 4'}}
    ZH = {'禁': {'definition': 'restrict, prohibit, forbid'},
          '丿': {'definition': 'line'},
          '羌': {'definition': '(variant of 羊), sheep, (same as 牂) ewe; goat'},
          '丷': {'definition': 'component (for example, 兑); eight'}}
    JA = {'端': {'definition': 'end, extreme; head; beginning'}}

    def m(self, ch):
        return char_meanings(ch, self.KO, self.ZH, self.JA)

    def test_split_title_case_first_three(self):
        self.assertEqual(self.m('金'), ['Gold', 'Metals In General', 'Money'])
        self.assertEqual(self.m('學'), ['Learning', 'Knowledge', 'School'])

    def test_fallback_order(self):
        self.assertEqual(self.m('禁'), ['Restrict', 'Prohibit', 'Forbid'])
        self.assertEqual(self.m('丿'), ['Line'])           # Ko has only a radical label
        self.assertEqual(self.m('端'), ['End', 'Extreme', 'Head'])
        self.assertEqual(self.m('無'), [])

    def test_repeated_senses_dropped_ignoring_case(self):       # 逆 "Disobey, Rebel, Rebel"
        ko = {'逆': {'definition': 'disobey, rebel; rebel, traitor; reverse'},
              '反': {'definition': 'Return; return, Reverse'}}
        self.assertEqual(char_meanings('逆', ko), ['Disobey', 'Rebel', 'Traitor'])
        self.assertEqual(char_meanings('反', ko), ['Return', 'Reverse'])

    def test_cross_references_and_parentheses(self):
        self.assertEqual(self.m('羌'), ['Sheep', 'Ewe', 'Goat'])
        self.assertEqual(self.m('丷'), ['Component (for Example, 兑)', 'Eight'])


class StudyOrderTests(unittest.TestCase):
    def test_levels_sublevels_words_and_parents(self):
        chars = ['甲', '乙', '丙', '丁', '戊', '己']
        level = {'甲': '8급', '乙': '7급', '丙': '7급', '丁': '7급', '戊': '8급',
                 '己': '4급Ⅱ'}
        sub = {'甲': None, '乙': '7급Ⅱ', '丙': None, '丁': '7급Ⅱ', '戊': None,
               '己': None}
        required = {c: [] for c in chars}
        required['乙'] = ['丙', '甲']           # 丙 is 7급 (later sub-level), 甲 is 8급
        # 丙 has more words than 丁, but 丁 is in the Ⅱ sub-level
        count = {'甲': 1, '戊': 5, '乙': 10, '丙': 3, '丁': 2, '己': 99}
        self.assertEqual(ko_study_order(chars, level, sub, required, count),
                         ['戊', '甲', '丁', '丙', '乙', '己'])

    def test_cycle_rejected(self):
        level = {'甲': '8급', '乙': '8급'}
        sub = {'甲': None, '乙': None}
        with self.assertRaises(ValueError):
            ko_study_order(['甲', '乙'], level, sub, {'甲': ['乙'], '乙': ['甲']},
                           {'甲': 0, '乙': 0})


@unittest.skipUnless(HAVE_SOURCES, 'sources/ absent')
class FullBuildTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.data = build_ko(SRC)
        cls.by_id = {r['id']: r for r in cls.data['chars']}

    def test_counts(self):
        self.assertEqual(self.data['lang'], 'ko')
        self.assertEqual(self.data['levels'], [
            {'id': '8급', 'count': 50}, {'id': '7급', 'count': 100},
            {'id': '6급', 'count': 150}, {'id': '5급', 'count': 200},
            {'id': '4급Ⅱ', 'count': 110}])
        self.assertEqual(len(self.data['chars']), 610)
        ids = [r['id'] for r in self.data['chars']]
        self.assertEqual(len(ids), len(set(ids)))

    def test_matches_animcjk_hanja_sets(self):
        sets = {}
        with open(os.path.join(SRC, 'animcjk-dictionaryKo.txt'), encoding='utf-8') as f:
            for line in f:
                if line.strip():
                    d = json.loads(line)
                    for s in d['set']:
                        sets.setdefault(s, set()).add(d['character'])
        got = {lv: {r['char'] for r in self.data['chars'] if r['level'] == lv}
               for lv in ('8급', '7급', '6급', '5급')}
        for n in (8, 7, 6, 5):
            self.assertEqual(got[f'{n}급'], sets[f'hanja{n}'], n)
        self.assertEqual(len(set().union(*got.values())), 500)

    def test_no_compatibility_ideographs(self):
        text = json.dumps(self.data, ensure_ascii=False)
        self.assertFalse([c for c in text if 0xF900 <= ord(c) <= 0xFAFF])

    def test_kim(self):
        self.assertEqual(self.by_id['ko:金']['hunEum'],
                         [{'hun': '쇠', 'eum': '금'}, {'hun': '성(姓)', 'eum': '김'}])

    def test_record_fields(self):
        keys = ['id', 'char', 'level', 'sublevel', 'order', 'strokes', 'meanings',
                'hunEum', 'parts', 'parents', 'required', 'primaryParent', 'words']
        for r in self.data['chars']:
            self.assertEqual(list(r), keys)
            self.assertTrue(r['hunEum'])
        r = self.by_id['ko:休']
        self.assertEqual(r['hunEum'], [{'hun': '쉴', 'eum': '휴'}])
        self.assertEqual(r['required'], ['ko:人', 'ko:木'])
        self.assertEqual(r['parts'][0], {'char': '亻', 'meaning': 'Person', 'ref': 'ko:人'})
        self.assertEqual(r['meanings'], ['Rest', 'Stop', 'Retire'])
        self.assertEqual(self.by_id['ko:車']['strokes'], 7)       # total_strokes

    def test_sublevels(self):
        self.assertEqual((self.by_id['ko:家']['level'], self.by_id['ko:家']['sublevel']),
                         ('7급', '7급Ⅱ'))
        self.assertEqual((self.by_id['ko:歌']['level'], self.by_id['ko:歌']['sublevel']),
                         ('7급', None))
        subs = {r['sublevel'] for r in self.data['chars']}
        self.assertEqual(subs, {None, '7급Ⅱ', '6급Ⅱ', '5급Ⅱ'})

    def test_meanings_cleaned(self):
        for r in self.data['chars']:
            self.assertTrue(r['meanings'], r['char'])
            self.assertLessEqual(len(r['meanings']), 3)
            for m in r['meanings']:
                self.assertNotRegex(m, re.compile('radical', re.I))
                self.assertEqual(m.count('('), m.count(')'), (r['char'], m))
            folded = [m.casefold() for m in r['meanings']]
            self.assertEqual(len(folded), len(set(folded)), (r['char'], r['meanings']))
        self.assertEqual(self.by_id['ko:金']['meanings'], ['Gold', 'Metals In General', 'Money'])
        self.assertEqual(self.by_id['ko:逆']['meanings'], ['Disobey', 'Rebel', 'Traitor'])

    def test_words_valid(self):
        for r in self.data['chars']:
            self.assertLessEqual(len(r['words']), 3)
            for w in r['words']:
                self.assertEqual(list(w), ['w', 'hangul', 'en'])
                self.assertIn(r['char'], w['w'])
                self.assertTrue(w['en'])
                self.assertEqual(w['en'], ' '.join(w['en'].split()))
                self.assertFalse([c for c in w['en'] if is_cjk(c) or _hangul(c)], w)
                self.assertEqual(len(w['w']), len(w['hangul']))
        self.assertIn({'w': '學校', 'hangul': '학교', 'en': 'School'},
                      self.by_id['ko:學']['words'] + self.by_id['ko:校']['words'])

    def test_4ii_selection_ignores_gloss_quality(self):          # R19
        four = {r['char'] for r in self.data['chars'] if r['level'] == '4급Ⅱ'}
        self.assertTrue({'婦', '肉', '端'} <= four)
        self.assertNotIn('砲', four)

    def test_match_variants_put_char_in_its_words(self):
        self.assertTrue(self.by_id['ko:強']['words'])
        self.assertTrue(self.by_id['ko:畫']['words'])

    def test_order_levels_then_topological(self):
        chars = self.data['chars']
        self.assertEqual([r['order'] for r in chars], list(range(610)))
        rank = {'8급': 0, '7급': 1, '6급': 2, '5급': 3, '4급Ⅱ': 4}
        lv = [rank[r['level']] for r in chars]
        self.assertEqual(lv, sorted(lv))
        for r in chars:
            self.assertTrue(set(r['required']) <= set(r['parents']))
            for p in r['parents']:
                self.assertIn(p, self.by_id)
            for p in r['required']:
                self.assertLess(self.by_id[p]['order'], r['order'])
                self.assertLessEqual(rank[self.by_id[p]['level']], rank[r['level']])
            for p in set(r['parents']) - set(r['required']):
                self.assertGreater(rank[self.by_id[p]['level']], rank[r['level']])
            if r['primaryParent'] is not None:
                self.assertIn(r['primaryParent'], r['required'])
            else:
                self.assertEqual(r['required'], [])

    def test_parts_dict_covers_every_part(self):
        used = {p['char'] for r in self.data['chars'] for p in r['parts']}
        self.assertEqual(set(self.data['parts']), used)
        for r in self.data['chars']:
            for p in r['parts']:
                self.assertEqual(p['meaning'], self.data['parts'][p['char']])
                if p['ref'] is not None:
                    self.assertIn(p['ref'], self.by_id)

    def test_deterministic(self):
        self.assertEqual(build_ko(SRC), self.data)


if __name__ == '__main__':
    unittest.main()
