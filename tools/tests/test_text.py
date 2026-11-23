import unittest

from hk.text import nfc, is_cjk, cp_hex


class TextTests(unittest.TestCase):
    def test_nfc_maps_compat_ideographs(self):
        self.assertEqual(nfc('\u91d1'), '\u91d1')
        self.assertEqual(nfc('\uf90a'), '\u91d1')
        self.assertEqual(nfc('\uf914'), '\u6a02')

    def test_cp_hex(self):
        self.assertEqual(cp_hex('\u4f11'), '4f11')
        self.assertEqual(cp_hex('\U0002696f'), '2696f')

    def test_is_cjk(self):
        self.assertTrue(is_cjk('\u5b78'))
        self.assertFalse(is_cjk('\ud559'))
        self.assertTrue(is_cjk('\U0002696f'))


if __name__ == '__main__':
    unittest.main()
