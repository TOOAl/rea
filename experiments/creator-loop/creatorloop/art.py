"""Procedural art: scene frames and thumbnails rendered locally with Pillow.

This is the free substitute for a generated first frame (Runway/Veo style) and for
a thumbnail designer.  Everything is deterministic from a seed, so a re-render is
reproducible and consecutive videos only differ when the seed/brand/shot differ —
which the authenticity guard measures.
"""

from __future__ import annotations

import hashlib
import math
import random
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Sequence

from .contracts import CameraMove, Shot, ShotSize

FONT_CANDIDATES: dict[str, list[str]] = {
    "extrabold": [
        "/usr/local/lib/python3.11/dist-packages/koreanize_matplotlib/fonts/NanumGothicExtraBold.ttf",
        "/usr/lib/python3/dist-packages/koreanize_matplotlib/fonts/NanumGothicExtraBold.ttf",
        "/usr/share/fonts/truetype/nanum/NanumGothicBold.ttf",
        "/System/Library/Fonts/AppleSDGothicNeo.ttc",
        "C:/Windows/Fonts/malgunbd.ttf",
    ],
    "bold": [
        "/usr/local/lib/python3.11/dist-packages/koreanize_matplotlib/fonts/NanumGothicBold.ttf",
        "/usr/lib/python3/dist-packages/koreanize_matplotlib/fonts/NanumGothicBold.ttf",
        "/usr/share/fonts/truetype/nanum/NanumGothic.ttf",
        "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
    ],
    "regular": [
        "/usr/local/lib/python3.11/dist-packages/koreanize_matplotlib/fonts/NanumGothic.ttf",
        "/usr/lib/python3/dist-packages/koreanize_matplotlib/fonts/NanumGothic.ttf",
        "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
    ],
}

DEFAULT_BRAND: dict[str, Any] = {
    "name": "default",
    "width": 1920,
    "height": 1080,
    "palette": ["#0B1220", "#123A6B", "#F2C14E", "#E4572E", "#F5F7FA"],
    "accent": "#F2C14E",
    "text": "#F5F7FA",
    "caption_bar": "#0B1220",
    "grain": 6,
    "vignette": 0.35,
    "margin": 110,
    "watermark": "",
}

MOOD_PALETTES: dict[str, list[str]] = {
    "calm": ["#0B1220", "#1B3A57", "#7FA8C9", "#E8EEF4"],
    "urgent": ["#170B0B", "#6B1414", "#E4572E", "#F2C14E"],
    "hopeful": ["#07231B", "#12604A", "#4FB286", "#F5F7FA"],
    "analytical": ["#0A0F1E", "#20305A", "#4E79C7", "#DDE7F5"],
    "warm": ["#1A0F07", "#6B3A12", "#D98E32", "#F7E9D5"],
    "serious": ["#0C0C0E", "#2B2B31", "#6E6E78", "#EDEDF2"],
}


def _hash_seed(*parts: str) -> int:
    digest = hashlib.sha256("|".join(parts).encode("utf-8")).hexdigest()
    return int(digest[:12], 16)


def _rng(*parts: str) -> random.Random:
    return random.Random(_hash_seed(*parts))


def fonts_available() -> tuple[bool, str]:
    for style, candidates in FONT_CANDIDATES.items():
        if not any(Path(candidate).exists() for candidate in candidates):
            return False, f"no font found for style '{style}'"
    return True, ""


def font(style: str, size: int) -> Any:
    from PIL import ImageFont

    for candidate in FONT_CANDIDATES.get(style, FONT_CANDIDATES["regular"]):
        if Path(candidate).exists():
            return ImageFont.truetype(candidate, size)
    return ImageFont.load_default(size)


def hangul_font_ok() -> bool:
    """True when the resolved bold font actually contains Hangul glyphs."""

    try:
        face = font("extrabold", 40)
    except Exception:
        return False
    return bool(face.getmask("가").getbbox())


