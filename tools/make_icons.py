"""Draw the app icons: the character 字 in Klee One, ink on paper.

    python tools/make_icons.py

Needs sources/KleeOne-SemiBold.ttf (run tools/fetch_sources.py) and Pillow.
The maskable icon keeps the glyph inside the central 80% so any OS mask keeps it.
"""
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parent.parent
FONT = ROOT / "sources" / "KleeOne-SemiBold.ttf"
OUT = ROOT / "assets" / "icons"
PAPER = "#f6f1e7"
INK = "#1f1b17"
GLYPH = "字"


def draw(size: int, fill: float) -> Image.Image:
    """Square icon whose glyph's ink box is `fill` of the side, centred on the ink."""
    scale = 4  # draw big, then downsample for clean edges
    big = size * scale
    img = Image.new("RGB", (big, big), PAPER)
    d = ImageDraw.Draw(img)
    px = int(big * fill)
    font = ImageFont.truetype(str(FONT), px)
    l, t, r, b = d.textbbox((0, 0), GLYPH, font=font)
    # Scale so the larger ink side equals the target, then centre on the ink box.
    target = big * fill
    k = target / max(r - l, b - t)
    font = ImageFont.truetype(str(FONT), max(1, int(px * k)))
    l, t, r, b = d.textbbox((0, 0), GLYPH, font=font)
    x = (big - (r - l)) / 2 - l
    y = (big - (b - t)) / 2 - t
    d.text((x, y), GLYPH, font=font, fill=INK)
    return img.resize((size, size), Image.LANCZOS)


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    draw(192, 0.62).save(OUT / "icon-192.png", optimize=True)
    draw(512, 0.62).save(OUT / "icon-512.png", optimize=True)
    draw(180, 0.62).save(OUT / "apple-touch-icon.png", optimize=True)
    # Maskable safe zone: the central 80%. The glyph box is 0.62 of the side, well inside it.
    draw(512, 0.56).save(OUT / "icon-maskable-512.png", optimize=True)
    print("wrote", ", ".join(sorted(p.name for p in OUT.glob("*.png"))))


if __name__ == "__main__":
    main()
