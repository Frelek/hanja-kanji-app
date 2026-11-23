import os
import unittest

from hk.decompose import (VARIANTS, load_ids, direct_parts, components,
                          find_parents, pick_primary, drop_deep_single_strokes)

IDS = {'休': '⿰亻木', '森': '⿱木林', '林': '⿰木木', '學': '⿱𦥯子',
       '𦥯': '⿰臼爻', '河': '⿰氵可', '東': '東'}
IDS_FILE = os.path.join(os.path.dirname(__file__), '..', '..', 'sources', 'ids.txt')


class DecomposeTests(unittest.TestCase):
    def test_variants_table(self):
        self.assertEqual(VARIANTS['亻'], '人')
        self.assertEqual(VARIANTS['⻌'], '辵')
        for absent in '月阝王':
            self.assertNotIn(absent, VARIANTS)

    def test_variant_links_to_base(self):
        self.assertEqual(find_parents('休', IDS, {'人', '木', '休'}), ['人', '木'])
        self.assertEqual(find_parents('河', IDS, {'水', '河'}), ['水'])

    def test_maximal_only(self):
        self.assertEqual(find_parents('森', IDS, {'木', '林', '森'}), ['林'])

    def test_nested_component(self):
        self.assertEqual(find_parents('學', IDS, {'子', '學'}), ['子'])

    def test_atomic_gives_no_guess(self):
        self.assertEqual(find_parents('東', IDS, {'木', '日', '東'}), [])
        self.assertEqual(components('東', IDS), frozenset())

    def test_direct_parts(self):
        self.assertEqual(direct_parts('河', IDS), ['氵', '可'])

    def test_components_recursive_and_cycle_safe(self):
        self.assertEqual(components('學', IDS), frozenset('𦥯子臼爻'))
        cyc = {'甲': '⿰乙一', '乙': '⿰甲一'}
        self.assertNotIn('甲', components('甲', cyc))
        components('乙', cyc)

    def test_pick_primary(self):
        self.assertEqual(pick_primary(['人', '木'], {'人': 2, '木': 4}, None), '木')
        self.assertEqual(pick_primary(['人', '木'], {'人': 4, '木': 4}, '人'), '人')
        self.assertEqual(pick_primary(['人', '木'], {'人': 4, '木': 4}, None), '人')
        self.assertIsNone(pick_primary([], {}, None))

    def test_drop_deep_single_strokes(self):
        ids = {'二': '⿱一一', '百': '⿱一白', '気': '⿱气㐅', '气': '⿱𠂉⿱一乁',
               '休': '⿰亻木', '体': '⿰亻本', '本': '⿻木一'}
        strokes = {'一': 1, '人': 2, '木': 4, '白': 5}
        self.assertEqual(drop_deep_single_strokes('二', ['一'], ids, strokes), ['一'])
        self.assertEqual(drop_deep_single_strokes('百', ['一', '白'], ids, strokes),
                         ['一', '白'])
        self.assertEqual(drop_deep_single_strokes('気', ['一'], ids, strokes), [])
        # multi-stroke parents are kept even when deep; unknown strokes are kept
        self.assertEqual(drop_deep_single_strokes('体', ['一', '人', '木'], ids, strokes),
                         ['人', '木'])
        self.assertEqual(drop_deep_single_strokes('気', ['乁'], ids, strokes), ['乁'])

    @unittest.skipUnless(os.path.exists(IDS_FILE), 'sources/ids.txt absent')
    def test_real_file_regions(self):
        self.assertEqual(load_ids(IDS_FILE, 'J')['与'], '⿻②一')
        self.assertEqual(load_ids(IDS_FILE, 'K')['与'], '⿹②一')


if __name__ == '__main__':
    unittest.main()