def palette_for(shot: Shot, brand: dict[str, Any], seed_text: str) -> list[str]:
    if shot.palette:
        return list(shot.palette)
    mood = (shot.mood or "").lower()
    if mood in MOOD_PALETTES:
        return MOOD_PALETTES[mood]
    options = [brand.get("palette", DEFAULT_BRAND["palette"]), *MOOD_PALETTES.values()]
    return list(options[_hash_seed(seed_text, shot.id) % len(options)])


def _hex_to_rgb(value: str) -> tuple[int, int, int]:
    text = value.lstrip("#")
    if len(text) == 3:
        text = "".join(ch * 2 for ch in text)
    return (int(text[0:2], 16), int(text[2:4], 16), int(text[4:6], 16))


def _gradient(size: tuple[int, int], colors: Sequence[str], angle_deg: float = 135.0) -> Any:
    import numpy as np
    from PIL import Image

    width, height = size
    stops = [_hex_to_rgb(c) for c in colors] or [(10, 14, 24)]
    if len(stops) == 1:
        stops = stops * 2
    theta = math.radians(angle_deg)
    xs = np.linspace(0, 1, width)[None, :]
    ys = np.linspace(0, 1, height)[:, None]
    ramp = np.clip((xs * math.cos(theta) + ys * math.sin(theta)), 0, 1)
    ramp = (ramp - ramp.min()) / max(float(ramp.max() - ramp.min()), 1e-6)
    positions = np.linspace(0, 1, len(stops))
    array = np.zeros((height, width, 3), dtype=np.float32)
    for channel in range(3):
        values = np.array([stop[channel] for stop in stops], dtype=np.float32)
        array[:, :, channel] = np.interp(ramp, positions, values)
    return Image.fromarray(array.astype("uint8"), "RGB")


def _noise(size: tuple[int, int], amount: int, seed: int) -> Any:
    import numpy as np
    from PIL import Image

    if amount <= 0:
        return None
    generator = np.random.default_rng(seed)
    data = generator.integers(-amount, amount + 1, size=(size[1], size[0], 3), dtype=np.int16)
    return Image.fromarray(((data + 128).clip(0, 255)).astype("uint8"), "RGB")


def _vignette(size: tuple[int, int], strength: float) -> Any:
    import numpy as np
    from PIL import Image

    if strength <= 0:
        return None
    width, height = size
    ys, xs = np.mgrid[0:height, 0:width]
    cx, cy = width / 2, height / 2
    distance = np.sqrt(((xs - cx) / cx) ** 2 + ((ys - cy) / cy) ** 2) / math.sqrt(2)
    alpha = np.clip((distance - 0.45) / 0.55, 0, 1) * strength
    layer = np.zeros((height, width, 4), dtype=np.uint8)
    layer[:, :, 3] = (alpha * 255).astype(np.uint8)
    return Image.fromarray(layer, "RGBA")


def _wrap_text(text: str, face: Any, max_width: int) -> list[str]:
    lines: list[str] = []
    for paragraph in text.split("\n"):
        current = ""
        for word in paragraph.split(" "):
            candidate = f"{current} {word}".strip()
            if face.getlength(candidate) <= max_width or not current:
                current = candidate
            else:
                lines.append(current)
                current = word
        if current:
            lines.append(current)
    return lines


