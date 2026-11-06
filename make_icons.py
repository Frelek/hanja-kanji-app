# -*- coding: utf-8 -*-
import os
from PIL import Image, ImageDraw, ImageFont

icons_dir = os.path.join(os.path.dirname(__file__), "icons")
os.makedirs(icons_dir, exist_ok=True)

def create_app_icon(size, out_path):
    img = Image.new("RGBA", (size, size), (15, 15, 26, 255))
    draw = ImageDraw.Draw(img)

    # Draw rounded squircle / background
    padding = int(size * 0.05)
    corner = int(size * 0.22)
    
    # Outer gradient effect using concentric rounded rectangles
    for step in range(padding):
        alpha = int(30 * (1 - step / padding))
        draw.rounded_rectangle(
            [step, step, size - step, size - step],
            radius=corner,
            outline=(233, 69, 96, alpha),
            width=1
        )

    # Inner badge background
    inner_box = [padding, padding, size - padding, size - padding]
    draw.rounded_rectangle(inner_box, radius=corner, fill=(26, 26, 46, 255), outline=(233, 69, 96, 180), width=int(size * 0.02))

    # Center circle accent
    circle_pad = int(size * 0.16)
    draw.ellipse([circle_pad, circle_pad, size - circle_pad, size - circle_pad], fill=(22, 33, 62, 255), outline=(233, 69, 96, 100), width=int(size * 0.015))

    # Try to load a nice font for the Hanja '漢'
    font = None
    font_size = int(size * 0.52)
    font_candidates = [
        "C:\\Windows\\Fonts\\batang.ttc",
        "C:\\Windows\\Fonts\\gulim.ttc",
        "C:\\Windows\\Fonts\\malgun.ttf",
        "C:\\Windows\\Fonts\\msgothic.ttc",
        "C:\\Windows\\Fonts\\simsun.ttc",
        "C:\\Windows\\Fonts\\arial.ttf"
    ]
    for candidate in font_candidates:
        if os.path.exists(candidate):
            try:
                font = ImageFont.truetype(candidate, font_size)
                break
            except Exception:
                continue

    text = "漢"
    if font:
        # Measure text using bbox
        bbox = draw.textbbox((0, 0), text, font=font)
        text_w = bbox[2] - bbox[0]
        text_h = bbox[3] - bbox[1]
        x = (size - text_w) // 2 - bbox[0]
        y = (size - text_h) // 2 - bbox[1] - int(size * 0.02)
        
        # Shadow
        draw.text((x + 2, y + 4), text, font=font, fill=(0, 0, 0, 180))
        # Text
        draw.text((x, y), text, font=font, fill=(233, 69, 96, 255))
    else:
        # Fallback if font fails
        draw.text((size // 4, size // 4), text, fill=(233, 69, 96, 255))

    img.save(out_path, "PNG")
    print(f"Generated icon: {out_path} ({size}x{size})")

create_app_icon(192, os.path.join(icons_dir, "icon-192.png"))
create_app_icon(512, os.path.join(icons_dir, "icon-512.png"))
