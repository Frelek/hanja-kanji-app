"""Stroke-order files: animCJK medians only, one JSON file per character."""
import json
import os

from hk.text import cp_hex


def load_graphics(path):
    """animCJK graphics*.txt (JSON lines) -> {char: medians}."""
    out = {}
    with open(path, encoding='utf-8') as f:
        for line in f:
            if line.strip():
                d = json.loads(line)
                out.setdefault(d['character'], d['medians'])
    return out


def write_strokes(chars, sources, out_dir):
    """Write out_dir/<cp_hex>.json = {"m": medians} from the first source that
    has the char. Returns the chars no source had."""
    os.makedirs(out_dir, exist_ok=True)
    missing = []
    for ch in chars:
        medians = next((s[ch] for s in sources if ch in s), None)
        if medians is None:
            missing.append(ch)
            continue
        text = json.dumps({'m': medians}, ensure_ascii=False,
                          separators=(',', ':'))
        with open(os.path.join(out_dir, cp_hex(ch) + '.json'), 'w',
                  encoding='utf-8', newline='\n') as f:
            f.write(text)
    return missing
