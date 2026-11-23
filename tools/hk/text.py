"""Small text helpers shared by the data pipeline."""
import unicodedata


def nfc(s: str) -> str:
    """NFC-normalise (maps CJK compatibility ideographs to unified ones)."""
    return unicodedata.normalize('NFC', s)


def is_cjk(ch: str) -> bool:
    """True for a CJK ideograph in the ranges the app uses."""
    cp = ord(ch)
    return (0x3400 <= cp <= 0x4DBF or 0x4E00 <= cp <= 0x9FFF
            or 0xF900 <= cp <= 0xFAFF or 0x20000 <= cp <= 0x3FFFF)


def cp_hex(ch: str) -> str:
    """Lowercase hex code point without padding."""
    return format(ord(ch), 'x')
