"""Draw the CapyCards app icons: the capybara mascot (with a yuzu) on paper.

    python tools/make_icons.py

Needs Pillow. The shapes match src/ui/Mascot.js (a 64-unit box).
The maskable icon keeps the mascot inside the central 80% so any OS mask keeps it.
"""
from pathlib import Path

from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "assets" / "icons"
PAPER = "#f6f1e7"
INK = "#1f1b17"
FUR = "#a9784a"
EAR = "#8a5e37"
SNOUT = "#7d5534"
YUZU = "#e8a13a"
LEAF = "#5f8a4e"


def draw(size: int, fill: float) -> Image.Image:
    """Square icon; the 64-unit mascot box is `fill` of the side, centred."""
    scale = 4  # draw big, then downsample for clean edges
    big = size * scale
    img = Image.new("RGB", (big, big), PAPER)
    d = ImageDraw.Draw(img)
    u = big * fill / 56  # the drawing spans about x 5..59, y 6..58
    ox = (big - 54 * u) / 2 - 5 * u
    oy = (big - 52 * u) / 2 - 6 * u

    def p(x, y):
        return (ox + x * u, oy + y * u)

    def circle(cx, cy, r, color, w=2.5):
        d.ellipse([p(cx - r, cy - r), p(cx + r, cy + r)], fill=color, outline=INK, width=max(1, round(w * u)))

    def rrect(x, y, w, h, r, color, lw=2.5):
        d.rounded_rectangle([p(x, y), p(x + w, y + h)], radius=r * u, fill=color, outline=INK,
                            width=max(1, round(lw * u)))

    circle(18, 20, 4, EAR)
    circle(46, 20, 4, EAR)
    rrect(12, 19, 40, 38, 11, FUR)
    rrect(16, 38, 32, 16, 8, SNOUT, 2)
    circle(32, 14, 5.5, YUZU, 2)
    d.polygon([p(32, 8.5), p(36, 4.8), p(40, 6.5), p(37, 9)], fill=LEAF)
    for cx in (23, 41):
        d.ellipse([p(cx - 2.4, 30 - 2.4), p(cx + 2.4, 30 + 2.4)], fill=INK)
    for cx in (27, 37):
        d.ellipse([p(cx - 1.2, 44 - 2.2), p(cx + 1.2, 44 + 2.2)], fill=INK)
    return img.resize((size, size), Image.LANCZOS)


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    draw(192, 0.78).save(OUT / "icon-192.png", optimize=True)
    draw(512, 0.78).save(OUT / "icon-512.png", optimize=True)
    draw(180, 0.78).save(OUT / "apple-touch-icon.png", optimize=True)
    # Maskable safe zone: the central 80% of the side.
    draw(512, 0.62).save(OUT / "icon-maskable-512.png", optimize=True)
    print("wrote", ", ".join(sorted(p.name for p in OUT.glob("*.png"))))


if __name__ == "__main__":
    main()