def _motif(draw: Any, image: Any, shot: Shot, colors: list[str], rng: random.Random, size: tuple[int, int]) -> None:
    """Abstract focal geometry chosen by shot size and asset kind."""

    from PIL import Image, ImageDraw, ImageFilter

    width, height = size
    accent = colors[min(2, len(colors) - 1)]
    kind = shot.asset_kind
    if kind in ("screen_recording",) or "chart" in shot.prompt.lower() or "데이터" in shot.prompt:
        motif = "bars"
    elif shot.size in (ShotSize.ECU, ShotSize.CU):
        motif = "orb"
    elif shot.size in (ShotSize.LS, ShotSize.ELS):
        motif = "horizon"
    elif shot.move in (CameraMove.ORBIT_LEFT, CameraMove.ORBIT_RIGHT, CameraMove.DOLLY_ZOOM):
        motif = "rings"
    elif "grid" in shot.prompt.lower() or "표" in shot.prompt or "checklist" in shot.prompt.lower():
        motif = "grid"
    else:
        motif = rng.choice(["orb", "arcs", "horizon", "grid", "rings"])

    overlay = Image.new("RGBA", (width, height), (0, 0, 0, 0))
    pen = ImageDraw.Draw(overlay)
    rgb = _hex_to_rgb(accent)

    if motif == "orb":
        for index in range(4):
            radius = int(width * (0.18 + 0.09 * index))
            center = (int(width * rng.uniform(0.32, 0.68)), int(height * rng.uniform(0.35, 0.62)))
            alpha = int(70 - 12 * index)
            pen.ellipse(
                [center[0] - radius, center[1] - radius, center[0] + radius, center[1] + radius],
                fill=(*rgb, max(alpha, 8)),
            )
        overlay = overlay.filter(ImageFilter.GaussianBlur(width // 40))
    elif motif == "bars":
        count = 7
        gap = width // (count * 2)
        for index in range(count):
            height_ratio = rng.uniform(0.25, 0.9)
            top = int(height * (1 - height_ratio) * 0.85 + height * 0.1)
            left = gap + index * gap * 2
            pen.rounded_rectangle([left, top, left + gap, int(height * 0.86)], radius=gap // 4, fill=(*rgb, 150))
        overlay = overlay.filter(ImageFilter.GaussianBlur(2))
    elif motif == "horizon":
        horizon = int(height * rng.uniform(0.55, 0.72))
        pen.rectangle([0, horizon, width, height], fill=(*rgb, 90))
        for index in range(6):
            offset = int((height - horizon) * (index / 6) ** 1.6)
            pen.line([(0, horizon + offset), (width, horizon + offset)], fill=(*rgb, 40 + index * 12), width=2)
        sun = int(width * rng.uniform(0.2, 0.8))
        pen.ellipse([sun - 90, horizon - 180, sun + 90, horizon], fill=(*_hex_to_rgb(colors[-1]), 120))
        overlay = overlay.filter(ImageFilter.GaussianBlur(3))
    elif motif == "rings":
        center = (width // 2, int(height * 0.52))
        for index in range(7):
            radius = int(width * (0.1 + 0.06 * index))
            pen.ellipse(
                [center[0] - radius, center[1] - radius * 0.62, center[0] + radius, center[1] + radius * 0.62],
                outline=(*rgb, 120 - index * 12),
                width=3,
            )
    elif motif == "grid":
        step = width // 14
        for x in range(0, width, step):
            pen.line([(x, 0), (x, height)], fill=(*rgb, 26), width=1)
        for y in range(0, height, step):
            pen.line([(0, y), (width, y)], fill=(*rgb, 26), width=1)
        for _ in range(5):
            cell = (rng.randrange(0, 14) * step, rng.randrange(0, int(height / step)) * step)
            pen.rectangle([cell[0], cell[1], cell[0] + step, cell[1] + step], fill=(*rgb, 70))
    else:  # arcs
        for index in range(5):
            radius = int(width * (0.25 + 0.12 * index))
            start = rng.uniform(0, 360)
            pen.arc(
                [width // 2 - radius, height // 2 - radius, width // 2 + radius, height // 2 + radius],
                start=start,
                end=start + rng.uniform(60, 200),
                fill=(*rgb, 110),
                width=6,
            )
        overlay = overlay.filter(ImageFilter.GaussianBlur(1.5))

    image.paste(overlay, (0, 0), overlay)
    _ = draw  # kept for signature symmetry with future vector motifs


def render_scene_art(
    shot: Shot,
    path: Path | str,
    *,
    brand: dict[str, Any] | None = None,
    seed_text: str = "",
    index: int = 0,
    size: tuple[int, int] | None = None,
) -> Path:
    """Render one still frame for a shot (used as first frame / b-roll plate)."""

    from PIL import Image, ImageDraw, ImageFilter

    brand = {**DEFAULT_BRAND, **(brand or {})}
    target = size or (int(brand["width"]), int(brand["height"]))
    rng = _rng(seed_text, shot.id, str(index))
    colors = palette_for(shot, brand, seed_text)
    image = _gradient(target, colors, angle_deg=rng.uniform(90, 200)).convert("RGBA")
    draw = ImageDraw.Draw(image)
    _motif(draw, image, shot, colors, rng, target)

    width, height = target
    margin = int(brand["margin"])

    if shot.on_screen_text:
        text = shot.on_screen_text
        face_size = int(height * (0.10 if len(text) <= 12 else 0.072))
        face = font("extrabold", face_size)
        lines = _wrap_text(text, face, width - margin * 2)
        block_height = sum(face.getbbox(line)[3] - face.getbbox(line)[1] + int(face_size * 0.22) for line in lines)
        y = int(height * 0.18) if shot.size in (ShotSize.CU, ShotSize.ECU) else int((height - block_height) / 2)
        for line in lines:
            line_width = face.getlength(line)
            x = int((width - line_width) / 2)
            pad = int(face_size * 0.22)
            draw.rounded_rectangle(
                [x - pad, y - pad // 2, x + line_width + pad, y + face_size + pad],
                radius=pad // 2,
                fill=(*_hex_to_rgb(brand["caption_bar"]), 170),
            )
            draw.text((x + 3, y + 4), line, font=face, fill=(0, 0, 0, 190))
            draw.text((x, y), line, font=face, fill=_hex_to_rgb(brand["accent"]))
            y += int(face_size * 1.22)

    accent = _hex_to_rgb(brand["accent"])
    draw.rectangle([margin, height - margin - 10, margin + int(width * 0.14), height - margin], fill=(*accent, 220))
    if brand.get("watermark"):
        face = font("bold", int(height * 0.028))
        draw.text((width - margin - face.getlength(brand["watermark"]), margin // 2), brand["watermark"], font=face, fill=(*_hex_to_rgb(brand["text"]), 170))

    noise = _noise(target, int(brand.get("grain", 6)), _hash_seed(seed_text, shot.id, "grain"))
    if noise is not None:
        image = Image.blend(image.convert("RGB"), noise, 0.06).convert("RGBA")
    shade = _vignette(target, float(brand.get("vignette", 0.35)))
    if shade is not None:
        image.alpha_composite(shade)
    image = image.convert("RGB").filter(ImageFilter.SHARPEN)

    destination = Path(path)
    destination.parent.mkdir(parents=True, exist_ok=True)
    image.save(destination, "PNG", optimize=True)
    return destination


@dataclass(slots=True)
class ThumbnailSpec:
    variant_id: str
    layout: str  # big_word | split | question
    headline: str
    kicker: str = ""
    badge: str = ""
    background_shot: Shot | None = None


def render_thumbnail(
    spec: ThumbnailSpec,
    path: Path | str,
    *,
    brand: dict[str, Any] | None = None,
    seed_text: str = "",
    size: tuple[int, int] = (1280, 720),
) -> Path:
    """1280x720 thumbnail, one of three A/B variants (YouTube Test & Compare)."""

    from PIL import Image, ImageDraw, ImageFilter

    brand = {**DEFAULT_BRAND, **(brand or {})}
    rng = _rng(seed_text, spec.variant_id, spec.headline)
    shot = spec.background_shot or Shot(id=f"thumb_{spec.variant_id}", prompt=spec.headline, mood="urgent")
    colors = palette_for(shot, brand, seed_text)
    base = _gradient(size, colors, angle_deg=rng.uniform(100, 220)).convert("RGBA")
    _motif(ImageDraw.Draw(base), base, shot, colors, rng, size)

    width, height = size
    canvas = Image.new("RGBA", size, (0, 0, 0, 0))
    draw = ImageDraw.Draw(canvas)
    accent = _hex_to_rgb(brand["accent"])
    text_color = _hex_to_rgb(brand["text"])

    if spec.layout == "split":
        draw.rectangle([0, 0, int(width * 0.46), height], fill=(*_hex_to_rgb(colors[0]), 235))
        draw.rectangle([int(width * 0.46) - 8, 0, int(width * 0.46) + 8, height], fill=(*accent, 255))
        text_box = (40, int(width * 0.46) - 40)
    elif spec.layout == "question":
        draw.rectangle([0, int(height * 0.52), width, height], fill=(*_hex_to_rgb(colors[0]), 225))
        text_box = (60, width - 120)
    else:  # big_word
        shade = Image.new("RGBA", size, (0, 0, 0, 0))
        ImageDraw.Draw(shade).rectangle([0, int(height * 0.28), width, int(height * 0.86)], fill=(6, 9, 16, 165))
        base.alpha_composite(shade)
        text_box = (70, width - 140)

    if spec.kicker:
        kicker_face = font("bold", int(height * 0.055))
        draw.text((text_box[0] + 6, int(height * 0.10)), spec.kicker.upper(), font=kicker_face, fill=(*accent, 255))

    headline = spec.headline
    max_width = text_box[1] - text_box[0]
    face_size = int(height * 0.20)
    face = font("extrabold", face_size)
    while face_size > int(height * 0.09) and face.getlength(headline) > max_width and " " not in headline:
        face_size -= 4
        face = font("extrabold", face_size)
    lines = _wrap_text(headline, face, max_width)
    if len(lines) > 3:
        lines = lines[:3]
    line_height = int(face_size * 1.16)
    block = line_height * len(lines)
    y = int(height * 0.55) - block // 2 if spec.layout != "question" else int(height * 0.60)
    for line in lines:
        stroke = max(3, face_size // 22)
        draw.text((text_box[0], y), line, font=face, fill=(*text_color, 255), stroke_width=stroke, stroke_fill=(8, 10, 16, 255))
        y += line_height

    if spec.badge:
        badge_face = font("extrabold", int(height * 0.10))
        badge_width = int(badge_face.getlength(spec.badge) + height * 0.08)
        badge_box = [width - badge_width - 30, 26, width - 30, 26 + int(height * 0.16)]
        draw.rounded_rectangle(badge_box, radius=18, fill=(*_hex_to_rgb("#E4572E"), 255))
        draw.text(
            (badge_box[0] + int(height * 0.04), badge_box[1] + int(height * 0.018)),
            spec.badge,
            font=badge_face,
            fill=(255, 255, 255, 255),
        )

    base.alpha_composite(canvas)
    shade = _vignette(size, 0.28)
    if shade is not None:
        base.alpha_composite(shade)
    final = base.convert("RGB").filter(ImageFilter.SHARPEN)
    destination = Path(path)
    destination.parent.mkdir(parents=True, exist_ok=True)
    final.save(destination, "PNG", optimize=True)
    return destination


def legibility_report(path: Path | str, headline: str, *, mobile_width: int = 200) -> dict[str, Any]:
    """Contrast + mobile-size legibility check used by the packaging scorer."""

    import numpy as np
    from PIL import Image

    image = Image.open(path).convert("RGB")
    array = np.asarray(image).astype(np.float32)
    luminance = 0.2126 * array[:, :, 0] + 0.7152 * array[:, :, 1] + 0.0722 * array[:, :, 2]
    height, width = luminance.shape
    band = luminance[int(height * 0.30) : int(height * 0.85), int(width * 0.05) : int(width * 0.95)]
    contrast = float(band.std() / 128.0)
    brightest = float(np.percentile(band, 97))
    darkest = float(np.percentile(band, 3))
    dynamic_range = (brightest - darkest) / 255.0

    small = image.resize((mobile_width, int(height * mobile_width / width)), Image.LANCZOS)
    small_array = np.asarray(small.convert("L")).astype(np.float32)
    small_std = float(small_array.std() / 128.0)

    return {
        "path": str(path),
        "headline": headline,
        "contrast": round(contrast, 4),
        "dynamic_range": round(dynamic_range, 4),
        "mobile_contrast": round(small_std, 4),
        "headline_px_at_mobile": round(len(headline) and mobile_width * 0.16, 2),
        "legible_at_mobile": small_std >= 0.14 and dynamic_range >= 0.32,
    }
